#!/usr/bin/env python3
"""Cross-platform Text-To-Speech (TTS) synthesizer for video-maker.
Supports:
  1. edge-tts (Microsoft neural TTS, high quality, requires `pip install edge-tts`)
  2. macOS native `say` command + ffmpeg (built-in on macOS, zero pip install required)
  3. Generic system `tts` CLI if installed

Usage:
  python3 tts.py --text "你好，世界" --out audio/n1.mp3 [--voice Tingting] [--engine auto|edge|say|system]
"""

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

def detect_engine(preferred="auto"):
    if preferred != "auto":
        return preferred

    # 1. Check for edge-tts
    if shutil.which("edge-tts"):
        return "edge"
    # Also check if edge_tts python module exists
    try:
        import edge_tts  # noqa: F401
        return "edge_module"
    except ImportError:
        pass

    # 2. Check for macOS say + ffmpeg
    if sys.platform == "darwin" and shutil.which("say") and shutil.which("ffmpeg"):
        return "say"

    # 3. Check for system tts
    if shutil.which("tts"):
        return "system"

    return "none"

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
    parser.add_argument("--voice", default="", help="Voice name (e.g. Tingting, zh-CN-XiaoxiaoNeural)")
    parser.add_argument("--engine", choices=["auto", "edge", "say", "system"], default="auto",
                        help="TTS backend engine (default: auto)")
    args = parser.parse_args()

    out_path = Path(args.out).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    engine = detect_engine(args.engine)
    voice = args.voice.strip() if args.voice else None

    if engine == "edge":
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
        print("  1. Recommended (high-quality neural voice): pip install edge-tts", file=sys.stderr)
        if sys.platform == "darwin":
            print("  2. macOS built-in (offline): ensure ffmpeg is installed (`brew install ffmpeg`)", file=sys.stderr)
        sys.exit(1)

    print(f"[tts] Successfully generated: {out_path}")

if __name__ == "__main__":
    main()
