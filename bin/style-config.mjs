// Style profiles are independent packages of visual, motion, caption, and audio choices.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const STYLES_DIR = join(ROOT, 'styles');
const AUDIO_GENRES = new Set(['chiptune', 'lofi', 'ambient', 'tech_pulse', 'minimal_piano', 'comic_pluck']);

export function validateStyle(style) {
  if (!style || typeof style !== 'object') throw new Error('Style must be an object');
  for (const key of ['id', 'name', 'design', 'theme', 'scene', 'motion', 'chrome', 'captions', 'audio']) {
    if (!style[key]) throw new Error(`Style ${style.id || '?'} is missing ${key}`);
  }
  if (!/^[a-z][a-z0-9_-]*$/.test(style.id)) throw new Error(`Invalid style id: ${style.id}`);
  if (typeof style.scene.family !== 'string') throw new Error(`Style ${style.id} needs scene.family`);
  if (style.chrome.hud && !['none', 'minimal', 'pill', 'retro'].includes(style.chrome.hud)) {
    throw new Error(`Style ${style.id} has invalid chrome.hud`);
  }
  if (!Array.isArray(style.captions.colors) || style.captions.colors.length < 2) {
    throw new Error(`Style ${style.id} needs two caption colors`);
  }
  if (style.audio.source === 'generated' && !AUDIO_GENRES.has(style.audio.genre)) {
    throw new Error(`Style ${style.id} has unsupported audio genre: ${style.audio.genre}`);
  }
  if (style.audio.source === 'file' && !style.audio.path) {
    throw new Error(`Style ${style.id} needs audio.path`);
  }
  if (!['generated', 'file'].includes(style.audio.source)) throw new Error(`Style ${style.id} has invalid audio.source`);
  for (const [key, value] of Object.entries(style.audio.mix || {})) {
    if (!['musicLevel', 'duckLevel'].includes(key) || typeof value !== 'number' || value < 0 || value > 1) {
      throw new Error(`Style ${style.id} has invalid audio.mix.${key}`);
    }
  }
  return style;
}

export function listStyles() {
  return readdirSync(STYLES_DIR).filter(name => name.endsWith('.json')).map(name => {
    const style = JSON.parse(readFileSync(join(STYLES_DIR, name), 'utf8'));
    return validateStyle(style);
  });
}

export function loadStyle(id) {
  if (!/^[a-z][a-z0-9_-]*$/.test(id)) throw new Error(`Invalid style id: ${id}`);
  const style = JSON.parse(readFileSync(join(STYLES_DIR, `${id}.json`), 'utf8'));
  if (style.id !== id) throw new Error(`Style filename/id mismatch: ${id}`);
  return validateStyle(style);
}

export function loadProjectStyle(projectDir) {
  const code = readFileSync(join(resolve(projectDir), 'style.js'), 'utf8');
  const context = vm.createContext({ module: { exports: {} } });
  vm.runInContext(`${code}\nmodule.exports || VIDEO_STYLE`, context, { filename: 'style.js', timeout: 1000 });
  return validateStyle(context.module.exports);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  if (command === 'list') {
    for (const s of listStyles()) console.log(`${s.id}\t${s.name}\t${s.scene.family}\t${s.audio.genre || s.audio.path}`);
  } else if (command === 'show') {
    console.log(JSON.stringify(loadStyle(process.argv[3]), null, 2));
  } else {
    console.error('usage: node bin/style-config.mjs list | show <style-id>');
    process.exitCode = 1;
  }
}
