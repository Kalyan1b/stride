// Rebuild shipped demonstrations from the attributed source catalog.
// Usage: node scripts/build-real-demos.mjs [exercise-slug]
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import gifenc from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = gifenc;
const root = new URL('../', import.meta.url);
const cache = join(tmpdir(), 'stride-demo-sources');
await mkdir(cache, { recursive: true });
const records = JSON.parse(await readFile(new URL('src/realExerciseMedia.json', root)));
const selected = process.argv[2];
const localSource = process.argv[3];
if (localSource && !selected) throw Error('A local source must be paired with an exercise slug.');
if (selected && !Object.hasOwn(records, selected))
  throw Error(`Unknown exercise slug: ${selected}`);
async function download(url, name) {
  const path = join(cache, name);
  try {
    await access(path);
  } catch {
    const response = await fetch(url);
    if (!response.ok) throw Error(`Source download failed: ${response.status} ${url}`);
    await writeFile(path, Buffer.from(await response.arrayBuffer()));
  }
  return path;
}
function run(args) {
  const result = spawnSync(ffmpeg.path, ['-y', ...args], { encoding: 'utf8' });
  if (result.status !== 0) throw Error(result.stderr);
}
for (const [slug, record] of Object.entries(records)) {
  if (selected && slug !== selected) continue;
  const output = (suffix) => new URL(`public/exercises/${slug}${suffix}`, root).pathname;
  if (record.kind === 'footage') {
    const source =
        localSource ||
        (record.videoType === 'youtube'
          ? (() => {
              throw Error(
                `Download the licensed original ${record.video} and pass its local MP4 path: node scripts/build-real-demos.mjs ${slug} /path/to/source.mp4`,
              );
            })()
          : await download(record.video, `${slug}.source`)),
      width = record.width || 640,
      fps = record.fps || 12;
    const segments = record.segments;
    const input = segments
      ? ['-i', source]
      : ['-ss', String(record.start), '-t', String(record.duration), '-i', source];
    const assembly = segments
      ? segments
          .map(
            (segment, i) =>
              `[0:v]trim=start=${segment.start}:duration=${segment.duration},setpts=PTS-STARTPTS[clip${i}]`,
          )
          .join(';') +
        ';' +
        segments.map((_, i) => `[clip${i}]`).join('') +
        `concat=n=${segments.length}:v=1:a=0,`
      : '';
    run([
      ...input,
      '-filter_complex',
      `${assembly}fps=${fps},scale=${width}:-2:flags=lanczos,setsar=1,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer`,
      '-loop',
      '0',
      output('.gif'),
    ]);
    for (const [suffix, offset] of [
      ['start', record.startOffset || 0],
      ['end', record.endOffset ?? record.duration / 2],
    ])
      run([
        '-ss',
        String(record.start + offset),
        '-i',
        source,
        '-vf',
        `scale=${width}:-2,setsar=1`,
        '-frames:v',
        '1',
        output(`-${suffix}.jpg`),
      ]);
  } else {
    const encoder = GIFEncoder();
    for (let i = 0; i < record.images.length; i++) {
      const url =
        record.imageUrls?.[i] ||
        `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${record.images[i]}`;
      const source = await download(url, `${slug}-${i}.jpg`);
      const img = sharp(source)
        .resize(640, 430, { fit: 'contain', background: '#fff' })
        .flatten({ background: '#fff' });
      if (i < 2)
        await img
          .clone()
          .jpeg()
          .toFile(output(`-${i ? 'end' : 'start'}.jpg`));
      const rgba = await img.ensureAlpha().raw().toBuffer(),
        palette = quantize(rgba, 128);
      encoder.writeFrame(applyPalette(rgba, palette), 640, 430, {
        palette,
        delay: 1600,
        repeat: 0,
      });
    }
    encoder.finish();
    await writeFile(output('.gif'), encoder.bytes());
  }
  console.log(`Built ${slug}`);
}
