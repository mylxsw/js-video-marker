# 风格包：公共框架与扩展方式

## 分层

| 层 | 负责什么 | 文件 |
|---|---|---|
| 内容 | 解说、分镜时间、语义场景、逐句字幕文字与时间 | 项目 `demo.js`、`script.txt` |
| 风格包 | 设计理念、主题、场景家族、动效、顶部界面、字幕样式、配乐 | `styles/<id>.json`；新项目复制为 `style.js` |
| 公共绘制 | 背景、字幕、图形组件、场景家族、角色、预览/渲染 | `lib/themes.js`、`lib/anim.js`、`lib/scenes.js`、`lib/characters.js` |
| 音频 | 按风格包选择程序化音乐或用户素材，再与配音混音 | `bin/make-style-music.mjs`、`bin/make_music.py` |

`node bin/style-config.mjs list` 列出风格。`node bin/new-video.mjs <dir> --style <id>` 创建独立项目。旧项目的 `V.createApp({theme, drawBeat})` 仍可用；新项目传 `style: VIDEO_STYLE` 和 `SceneStyles.draw(...)`。

风格包描述画面的设计语言，不指定唯一制作引擎。同一风格可用现有 Canvas 实现，也可在经过样片验证的新项目里用 Remotion 编排 React/SVG、p5.js 或 Three.js 场景。字幕、配乐和语言保持独立。每次创作的技术选择规则见 [creative-production.md](creative-production.md)；当前脚手架和导出命令仍只实现 Canvas 2D。

## 风格包字段

```json
{
  "id": "editorial_ink",
  "name": "杂志墨印",
  "design": "一句话说明整体设计逻辑",
  "useFor": "适合的内容类型",
  "theme": { "extends": "academic_paper", "id": "editorial_ink", "colors": {}, "background": {} },
  "scene": { "family": "editorial", "font": "serif", "accent": "rule" },
  "motion": { "entry": "wipe", "enterSeconds": 0.45, "exitSeconds": 0.28 },
  "chrome": { "hud": "none" },
  "captions": { "maxWidth": 1700, "bottomY": 980, "lineGap": 65, "colors": ["#222", "#555"], "outline": "#fff", "shadow": "#eee" },
  "audio": { "source": "generated", "genre": "minimal_piano", "bpm": 76 }
}
```

- `theme` 可以直接写已有主题名，也可以用 `{extends, colors, background, font, ui}` 组合新主题。主题只决定材料和颜色；真正的版式由 `scene.family` 决定。
- `scene.family` 是场景绘制策略。内置 `cards`、`blueprint`、`presentation`、`whiteboard`、`editorial`、`game`、`kinetic`、`story`、`comic`；不同家族在构图和图形语言上分离。`scene.font`、`scene.accent` 可供家族读取。漫画风的角色数据与场景用法见 [comic-duo.md](comic-duo.md)。
- `motion.entry` 控制场景中的进入方式；`enterSeconds` / `exitSeconds` 控制分镜透明度。内置家族可再结合风格做特定运动。
- `chrome.hud` 可设 `none`、`minimal`、`pill`、`retro`。除非内容确实需要，避免每支视频都显示时间码。
- `captions` 与画面主题分开。可设 `primarySize` / `secondarySize`、`fonts`、`weights`、`colors`、`outline`、`shadow`、`maxWidth`、`centerX`、`bottomY`、`lineGap`、`fadeIn`、`fadeOut`；文字内容和语言仍由项目字幕数据决定。
- `audio.source` 为 `generated` 时填写 `genre`、`bpm`；为 `file` 时填写相对于项目目录的 `path`（或绝对路径）。`audio.mix` 可设置 `musicLevel` 和 `duckLevel`（旁白时的音乐倍率，均为 0–1）。`make-style-music.mjs` 与 `make-style-mix.mjs` 从项目 `style.js` 读取配置。配音与字幕语言不属于风格包。

## 场景内容协议

同一份 `SCENES` 可以直接换风格预览：

- `statement`: `{type, kicker, title, body, items?}`
- `contrast`: `{type, kicker, title, left:{title,body,items?}, right:{title,body,items?}}`
- `steps`: `{type, kicker, title, items:[{title,body?}, ...]}`
- `quote`: `{type, kicker, quote, author?}`

内容脚本可以超出这些通用形状；需要某套风格特有的画面时，在项目里加入 `lib/scene-extension.js`，通过 `SceneStyles.register('my_family', (scene, u, t, style) => { ... })` 注册绘制函数，并在 `index.html` 中于 `demo.js` 前加载它。只要绘制函数使用时间参数而不保存可变帧状态，预览、抽帧和全量渲染就会一致。

## 新增风格

1. 复制最接近的 `styles/<id>.json`，改 `id`、设计目标和各层配置；不要只改颜色。先决定它的典型构图、动效和是否需要顶部界面。
2. 若现有 `scene.family` 不能体现新风格，在 `lib/scenes.js` 增加家族或注册项目扩展。保持语义场景数据与样式分离。
3. 用相同的 `SCENES` 为新旧风格各生成开头、对比和步骤分镜。检查它们在黑白截图下是否仍明显不同，并抽查字幕对比度和最长文字。
4. 通过 `node bin/style-config.mjs list` 检查配置，再用 `new-video.mjs --style <id>` 建项目实际渲染。配乐由风格包路由；需要素材文件时先确保它在项目内可读。

风格包是起点，不替代对具体文章的设计判断。不要把示例标题、卡片或场景数量当作固定模板；按文章内容删改 `SCENES`。
