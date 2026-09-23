// video-maker CDP renderer. Zero npm deps (node built-in WebSocket).
// Usage:
//   node render.mjs <project-dir> snaps [--snaps 1.5,8,20]   -> keyframe PNGs to <dir>/out/snaps/
//   node render.mjs <project-dir> video [--fps 30]           -> full render -> <dir>/out/video.mp4
// DUR is parsed from <dir>/demo.js (`const DUR = <n>`).
import { spawn } from 'node:child_process';
import { mkdirSync, createWriteStream, readFileSync, existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = process.env.VM_CHROME || '/opt/meta-chromium/chrome';
const DIR = process.argv[2];
if (!DIR || !existsSync(DIR + '/demo.js') || !existsSync(DIR + '/index.html')) {
  console.error('usage: node render.mjs <project-dir> snaps|video [--snaps t1,t2..] [--fps 30]');
  process.exit(1);
}
const MODE = process.argv[3] || 'snaps';
const args = Object.fromEntries(
  process.argv.slice(4).flatMap((a, i, arr) => a.startsWith('--') ? [[a.slice(2), arr[i + 1]]] : [])
);
const src = readFileSync(DIR + '/demo.js', 'utf8');
const DUR = parseFloat((src.match(/const\s+DUR\s*=\s*([\d.]+)/) || [])[1]);
if (!DUR) { console.error('FATAL: cannot parse `const DUR = <n>` from demo.js'); process.exit(1); }
const FPS = parseInt(args.fps || '30', 10);
const SNAP_TIMES = args.snaps ? args.snaps.split(',').map(Number)
  : Array.from({ length: 16 }, (_, i) => +((i + 0.5) * DUR / 16).toFixed(1));

let ws, msgId = 0;
const pending = new Map();
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  const profile = '/tmp/vm-chrome-' + process.pid;
  const chrome = spawn(CHROME, [
    '--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    '--window-size=1920,1080', '--force-device-scale-factor=1',
    `--user-data-dir=${profile}`,
    '--remote-debugging-port=9222', '--remote-allow-origins=*', 'about:blank',
  ], { stdio: 'ignore' });

  // wait for the DevTools endpoint (cold starts can be slow)
  let list = null;
  for (let i = 0; i < 60; i++) {
    try {
      list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
      break;
    } catch { await sleep(500); }
  }
  if (!list) throw new Error('chrome DevTools endpoint never came up on :9222');
  const page = list.find(t => t.type === 'page');
  if (!page) throw new Error('no debuggable page found');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id); pending.delete(m.id);
      m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
    }
  };
  await new Promise(r => ws.onopen = r);
  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: 'file://' + DIR.replace(/\/$/, '') + '/index.html?render=1' });
  for (let i = 0; i < 100; i++) {
    const r = await send('Runtime.evaluate', { expression: 'window.__ready === true' });
    if (r.result.value) break;
    await sleep(200);
  }
  const shot = async (t) => {
    await send('Runtime.evaluate', { expression: `window.__frame(${t})` });
    await sleep(15);
    const r = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 1 } });
    return Buffer.from(r.data, 'base64');
  };

  if (MODE === 'snaps') {
    mkdirSync(DIR + '/out/snaps', { recursive: true });
    for (const t of SNAP_TIMES) {
      const png = await shot(t);
      const p = `${DIR}/out/snaps/snap_${t.toFixed(1)}.png`;
      createWriteStream(p).end(png);
      console.log('snap', t, '->', p);
    }
  } else if (MODE === 'video') {
    mkdirSync(DIR + '/out', { recursive: true });
    const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium',
      `${DIR}/out/video.mp4`], { stdio: ['pipe', 'inherit', 'inherit'] });
    const total = Math.round(DUR * FPS);
    for (let f = 0; f < total; f++) {
      const png = await shot(f / FPS);
      if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 120 === 0) console.log(`frame ${f}/${total}`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    console.log('video done ->', DIR + '/out/video.mp4');
  } else {
    throw new Error('unknown mode: ' + MODE);
  }
  ws.close(); chrome.kill();
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
