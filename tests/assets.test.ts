import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import catalog from '../src/content/tile-catalog.json';
import { TILE_KINDS, tileKind } from '../src/content/tile-kinds';
import { LEVEL_KIND_COUNT } from '../src/content/layouts';
import {
  DEFAULT_TILE_THEME,
  TILE_THEMES,
  tileImageUrl,
  type TileThemeId,
} from '../src/content/tile-themes';

interface AssetManifest {
  readonly tileCount: number;
  readonly themeCount: number;
  readonly fileCount: number;
  readonly files: ReadonlyArray<{
    readonly theme: TileThemeId;
    readonly kindId: string;
    readonly path: string;
    readonly staticFallback?: boolean;
    readonly bytes: number;
    readonly sha256: string;
  }>;
}

const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url));
const manifest = JSON.parse(
  readFileSync(`${publicDirectory}tiles/manifest.json`, 'utf8'),
) as AssetManifest;

describe('bundled tile assets', () => {
  it('provides a larger, unique candidate pool with matching Unicode metadata', () => {
    expect(TILE_KINDS.length).toBeGreaterThan(LEVEL_KIND_COUNT);
    expect(new Set(TILE_KINDS.map(({ id }) => id)).size).toBe(TILE_KINDS.length);
    expect(new Set(catalog.map(({ codepoint }) => codepoint)).size).toBe(catalog.length);
    expect(TILE_KINDS.every((kind) => tileKind(kind.id) === kind)).toBe(true);
    for (const kind of catalog) {
      const codepoint = [...kind.glyph].map((part) => part.codePointAt(0)!.toString(16))
        .filter((part) => part !== 'fe0f').join('-');
      expect(kind.codepoint, kind.id).toBe(codepoint);
    }
  });

  it('excludes agreed pests and the near-identical camel variant while retaining allowed insects', () => {
    const ids = TILE_KINDS.map(({ id }) => id);
    for (const id of ['cockroach', 'mosquito', 'fly', 'ant', 'camel']) {
      expect(ids).not.toContain(id);
    }
    for (const id of ['two_hump_camel', 'butterfly', 'honeybee', 'lady_beetle', 'beetle', 'caterpillar', 'snail']) {
      expect(ids).toContain(id);
    }
  });

  it('keeps one representative per confusable group and omits audited cropped artwork', () => {
    const ids = new Set(TILE_KINDS.map(({ id }) => id));
    for (const group of [
      ['mouse', 'rat'], ['cow', 'ox', 'water_buffalo', 'bison'], ['ewe', 'ram'],
      ['cat', 'black_cat'], ['dog', 'service_dog', 'guide_dog', 'poodle'],
      ['bird', 'black_bird'], ['spouting_whale', 'whale'],
    ]) {
      expect(group.filter((id) => ids.has(id)), group.join(', ')).toHaveLength(1);
    }
    for (const id of [
      'chicken', 'boar', 'hatching_chick', 'baby_chick', 'front_facing_baby_chick',
      'deer', 'gorilla', 'rhinoceros', 'zebra', 'hedgehog', 'raccoon', 'moose',
    ]) {
      expect(ids.has(id), id).toBe(false);
    }
  });

  it('defines five complete themes with Fluent 3D as the default', () => {
    expect(TILE_THEMES.map(({ id }) => id)).toEqual([
      'fluent3d', 'fluentanimated', 'noto', 'twemoji', 'openmoji',
    ]);
    expect(DEFAULT_TILE_THEME).toBe('fluent3d');
    expect(manifest).toMatchObject({
      tileCount: TILE_KINDS.length,
      themeCount: TILE_THEMES.length,
      fileCount: TILE_KINDS.length * TILE_THEMES.length,
    });
    expect(readdirSync(`${publicDirectory}tiles`).filter((name) => name !== 'manifest.json').sort())
      .toEqual(TILE_THEMES.map(({ id }) => id).sort());
    for (const theme of TILE_THEMES) {
      expect(manifest.files.filter((file) => file.theme === theme.id)).toHaveLength(TILE_KINDS.length);
      expect(readdirSync(`${publicDirectory}tiles/${theme.id}`).sort()).toEqual(
        TILE_KINDS.map(({ id }) => `${id}.${theme.extension}`).sort(),
      );
    }
  });

  it('bundles real animated PNGs and the documented static fallbacks', () => {
    const animatedFiles = manifest.files.filter((file) => file.theme === 'fluentanimated');
    expect(animatedFiles.filter((file) => file.staticFallback).map((file) => file.kindId))
      .toEqual(catalog.filter((kind) => !kind.fluentAnimatedPath).map((kind) => kind.id));

    for (const file of animatedFiles) {
      const bytes = readFileSync(`${publicDirectory}${file.path}`);
      let frameCount = 0;
      for (let offset = 8; offset + 12 <= bytes.length;) {
        const length = bytes.readUInt32BE(offset);
        if (bytes.toString('ascii', offset + 4, offset + 8) === 'acTL') {
          frameCount = bytes.readUInt32BE(offset + 8);
          break;
        }
        offset += length + 12;
      }

      if (file.staticFallback) {
        expect(frameCount, file.kindId).toBe(0);
        expect(file.sha256).toBe(manifest.files.find(
          (source) => source.theme === 'fluent3d' && source.kindId === file.kindId,
        )?.sha256);
      } else {
        expect(frameCount, file.kindId).toBeGreaterThan(1);
      }
    }
  });

  it('packages every declared image with a valid signature and recorded hash', () => {
    const manifestPaths = new Set(manifest.files.map((file) => file.path));
    for (const theme of TILE_THEMES) {
      for (const kind of TILE_KINDS) {
        const relativePath = `tiles/${theme.id}/${kind.id}.${theme.extension}`;
        expect(manifestPaths.has(relativePath)).toBe(true);
        expect(tileImageUrl(kind.id, theme.id)).toMatch(
          new RegExp(`tiles/${theme.id}/${kind.id}\\.${theme.extension}$`),
        );
      }
    }

    for (const file of manifest.files) {
      const bytes = readFileSync(`${publicDirectory}${file.path}`);
      expect(bytes.byteLength).toBe(file.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(file.sha256);
      if (file.path.endsWith('.png')) {
        expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
      } else {
        expect(bytes.subarray(0, 2048).toString('utf8')).toContain('<svg');
      }
    }
  });
});
