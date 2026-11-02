import { spawnSync } from 'node:child_process';
import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [owner, repository] = (process.env.GITHUB_REPOSITORY || 'Kalyan1b/stride').split('/');
const base =
  repository.toLowerCase() === `${owner.toLowerCase()}.github.io` ? '/' : `/${repository}/`;
const result = spawnSync('npm', ['run', 'build'], {
  cwd: root,
  env: { ...process.env, VITE_BASE_PATH: base },
  stdio: 'inherit',
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
const index = await readFile(resolve(root, 'dist/index.html'), 'utf8');
if (!index.includes('Stride') || !index.includes(`${base}assets/`)) {
  throw new Error('Stride must build with the expected GitHub Pages asset path.');
}
if (process.argv.includes('--preview')) {
  const target = resolve(root, 'preview-site');
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  await cp(resolve(root, 'dist'), resolve(target, base.slice(1)), { recursive: true });
  console.log(`Serve preview-site/ and open ${base}`);
}
console.log(`Verified GitHub Pages build for ${owner}/${repository}, base path ${base}`);
