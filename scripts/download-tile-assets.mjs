import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = resolve(root, 'public', 'tiles');
const licenseRoot = resolve(root, 'public', 'licenses');

const tiles = [
  ['elephant', '1f418', 'Elephant', 'elephant'],
  ['giraffe', '1f992', 'Giraffe', 'giraffe'],
  ['rabbit', '1f407', 'Rabbit', 'rabbit'],
  ['pig', '1f416', 'Pig', 'pig'],
  ['two_hump_camel', '1f42b', 'Two-hump camel', 'two-hump_camel'],
  ['kangaroo', '1f998', 'Kangaroo', 'kangaroo'],
  ['hedgehog', '1f994', 'Hedgehog', 'hedgehog'],
  ['skunk', '1f9a8', 'Skunk', 'skunk'],
  ['bat', '1f987', 'Bat', 'bat'],
  ['penguin', '1f427', 'Penguin', 'penguin'],
  ['owl', '1f989', 'Owl', 'owl'],
  ['duck', '1f986', 'Duck', 'duck'],
  ['flamingo', '1f9a9', 'Flamingo', 'flamingo'],
  ['peacock', '1f99a', 'Peacock', 'peacock'],
  ['parrot', '1f99c', 'Parrot', 'parrot'],
  ['turtle', '1f422', 'Turtle', 'turtle'],
  ['snake', '1f40d', 'Snake', 'snake'],
  ['sauropod', '1f995', 'Sauropod', 'sauropod'],
  ['dragon', '1f409', 'Dragon', 'dragon'],
  ['spouting_whale', '1f433', 'Spouting whale', 'spouting_whale'],
  ['fish', '1f41f', 'Fish', 'fish'],
  ['tropical_fish', '1f420', 'Tropical fish', 'tropical_fish'],
  ['blowfish', '1f421', 'Blowfish', 'blowfish'],
  ['octopus', '1f419', 'Octopus', 'octopus'],
  ['squid', '1f991', 'Squid', 'squid'],
  ['crab', '1f980', 'Crab', 'crab'],
  ['lobster', '1f99e', 'Lobster', 'lobster'],
  ['jellyfish', '1fabc', 'Jellyfish', 'jellyfish'],
  ['coral', '1fab8', 'Coral', 'coral'],
  ['oyster', '1f9aa', 'Oyster', 'oyster'],
  ['butterfly', '1f98b', 'Butterfly', 'butterfly'],
  ['honeybee', '1f41d', 'Honeybee', 'honeybee'],
  ['lady_beetle', '1f41e', 'Lady beetle', 'lady_beetle'],
  ['beetle', '1fab2', 'Beetle', 'beetle'],
  ['caterpillar', '1f41b', 'Bug', 'bug'],
  ['snail', '1f40c', 'Snail', 'snail'],
];

const revisions = {
  fluent: '1ffb34c752ecf5d402f04cfb4b392c77f57c54bc',
  noto: 'e20cbc2bbec1926686be9f9bee7d1d2cfa1fea0e',
  twemoji: 'b6b55fef1e8636b540a6d016a4729ca8cdf2e60b',
  openmoji: 'f9fc506a3f913be9897ab0181d611d4c910a4104',
};

const themes = [
  { id: 'fluent3d', repository: 'microsoft/fluentui-emoji', revision: revisions.fluent, extension: 'png', license: 'MIT' },
  { id: 'fluentflat', repository: 'microsoft/fluentui-emoji', revision: revisions.fluent, extension: 'svg', license: 'MIT' },
  { id: 'noto', repository: 'googlefonts/noto-emoji', revision: revisions.noto, extension: 'png', license: 'Apache-2.0' },
  { id: 'twemoji', repository: 'jdecked/twemoji', revision: revisions.twemoji, release: 'v17.0.3', extension: 'svg', license: 'CC-BY-4.0' },
  { id: 'openmoji', repository: 'hfg-gmuend/openmoji', revision: revisions.openmoji, release: '17.0.0', extension: 'svg', license: 'CC-BY-SA-4.0' },
];

const licenses = [
  { file: 'fluent-emoji-MIT.txt', repository: 'microsoft/fluentui-emoji', revision: revisions.fluent, path: 'LICENSE' },
  { file: 'noto-emoji-NOTICE.txt', repository: 'googlefonts/noto-emoji', revision: revisions.noto, path: '2D/svg/LICENSE' },
  { file: 'noto-emoji-Apache-2.0.txt', url: 'https://www.apache.org/licenses/LICENSE-2.0.txt' },
  { file: 'twemoji-CC-BY-4.0.txt', repository: 'jdecked/twemoji', revision: revisions.twemoji, path: 'LICENSE-GRAPHICS' },
  { file: 'openmoji-CC-BY-SA-4.0.txt', repository: 'hfg-gmuend/openmoji', revision: revisions.openmoji, path: 'LICENSE.txt' },
];

function rawUrl(repository, revision, path) {
  return `https://raw.githubusercontent.com/${repository}/${revision}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

function sourcePath(theme, [, codepoint, fluentName, fluentSlug]) {
  if (theme.id === 'fluent3d') return `assets/${fluentName}/3D/${fluentSlug}_3d.png`;
  if (theme.id === 'fluentflat') return `assets/${fluentName}/Flat/${fluentSlug}_flat.svg`;
  if (theme.id === 'noto') return `2D/png/128/emoji_u${codepoint}.png`;
  if (theme.id === 'twemoji') return `assets/svg/${codepoint}.svg`;
  return `color/svg/${codepoint.toUpperCase()}.svg`;
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function validateImage(bytes, extension, sourceUrl) {
  const isPng = bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isSvg = bytes.length > 50 && bytes.subarray(0, Math.min(bytes.length, 2048)).toString('utf8').includes('<svg');
  if ((extension === 'png' && !isPng) || (extension === 'svg' && !isSvg)) {
    throw new Error(`Invalid ${extension.toUpperCase()} response from ${sourceUrl}`);
  }
}

async function fetchBytes(sourceUrl) {
  const response = await fetch(sourceUrl, { headers: { 'User-Agent': 'openkawai-asset-fetcher/1.0' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${sourceUrl}`);
  return Buffer.from(await response.arrayBuffer());
}

async function downloadAsset(theme, tile) {
  const path = sourcePath(theme, tile);
  const sourceUrl = rawUrl(theme.repository, theme.revision, path);
  const bytes = await fetchBytes(sourceUrl);
  validateImage(bytes, theme.extension, sourceUrl);
  const relativePath = `${theme.id}/${tile[0]}.${theme.extension}`;
  const destination = resolve(outputRoot, relativePath);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
  return { theme: theme.id, kindId: tile[0], path: `tiles/${relativePath}`, sourcePath: path, sourceUrl, bytes: bytes.length, sha256: sha256(bytes) };
}

async function runPool(jobs, workerCount) {
  const results = new Array(jobs.length);
  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      const index = next++;
      results[index] = await jobs[index]();
      process.stdout.write('.');
    }
  }
  await Promise.all(Array.from({ length: workerCount }, worker));
  process.stdout.write('\n');
  return results;
}

await mkdir(licenseRoot, { recursive: true });
for (const license of licenses) {
  const sourceUrl = license.url ?? rawUrl(license.repository, license.revision, license.path);
  const bytes = await fetchBytes(sourceUrl);
  if (bytes.length < 500) throw new Error(`License response is unexpectedly short: ${sourceUrl}`);
  const text = bytes.toString('utf8').replace(/[ \t]+$/gm, '');
  await writeFile(resolve(licenseRoot, license.file), text, 'utf8');
}

const jobs = themes.flatMap((theme) => tiles.map((tile) => () => downloadAsset(theme, tile)));
const files = await runPool(jobs, 8);
const manifest = {
  schemaVersion: 1,
  generatedBy: 'scripts/download-tile-assets.mjs',
  tileCount: tiles.length,
  themeCount: themes.length,
  fileCount: files.length,
  themes,
  files,
};
await writeFile(resolve(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

// Verify the manifest was written as valid JSON before reporting success.
JSON.parse(await readFile(resolve(outputRoot, 'manifest.json'), 'utf8'));
console.log(`Downloaded ${files.length} tile images and ${licenses.length} license files.`);
