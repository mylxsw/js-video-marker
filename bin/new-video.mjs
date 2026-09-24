// Scaffold a new video-maker project.
// Usage: node new-video.mjs <target-dir> --title "标题" [--theme minimal_dark] [--dur 44]

import { mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  console.error('usage: node new-video.mjs <target-dir> --title "标题" [--theme minimal_dark] [--dur 44]');
  process.exit(1);
}

const dir = resolve(target);
const title = flags.title || '未命名视频';
const theme = flags.theme || 'minimal_dark';
const dur = flags.dur || '44';

const GENRE_MAP = {
  minimal_dark: 'lofi',
  tech_blueprint: 'tech_pulse',
  modern_business: 'ambient',
  academic_paper: 'minimal_piano',
  retro_rpg: 'chiptune',
};
const genre = flags.genre || GENRE_MAP[theme] || 'lofi';

for (const d of [dir, join(dir, 'audio'), join(dir, 'out'), join(dir, 'lib')]) {
  mkdirSync(d, { recursive: true });
}

// Copy runtime animation & themes libraries
copyFileSync(join(ROOT, 'lib', 'themes.js'), join(dir, 'lib', 'themes.js'));
copyFileSync(join(ROOT, 'lib', 'anim.js'), join(dir, 'lib', 'anim.js'));

const fill = (p) => readFileSync(join(ROOT, 'templates', p), 'utf8')
  .replaceAll('{{TITLE}}', title)
  .replaceAll('{{THEME}}', theme)
  .replaceAll('{{GENRE}}', genre)
  .replaceAll('{{DUR}}', String(dur));

writeFileSync(join(dir, 'index.html'), fill('index.html'));
writeFileSync(join(dir, 'demo.js'), fill('demo.js'));

if (!existsSync(join(dir, 'script.txt'))) {
  writeFileSync(join(dir, 'script.txt'),
    '# 每行一句解说词，格式 n1: 文本（# 开头为注释）\n# 写完后按 SKILL.md 步骤 2 逐句 TTS\nn1: 第一句解说词。\nn2: 第二句解说词。\n');
}

// Build checklist
writeFileSync(join(dir, 'BUILD.md'),
`# ${title} · 构建清单

## 基础信息
- 视频主题风格: \`${theme}\`
- 配乐风格预设: \`${genre}\`
- 视频时长预设: ${dur}s
- Skill 路径: \`${ROOT}\`

## 构建步骤
- [ ] 1. 写 script.txt 解说词（4–8 句，口语化，数字/缩写按读音写）
- [ ] 2. 逐句 TTS → audio/n1..nN.mp3 并测量时长：
       python3 "${ROOT}/bin/tts.py" --text "第一句。" --out audio/n1.mp3
       ffprobe -v error -show_entries format=duration -of csv=p=0 audio/n1.mp3
- [ ] 3. 由时长锁定时间轴：填 demo.js 的 DUR/BEATS/SUBS（见 SKILL.md 步骤 3 公式）
- [ ] 4. 写 beat 函数（V.* 组件，可使用 V.compareView, V.metricCard, V.stepList, V.quoteCard 等）
- [ ] 5. 程序化配乐：
       python3 "${ROOT}/bin/make_music.py" --dur DUR --bounds 0,b1,b2,...,DUR --genre ${genre} --out audio/music.wav
- [ ] 6. 混音：
       python3 "${ROOT}/bin/make_mix.py" --dir . --offsets o1,o2,... --dur DUR
- [ ] 7. 分镜关键帧预览与交互修改（强烈推荐！生成前确认）：
       node "${ROOT}/bin/render.mjs" . storyboard
       # 或直接运行: ./run.sh storyboard
       # 快速生成 out/storyboard/ 各幕分镜效果图，确认视觉与排版满意
- [ ] 8. 全量渲染（确认分镜满意后再执行）：
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
    python3 "\${SKILL_ROOT}/bin/make_music.py" --genre "${genre}" "\${@:2}"
    ;;
  mix)
    python3 "\${SKILL_ROOT}/bin/make_mix.py" --dir "\${DIR}" "\${@:2}"
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

console.log('scaffolded', dir, `(theme: ${theme}, music: ${genre})`);
console.log('next: edit script.txt, then follow SKILL.md or BUILD.md');
