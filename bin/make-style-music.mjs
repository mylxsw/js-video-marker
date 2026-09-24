// Route project music through the selected style's audio configuration.
import { spawnSync } from 'node:child_process';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProjectStyle } from './style-config.mjs';
import { findPythonWithNumpy } from './python-env.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const project = resolve(process.argv[2] || '.');
const style = loadProjectStyle(project);
const rest = process.argv.slice(3);
const args = [join(ROOT, 'bin', 'make_music.py'), ...rest];
if (!rest.some(arg => arg === '--out' || arg.startsWith('--out='))) args.push('--out', join(project, 'audio', 'music.wav'));
if (style.audio.source === 'file') {
  const path = style.audio.path;
  args.push('--bgm', isAbsolute(path) ? path : join(project, path));
} else {
  args.push('--genre', style.audio.genre, '--bpm', String(style.audio.bpm || 82));
}
const python = findPythonWithNumpy();
if (!python) throw new Error('Music generation needs Python with numpy. Set VIDEO_MAKER_PYTHON to that interpreter.');
const result = spawnSync(python, args, { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
