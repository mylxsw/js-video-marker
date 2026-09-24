'use strict';
/* video-maker animation library.
   Browser global `V`. Deterministic, pure-function-of-time components for
   code-driven explainer videos. Supports multi-theme styling, knowledge explainers,
   and game-style animations.
   See references/components.md for the API. */

const V = (() => {
  const W = 1920, H = 1080;
  const TAU = Math.PI * 2;
  let ctx = null;

  const CN = '"PingFang SC","Hiragino Sans GB","Noto Sans CJK SC","Microsoft YaHei",sans-serif';
  const MONO = '"JetBrains Mono","SF Mono",Menlo,Consolas,monospace';

  // ---------------------------------------------------------------- theme management
  let activeTheme = (typeof Themes !== 'undefined' && Themes.resolve)
    ? Themes.resolve('minimal_dark')
    : {
        id: 'minimal_dark',
        name: '深邃知识探索 (Minimal Dark)',
        font: { sans: CN, mono: MONO },
        colors: {
          bg1: '#07090e', bg2: '#0d111a', bg3: '#121724',
          surface: 'rgba(18, 24, 38, 0.90)',
          surfaceHighlight: 'rgba(30, 41, 64, 0.95)',
          border: 'rgba(255, 255, 255, 0.12)',
          borderActive: 'rgba(96, 165, 250, 0.5)',
          primary: '#60a5fa', secondary: '#93c5fd', accent: '#34d399',
          warning: '#f87171', gold: '#fbbf24',
          textPrimary: '#f8fafc', textSecondary: '#94a3b8', textMuted: '#64748b',
          glow: 'rgba(96, 165, 250, 0.25)',
        },
        background: {
          type: 'dots', gridSize: 48, dotSize: 1.5,
          dotColor: 'rgba(148, 163, 184, 0.15)',
          particles: 28, particleColor: 'rgba(147, 197, 253, 0.20)',
          scanlines: false, vignette: true, vignetteStrength: 0.6,
        },
        ui: {
          hudStyle: 'pill',
          subtitles: {
            bg: 'rgba(11, 15, 26, 0.88)',
            border: 'rgba(96, 165, 250, 0.25)',
            textColor: '#f8fafc',
            maxWidth: 1600, radius: 16,
          }
        },
        music: { genre: 'lofi', bpm: 82, mood: 'reflective' }
      };

  function setTheme(themeInput) {
    if (typeof Themes !== 'undefined' && Themes.resolve) {
      activeTheme = Themes.resolve(themeInput);
    } else if (typeof themeInput === 'object' && themeInput !== null) {
      activeTheme = themeInput;
    }
    return activeTheme;
  }

  function getTheme() {
    return activeTheme;
  }

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
    ctx.save(); ctx.shadowColor = glow || fill; ctx.shadowBlur = 30;
    text(str, x, y, px, fill, activeTheme?.font?.sans || CN, weight); ctx.restore();
  }
  const NO_START_PUNCT = /^[，。？！、；：”’）》\.,;:!?\)]/;
  /** wrap CJK text to lines of maxW (px) with punctuation wrapping rules */
  function wrapCN(str, maxW, px, weight = 500) {
    const f = activeTheme?.font?.sans || CN;
    ctx.font = `${weight} ${px}px ${f}`;
    const lines = []; let cur = '';
    for (const ch of str) {
      if (ctx.measureText(cur + ch).width > maxW && cur) {
        if (NO_START_PUNCT.test(ch)) {
          cur += ch;
          lines.push(cur);
          cur = '';
          continue;
        }
        lines.push(cur);
        cur = '';
      }
      cur += ch;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // ---------------------------------------------------------------- vector icons
  // kinds: trophy warn map swords phone bell play chat check star bolt clock heart target brain refresh zap flame
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
    } else if (kind === 'cross') {
      ctx.beginPath(); ctx.moveTo(-u * 0.45, -u * 0.45); ctx.lineTo(u * 0.45, u * 0.45); ctx.moveTo(u * 0.45, -u * 0.45); ctx.lineTo(-u * 0.45, u * 0.45); ctx.stroke();
    } else if (kind === 'star') {
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) {
        const a = -Math.PI / 2 + i * TAU / 10, r = i % 2 ? u * 0.45 : u * 0.85;
        i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
    } else if (kind === 'bolt' || kind === 'zap') {
      ctx.beginPath(); ctx.moveTo(u * 0.15, -u * 0.85); ctx.lineTo(-u * 0.45, u * 0.15); ctx.lineTo(-u * 0.02, u * 0.15);
      ctx.lineTo(-u * 0.15, u * 0.85); ctx.lineTo(u * 0.45, -u * 0.15); ctx.lineTo(u * 0.02, -u * 0.15); ctx.closePath(); ctx.fill();
    } else if (kind === 'clock') {
      circle(0, 0, u * 0.8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -u * 0.5); ctx.moveTo(0, 0); ctx.lineTo(u * 0.35, u * 0.1); ctx.stroke();
    } else if (kind === 'heart') {
      ctx.beginPath(); ctx.moveTo(0, u * 0.7);
      ctx.bezierCurveTo(-u * 1.1, -u * 0.1, -u * 0.55, -u * 0.85, 0, -u * 0.25);
      ctx.bezierCurveTo(u * 0.55, -u * 0.85, u * 1.1, -u * 0.1, 0, u * 0.7); ctx.fill();
    } else if (kind === 'target') {
      circle(0, 0, u * 0.8); ctx.stroke();
      circle(0, 0, u * 0.45); ctx.stroke();
      circle(0, 0, u * 0.15); ctx.fill();
    } else if (kind === 'brain') {
      circle(-u * 0.35, -u * 0.2, u * 0.35); ctx.stroke();
      circle(u * 0.35, -u * 0.2, u * 0.35); ctx.stroke();
      circle(-u * 0.25, u * 0.3, u * 0.35); ctx.stroke();
      circle(u * 0.25, u * 0.3, u * 0.35); ctx.stroke();
    } else if (kind === 'refresh') {
      ctx.beginPath(); ctx.arc(0, 0, u * 0.65, -Math.PI * 0.3, Math.PI * 1.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(u * 0.45, -u * 0.7); ctx.lineTo(u * 0.8, -u * 0.3); ctx.lineTo(u * 0.3, -u * 0.25); ctx.stroke();
    } else if (kind === 'flame') {
      ctx.beginPath(); ctx.moveTo(0, -u * 0.8);
      ctx.bezierCurveTo(-u * 0.6, -u * 0.1, -u * 0.7, u * 0.4, -u * 0.4, u * 0.75);
      ctx.bezierCurveTo(0, u * 0.95, u * 0.5, u * 0.9, u * 0.65, u * 0.45);
      ctx.bezierCurveTo(u * 0.75, 0, u * 0.2, -u * 0.3, 0, -u * 0.8); ctx.fill();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- scene primitives
  /** multi-theme procedural background */
  function bg(t, opts = {}) {
    const T = activeTheme || {};
    const c1 = opts.c1 || T.colors?.bg1 || '#07090e';
    const c2 = opts.c2 || T.colors?.bg2 || '#0d111a';
    const c3 = opts.c3 || T.colors?.bg3 || '#121724';

    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, c1); g.addColorStop(0.6, c2); g.addColorStop(1, c3);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    const bgType = opts.type || T.background?.type || 'dots';

    if (bgType === 'dots') {
      const gs = opts.gridSize || T.background?.gridSize || 48;
      const dotR = opts.dotSize || T.background?.dotSize || 1.5;
      const dotCol = opts.dotColor || T.background?.dotColor || 'rgba(148, 163, 184, 0.15)';
      ctx.save(); ctx.fillStyle = dotCol;
      for (let x = gs / 2; x < W; x += gs) {
        for (let y = gs / 2; y < H; y += gs) {
          circle(x, y, dotR); ctx.fill();
        }
      }
      ctx.restore();
    } else if (bgType === 'blueprint') {
      const gs = opts.gridSize || T.background?.gridSize || 64;
      const gCol = opts.gridColor || T.background?.gridColor || 'rgba(56, 189, 248, 0.12)';
      ctx.save(); ctx.strokeStyle = gCol; ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      // Minor subdivisions
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
      const sub = gs / 4;
      for (let x = sub; x < W; x += sub) { if (x % gs !== 0) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } }
      for (let y = sub; y < H; y += sub) { if (y % gs !== 0) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } }
      ctx.restore();
    } else if (bgType === 'retro_grid') {
      ctx.save();
      ctx.strokeStyle = opts.gridColor || T.colors?.border || 'rgba(76,201,240,0.10)';
      ctx.lineWidth = 1;
      const off = (t * 24) % 96;
      for (let x = -96 + off; x < W + 96; x += 96) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H + 96; y += 96) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.restore();
    } else if (bgType === 'mesh') {
      ctx.save();
      const m1 = ctx.createRadialGradient(W * 0.25 + Math.sin(t * 0.4) * 90, H * 0.3 + Math.cos(t * 0.3) * 70, 0, W * 0.25, H * 0.3, W * 0.48);
      m1.addColorStop(0, T.colors?.glow || 'rgba(168, 85, 247, 0.18)');
      m1.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = m1; ctx.fillRect(0, 0, W, H);

      const m2 = ctx.createRadialGradient(W * 0.75 - Math.cos(t * 0.3) * 90, H * 0.65 - Math.sin(t * 0.4) * 70, 0, W * 0.75, H * 0.65, W * 0.48);
      m2.addColorStop(0, 'rgba(52, 211, 153, 0.12)');
      m2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = m2; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // floating particles
    const n = opts.particles ?? T.background?.particles ?? 28;
    if (n > 0) {
      ctx.save();
      const pCol = opts.particleColor || T.background?.particleColor || T.colors?.secondary || 'rgba(147, 197, 253, 0.20)';
      for (let i = 0; i < n; i++) {
        const px = hash(i, 1) * W, spd = 12 + hash(i, 2) * 26;
        const py = (hash(i, 3) * H - t * spd) % H; const yy = py < 0 ? py + H : py;
        const a = 0.10 + 0.14 * hash(i, 4);
        ctx.fillStyle = pCol.replace(/[\d\.]+\)$/, `${a.toFixed(2)})`);
        circle(px, yy, 1.5 + hash(i, 5) * 2.2); ctx.fill();
      }
      ctx.restore();
    }

    // vignette
    const doVignette = opts.vignette ?? T.background?.vignette ?? true;
    if (doVignette) {
      const vStr = opts.vignetteStrength ?? T.background?.vignetteStrength ?? 0.6;
      const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${vStr})`);
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }
  }

  /** CRT scanlines (conditionally active depending on theme or force) */
  function scanlines(force = false) {
    if (!force && activeTheme && !activeTheme.background?.scanlines) return;
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.05)';
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
    ctx.restore();
  }

  /** Theme-aware HUD bar */
  function hud(t, label) {
    const T = activeTheme || {};
    const pCol = T.colors?.primary || '#60a5fa';
    const mCol = T.colors?.textMuted || 'rgba(255,255,255,0.55)';
    const font = T.font?.mono || MONO;
    const hudStyle = T.ui?.hudStyle || 'pill';

    if (hudStyle === 'none') return;

    const lbl = label || (T.name ? `◉ ${T.name.split(' ')[0]}` : '◉ EXPLORER');
    const mm = String(Math.floor(t / 60)).padStart(2, '0'), ss = String(Math.floor(t % 60)).padStart(2, '0');
    const timestr = `T+${mm}:${ss}`;

    if (hudStyle === 'pill') {
      ctx.save();
      // left pill
      ctx.font = `600 22px ${font}`;
      const w1 = ctx.measureText(lbl).width + 36;
      ctx.fillStyle = T.colors?.surface || 'rgba(18, 24, 38, 0.90)';
      ctx.strokeStyle = T.colors?.border || 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.5;
      rrect(50, 26, w1, 40, 20); ctx.fill(); ctx.stroke();
      text(lbl, 50 + w1 / 2, 47, 22, pCol, font, 600, 'center');

      // right pill
      ctx.font = `600 22px ${font}`;
      const w2 = ctx.measureText(timestr).width + 36;
      rrect(W - 50 - w2, 26, w2, 40, 20); ctx.fill(); ctx.stroke();
      text(timestr, W - 50 - w2 / 2, 47, 22, mCol, font, 600, 'center');
      ctx.restore();
    } else {
      // classic / minimal text
      text(lbl, 60, 46, 26, pCol, font, 700, 'left');
      text(timestr, W - 60, 46, 26, mCol, font, 700, 'right');
    }
  }

  /** bottom subtitle bar. subs: [[start,end,text],...] */
  function drawSubs(t, subs, showText = true) {
    if (!showText || !subs) return;
    const s = subs.find(s => t >= s[0] && t < s[1]);
    if (!s) return;
    const k = Math.min(seg(t, s[0], s[0] + 0.25), 1 - seg(t, s[1] - 0.3, s[1]));
    if (k <= 0) return;

    const T = activeTheme || {};
    const subConf = T.ui?.subtitles || {};
    const maxW = subConf.maxWidth || 1600;
    const radius = subConf.radius ?? 16;
    const bgFill = subConf.bg || 'rgba(11, 15, 26, 0.88)';
    const borderCol = subConf.border || T.colors?.borderActive || 'rgba(96, 165, 250, 0.25)';
    const textCol = subConf.textColor || T.colors?.textPrimary || '#f8fafc';
    const font = T.font?.sans || CN;

    const lines = wrapCN(s[2], maxW - 120, 38, 500);
    const bw = maxW, bh = lines.length * 54 + 44;

    ctx.save(); ctx.globalAlpha = k * 0.98;
    ctx.fillStyle = bgFill;
    rrect(960 - bw / 2, H - bh - 28, bw, bh, radius); ctx.fill();
    ctx.strokeStyle = borderCol; ctx.lineWidth = 1.5;
    rrect(960 - bw / 2, H - bh - 28, bw, bh, radius); ctx.stroke();
    lines.forEach((ln, i) => text(ln, 960, H - bh - 28 + 44 + i * 54, 38, textCol, font, 500));
    ctx.restore();
  }

  function withAlpha(k, fn) {
    if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = k; fn(); ctx.restore();
  }

  function toast(str, cx, cy, k, color = null) {
    if (k <= 0) return;
    const T = activeTheme || {};
    const col = color || T.colors?.accent || '#34d399';
    const bgCol = T.colors?.surfaceHighlight || 'rgba(18, 24, 38, 0.95)';
    const font = T.font?.mono || MONO;
    ctx.save(); ctx.globalAlpha = k;
    ctx.font = `700 28px ${font}`;
    const w = ctx.measureText(str).width + 72;
    ctx.fillStyle = bgCol; ctx.strokeStyle = col; ctx.lineWidth = 2;
    rrect(cx - w / 2, cy - 32, w, 64, 16); ctx.fill(); ctx.stroke();
    text('✓ ' + str, cx, cy + 1, 28, col, font, 700);
    ctx.restore();
  }

  // ---------------------------------------------------------------- panel & cards
  function panel(x, y, w, h, { color = null, titleEn = '', titleZh = '', pad = 36 } = {}) {
    const T = activeTheme || {};
    const c = color || T.colors?.primary || '#60a5fa';
    const bgFill = T.colors?.surface || 'rgba(18, 24, 38, 0.90)';
    const sans = T.font?.sans || CN;
    const mono = T.font?.mono || MONO;

    ctx.save();
    ctx.fillStyle = bgFill; ctx.strokeStyle = c; ctx.lineWidth = 2.5;
    ctx.shadowColor = T.colors?.glow || c; ctx.shadowBlur = 20;
    rrect(x, y, w, h, 20); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    let cx = x + pad;
    if (titleEn) { text(titleEn, cx, y + 50, 28, c, mono, 700, 'left'); cx += ctx.measureText(titleEn).width + 24; }
    if (titleZh) text(titleZh, cx, y + 50, 28, T.colors?.textPrimary || '#ffffff', sans, 700, 'left');
    ctx.restore();
    return { x: x + pad, y: y + 96 };
  }

  function card(x, y, { icon: ic = 'star', color = null, zh = '', en = '', desc = '', w = 600, h = 310 } = {}) {
    const T = activeTheme || {};
    const c = color || T.colors?.primary || '#60a5fa';
    const bgFill = T.colors?.surface || 'rgba(18, 24, 38, 0.92)';
    const sans = T.font?.sans || CN;
    const mono = T.font?.mono || MONO;

    ctx.save(); ctx.translate(x, y);
    ctx.shadowColor = T.colors?.glow || c; ctx.shadowBlur = 22;
    ctx.fillStyle = bgFill; ctx.strokeStyle = c; ctx.lineWidth = 2.5;
    rrect(-w / 2, -h / 2, w, h, 20); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; circle(-w / 2 + 92, -34, 56); ctx.fill();
    icon(ic, -w / 2 + 92, -34, 60, c);
    text(zh, -w / 2 + 176, -52, 56, T.colors?.textPrimary || '#ffffff', sans, 900, 'left');
    text(en, -w / 2 + 178, 4, 24, c, mono, 700, 'left');
    ctx.strokeStyle = T.colors?.border || 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-w / 2 + 36, 52); ctx.lineTo(w / 2 - 36, 52); ctx.stroke();
    text(desc, 0, 108, 34, T.colors?.textSecondary || 'rgba(220,230,255,0.85)', sans, 500);
    ctx.restore();
  }

  function flyIn(u, t0, dur, fromY, i, fn, t) {
    const k = E.out(seg(u, t0, t0 + 0.45));
    if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = k;
    const bob = k >= 1 ? Math.sin(t * 2 + i * 1.7) * 8 : 0;
    ctx.translate(0, lerp(fromY, bob, E.out(seg(u, t0, t0 + dur))) - bob);
    ctx.translate(0, bob);
    fn();
    ctx.restore();
  }

  function xpBar(x, y, w, h, fill, label = true) {
    const T = activeTheme || {};
    const mono = T.font?.mono || MONO;
    ctx.fillStyle = T.colors?.surfaceHighlight || '#16203c'; rrect(x, y, w, h, h / 2); ctx.fill();
    if (fill > 0) {
      const g2 = ctx.createLinearGradient(x, 0, x + w, 0);
      g2.addColorStop(0, T.colors?.accent || '#34d399');
      g2.addColorStop(1, T.colors?.primary || '#60a5fa');
      ctx.fillStyle = g2; rrect(x, y, w * fill, h, h / 2); ctx.fill();
    }
    if (label) text(`PROGRESS ${(fill * 100) | 0}%`, x + w, y - 22, 22, T.colors?.textSecondary || '#8fa3c8', mono, 700, 'right');
  }

  function levelUp(cx, cy, k, u, str = 'LEVEL UP!') {
    if (k <= 0) return;
    const T = activeTheme || {};
    const s = E.outBack(k);
    const cPrimary = T.colors?.gold || '#ffd23f';
    const cSecondary = T.colors?.primary || '#60a5fa';
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.globalAlpha = k;
    ctx.rotate(u * 1.5);
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12;
      ctx.strokeStyle = i % 2 ? cPrimary : cSecondary; ctx.lineWidth = 8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 90, Math.sin(a) * 90); ctx.lineTo(Math.cos(a) * 170, Math.sin(a) * 170); ctx.stroke();
    }
    ctx.rotate(-u * 1.5);
    glowText(str, 0, 0, 80, cPrimary, T.colors?.glow || cSecondary);
    ctx.restore();
  }

  function questLog(px, py, pw, ph, quests, u, t, opts = {}) {
    const T = activeTheme || {};
    const color = opts.color || T.colors?.accent || '#34d399';
    const sans = T.font?.sans || CN;
    const mono = T.font?.mono || MONO;
    const o = panel(px, py, pw, ph, { color, titleEn: opts.titleEn || 'ACTION PLAN', titleZh: opts.titleZh || '行动清单' });
    quests.forEach((q, i) => {
      const t0 = (opts.t0 ?? 0.7) + i * (opts.gap ?? 1.5), ry = o.y + 64 + i * 120;
      const k = seg(u, t0, t0 + 0.4);
      if (k <= 0) return;
      ctx.save(); ctx.globalAlpha = k;
      ctx.strokeStyle = color; ctx.lineWidth = 3.5;
      rrect(px + 40, ry - 23, 46, 46, 10); ctx.stroke();
      const ck = seg(u, t0 + 0.15, t0 + 0.55);
      if (ck > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(px + 40, ry - 23, 46 * ck + 8, 46); ctx.clip();
        icon('check', px + 63, ry, 34, color); ctx.restore();
      }
      text(q.t, px + 120, ry, 38, T.colors?.textPrimary || '#ffffff', sans, 500, 'left');
      if (q.xp) {
        const xp = seg(u, t0 + 0.3, t0 + 1.2);
        if (xp > 0 && xp < 1) {
          ctx.save(); ctx.globalAlpha = (1 - xp) * k;
          text(q.xp, px + pw - 90, ry - xp * 46, 28, T.colors?.gold || '#fbbf24', mono, 700);
          ctx.restore();
        }
      }
      ctx.restore();
    });
    xpBar(px + 40, py + ph - 78, pw - 80, 26, seg(u, opts.barFrom ?? 0.7, opts.barTo ?? 4.6));
    levelUp(px + pw / 2, py + 300, seg(u, 4.6, 5.1) * (1 - seg(u, 5.9, 6.5)), u, opts.levelText);
  }

  function rulesList(rx, ry, rw, rh, rules, u, opts = {}) {
    const T = activeTheme || {};
    const color = opts.color || T.colors?.primary || '#60a5fa';
    const sans = T.font?.sans || CN;
    const mono = T.font?.mono || MONO;
    const o = panel(rx, ry, rw, rh, { color, titleEn: opts.titleEn || 'CORE PRINCIPLES', titleZh: opts.titleZh || '核心原则' });
    rules.forEach((r, i) => {
      const k = seg(u, (opts.t0 ?? 1.7) + i * 0.5, (opts.t0 ?? 1.7) + i * 0.5 + 0.4);
      if (k <= 0) return;
      ctx.save(); ctx.globalAlpha = k;
      const yy = o.y + 74 + i * 120;
      ctx.fillStyle = T.colors?.surfaceHighlight || 'rgba(30, 41, 64, 0.45)';
      rrect(rx + 36, yy - 44, rw - 72, 88, 14); ctx.fill();
      text(`STEP 0${i + 1}`, rx + 66, yy - 18, 22, color, mono, 700, 'left');
      text(r, rx + 66, yy + 16, 36, T.colors?.textPrimary || '#ffffff', sans, 500, 'left');
      ctx.restore();
    });
  }

  function person(cx, baseY, s, k, color = null) {
    if (k <= 0) return;
    const T = activeTheme || {};
    const col = color || T.colors?.primary || '#60a5fa';
    ctx.save(); ctx.globalAlpha = clamp(k, 0, 1);
    ctx.translate(cx, 0); ctx.scale(s, s);
    ctx.fillStyle = T.colors?.surfaceHighlight || '#141a30'; ctx.strokeStyle = col; ctx.lineWidth = 3;
    circle(0, baseY - 90, 85); ctx.fill(); ctx.stroke();
    rrect(-150, baseY + 20, 300, 240, 110); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function shieldScene(cx, cy, R, u, t, distractions, opts = {}) {
    const T = activeTheme || {};
    const col = opts.color || T.colors?.primary || '#60a5fa';
    const gone = seg(u, opts.goneFrom ?? 8.2, (opts.goneFrom ?? 8.2) + 0.7);
    if (gone < 1) {
      const k = E.outBack(seg(u, 0.1, 0.9));
      person(cx, cy + 90, k, (1 - gone) * clamp(k, 0, 1), col);
    }
    if (gone < 1) {
      for (let i = 0; i < 3; i++) {
        const p = seg(u, 1.2 + i * 0.22, 2.4 + i * 0.22);
        if (p > 0 && p < 1) {
          ctx.save(); ctx.globalAlpha = (1 - p) * 0.8 * (1 - gone);
          ctx.strokeStyle = col; ctx.lineWidth = 5;
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
        grd.addColorStop(0, 'rgba(0,0,0,0)');
        grd.addColorStop(0.85, (T.colors?.glow || 'rgba(96,165,250,0.2)').replace(/[\d\.]+\)$/, `${(0.12 * on).toFixed(2)})`));
        grd.addColorStop(1, (T.colors?.glow || 'rgba(96,165,250,0.5)').replace(/[\d\.]+\)$/, `${(pulse * on).toFixed(2)})`));
        ctx.fillStyle = grd; circle(cx, cy, R + wob + 26); ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 4;
        circle(cx, cy, R + wob); ctx.stroke();
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

  function flipCard(cx, cy, w, h, u, t0, dur, front, back, colorA = null, colorB = null) {
    const T = activeTheme || {};
    const cA = colorA || T.colors?.primary || '#60a5fa';
    const cB = colorB || T.colors?.gold || '#fbbf24';
    const fp = seg(u, t0, t0 + dur);
    if (fp <= 0 || fp >= 1.2) return;
    const sx = Math.cos(fp * Math.PI);
    ctx.save(); ctx.translate(cx, cy);
    ctx.scale(Math.abs(sx) < 0.02 ? (sx < 0 ? -0.02 : 0.02) : sx, 1);
    const isBack = sx < 0;
    ctx.shadowColor = isBack ? cB : cA; ctx.shadowBlur = 32;
    ctx.fillStyle = T.colors?.surface || '#0e1428'; ctx.strokeStyle = isBack ? cB : cA; ctx.lineWidth = 3.5;
    rrect(-w / 2, -h / 2, w, h, 24); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    if (isBack) ctx.scale(-1, 1); // unmirror
    (isBack ? back : front)();
    ctx.restore();
  }

  // ---------------------------------------------------------------- universal knowledge components

  /**
   * Side-by-side comparison view (Old Way vs New Way, Problem vs Solution, Status Game vs Deep Change).
   * leftData: { title, subtitle, items: [...], icon: 'warn', color: '#f87171' }
   * rightData: { title, subtitle, items: [...], icon: 'check', color: '#34d399' }
   */
  function compareView(cx, cy, w, h, u, leftData, rightData, opts = {}) {
    const T = activeTheme || {};
    const sans = T.font?.sans || CN;
    const mono = T.font?.mono || MONO;
    const t0 = opts.t0 ?? 0.2;
    const gap = opts.gap ?? 40;
    const cardW = (w - gap) / 2;

    const colL = leftData.color || T.colors?.warning || '#f87171';
    const colR = rightData.color || T.colors?.accent || '#34d399';

    // Left card
    const kl = E.out(seg(u, t0, t0 + 0.5));
    if (kl > 0) {
      ctx.save(); ctx.globalAlpha = kl;
      const lx = cx - w / 2 + cardW / 2 + (1 - kl) * -40;
      ctx.fillStyle = T.colors?.surface || 'rgba(18, 24, 38, 0.92)';
      ctx.strokeStyle = colL; ctx.lineWidth = 2.5;
      ctx.shadowColor = colL; ctx.shadowBlur = 18;
      rrect(lx - cardW / 2, cy - h / 2, cardW, h, 20); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;

      // header
      icon(leftData.icon || 'warn', lx - cardW / 2 + 60, cy - h / 2 + 56, 48, colL);
      text(leftData.title, lx - cardW / 2 + 104, cy - h / 2 + 44, 38, T.colors?.textPrimary || '#fff', sans, 800, 'left');
      if (leftData.subtitle) {
        text(leftData.subtitle, lx - cardW / 2 + 104, cy - h / 2 + 82, 22, colL, mono, 600, 'left');
      }

      ctx.strokeStyle = T.colors?.border || 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(lx - cardW / 2 + 36, cy - h / 2 + 116); ctx.lineTo(lx + cardW / 2 - 36, cy - h / 2 + 116); ctx.stroke();

      // items
      (leftData.items || []).forEach((item, idx) => {
        const itemK = seg(u, t0 + 0.3 + idx * 0.2, t0 + 0.6 + idx * 0.2);
        if (itemK <= 0) return;
        ctx.save(); ctx.globalAlpha = itemK;
        const iy = cy - h / 2 + 168 + idx * 72;
        icon('cross', lx - cardW / 2 + 64, iy, 26, colL);
        text(item, lx - cardW / 2 + 96, iy, 30, T.colors?.textSecondary || '#cbd5e1', sans, 500, 'left');
        ctx.restore();
      });
      ctx.restore();
    }

    // Right card
    const kr = E.out(seg(u, t0 + 0.25, t0 + 0.75));
    if (kr > 0) {
      ctx.save(); ctx.globalAlpha = kr;
      const rx = cx + w / 2 - cardW / 2 + (1 - kr) * 40;
      ctx.fillStyle = T.colors?.surface || 'rgba(18, 24, 38, 0.92)';
      ctx.strokeStyle = colR; ctx.lineWidth = 2.5;
      ctx.shadowColor = colR; ctx.shadowBlur = 18;
      rrect(rx - cardW / 2, cy - h / 2, cardW, h, 20); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;

      // header
      icon(rightData.icon || 'check', rx - cardW / 2 + 60, cy - h / 2 + 56, 48, colR);
      text(rightData.title, rx - cardW / 2 + 104, cy - h / 2 + 44, 38, T.colors?.textPrimary || '#fff', sans, 800, 'left');
      if (rightData.subtitle) {
        text(rightData.subtitle, rx - cardW / 2 + 104, cy - h / 2 + 82, 22, colR, mono, 600, 'left');
      }

      ctx.strokeStyle = T.colors?.border || 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(rx - cardW / 2 + 36, cy - h / 2 + 116); ctx.lineTo(rx + cardW / 2 - 36, cy - h / 2 + 116); ctx.stroke();

      // items
      (rightData.items || []).forEach((item, idx) => {
        const itemK = seg(u, t0 + 0.5 + idx * 0.2, t0 + 0.8 + idx * 0.2);
        if (itemK <= 0) return;
        ctx.save(); ctx.globalAlpha = itemK;
        const iy = cy - h / 2 + 168 + idx * 72;
        icon('check', rx - cardW / 2 + 64, iy, 26, colR);
        text(item, rx - cardW / 2 + 96, iy, 30, T.colors?.textPrimary || '#ffffff', sans, 600, 'left');
        ctx.restore();
      });
      ctx.restore();
    }

    // Center VS / Arrow badge
    const badgeK = E.outBack(seg(u, t0 + 0.6, t0 + 1.0));
    if (badgeK > 0) {
      ctx.save(); ctx.translate(cx, cy); ctx.scale(badgeK, badgeK);
      ctx.fillStyle = T.colors?.surfaceHighlight || '#1e293b';
      ctx.strokeStyle = T.colors?.primary || '#60a5fa'; ctx.lineWidth = 2.5;
      circle(0, 0, 40); ctx.fill(); ctx.stroke();
      text(opts.centerText || 'VS', 0, 1, 24, T.colors?.primary || '#60a5fa', mono, 800);
      ctx.restore();
    }
  }

  /**
   * Prominent metric / impact number card (e.g. "1 DAY", "10x", "80%").
   */
  function metricCard(x, y, w, h, { value = '', unit = '', label = '', desc = '', color = null, u = 0, t0 = 0.2 } = {}) {
    const k = E.outBack(seg(u, t0, t0 + 0.55));
    if (k <= 0) return;
    const T = activeTheme || {};
    const col = color || T.colors?.primary || '#60a5fa';
    const sans = T.font?.sans || CN;
    const mono = T.font?.mono || MONO;

    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.shadowColor = T.colors?.glow || col; ctx.shadowBlur = (T.background?.type === 'clean' ? 0 : 22);
    ctx.fillStyle = T.colors?.surface || 'rgba(18, 24, 38, 0.92)';
    ctx.strokeStyle = col; ctx.lineWidth = 2.5;
    rrect(-w / 2, -h / 2, w, h, 20); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;

    // Badge label
    if (label) {
      ctx.font = `700 20px ${mono}`;
      const lw = ctx.measureText(label).width + 30;
      ctx.fillStyle = (T.background?.type === 'clean' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)');
      rrect(-lw / 2, -h / 2 + 24, lw, 34, 17); ctx.fill();
      text(label, 0, -h / 2 + 41, 20, col, mono, 700);
    }

    // Huge metric
    const strVal = String(value);
    ctx.font = `900 80px ${mono}`;
    const vw = ctx.measureText(strVal).width;
    glowText(strVal, unit ? -20 : 0, 14, 80, T.colors?.textPrimary || '#ffffff', (T.background?.type === 'clean' ? null : T.colors?.glow || col), 900);

    if (unit) {
      text(unit, vw / 2 + 8, 26, 32, col, mono, 700, 'left');
    }

    if (desc) {
      const lines = wrapCN(desc, w - 80, 24, 500);
      lines.forEach((ln, li) => {
        text(ln, 0, h / 2 - 46 + li * 30, 24, T.colors?.textSecondary || '#94a3b8', sans, 500);
      });
    }
    ctx.restore();
  }

  /**
   * Connected sequential steps / process roadmap (1 -> 2 -> 3).
   * steps: [{ step: '01', title: '...', desc: '...' }]
   */
  function stepList(x, y, w, h, steps, u, opts = {}) {
    const T = activeTheme || {};
    const t0 = opts.t0 ?? 0.3;
    const sans = T.font?.sans || CN;
    const mono = T.font?.mono || MONO;
    const col = opts.color || T.colors?.primary || '#60a5fa';
    const acc = opts.accent || T.colors?.accent || '#34d399';

    const n = steps.length;
    const gap = 36;
    const itemW = (w - (n - 1) * gap) / n;

    steps.forEach((st, i) => {
      const st0 = t0 + i * 0.45;
      const k = E.out(seg(u, st0, st0 + 0.5));
      if (k <= 0) return;

      const sx = x - w / 2 + itemW / 2 + i * (itemW + gap);
      ctx.save(); ctx.globalAlpha = k;

      // Connecting arrow / line to next
      if (i < n - 1) {
        const lineK = seg(u, st0 + 0.35, st0 + 0.7);
        if (lineK > 0) {
          ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]);
          const xStart = sx + itemW / 2 + 4;
          const xEnd = xStart + (gap - 8) * lineK;
          ctx.beginPath(); ctx.moveTo(xStart, y); ctx.lineTo(xEnd, y); ctx.stroke();
          ctx.restore();
        }
      }

      ctx.fillStyle = T.colors?.surface || 'rgba(18, 24, 38, 0.92)';
      ctx.strokeStyle = (i === 0 ? acc : col); ctx.lineWidth = 2.5;
      rrect(sx - itemW / 2, y - h / 2, itemW, h, 18); ctx.fill(); ctx.stroke();

      // Step number pill
      ctx.fillStyle = (i === 0 ? acc : col);
      rrect(sx - itemW / 2 + 24, y - h / 2 + 28, 54, 34, 10); ctx.fill();
      text(st.step || `0${i + 1}`, sx - itemW / 2 + 51, y - h / 2 + 45, 20, (T.background?.type === 'clean' ? '#ffffff' : '#07090e'), mono, 800);

      // Title & desc
      text(st.title, sx - itemW / 2 + 96, y - h / 2 + 45, 30, T.colors?.textPrimary || '#fff', sans, 700, 'left');

      ctx.strokeStyle = T.colors?.border || 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx - itemW / 2 + 24, y - h / 2 + 82); ctx.lineTo(sx + itemW / 2 - 24, y - h / 2 + 82); ctx.stroke();

      if (st.desc) {
        const lines = wrapCN(st.desc, itemW - 48, 24, 400);
        lines.forEach((ln, li) => {
          text(ln, sx, y - h / 2 + 120 + li * 34, 24, T.colors?.textSecondary || '#94a3b8', sans, 400, 'center');
        });
      }

      ctx.restore();
    });
  }

  /**
   * Philosophical or golden quote card with decorative quote marks.
   */
  function quoteCard(x, y, w, h, { quote = '', author = '', source = '', color = null, u = 0, t0 = 0.2 } = {}) {
    const k = E.out(seg(u, t0, t0 + 0.6));
    if (k <= 0) return;
    const T = activeTheme || {};
    const col = color || T.colors?.primary || '#60a5fa';
    const sans = T.font?.sans || CN;
    const mono = T.font?.mono || MONO;

    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = k;
    ctx.shadowColor = T.colors?.glow || col; ctx.shadowBlur = (T.background?.type === 'clean' ? 0 : 24);
    ctx.fillStyle = T.colors?.surface || 'rgba(18, 24, 38, 0.94)';
    ctx.strokeStyle = col; ctx.lineWidth = 2.5;
    rrect(-w / 2, -h / 2, w, h, 24); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;

    // Subtle decorative quotation mark in top-left
    ctx.save();
    ctx.fillStyle = (T.background?.type === 'clean' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)');
    ctx.font = `900 110px ${mono}`;
    ctx.fillText('“', -w / 2 + 48, -h / 2 + 96);
    ctx.restore();

    // Quote text
    const lines = wrapCN(quote, w - 160, 40, 600);
    const startY = -h / 2 + 110;
    lines.forEach((ln, i) => {
      text(ln, 0, startY + i * 60, 40, T.colors?.textPrimary || '#f8fafc', sans, 600, 'center');
    });

    // Author line
    if (author) {
      const authY = h / 2 - 58;
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-160, authY); ctx.lineTo(-110, authY); ctx.stroke();
      text(author, 0, authY, 26, col, sans, 700, 'center');
      if (source) {
        text(`· ${source}`, 100, authY, 22, T.colors?.textMuted || '#64748b', mono, 500, 'left');
      }
    }
    ctx.restore();
  }

  /**
   * Concept / Architecture topology node graph with animated pulses.
   * nodes: [{ id, x, y, label, icon, color }]
   * edges: [{ from, to, label }]
   */
  function nodeGraph(cx, cy, nodes, edges, u, opts = {}) {
    const T = activeTheme || {};
    const t0 = opts.t0 ?? 0.2;
    const sans = T.font?.sans || CN;
    const mono = T.font?.mono || MONO;
    const nodeMap = new Map();
    nodes.forEach(n => nodeMap.set(n.id, n));

    ctx.save(); ctx.translate(cx, cy);

    // Draw edges
    edges.forEach((e, idx) => {
      const n1 = nodeMap.get(e.from), n2 = nodeMap.get(e.to);
      if (!n1 || !n2) return;
      const ek = seg(u, t0 + idx * 0.2, t0 + 0.6 + idx * 0.2);
      if (ek <= 0) return;

      ctx.save(); ctx.globalAlpha = ek;
      ctx.strokeStyle = T.colors?.borderActive || 'rgba(96, 165, 250, 0.4)';
      ctx.lineWidth = 2.5;
      const xEnd = lerp(n1.x, n2.x, ek), yEnd = lerp(n1.y, n2.y, ek);
      ctx.beginPath(); ctx.moveTo(n1.x, n1.y); ctx.lineTo(xEnd, yEnd); ctx.stroke();

      // Moving data pulse along edge
      if (ek >= 1) {
        const pulseT = ((u * 1.5 + idx * 0.3) % 1.0);
        const px = lerp(n1.x, n2.x, pulseT), py = lerp(n1.y, n2.y, pulseT);
        ctx.fillStyle = T.colors?.primary || '#60a5fa';
        circle(px, py, 5); ctx.fill();
      }

      if (e.label && ek >= 0.8) {
        const mx = (n1.x + n2.x) / 2, my = (n1.y + n2.y) / 2;
        ctx.font = `600 20px ${mono}`;
        const lw = ctx.measureText(e.label).width + 16;
        ctx.fillStyle = T.colors?.bg2 || '#0d111a';
        rrect(mx - lw / 2, my - 14, lw, 28, 6); ctx.fill();
        text(e.label, mx, my, 20, T.colors?.textSecondary || '#94a3b8', mono, 600);
      }
      ctx.restore();
    });

    // Draw nodes
    nodes.forEach((n, idx) => {
      const nk = E.outBack(seg(u, t0 + 0.15 + idx * 0.15, t0 + 0.65 + idx * 0.15));
      if (nk <= 0) return;

      const c = n.color || T.colors?.primary || '#60a5fa';
      ctx.save(); ctx.translate(n.x, n.y); ctx.scale(nk, nk);
      ctx.shadowColor = c; ctx.shadowBlur = 20;
      ctx.fillStyle = T.colors?.surface || 'rgba(18, 24, 38, 0.94)';
      ctx.strokeStyle = c; ctx.lineWidth = 3;

      const nr = n.radius || 50;
      circle(0, 0, nr); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0;

      if (n.icon) {
        icon(n.icon, 0, -6, nr * 0.9, c);
      }
      if (n.label) {
        text(n.label, 0, nr + 24, 26, T.colors?.textPrimary || '#fff', sans, 700);
      }
      ctx.restore();
    });

    ctx.restore();
  }

  // ---------------------------------------------------------------- title / boot bits
  function pressStart(u, title = 'SYSTEM BOOT') {
    const T = activeTheme || {};
    const blink = Math.floor(u * 2.6) % 2 === 0 ? 1 : 0.12;
    const col = T.colors?.primary || '#60a5fa';
    const mono = T.font?.mono || MONO;
    ctx.save(); ctx.globalAlpha = blink;
    text(title, 960, 440, 32, col, mono, 700);
    glowText('▶ INITIALIZE', 960, 540, 60, T.colors?.textPrimary || '#ffffff', col);
    ctx.restore();
  }

  function terminal(x, y, w, h, lines, u, t0 = 0, fadeOut = null) {
    const T = activeTheme || {};
    const col = T.colors?.primary || '#60a5fa';
    const mono = T.font?.mono || MONO;
    const a = fadeOut == null ? 1 : 1 - seg(u, fadeOut[0], fadeOut[1]);
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = T.colors?.surface || 'rgba(5,8,18,0.92)';
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    rrect(x, y, w, h, 14); ctx.fill(); ctx.stroke();
    lines.forEach(([s, dt], i) => { if (u > t0 + dt) text(s, x + 40, y + 60 + i * 52, 28, T.colors?.textSecondary || '#9fe8ff', mono, 500, 'left'); });
    const p = seg(u, t0, t0 + 1.8);
    ctx.fillStyle = T.colors?.surfaceHighlight || '#16203c'; rrect(x + 40, y + h - 80, w - 80, 24, 12); ctx.fill();
    if (p > 0) { ctx.fillStyle = col; rrect(x + 40, y + h - 80, (w - 80) * p, 24, 12); ctx.fill(); }
    text(`${Math.round(p * 100)}%`, x + w - 40, y + h - 68, 24, col, mono, 700, 'right');
    ctx.restore();
    return p;
  }

  function titlePop(str, cx, cy, u, t0, px = 104, gap = null, color = null, glow = null) {
    const T = activeTheme || {};
    const c = color || T.colors?.textPrimary || '#ffffff';
    const gl = glow || T.colors?.glow || T.colors?.primary || '#60a5fa';
    const sans = T.font?.sans || CN;
    const g = gap ?? (px + 14); // CJK safe gap
    const chars = [...str];
    chars.forEach((ch, i) => {
      const k = E.outBack(seg(u, t0 + i * 0.12, t0 + i * 0.12 + 0.48));
      if (k <= 0) return;
      ctx.save(); ctx.translate(cx + (i - (chars.length - 1) / 2) * g, cy); ctx.scale(k, k);
      ctx.shadowColor = gl; ctx.shadowBlur = 32;
      text(ch, 0, 0, px, c, sans, 900);
      ctx.restore();
    });
  }

  function typewriter(str, cx, cy, u, t0, t1, px = 32, color = null) {
    const T = activeTheme || {};
    const col = color || T.colors?.gold || '#fbbf24';
    const mono = T.font?.mono || MONO;
    const n = Math.floor(seg(u, t0, t1) * str.length);
    if (n > 0) {
      text(str.slice(0, n), cx, cy, px, col, mono, 700);
      if (n < str.length && Math.floor(u * 6) % 2 === 0) {
        const wdt = ctx.measureText(str.slice(0, n)).width;
        text('▌', cx + wdt / 2 + 16, cy, px, col, mono, 700);
      }
    }
  }

  function coins(u, t0, n = 14, color = null) {
    const T = activeTheme || {};
    const col = color || T.colors?.gold || '#ffd23f';
    const mono = T.font?.mono || MONO;
    ctx.save();
    for (let i = 0; i < n; i++) {
      const cx = 200 + hash(i, 7) * 1520, cy = 760 + Math.sin(u * 1.6 + i * 1.3) * 26 + hash(i, 8) * 120;
      const a = seg(u, t0 + hash(i, 9) * 1.2, t0 + 0.8 + hash(i, 9) * 1.2);
      if (a <= 0) continue;
      ctx.globalAlpha = a * 0.85; ctx.fillStyle = col;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(Math.abs(Math.sin(u * 2 + i)), 1);
      circle(0, 0, 13); ctx.fill();
      ctx.fillStyle = '#7a5b00'; text('★', 0, 1, 18, '#7a5b00', mono, 900);
      ctx.restore();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- app wiring
  function createApp(cfg) {
    const params = new URLSearchParams(location.search);
    const showText = params.get('text') !== '0';
    const renderMode = params.get('render') === '1';

    // Resolution detection (4k / 2k / 1080p / custom w&h)
    const resParam = (params.get('res') || '').toLowerCase();
    let targetW = 1920, targetH = 1080;
    if (resParam === '4k' || resParam === 'uhd' || resParam === '2160p') {
      targetW = 3840; targetH = 2160;
    } else if (resParam === '2k' || resParam === 'qhd' || resParam === '1440p') {
      targetW = 2560; targetH = 1440;
    } else if (params.get('w') && params.get('h')) {
      targetW = parseInt(params.get('w'), 10) || 1920;
      targetH = parseInt(params.get('h'), 10) || 1080;
    }

    if (cfg.theme) {
      setTheme(cfg.theme);
    }

    window.DUR = cfg.dur;
    window.__DUR = cfg.dur;
    window.__BEATS = cfg.beats || [];
    window.__SUBS = cfg.subs || [];
    const canvas = document.getElementById('c');

    if (renderMode || targetW !== 1920 || targetH !== 1080) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    const scaleX = targetW / 1920;
    const scaleY = targetH / 1080;

    function render(t) {
      t = clamp(t, 0, cfg.dur);
      ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
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
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.body.style.overflow = 'hidden';
      const st = document.getElementById('stage');
      st.style.position = 'fixed';
      st.style.top = '0';
      st.style.left = '0';
      st.style.width = targetW + 'px';
      st.style.height = targetH + 'px';
      st.style.aspectRatio = 'auto';
      st.style.borderRadius = '0';
      st.style.boxShadow = 'none';
      st.style.margin = '0';
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
    get T() { return activeTheme; },
    get theme() { return activeTheme; },
    setTheme, getTheme,
    clamp, lerp, seg, E, tw, mv, hash,
    rrect, circle, text, glowText, wrapCN, icon,
    bg, scanlines, hud, drawSubs, withAlpha, toast,
    panel, card, flyIn, xpBar, levelUp, questLog, rulesList,
    person, shieldScene, flipCard,
    compareView, metricCard, stepList, quoteCard, nodeGraph,
    pressStart, terminal, titlePop, typewriter, coins,
    createApp,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = V;
}
