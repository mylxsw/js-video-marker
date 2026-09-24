#!/usr/bin/env python3
"""Procedural multi-genre music bed for video-maker projects.
Supports: chiptune, lofi, ambient, tech_pulse, minimal_piano, or external --bgm.

Usage:
  python3 make_music.py --dur 44 --bounds 0,6.51,22.91,32.23,44 --genre lofi --out audio/music.wav
  python3 make_music.py --dur 44 --bgm my_music.mp3 --out audio/music.wav
"""
import argparse, math, subprocess, sys, wave
from pathlib import Path
import numpy as np

SR = 44100

def freq(midi):
    return 440.0 * (2.0 ** ((midi - 69) / 12.0))

def exp_decay_env(n, decay=3.0):
    t = np.linspace(0, 1, n)
    return np.exp(-decay * t)

def linear_env(n, a=0.01, r=0.08):
    e = np.ones(n)
    na = max(1, int(a * SR))
    nr = max(1, int(r * SR))
    if na + nr >= n:
        na = n // 2
        nr = n - na
    e[:na] = np.linspace(0, 1, na)
    e[-nr:] *= np.linspace(1, 0, nr)
    return e

def tone(midi, start, length, kind="sine", vol=0.4):
    n = max(1, int(length * SR))
    t = np.arange(n) / SR
    f = freq(midi)
    ph = 2.0 * np.pi * f * t

    if kind == "square":
        w = np.sign(np.sin(ph))
        sig = vol * w * linear_env(n, 0.005, 0.05)
    elif kind == "triangle":
        w = (2.0 / np.pi) * np.arcsin(np.sin(ph))
        sig = vol * w * linear_env(n, 0.01, 0.06)
    elif kind == "saw":
        w = 2.0 * (ph / (2.0 * np.pi) - np.floor(0.5 + ph / (2.0 * np.pi)))
        sig = vol * w * linear_env(n, 0.005, 0.04)
    elif kind == "rhodes":
        # Fundamental + subtle 2nd harmonic + gentle saturation
        w = 0.7 * np.sin(ph) + 0.3 * np.sin(2.0 * ph)
        w = np.tanh(1.2 * w)
        sig = vol * w * exp_decay_env(n, decay=2.5) * linear_env(n, 0.008, 0.08)
    elif kind == "piano":
        # Multi-harmonic piano tone simulation
        w = (0.55 * np.sin(ph) +
             0.28 * np.sin(2.0 * ph) * np.exp(-1.5 * t) +
             0.12 * np.sin(3.0 * ph) * np.exp(-3.0 * t) +
             0.05 * np.sin(4.0 * ph) * np.exp(-4.5 * t))
        sig = vol * w * exp_decay_env(n, decay=2.2) * linear_env(n, 0.005, 0.05)
    elif kind == "pad":
        # Detuned stereo-spread warm pad
        w = 0.5 * np.sin(ph) + 0.5 * np.sin(2.0 * np.pi * (f * 1.004) * t)
        sig = vol * w * linear_env(n, 0.4, 0.5)
    elif kind == "sub":
        # Clean warm sub bass
        w = np.sin(ph)
        sig = vol * w * linear_env(n, 0.02, 0.1)
    else:
        sig = vol * np.sin(ph) * linear_env(n, 0.01, 0.05)

    return int(start * SR), sig.astype(float)

def noise_hat(start, length=0.04, vol=0.10, seed=123):
    n = max(1, int(length * SR))
    rng = np.random.default_rng(seed)
    sig = vol * rng.standard_normal(n) * linear_env(n, 0.001, length * 0.8)
    return int(start * SR), sig.astype(float)

# ---------------------------------------------------------------- genres

def gen_chiptune(total_samples, bounds, bpm=132):
    beat = 60.0 / bpm
    mix = np.zeros(total_samples)

    def add(s0, sig):
        s1 = min(total_samples, s0 + len(sig))
        if s1 > s0:
            mix[s0:s1] += sig[:s1 - s0]

    C4, D4, E4, G4, A4, C5, D5, E5, G5 = 60, 62, 64, 67, 69, 72, 74, 76, 79
    LEAD = [
        [(E4, 1), (G4, 1), (A4, 2), (G4, 1), (E4, 1), (D4, 2)],
        [(C4, 0.5), (D4, 0.5), (E4, 0.5), (G4, 0.5), (A4, 1), (G4, 0.5), (E4, 0.5), (D4, 1), (C4, 1),
         (E4, 0.5), (G4, 0.5), (A4, 0.5), (C5, 0.5), (D5, 1), (C5, 0.5), (A4, 0.5), (G4, 1), (E4, 1)],
        [(G4, 1), (A4, 1), (C5, 1), (D5, 1), (E5, 2), (D5, 1), (C5, 1)],
        [(C5, 0.5), (D5, 0.5), (E5, 0.5), (G5, 0.5), (E5, 1), (D5, 0.5), (C5, 0.5), (D5, 1), (C5, 2)],
    ]
    BASS_ROOTS = [48, 45, 43, 48]

    for si in range(len(bounds) - 1):
        t0, t1 = bounds[si], bounds[si + 1]
        ph = LEAD[si % len(LEAD)]
        tt, vol = t0, 0.30 if si == 0 else 0.38
        while tt < t1 - 0.5:
            for midi, beats in ph:
                if tt >= t1: break
                add(*tone(midi, tt, beats * beat * 0.92, "square", vol))
                tt += beats * beat
            if si == 0: break
        root = BASS_ROOTS[si % len(BASS_ROOTS)]
        bt = t0
        while bt < t1 - 0.3:
            add(*tone(root, bt, beat * 0.45, "triangle", 0.28))
            add(*tone(root + 7, bt + beat / 2, beat * 0.4, "triangle", 0.20))
            bt += beat
        if si > 0:
            ht = t0 + beat / 2
            while ht < t1 - 0.2:
                add(*noise_hat(ht, 0.04, 0.08, int(ht * 997)))
                ht += beat
    return mix

def gen_lofi(total_samples, bounds, bpm=82):
    beat = 60.0 / bpm
    mix = np.zeros(total_samples)

    def add(s0, sig):
        s1 = min(total_samples, s0 + len(sig))
        if s1 > s0:
            mix[s0:s1] += sig[:s1 - s0]

    # Warm 7th chords: Cmaj7, Am7, Dm7, G7
    CHORDS = [
        [48, 55, 59, 64],  # C - G - B - E
        [45, 52, 57, 60],  # A - E - A - C
        [50, 57, 60, 65],  # D - A - C - F
        [43, 50, 55, 59],  # G - D - G - B
    ]
    MELODY = [
        [(72, 1.5), (71, 0.5), (67, 1.0), (69, 1.0)],
        [(67, 1.0), (64, 1.0), (62, 1.5), (60, 0.5)],
        [(65, 1.5), (67, 0.5), (69, 1.0), (72, 1.0)],
        [(71, 2.0), (67, 1.0), (64, 1.0)],
    ]

    for si in range(len(bounds) - 1):
        t0, t1 = bounds[si], bounds[si + 1]
        chord = CHORDS[si % len(CHORDS)]
        m_ph = MELODY[si % len(MELODY)]

        # Chords on every 2 beats
        ct = t0
        while ct < t1 - 0.5:
            for note in chord:
                add(*tone(note, ct, beat * 1.8, "rhodes", 0.16))
            ct += beat * 2

        # Sub bass on downbeats
        bt = t0
        while bt < t1 - 0.4:
            add(*tone(chord[0] - 12, bt, beat * 1.4, "sub", 0.35))
            bt += beat * 2

        # Gentle floating melody
        mt = t0 + beat * 0.5
        while mt < t1 - 0.8:
            for midi, beats in m_ph:
                if mt >= t1: break
                add(*tone(midi, mt, beats * beat * 0.85, "rhodes", 0.22))
                mt += beats * beat

        # Mellow vinyl noise & lazy hi-hat
        ht = t0 + beat
        while ht < t1 - 0.2:
            add(*noise_hat(ht, 0.05, 0.04, int(ht * 1013)))
            ht += beat * 2

    # Subtle vinyl crackle across track
    rng = np.random.default_rng(42)
    vinyl = rng.standard_normal(total_samples) * 0.008
    mix += vinyl
    return mix

def gen_ambient(total_samples, bounds, bpm=72):
    beat = 60.0 / bpm
    mix = np.zeros(total_samples)

    def add(s0, sig):
        s1 = min(total_samples, s0 + len(sig))
        if s1 > s0:
            mix[s0:s1] += sig[:s1 - s0]

    # Evolving modal harmonies: Dm9, Bbmaj7, Fmaj7, Cadd9
    PADS = [
        [50, 57, 60, 64, 69],  # Dm9
        [46, 53, 58, 62, 65],  # Bbmaj7
        [41, 48, 53, 57, 60],  # Fmaj7
        [48, 55, 58, 62, 67],  # Cadd9
    ]

    for si in range(len(bounds) - 1):
        t0, t1 = bounds[si], bounds[si + 1]
        pad = PADS[si % len(PADS)]
        dur = max(2.0, t1 - t0)

        # Smooth swelling pad layers
        for note in pad:
            add(*tone(note, t0, dur, "pad", 0.14))
        # Deep sub foundation
        add(*tone(pad[0] - 12, t0, dur, "sub", 0.28))

        # Gentle high bell accents
        st = t0 + beat
        step_idx = 0
        while st < t1 - 1.0:
            high_note = pad[(step_idx * 2) % len(pad)] + 24
            add(*tone(high_note, st, beat * 2.0, "piano", 0.12))
            st += beat * 2.5
            step_idx += 1

    return mix

def gen_tech_pulse(total_samples, bounds, bpm=124):
    beat = 60.0 / bpm
    mix = np.zeros(total_samples)

    def add(s0, sig):
        s1 = min(total_samples, s0 + len(sig))
        if s1 > s0:
            mix[s0:s1] += sig[:s1 - s0]

    # Driving techno / engineering pulse: Am -> F -> C -> G
    ROOTS = [45, 41, 48, 43]
    ARPS = [
        [57, 60, 64, 69, 72, 69, 64, 60],
        [53, 57, 60, 65, 69, 65, 60, 57],
        [60, 64, 67, 72, 76, 72, 67, 64],
        [55, 59, 62, 67, 71, 67, 62, 59],
    ]

    for si in range(len(bounds) - 1):
        t0, t1 = bounds[si], bounds[si + 1]
        root = ROOTS[si % len(ROOTS)]
        arp = ARPS[si % len(ARPS)]

        # 16th-note staccato arpeggio
        t = t0
        idx = 0
        step_16th = beat / 4.0
        while t < t1 - 0.2:
            n = arp[idx % len(arp)]
            add(*tone(n, t, step_16th * 0.7, "triangle", 0.18))
            t += step_16th
            idx += 1

        # Pulsing 8th-note bass
        bt = t0
        step_8th = beat / 2.0
        while bt < t1 - 0.2:
            add(*tone(root, bt, step_8th * 0.8, "saw", 0.22))
            bt += step_8th

        # Crisp electro hats
        ht = t0 + step_8th
        while ht < t1 - 0.1:
            add(*noise_hat(ht, 0.03, 0.07, int(ht * 2003)))
            ht += step_8th

    return mix

def gen_minimal_piano(total_samples, bounds, bpm=88):
    beat = 60.0 / bpm
    mix = np.zeros(total_samples)

    def add(s0, sig):
        s1 = min(total_samples, s0 + len(sig))
        if s1 > s0:
            mix[s0:s1] += sig[:s1 - s0]

    # Contemplative minimal piano phrases (Satie / Richter style)
    CHORDS = [
        [48, 55, 60, 64],  # C
        [45, 52, 57, 60],  # Am
        [41, 48, 53, 57],  # F
        [43, 50, 55, 59],  # G
    ]
    PHRASES = [
        [(72, 1.0), (71, 1.0), (67, 2.0)],
        [(64, 1.0), (67, 1.0), (69, 2.0)],
        [(65, 1.5), (64, 0.5), (60, 2.0)],
        [(62, 1.0), (64, 1.0), (60, 2.0)],
    ]

    for si in range(len(bounds) - 1):
        t0, t1 = bounds[si], bounds[si + 1]
        chord = CHORDS[si % len(CHORDS)]
        ph = PHRASES[si % len(PHRASES)]

        # Left hand broken chord
        add(*tone(chord[0] - 12, t0, beat * 3.0, "piano", 0.32))
        add(*tone(chord[1], t0 + beat * 0.5, beat * 2.5, "piano", 0.24))
        add(*tone(chord[2], t0 + beat * 1.0, beat * 2.0, "piano", 0.22))

        # Right hand lyrical melody
        mt = t0 + beat * 0.5
        while mt < t1 - 0.5:
            for midi, beats in ph:
                if mt >= t1: break
                add(*tone(midi, mt, beats * beat * 0.95, "piano", 0.30))
                mt += beats * beat

    return mix

# ---------------------------------------------------------------- external BGM decoder

def process_external_bgm(bgm_path, dur, out_path):
    """Decode external BGM with ffmpeg, apply volume, trim to dur, and fade in/out."""
    cmd = [
        "ffmpeg", "-y", "-i", str(bgm_path),
        "-t", str(dur),
        "-ar", str(SR),
        "-ac", "1",
        "-af", f"afade=t=in:ss=0:d=0.5,afade=t=out:st={max(0.1, dur - 1.5)}:d=1.5,volume=0.85",
        str(out_path)
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"ffmpeg failed to process external BGM: {res.stderr}")
    print(f"processed external bgm {bgm_path} -> {out_path} ({dur:.1f}s)")

# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description="Procedural multi-genre music generator for video-maker")
    ap.add_argument("--dur", type=float, required=True, help="Total track duration in seconds")
    ap.add_argument("--bounds", default=None, help="Comma-separated timeline bounds, e.g. 0,6.51,22.91,44")
    ap.add_argument("--genre", choices=["chiptune", "lofi", "ambient", "tech_pulse", "minimal_piano"],
                    default="chiptune", help="Musical genre preset (default: chiptune)")
    ap.add_argument("--bpm", type=int, default=None, help="Optional BPM override")
    ap.add_argument("--bgm", default=None, help="Optional path to external music audio file")
    ap.add_argument("--out", required=True, help="Output wav path")
    args = ap.parse_args()

    out_p = Path(args.out)
    out_p.parent.mkdir(parents=True, exist_ok=True)

    # External BGM shortcut
    if args.bgm:
        bgm_p = Path(args.bgm)
        if not bgm_p.exists():
            print(f"Error: external BGM file '{args.bgm}' not found!", file=sys.stderr)
            sys.exit(1)
        process_external_bgm(bgm_p, args.dur, out_p)
        return

    # Timeline bounds
    if args.bounds:
        bounds = [float(x.strip()) for x in args.bounds.split(",") if x.strip()]
    else:
        # Default evenly spaced 4-act bounds
        bounds = [0.0, args.dur * 0.25, args.dur * 0.5, args.dur * 0.75, args.dur]

    if bounds[0] != 0.0:
        bounds.insert(0, 0.0)
    if bounds[-1] < args.dur:
        bounds.append(args.dur)

    total_samples = int(args.dur * SR)

    # Route to genre generator
    g = args.genre
    if g == "lofi":
        mix = gen_lofi(total_samples, bounds, args.bpm or 82)
    elif g == "ambient":
        mix = gen_ambient(total_samples, bounds, args.bpm or 72)
    elif g == "tech_pulse":
        mix = gen_tech_pulse(total_samples, bounds, args.bpm or 124)
    elif g == "minimal_piano":
        mix = gen_minimal_piano(total_samples, bounds, args.bpm or 88)
    else:
        mix = gen_chiptune(total_samples, bounds, args.bpm or 132)

    # Master fades: 0.3s fade-in, 1.5s fade-out
    n_in = min(total_samples // 4, int(0.35 * SR))
    n_out = min(total_samples // 2, int(1.5 * SR))
    if n_in > 0:
        mix[:n_in] *= np.linspace(0, 1, n_in)
    if n_out > 0:
        mix[-n_out:] *= np.linspace(1, 0, n_out)

    # Peak normalization to -1.0 dB (0.89)
    peak = max(1e-6, np.abs(mix).max())
    mix = (mix / peak) * 0.89

    with wave.open(str(out_p), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mix * 32767).astype(np.int16).tobytes())

    print(f"wrote [{args.genre}] {out_p} ({args.dur:.1f}s)")

if __name__ == "__main__":
    main()
