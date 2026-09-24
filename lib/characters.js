'use strict';
/* Reusable, time-driven ink characters for the comic style. Coordinates are
   local to a character's feet; draw() is deterministic for any timestamp. */
const CharacterActors = (() => {
  const actors = Object.create(null);
  const sprite = typeof Image === 'undefined' ? null : new Image();
  if (sprite) sprite.src = 'assets/comic-duo/pose-sheet.png';
  const spritePose = {
    bright: { neutral: 0, scratch: 0, run: 1, cheer: 2, point: 2, think: 3, glass: 3 },
    serious: { neutral: 0, fold: 0, point: 1, think: 2, scratch: 2, step: 3, cheer: 3 }
  };

  function ink(c, width = 5) {
    c.strokeStyle = '#111111'; c.fillStyle = '#ffffff'; c.lineWidth = width;
    c.lineCap = 'round'; c.lineJoin = 'round';
  }
  function line(c, ...p) {
    c.beginPath(); c.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]);
    c.stroke();
  }
  function oval(c, x, y, rx, ry, fill = '#ffffff') {
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fillStyle = fill; c.fill(); c.stroke();
  }
  function arm(c, side, pose, phase) {
    const s = side;
    c.beginPath();
    c.moveTo(s * 64, -203);
    if (pose === 'cheer') {
      c.bezierCurveTo(s * 102, -230, s * 116, -287 - phase * 7, s * 128, -343 - phase * 7);
    } else if (pose === 'scratch' && s > 0) {
      c.bezierCurveTo(116, -212, 143, -275, 106, -349);
    } else if (pose === 'point' && s > 0) {
      c.bezierCurveTo(107, -194, 141, -242, 174, -257);
    } else if (pose === 'think' && s > 0) {
      c.bezierCurveTo(115, -190, 120, -226, 72, -272);
    } else if (pose === 'fold') {
      c.bezierCurveTo(s * 105, -198, s * 87, -168, -s * 35, -166);
    } else {
      c.bezierCurveTo(s * 104, -180, s * 96, -144, s * 88, -120);
    }
    const end = pose === 'cheer' ? [s * 128, -343 - phase * 7]
      : pose === 'scratch' && s > 0 ? [106, -349]
      : pose === 'point' && s > 0 ? [174, -257]
      : pose === 'think' && s > 0 ? [72, -272]
      : pose === 'fold' ? [-s * 35, -166] : [s * 88, -120];
    // Two strokes form a white sleeve/arm with a black ink outline.
    c.strokeStyle = '#111'; c.lineWidth = 23; c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = 14; c.stroke();
    c.beginPath(); c.arc(end[0], end[1], 11, 0, Math.PI * 2);
    c.fillStyle = '#fff'; c.fill(); c.strokeStyle = '#111'; c.lineWidth = 4; c.stroke();
    ink(c, 5);
  }
  function body(c, pose, phase) {
    c.beginPath(); c.moveTo(-52, -219);
    c.bezierCurveTo(-80, -216, -85, -187, -78, -150);
    c.lineTo(-65, -97); c.quadraticCurveTo(0, -88, 66, -99);
    c.lineTo(79, -151); c.bezierCurveTo(88, -190, 72, -218, 52, -220);
    c.closePath(); c.fillStyle = '#fff'; c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-65, -98); c.lineTo(-73, -53); c.lineTo(-13, -52);
    c.lineTo(-2, -74); c.lineTo(10, -53); c.lineTo(72, -53); c.lineTo(65, -99);
    c.closePath(); c.fill(); c.stroke();
    line(c, -49, -51, -54, -11); line(c, -17, -50, -15, -9);
    line(c, 24, -50, 26, -10); line(c, 56, -53, 62, -10);
    oval(c, -36, -5, 38, 12, '#111'); oval(c, 45, -5, 39, 12, '#111');
    // Arms overlay the shirt but disappear behind the head, as in ink cartoons.
    arm(c, -1, pose, phase); arm(c, 1, pose, phase);
  }
  function head(c, kind, emotion, talking) {
    // Deliberately uneven silhouette and thick ink reproduce the reference's
    // hand-drawn proportions without embedding a fixed cutout image.
    c.beginPath(); c.moveTo(-89, -300);
    c.bezierCurveTo(-104, -355, -59, -395, 4, -400);
    c.bezierCurveTo(71, -402, 103, -365, 101, -311);
    c.bezierCurveTo(115, -260, 85, -217, 25, -207);
    c.bezierCurveTo(-38, -194, -91, -225, -96, -278);
    c.closePath(); c.fillStyle = '#fff'; c.fill(); c.stroke();
    oval(c, -95, -271, 16, 21); oval(c, 103, -274, 14, 21);
    if (kind === 'bright') {
      line(c, -57, -391, -64, -421); line(c, -25, -404, -19, -442);
      line(c, 8, -406, 23, -438);
      line(c, -46, -337, -41, -343); line(c, 40, -337, 46, -341);
    } else {
      c.beginPath(); c.moveTo(-91, -316);
      c.bezierCurveTo(-97, -368, -56, -408, 9, -406);
      c.bezierCurveTo(57, -403, 93, -369, 98, -314);
      c.lineTo(64, -367); c.lineTo(27, -338); c.lineTo(13, -364);
      c.lineTo(-25, -339); c.lineTo(-42, -360); c.lineTo(-75, -334);
      c.closePath(); c.fillStyle = '#111'; c.fill();
      line(c, -50, -332, -31, -326); line(c, 34, -337, 46, -345);
    }
    c.beginPath(); c.ellipse(-31, -296, 4.5, 7, -0.2, 0, Math.PI * 2);
    c.ellipse(37, -296, 4.5, 7, 0.2, 0, Math.PI * 2); c.fillStyle = '#111'; c.fill();
    c.beginPath(); c.moveTo(0, -282); c.quadraticCurveTo(8, -286, 10, -277); c.stroke();
    if (talking) {
      oval(c, 4, -251, 14, 17, '#fff');
    } else if (emotion === 'sad' || (kind === 'serious' && !emotion)) {
      c.beginPath(); c.moveTo(-14, -242); c.quadraticCurveTo(2, -258, 22, -244); c.stroke();
    } else if (emotion === 'surprised') {
      oval(c, 4, -247, 9, 12, '#fff');
    } else {
      c.beginPath(); c.moveTo(-19, -257); c.quadraticCurveTo(0, -220, 27, -255);
      c.closePath(); c.fillStyle = '#fff'; c.fill(); c.stroke();
    }
  }
  function basic(kind) {
    return (c, opts) => {
      const { x = 0, y = 0, scale = 1, pose = 'neutral', emotion, t = 0, speaking = false, flip = false } = opts;
      if (opts.render === 'sprite' && !speaking && sprite?.complete && sprite.naturalWidth) {
        const col = spritePose[kind]?.[pose] ?? 0;
        const h = 550 * scale, w = h * 0.75;
        c.save(); c.translate(x, y); c.scale(flip ? -1 : 1, 1);
        c.drawImage(sprite, col * 384, kind === 'bright' ? 0 : 512,
          384, 512, -w / 2, -h, w, h);
        c.restore();
        return;
      }
      c.save(); c.translate(x, y);
      c.scale(flip ? -scale : scale, scale);
      ink(c, 5); body(c, pose, 0); head(c, kind, emotion, speaking);
      c.restore();
    };
  }
  actors.bright = basic('bright');
  actors.serious = basic('serious');
  return {
    actors,
    ready() { return !sprite || (sprite.complete && sprite.naturalWidth > 0); },
    register(name, draw) {
      if (!name || typeof draw !== 'function') throw new TypeError('Character requires a name and draw function');
      actors[name] = draw;
    },
    draw(c, opts) {
      const actor = actors[opts.actor];
      if (!actor) throw new Error(`Unknown character: ${opts.actor}`);
      actor(c, opts);
    }
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = CharacterActors;
