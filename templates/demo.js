'use strict';
/* {{TITLE}} — video-maker project.
   Fill in: 1) BEATS + SUBS from measured TTS durations (see SKILL.md step 3),
            2) one beat function per act using V.* components.
   render(t) must stay a pure function of t. */

const DUR = {{DUR}}; // total seconds; render.mjs parses this line

// --- timeline: [start, end] per beat, derived from TTS durations + 0.8s pads
//     narration offsets: first line at 0.6s, each next line at prev beat start + prev dur + 0.8
const BEATS = [
  // e.g. [0.0, 6.51],
];

// --- subtitles: [start, end, text] — keep inside the narration window
const SUBS = [
  // e.g. [0.6, 6.0, '第一句解说词。'],
];

V.mount(document.getElementById('c'));

// ---------------------------------------------------------------- beats
// u = beat-local time (0 at beat start), t = global time. Use V.seg/V.tw/V.mv.

function beat1(u, t) {
  // Example: boot sequence. Replace with your own scene.
  if (u < 1.3) { V.pressStart(u); return; }
  V.terminal(610, 300, 700, 300, [['> 初始化…', 1.4], ['> 加载模块 … OK', 1.9]], u, 1.3, [3.0, 3.5]);
  if (u < 3.3) return;
  V.titlePop('示例标题', 960, 470, u, 3.4);
  V.typewriter('EXAMPLE SUBTITLE', 960, 600, u, 4.7, 5.9);
}

function beat2(u, t) {
  // Example: info cards. Replace with your own scene.
  const cards = [
    { icon: 'trophy', color: '#ffd23f', zh: '卡片一', en: 'CARD ONE', desc: '说明文字' },
    { icon: 'star', color: '#4cc9f0', zh: '卡片二', en: 'CARD TWO', desc: '说明文字' },
  ];
  V.text('SCENE TITLE · 场景标题', 960, 150, 34, '#8fa3c8', V.MONO, 700);
  cards.forEach((c, i) => {
    const t0 = 0.5 + i * 1.15, k = V.E.out(V.seg(u, t0, t0 + 0.55));
    if (k <= 0) return;
    // NOTE: V.* draws on the shared ctx; save/restore around alpha+motion.
    const y = V.lerp(940, 520, k);
    V.card(960 + (i - 0.5) * 660, y, { ...c });
  });
}

const BEAT_FN = [beat1, beat2];

V.createApp({
  dur: DUR,
  beats: BEATS,
  subs: SUBS,
  label: '◉ VIDEO.EXE',
  drawBeat: (i, u, t) => BEAT_FN[i](u, t),
});
