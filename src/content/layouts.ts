import { TILE_KINDS } from './tile-kinds';

export interface LayoutDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly rows: number;
  readonly cols: number;
  readonly timeLimitMs: number;
  readonly kindIds: ReadonlyArray<string>;
}

/**
 * Provisional layout used for the bootstrap build. The size, tile vocabulary,
 * and five-minute limit are implementation defaults, not confirmed facts about
 * the original game. Record findings in `re/scope.md` before changing them.
 */
export const classic: LayoutDefinition = {
  id: 'classic-12x8',
  name: '經典 12 × 8',
  description: '滿版 12 × 8 棋盤，12 種圖案各四對；五分鐘倒數。',
  rows: 8,
  cols: 12,
  timeLimitMs: 5 * 60 * 1000,
  kindIds: TILE_KINDS.map((kind) => kind.id),
};

export const DEFAULT_LAYOUT = classic;
