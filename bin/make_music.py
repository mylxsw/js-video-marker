#!/usr/bin/env python3
"""Procedural chiptune bed for video-maker projects.
Square lead + triangle bass + noise hats, C major.
Usage: python3 make_music.py --dur 44 --bounds 0,6.51,22.91,32.23,44 --out audio/music.wav
Sections map to --bounds segments; melodic phrases cycle across them.
"""
import argparse, wave
import numpy as np

SR = 44100
BPM = 132
BEAT = 60.0 / BPM

def freq(midi):
    return 440.0 * 2 ** ((midi - 69) / 12.0)

def env(n, a=0.005, r=0.08):
    e = np.ones(n)
    na = max(1, int(a * SR)); nr = max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na)
    e[-nr:] *= np.linspace(1, 0, nr)
    return e

def tone(midi, start, length, kind="square", vol=0.5):
    n = int(length * SR)
    t = np.arange(n) / SR
    ph = 2 * np.pi * freq(midi) * t
    w = np.sign(np.sin(ph)) if kind == "square" else (2.0 / np.pi) * np.arcsin(np.sin(ph))
    return int(start * SR), (vol * w * env(n)).astype(float)

def noise_hat(start, length=0.05, vol=0.15):
    n = int(length * SR)
    sig = vol * np.random.default_rng(int(start * 997)).standard_normal(n) * env(n, 0.001, length)
    return int(start * SR), sig

C4, D4, E4, G4, A4, C5, D5, E5, G5 = 60, 62, 64, 67, 69, 72, 74, 76, 79
LEAD = [
    [(E4,1),(G4,1),(A4,2),(G4,1),(E4,1),(D4,2)],                                        # sparse / curious
    [(C4,0.5),(D4,0.5),(E4,0.5),(G4,0.5),(A4,1),(G4,0.5),(E4,0.5),(D4,1),(C4,1),          # driving
     (E4,0.5),(G4,0.5),(A4,0.5),(C5,0.5),(D5,1),(C5,0.5),(A4,0.5),(G4,1),(E4,1)],
    [(G4,1),(A4,1),(C5,1),(D5,1),(E5,2),(D5,1),(C5,1)],                                 # warm
    [(C5,0.5),(D5,0.5),(E5,0.5),(G5,0.5),(E5,1),(D5,0.5),(C5,0.5),(D5,1),(C5,2)],        # triumphant
]
BASS_ROOTS = [48, 45, 43, 48]  # C2 A1 G1 C2

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dur", type=float, required=True)
    ap.add_argument("--bounds", required=True, help="comma list, e.g. 0,6.51,22.91,32.23,44")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    bounds = [float(x) for x in a.bounds.split(",")]
    total = int(a.dur * SR)
    mix = np.zeros(total)

    def add(s0, sig):
        s1 = min(total, s0 + len(sig))
        if s1 > s0:
            mix[s0:s1] += sig[:s1 - s0]

    for si in range(len(bounds) - 1):
        t0, t1 = bounds[si], bounds[si + 1]
        ph = LEAD[si % len(LEAD)]
        tt, vol = t0, 0.34 if si == 0 else 0.42
        while tt < t1 - 0.5:
            for midi, beats in ph:
                if tt >= t1: break
                add(*tone(midi, tt, beats * BEAT * 0.92, "square", vol))
                tt += beats * BEAT
            if si == 0: break
        root = BASS_ROOTS[si % len(BASS_ROOTS)]
        bt = t0
        while bt < t1 - 0.3:
            add(*tone(root, bt, BEAT * 0.45, "tri", 0.30))
            add(*tone(root + 7, bt + BEAT / 2, BEAT * 0.4, "tri", 0.22))
            bt += BEAT
        if si > 0:
            ht = t0 + BEAT / 2
            while ht < t1 - 0.2:
                add(*noise_hat(ht, 0.04, 0.10))
                ht += BEAT

    n_in, n_out = int(0.3 * SR), int(1.5 * SR)
    mix[:n_in] *= np.linspace(0, 1, n_in)
    mix[-n_out:] *= np.linspace(1, 0, n_out)
    mix = mix / max(1e-6, np.abs(mix).max()) * 0.89
    with wave.open(a.out, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((mix * 32767).astype(np.int16).tobytes())
    print("wrote", a.out, "%.1fs" % a.dur)

if __name__ == "__main__":
    main()
