'use strict';
/* Semantic scene renderers. Add a new family with SceneStyles.register(name, draw).
   Each renderer receives the same content ({type,title,body,left,right,items,...}),
   local time u, global time t, and a style profile. No renderer owns captions or music. */
const SceneStyles = (() => {
  const families = Object.create(null);
  const W = 1920;
  const CJK = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/;
  const face = (style, serif = false) => serif || style.scene?.font === 'serif'
    ? 'Georgia, "Songti SC", "Noto Serif CJK SC", serif'
    : style.scene?.font === 'mono' ? V.MONO : V.T.font?.sans || V.CN;
  const ctx = () => V.context;
  const titleOf = scene => String(scene.title || scene.quote || '');
  const itemText = item => typeof item === 'string' ? item : String(item?.title || item?.text || '');
  const points = scene => scene.type === 'contrast'
    ? [itemText(scene.left), itemText(scene.right)]
    : (scene.items || []).map(itemText).filter(Boolean);

  function progress(u, style, delay = 0) {
    const d = style.motion?.enterSeconds || 0.45;
    const raw = V.seg(u, delay, delay + d);
    switch (style.motion?.entry) {
      case 'snap': return raw < 0.18 ? 0 : 1;
      case 'float': return V.E.out(raw);
      case 'draw': return V.E.inOut(raw);
      case 'write': return V.E.inOut(raw);
      default: return V.E.out(raw);
    }
  }

  function fit(str, x, y, maxW, px, color, family, weight = 700, align = 'left', alpha = 1) {
    if (!str) return;
    const c = ctx();
    c.save(); c.globalAlpha *= alpha;
    c.textAlign = align; c.textBaseline = 'middle';
    c.font = `${weight} ${px}px ${family}`;
    const measured = c.measureText(String(str)).width;
    if (measured > maxW) px = Math.max(24, Math.floor(px * maxW / measured));
    c.font = `${weight} ${px}px ${family}`;
    c.fillStyle = color; c.fillText(String(str), x, y, maxW);
    c.restore();
  }

  function para(str, x, y, maxW, px, color, family, maxLines = 3, gap = 1.4) {
    if (!str) return;
    const c = ctx();
    c.save(); c.font = `500 ${px}px ${family}`;
    const tokens = CJK.test(str) ? Array.from(String(str)) : String(str).split(/(\s+)/);
    const lines = []; let line = '';
    for (const token of tokens) {
      const next = line + token;
      if (c.measureText(next).width > maxW && line.trim()) {
        lines.push(line.trim()); line = token.trimStart();
      } else line = next;
    }
    if (line.trim()) lines.push(line.trim());
    c.restore();
    lines.slice(0, maxLines).forEach((value, i) => fit(value, x, y + i * px * gap, maxW, px, color, family, 500));
  }

  function rect(x, y, w, h, fill, radius = 0, stroke = null, lineWidth = 2) {
    const c = ctx(); c.beginPath();
    if (radius) c.roundRect(x, y, w, h, radius);
    else c.rect(x, y, w, h);
    c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lineWidth; c.stroke(); }
  }

  function rule(x1, y1, x2, y2, color, width = 2) {
    const c = ctx(); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
    c.strokeStyle = color; c.lineWidth = width; c.stroke();
  }

  function cards(scene, u, _t, style) {
    const T = V.T, k = progress(u, style, 0.1);
    fit(scene.kicker || 'INSIGHT', 180, 170, 700, 28, T.colors.primary, V.MONO, 700, 'left', k);
    fit(titleOf(scene), 180, 250, 1540, 68, T.colors.textPrimary, face(style), 800, 'left', k);
    if (scene.type === 'contrast') {
      V.compareView(960, 550, 1540, 445, u,
        { title: itemText(scene.left), subtitle: scene.left?.label || '', items: scene.left?.items || [scene.left?.body || ''], icon: 'warn', color: T.colors.warning },
        { title: itemText(scene.right), subtitle: scene.right?.label || '', items: scene.right?.items || [scene.right?.body || ''], icon: 'check', color: T.colors.accent },
        { t0: 0.15, centerText: '→' });
    } else if (scene.type === 'steps') {
      const list = (scene.items || []).slice(0, 4).map((v, i) => ({ step: String(i + 1).padStart(2, '0'), title: itemText(v), desc: v?.body || '' }));
      V.stepList(960, 550, 1560, 400, list, u, { t0: 0.15 });
    } else {
      para(scene.body || scene.quote, 200, 440, 1450, 42, T.colors.textSecondary, face(style), 4);
      rule(200, 650, 1700, 650, T.colors.primary, 3);
      (scene.items || []).slice(0, 3).forEach((v, i) => fit(itemText(v), 230 + i * 510, 720, 460, 31, T.colors.accent, face(style), 600));
    }
  }

  function editorial(scene, u, _t, style) {
    const T = V.T, k = progress(u, style, 0.1), c = ctx();
    const serif = face(style, true), sans = V.T.font?.sans || V.CN;
    c.save(); c.globalAlpha *= k;
    rule(150, 142, 1770, 142, T.colors.primary, 2);
    fit(scene.kicker || 'EDITORIAL NOTE', 150, 190, 1300, 24, T.colors.accent, sans, 700);
    fit(titleOf(scene), 150, 340, 1620, 100, T.colors.textPrimary, serif, 700);
    rect(150, 430, 114 * k, 9, T.colors.accent);
    if (scene.type === 'contrast') {
      rule(960, 505, 960, 770, T.colors.borderActive || T.colors.primary, 1);
      fit(itemText(scene.left), 150, 550, 720, 55, T.colors.textPrimary, serif, 700);
      para(scene.left?.body, 150, 630, 700, 32, T.colors.textSecondary, sans, 3);
      fit(itemText(scene.right), 1030, 550, 720, 55, T.colors.textPrimary, serif, 700);
      para(scene.right?.body, 1030, 630, 700, 32, T.colors.textSecondary, sans, 3);
    } else if (scene.type === 'steps') {
      (scene.items || []).slice(0, 3).forEach((item, i) => {
        const x = 150 + i * 555;
        fit(String(i + 1).padStart(2, '0'), x, 540, 100, 31, T.colors.accent, serif, 700);
        rule(x, 575, x + 470, 575, T.colors.primary, 1);
        para(itemText(item), x, 635, 470, 38, T.colors.textPrimary, serif, 2);
      });
    } else {
      para(scene.body || scene.quote, 150, 565, 1420, 41, T.colors.textSecondary, serif, 4);
      if (scene.author) fit(scene.author, 150, 785, 700, 25, T.colors.accent, sans, 700);
    }
    c.restore();
  }

  function whiteboard(scene, u, _t, style) {
    const T = V.T, c = ctx(), k = progress(u, style, 0.1);
    const ink = T.colors.textPrimary, marker = T.colors.accent, faded = T.colors.textSecondary;
    c.save(); c.globalAlpha *= k;
    fit(scene.kicker || 'NOTE 01', 145, 145, 1400, 27, marker, face(style), 800);
    fit(titleOf(scene), 145, 260, 1580, 76, ink, face(style), 800);
    rect(145, 324, 360 * k, 9, '#facc15');
    if (scene.type === 'contrast') {
      fit('A', 185, 465, 100, 55, T.colors.warning, face(style), 800);
      fit(itemText(scene.left), 285, 465, 520, 49, ink, face(style), 700);
      para(scene.left?.body, 890, 455, 760, 32, faded, face(style), 2);
      rule(265, 510, 790 * k, 510, T.colors.warning, 5);
      rule(180, 560, 1710, 560, T.colors.borderActive, 1);
      fit('B', 185, 660, 100, 55, marker, face(style), 800);
      fit(itemText(scene.right), 285, 660, 520, 49, ink, face(style), 700);
      para(scene.right?.body, 890, 650, 760, 32, faded, face(style), 2);
      c.beginPath(); c.arc(205, 660, 52, 0, Math.PI * 2 * k); c.strokeStyle = marker; c.lineWidth = 4; c.stroke();
    } else if (scene.type === 'steps') {
      const items = (scene.items || []).slice(0, 3);
      items.forEach((item, i) => {
        const y = 440 + i * 150;
        c.beginPath(); c.arc(205, y, 40, 0, Math.PI * 2); c.strokeStyle = marker; c.lineWidth = 4; c.stroke();
        fit(String(i + 1), 205, y, 60, 42, marker, face(style), 800, 'center');
        fit(itemText(item), 300, y, 1250, 45, ink, face(style), 700);
        if (i < items.length - 1) rule(205, y + 42, 205, y + 110, marker, 3);
      });
    } else {
      para(scene.body || scene.quote, 170, 455, 1180, 42, ink, face(style), 3);
      const labels = (scene.items || []).slice(0, 3).map(itemText);
      labels.forEach((label, i) => {
        const x = 270 + i * 590;
        c.beginPath(); c.arc(x, 700, 58, 0, Math.PI * 2); c.strokeStyle = marker; c.lineWidth = 3; c.stroke();
        fit(String(i + 1), x, 700, 70, 42, marker, face(style), 800, 'center');
        fit(label, x + 90, 700, 340, 33, faded, face(style), 700);
        if (i < labels.length - 1) rule(x + 420, 700, x + 520, 700, marker, 3);
      });
    }
    c.restore();
  }

  function kinetic(scene, u, _t, style) {
    const T = V.T, c = ctx(), k = progress(u, style, 0.08);
    const move = (1 - k) * 140;
    c.save();
    rect(0, 0, 360 + k * 180, 1080, T.colors.accent);
    rect(1370 + move, 110, 460, 105, T.colors.primary);
    fit(scene.kicker || 'THE IDEA', 140, 160, 800, 36, T.colors.textPrimary, face(style), 900);
    fit(titleOf(scene), 140 - move, 405, 1630, 146, T.colors.textPrimary, face(style), 900, 'left', k);
    rule(140, 535, 1700 * k, 535, T.colors.primary, 10);
    if (scene.type === 'contrast') {
      fit(itemText(scene.left), 140, 660, 720, 66, T.colors.textSecondary, face(style), 800);
      fit('→', 850, 655, 180, 120, T.colors.accent, face(style), 900);
      fit(itemText(scene.right), 1090, 660, 680, 66, T.colors.primary, face(style), 800);
    } else if (scene.type === 'steps') {
      (scene.items || []).slice(0, 3).forEach((v, i) => {
        fit(String(i + 1), 155 + i * 530, 675, 80, 92, T.colors.accent, face(style), 900);
        fit(itemText(v), 255 + i * 530, 675, 420, 38, T.colors.textPrimary, face(style), 800);
      });
    } else para(scene.body || scene.quote, 150, 650, 1540, 48, T.colors.textSecondary, face(style), 2);
    c.restore();
  }

  function blueprint(scene, u, _t, style) {
    const T = V.T, c = ctx(), k = progress(u, style, 0.1), p = points(scene);
    c.save(); c.globalAlpha *= k;
    fit(scene.kicker || 'SYSTEM MAP', 150, 160, 1500, 29, T.colors.accent, V.MONO, 700);
    fit(titleOf(scene), 150, 245, 1620, 71, T.colors.textPrimary, V.MONO, 800);
    rule(150, 302, 1770, 302, T.colors.primary, 2);
    const labels = p.length ? p.slice(0, 4) : [scene.body || 'INPUT', 'PROCESS', 'OUTPUT'];
    const count = labels.length;
    labels.forEach((label, i) => {
      const x = 230 + (count === 1 ? 0 : i * 1450 / (count - 1));
      if (i < count - 1) {
        const nextX = 230 + (i + 1) * 1450 / (count - 1);
        rule(x + 62, 560, x + 62 + (nextX - x - 120) * k, 560, T.colors.primary, 3);
      }
      c.beginPath(); c.arc(x, 560, 55, 0, Math.PI * 2); c.fillStyle = T.colors.surface; c.fill();
      c.strokeStyle = T.colors.primary; c.lineWidth = 3; c.stroke();
      fit(String(i + 1).padStart(2, '0'), x, 560, 70, 35, T.colors.accent, V.MONO, 800, 'center');
      fit(label, x, 670, count > 2 ? 350 : 650, 32, T.colors.textPrimary, V.MONO, 600, 'center');
    });
    c.restore();
  }

  function presentation(scene, u, _t, style) {
    const T = V.T, c = ctx(), k = progress(u, style, 0.1);
    c.save(); c.globalAlpha *= k;
    rect(145, 165, 18, 90, T.colors.accent);
    fit(scene.kicker || 'BRIEFING', 190, 190, 1300, 26, T.colors.accent, face(style), 700);
    fit(titleOf(scene), 190, 325, 1470, 93, T.colors.textPrimary, face(style), 800);
    rule(190, 415, 1700, 415, T.colors.borderActive || T.colors.primary, 2);
    const list = scene.type === 'contrast' ? [scene.left, scene.right] : (scene.items || []);
    if (list.length) list.slice(0, 3).forEach((item, i) => {
      const x = 190 + i * 525;
      rect(x, 510, 460, 195, T.colors.surface, 12, T.colors.border);
      rect(x, 510, 460 * V.seg(u, 0.25 + i * 0.15, 0.9 + i * 0.15), 8, T.colors.accent);
      fit(itemText(item), x + 28, 590, 405, 40, T.colors.textPrimary, face(style), 700);
      para(item?.body, x + 28, 650, 405, 25, T.colors.textSecondary, face(style), 2);
    });
    else para(scene.body || scene.quote, 190, 555, 1430, 49, T.colors.textSecondary, face(style), 3);
    c.restore();
  }

  function game(scene, u, _t, style) {
    const T = V.T, c = ctx(), k = progress(u, style, 0.1);
    c.save(); c.globalAlpha *= k;
    rect(180, 170, 1560, 560, T.colors.surface, 0, T.colors.primary, 4);
    rect(180, 170, 1560, 65, T.colors.primary);
    fit(scene.kicker || 'MISSION 01', 215, 203, 1000, 32, T.colors.bg1, V.MONO, 900);
    fit(titleOf(scene), 245, 330, 1410, 72, T.colors.gold, V.MONO, 900);
    const list = points(scene);
    if (list.length) list.slice(0, 4).forEach((v, i) => {
      fit(`${i + 1}. ${v}`, 270, 440 + i * 70, 1280, 37, T.colors.textPrimary, V.MONO, 700);
    });
    else para(scene.body || scene.quote, 270, 465, 1320, 40, T.colors.textPrimary, V.MONO, 3);
    rect(245, 685, 1410, 15, T.colors.border);
    rect(245, 685, 1410 * V.seg(u, 0.2, 2.0), 15, T.colors.accent);
    c.restore();
  }

  function story(scene, u, t, style) {
    const T = V.T, c = ctx(), k = progress(u, style, 0.1);
    c.save(); c.globalAlpha *= k;
    const cx = 1390 + (1 - k) * 180, cy = 470 + Math.sin(t * 0.8) * 8;
    c.beginPath(); c.arc(cx, cy, 260, 0, Math.PI * 2); c.fillStyle = T.colors.surface; c.fill();
    c.beginPath(); c.arc(cx - 95, cy + 35, 104, 0, Math.PI * 2); c.fillStyle = T.colors.accent; c.fill();
    c.beginPath(); c.arc(cx + 88, cy - 60, 140, 0, Math.PI * 2); c.fillStyle = T.colors.primary; c.fill();
    c.beginPath(); c.arc(cx + 80, cy - 70, 55, 0, Math.PI * 2); c.fillStyle = T.colors.surface; c.fill();
    fit(scene.kicker || 'A STORY', 160, 225, 900, 28, T.colors.accent, face(style), 700);
    fit(titleOf(scene), 160, 345, 1100, 78, T.colors.textPrimary, face(style), 800);
    const list = points(scene);
    if (list.length) list.slice(0, 3).forEach((v, i) => {
      rect(165, 470 + i * 75, 20, 20, T.colors.accent, 10);
      fit(v, 210, 480 + i * 75, 900, 37, T.colors.textSecondary, face(style), 600);
    });
    else para(scene.body || scene.quote, 165, 490, 950, 40, T.colors.textSecondary, face(style), 3);
    c.restore();
  }

  function comic(scene, u, t, style) {
    const c = ctx(), k = progress(u, style, 0.06);
    const cast = style.characters?.cast || {};
    const lead = cast.lead || { actor: 'bright', name: '没头脑' };
    const foil = cast.foil || { actor: 'serious', name: '不高兴' };
    const inkColor = style.theme?.colors?.textPrimary || '#111111';
    const handwriting = '"Marker Felt", "Chalkboard SE", "Kaiti SC", "HanziPen SC", "STKaiti", "PingFang SC", sans-serif';
    const sans = '"PingFang SC", "Noto Sans CJK SC", sans-serif';
    const notes = scene.comic || {};
    const short = (value, limit = 35) => {
      const s = String(value || '').trim();
      return s.length > limit ? s.slice(0, limit - 1) + '…' : s;
    };
    function actor(role, x, y, scale, pose, emotion, speaking = false, delay = 0) {
      const p = progress(u, style, delay);
      c.save(); c.globalAlpha *= p;
      CharacterActors.draw(c, { actor: role.actor, x, y: y + (1 - p) * 75,
        scale, pose, emotion, speaking: notes.dialogue === true && speaking,
        render: style.characters?.render || 'vector', t, flip: role === foil && pose === 'point' });
      c.restore();
    }
    function speech(value, x, y, w, h, tailX, tailY, delay = 0) {
      if (!value) return;
      const p = progress(u, style, delay);
      c.save(); c.globalAlpha *= p;
      const phrase = short(value, 60);
      if (notes.dialogue !== true) {
        fit(phrase, x + w / 2, y + h / 2, w - 50, 40, inkColor, handwriting, 600, 'center');
        c.restore();
        return;
      }
      c.fillStyle = '#fff'; c.strokeStyle = inkColor; c.lineWidth = 4;
      c.beginPath(); c.roundRect(x, y, w, h, 28); c.fill(); c.stroke();
      const anchorX = Math.max(x + 45, Math.min(x + w - 45, tailX));
      c.beginPath(); c.moveTo(anchorX - 22, y + h - 1);
      c.lineTo(tailX, tailY); c.lineTo(anchorX + 20, y + h - 1);
      c.fill(); c.stroke();
      c.beginPath(); c.moveTo(anchorX - 16, y + h - 1);
      c.lineTo(anchorX + 15, y + h - 1); c.strokeStyle = '#fff'; c.lineWidth = 7; c.stroke();
      c.font = `600 38px ${handwriting}`;
      if (c.measureText(phrase).width <= w - 60) {
        fit(phrase, x + w / 2, y + h / 2, w - 60, 40, inkColor, handwriting, 600, 'center');
      } else {
        para(phrase, x + 30, y + 43, w - 60, 36, inkColor, handwriting, 2, 1.3);
      }
      c.restore();
    }
    c.save(); c.globalAlpha *= k;
    c.strokeStyle = inkColor; c.lineWidth = 3;
    c.strokeRect(32, 32, 1856, 870);
    rule(95, 225, 1825, 225, inkColor, 2);
    fit(scene.kicker || '漫画故事', 1770, 77, 420, 27, inkColor, handwriting, 600, 'right');
    fit(titleOf(scene), 100, 156, 1540, 72, inkColor, handwriting, 700);
    rule(100, 868, 1820, 868, inkColor, 2);
    c.restore();
    if (scene.type === 'contrast') {
      rule(960, 245, 960, 866, inkColor, 2);
      speech(notes.leadText || scene.left?.body || itemText(scene.left), 205, 284, 610, 132, 585, 540, 0.2);
      speech(notes.foilText || scene.right?.body || itemText(scene.right), 1100, 284, 610, 132, 1400, 540, 0.7);
      fit(itemText(scene.left) || lead.name, 245, 488, 360, 42, inkColor, handwriting, 700, 'left', progress(u, style, 0.25));
      fit(itemText(scene.right) || foil.name, 1680, 488, 360, 42, inkColor, handwriting, 700, 'right', progress(u, style, 0.75));
      actor(lead, 520, 856, 0.82, notes.leadPose || 'cheer', notes.leadEmotion || 'happy', u > 0.65 && u < 2.4, 0.1);
      actor(foil, 1410, 856, 0.82, notes.foilPose || 'fold', notes.foilEmotion || 'sad', u > 2.4, 0.6);
    } else if (scene.type === 'steps') {
      const items = (scene.items || []).slice(0, 3);
      items.forEach((item, i) => {
        const x = 118 + i * 565, role = i === 1 ? foil : lead;
        if (i) rule(x - 49, 250, x - 49, 866, inkColor, 2);
        fit(String(i + 1).padStart(2, '0'), x + 15, 302, 130, 54, inkColor, handwriting, 700, 'left', progress(u, style, 0.13 * i));
        fit(itemText(item), x + 5, 390, 485, 48, inkColor, handwriting, 700, 'left', progress(u, style, 0.13 * i));
        para(item?.body, x + 5, 460, 480, 29, inkColor, sans, 2);
        actor(role, x + 245, 851, 0.64, item?.pose || ['scratch', 'think', 'cheer'][i],
          item?.emotion || (i === 1 ? 'sad' : 'happy'), false, 0.18 * i);
      });
    } else if (scene.type === 'quote') {
      speech(notes.leadText || scene.quote || scene.body, 300, 265, 1300, 165, 680, 530, 0.15);
      if (scene.author) fit(`—— ${scene.author}`, 1560, 495, 860, 32, inkColor, handwriting, 600, 'right');
      actor(lead, 660, 856, 0.77, notes.leadPose || 'point', notes.leadEmotion || 'happy', true, 0.1);
      actor(foil, 1300, 856, 0.77, notes.foilPose || 'think', notes.foilEmotion || 'sad', false, 0.45);
    } else {
      speech(notes.leadText || scene.body || titleOf(scene), 770, 305, 810, 145, 665, 555, 0.15);
      actor(lead, 510, 856, 1.1, notes.leadPose || 'scratch',
        notes.leadEmotion || 'happy', true, 0.08);
      actor(foil, 1570, 856, 0.74, notes.foilPose || 'think', notes.foilEmotion || 'sad', false, 0.52);
      if (scene.items?.length) {
        fit(scene.items.slice(0, 3).map(itemText).join('   ·   '), 1100, 654, 700, 30,
          inkColor, handwriting, 600, 'center', progress(u, style, 0.48));
      }
    }
  }

  Object.assign(families, { cards, editorial, whiteboard, kinetic, blueprint, presentation, game, story, comic });
  return {
    families,
    register(name, fn) {
      if (!name || typeof fn !== 'function') throw new TypeError('Scene family requires a name and draw function');
      families[name] = fn;
    },
    draw(scene, u, t, style) {
      const family = style?.scene?.family;
      if (!families[family]) throw new Error(`Unknown scene family: ${family}`);
      families[family](scene || {}, u, t, style);
    }
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = SceneStyles;
