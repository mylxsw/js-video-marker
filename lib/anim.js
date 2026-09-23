'use strict';
/* video-maker animation library.
   Browser global `V`. Deterministic, pure-function-of-time components for
   code-driven explainer videos. Call V.mount(canvas) once, then use V.* inside
   your beat functions. See references/components.md for the API. */

const V = (() => {
  const W = 1920, H = 1080;
  const TAU = Math.PI * 2;
  let ctx = null;

  // ---------------------------------------------------------------- core math
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  /** segment progress: 0 before a, 1 after b */
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const E = {
    lin: t => t,
    inOut: t => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    out: t => 1 - Math.pow(1 - t, 3),
    in: t => t * t * t,
    outBack: t => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    outElastic: t => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
  };
  /** eased tween 0..1 over [a,b] */
  const tw = (t, a, b, ease = E.inOut) => ease(seg(t, a, b));
  /** eased move from a to b over [t0,t1] */
  const mv = (t, t0, t1, a, b, ease = E.inOut) => lerp(a, b, tw(t, t0, t1, ease));
  /** deterministic pseudo-random 0..1 */
  const hash = (i, j = 0) => { const x = Math.sin(i * 127.1 + j * 311.7 + 0.5) * 43758.5453; return x - Math.floor(x); };

  const CN = '"PingFang SC","Hiragino Sans GB","Noto Sans CJK SC","Microsoft YaHei",sans-serif';
  const MONO = '"JetBrains Mono","SF Mono",Menlo,Consolas,monospace';

  function mount(canvas) { ctx = canvas.getContext('2d'); }

  // ---------------------------------------------------------------- shapes & text
  function rrect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
  function text(str, x, y, px, fill = '#fff', font = CN, weight = 700, align = 'center') {
    ctx.font = `${weight} ${px}px ${font}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.fillStyle = fill; ctx.fillText(str, x, y);
  }
  function glowText(str, x, y, px, fill, glow, weight = 900) {
    ctx.save(); ctx.shadowColor = glow; ctx.shadowBlur = 30;
    text(str, x, y, px, fill, CN, weight); ctx.restore();
  }
  /** wrap CJK text to lines of maxW (px) */
  function wrapCN(str, maxW, px, weight = 500) {
    ctx.font = `${weight} ${px}px ${CN}`;
    const lines = []; let cur = '';
    for (const ch of str) {
      if (ctx.measureText(cur + ch).width > maxW && cur) { lines.push(cur); cur = ''; }
      cur += ch;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // ---------------------------------------------------------------- vector icons (no emoji-font dependency)
  // kinds: trophy warn map swords phone bell play chat check star bolt clock heart
  function icon(kind, x, y, s, color) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.lineWidth = s * 0.09; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const u = s / 2;
    if (kind === 'trophy') {
      ctx.beginPath(); ctx.moveTo(-u * 0.55, -u * 0.7); ctx.lineTo(u * 0.55, -u * 0.7); ctx.lineTo(u * 0.35, u * 0.25); ctx.lineTo(-u * 0.35, u * 0.25); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.arc(-u * 0.75, -u * 0.35, u * 0.32, Math.PI * 0.4, Math.PI * 1.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(u * 0.75, -u * 0.35, u * 0.32, -Math.PI * 0.5, Math.PI * 0.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-u * 0.25, u * 0.25); ctx.lineTo(-u * 0.25, u * 0.6); ctx.moveTo(u * 0.25, u * 0.25); ctx.lineTo(u * 0.25, u * 0.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-u * 0.5, u * 0.75); ctx.lineTo(u * 0.5, u * 0.75); ctx.stroke();
    } else if (kind === 'warn') {
      ctx.beginPath(); ctx.moveTo(0, -u * 0.8); ctx.lineTo(u * 0.8, u * 0.6); ctx.lineTo(-u * 0.8, u * 0.6); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -u * 0.3); ctx.lineTo(0, u * 0.15); ctx.stroke();
      circle(0, u * 0.38, s * 0.045); ctx.fill();
    } else if (kind === 'map') {
      rrect(-u * 0.7, -u * 0.55, u * 1.4, u * 1.1, u * 0.18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-u * 0.7, -u * 0.2); ctx.bezierCurveTo(-u * 0.2, -u * 0.5, u * 0.2, u * 0.1, u * 0.7, -u * 0.2); ctx.stroke();
      ctx.setLineDash([u * 0.12, u * 0.1]);
      ctx.beginPath(); ctx.moveTo(-u * 0.45, u * 0.35); ctx.lineTo(u * 0.1, u * 0.35); ctx.lineTo(-u * 0.05, -u * 0.05); ctx.lineTo(u * 0.45, -u * 0.05); ctx.stroke();
      ctx.setLineDash([]);
    } else if (kind === 'swords') {
      ctx.beginPath(); ctx.moveTo(-u * 0.6, -u * 0.6); ctx.lineTo(u * 0.6, u * 0.6); ctx.moveTo(u * 0.6, -u * 0.6); ctx.lineTo(-u * 0.6, u * 0.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-u * 0.75, u * 0.45); ctx.lineTo(-u * 0.45, u * 0.75); ctx.moveTo(u * 0.75, u * 0.45); ctx.lineTo(u * 0.45, u * 0.75); ctx.stroke();
    } else if (kind === 'phone') {
      rrect(-u * 0.45, -u * 0.8, u * 0.9, u * 1.6, u * 0.18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-u * 0.45, u * 0.45); ctx.lineTo(u * 0.45, u * 0.45); ctx.stroke();
      circle(0, u * 0.62, s * 0.03); ctx.fill();
    } else if (kind === 'bell') {
      ctx.beginPath(); ctx.moveTo(0, -u * 0.75); ctx.lineTo(0, -u * 0.6);
      ctx.moveTo(-u * 0.5, u * 0.35); ctx.bezierCurveTo(-u * 0.5, -u * 0.4, -u * 0.2, -u * 0.6, 0, -u * 0.6); ctx.bezierCurveTo(u * 0.2, -u * 0.6, u * 0.5, -u * 0.4, u * 0.5, u * 0.35);
      ctx.lineTo(u * 0.65, u * 0.35); ctx.moveTo(-u * 0.65, u * 0.35); ctx.lineTo(-u * 0.5, u * 0.35); ctx.stroke();
      circle(0, u * 0.55, u * 0.14); ctx.fill();
    } else if (kind === 'play') {
      circle(0, 0, u * 0.8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-u * 0.15, -u * 0.35); ctx.lineTo(u * 0.4, 0); ctx.lineTo(-u * 0.15, u * 0.35); ctx.closePath(); ctx.fill();
    } else if (kind === 'chat') {
      rrect(-u * 0.7, -u * 0.6, u * 1.4, u * 1.0, u * 0.25); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-u * 0.3, u * 0.4); ctx.lineTo(-u * 0.45, u * 0.75); ctx.lineTo(-u * 0.05, u * 0.4); ctx.closePath(); ctx.fill();
      for (let i = -1; i <= 1; i++) { circle(i * u * 0.35, -u * 0.1, u * 0.09); ctx.fill(); }
    } else if (kind === 'check') {
      ctx.beginPath(); ctx.moveTo(-u * 0.5, 0); ctx.lineTo(-u * 0.1, u * 0.4); ctx.lineTo(u * 0.55, -u * 0.4); ctx.stroke();
    } else if (kind === 'star') {
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) {
        const a = -Math.PI / 2 + i * TAU / 10, r = i % 2 ? u * 0.45 : u * 0.85;
        i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
    } else if (kind === 'bolt') {
      ctx.beginPath(); ctx.moveTo(u * 0.15, -u * 0.85); ctx.lineTo(-u * 0.45, u * 0.15); ctx.lineTo(-u * 0.02, u * 0.15);
      ctx.lineTo(-u * 0.15, u * 0.85); ctx.lineTo(u * 0.45, -u * 0.15); ctx.lineTo(u * 0.02, -u * 0.15); ctx.closePath(); ctx.fill();
    } else if (kind === 'clock') {
      circle(0, 0, u * 0.8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -u * 0.5); ctx.moveTo(0, 0); ctx.lineTo(u * 0.35, u * 0.1); ctx.stroke();
    } else if (kind === 'heart') {
      ctx.beginPath(); ctx.moveTo(0, u * 0.7);
      ctx.bezierCurveTo(-u * 1.1, -u * 0.1, -u * 0.55, -u * 0.85, 0, -u * 0.25);
      ctx.bezierCurveTo(u * 0.55, -u * 0.85, u * 1.1, -u * 0.1, 0, u * 0.7); ctx.fill();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- scene primitives
  /** dark game-world background: gradient + drifting grid + particles + vignette */
  function bg(t, opts = {}) {
    const c1 = opts.c1 || '#070a16', c2 = opts.c2 || '#0b1024', c3 = opts.c3 || '#0d1330';
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, c1); g.addColorStop(0.6, c2); g.addColorStop(1, c3);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.strokeStyle = 'rgba(76,201,240,0.10)'; ctx.lineWidth = 1;
    const off = (t * 24) % 96;
    for (let x = -96 + off; x < W + 96; x += 96) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H + 96; y += 96) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();
    ctx.save();
    const n = opts.particles ?? 46;
    for (let i = 0; i < n; i++) {
      const px = hash(i, 1) * W, spd = 12 + hash(i, 2) * 26;
      const py = (hash(i, 3) * H - t * spd) % H; const yy = py < 0 ? py + H : py;
      const a = 0.10 + 0.12 * hash(i, 4);
      ctx.fillStyle = `rgba(120,200,255,${a})`;
      circle(px, yy, 1.5 + hash(i, 5) * 2.5); ctx.fill();
    }
    ctx.restore();
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }
  function scanlines() {
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.05)';
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
    ctx.restore();
  }
  /** top-left label + top-right running timecode */
  function hud(t, label = '◉ LIFE.EXE') {
    text(label, 60, 46, 26, '#4cc9f0', MONO, 700, 'left');
    const mm = String(Math.floor(t / 60)).padStart(2, '0'), ss = String(Math.floor(t % 60)).padStart(2, '0');
    text(`T+${mm}:${ss}`, W - 60, 46, 26, 'rgba(255,255,255,0.55)', MONO, 700, 'right');
  }
  /** bottom subtitle bar. subs: [[start,end,text],...] */
  function drawSubs(t, subs, showText = true) {
    if (!showText) return;
    const s = subs.find(s => t >= s[0] && t < s[1]);
    if (!s) return;
    const k = Math.min(seg(t, s[0], s[0] + 0.25), 1 - seg(t, s[1] - 0.3, s[1]));
    if (k <= 0) return;
    const lines = wrapCN(s[2], 1500, 40, 500);
    const bw = 1620, bh = lines.length * 56 + 44;
    ctx.save(); ctx.globalAlpha = k * 0.96;
    ctx.fillStyle = 'rgba(4,6,14,0.72)';
    rrect(960 - bw / 2, H - bh - 28, bw, bh, 18); ctx.fill();
    ctx.strokeStyle = 'rgba(76,201,240,0.35)'; ctx.lineWidth = 2;
    rrect(960 - bw / 2, H - bh - 28, bw, bh, 18); ctx.stroke();
    lines.forEach((ln, i) => text(ln, 960, H - bh - 28 + 44 + i * 56, 40, '#eef4ff', CN, 500));
    ctx.restore();
  }
  /** run fn() with globalAlpha = k (for fade-in/out wrappers in beats) */
  function withAlpha(k, fn) {
    if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = k; fn(); ctx.restore();
  }
  /** small toast banner, e.g. "MAP UNLOCKED". returns nothing; caller gates timing */
  function toast(str, cx, cy, k, color = '#3ddc84') {
    if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = k;
    ctx.font = `700 30px ${MONO}`;
    const w = ctx.measureText(str).width + 70;
    ctx.fillStyle = 'rgba(6,10,22,0.92)'; ctx.strokeStyle = color; ctx.lineWidth = 2;
    rrect(cx - w / 2, cy - 34, w, 68, 16); ctx.fill(); ctx.stroke();
    text('✓ ' + str, cx, cy + 1, 30, color, MONO, 700);
    ctx.restore();
  }

  // ---------------------------------------------------------------- components
  /** glowing panel; returns inner content origin {x, y} (top-left inside padding) */
  function panel(x, y, w, h, { color = '#4cc9f0', titleEn = '', titleZh = '', pad = 36 } = {}) {
    ctx.save();
    ctx.fillStyle = 'rgba(13,18,36,0.94)'; ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.shadowColor = color; ctx.shadowBlur = 22;
    rrect(x, y, w, h, 20); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    let cx = x + pad;
    if (titleEn) { text(titleEn, cx, y + 52, 30, color, MONO, 700, 'left'); cx += ctx.measureText(titleEn).width / 2 + 130; }
    if (titleZh) text(titleZh, x + pad + (titleEn ? 230 : 0), y + 52, 30, '#ffffff', CN, 700, 'left');
    ctx.restore();
    return { x: x + pad, y: y + 96 };
  }
  /** info card with icon badge, zh title, EN subtitle, divider, description */
  function card(x, y, { icon: ic = 'star', color = '#4cc9f0', zh = '', en = '', desc = '', w = 600, h = 310 }) {
    ctx.save(); ctx.translate(x, y);
    ctx.shadowColor = color; ctx.shadowBlur = 26;
    ctx.fillStyle = 'rgba(13,18,36,0.94)'; ctx.strokeStyle = color; ctx.lineWidth = 3;
    rrect(-w / 2, -h / 2, w, h, 22); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; circle(-w / 2 + 92, -34, 58); ctx.fill();
    icon(ic, -w / 2 + 92, -34, 64, color);
    text(zh, -w / 2 + 176, -52, 60, '#ffffff', CN, 900, 'left');
    text(en, -w / 2 + 178, 4, 25, color, MONO, 700, 'left');
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-w / 2 + 40, 52); ctx.lineTo(w / 2 - 40, 52); ctx.stroke();
    text(desc, 0, 108, 36, 'rgba(220,230,255,0.85)', CN, 500);
    ctx.restore();
  }
  /** fly-in wrapper: draws fn() with enter/exit motion. i = stagger index */
  function flyIn(u, t0, dur, fromY, i, fn, t) {
    const k = E.out(seg(u, t0, t0 + 0.45));
    if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = k;
    const bob = k >= 1 ? Math.sin(t * 2 + i * 1.7) * 9 : 0;
    ctx.translate(0, lerp(fromY, bob, E.out(seg(u, t0, t0 + dur))) - bob);
    ctx.translate(0, bob);
    fn();
    ctx.restore();
  }
  /** horizontal XP bar with % label */
  function xpBar(x, y, w, h, fill, label = true) {
    ctx.fillStyle = '#16203c'; rrect(x, y, w, h, h / 2); ctx.fill();
    if (fill > 0) {
      const g2 = ctx.createLinearGradient(x, 0, x + w, 0);
      g2.addColorStop(0, '#3ddc84'); g2.addColorStop(1, '#ffd23f');
      ctx.fillStyle = g2; rrect(x, y, w * fill, h, h / 2); ctx.fill();
    }
    if (label) text(`EXP ${(fill * 100) | 0}%`, x + w, y - 22, 24, '#8fa3c8', MONO, 700, 'right');
  }
  /** rotating burst + LEVEL UP! text, k = 0..1 envelope */
  function levelUp(cx, cy, k, u, str = 'LEVEL UP!') {
    if (k <= 0) return;
    const s = E.outBack(k);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.globalAlpha = k;
    ctx.rotate(u * 1.5);
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12;
      ctx.strokeStyle = i % 2 ? '#ffd23f' : '#ff9f1c'; ctx.lineWidth = 10; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 90, Math.sin(a) * 90); ctx.lineTo(Math.cos(a) * 170, Math.sin(a) * 170); ctx.stroke();
    }
    ctx.rotate(-u * 1.5);
    glowText(str, 0, 0, 84, '#ffd23f', '#ff9f1c');
    ctx.restore();
  }
  /** quest log panel: checkable rows with XP popups + xp bar + level-up.
      quests: [{t, xp}], u = beat-local time */
  function questLog(px, py, pw, ph, quests, u, t, opts = {}) {
    const color = opts.color || '#3ddc84';
    const o = panel(px, py, pw, ph, { color, titleEn: opts.titleEn || 'QUEST LOG', titleZh: opts.titleZh || '每日任务' });
    quests.forEach((q, i) => {
      const t0 = (opts.t0 ?? 0.7) + i * (opts.gap ?? 1.5), ry = o.y + 64 + i * 120;
      const k = seg(u, t0, t0 + 0.4);
      if (k <= 0) return;
      ctx.save(); ctx.globalAlpha = k;
      ctx.strokeStyle = color; ctx.lineWidth = 4;
      rrect(px + 40, ry - 23, 46, 46, 10); ctx.stroke();
      const ck = seg(u, t0 + 0.15, t0 + 0.55);
      if (ck > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(px + 40, ry - 23, 46 * ck + 8, 46); ctx.clip();
        icon('check', px + 63, ry, 34, color); ctx.restore();
      }
      text(q.t, px + 120, ry, 38, '#ffffff', CN, 500, 'left');
      const xp = seg(u, t0 + 0.3, t0 + 1.2);
      if (xp > 0 && xp < 1) {
        ctx.save(); ctx.globalAlpha = (1 - xp) * k;
        text(q.xp, px + pw - 90, ry - xp * 46, 30, '#ffd23f', MONO, 700);
        ctx.restore();
      }
      ctx.restore();
    });
    xpBar(px + 40, py + ph - 78, pw - 80, 30, seg(u, opts.barFrom ?? 0.7, opts.barTo ?? 4.6));
    levelUp(px + pw / 2, py + 300, seg(u, 4.6, 5.1) * (1 - seg(u, 5.9, 6.5)), u, opts.levelText);
  }
  /** vertical rule list inside a panel region */
  function rulesList(rx, ry, rw, rh, rules, u, opts = {}) {
    const color = opts.color || '#b388ff';
    const o = panel(rx, ry, rw, rh, { color, titleEn: opts.titleEn || 'GAME RULES', titleZh: opts.titleZh || '游戏规则' });
    rules.forEach((r, i) => {
      const k = seg(u, (opts.t0 ?? 1.7) + i * 0.5, (opts.t0 ?? 1.7) + i * 0.5 + 0.4);
      if (k <= 0) return;
      ctx.save(); ctx.globalAlpha = k;
      const yy = o.y + 74 + i * 120;
      ctx.fillStyle = 'rgba(179,136,255,0.12)'; rrect(rx + 36, yy - 44, rw - 72, 88, 14); ctx.fill();
      text(`RULE 0${i + 1}`, rx + 66, yy - 18, 22, color, MONO, 700, 'left');
      text(r, rx + 66, yy + 16, 36, '#ffffff', CN, 500, 'left');
      ctx.restore();
    });
  }

  // ---------------------------------------------------------------- person + shield scene
  /** simple person silhouette (head + shoulders) */
  function person(cx, baseY, s, k, color = '#4cc9f0') {
    if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = clamp(k, 0, 1);
    ctx.translate(cx, 0); ctx.scale(s, s);
    ctx.fillStyle = '#141a30'; ctx.strokeStyle = color; ctx.globalAlpha *= 0.7; ctx.lineWidth = 3;
    const a = ctx.globalAlpha;
    ctx.globalAlpha = a; circle(0, baseY - 90, 85); ctx.fill(); ctx.stroke();
    rrect(-150, baseY + 20, 300, 240, 110); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  /**
   * Attention-forcefield scene: person + expanding shield bubble + distractions
   * that fly in, impact (ring flash + shield wobble) and bounce off.
   * distractions: [{icon, color, from:[x,y]}]
   */
  function shieldScene(cx, cy, R, u, t, distractions, opts = {}) {
    const gone = seg(u, opts.goneFrom ?? 8.2, (opts.goneFrom ?? 8.2) + 0.7);
    if (gone < 1) {
      const k = E.outBack(seg(u, 0.1, 0.9));
      person(cx, cy + 90, k, (1 - gone) * clamp(k, 0, 1));
    }
    if (gone < 1) {
      for (let i = 0; i < 3; i++) {
        const p = seg(u, 1.2 + i * 0.22, 2.4 + i * 0.22);
        if (p > 0 && p < 1) {
          ctx.save(); ctx.globalAlpha = (1 - p) * 0.8 * (1 - gone);
          ctx.strokeStyle = '#4cc9f0'; ctx.lineWidth = 6;
          circle(cx, cy, p * (R + 60)); ctx.stroke(); ctx.restore();
        }
      }
      const on = seg(u, 2.0, 2.6);
      if (on > 0) {
        let wob = 0;
        distractions.forEach((d, i) => { const t0 = 2.4 + i * 1.15; wob += Math.sin(clamp((u - t0 - 0.55) * 14, 0, Math.PI)) * 14 * seg(u, t0 + 0.55, t0 + 0.6); });
        ctx.save(); ctx.globalAlpha = on * (1 - gone);
        const pulse = 0.55 + 0.12 * Math.sin(t * 3);
        const grd = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, R + wob);
        grd.addColorStop(0, 'rgba(76,201,240,0)'); grd.addColorStop(0.85, `rgba(76,201,240,${0.10 * on})`); grd.addColorStop(1, `rgba(76,201,240,${pulse * on})`);
        ctx.fillStyle = grd; circle(cx, cy, R + wob + 26); ctx.fill();
        ctx.strokeStyle = `rgba(76,201,240,${pulse})`; ctx.lineWidth = 5;
        circle(cx, cy, R + wob); ctx.stroke();
        ctx.strokeStyle = 'rgba(140,220,255,0.20)'; ctx.lineWidth = 2;
        for (let i = 0; i < 10; i++) {
          const hx = cx + (hash(i, 21) - 0.5) * R * 1.5, hy = cy + (hash(i, 22) - 0.5) * R * 1.5;
          if (Math.hypot(hx - cx, hy - cy) > R - 20) continue;
          ctx.beginPath();
          for (let k = 0; k <= 6; k++) { const a = k * TAU / 6 + u * 0.4; const px2 = hx + Math.cos(a) * 26, py2 = hy + Math.sin(a) * 26; k ? ctx.lineTo(px2, py2) : ctx.moveTo(px2, py2); }
          ctx.stroke();
        }
        ctx.restore();
      }
      distractions.forEach((d, i) => {
        const t0 = 2.4 + i * 1.15;
        if (u < t0 || gone > 0) return;
        const ang = Math.atan2(d.from[1] - cy, d.from[0] - cx);
        const ix = cx + Math.cos(ang) * R, iy = cy + Math.sin(ang) * R;
        const fly = seg(u, t0, t0 + 0.55);
        const x = lerp(d.from[0], ix, E.in(fly)), y = lerp(d.from[1], iy, E.in(fly));
        const after = u - t0 - 0.55;
        if (after < 0) { icon(d.icon, x, y, 76, d.color); return; }
        const rp = seg(after, 0, 0.5);
        if (rp < 1) {
          ctx.save(); ctx.globalAlpha = (1 - rp) * 0.9;
          ctx.strokeStyle = d.color; ctx.lineWidth = 5;
          circle(ix, iy, 20 + rp * 90); ctx.stroke(); ctx.restore();
        }
        const b = seg(after, 0, 0.9);
        if (b < 1) {
          const bx = ix - Math.cos(ang) * E.out(b) * 260, by = iy - Math.sin(ang) * E.out(b) * 200 - E.out(b) * 120;
          ctx.save(); ctx.globalAlpha = (1 - b) * (1 - gone);
          ctx.translate(bx, by); ctx.rotate(E.out(b) * (i % 2 ? 1 : -1) * 1.2);
          icon(d.icon, 0, 0, 76, d.color);
          ctx.restore();
        }
      });
    }
    return gone;
  }
  /**
   * Flipping identity card. front/back are draw callbacks (drawn centered at 0,0).
   * Mirror-safe: text is unmirrored on the back face (QC-proven fix).
   */
  function flipCard(cx, cy, w, h, u, t0, dur, front, back, colorA = '#4cc9f0', colorB = '#ffd23f') {
    const fp = seg(u, t0, t0 + dur);
    if (fp <= 0 || fp >= 1.2) return;
    const sx = Math.cos(fp * Math.PI);
    ctx.save(); ctx.translate(cx, cy);
    ctx.scale(Math.abs(sx) < 0.02 ? (sx < 0 ? -0.02 : 0.02) : sx, 1);
    const isBack = sx < 0;
    ctx.shadowColor = isBack ? colorB : colorA; ctx.shadowBlur = 34;
    ctx.fillStyle = '#0e1428'; ctx.strokeStyle = isBack ? colorB : colorA; ctx.lineWidth = 4;
    rrect(-w / 2, -h / 2, w, h, 24); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    if (isBack) ctx.scale(-1, 1); // unmirror: text stays readable
    (isBack ? back : front)();
    ctx.restore();
  }

  // ---------------------------------------------------------------- title / boot bits
  /** blinking PRESS START splash */
  function pressStart(u, title = 'LIFE.EXE  v1.0') {
    const blink = Math.floor(u * 2.6) % 2 === 0 ? 1 : 0.12;
    ctx.save(); ctx.globalAlpha = blink;
    text(title, 960, 440, 34, '#4cc9f0', MONO, 700);
    glowText('▶ PRESS START', 960, 540, 64, '#ffffff', '#4cc9f0');
    ctx.restore();
  }
  /** terminal window with typed lines + progress bar; returns progress 0..1 */
  function terminal(x, y, w, h, lines, u, t0 = 0, fadeOut = null) {
    const a = fadeOut == null ? 1 : 1 - seg(u, fadeOut[0], fadeOut[1]);
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(5,8,18,0.92)'; ctx.strokeStyle = '#4cc9f0'; ctx.lineWidth = 2;
    rrect(x, y, w, h, 14); ctx.fill(); ctx.stroke();
    lines.forEach(([s, dt], i) => { if (u > t0 + dt) text(s, x + 40, y + 60 + i * 52, 30, '#9fe8ff', MONO, 500, 'left'); });
    const p = seg(u, t0, t0 + 1.8);
    ctx.fillStyle = '#16203c'; rrect(x + 40, y + h - 80, w - 80, 26, 13); ctx.fill();
    if (p > 0) { ctx.fillStyle = '#4cc9f0'; rrect(x + 40, y + h - 80, (w - 80) * p, 26, 13); ctx.fill(); }
    text(`${Math.round(p * 100)}%`, x + w - 40, y + h - 67, 26, '#4cc9f0', MONO, 700, 'right');
    ctx.restore();
    return p;
  }
  /** per-character pop-in title */
  function titlePop(str, cx, cy, u, t0, px = 104, gap = 118, color = '#ffffff', glow = '#4cc9f0') {
    const chars = [...str];
    chars.forEach((ch, i) => {
      const k = E.outBack(seg(u, t0 + i * 0.13, t0 + i * 0.13 + 0.5));
      if (k <= 0) return;
      ctx.save(); ctx.translate(cx + (i - (chars.length - 1) / 2) * gap, cy); ctx.scale(k, k);
      ctx.shadowColor = glow; ctx.shadowBlur = 34;
      text(ch, 0, 0, px, color, CN, 900);
      ctx.restore();
    });
  }
  /** typewriter EN line with blinking cursor */
  function typewriter(str, cx, cy, u, t0, t1, px = 32, color = '#ffd23f') {
    const n = Math.floor(seg(u, t0, t1) * str.length);
    if (n > 0) {
      text(str.slice(0, n), cx, cy, px, color, MONO, 700);
      if (n < str.length && Math.floor(u * 6) % 2 === 0) {
        const wdt = ctx.measureText(str.slice(0, n)).width;
        text('▌', cx + wdt / 2 + 300, cy, px, color, MONO, 700);
      }
    }
  }
  /** floating gold coins */
  function coins(u, t0, n = 14, color = '#ffd23f') {
    ctx.save();
    for (let i = 0; i < n; i++) {
      const cx = 200 + hash(i, 7) * 1520, cy = 760 + Math.sin(u * 1.6 + i * 1.3) * 26 + hash(i, 8) * 120;
      const a = seg(u, t0 + hash(i, 9) * 1.2, t0 + 0.8 + hash(i, 9) * 1.2);
      if (a <= 0) continue;
      ctx.globalAlpha = a * 0.85; ctx.fillStyle = color;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(Math.abs(Math.sin(u * 2 + i)), 1);
      circle(0, 0, 13); ctx.fill();
      ctx.fillStyle = '#7a5b00'; text('G', 0, 1, 20, '#7a5b00', MONO, 900);
      ctx.restore();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- app wiring
  /**
   * Wire a project: crossfaded beats + hud + subtitles + scanlines + fades,
   * preview player (?render=1 switches to deterministic render mode).
   * cfg: { dur, beats:[[s,e],...], subs:[[s,e,text],...], label, drawBeat(i,u,t),
   *        bgOpts, showText=true }
   */
  function createApp(cfg) {
    const params = new URLSearchParams(location.search);
    const showText = params.get('text') !== '0';
    const renderMode = params.get('render') === '1';
    window.DUR = cfg.dur;
    const canvas = document.getElementById('c');

    function render(t) {
      t = clamp(t, 0, cfg.dur);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      bg(t, cfg.bgOpts);
      cfg.beats.forEach(([s, e], i) => {
        const a = seg(t, s, s + 0.45) * (1 - seg(t, e - 0.45, e));
        if (a <= 0) return;
        ctx.save(); ctx.globalAlpha = a;
        cfg.drawBeat(i, t - s, t);
        ctx.restore();
      });
      hud(t, cfg.label);
      drawSubs(t, cfg.subs, showText && cfg.showText !== false);
      scanlines();
      if (t < 0.5) { ctx.fillStyle = `rgba(0,0,0,${1 - seg(t, 0, 0.5)})`; ctx.fillRect(0, 0, W, H); }
      if (t > cfg.dur - 1.2) { ctx.fillStyle = `rgba(0,0,0,${seg(t, cfg.dur - 1.2, cfg.dur)})`; ctx.fillRect(0, 0, W, H); }
    }

    window.__ready = true;
    window.__frame = (t) => { render(t); return canvas.toDataURL('image/png'); };

    if (renderMode) {
      document.body.classList.add('render');
      const st = document.getElementById('stage');
      // inline styles: immune to CSS specificity issues in render mode (QC lesson)
      st.style.width = '1920px'; st.style.height = '1080px';
      st.style.aspectRatio = 'auto'; st.style.borderRadius = '0'; st.style.boxShadow = 'none';
      render(0);
      return { render, mode: 'render' };
    }
    // preview player
    let playing = false, t0 = 0, cur = 0;
    const $ = id => document.getElementById(id);
    render(0);
    const seek = $('seek'), timeEl = $('time'), playBtn = $('play');
    if (seek) { seek.max = cfg.dur; }
    function draw() {
      render(cur);
      if (seek) seek.value = cur;
      if (timeEl) timeEl.textContent = `${cur.toFixed(2)} / ${cfg.dur.toFixed(2)}`;
      const au = $('bgm'); if (au && Math.abs(au.currentTime - cur) > 0.4) au.currentTime = cur;
    }
    function setPlaying(p) {
      const audio = $('bgm'); playing = p;
      if (p) {
        if (cur >= cfg.dur) cur = 0;
        t0 = performance.now() / 1000 - cur;
        if (playBtn) playBtn.textContent = '❚❚ 暂停';
        if (audio) { audio.currentTime = cur; audio.play().catch(() => {}); }
        const step = () => {
          if (!playing) return;
          cur = performance.now() / 1000 - t0;
          if (cur >= cfg.dur) { cur = cfg.dur; setPlaying(false); if (playBtn) playBtn.textContent = '↻ 重播'; return; }
          draw(); requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      } else { if (playBtn) playBtn.textContent = '▶ 播放'; if (audio) audio.pause(); }
    }
    if (playBtn) playBtn.onclick = () => setPlaying(!playing);
    if (seek) seek.oninput = e => { cur = parseFloat(e.target.value); if (playing) t0 = performance.now() / 1000 - cur; const au = $('bgm'); if (au) au.currentTime = cur; draw(); };
    const sc = $('subs');
    if (sc) { sc.onchange = e => { const url = new URL(location.href); if (e.target.checked) url.searchParams.delete('text'); else url.searchParams.set('text', '0'); location.href = url.toString(); }; sc.checked = showText; }
    document.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); setPlaying(!playing); } });
    return { render, mode: 'preview' };
  }

  return {
    W, H, TAU, CN, MONO, mount,
    clamp, lerp, seg, E, tw, mv, hash,
    rrect, circle, text, glowText, wrapCN, icon,
    bg, scanlines, hud, drawSubs, withAlpha, toast,
    panel, card, flyIn, xpBar, levelUp, questLog, rulesList,
    person, shieldScene, flipCard,
    pressStart, terminal, titlePop, typewriter, coins,
    createApp,
  };
})();
