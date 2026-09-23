// video-maker CDP renderer. Zero npm deps (node built-in WebSocket).
// Usage:
//   node render.mjs <project-dir> snaps [--snaps 1.5,8,20]   -> keyframe PNGs to <dir>/out/snaps/
//   node render.mjs <project-dir> video [--fps 30]           -> full render -> <dir>/out/video.mp4
// DUR is parsed from <dir>/demo.js (`const DUR = <n>`).

import { spawn, execSync } from 'node:child_process';
import { mkdirSync, createWriteStream, readFileSync, existsSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir, homedir, platform } from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import net from 'node:net';

/**
 * Locate Chrome / Chromium binary across different platforms.
 */
export function findChrome() {
  if (process.env.VM_CHROME && existsSync(process.env.VM_CHROME)) {
    return process.env.VM_CHROME;
  }

  const osPlatform = platform();

  // Try standard PATH lookup
  const candidatesInPath = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'chrome'];
  for (const bin of candidatesInPath) {
    try {
      const checkCmd = osPlatform === 'win32' ? `where ${bin}` : `which ${bin}`;
      const found = execSync(checkCmd, { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim().split('\n')[0];
      if (found && existsSync(found)) return found;
    } catch {}
  }

  // OS-specific typical locations
  const osCandidates = [];
  if (osPlatform === 'darwin') {
    osCandidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      join(homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
      join(homedir(), 'Applications/Chromium.app/Contents/MacOS/Chromium'),
    );
  } else if (osPlatform === 'win32') {
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const localAppData = process.env['LOCALAPPDATA'] || join(homedir(), 'AppData', 'Local');
    osCandidates.push(
      join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    );
  } else {
    // Linux / other
    osCandidates.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
      '/opt/meta-chromium/chrome',
    );
  }

  for (const candidate of osCandidates) {
    if (existsSync(candidate)) return candidate;
  }

  return null;
}

function parseCliArgs(rawArgs) {
  const flags = {};
  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg.startsWith('--')) {
      const equalIndex = arg.indexOf('=');
      if (equalIndex !== -1) {
        flags[arg.slice(2, equalIndex)] = arg.slice(equalIndex + 1);
      } else {
        const next = rawArgs[i + 1];
        if (next && !next.startsWith('--')) {
          flags[arg.slice(2)] = next;
          i++;
        } else {
          flags[arg.slice(2)] = true;
        }
      }
    }
  }
  return flags;
}

function getAvailablePort(preferredPort = 9222) {
  return new Promise((res) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => {
      const freeServer = net.createServer();
      freeServer.unref();
      freeServer.listen(0, '127.0.0.1', () => {
        const port = freeServer.address().port;
        freeServer.close(() => res(port));
      });
    });
    server.listen(preferredPort, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => res(port));
    });
  });
}

export async function run() {
  const rawDir = process.argv[2];
  if (!rawDir) {
    console.error('usage: node render.mjs <project-dir> snaps|video [--snaps t1,t2..] [--fps 30]');
    process.exit(1);
  }

  const DIR = resolve(rawDir);
const demoPath = join(DIR, 'demo.js');
const indexPath = join(DIR, 'index.html');
if (!existsSync(demoPath) || !existsSync(indexPath)) {
  console.error('usage: node render.mjs <project-dir> snaps|video [--snaps t1,t2..] [--fps 30]');
  console.error(`Error: demo.js or index.html not found in "${DIR}"`);
  process.exit(1);
}

const MODE = process.argv[3] || 'snaps';
const args = parseCliArgs(process.argv.slice(4));

const src = readFileSync(demoPath, 'utf8');
const DUR = parseFloat((src.match(/const\s+DUR\s*=\s*([\d.]+)/) || [])[1]);
if (!DUR) {
  console.error('FATAL: cannot parse `const DUR = <n>` from demo.js');
  process.exit(1);
}
const FPS = parseInt(args.fps || '30', 10);
const SNAP_TIMES = args.snaps
  ? args.snaps.split(',').map(Number)
  : Array.from({ length: 16 }, (_, i) => +((i + 0.5) * DUR / 16).toFixed(1));

let ws = null;
let msgId = 0;
const pending = new Map();

function send(method, params = {}) {
  return new Promise((res, rej) => {
    const id = ++msgId;
    pending.set(id, { resolve: res, reject: rej });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function main() {
  const CHROME = findChrome();
  if (!CHROME) {
    throw new Error(
      'Chrome / Chromium executable not found.\n' +
      'Please install Google Chrome or Chromium, or set the VM_CHROME environment variable.\n' +
      'Example: export VM_CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"'
    );
  }

  const PORT = process.env.VM_PORT ? parseInt(process.env.VM_PORT, 10) : await getAvailablePort(9222);
  const profile = join(tmpdir(), `vm-chrome-${process.pid}-${Date.now()}`);

  let chrome = null;

  const cleanup = () => {
    if (ws && ws.readyState === 1 /* OPEN */) {
      try { ws.close(); } catch {}
    }
    if (chrome && !chrome.killed) {
      try { chrome.kill(); } catch {}
    }
    try {
      if (existsSync(profile)) {
        rmSync(profile, { recursive: true, force: true });
      }
    } catch {}
  };

  process.once('SIGINT', () => { cleanup(); process.exit(130); });
  process.once('SIGTERM', () => { cleanup(); process.exit(143); });

  try {
    chrome = spawn(CHROME, [
      '--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
      '--window-size=1920,1080', '--force-device-scale-factor=1',
      `--user-data-dir=${profile}`,
      `--remote-debugging-port=${PORT}`,
      '--remote-allow-origins=*',
      'about:blank',
    ], { stdio: 'ignore' });

    // wait for the DevTools endpoint (cold starts can be slow)
    let list = null;
    for (let i = 0; i < 60; i++) {
      try {
        list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
        break;
      } catch {
        await sleep(500);
      }
    }
    if (!list) throw new Error(`chrome DevTools endpoint never came up on :${PORT}`);
    const page = list.find(t => t.type === 'page');
    if (!page) throw new Error('no debuggable page found');

    ws = new WebSocket(page.webSocketDebuggerUrl);
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) {
        const { resolve: res, reject: rej } = pending.get(m.id);
        pending.delete(m.id);
        m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
      }
    };
    await new Promise(r => ws.onopen = r);
    await send('Page.enable');
    await send('Runtime.enable');

    const targetUrl = pathToFileURL(indexPath).href + '?render=1';
    await send('Page.navigate', { url: targetUrl });

    for (let i = 0; i < 100; i++) {
      const r = await send('Runtime.evaluate', { expression: 'window.__ready === true' });
      if (r.result && r.result.value) break;
      await sleep(200);
    }

    const shot = async (t) => {
      await send('Runtime.evaluate', { expression: `window.__frame(${t})` });
      await sleep(15);
      const r = await send('Page.captureScreenshot', {
        format: 'png',
        clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 1 },
      });
      return Buffer.from(r.data, 'base64');
    };

    if (MODE === 'snaps') {
      const snapsDir = join(DIR, 'out', 'snaps');
      mkdirSync(snapsDir, { recursive: true });
      for (const t of SNAP_TIMES) {
        const png = await shot(t);
        const p = join(snapsDir, `snap_${t.toFixed(1)}.png`);
        createWriteStream(p).end(png);
        console.log('snap', t, '->', p);
      }
    } else if (MODE === 'video') {
      const outDir = join(DIR, 'out');
      mkdirSync(outDir, { recursive: true });
      const videoPath = join(outDir, 'video.mp4');
      const ff = spawn('ffmpeg', [
        '-y', '-hide_banner', '-loglevel', 'error',
        '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium',
        videoPath,
      ], { stdio: ['pipe', 'inherit', 'inherit'] });

      ff.on('error', (err) => {
        throw new Error(`Failed to start ffmpeg: ${err.message}. Is ffmpeg installed and in PATH?`);
      });

      const total = Math.round(DUR * FPS);
      for (let f = 0; f < total; f++) {
        const png = await shot(f / FPS);
        if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
        if (f % 120 === 0) console.log(`frame ${f}/${total}`);
      }
      ff.stdin.end();
      const ffCode = await new Promise(r => ff.on('close', r));
      if (ffCode !== 0) throw new Error(`ffmpeg exited with code ${ffCode}`);
      console.log('video done ->', videoPath);
    } else {
      throw new Error('unknown mode: ' + MODE);
    }
  } finally {
    cleanup();
  }
}

  await main();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  run().catch(e => {
    console.error('FATAL', e);
    process.exit(1);
  });
}
