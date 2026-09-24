# 管线详解与故障排查

## 时间轴锁定（步骤 3 的完整公式）

设 TTS 实测时长为 d1..dN（秒）：

```
o1 = 0.6
o(i+1) = o(i) + d(i) + 0.8        # 解说偏移：上一句结束 + 0.8s 气口
BEATS = [[0, o2], [o2, o3], …, [oN, oN + dN + 2.5]]
DUR = oN + dN + 2.5               # 片尾留 2.5s 给结束卡
SUBS[i] = [o(i), o(i) + d(i), text_i]
```

配乐 `--bounds` = `0,o2,o3,…,DUR`；混音 `--offsets` = `o1,o2,…,oN`。

示例（d = [5.11, 15.6, 8.52, 9.41]）：
offsets = 0.6, 6.51, 22.91, 32.23；BEATS = [0–6.51],[6.51–22.91],[22.91–32.23],[32.23–44.0]；DUR = 44。

## 配音注意事项

- 必须 **逐句** 生成独立 mp3（`n1.mp3…nN.mp3`），整段生成无法精确测量每句时长。
- 中文数字、缩写、时间按读音写（"四十二" 而非 "42"）。
- TTS 后端输出时长 **每次可能不同**（同文本曾测得 5.11s 与 8.35s 两个版本）。凡重新生成配音，必须重新 `ffprobe` 测量并重锁时间轴。
- 音色与引擎：使用 `bin/tts.py` 支持多种后端（默认自动优选最优质可用引擎）：
  - `Fish Audio API`（首选推荐）：高品质逼真 AI 语音。只需配置环境变量 `FISH_API_KEY`（或 `FISH_AUDIO_API_KEY`），脚本自动识别启用。支持 `--voice <reference_id>` 指定定制或社区音色，支持 `--model s2.1-pro` 与 `--speed 1.1` 调节语速。
  - `edge-tts`：高质量免费微软神经网络语音（如 `zh-CN-XiaoxiaoNeural`、`zh-CN-YunxiNeural`，需 `pip install edge-tts`）。
  - macOS `say`：macOS 自带离线语音（默认 `Tingting`，无需网络或 pip 安装）。
  - 可指定 `--engine auto|fish-audio|edge|say|system` 与 `--voice <id_or_name>` 进行切换。

## 配乐说明

`make_music.py` 支持多种程序化合成风格及外部 BGM 导入：
- 风格参数 `--genre`：
  - `lofi`: 温暖复古 Rhodes 电子琴和弦 + 软质低音 Sub Bass + 黑胶唱片微底噪 + 慢摇镲片（适合认知成长、深度思考、哲学反思）。
  - `tech_pulse`: 16分音符琶音 + 脉冲贝斯 + 电子高频镲片（适合工程蓝图、系统架构、硬核实战）。
  - `ambient`: 空灵宽广长音垫 + 泛音五度 + 深度氛围（适合宏观视野、冥想、战略格局）。
  - `minimal_piano`: 极简沉思钢琴和弦 + 抒情单音旋律（适合学术论文、数理逻辑、知识科普）。
  - `chiptune`: 经典 8-bit 方波主旋律 + 三角波贝斯 + 噪声打击（适合极客游戏、突破挑战）。
- 外部 BGM 支持 `--bgm <path>`：
  - 若传入本地 mp3/wav 音乐文件，会自动通过 ffmpeg 解码、裁剪、规整单声道 44.1kHz，并自动追加首部 0.5s 淡入与尾部 1.5s 渐弱淡出。

## 混音说明

`make_mix.py`：解说按偏移摆位；配乐在每段解说前后各留 0.3s/0.4s，用余弦包络压到 0.32（ducking），解说电平优先。输出 44.1kHz 单声道 16-bit。会自动检查背景音乐与解说音频完整性。

## 渲染说明

- `render.mjs <dir> storyboard`（强烈推荐！）：自动感知 `BEATS` 各幕区间，并在 2 秒内截取每一幕的视觉高潮帧（`out/storyboard/act_*.png`），同时生成 `out/storyboard/index.html` 预览画廊，供用户和创作者直观审查视觉版式与字幕。
- `render.mjs <dir> snaps`：用于自定义时间戳抽帧；`--snaps t1,t2` 可指定关键时间点，质检时优先取「转场点 ±0.3s」和「字幕切换点」。
- `render.mjs <dir> video`：30fps 逐帧截图 → 管道喂给 ffmpeg（libx264 crf 18）。44s 约 1320 帧，耗时约 10–20 分钟（主要花在截图 IPC）。可开 `--fps 24` 提速，肉眼差别不大。
- Chrome 路径：内置跨平台自动探测机制（支持 macOS Chrome/Edge、Linux chrome/chromium、Windows 等）。亦可使用环境变量 `VM_CHROME` 显式覆盖。
- 端口与资源：默认优先使用 9222 端口，若被占用会自动寻找可用空闲端口；退出或中断时会自动清理临时用户数据目录与 Chrome 进程。
- 页面必须走 `file://` 协议。使用 `pathToFileURL` 保证跨平台路径正确解析为标准 URL。

## 质检清单（看抽帧图时逐项过）

1. 文字是否清晰、有无溢出卡片/面板边界（中文按 `wrapCN` 换行，英文注意 `measureText`）。
2. 翻转/缩放动画中的文字是否镜像——一律用 `V.flipCard`，不要手写 `scale(-x,1)`。
3. 元素退场是否干净：人物、护盾等淡出必须在字幕/结束卡出现前完成（参考 `goneFrom` 模式）。
4. 字幕时间窗是否落在解说区间内；字幕条是否遮挡关键画面（字幕在底部 28px 以上）。
5. 渲染模式画布是否为精确 1920×1080（`V.createApp` 已用内联样式锁定；不要只依赖 CSS 类）。
6. 首尾黑场：`createApp` 自动加 0.5s 淡入 / 1.2s 淡出。

## 真实踩过的坑（已沉淀为组件/规则）

| 坑 | 教训 |
|---|---|
| 翻转卡片文字镜像 | `V.flipCard` 背面绘制前 `scale(-1,1)` 取消镜像 |
| 渲染模式画布尺寸被 CSS 覆盖 | `createApp` 用 JS 内联样式锁定，不依赖样式表特异性 |
| 人物/护盾淡出与结尾文字重叠 | 退场包络 `gone` 必须早于结束卡 1s 以上完成 |
| Chrome 拦截本地 http.server | 全链路走 `file://` |
| TTS 同文本两次时长差 60% | 时间轴永远从实测重算，不许凭记忆 hardcode |
| 后台任务误删配音文件 | 混音前用 `ffprobe` 批量核对 n1..nN 时长，异常即停 |
| `cd dir && tts … & tts … &` 第二个 tts 没进目录 | `&&` 只绑定第一个后台任务；逐句 tts 用分开的命令或先 `cd` 再逐个运行 |
| CJK 字符在 `titlePop` 重叠 | 字符间距 `gap` 必须至少大于 `px + 2`（推荐 `px + 14`） |
| 单行 card 文本溢出 | `card` 的 `desc` 是单行不换行，限 12–15 字；如需多段长文使用 `compareView` 或 `stepList` |

## 复刻新视频的最简命令序列

```sh
# 设 SKILL_DIR 为本技能代码所在绝对路径
SKILL_DIR="/path/to/video-maker"
D=~/projects/my-video

# 1. 初始化项目（支持 --theme minimal_dark|tech_blueprint|modern_business|academic_paper|retro_rpg）
node "$SKILL_DIR/bin/new-video.mjs" "$D" --title "标题" --theme minimal_dark

cd "$D" && $EDITOR script.txt

# 2. 逐句生成配音并测时长（可使用 bin/tts.py）
python3 "$SKILL_DIR/bin/tts.py" --text "第一句解说词。" --out audio/n1.mp3
ffprobe -v error -show_entries format=duration -of csv=p=0 audio/n1.mp3

# 3. …根据实测时长填 demo.js 时间轴与 BEAT 函数…

# 4. 生成配乐（自动匹配对应主题音乐风格）
./run.sh music --dur $DUR --bounds 0,…,$DUR

# 5. 抽帧质检（看图修 bug）
./run.sh snaps

# 6. 混音
./run.sh mix --offsets 0.6,… --dur $DUR

# 7. 全量渲染与音视频合成
./run.sh video
./run.sh mux
```
