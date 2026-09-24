// video-maker CDP renderer. Zero npm deps (node built-in WebSocket).
// Usage:
//   node render.mjs <project-dir> storyboard                -> per-act keyframe preview to <dir>/out/storyboard/
//   node render.mjs <project-dir> snaps [--snaps 1.5,8,20]   -> custom timestamp PNGs to <dir>/out/snaps/
//   node render.mjs <project-dir> video [--fps 30]           -> full render -> <dir>/out/video.mp4
// DUR is parsed from <dir>/demo.js (`const DUR = <n>`).

import { spawn, execSync } from 'node:child_process';
import { mkdirSync, createWriteStream, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
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
  const profile = process.env.VM_PROFILE_DIR || join(DIR, `.chrome_profile_${process.pid}_${Date.now()}`);

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

    if (MODE === 'storyboard') {
      const sbDir = join(DIR, 'out', 'storyboard');
      mkdirSync(sbDir, { recursive: true });

      // Query page for BEATS and SUBS
      const evalRes = await send('Runtime.evaluate', {
        expression: `JSON.stringify({
          beats: window.__BEATS || [],
          subs: window.__SUBS || [],
          theme: (typeof V !== 'undefined' && V.theme) ? (V.theme.name || V.theme.id) : '',
          title: document.title || ''
        })`,
        returnByValue: true
      });

      let pageData = { beats: [], subs: [], theme: '', title: '' };
      try {
        if (evalRes.result && evalRes.result.value) {
          pageData = JSON.parse(evalRes.result.value);
        }
      } catch {}

      const beats = pageData.beats.length > 0 ? pageData.beats : [
        [0.0, DUR * 0.25],
        [DUR * 0.25, DUR * 0.5],
        [DUR * 0.5, DUR * 0.75],
        [DUR * 0.75, DUR]
      ];

      const manifest = {
        title: pageData.title,
        theme: pageData.theme,
        duration: DUR,
        acts: []
      };

      console.log(`\n=== 正在生成分镜效果图 (共 ${beats.length} 幕) ===`);

      for (let i = 0; i < beats.length; i++) {
        const [s, e] = beats[i];
        // Climax point: after entrance animation finishes, before exit fade
        const t = Math.max(s + 0.5, Math.min(e - 0.5, s + (e - s) * 0.65));
        const png = await shot(t);
        const fileName = `act_${i + 1}.png`;
        const filePath = join(sbDir, fileName);
        createWriteStream(filePath).end(png);

        // Find corresponding subtitle
        const sub = (pageData.subs || []).find(subItem => t >= subItem[0] && t < subItem[1]);
        const subText = sub ? sub[2] : '';

        manifest.acts.push({
          act: i + 1,
          time: +t.toFixed(2),
          start: s,
          end: e,
          file: fileName,
          path: filePath,
          subtitle: subText
        });

        console.log(`✓ 第 ${i + 1} 幕 [${s.toFixed(1)}s - ${e.toFixed(1)}s] @ t=${t.toFixed(1)}s -> ${filePath}`);
        if (subText) console.log(`  解说词: "${subText}"`);
      }

      // Write manifest.json
      writeFileSync(join(sbDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

      // Generate HTML gallery for preview
      const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>${manifest.title || '分镜预览'} · Storyboard</title>
<style>
  body { margin: 0; padding: 32px; background: #0b0f19; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", sans-serif; }
  h1 { font-size: 28px; margin-bottom: 8px; color: #f8fafc; }
  .meta { color: #94a3b8; font-size: 15px; margin-bottom: 32px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(540px, 1fr)); gap: 28px; }
  .card { background: #131a2b; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
  .card img { width: 100%; aspect-ratio: 16/9; display: block; object-fit: cover; }
  .card-body { padding: 18px 20px; }
  .act-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .act-title { font-weight: 700; font-size: 18px; color: #38bdf8; }
  .act-time { font-family: monospace; font-size: 14px; color: #94a3b8; background: rgba(255,255,255,0.06); padding: 4px 10px; border-radius: 6px; }
  .sub-text { font-size: 15px; line-height: 1.6; color: #cbd5e1; }
</style>
</head>
<body>
  <h1>${manifest.title || '分镜预览'}</h1>
  <div class="meta">风格主题: <strong>${manifest.theme || '默认'}</strong> ｜ 总时长: <strong>${DUR}s</strong> ｜ 共 <strong>${manifest.acts.length}</strong> 幕分镜</div>
  <div class="grid">
    ${manifest.acts.map(a => `
      <div class="card">
        <a href="${a.file}" target="_blank"><img src="${a.file}" alt="Act ${a.act}" /></a>
        <div class="card-body">
          <div class="act-header">
            <span class="act-title">第 ${a.act} 幕 (Act ${a.act})</span>
            <span class="act-time">${a.time}s [${a.start}s - ${a.end}s]</span>
          </div>
          <div class="sub-text"><strong>解说词:</strong> ${a.subtitle || '（无字幕）'}</div>
        </div>
      </div>
    `).join('')}
  </div>
</body>
</html>`;
      writeFileSync(join(sbDir, 'index.html'), htmlContent);
      console.log(`\n分镜预览网页已生成: ${join(sbDir, 'index.html')}`);
      console.log(`=========================================\n`);
    } else if (MODE === 'snaps') {
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
