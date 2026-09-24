#!/usr/bin/env node
// video-maker environment doctor
// Checks Node, Chrome, Python, FFmpeg, and TTS capabilities.

import { execSync, spawnSync } from 'node:child_process';
import { platform } from 'node:os';
import { findChrome } from './render.mjs';
import { findPythonWithNumpy } from './python-env.mjs';
import { listStyles } from './style-config.mjs';

function ok(msg) { console.log(`  \x1b[32m✔\x1b[0m ${msg}`); }
function warn(msg) { console.log(`  \x1b[33m▲\x1b[0m ${msg}`); }
function fail(msg) { console.log(`  \x1b[31m✘\x1b[0m ${msg}`); }

console.log('--- video-maker 环境诊断 ---\n');

let allOk = true;

// 1. Node.js
const nodeVer = process.version;
const major = parseInt(nodeVer.slice(1).split('.')[0], 10);
if (major >= 18) {
  ok(`Node.js: ${nodeVer} (>= 18)`);
} else {
  fail(`Node.js: ${nodeVer} (需 >= 18)`);
  allOk = false;
}

// 2. Chrome / Chromium
try {
  const chromePath = findChrome();
  if (chromePath) {
    try {
      const ver = execSync(`"${chromePath}" --version`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      ok(`Chrome / Chromium: ${chromePath} (${ver})`);
    } catch {
      ok(`Chrome / Chromium: ${chromePath}`);
    }
  } else {
    fail('Chrome / Chromium 未找到。请安装 Chrome 或设置环境变量 VM_CHROME');
    allOk = false;
  }
} catch (e) {
  fail(`Chrome 检测失败: ${e.message}`);
  allOk = false;
}

// 3. FFmpeg & FFprobe
let hasFfmpeg = false;
try {
  const ffmpegVer = execSync('ffmpeg -version', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n')[0];
  ok(`FFmpeg: ${ffmpegVer}`);
  hasFfmpeg = true;
} catch {
  fail('FFmpeg 未找到。请通过包管理器安装 (macOS: brew install ffmpeg, Ubuntu/Debian: apt-get install ffmpeg)');
  allOk = false;
}

try {
  const ffprobeVer = execSync('ffprobe -version', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n')[0];
  ok(`FFprobe: ${ffprobeVer}`);
} catch {
  fail('FFprobe 未找到。请确保 ffmpeg 套件包含 ffprobe');
  allOk = false;
}

// 4. Python 3 & numpy (same interpreter selection as music generation)
const musicPython = findPythonWithNumpy();
if (musicPython) ok(`Python + numpy: ${musicPython}`);
else {
  fail('未找到带 numpy 的 Python。安装 numpy 后可设置 VIDEO_MAKER_PYTHON');
  allOk = false;
}

// 5. Style packages
try { ok(`视频风格包: ${listStyles().length} 套配置有效`); }
catch (e) { fail(`风格包无效: ${e.message}`); allOk = false; }

// 6. TTS 引擎检测
let ttsAvailable = false;
const fishKey = process.env.FISH_API_KEY || process.env.FISH_AUDIO_API_KEY;
if (fishKey) {
  const masked = fishKey.length > 8 ? `${fishKey.slice(0, 4)}...${fishKey.slice(-4)}` : '******';
  ok(`TTS 引擎: Fish Audio API (高质量 AI 语音，已配置 KEY: ${masked})`);
  ttsAvailable = true;
}

try {
  execSync('edge-tts --version', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  ok('TTS 引擎 (备用): edge-tts (微软神经网络语音，高质量)');
  ttsAvailable = true;
} catch {
  // check say on darwin
  if (platform() === 'darwin' && hasFfmpeg) {
    try {
      execSync('which say', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      ok('TTS 引擎 (备用): macOS say + ffmpeg (内置离线语音，如 Tingting)');
      ttsAvailable = true;
    } catch {}
  }
}

if (!ttsAvailable) {
  warn('未检测到开箱即用的 TTS 引擎。推荐配置环境变量 FISH_API_KEY 或安装 edge-tts: pip install edge-tts');
}

console.log('\n----------------------------');
if (allOk) {
  console.log('\x1b[32m所有核心依赖均已就绪，可以正常制作视频！\x1b[0m\n');
} else {
  console.log('\x1b[31m部分依赖缺失，请根据上方提示完成安装配置。\x1b[0m\n');
  process.exitCode = 1;
}
