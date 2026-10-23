import { tileKind } from './tile-kinds';

export const TILE_THEMES = [
  {
    id: 'fluent3d',
    label: 'Fluent 3D',
    description: '柔和的微立體玩具風格',
    extension: 'png',
    license: 'MIT',
    licenseFile: 'fluent-emoji-MIT.txt',
    attribution: 'Microsoft Corporation',
    sourceUrl: 'https://github.com/microsoft/fluentui-emoji',
  },
  {
    id: 'fluentflat',
    label: 'Fluent Flat',
    description: '圓潤清晰的扁平色塊',
    extension: 'svg',
    license: 'MIT',
    licenseFile: 'fluent-emoji-MIT.txt',
    attribution: 'Microsoft Corporation',
    sourceUrl: 'https://github.com/microsoft/fluentui-emoji',
  },
  {
    id: 'noto',
    label: 'Noto Color Emoji',
    description: '簡潔鮮明的彩色卡通',
    extension: 'png',
    license: 'Apache-2.0',
    licenseFile: 'noto-emoji-Apache-2.0.txt',
    noticeFile: 'noto-emoji-NOTICE.txt',
    attribution: 'Google Inc.',
    sourceUrl: 'https://github.com/googlefonts/noto-emoji',
  },
  {
    id: 'twemoji',
    label: 'Twemoji',
    description: '明亮清楚的線條插畫',
    extension: 'svg',
    license: 'CC-BY-4.0',
    licenseFile: 'twemoji-CC-BY-4.0.txt',
    attribution: 'Twitter, Inc. and other contributors',
    sourceUrl: 'https://github.com/jdecked/twemoji',
  },
  {
    id: 'openmoji',
    label: 'OpenMoji',
    description: '粗黑線條的貼紙風格',
    extension: 'svg',
    license: 'CC-BY-SA-4.0',
    licenseFile: 'openmoji-CC-BY-SA-4.0.txt',
    attribution: 'OpenMoji contributors',
    sourceUrl: 'https://github.com/hfg-gmuend/openmoji',
  },
] as const;

export type TileThemeId = (typeof TILE_THEMES)[number]['id'];

export const DEFAULT_TILE_THEME: TileThemeId = 'fluent3d';

const TILE_THEME_BY_ID = new Map(
  TILE_THEMES.map((theme) => [theme.id, theme]),
);

export function tileImageUrl(kindId: string, themeId: TileThemeId): string {
  tileKind(kindId);
  const theme = TILE_THEME_BY_ID.get(themeId);
  if (!theme) {
    throw new Error(`Unknown tile theme: ${themeId}`);
  }
  return `${import.meta.env.BASE_URL}tiles/${theme.id}/${kindId}.${theme.extension}`;
}
