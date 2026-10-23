import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TILE_KINDS, tileKind } from '../src/content/tile-kinds';
import {
  DEFAULT_TILE_THEME,
  TILE_THEMES,
  tileImageUrl,
  type TileThemeId,
} from '../src/content/tile-themes';

const expectedIdentities = [
  ['elephant', '🐘', '大象'], ['giraffe', '🦒', '長頸鹿'], ['rabbit', '🐇', '兔子'],
  ['pig', '🐖', '豬'], ['two_hump_camel', '🐫', '雙峰駱駝'], ['kangaroo', '🦘', '袋鼠'],
  ['hedgehog', '🦔', '刺蝟'], ['skunk', '🦨', '臭鼬'], ['bat', '🦇', '蝙蝠'],
  ['penguin', '🐧', '企鵝'], ['owl', '🦉', '貓頭鷹'], ['duck', '🦆', '鴨子'],
  ['flamingo', '🦩', '紅鶴'], ['peacock', '🦚', '孔雀'], ['parrot', '🦜', '鸚鵡'],
  ['turtle', '🐢', '烏龜'], ['snake', '🐍', '蛇'], ['sauropod', '🦕', '蜥腳類恐龍'],
  ['dragon', '🐉', '龍'], ['spouting_whale', '🐳', '噴水鯨魚'], ['fish', '🐟', '魚'],
  ['tropical_fish', '🐠', '熱帶魚'], ['blowfish', '🐡', '河豚'], ['octopus', '🐙', '章魚'],
  ['squid', '🦑', '魷魚'], ['crab', '🦀', '螃蟹'], ['lobster', '🦞', '龍蝦'],
  ['jellyfish', '🪼', '水母'], ['coral', '🪸', '珊瑚'], ['oyster', '🦪', '牡蠣'],
  ['butterfly', '🦋', '蝴蝶'], ['honeybee', '🐝', '蜜蜂'], ['lady_beetle', '🐞', '瓢蟲'],
  ['beetle', '🪲', '甲蟲'], ['caterpillar', '🐛', '毛毛蟲'], ['snail', '🐌', '蝸牛'],
] as const;

interface AssetManifest {
  readonly tileCount: number;
  readonly themeCount: number;
  readonly fileCount: number;
  readonly files: ReadonlyArray<{
    readonly theme: TileThemeId;
    readonly kindId: string;
    readonly path: string;
    readonly bytes: number;
    readonly sha256: string;
  }>;
}

const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url));
const manifest = JSON.parse(
  readFileSync(`${publicDirectory}tiles/manifest.json`, 'utf8'),
) as AssetManifest;

describe('bundled tile assets', () => {
  it('uses the exact 36 unique identities from the approved selection', () => {
    expect(TILE_KINDS.map(({ id, glyph, label }) => [id, glyph, label])).toEqual(
      expectedIdentities,
    );
    expect(new Set(TILE_KINDS.map(({ id }) => id))).toHaveLength(36);
    expect(TILE_KINDS.every((kind) => tileKind(kind.id) === kind)).toBe(true);
  });

  it('defines five complete themes with Fluent 3D as the default', () => {
    expect(TILE_THEMES.map(({ id }) => id)).toEqual([
      'fluent3d', 'fluentflat', 'noto', 'twemoji', 'openmoji',
    ]);
    expect(DEFAULT_TILE_THEME).toBe('fluent3d');
    expect(manifest).toMatchObject({ tileCount: 36, themeCount: 5, fileCount: 180 });
    for (const theme of TILE_THEMES) {
      expect(manifest.files.filter((file) => file.theme === theme.id)).toHaveLength(36);
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
