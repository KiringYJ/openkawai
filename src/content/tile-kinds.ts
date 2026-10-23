import catalog from './tile-catalog.json';

export interface TileKind {
  readonly id: string;
  readonly glyph: string;
  readonly label: string;
}

/**
 * The shared match identities used by every bundled art theme. Labels and
 * glyphs are user-facing fallbacks; matching always uses the stable ID.
 */
export const TILE_KINDS: ReadonlyArray<TileKind> = catalog;

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
