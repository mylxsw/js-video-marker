# 双人黑白漫画风 `comic_duo`

这套风格用用户给的两张角色图作为设定参考：没头脑（稀疏三撮头发、开朗）和不高兴（黑色锯齿刘海、严肃）。参考图保存在 `assets/comic-duo/`；可复用的透明姿势素材是 `assets/comic-duo/pose-sheet.png`，新建 `comic_duo` 项目时会复制到项目内。每个角色有多种固定姿势，切镜头时换姿势；不要按配音音量让嘴反复开合。

## 用途与限制

适合人物对比、观点转变、生活场景和带轻幽默的知识解说。漫画人物要**参与旁白所述的事件**：看向目标、指出差异、使用物件、走上路径。仅把两人放在画面两侧、中央堆放无关图标，会像贴纸而不像故事。每幕先按 [storyboard-quality.md](storyboard-quality.md) 写明句意、画面变化和人物与物件的关系。

旁白是独立解说时，角色默认闭嘴，也不放对话气泡；角色有明确对白且与语音时间相符时，才在 `scene.comic` 中设置 `dialogue: true` 并安排发言。不要把整段旁白塞入气泡。画面标题和短标签只用于辨识概念，不重复整句字幕，也不替原文添加结论。

## 项目用法

`node bin/new-video.mjs <dir> --style comic_duo --title "标题"`。`style.js.characters.render` 默认为 `sprite`，并由 `lib/characters.js` 读取项目内姿势素材。`scene.family` 为 `comic`；字幕与配乐仍分别由 `SUBS` 与 `style.js.audio` 控制。既有通用 `statement`、`contrast`、`steps`、`quote` 可以起草分镜；遇到需要具体事件或复杂隐喻的内容，在项目中注册专门的绘制函数，不要用通用气泡版式硬套。

可用姿势：没头脑的 `scratch`、`run`、`point`、`glass`，不高兴的 `fold`、`point`、`think`、`step`。`neutral`、`cheer` 等旧名仍有对应姿势。脚下位置由 `x/y` 指定；人物脚、手势、视线要和画面物件对上。透明素材保留参考图的线条感；若需要新姿势，先按相同角色比例补充姿势素材并检查连续镜头中的身份一致性。

音乐预设为 `comic_pluck`；更严肃的片子可以在项目 `style.js.audio` 中换掉。人物、音乐、字幕配置彼此独立。这个风格的选用应由内容决定，不把角色当所有题材的固定主持人。
