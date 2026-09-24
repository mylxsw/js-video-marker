// Mix narration using the selected style's audio levels.
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProjectStyle } from './style-config.mjs';
import { findPythonWithNumpy } from './python-env.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const project = resolve(process.argv[2] || '.');
const style = loadProjectStyle(project);
const python = findPythonWithNumpy();
if (!python) throw new Error('Audio mixing needs Python with numpy. Set VIDEO_MAKER_PYTHON to that interpreter.');
const mix = style.audio.mix || {};
const args = [join(ROOT, 'bin', 'make_mix.py'), '--dir', project,
  '--music-level', String(mix.musicLevel ?? 0.9), '--duck-level', String(mix.duckLevel ?? 0.32),
  ...process.argv.slice(3)];
const result = spawnSync(python, args, { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
