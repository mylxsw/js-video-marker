---
name: "video-maker"
description: "Agent-driven pipeline that turns a narration script into a finished animated explainer video: per-line TTS voiceover, procedural chiptune music, code-driven canvas animation via the reusable V.* component library (lib/anim.js), headless-Chromium frame rendering, and audio/video muxing. Use when the user wants to convert text or content into a video, or asks for the video toolkit."
---

# Video Maker

## Purpose
Convert written content into a finished short animated video (30–90s) end to end with no manual editing tools. The pipeline is deterministic: the timeline is derived from measured TTS durations, so audio and video sync by construction. Proven on a 44s shipped demo.

> [!TIP]
> **环境检查：** 首次使用或排查问题时，可运行 `node <skill-dir>/bin/doctor.mjs` 自检当前系统环境与依赖。`<skill-dir>` 为本技能所在的根目录。

## Workflow

**0. Scaffold.** 
```sh
node <skill-dir>/bin/new-video.mjs <dir> --title "标题" [--dur 44]
```
脚手架会在 `<dir>` 中自动生成项目文件及便捷运行脚本 `<dir>/run.sh`。

**1. Script.** Write 4–8 spoken-style lines in `<dir>/script.txt` (`n1: …`). Spell out numbers/abbreviations as pronounced; no stage directions.

**2. Voiceover.** Synthesize **one file per line** (needed for per-line timing):
```sh
python3 <skill-dir>/bin/tts.py --text "第一句。" --out <dir>/audio/n1.mp3
```
支持 `edge-tts`（神经网络高保真）与 macOS 系统内置 `say`（如婷婷 Tingting）。
合成后测量每句时长：
```sh
ffprobe -v error -show_entries format=duration -of csv=p=0 <dir>/audio/n1.mp3
```
Non-English quality varies; tell the user if it sounds off and offer another voice.

**3. Lock the timeline.** From measured durations d1..dN:
- narration offsets: `o1 = 0.6`, `o(i+1) = o(i) + d(i) + 0.8`
- beats: `[0, o2], [o2, o3], …`, last beat ends at `oN + dN + 2.5` (outro pad)
- `DUR` = last beat end; `SUBS[i] = [o(i), o(i) + d(i), text]`

Write `DUR`, `BEATS`, `SUBS` into `<dir>/demo.js`. Never guess durations — always measure.

**4. Music.**
```sh
python3 <skill-dir>/bin/make_music.py --dur DUR --bounds 0,b1,b2,…,DUR --out <dir>/audio/music.wav
```
（bounds 即各 beat 的起止边界）。

**5. Animation.** Implement one beat function per act in `demo.js` using the `V.*` library (`lib/anim.js`; API in `references/components.md`). Keep `render(t)` a pure function of time. Reuse: `V.card`, `V.questLog`, `V.rulesList`, `V.shieldScene`, `V.flipCard`, `V.terminal`, `V.titlePop`, `V.pressStart`, `V.toast`, plus the `V.seg`/`V.tw`/`V.mv` tween DSL.

**6. QC loop.**
```sh
node <skill-dir>/bin/render.mjs <dir> snaps [--snaps 2,8,20]
# 或者在 <dir> 目录内直接运行: ./run.sh snaps
```
→ 查看生成的关键帧 PNG（`<dir>/out/snaps/`），修复视觉排版 Bug 并重复质检。检查要点：文字清晰度、无镜像反转、元素不重叠、字幕落在各自时间窗内。

**7. Mix.**
```sh
python3 <skill-dir>/bin/make_mix.py --dir <dir> --offsets o1,o2,… --dur DUR
# 或者在 <dir> 目录内直接运行: ./run.sh mix --offsets o1,o2,... --dur DUR
```
（自动实现语音处音乐闪避 ducking）。

**8. Render + mux.**
```sh
node <skill-dir>/bin/render.mjs <dir> video [--fps 30]
ffmpeg -y -i <dir>/out/video.mp4 -i <dir>/audio/mix.wav -c:v copy -c:a aac -b:a 160k <dir>/out/final.mp4
# 或者在 <dir> 目录内直接运行: ./run.sh video && ./run.sh mux
```
抽查 `final.mp4` 画面后，将其作为附件交付给用户。

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
