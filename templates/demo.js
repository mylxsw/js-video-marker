'use strict';
/* Semantic scenes rendered by the {{STYLE}} style package.
   Replace sample content, then lock BEATS to measured voice durations and SUBS to
   word/phrase times from the final narration. The selected languages are per-project. */

const DUR = {{DUR}}; // total seconds; render.mjs reads this line

// These three sample beats are only a preview. Replace with measured narration offsets.
const BEATS = [[0, DUR / 3], [DUR / 3, DUR * 2 / 3], [DUR * 2 / 3, DUR]];

// One short spoken phrase per item. Use [start, end, 'line'] or
// [start, end, ['primary line', 'translation']] for bilingual captions.
const SUBS = [
  [0.6, DUR * 0.16, '第一条短字幕。'],
  [DUR * 0.16, DUR * 0.3, '第二条短字幕。'],
  [DUR / 3 + 0.3, DUR * 0.6, '第三条短字幕。'],
  [DUR * 2 / 3 + 0.3, DUR - 1.5, '第四条短字幕。'],
];

// Semantic content stays the same when previewing different styles.
// type: statement | contrast | steps | quote. Styles decide layout and movement.
const SCENES = [
  {
    type: 'statement', kicker: '01 / 核心观点',
    title: '在这里写下核心观点',
    body: '用一句口语化的话解释它为什么重要。',
    items: ['问题', '洞察', '行动'],
  },
  {
    type: 'contrast', kicker: '02 / 对比', title: '两种不同的选择',
    left: { title: '旧方法', body: '这里描述旧方法的局限。' },
    right: { title: '新方法', body: '这里描述更好的方向。' },
  },
  {
    type: 'steps', kicker: '03 / 行动', title: '接下来可以怎么做',
    items: [
      { title: '先看清问题', body: '找到真正的阻力。' },
      { title: '再做小实验', body: '用行动验证判断。' },
      { title: '最后调整路径', body: '保留有效的做法。' },
    ],
  },
];

V.mount(document.getElementById('c'));
V.createApp({
  style: VIDEO_STYLE,
  dur: DUR,
  beats: BEATS,
  subs: SUBS,
  label: {{TITLE_JSON}},
  drawBeat: (i, u, t) => SceneStyles.draw(SCENES[i], u, t, VIDEO_STYLE),
});
