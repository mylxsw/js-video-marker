#!/usr/bin/env python3
"""Mix per-line narration over the music bed with ducking.
Usage: python3 make_mix.py --dir <project> --offsets 0.6,6.51,22.91,32.23 --dur 44
Reads <dir>/audio/n{i}.mp3 + <dir>/audio/music.wav -> writes <dir>/audio/mix.wav
"""
import argparse, shutil, subprocess, wave
import numpy as np
from pathlib import Path

SR = 44100

def check_ffmpeg():
    if not shutil.which("ffmpeg"):
        raise SystemExit("Error: ffmpeg is required but not found in PATH. Please install ffmpeg.")

def decode_mp3(p):
    check_ffmpeg()
    tmp = str(p) + ".tmp.wav"
    try:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(p),
                        "-ar", str(SR), "-ac", "1", tmp], check=True)
        with wave.open(tmp, "rb") as w:
            n = w.getnframes()
            sig = np.frombuffer(w.readframes(n), dtype=np.int16).astype(float) / 32768.0
    except subprocess.CalledProcessError as e:
        raise SystemExit(f"Error: failed to decode audio {p} with ffmpeg: {e}")
    finally:
        Path(tmp).unlink(missing_ok=True)
    return sig

def read_wav(p):
    try:
        with wave.open(str(p), "rb") as w:
            n = w.getnframes()
            return np.frombuffer(w.readframes(n), dtype=np.int16).astype(float) / 32768.0
    except Exception as e:
        raise SystemExit(f"Error reading wave file {p}: {e}")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", required=True, help="Project directory")
    ap.add_argument("--offsets", required=True, help="comma list matching n1..nN.mp3")
    ap.add_argument("--dur", type=float, required=True, help="Duration in seconds")
    a = ap.parse_args()
    au = Path(a.dir).resolve() / "audio"
    N = int(a.dur * SR)
    offsets = [float(x) for x in a.offsets.split(",")]

    narr = np.zeros(N)
    segs = []
    for i, off in enumerate(offsets, 1):
        p = au / f"n{i}.mp3"
        if not p.exists():
            raise SystemExit(f"Missing voiceover file: {p}\nPlease ensure all narration files (n1.mp3..n{len(offsets)}.mp3) exist.")
        sig = decode_mp3(p)
        s0 = int(off * SR)
        s1 = min(N, s0 + len(sig))
        narr[s0:s1] += sig[:s1 - s0]
        segs.append((off, off + len(sig) / SR))
        print(f"n{i}: offset={off:.2f}s dur={len(sig)/SR:.2f}s")

    music_path = au / "music.wav"
    if not music_path.exists():
        raise SystemExit(f"Missing background music file: {music_path}\nPlease generate music first using make_music.py.")

    music = read_wav(music_path)
    music = np.pad(music, (0, max(0, N - len(music))))[:N]

    gain = np.ones(N)
    ramp = int(0.3 * SR)
    for sa, sb in segs:
        i0 = max(0, int((sa - 0.3) * SR)); i1 = min(N, int((sb + 0.4) * SR))
        dip = np.ones(i1 - i0) * 0.32
        r = min(ramp, (i1 - i0) // 2)
        t = np.linspace(0, np.pi / 2, r)
        dip[:r] = 1 - 0.68 * np.sin(t) ** 2
        dip[-r:] = 0.32 + 0.68 * np.sin(t) ** 2
        gain[i0:i1] = np.minimum(gain[i0:i1], dip)

    mix = narr + music * 0.9 * gain
    mix /= max(1e-6, np.abs(mix).max())
    mix *= 0.89
    outp = au / "mix.wav"
    outp.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(outp), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mix * 32767).astype(np.int16).tobytes())
    print("wrote", outp)

if __name__ == "__main__":
    main()
