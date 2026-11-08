import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import sharp from 'sharp';
import { exerciseGuides, guideSlug } from '../src/exerciseData.js';
import { exerciseCoaching } from '../src/exerciseCoaching.js';
const catalog = JSON.parse(
  await readFile(new URL('../src/realExerciseMedia.json', import.meta.url)),
);
assert.deepEqual(
  catalog,
  JSON.parse(await readFile(new URL('../public/exercises/ATTRIBUTION.json', import.meta.url))),
);
for (const name of Object.keys(exerciseGuides)) {
  assert.ok(catalog[guideSlug(name)], `Missing local GIF: ${name}`);
  assert.ok(exerciseCoaching[name]?.every(Boolean), `Missing easier option/mistake: ${name}`);
}
for (const [slug, media] of Object.entries(catalog)) {
  assert.ok(media.credit && media.license && media.source.startsWith('https://'));
  const root = new URL(`../public/exercises/${slug}`, import.meta.url);
  const gif = await sharp(`${root.pathname}.gif`).metadata();
  assert.equal(gif.format, 'gif');
  assert.ok(gif.pages > 1, `Not animated: ${slug}`);
  for (const suffix of ['start', 'end'])
    assert.ok((await stat(`${root.pathname}-${suffix}.jpg`)).size > 0);
}
for (const name of [
  'Dumbbell Romanian deadlift',
  'Split squat',
  'Dumbbell lateral raise',
  'Dumbbell rear-delt fly',
  'Pike push-up',
  'Reverse lunge',
  'Bird dog',
  'Prone Y-T raise',
  'Standing calf raise',
])
  assert.equal(catalog[guideSlug(name)]?.kind, 'footage');
console.log(
  `PASS: ${Object.keys(catalog).length} licensed local GIFs, still frames, and coaching for every exercise.`,
);

for (const slug of ['bird-dog', 'prone-y-t-raise', 'standing-calf-raise']) {
  const path = new URL(`../public/exercises/${slug}.gif`, import.meta.url).pathname;
  assert.ok(
    (await sharp(path).metadata()).pages >= 20,
    'New guides must contain real movement, not two alternating photos',
  );
  assert.ok((await stat(path)).size < 2_000_000, 'New GIFs should remain lightweight');
  assert.equal(catalog[slug].positions.length, 2);
  assert.ok(catalog[slug].licenseEvidence && catalog[slug].sourceTitle);
}
