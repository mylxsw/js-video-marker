import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { listStyles, loadStyle, loadProjectStyle } from '../bin/style-config.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);

test('style packages expose independent scene, caption, motion, and audio choices', () => {
  const styles = listStyles();
  assert.equal(styles.length, 9);
  assert.equal(new Set(styles.map(s => s.scene.family)).size, 9);
  assert.ok(styles.every(s => s.captions.colors.length >= 2 && s.motion.enterSeconds > 0 && s.audio.source));
  assert.notEqual(loadStyle('kinetic_type').scene.family, loadStyle('editorial_ink').scene.family);
});

test('new project owns its style; title and browser scripts are safe to load', () => {
  const dir = mkdtempSync(join(tmpdir(), 'video-maker-style-'));
  try {
    const title = `A 'new' idea <works>`;
    const result = spawnSync(process.execPath, [join(ROOT, 'bin', 'new-video.mjs'), dir,
      '--title', title, '--style', 'editorial_ink', '--dur', '18'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const original = loadStyle('editorial_ink');
    const project = loadProjectStyle(dir);
    assert.equal(project.id, original.id);
    assert.match(readFileSync(join(dir, 'index.html'), 'utf8'), /&lt;works&gt;/);
    assert.match(readFileSync(join(dir, 'demo.js'), 'utf8'), /SceneStyles\.draw/);
    assert.equal(spawnSync(process.execPath, ['--check', join(dir, 'demo.js')]).status, 0);
    assert.match(readFileSync(join(dir, 'index.html'), 'utf8'), /lib\/scenes\.js/);
    const path = join(dir, 'style.js');
    writeFileSync(path, readFileSync(path, 'utf8').replace('"genre": "minimal_piano"', '"genre": "ambient"'));
    assert.equal(loadProjectStyle(dir).audio.genre, 'ambient');
    assert.equal(loadStyle('editorial_ink').audio.genre, 'minimal_piano');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('custom themes inherit nested UI settings and scene families can be registered', () => {
  const Themes = require('../lib/themes.js');
  const SceneStyles = require('../lib/scenes.js');
  const theme = Themes.resolve({ extends: 'academic_paper', ui: { subtitles: { captionMaxWidth: 1500 } } });
  assert.equal(theme.ui.subtitles.captionMaxWidth, 1500);
  assert.equal(theme.ui.hudStyle, 'minimal');
  assert.equal(theme.ui.subtitles.textColor, '#0f172a');
  SceneStyles.register('sample_extension', () => {});
  assert.equal(typeof SceneStyles.families.sample_extension, 'function');
});

test('comic project loads reusable actors and keeps character, caption, and audio choices separate', () => {
  const dir = mkdtempSync(join(tmpdir(), 'video-maker-comic-'));
  try {
    const result = spawnSync(process.execPath, [join(ROOT, 'bin', 'new-video.mjs'), dir,
      '--title', '漫画故事', '--style', 'comic_duo', '--dur', '18'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const style = loadProjectStyle(dir);
    assert.equal(style.scene.family, 'comic');
    assert.equal(style.characters.cast.lead.name, '没头脑');
    assert.equal(style.audio.genre, 'comic_pluck');
    assert.ok(style.captions.colors[0]);
    assert.match(readFileSync(join(dir, 'index.html'), 'utf8'), /lib\/characters\.js/);
    assert.equal(style.characters.render, 'sprite');
    assert.ok(readFileSync(join(dir, 'assets', 'comic-duo', 'pose-sheet.png')).length > 100_000);
    assert.match(readFileSync(join(dir, 'STORYBOARD.md'), 'utf8'), /旁白原句/);
    assert.match(readFileSync(join(dir, 'STORYBOARD.md'), 'utf8'), /画面方法与技术理由/);
    assert.match(readFileSync(join(dir, 'BUILD.md'), 'utf8'), /references\/creative-production\.md/);
    const CharacterActors = require(join(dir, 'lib', 'characters.js'));
    assert.equal(typeof CharacterActors.actors.bright, 'function');
    assert.equal(typeof CharacterActors.actors.serious, 'function');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
