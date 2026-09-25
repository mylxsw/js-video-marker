---
name: "video-maker"
description: "Create or revise animated explainer videos from articles, text, or scripts. Select visual styles and scene-specific production tools (Canvas, Remotion, p5.js, Three.js), align narration and captions, review storyboards, and render. Use when making videos or extending the video-maker toolkit."
---

# Video Maker · 可扩展多风格视频框架

## 核心设计理念
本框架将文章或脚本转化为解说动画视频。核心原则：**内容、风格、字幕、配乐和制作技术分离；先核对旁白与画面的意思，再确认分镜和全量渲染**。

每套风格在 `styles/<id>.json` 中独立定义设计理念、画面家族、入退场动效、顶部界面元素、字幕和配乐。`lib/scenes.js` 根据同一份语义场景数据绘制不同构图。新项目复制一份可编辑的 `style.js`，不会因日后改动预设而悄悄改变旧项目。已有 `V.*` 组件与旧项目接口继续可用。扩展新风格时读 [references/styles.md](references/styles.md)。

**每次创作都主动做一次画面方法与制作技术选择**，不等用户提到 Remotion、p5.js 或 Three.js。先为各幕确定要让观众看懂的变化，再选择现有 Canvas、Remotion 的 React/SVG、p5.js 程序化二维画面或 Three.js 空间画面；同一视频可按幕组合。判断标准、组合方式、技术验证和交互输出见 [references/creative-production.md](references/creative-production.md)。技术选择不等于风格选择；不要为展示工具而加无关特效。

在耗费较多时间进行逐帧全量视频渲染之前，先生成**分镜效果图（Storyboard Keyframes）**，让用户预览每一幕的排版、配色、图表和字幕。按反馈修改，确认视觉方案后再全量渲染。字幕应在分镜预览前就按实际配音切成短句，不能把一幕的全部文案塞进一屏。

> [!TIP]
> **环境检查：** 首次使用或排查问题时，可运行 `node <skill-dir>/bin/doctor.mjs` 自检当前系统环境与依赖。`<skill-dir>` 为本技能所在的根目录。

---

## 完整工作流：三阶段闭环

### 第一阶段：内容分析与风格推荐 (Phase 1: Style Alignment)

当用户提供一篇文章时，先分析题材特征并与用户对齐风格：

1. **内容特征分析与表现方式：**
   - **题材调性**：个人成长与哲学认知、系统架构与编程实战、商业战略与产品财经、论文解析与数理逻辑、极客突破等。
   - **核心视觉隐喻**：左右对比分栏（认知误区 vs 核心重构）、关键数据冲击（10x / 92%）、流程步骤（01 → 02 → 03）、概念拓扑（因果回路）、深度名言金句。
   - **观众需要看到的变化**：比较、因果、筛选、积累、路径、尺度、人物选择等。逐幕决定适合静态排版、二维动态关系还是空间演示，并初选制作技术。具体判断见 [references/creative-production.md](references/creative-production.md)。
2. **给出 2–3 种画面结构真正不同的候选，而不只换色：** 运行 `node <skill-dir>/bin/style-config.mjs list` 查看风格包。当前有 `minimal_dark`（知识卡片）、`tech_blueprint`（工程图）、`modern_business`（商业简报）、`academic_paper`（学术白板）、`retro_rpg`（游戏任务）、`editorial_ink`（杂志排版）、`kinetic_type`（动感字体）、`warm_story`（温暖叙事）、`comic_duo`（双人黑白漫画）。按题材推荐，不总把深色科技风放在第一位。漫画风的角色与分镜用法见 [references/comic-duo.md](references/comic-duo.md)。
3. **确认本片的语言选择：** 主动画面文字、解说语言与音色、字幕语言（单语或双语）分别询问；已有明确要求就沿用，不重复追问。不要把某次视频的英文解说或中英双语字幕写成所有项目的默认语言。
4. **与用户确认风格后进入第二阶段。** 技术选择由创作团队按分镜目标负责；只有它会显著改变成片形式、成本或交付物时才向用户说明并确认。

---

### 第二阶段：分镜制作、图片预览与交互迭代 (Phase 2: Storyboard Preview & Review)

在生成完整视频之前，**必须先生成分镜效果图供用户预览与确认**：

1. **脚手架与文案提取：** 先记录本片的风格、场景方法、制作技术和交付形式。现有命令生成的是 **Canvas 2D 项目**；选择 Remotion 等新路径时按 [references/creative-production.md](references/creative-production.md) 建项目专用原型，不把下面的 Canvas 命令误当成已支持的 Remotion 导出。
   ```sh
   node <skill-dir>/bin/new-video.mjs <dir> --title "视频标题" --style <style_id> [--dur 44]
   ```
   在 `<dir>/script.txt` 中编写口语化解说词。`n1…nN` 是配音文件/分镜单位，不等于字幕单位。`<dir>/style.js` 是该视频的独立风格配置，可单独调整画面家族、动效、字幕和音乐。
2. **分段配音与实测时间轴：**
   ```sh
   # 自动使用 Fish Audio API（读取 FISH_API_KEY 环境变量，或回退至 edge-tts / macOS say）
   python3 <skill-dir>/bin/tts.py --text "第一句解说词。" --out <dir>/audio/n1.mp3
   ffprobe -v error -show_entries format=duration -of csv=p=0 <dir>/audio/n1.mp3
   ```
   计算并锁定分镜与配音时间轴（`o1 = 0.6`, `o(i+1) = o(i) + d(i) + 0.8`, `DUR = oN + dN + 2.5`）；Canvas 路径写入 `demo.js` 的 `DUR`、`BEATS`，其他路径用同一份实际音频时间数据。再依据**最终配音的词/句时间戳**生成独立的 `SUBS`：一句或一个自然停顿对应一条字幕；长句可拆成连续、语义完整的短语。每条字幕只含当前说到的内容，单语一行，双语最多两行。优先使用当前 TTS 提供的时间戳或可靠的语音对齐/转写；人工听校转场、专有名词和片尾。只有无法取得更细时间戳时，才按音频波形与试听手动标注，不按整段平均语速均分。Canvas 管线细节见 [references/pipeline.md](references/pipeline.md)。
3. **先写分镜意图，再绘制（Drafting Beats）：**
   逐幕填写项目 `STORYBOARD.md`：旁白原句与时间、要表达的意思、画面变化、人物与物件的关系、画面短标签、不能暗示的额外结论，**以及画面方法、技术选择和声音触发的关键动作**。按 [references/storyboard-quality.md](references/storyboard-quality.md) 核对。Canvas 项目再在 `demo.js` 的 `SCENES` 中写语义内容（`statement`、`contrast`、`steps`、`quote`）；`SceneStyles.draw` 会按选定风格绘制。需要某套风格的新构图时，为其新增场景家族或注册自定义绘制函数，不要把所有项目都套进卡片/终端组件。通用 `V.*` 组件仍可用于局部定制。若选择新技术，先做代表性短段样片，确认它在目标环境中能预览、逐帧稳定导出并与字幕同步，再扩展全片。
4. **生成全套分镜效果图（Storyboard）：** Canvas 项目使用下面的命令；其他技术按同一份分镜时间轴生成关键帧、预览与导出，并保持相同的审查标准。
   ```sh
   node <skill-dir>/bin/render.mjs <dir> storyboard
   # 或在项目目录下直接运行: ./run.sh storyboard
   ```
   2 秒内自动分析所有幕的起止区间，捕获各幕高潮画面的高清截图至 `<dir>/out/storyboard/act_*.png`，并生成预览画廊网页 `<dir>/out/storyboard/index.html`。
5. **向用户展示分镜效果并征询反馈：**
   - 提取生成的各幕关键帧图片（`act_1.png`, `act_2.png`, ...），向用户展示每幕的画面预览、对应解说词与视觉重点；对照 `STORYBOARD.md` 检查画面有没有说偏、提前剧透或增加结论。另抽查每幕进入后、关键词处、结束前、最长字幕和相邻字幕切换点。
   - 征询用户反馈：“请查看以上分镜效果图。您可以提出任何调整建议（如更换配色、调整元素大小、重排版式、替换隐喻等）。”
   - 若用户提出修改需求：修改 `demo.js` 后重新运行 `./run.sh storyboard`，秒级呈现新效果图，直到用户满意。
   - **获得用户明确确认（“效果满意，开始生成”）后，再启动第三阶段。**

---

### 第三阶段：全量渲染与合成交付 (Phase 3: Video Rendering & Muxing)

以下命令是当前 **Canvas 2D** 实现。Remotion 等项目以通过样片验证的项目时间轴和导出流程完成同样的配乐、字幕、画质及音画检查；不要把两套导出命令混用。

1. **配乐与智能混音：**
   ```sh
   node <skill-dir>/bin/make-style-music.mjs <dir> --dur DUR --bounds 0,o2,...,DUR
   node <skill-dir>/bin/make-style-mix.mjs <dir> --offsets o1,o2,... --dur DUR
   # 或在项目目录下运行: ./run.sh music && ./run.sh mix
   ```
2. **全量视频逐帧渲染：** Canvas 项目使用下面的命令；Remotion 项目使用经短段样片验证的项目导出流程，不能直接调用当前 Canvas 导出器。
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
2. **字幕独立配置**：逐句对齐与不叠长段落是通用质量要求；字号、颜色、描边、位置、行距由 `style.js.captions` 独立配置。当前预设默认无背景框，单语一行、双语最多两行。用户指定其他样式时以用户要求为准。
3. **时间轴必测**：用 `ffprobe` 测量配音时长，再用最终音频的词/句时间戳校准每条字幕。重新生成配音后，重做字幕对齐。
4. **字体与间距**：CJK 标题间距 `gap >= px + 14`；画面正文用 `wrapCN` 控制在容器边界内；字幕按可读宽度检查并拆句。
5. **成片必检**：抽查开头、中段、结尾、最长字幕和快切处；检查文字溢出、字幕与声音同步、音画完整性。需要外置字幕时，从同一份时间轴导出 SRT。
6. **风格必检**：比较候选风格的分镜时，要看构图、字体、动效、界面元素和配乐是否真的不同；不把换色当作新风格。画面应服从内容，而非为了展示组件而加卡片、时间码或游戏元素。
7. **渲染环境与画质**：逻辑坐标统一为 1920×1080，支持 `--res 4k` 自动进行 Canvas 2D 与矢量字体的高精细光栅化放大，零外部 webfont 依赖。
8. **调试结果回收**：短段样片发现的通用问题，修到对应风格素材、运行时代码或本 skill 的检查协议；文章专属隐喻留在项目中。避免下一支视频重复试错。
9. **制作技术决策与复用**：每支新视频至少在分镜中记录一次选用 Canvas、Remotion、p5.js、Three.js 或组合的理由；按画面目标而非工具热度选择。新技术先短段验证、记录依赖与导出条件；验证通过的通用场景封装进框架，不能让下一支视频重新搭同一套管线。交互网页与线性 MP4 是不同交付物，按本片需求决定是否制作。
