# V.* 组件库与多主题系统 API（lib/anim.js）

浏览器全局 `V`、`Themes` 与 `SceneStyles`。新项目通过 `style.js` 的 `VIDEO_STYLE` 统一设置视觉、动效、字幕和音乐；用 `SceneStyles.draw(scene,u,t,VIDEO_STYLE)` 绘制语义场景。旧项目仍可直接调用 `V.setTheme` 与各 `V.*` 组件。

风格包结构、场景协议与扩展方式见 [styles.md](styles.md)。

约定：`u` = 本幕内相对时间（每幕开始为 0），`t` = 全局时间戳。所有组件绘制必须保持为时间的**纯函数**——不要在 beat 函数内保存可变状态。

---

## 主题系统（Themes & V.T）

### 底层主题预设
`Themes` 保留 5 套调色、背景与字体配置，供旧项目与新风格包继承。它们本身不决定新项目的构图或配乐；完整视频风格应选 `styles/<id>.json`。
1. `minimal_dark`: 深色微光与点阵。
2. `tech_blueprint`: 深蓝网格与电青连线。
3. `modern_business`: 深灰紫与翡翠绿。
4. `academic_paper`: 浅色纸面与墨黑文字。
5. `retro_rpg`: 赛博网格与扫描线。

### 主题 API
| API | 说明 |
|---|---|
| `V.setTheme(nameOrObj)` | 切换全局活动主题。支持内置名称或自定义主题对象（见下文） |
| `V.T` / `V.theme` | 获取当前活动主题对象，可直接访问 `V.T.colors.primary`、`V.T.colors.accent`、`V.T.font.sans` 等 |
| `Themes.resolve(input)` | 将主题名称或局部配置合并为完整的主题配置对象 |

### 动态生成新主题
若内置预设无法满足特定文章氛围，可自定义全新主题或继承现有预设：
```js
V.setTheme({
  extends: 'minimal_dark', // 基于预设做微调
  name: '赛博霓虹 (Cyber Neon)',
  colors: {
    bg1: '#0a0014', bg2: '#16002c', bg3: '#220042',
    primary: '#f72585',
    accent: '#7209b7',
    glow: 'rgba(247, 37, 133, 0.35)',
  },
  background: {
    type: 'mesh',
    particles: 40,
  },
});
```

新项目的音乐单独配置在 `VIDEO_STYLE.audio`，不会由 `V.setTheme` 设置。

---

## 补间 DSL

| API | 说明 |
|---|---|
| `V.seg(t, a, b)` | 时间段进度 0→1（钳制） |
| `V.tw(t, a, b, ease)` | 缓动后的 0→1，默认 `E.inOut` |
| `V.mv(t, t0, t1, a, b, ease)` | 缓动插值 a→b |
| `V.E` | `lin / in / out / inOut / outBack / outElastic` |
| `V.hash(i, j)` | 确定性伪随机 0→1（粒子/布局抖动用它，不用 Math.random） |
| `V.clamp / V.lerp / V.TAU / V.W / V.H / V.CN / V.MONO` | 常量与数学 |

---

## 基础绘制

| API | 说明 |
|---|---|
| `V.rrect(x,y,w,h,r)` / `V.circle(x,y,r)` | 路径（需自己 fill/stroke） |
| `V.text(str,x,y,px,fill,font,weight,align)` | 文本，默认中黑 700 居中 |
| `V.glowText(str,x,y,px,fill,glow,weight)` | 发光标题 |
| `V.wrapCN(str,maxW,px,weight)` | 中文自动换行 → 行数组 |
| `V.icon(kind,x,y,s,color)` | 矢量图标（免字体依赖）。kind: `trophy warn map swords phone bell play chat check cross star bolt zap clock heart target brain refresh flame` |
| `V.withAlpha(k, fn)` | 以透明度 k 执行绘制（淡入淡出包装） |

---

## 场景基底

| API | 说明 |
|---|---|
| `V.bg(t, opts)` | 主题感知背景。根据当前主题渲染 `dots`（点阵）、`blueprint`（工程网格）、`retro_grid`（滚动网格）、`mesh`（有机渐变呼吸微光）或 `clean`（纯净纸面），附带浮动微粒与暗角 |
| `V.scanlines(force)` | CRT 扫描线（主题指定开启，或传入 force=true 强制启用） |
| `V.hud(t, label)` | 主题 HUD：支持 `pill`（胶囊微标）与 `minimal`（极简代码）风格 |
| `V.drawSubs(t, subs, show)` | 底部逐句字幕。默认无背景框，使用轻描边和阴影保证可读性；单语一行、双语上下两行 |

字幕数据示例：`[12.30, 14.75, '当前读到的一句']`；双语为 `[12.30, 14.75, ['主语言短句', '对应译文']]`。也支持 `{lines: [...]}` 和旧数据 `{en, zh}`。字幕只显示当前条目；语言和上下顺序按本片需求填写。样式优先读 `style.js.captions`，也可通过 `V.createApp({captions: {...}})` 针对本片覆盖；旧项目继续读 `ui.subtitles.captionColors` 等主题字段。
| `V.toast(str,cx,cy,k,color)` | 浮动状态横幅（如 "SYSTEM UPDATED"），k 为 0→1 包络 |

---

## 通用知识可视化组件（Universal Components）

### 1. `V.compareView(cx, cy, w, h, u, leftData, rightData, opts)`
左右分栏对比组件。极其适合展现“旧观念 vs 新观念”、“表面努力 vs 深层系统”、“错误做法 vs 避坑方案”。
- `cx, cy, w, h`: 整体中心坐标与宽高
- `leftData`: `{ title: '传统误区', subtitle: 'SURFACE EFFORT', items: ['...'], icon: 'warn', color: V.T.colors.warning }`
- `rightData`: `{ title: '核心突破', subtitle: 'DEEP CHANGE', items: ['...'], icon: 'check', color: V.T.colors.accent }`
- `opts`: `{ t0: 0.2, centerText: 'VS', gap: 40 }`

### 2. `V.metricCard(x, y, w, h, opts)`
关键数据与视觉重锤。以巨大的字体展现核心论点或数字冲击。
- `opts`:
  - `value`: `'1 DAY'` / `'10x'` / `'80%'`
  - `unit`: 可选单位
  - `label`: 顶部胶囊标签（如 `'TIMEFRAME'`）
  - `desc`: 底部解释说明
  - `color`: 主色（默认使用主题 `primary`）
  - `u, t0`: 入场时间控制

### 3. `V.stepList(x, y, w, h, steps, u, opts)`
水平有序步骤/流程图（01 → 02 → 03）。非常适合行动清单、执行步骤拆解与系统闭环。
- `steps`: `[{ step: '01', title: '反思现状', desc: '找出最深恶痛绝的生活状态' }, ...]`
- `opts`: `{ t0: 0.3, color, accent }`

### 4. `V.quoteCard(x, y, w, h, opts)`
深度思考名言 / 金句卡片。带有巨型装饰引号、关键词高亮与作者署名。
- `opts`:
  - `quote`: `'真正的改变不是建立在自律上，而是建立在不可妥协的底线上。'`
  - `author`: `'Dan Koe'`
  - `source`: `'How to fix your life'`
  - `color, u, t0`

### 5. `V.nodeGraph(cx, cy, nodes, edges, u, opts)`
概念拓扑图 / 系统回路。带有运动数据脉冲粒子。
- `nodes`: `[{ id: 'a', x: -200, y: 0, label: '欲望', icon: 'zap' }, ...]`
- `edges`: `[{ from: 'a', to: 'b', label: '驱动' }]`
- `opts`: `{ t0: 0.2 }`

---

## 游戏化与经典组件

| API | 说明 |
|---|---|
| `V.card(x,y,{icon,color,zh,en,desc,w,h})` | 信息卡片：图标徽章 + 中文标题 + 英文副标 + 描述 |
| `V.panel(x,y,w,h,{color,titleEn,titleZh})` | 发光容器面板 |
| `V.flyIn(u,t0,dur,fromY,i,fn,t)` | 纵向平滑飞入包装（带轻微自然浮动） |
| `V.xpBar(x,y,w,h,fill)` | 经验/进度条 |
| `V.levelUp(cx,cy,k,u,str)` | 旋转放射辉光 + 标题爆发 |
| `V.questLog(px,py,pw,ph,quests,u,t,opts)` | 任务面板：逐项打勾 + XP 飘字 + 升级爆发 |
| `V.rulesList(rx,ry,rw,rh,rules,u,opts)` | 规则列表面板 |
| `V.person(cx,baseY,s,k,color)` | 人物剪影 |
| `V.shieldScene(cx,cy,R,u,t,distractions,opts)` | 注意力护盾：抵抗各种诱惑冲击波与反弹粒子 |
| `V.flipCard(cx,cy,w,h,u,t0,dur,front,back)` | 翻转身份卡片（背面文字镜向问题已内置修正） |
| `V.pressStart(u,title)` | 闪烁提示开屏 |
| `V.terminal(x,y,w,h,lines,u,t0,fadeOut)` | 终端逐行打印与进度加载 |
| `V.titlePop(str,cx,cy,u,t0,px,gap,color,glow)` | 逐字弹性弹出标题 |
| `V.typewriter(str,cx,cy,u,t0,t1,px,color)` | 打字机英文标题 + 闪烁光标 |
| `V.coins(u,t0,n,color)` | 漂浮金币/星标微粒 |

---

## App 接线（createApp）

新项目：

```js
V.createApp({
  style: VIDEO_STYLE,
  dur: DUR,
  beats: BEATS,
  subs: SUBS,
  label: '视频标题',
  drawBeat: (i, u, t) => SceneStyles.draw(SCENES[i], u, t, VIDEO_STYLE),
});
```

旧项目继续支持 `theme` 和自定义 `drawBeat`；无需迁移已有 `demo.js`。

- `?render=1`：锁定 1920×1080 离屏渲染模式，暴露 `window.__frame(t)` 供 Chromium 逐帧捕获。
- 默认预览模式：提供播放/暂停、精准拖拽时间轴、毫秒级时间码展示、字幕切换与空格控制，`#bgm` 音频严格跟随。
