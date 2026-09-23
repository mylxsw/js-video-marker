// Scaffold a new video-maker project.
// Usage: node new-video.mjs <target-dir> --title "标题" [--dur 44]
import { mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE); // skill root
const dir = resolve(process.argv[2] || '');
const args = Object.fromEntries(
  process.argv.slice(3).flatMap((a, i, arr) => a.startsWith('--') ? [[a.slice(2), arr[i + 1]]] : [])
);
if (!dir) { console.error('usage: node new-video.mjs <target-dir> --title "标题" [--dur 44]'); process.exit(1); }
const title = args.title || '未命名视频';
const dur = args.dur || '44';

for (const d of [dir, join(dir, 'audio'), join(dir, 'out'), join(dir, 'lib')]) mkdirSync(d, { recursive: true });
copyFileSync(join(ROOT, 'lib', 'anim.js'), join(dir, 'lib', 'anim.js'));

const fill = (p) => readFileSync(join(ROOT, 'templates', p), 'utf8')
  .replaceAll('{{TITLE}}', title).replaceAll('{{DUR}}', String(dur));
writeFileSync(join(dir, 'index.html'), fill('index.html'));
writeFileSync(join(dir, 'demo.js'), fill('demo.js'));
if (!existsSync(join(dir, 'script.txt'))) {
  writeFileSync(join(dir, 'script.txt'),
    '# 每行一句解说词，格式 n1: 文本（# 开头为注释）\n# 写完后按 SKILL.md 步骤 2 逐句 TTS\nn1: 第一句解说词。\nn2: 第二句解说词。\n');
}
writeFileSync(join(dir, 'BUILD.md'),
`# ${title} · 构建清单\n\n- [ ] 1. 写 script.txt 解说词（4–8 句，口语化，数字/缩写按读音写）\n- [ ] 2. 逐句 TTS → audio/n1..nN.mp3，ffprobe 测时长\n- [ ] 3. 由时长锁定时间轴：填 demo.js 的 DUR/BEATS/SUBS（见 SKILL.md 步骤 3 公式）\n- [ ] 4. 写 beat 函数（V.* 组件，参考 templates/demo.js）\n- [ ] 5. 程序化配乐：bin/make_music.py --dur DUR --bounds ...\n- [ ] 6. 混音：bin/make_mix.py --dir . --offsets ... --dur DUR\n- [ ] 7. 抽帧质检：bin/render.mjs . snaps，看图修 bug\n- [ ] 8. 全量渲染：bin/render.mjs . video\n- [ ] 9. 合成：ffmpeg -i out/video.mp4 -i audio/mix.wav -c:v copy -c:a aac out/final.mp4\n`);
console.log('scaffolded', dir);
console.log('next: edit script.txt, then follow SKILL.md');
