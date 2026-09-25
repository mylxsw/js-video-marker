// Scaffold a new video-maker project.
// Usage: node new-video.mjs <target-dir> --title "标题" [--style editorial_ink] [--dur 44]

import { mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStyle } from './style-config.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE); // skill root

function parseArgs(rawArgs) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < rawArgs.length; i++) {
    const a = rawArgs[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq !== -1) {
        flags[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const next = rawArgs[i + 1];
        if (next && !next.startsWith('--')) {
          flags[a.slice(2)] = next;
          i++;
        } else {
          flags[a.slice(2)] = true;
        }
      }
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

const { flags, positional } = parseArgs(process.argv.slice(2));
const target = positional[0];

if (!target) {
  console.error('usage: node new-video.mjs <target-dir> --title "标题" [--style minimal_dark] [--dur 44]');
  process.exit(1);
}

const dir = resolve(target);
const title = flags.title || '未命名视频';
const styleId = flags.style || flags.theme; // --theme remains an alias for old callers
if (!styleId) {
  console.error('Choose a style with --style <id>. Run: node bin/style-config.mjs list');
  process.exit(1);
}
const style = structuredClone(loadStyle(styleId));
const dur = flags.dur || '44';
if (flags.genre) style.audio = { source: 'generated', genre: flags.genre, bpm: style.audio.bpm };

for (const d of [dir, join(dir, 'audio'), join(dir, 'out'), join(dir, 'lib')]) {
  mkdirSync(d, { recursive: true });
}

// Copy the shared runtime. New projects own their style.js and semantic scenes.
copyFileSync(join(ROOT, 'lib', 'themes.js'), join(dir, 'lib', 'themes.js'));
copyFileSync(join(ROOT, 'lib', 'anim.js'), join(dir, 'lib', 'anim.js'));
copyFileSync(join(ROOT, 'lib', 'characters.js'), join(dir, 'lib', 'characters.js'));
copyFileSync(join(ROOT, 'lib', 'scenes.js'), join(dir, 'lib', 'scenes.js'));
if (style.characters?.render === 'sprite') {
  const assetDir = join(dir, 'assets', 'comic-duo');
  mkdirSync(assetDir, { recursive: true });
  copyFileSync(join(ROOT, 'assets', 'comic-duo', 'pose-sheet.png'), join(assetDir, 'pose-sheet.png'));
}
writeFileSync(join(dir, 'style.js'), `const VIDEO_STYLE = ${JSON.stringify(style, null, 2)};\nif (typeof module !== 'undefined' && module.exports) module.exports = VIDEO_STYLE;\n`);

const htmlTitle = title.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const fill = (p) => readFileSync(join(ROOT, 'templates', p), 'utf8')
  .replaceAll('{{TITLE}}', p === 'index.html' ? htmlTitle : title)
  .replaceAll('{{TITLE_JSON}}', JSON.stringify(title))
  .replaceAll('{{STYLE}}', styleId)
  .replaceAll('{{DUR}}', String(dur));

writeFileSync(join(dir, 'index.html'), fill('index.html'));
writeFileSync(join(dir, 'demo.js'), fill('demo.js'));
if (!existsSync(join(dir, 'STORYBOARD.md'))) {
  writeFileSync(join(dir, 'STORYBOARD.md'), fill('storyboard.md'));
}

if (!existsSync(join(dir, 'script.txt'))) {
  writeFileSync(join(dir, 'script.txt'),
    '# 每行一段解说词，格式 n1: 文本（# 开头为注释）\n# 语言按本片要求，配音后按实际语速制作逐句字幕\nn1: 第一段解说词。\nn2: 第二段解说词。\n');
}

// Build checklist
writeFileSync(join(dir, 'BUILD.md'),
`# ${title} · 构建清单

## 基础信息
- 视频风格包: \`${styleId}\`（可在 style.js 独立调整画面、动效、字幕、音乐）
- 当前脚手架: Canvas 2D；若分镜选择 Remotion、p5.js 或 Three.js，先做项目专用短段原型，不把本目录的 Canvas 命令当作新技术导出器
- 配乐风格预设: \`${style.audio.genre || style.audio.path}\`
- 视频时长预设: ${dur}s
- Skill 路径: \`${ROOT}\`

## 构建步骤
- [ ] 1. 确认画面、配音、字幕语言及音色；按 "${ROOT}/references/creative-production.md" 为各幕选择画面方法和制作技术；写 script.txt 口语化解说词（数字/缩写按读音写）
- [ ] 2. 分段 TTS → audio/n1..nN.mp3 并测量时长：
       python3 "${ROOT}/bin/tts.py" --text "第一句。" --out audio/n1.mp3
       ffprobe -v error -show_entries format=duration -of csv=p=0 audio/n1.mp3
- [ ] 3. 由实测时长锁定 DUR/BEATS；再按最终配音的词/句时间戳制作逐句 SUBS（语言按本片要求）
- [ ] 4. 逐幕填写 STORYBOARD.md：旁白原句、要传达的意思、画面方法及技术理由、语音触发的变化、人物与物件的关系、画面短标签、避免误导的内容；Canvas 路径再写 demo.js 的 SCENES；新技术先做短段原型并验证预览、静帧、导出
- [ ] 5. 程序化配乐：
       node "${ROOT}/bin/make-style-music.mjs" . --dur DUR --bounds 0,b1,b2,...,DUR
- [ ] 6. 混音：
       node "${ROOT}/bin/make-style-mix.mjs" . --offsets o1,o2,... --dur DUR
- [ ] 7. 分镜预览与交互修改：对照 STORYBOARD.md 核对意思；抽查每幕进入、关键词、结束、最长字幕与快切处（生成前确认）。以下命令仅适用于 Canvas 路径：
       node "${ROOT}/bin/render.mjs" . storyboard
       # 或直接运行: ./run.sh storyboard
       # 快速生成 out/storyboard/ 各幕分镜效果图，确认视觉与排版满意
- [ ] 8. 全量渲染（确认分镜满意后再执行；以下命令仅适用于 Canvas 路径）：
       node "${ROOT}/bin/render.mjs" . video
- [ ] 9. 合成：
       ffmpeg -y -i out/video.mp4 -i audio/mix.wav -c:v copy -c:a aac -b:a 160k out/final.mp4

> 快捷方式：您也可以使用当前目录下的 \`./run.sh <storyboard|snaps|video|mux>\` 快速执行各阶段。
`);

// Convenience helper script
const runScriptPath = join(dir, 'run.sh');
writeFileSync(runScriptPath, `#!/usr/bin/env bash
set -e
DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
SKILL_ROOT="${ROOT}"

case "\$1" in
  storyboard)
    node "\${SKILL_ROOT}/bin/render.mjs" "\${DIR}" storyboard "\${@:2}"
    ;;
  snaps)
    node "\${SKILL_ROOT}/bin/render.mjs" "\${DIR}" snaps "\${@:2}"
    ;;
  video)
    node "\${SKILL_ROOT}/bin/render.mjs" "\${DIR}" video "\${@:2}"
    ;;
  music)
    node "\${SKILL_ROOT}/bin/make-style-music.mjs" "\${DIR}" "\${@:2}"
    ;;
  mix)
    node "\${SKILL_ROOT}/bin/make-style-mix.mjs" "\${DIR}" "\${@:2}"
    ;;
  mux)
    ffmpeg -y -i "\${DIR}/out/video.mp4" -i "\${DIR}/audio/mix.wav" -c:v copy -c:a aac -b:a 160k "\${DIR}/out/final.mp4"
    echo "Synthesized -> \${DIR}/out/final.mp4"
    ;;
  *)
    echo "Usage: ./run.sh <storyboard|snaps|video|music|mix|mux> [args...]"
    exit 1
    ;;
esac
`);

try {
  chmodSync(runScriptPath, 0o755);
} catch {}

console.log('scaffolded', dir, `(style: ${styleId}, scene: ${style.scene.family}, music: ${style.audio.genre || style.audio.path})`);
console.log('next: edit script.txt, then follow SKILL.md or BUILD.md');
