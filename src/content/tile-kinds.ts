export interface TileKind {
  readonly id: string;
  readonly glyph: string;
  readonly label: string;
}

/**
 * The shared match identities used by every bundled art theme. Labels and
 * glyphs are user-facing fallbacks; matching always uses the stable ID.
 */
export const TILE_KINDS = [
  { id: 'elephant', glyph: '🐘', label: '大象' },
  { id: 'giraffe', glyph: '🦒', label: '長頸鹿' },
  { id: 'rabbit', glyph: '🐇', label: '兔子' },
  { id: 'pig', glyph: '🐖', label: '豬' },
  { id: 'two_hump_camel', glyph: '🐫', label: '雙峰駱駝' },
  { id: 'kangaroo', glyph: '🦘', label: '袋鼠' },
  { id: 'hedgehog', glyph: '🦔', label: '刺蝟' },
  { id: 'skunk', glyph: '🦨', label: '臭鼬' },
  { id: 'bat', glyph: '🦇', label: '蝙蝠' },
  { id: 'penguin', glyph: '🐧', label: '企鵝' },
  { id: 'owl', glyph: '🦉', label: '貓頭鷹' },
  { id: 'duck', glyph: '🦆', label: '鴨子' },
  { id: 'flamingo', glyph: '🦩', label: '紅鶴' },
  { id: 'peacock', glyph: '🦚', label: '孔雀' },
  { id: 'parrot', glyph: '🦜', label: '鸚鵡' },
  { id: 'turtle', glyph: '🐢', label: '烏龜' },
  { id: 'snake', glyph: '🐍', label: '蛇' },
  { id: 'sauropod', glyph: '🦕', label: '蜥腳類恐龍' },
  { id: 'dragon', glyph: '🐉', label: '龍' },
  { id: 'spouting_whale', glyph: '🐳', label: '噴水鯨魚' },
  { id: 'fish', glyph: '🐟', label: '魚' },
  { id: 'tropical_fish', glyph: '🐠', label: '熱帶魚' },
  { id: 'blowfish', glyph: '🐡', label: '河豚' },
  { id: 'octopus', glyph: '🐙', label: '章魚' },
  { id: 'squid', glyph: '🦑', label: '魷魚' },
  { id: 'crab', glyph: '🦀', label: '螃蟹' },
  { id: 'lobster', glyph: '🦞', label: '龍蝦' },
  { id: 'jellyfish', glyph: '🪼', label: '水母' },
  { id: 'coral', glyph: '🪸', label: '珊瑚' },
  { id: 'oyster', glyph: '🦪', label: '牡蠣' },
  { id: 'butterfly', glyph: '🦋', label: '蝴蝶' },
  { id: 'honeybee', glyph: '🐝', label: '蜜蜂' },
  { id: 'lady_beetle', glyph: '🐞', label: '瓢蟲' },
  { id: 'beetle', glyph: '🪲', label: '甲蟲' },
  { id: 'caterpillar', glyph: '🐛', label: '毛毛蟲' },
  { id: 'snail', glyph: '🐌', label: '蝸牛' },
] as const satisfies ReadonlyArray<TileKind>;

const TILE_KIND_BY_ID = new Map<string, TileKind>(
  TILE_KINDS.map((kind) => [kind.id, kind]),
);

export function tileKind(id: string): TileKind {
  const kind = TILE_KIND_BY_ID.get(id);
  if (!kind) {
    throw new Error(`Unknown tile kind: ${id}`);
  }
  return kind;
}
