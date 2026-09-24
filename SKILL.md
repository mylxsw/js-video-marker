---
name: "video-maker"
description: "Agent-driven pipeline that transforms any article or text into a professional animated explainer video: automatic content analysis & multi-style visual/music recommendation, storyboard keyframe image generation & interactive user review before full video rendering, per-line TTS voiceover, procedural multi-genre music synthesis, code-driven canvas animations via V.* components, headless-Chromium rendering, and audio/video muxing. Use when the user provides an article, text, or script to create an explainer video, or asks for the video toolkit."
---

# Video Maker · 分镜先行与多风格自适应视频管线

## 核心设计理念
本管线将任意文章或文本转化为**高质量解说动画视频（30–90秒）**。
核心原则：**分镜图片先行，确认满意后再全量渲染**。

在耗费较多时间进行逐帧全量视频渲染之前，管线会先在秒级（~2秒）内自动生成**全套分镜效果图（Storyboard Keyframes）**，让用户直观预览每一幕的画面排版、配色对比、图表和字幕。用户可以随时提出修改意见并即时刷新，待用户最终确认满意后，才执行全量视频渲染与合成。

> [!TIP]
> **环境检查：** 首次使用或排查问题时，可运行 `node <skill-dir>/bin/doctor.mjs` 自检当前系统环境与依赖。`<skill-dir>` 为本技能所在的根目录。

---

## 完整工作流：三阶段闭环

### 第一阶段：内容分析与风格推荐 (Phase 1: Style Alignment)

当用户提供一篇文章时，先分析题材特征并与用户对齐风格：

1. **内容特征分析：**
   - **题材调性**：个人成长与哲学认知、系统架构与编程实战、商业战略与产品财经、论文解析与数理逻辑、极客突破等。
   - **核心视觉隐喻**：左右对比分栏（认知误区 vs 核心重构）、关键数据冲击（10x / 92%）、流程步骤（01 → 02 → 03）、概念拓扑（因果回路）、深度名言金句。
2. **给出 2–3 种推荐风格候选（并支持自动生成全新风格）：**
   - `minimal_dark`（深邃知识探索）：Notion / Linear 质感，深蓝黑微光底色，柔和天蓝与微粒浮动，搭配 `lofi` 慢摇配乐。
   - `tech_blueprint`（工程师蓝图）：普鲁士深蓝网格拓扑、亮电青发光连线，搭配 `tech_pulse` 科技脉冲配乐。
   - `modern_business`（现代科技轻商务）：高级深灰紫与翡翠绿微透质感，搭配 `ambient` 氛围音。
   - `academic_paper`（极简学术白板）：沉稳低饱和暖白纸面、墨黑线条、荧光马克笔重点，搭配 `minimal_piano` 极简钢琴。
   - `retro_rpg`（像素极客冒险）：经典赛博网格、CRT 扫描线、经验条与金币，搭配 `chiptune` 8-bit 配乐。
3. **与用户确认风格后进入第二阶段。**

---

### 第二阶段：分镜制作、图片预览与交互迭代 (Phase 2: Storyboard Preview & Review)

在生成完整视频之前，**必须先生成分镜效果图供用户预览与确认**：

1. **脚手架与文案提取：**
   ```sh
   node <skill-dir>/bin/new-video.mjs <dir> --title "视频标题" --theme <theme_id> [--dur 44]
   ```
   在 `<dir>/script.txt` 中编写 4–8 句口语化解说词（`n1: ...`），数字与缩写按发音展开。
2. **逐句配音与实测时间轴：**
   ```sh
   # 自动使用 Fish Audio API（读取 FISH_API_KEY 环境变量，或回退至 edge-tts / macOS say）
   python3 <skill-dir>/bin/tts.py --text "第一句解说词。" --out <dir>/audio/n1.mp3
   ffprobe -v error -show_entries format=duration -of csv=p=0 <dir>/audio/n1.mp3
   ```
   计算并严格锁定时间轴（`o1 = 0.6`, `o(i+1) = o(i) + d(i) + 0.8`, `DUR = oN + dN + 2.5`），写入 `demo.js` 的 `DUR`、`BEATS`、`SUBS`。
3. **分镜动效排版（Drafting Beats）：**
   在 `demo.js` 中使用 `V.*` 知识可视化组件库（`compareView`、`metricCard`、`stepList`、`quoteCard`、`nodeGraph`、`panel`、`card` 等）实现各幕画面。
4. **生成全套分镜效果图（Storyboard）：**
   ```sh
   node <skill-dir>/bin/render.mjs <dir> storyboard
   # 或在项目目录下直接运行: ./run.sh storyboard
   ```
   2 秒内自动分析所有幕的起止区间，捕获各幕高潮画面的高清截图至 `<dir>/out/storyboard/act_*.png`，并生成预览画廊网页 `<dir>/out/storyboard/index.html`。
5. **向用户展示分镜效果并征询反馈：**
   - 提取生成的各幕关键帧图片（`act_1.png`, `act_2.png`, ...），向用户展示每幕的画面预览、对应解说词与视觉重点；
   - 征询用户反馈：“请查看以上分镜效果图。您可以提出任何调整建议（如更换配色、调整元素大小、重排版式、替换隐喻等）。”
   - 若用户提出修改需求：修改 `demo.js` 后重新运行 `./run.sh storyboard`，秒级呈现新效果图，直到用户满意。
   - **获得用户明确确认（“效果满意，开始生成”）后，再启动第三阶段。**

---

### 第三阶段：全量渲染与合成交付 (Phase 3: Video Rendering & Muxing)

1. **配乐与智能混音：**
   ```sh
   python3 <skill-dir>/bin/make_music.py --dur DUR --bounds 0,o2,...,DUR --genre <genre> --out <dir>/audio/music.wav
   python3 <skill-dir>/bin/make_mix.py --dir <dir> --offsets o1,o2,... --dur DUR
   # 或在项目目录下运行: ./run.sh music && ./run.sh mix
   ```
2. **全量视频逐帧渲染：**
   ```sh
   node <skill-dir>/bin/render.mjs <dir> video [--res 4k|2k|1080p] [--fps 30|24]
   # 或在项目目录下运行: ./run.sh video --res 4k --fps 24
   ```
   - 支持画质选项：`--res 4k`（默认推荐，3840×2160 UHD 超高清）、`--res 2k`（2560×1440 QHD）、`--res 1080p`（1920×1080 FHD 极速导出）。
3. **音视频合流与交付：**
   ```sh
   ffmpeg -y -i <dir>/out/video.mp4 -i <dir>/audio/mix.wav -c:v copy -c:a aac -b:a 160k <dir>/out/final.mp4
   # 或在项目目录下运行: ./run.sh mux
   ```
   最终产物输出为 `<dir>/out/final.mp4`，直接交付给用户。

---

## 交付物与质量守则
1. **分镜必审**：禁止直接跨过分镜直接渲染全量视频。先出图片，确认满意再跑视频。
2. **时间轴必测**：绝不猜时长，严格通过 `ffprobe` 测量配音。
3. **字体与间距**：CJK 标题间距 `gap >= px + 14`；文字必须使用 `wrapCN` 控制在容器边界内。
4. **渲染环境与画质**：逻辑坐标统一为 1920×1080，支持 `--res 4k` 自动进行 Canvas 2D 与矢量字体的高精细光栅化放大，零模糊；零外部 webfont 依赖。
