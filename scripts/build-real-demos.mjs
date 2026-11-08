import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import sharp from 'sharp';
import gifenc from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = gifenc;
const cache = '/private/tmp/form-real-demos';
const config = {
  'reverse-lunge': { start: 10, duration: 8, endOffset: 2, view: 'Bodyweight · side view' },
  'bodyweight-squat': { start: 13, duration: 8, view: 'Side view' },
  'dumbbell-bench-press': { start: 0, duration: 7, view: 'Side view' },
  'dumbbell-shoulder-press': { start: 0, duration: 8, view: 'Seated variation' },
  'seated-cable-row': { start: 0, duration: 8, view: 'Seated cable machine' },
  'goblet-squat': { start: 17, duration: 8, view: 'Kettlebell variation' },
  'glute-bridge': { start: 6, duration: 8, view: 'Side view' },
  'push-up': { start: 30, duration: 8, view: 'Side view' },
  plank: { start: 45, duration: 8, view: 'Forearm plank' },
  'step-up': { start: 32, duration: 9, view: 'Bodyweight step-up' },
};
const records = JSON.parse(await readFile(`${cache}/sources.json`));
for (const [slug, cfg] of Object.entries(config)) {
  const filters =
    'fps=12,scale=640:-2:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer';
  const result = spawnSync(
    ffmpeg.path,
    [
      '-y',
      '-ss',
      String(cfg.start),
      '-t',
      String(cfg.duration),
      '-i',
      `${cache}/${slug}.mp4`,
      '-filter_complex',
      filters,
      '-loop',
      '0',
      `public/exercises/${slug}.gif`,
    ],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) throw Error(result.stderr);
  for (const [suffix, offset] of [
    ['start', 0],
    ['end', cfg.endOffset ?? cfg.duration / 2],
  ]) {
    const r = spawnSync(
      ffmpeg.path,
      [
        '-y',
        '-ss',
        String(cfg.start + offset),
        '-i',
        `${cache}/${slug}.mp4`,
        '-vf',
        'scale=640:-2',
        '-frames:v',
        '1',
        `public/exercises/${slug}-${suffix}.jpg`,
      ],
      { encoding: 'utf8' },
    );
    if (r.status !== 0) throw Error(r.stderr);
  }
  Object.assign(records[slug], {
    kind: 'footage',
    view: cfg.view,
    changes: `Trimmed to ${cfg.duration} seconds, resized to 640px, converted to a silent looping GIF.`,
    ...cfg,
  });
  console.log('Built', slug);
}
const photos = {
  'dead-bug': 'Dead_Bug',
  'dumbbell-bent-over-row': 'Bent_Over_Two-Dumbbell_Row',
  'gentle-full-body-stretch': 'Overhead_Stretch',
  'brisk-walk-or-cycle': 'Walking_Treadmill',
};
const dataset = JSON.parse(await readFile('/private/tmp/form-free-exercises.json'));
for (const [slug, id] of Object.entries(photos)) {
  const item = dataset.find((x) => x.id === id);
  const encoder = GIFEncoder();
  for (let i = 0; i < 2; i++) {
    const source = `${cache}/${slug}-${i}.jpg`;
    const img = sharp(source)
      .resize(640, 430, { fit: 'contain', background: '#fff' })
      .flatten({ background: '#fff' });
    await img
      .clone()
      .jpeg()
      .toFile(`public/exercises/${slug}-${i ? 'end' : 'start'}.jpg`);
    const rgba = await img.ensureAlpha().raw().toBuffer();
    const palette = quantize(rgba, 128);
    encoder.writeFrame(applyPalette(rgba, palette), 640, 430, { palette, delay: 1600, repeat: 0 });
  }
  encoder.finish();
  await writeFile(`public/exercises/${slug}.gif`, encoder.bytes());
  records[slug] = {
    kind: 'poses',
    view:
      slug === 'dead-bug'
        ? 'Leg-only variation'
        : slug === 'brisk-walk-or-cycle'
          ? 'Treadmill walking example'
          : slug === 'gentle-full-body-stretch'
            ? 'Overhead stretch example'
            : 'Start and finish positions',
    source: `https://github.com/yuhonas/free-exercise-db/tree/main/exercises/${id}`,
    credit: 'Free Exercise DB contributors',
    license: 'Public domain / Unlicense',
    licenseUrl: 'https://unlicense.org/',
    changes: 'Two original photos resized and combined into a looping pose sequence.',
    images: item.images,
  };
  console.log('Built photo sequence', slug);
}
await writeFile('src/realExerciseMedia.json', JSON.stringify(records, null, 2) + '\n');
await writeFile('public/exercises/ATTRIBUTION.json', JSON.stringify(records, null, 2) + '\n');
