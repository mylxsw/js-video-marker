#!/usr/bin/env python3
"""Cross-platform Text-To-Speech (TTS) synthesizer for video-maker.
Supports:
  1. Fish Audio API (high-quality AI neural voice cloning & synthesis, via REST API)
  2. edge-tts (Microsoft neural TTS, high quality, requires `pip install edge-tts`)
  3. macOS native `say` command + ffmpeg (built-in on macOS, zero pip install required)
  4. Generic system `tts` CLI if installed

Usage:
  python3 tts.py --text "你好，世界" --out audio/n1.mp3 [--voice <reference_id_or_voice>] [--engine auto|fish-audio|edge|say|system]
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

def get_fish_audio_api_key(cli_key=None):
    if cli_key and cli_key.strip():
        return cli_key.strip()
    return os.environ.get("FISH_API_KEY", "").strip() or os.environ.get("FISH_AUDIO_API_KEY", "").strip()

def detect_engine(preferred="auto", cli_api_key=None):
    if preferred != "auto":
        if preferred == "fish":
            return "fish-audio"
        return preferred

    # 1. Prefer Fish Audio API if API key is provided or present in environment
    if get_fish_audio_api_key(cli_api_key):
        return "fish-audio"

    # 2. Check for edge-tts
    if shutil.which("edge-tts"):
        return "edge"
    # Also check if edge_tts python module exists
    try:
        import edge_tts  # noqa: F401
        return "edge_module"
    except ImportError:
        pass

    # 3. Check for macOS say + ffmpeg
    if sys.platform == "darwin" and shutil.which("say") and shutil.which("ffmpeg"):
        return "say"

    # 4. Check for system tts
    if shutil.which("tts"):
        return "system"

    return "none"

def synthesize_fish_audio(text, out_path, voice=None, api_key=None, model="s2.1-pro", speed=1.0, bitrate=128):
    token = get_fish_audio_api_key(api_key)
    if not token:
        raise ValueError("Fish Audio API key missing. Please set FISH_API_KEY or FISH_AUDIO_API_KEY env variable, or pass --api-key.")

    url = "https://api.fish.audio/v1/tts"
    payload = {
        "text": text,
        "format": "mp3",
        "mp3_bitrate": bitrate,
        "normalize": True,
        "latency": "normal"
    }

    if voice and voice.strip():
        payload["reference_id"] = voice.strip()

    if speed and speed != 1.0:
        payload["prosody"] = {"speed": float(speed)}

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "model": model or "s2.1-pro"
    }

    voice_desc = f"reference_id={voice}" if voice else "default voice"
    print(f"[tts:fish-audio] synthesizing '{text}' ({voice_desc}, model={headers['model']})...")

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            content_type = resp.headers.get("Content-Type", "")
            audio_bytes = resp.read()
            if not audio_bytes:
                raise RuntimeError("Fish Audio API returned empty audio response.")
            with open(out_path, "wb") as f:
                f.write(audio_bytes)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        try:
            err_json = json.loads(err_body)
            msg = err_json.get("message") or err_json.get("detail") or err_body
        except Exception:
            msg = err_body
        raise RuntimeError(f"Fish Audio API HTTP {e.code}: {msg}") from e
    except urllib.error.URLError as e:
        raise RuntimeError(f"Fish Audio API network error: {e.reason}") from e

def synthesize_edge(text, out_path, voice=None):
    voice = voice or "zh-CN-XiaoxiaoNeural"
    cmd = ["edge-tts", "--text", text, "--write-media", str(out_path), "--voice", voice]
    print(f"[tts:edge] synthesizing '{text}' with voice {voice}...")
    subprocess.run(cmd, check=True)

def synthesize_edge_module(text, out_path, voice=None):
    voice = voice or "zh-CN-XiaoxiaoNeural"
    import asyncio
    import edge_tts
    print(f"[tts:edge_module] synthesizing '{text}' with voice {voice}...")
    async def _run():
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(str(out_path))
    asyncio.run(_run())

def synthesize_say(text, out_path, voice=None):
    voice = voice or "Tingting"
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".aiff", dir=out_path.parent, delete=False) as tmp:
        tmp_aiff = Path(tmp.name)
    try:
        print(f"[tts:say] synthesizing '{text}' with voice {voice}...")
        subprocess.run(["say", "-v", voice, "-o", str(tmp_aiff), text], check=True)
        if not shutil.which("ffmpeg"):
            raise SystemExit("Error: ffmpeg is required to convert macOS say output to mp3.")
        subprocess.run([
            "ffmpeg", "-y", "-v", "error", "-i", str(tmp_aiff),
            "-ar", "44100", "-ac", "1", "-b:a", "128k", str(out_path)
        ], check=True)
    finally:
        tmp_aiff.unlink(missing_ok=True)

def synthesize_system_tts(text, out_path, voice=None):
    print(f"[tts:system] synthesizing '{text}'...")
    # Coqui TTS style: tts --text "..." --out_path ...
    cmd = ["tts", "--text", text, "--out_path", str(out_path)]
    if voice:
        cmd.extend(["--speaker_idx", voice])
    subprocess.run(cmd, check=True)

def main():
    parser = argparse.ArgumentParser(description="video-maker TTS synthesizer")
    parser.add_argument("--text", required=True, help="Text to speak")
    parser.add_argument("--out", required=True, help="Output mp3 path (e.g. audio/n1.mp3)")
    parser.add_argument("--voice", default="", help="Voice name or Fish Audio reference_id")
    parser.add_argument("--engine", choices=["auto", "fish-audio", "fish", "edge", "say", "system"], default="auto",
                        help="TTS backend engine (default: auto; uses fish-audio if FISH_API_KEY is set)")
    parser.add_argument("--api-key", default="", help="Fish Audio API key (optional; defaults to FISH_API_KEY env)")
    parser.add_argument("--model", default=os.environ.get("FISH_AUDIO_MODEL", "s2.1-pro"),
                        help="Fish Audio model (default: s2.1-pro)")
    parser.add_argument("--speed", type=float, default=1.0, help="Speech speed multiplier (default: 1.0)")
    parser.add_argument("--bitrate", type=int, default=128, help="MP3 bitrate in kbps (default: 128)")
    args = parser.parse_args()

    out_path = Path(args.out).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    engine = detect_engine(args.engine, args.api_key)
    voice = args.voice.strip() if args.voice else None

    if engine in ("fish-audio", "fish"):
        try:
            synthesize_fish_audio(
                text=args.text,
                out_path=out_path,
                voice=voice,
                api_key=args.api_key,
                model=args.model,
                speed=args.speed,
                bitrate=args.bitrate
            )
        except Exception as e:
            if args.engine == "auto":
                # Fallback to local engines if auto-mode Fish Audio failed
                print(f"[tts:fish-audio] Warning: Fish Audio synthesis failed ({e}). Attempting local fallback...", file=sys.stderr)
                if shutil.which("edge-tts"):
                    synthesize_edge(args.text, out_path, voice)
                elif sys.platform == "darwin" and shutil.which("say") and shutil.which("ffmpeg"):
                    synthesize_say(args.text, out_path, voice)
                else:
                    raise
            else:
                raise
    elif engine == "edge":
        synthesize_edge(args.text, out_path, voice)
    elif engine == "edge_module":
        synthesize_edge_module(args.text, out_path, voice)
    elif engine == "say":
        synthesize_say(args.text, out_path, voice)
    elif engine == "system":
        synthesize_system_tts(args.text, out_path, voice)
    else:
        print("Error: No suitable TTS engine detected.", file=sys.stderr)
        print("Please choose one of the following:", file=sys.stderr)
        print("  1. Recommended (high-quality AI neural voice): set FISH_API_KEY=<your_api_key>", file=sys.stderr)
        print("  2. Local free neural voice: pip install edge-tts", file=sys.stderr)
        if sys.platform == "darwin":
            print("  3. macOS built-in (offline): ensure ffmpeg is installed (`brew install ffmpeg`)", file=sys.stderr)
        sys.exit(1)

    print(f"[tts] Successfully generated: {out_path}")

if __name__ == "__main__":
    main()
