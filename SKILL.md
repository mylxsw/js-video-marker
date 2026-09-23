---
name: "video-maker"
description: "Agent-driven pipeline that turns a narration script into a finished animated explainer video: per-line TTS voiceover, procedural chiptune music, code-driven canvas animation via the reusable V.* component library (lib/anim.js), headless-Chromium frame rendering, and audio/video muxing. Use when the user wants to convert text or content into a video, or asks for the video toolkit."
---

# Video Maker

## Purpose
Convert written content into a finished short animated video (30–90s) end to end with no manual editing tools. The pipeline is deterministic: the timeline is derived from measured TTS durations, so audio and video sync by construction. Proven on a 44s shipped demo (`~/workspace/video-demo/game-life/`).

## Workflow

**0. Scaffold.** `node ~/workspace/skills/video-maker/bin/new-video.mjs <dir> --title "标题" [--dur 44]`

**1. Script.** Write 4–8 spoken-style lines in `<dir>/script.txt` (`n1: …`). Spell out numbers/abbreviations as pronounced; no stage directions.

**2. Voiceover.** Synthesize **one file per line** (needed for per-line timing):
```sh
tts speak --text "第一句。" --language zh --output audio/n1.mp3
```
Then measure each: `ffprobe -v error -show_entries format=duration -of csv=p=0 audio/n1.mp3`. Non-English quality varies; tell the user if it sounds off and offer another voice.

**3. Lock the timeline.** From measured durations d1..dN:
- narration offsets: `o1 = 0.6`, `o(i+1) = o(i) + d(i) + 0.8`
- beats: `[0, o2], [o2, o3], …`, last beat ends at `oN + dN + 2.5` (outro pad)
- `DUR` = last beat end; `SUBS[i] = [o(i), o(i) + d(i), text]`

Write `DUR`, `BEATS`, `SUBS` into `<dir>/demo.js`. Never guess durations — always measure.

**4. Music.** `python3 ~/workspace/skills/video-maker/bin/make_music.py --dur DUR --bounds 0,b1,b2,…,DUR --out <dir>/audio/music.wav` (bounds = beat boundaries).

**5. Animation.** Implement one beat function per act in `demo.js` using the `V.*` library (`lib/anim.js`; API in `references/components.md`). Keep `render(t)` a pure function of time. Reuse: `V.card`, `V.questLog`, `V.rulesList`, `V.shieldScene`, `V.flipCard`, `V.terminal`, `V.titlePop`, `V.pressStart`, `V.toast`, plus the `V.seg`/`V.tw`/`V.mv` tween DSL.

**6. QC loop.** `node ~/workspace/skills/video-maker/bin/render.mjs <dir> snaps [--snaps 2,8,20]` → view the PNGs (read them as images), fix visual bugs, repeat. Check: text legibility, no mirrored text, no element overlap, subtitles inside their windows.

**7. Mix.** `python3 ~/workspace/skills/video-maker/bin/make_mix.py --dir <dir> --offsets o1,o2,… --dur DUR` (ducks music under narration).

**8. Render + mux.**
```sh
node ~/workspace/skills/video-maker/bin/render.mjs <dir> video [--fps 30]
ffmpeg -y -i <dir>/out/video.mp4 -i <dir>/audio/mix.wav -c:v copy -c:a aac -b:a 160k <dir>/out/final.mp4
```
Spot-check frames from `final.mp4`, then deliver it as an attachment.

## Output Contract
- `<dir>/out/final.mp4` — the deliverable (H.264 + AAC).
- Keep `demo.js`, `index.html`, `script.txt`, `audio/`, `BUILD.md` in the project dir for reproducibility.

## Operating Rules
1. Timeline comes from measurement, not memory. Re-run TTS → durations change → re-lock.
2. One beat = one idea = one narration line. 4–8 beats per video.
3. In render mode the page must be exactly 1920×1080 — `V.createApp` handles this; do not fight it with CSS.
4. `render.mjs` serves the page over `file://`; never start an http server for it (Chrome blocks it).
5. Flip animations: always use `V.flipCard` — hand-rolled `scale(-x,1)` mirrors text (a real QC catch).
6. Fonts: the library targets CJK + mono stacks available on the render host; no webfont downloads in render mode.
7. `py_compile` any Python you add under `bin/`.
8. Deliver `final.mp4` as a chat attachment in the same message as the summary.
