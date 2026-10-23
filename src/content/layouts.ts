import { TILE_KINDS } from './tile-kinds';

export type Difficulty = 0 | 1 | 2;

export const LEVEL_KIND_COUNT = 36;

export interface LevelMetadata {
  readonly index: number;
  readonly number: number;
  readonly name: string;
}

export interface LayoutDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly rows: number;
  readonly cols: number;
  readonly timeLimitMs: number;
  readonly kindIds: ReadonlyArray<string>;
}

const LEVEL_NAMES = [
  '一板一眼',
  '石沉大海',
  '撥雲見日',
  '開天闢地',
  '左右開弓',
  '上下同心',
  '左右逢源',
  '上天入地',
  '失之交臂',
  '四大皆空',
  '萬佛朝宗',
] as const;

export const LEVELS: ReadonlyArray<LevelMetadata> = LEVEL_NAMES.map(
  (name, index) => ({ index, number: index + 1, name }),
);

const BASE_TIME_SECONDS: Record<Difficulty, number> = {
  0: 320,
  1: 225,
  2: 160,
};

const LEVEL_TIME_STEP_SECONDS: Record<Difficulty, number> = {
  0: 20,
  1: 15,
  2: 10,
};

export function createLayout(
  difficulty: Difficulty,
  levelIndex = 0,
): LayoutDefinition {
  const level = LEVELS[levelIndex];
  if (!level) {
    throw new RangeError(`Level index must be between 0 and ${LEVELS.length - 1}.`);
  }

  return {
    id: `kawai-${difficulty}-${levelIndex}`,
    name: `第${String(level.number).padStart(2, '0')}關 ${level.name}`,
    description: `16 × 9 棋盤，${LEVEL_KIND_COUNT} 種圖案各四張。`,
    rows: 9,
    cols: 16,
    timeLimitMs:
      (BASE_TIME_SECONDS[difficulty] -
        LEVEL_TIME_STEP_SECONDS[difficulty] * levelIndex) *
      1000,
    kindIds: TILE_KINDS.map((kind) => kind.id),
  };
}

/** The original default difficulty (strong), level one. */
export const classic: LayoutDefinition = createLayout(1, 0);

export const DEFAULT_LAYOUT = classic;
