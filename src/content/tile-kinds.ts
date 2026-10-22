export interface TileKind {
  readonly id: string;
  readonly glyph: string;
  readonly label: string;
  readonly hue: number;
}

/**
 * Placeholder tile set drawn with CSS and text. These are deliberately simple
 * and original: no artwork from the 2004 game is stored in this repository.
 *
 * Replace this module (or add a local skin pack) once `re/assets/` records the
 * original tile vocabulary and a lawful asset route.
 */
export const TILE_KINDS: ReadonlyArray<TileKind> = [
  { id: 'sakura', glyph: '桜', label: '櫻', hue: 342 },
  { id: 'moon', glyph: '月', label: '月', hue: 45 },
  { id: 'star', glyph: '星', label: '星', hue: 273 },
  { id: 'rain', glyph: '雨', label: '雨', hue: 210 },
  { id: 'snow', glyph: '雪', label: '雪', hue: 188 },
  { id: 'wind', glyph: '風', label: '風', hue: 158 },
  { id: 'mountain', glyph: '山', label: '山', hue: 100 },
  { id: 'river', glyph: '川', label: '川', hue: 224 },
  { id: 'flower', glyph: '花', label: '花', hue: 12 },
  { id: 'bird', glyph: '鳥', label: '鳥', hue: 300 },
  { id: 'fish', glyph: '魚', label: '魚', hue: 198 },
  { id: 'stone', glyph: '石', label: '石', hue: 28 },
];

const TILE_KIND_BY_ID = new Map(TILE_KINDS.map((kind) => [kind.id, kind]));

export function tileKind(id: string): TileKind {
  const kind = TILE_KIND_BY_ID.get(id);
  if (!kind) {
    throw new Error(`Unknown tile kind: ${id}`);
  }
  return kind;
}
