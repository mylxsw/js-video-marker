'use strict';
/* {{TITLE}} — video-maker project.
   Theme: {{THEME}}
   Fill in: 1) BEATS + SUBS from measured TTS durations (see SKILL.md step 3),
            2) one beat function per act using V.* components.
   render(t) must stay a pure function of t. */

const DUR = {{DUR}}; // total seconds; render.mjs parses this line

// --- timeline: [start, end] per beat, derived from TTS durations + 0.8s pads
//     narration offsets: first line at 0.6s, each next line at prev beat start + prev dur + 0.8
const BEATS = [
  [0.0, 5.0],
  [5.0, 12.0],
];

// --- subtitles: [start, end, text] — keep inside the narration window
const SUBS = [
  [0.6, 4.2, '这是第一句解说词示例。'],
  [5.6, 11.2, '这是第二句解说词示例。'],
];

V.mount(document.getElementById('c'));
V.setTheme('{{THEME}}');

// ---------------------------------------------------------------- beats
// u = beat-local time (0 at beat start), t = global time. Use V.seg/V.tw/V.mv.

function beat1(u, t) {
  // Example Act 1: Impact title + key metric
  V.titlePop('示例主标题', 960, 360, u, 0.4);
  V.typewriter('TRANSFORM YOUR THINKING', 960, 480, u, 1.4, 2.8);
  V.metricCard(960, 720, 520, 220, {
    value: '1 DAY',
    label: 'EXECUTION TIMEFRAME',
    desc: '从混乱到秩序的最小重构周期',
    u,
    t0: 2.0,
  });
}

function beat2(u, t) {
  // Example Act 2: Comparison (Old Way vs New Way)
  V.compareView(960, 520, 1400, 580, u, {
    title: '表面努力',
    subtitle: 'STATUS GAMES',
    items: ['随波逐流立新年目标', '依赖靠不住的即时意志力', '目标过多导致注意力涣散'],
    icon: 'warn',
    color: V.T.colors.warning,
  }, {
    title: '深层重构',
    subtitle: 'CORE SYSTEM',
    items: ['明确绝不能忍受的反向底线', '打造无摩擦的微习惯闭环', '单点突破建立正向反馈'],
    icon: 'check',
    color: V.T.colors.accent,
  }, { t0: 0.3, centerText: 'VS' });
}

const BEAT_FN = [beat1, beat2];

V.createApp({
  theme: '{{THEME}}',
  dur: DUR,
  beats: BEATS,
  subs: SUBS,
  label: '◉ {{TITLE}}',
  drawBeat: (i, u, t) => BEAT_FN[i](u, t),
});
