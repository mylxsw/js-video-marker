# V.* 组件库 API（lib/anim.js）

浏览器全局 `V`。先 `V.mount(document.getElementById('c'))`，再在 beat 函数里调用。
约定：`u` = 本幕内时间（幕开始为 0），`t` = 全局时间。所有绘制都是时间的纯函数——不要在 beat 里存状态。

## 补间 DSL

| API | 说明 |
|---|---|
| `V.seg(t, a, b)` | 时间段进度 0→1（钳制） |
| `V.tw(t, a, b, ease)` | 缓动后的 0→1，默认 `E.inOut` |
| `V.mv(t, t0, t1, a, b, ease)` | 缓动插值 a→b |
| `V.E` | `lin / in / out / inOut / outBack / outElastic` |
| `V.hash(i, j)` | 确定性伪随机 0→1（粒子/布局抖动用它，不用 Math.random） |
| `V.clamp / V.lerp / V.TAU / V.W / V.H / V.CN / V.MONO` | 常量与数学 |

## 基础绘制

| API | 说明 |
|---|---|
| `V.rrect(x,y,w,h,r)` / `V.circle(x,y,r)` | 路径（需自己 fill/stroke） |
| `V.text(str,x,y,px,fill,font,weight,align)` | 文本，默认中黑 700 居中 |
| `V.glowText(str,x,y,px,fill,glow,weight)` | 发光标题 |
| `V.wrapCN(str,maxW,px,weight)` | 中文自动换行 → 行数组 |
| `V.icon(kind,x,y,s,color)` | 矢量图标，无需 emoji 字体。kind: `trophy warn map swords phone bell play chat check star bolt clock heart` |
| `V.withAlpha(k, fn)` | 以透明度 k 执行绘制（淡入淡出包装） |

## 场景

| API | 说明 |
|---|---|
| `V.bg(t, opts)` | 深色游戏世界：渐变 + 漂移网格 + 上升粒子 + 暗角。opts: `{c1,c2,c3,particles}` |
| `V.scanlines()` | CRT 扫描线 |
| `V.hud(t, label)` | 左上标题 + 右上 `T+MM:SS` |
| `V.drawSubs(t, subs, show)` | 底部字幕条。subs: `[[start,end,text],…]`，自动换行、进出淡入淡出 |
| `V.toast(str,cx,cy,k,color)` | 小横幅（如 "MAP UNLOCKED"），k 为 0→1 包络 |

## 组件

| API | 说明 |
|---|---|
| `V.panel(x,y,w,h,{color,titleEn,titleZh})` | 发光面板 → 返回内容区左上 `{x,y}` |
| `V.card(x,y,{icon,color,zh,en,desc,w,h})` | 信息卡：图标徽章 + 中文标题 + 英文副标题 + 分隔线 + 描述 |
| `V.flyIn(u,t0,dur,fromY,i,fn,t)` | 纵向飞入包装（带轻微浮动） |
| `V.xpBar(x,y,w,h,fill)` | 渐变经验条 + `EXP n%` |
| `V.levelUp(cx,cy,k,u,str)` | 旋转放射线 + "LEVEL UP!"，k 为包络 |
| `V.questLog(px,py,pw,ph,quests,u,t,opts)` | 任务面板：逐条打勾（`{t,xp}`）+ XP 飘字 + 经验条 + 升级爆发。opts: `{color,titleEn,titleZh,t0,gap,barFrom,barTo,levelText}` |
| `V.rulesList(rx,ry,rw,rh,rules,u,opts)` | 规则列表面板 |
| `V.person(cx,baseY,s,k,color)` | 人物剪影 |
| `V.shieldScene(cx,cy,R,u,t,distractions,opts)` | 注意力护盾：人物 + 扩散冲击波 + 稳定气泡 + 六边形微光；`distractions:[{icon,color,from:[x,y]}]` 飞入→撞击（闪光+护盾抖动）→弹开。opts: `{goneFrom}`（退场时间）→ 返回 gone 进度 |
| `V.flipCard(cx,cy,w,h,u,t0,dur,front,back,colorA,colorB)` | 翻转身份卡；**背面文字自动取消镜像**（质检证实的坑已在内部处理）。front/back 为绘制回调（以卡片中心为原点） |
| `V.pressStart(u,title)` | 闪烁的 `▶ PRESS START` 开屏 |
| `V.terminal(x,y,w,h,lines,u,t0,fadeOut)` | 终端窗口：逐行打印 + 进度条；lines: `[[文本, 延迟],…]`；返回进度 |
| `V.titlePop(str,cx,cy,u,t0,px,gap,color,glow)` | 逐字弹出标题 |
| `V.typewriter(str,cx,cy,u,t0,t1,px,color)` | 打字机英文行 + 闪烁光标 |
| `V.coins(u,t0,n,color)` | 漂浮金币 |

## App 接线

```js
V.createApp({ dur, beats, subs, label, drawBeat, bgOpts, showText });
```

- `beats`: `[[s,e],…]`；幕间自动 0.45s 交叉淡化
- `drawBeat(i, u, t)`: 第 i 幕的绘制函数
- 自动处理：背景 / 字幕 / HUD / 扫描线 / 首尾黑场淡入淡出
- `?render=1` 时进入确定性渲染模式（画布锁定 1920×1080，暴露 `window.__frame(t)` 给 render.mjs）；否则为可交互预览（播放/进度条/字幕开关/空格控制，`#bgm` 音频自动跟随）
