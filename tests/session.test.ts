import { describe, expect, it, vi } from 'vitest';
import {
  createLayout,
  LEVEL_KIND_COUNT,
  LEVELS,
  type LayoutDefinition,
} from '../src/content/layouts';
import { TILE_KINDS } from '../src/content/tile-kinds';
import { Board } from '../src/core/board';
import { mulberry32 } from '../src/core/rng';
import { GameSession } from '../src/game/session';

const testLayout: LayoutDefinition = {
  id: 'test-layout',
  name: 'Test',
  description: 'Test board.',
  rows: 1,
  cols: 2,
  timeLimitMs: 10_000,
  kindIds: TILE_KINDS.slice(0, LEVEL_KIND_COUNT).map((kind) => kind.id),
};

function board(grid: ReadonlyArray<ReadonlyArray<string | null>>): Board {
  return Board.fromGrid(grid, mulberry32(1));
}

function sessionWith(
  grid: ReadonlyArray<ReadonlyArray<string | null>>,
  options: {
    mode?: 'classic' | 'zen';
    difficulty?: 0 | 1 | 2;
    levelIndex?: number;
    seed?: number;
    timeLimitMs?: number;
  } = {},
): GameSession {
  return new GameSession({
    layout: {
      ...testLayout,
      rows: grid.length,
      cols: grid[0]?.length ?? 0,
      timeLimitMs: options.timeLimitMs ?? testLayout.timeLimitMs,
    },
    mode: options.mode,
    difficulty: options.difficulty,
    levelIndex: options.levelIndex,
    board: board(grid),
    seed: options.seed ?? 1,
  });
}

describe('confirmed layouts', () => {
  it('defines all 11 named 16 by 9 levels and their timer formulas', () => {
    expect(LEVELS).toHaveLength(11);
    expect(LEVELS[0]).toEqual({ index: 0, number: 1, name: '一板一眼' });
    expect(LEVELS[10]).toEqual({ index: 10, number: 11, name: '萬佛朝宗' });
    expect(createLayout(0, 10).timeLimitMs).toBe(120_000);
    expect(createLayout(1, 10).timeLimitMs).toBe(75_000);
    expect(createLayout(2, 10).timeLimitMs).toBe(60_000);
    expect(createLayout(1, 0)).toMatchObject({ rows: 9, cols: 16 });
  });

  it('creates four copies of every kind on the 144-cell board', () => {
    const layout = createLayout(1, 0);
    expect(layout.kindIds.length).toBeGreaterThanOrEqual(LEVEL_KIND_COUNT);
    const session = new GameSession({ layout, seed: 8 });
    const counts = tileKindCounts(session.board);
    expect(session.layout.kindIds).toHaveLength(LEVEL_KIND_COUNT);
    expect(new Set(Object.values(counts))).toEqual(new Set([4]));
  });
});

describe('GameSession level kind sampling', () => {
  const candidateKindIds = Array.from({ length: 48 }, (_, index) => `kind-${index}`);
  const expandedLayout: LayoutDefinition = {
    ...createLayout(1, 0),
    kindIds: candidateKindIds,
  };

  it('selects 36 distinct kinds without mutating the candidate pool and deals four copies each', () => {
    const originalPool = [...candidateKindIds];
    const session = new GameSession({ layout: expandedLayout, seed: 19 });

    expect(session.layout.kindIds).toHaveLength(LEVEL_KIND_COUNT);
    expect(new Set(session.layout.kindIds).size).toBe(LEVEL_KIND_COUNT);
    expect(session.layout.kindIds.every((kind) => candidateKindIds.includes(kind))).toBe(true);
    expect(candidateKindIds).toEqual(originalPool);

    const counts = tileKindCounts(session.board);
    expect(Object.keys(counts)).toHaveLength(LEVEL_KIND_COUNT);
    expect(new Set(Object.values(counts))).toEqual(new Set([4]));
  });

  it('replays a seed exactly and varies the selected kinds across seeds', () => {
    const first = new GameSession({ layout: expandedLayout, seed: 73 });
    const replay = new GameSession({ layout: expandedLayout, seed: 73 });
    const different = new GameSession({ layout: expandedLayout, seed: 74 });

    expect(replay.layout.kindIds).toEqual(first.layout.kindIds);
    expect(boardKinds(replay.board)).toEqual(boardKinds(first.board));
    expect([...different.layout.kindIds].sort()).not.toEqual([...first.layout.kindIds].sort());
  });

  it('resamples from the full candidate pool on restart and level continuation', () => {
    const prepared = board([['fixture', 'fixture']]);
    const session = new GameSession({
      layout: { ...expandedLayout, rows: 1, cols: 2 },
      board: prepared,
      seed: 11,
    });
    const initialSelection = [...session.layout.kindIds];

    match(session, 0, 0, 0, 1);
    expect(session.continueLevel()).toBe(true);
    const nextLevelSelection = [...session.layout.kindIds];
    expect(nextLevelSelection).toHaveLength(LEVEL_KIND_COUNT);
    expect([...nextLevelSelection].sort()).not.toEqual([...initialSelection].sort());
    expect(nextLevelSelection.every((kind) => candidateKindIds.includes(kind))).toBe(true);

    session.restart(29);
    const restartedSelection = [...session.layout.kindIds];
    expect(restartedSelection).toHaveLength(LEVEL_KIND_COUNT);
    expect(restartedSelection).not.toEqual(nextLevelSelection);
    session.restart(29);
    expect(session.layout.kindIds).toEqual(restartedSelection);
  });

  it('draws chance kinds only from the current level selection', () => {
    const session = new GameSession({ layout: expandedLayout, seed: 101 });
    const selected = new Set(session.layout.kindIds);

    expect(selected.has(session.chanceKind)).toBe(true);
    for (let count = 0; count < 5; count += 1) {
      expect(session.shuffle()).toBe(true);
      expect(selected.has(session.chanceKind)).toBe(true);
    }
  });

  it('keeps every kind in a small custom layout', () => {
    const kindIds = ['small-a', 'small-b'];
    const session = new GameSession({
      layout: { ...testLayout, rows: 2, cols: 2, kindIds },
      seed: 4,
    });

    expect(session.layout.kindIds).toEqual(kindIds);
    expect(new Set(session.board.remainingTiles().map((tile) => tile.kind))).toEqual(
      new Set(kindIds),
    );
  });
});

describe('GameSession matching, score, and timer', () => {
  it('defaults to Classic mode', () => {
    const session = sessionWith([['a', 'a']]);

    expect(session.mode).toBe('classic');
    expect(session.difficulty).toBe(1);
    expect(session.timeLeftMs).toBe(10_000);
  });

  it('selects, deselects, and reports kind and path mismatches', () => {
    const session = sessionWith([
      ['a', 'b', 'b', 'a'],
      ['a', 'b', 'b', 'a'],
    ]);
    expect(session.select(0, 0)).toMatchObject({ type: 'selected' });
    expect(session.select(0, 0)).toEqual({ type: 'deselected' });
    session.select(0, 0);
    expect(session.select(0, 1)).toMatchObject({ type: 'mismatch', reason: 'kind' });
  });

  it.each([
    [0, 1, 6_000],
    [1, 4, 4_000],
    [2, 9, 3_000],
  ] as const)('uses difficulty %i pair score and match time', (difficulty, score, addedTime) => {
    const session = sessionWith(
      [['a', 'a', 'b', 'b']],
      { difficulty, timeLimitMs: 20_000 },
    );
    session.tick(10_000);
    session.select(0, 0);
    const result = session.select(0, 1);
    expect(result).toMatchObject({ type: 'matched', points: score, phase: 'playing' });
    expect(session.score).toBe(score);
    expect(session.timeLeftMs).toBe(10_000 + addedTime);
  });

  it('caps match time and applies the exact clear bonus', () => {
    const session = sessionWith([['a', 'a']], { difficulty: 1, timeLimitMs: 10_000 });
    const result = match(session, 0, 0, 0, 1);
    expect(result).toMatchObject({ points: 4, phase: 'won' });
    expect(session.lastBonus).toBe(136);
    expect(session.score).toBe(140);
    expect(session.timeLeftMs).toBe(0);
  });

  it('applies the level-11 resource bonus, clears resources, and completes', () => {
    const session = sessionWith([['a', 'a']], {
      difficulty: 1,
      levelIndex: 10,
      timeLimitMs: 1_000,
    });
    match(session, 0, 0, 0, 1);
    expect(session.phase).toBe('completed');
    expect(session.lastBonus).toBe(13_500);
    expect(session.score).toBe(13_544);
    expect(session.hintResource).toBe(0);
    expect(session.shuffleResource).toBe(0);
  });

  it('loses to natural timer decay only while playing', () => {
    const session = sessionWith([['a', 'a']], { timeLimitMs: 1_000 });
    session.pause();
    expect(session.tick(500)).toBe('paused');
    session.resume();
    expect(session.tick(1_000)).toBe('lost');
    expect(session.lossReason).toBe('timeout');
  });
});

describe('GameSession Zen mode', () => {
  it('uses normal difficulty and never times out during arbitrarily long ticks', () => {
    const session = sessionWith([['a', 'a', 'b', 'b']], {
      mode: 'zen',
      difficulty: 2,
    });

    expect(session.mode).toBe('zen');
    expect(session.difficulty).toBe(1);
    expect(session.timeLeftMs).toBe(0);
    expect(session.tick(Number.MAX_SAFE_INTEGER)).toBe('playing');
    expect(session.tick(Number.POSITIVE_INFINITY)).toBe('playing');
    expect(session.timeLeftMs).toBe(0);
    expect(session.lossReason).toBeNull();
  });

  it('scores matches and clears without match time or a remaining-time bonus', () => {
    const session = sessionWith([['a', 'a']], {
      mode: 'zen',
      difficulty: 0,
    });

    const result = match(session, 0, 0, 0, 1);

    expect(result).toMatchObject({ points: 4, phase: 'won' });
    expect(session.lastBonus).toBe(100);
    expect(session.score).toBe(104);
    expect(Number.isFinite(session.score)).toBe(true);
    expect(session.timeLeftMs).toBe(0);
  });

  it('continues levels and retains Zen mode after restart', () => {
    const session = sessionWith([['a', 'a']], { mode: 'zen', difficulty: 2 });
    match(session, 0, 0, 0, 1);

    expect(session.continueLevel()).toBe(true);
    expect(session.levelIndex).toBe(1);
    expect(session.mode).toBe('zen');
    expect(session.difficulty).toBe(1);
    expect(session.timeLeftMs).toBe(0);
    expect(session.tick(86_400_000)).toBe('playing');

    session.restart(17);
    expect(session.mode).toBe('zen');
    expect(session.difficulty).toBe(1);
    expect(session.levelIndex).toBe(0);
    expect(session.timeLeftMs).toBe(0);
    expect(session.tick(86_400_000)).toBe('playing');
  });

  it('keeps limited hints and shuffles and charges a shuffle on resume', () => {
    const session = sessionWith([['a', 'a', 'b', 'b']], { mode: 'zen' });

    expect(session.hintResource).toBe(5);
    expect(session.shuffleResource).toBe(5);
    expect(session.hint()).not.toBeNull();
    expect(session.hintResource).toBe(4);

    session.pause();
    expect(session.phase).toBe('paused');
    expect(session.shuffleResource).toBe(5);
    expect(session.tick(86_400_000)).toBe('paused');
    session.resume();
    expect(session.phase).toBe('playing');
    expect(session.shuffleResource).toBe(4);
    expect(session.timeLeftMs).toBe(0);
  });

  it('completes the final level with the normal resource and completion bonuses', () => {
    const session = sessionWith([['a', 'a']], {
      mode: 'zen',
      difficulty: 0,
      levelIndex: 10,
    });

    match(session, 0, 0, 0, 1);

    expect(session.phase).toBe('completed');
    expect(session.lastBonus).toBe(13_500);
    expect(session.score).toBe(13_544);
    expect(session.timeLeftMs).toBe(0);
  });

  it('replaces all time cards with usable hint and shuffle rewards', () => {
    const kind = TILE_KINDS[0]!.id;
    const session = sessionWith(
      Array.from({ length: 4 }, () => [kind, kind]),
      { mode: 'zen', seed: seedForRepeatedKind(kind, 3) },
    );
    for (let row = 0; row < 3; row += 1) match(session, row, 0, row, 1);

    expect(session.phase).toBe('cards');
    expect(session.cards).toHaveLength(18);
    expect(session.cards.some((card) => card.reward.kind === 'time')).toBe(false);
    expect(
      session.cards.every(
        (card) =>
          (card.reward.kind === 'hint' || card.reward.kind === 'shuffle') &&
          card.reward.amount > 0,
      ),
    ).toBe(true);

    const hintsBefore = session.hintResource;
    const shufflesBefore = session.shuffleResource;
    while (session.phase === 'cards') {
      const hintIndex = session.cards.findIndex(
        (card) => !card.revealed && card.reward.kind === 'hint',
      );
      const shuffleIndex = session.cards.findIndex(
        (card) => !card.revealed && card.reward.kind === 'shuffle',
      );
      const index = hintIndex >= 0 ? hintIndex : shuffleIndex;
      expect(session.chooseCard(index)).not.toBeNull();
    }
    expect(
      session.hintResource > hintsBefore ||
        session.shuffleResource > shufflesBefore,
    ).toBe(true);
    expect(session.timeLeftMs).toBe(0);
  });
});

describe('GameSession resources and move cache', () => {
  it('gates a cached active hint and clears it on the next match', () => {
    const session = sessionWith([['a', 'a', 'b', 'b']]);
    const firstHint = session.hint();
    expect(firstHint).not.toBeNull();
    expect(session.hintResource).toBe(4);
    expect(session.hint()).toBeNull();
    expect(session.hintResource).toBe(4);
    const [first, second] = firstHint!;
    match(session, first.row, first.col, second.row, second.col);
    expect(session.activeHint).toBeNull();
    expect(session.hint()).not.toBeNull();
    expect(session.hintResource).toBe(3);
  });

  it('spends shuffle resources and re-rolls the chance kind', () => {
    const session = sessionWith([['a', 'a', 'b', 'b']], { seed: 2 });
    const before = session.chanceKind;
    expect(session.shuffle()).toBe(true);
    expect(session.shuffleResource).toBe(4);
    expect(session.stats.shuffles).toBe(1);
    expect(session.chanceKind).not.toBe(before);
  });

  it('requires a shuffle resource to pause and spends it only on resume', () => {
    const session = sessionWith([['a', 'a', 'b', 'b']]);
    session.pause();
    expect(session.phase).toBe('paused');
    expect(session.shuffleResource).toBe(5);
    session.tick(2_000);
    expect(session.timeLeftMs).toBe(10_000);
    const chance = session.chanceKind;
    session.resume();
    expect(session.phase).toBe('playing');
    expect(session.shuffleResource).toBe(4);
    expect(session.chanceKind).toBe(chance);

    for (let count = 0; count < 4; count += 1) expect(session.shuffle()).toBe(true);
    expect(session.shuffleResource).toBe(0);
    session.pause();
    expect(session.phase).toBe('playing');
  });

  it('auto-shuffles after a match with no cached move', () => {
    const prepared = board([['a', 'a', 'b', 'b']]);
    const session = new GameSession({ layout: { ...testLayout, cols: 4 }, board: prepared, seed: 1 });
    const nextPair: [{ row: number; col: number }, { row: number; col: number }] = [
      { row: 0, col: 2 },
      { row: 0, col: 3 },
    ];
    vi.spyOn(prepared, 'findHint')
      .mockReturnValueOnce(null)
      .mockReturnValue(nextPair);
    match(session, 0, 0, 0, 1);
    expect(session.phase).toBe('playing');
    expect(session.shuffleResource).toBe(4);
  });

  it('loses with no moves when shuffle resources are exhausted', () => {
    const session = sessionWith([['a', 'a', 'b', 'b']]);
    for (let count = 0; count < 5; count += 1) expect(session.shuffle()).toBe(true);
    const pair = session.board.findHint()!;
    vi.spyOn(session.board, 'findHint').mockReturnValue(null);
    match(session, pair[0].row, pair[0].col, pair[1].row, pair[1].col);
    expect(session.phase).toBe('lost');
    expect(session.lossReason).toBe('no-moves');
  });

  it('fails cleanly when an unexpected manual shuffle cannot make a move', () => {
    const session = sessionWith([['a', 'a', 'b', 'b']]);
    vi.spyOn(session.board, 'shuffle').mockReturnValue(false);
    expect(session.shuffle()).toBe(false);
    expect(session.phase).toBe('lost');
    expect(session.lossReason).toBe('no-moves');
    expect(session.shuffleResource).toBe(5);
  });

  it('fails cleanly when an unexpected resume shuffle cannot make a move', () => {
    const session = sessionWith([['a', 'a', 'b', 'b']]);
    session.pause();
    vi.spyOn(session.board, 'shuffle').mockReturnValue(false);
    session.resume();
    expect(session.phase).toBe('lost');
    expect(session.lossReason).toBe('no-moves');
    expect(session.shuffleResource).toBe(5);
  });

  it('starts lost when an unsolvable initial board cannot be repaired', () => {
    const prepared = board([
      ['a', 'b'],
      ['b', 'a'],
    ]);
    vi.spyOn(prepared, 'hasMoves').mockReturnValue(false);
    vi.spyOn(prepared, 'shuffle').mockReturnValue(false);
    const session = new GameSession({
      layout: { ...testLayout, rows: 2, cols: 2 },
      board: prepared,
      seed: 1,
    });
    expect(session.phase).toBe('lost');
    expect(session.lossReason).toBe('no-moves');
  });
});

describe('GameSession chance cards and continuation', () => {
  it('uses the current layout kind pool for chance rerolls', () => {
    const session = sessionWith([['not-in-pool', 'not-in-pool']]);
    expect(session.layout.kindIds).toContain(session.chanceKind);
    expect(session.chanceKind).not.toBe('not-in-pool');
  });

  it('opens cards on the third chance match and builds a reward permutation', () => {
    const kind = TILE_KINDS[0]!.id;
    const seed = seedForRepeatedKind(kind, 3);
    const session = sessionWith(
      Array.from({ length: 4 }, () => [kind, kind]),
      { seed },
    );
    for (let row = 0; row < 3; row += 1) match(session, row, 0, row, 1);

    expect(session.phase).toBe('cards');
    expect(session.stars).toBe(3);
    expect(session.picksRemaining).toBeGreaterThanOrEqual(1);
    expect(session.cards).toHaveLength(18);
    expect(session.cards.every((card) => !card.revealed)).toBe(true);
    expect(rewardHistogram(session.cards.map((card) => card.reward))).toEqual({
      'hint:1': 3,
      'hint:2': 2,
      'hint:3': 1,
      'shuffle:1': 3,
      'shuffle:2': 2,
      'shuffle:3': 1,
      'time:10000': 3,
      'time:15000': 2,
      'time:20000': 1,
    });

    while (session.phase === 'cards') {
      const index = session.cards.findIndex((card) => !card.revealed);
      expect(session.chooseCard(index)).not.toBeNull();
    }
    expect(session.stars).toBe(0);
    expect(session.phase).toBe('playing');
    expect(session.shuffleResource).toBeGreaterThanOrEqual(5);
  });

  it('gives the card screen precedence over a final clear and caps time rewards', () => {
    const kind = TILE_KINDS[0]!.id;
    const seed = seedForRepeatedKind(kind, 3);
    const session = sessionWith(
      Array.from({ length: 3 }, () => [kind, kind]),
      { seed, timeLimitMs: 1_000 },
    );
    for (let row = 0; row < 3; row += 1) match(session, row, 0, row, 1);
    expect(session.phase).toBe('cards');
    expect(session.board.isEmpty).toBe(true);

    while (session.phase === 'cards') {
      const timeIndex = session.cards.findIndex(
        (card) => !card.revealed && card.reward.kind === 'time',
      );
      const fallback = session.cards.findIndex((card) => !card.revealed);
      session.chooseCard(timeIndex >= 0 ? timeIndex : fallback);
      expect(session.timeLeftMs).toBeLessThanOrEqual(1_000);
    }
    expect(session.phase).toBe('won');
    expect(session.stars).toBe(0);
    expect(session.lastBonus).toBe(100);
  });

  it('defers the level transform until the last card pick, then shuffles for free', () => {
    const kind = TILE_KINDS[0]!.id;
    const session = sessionWith(
      Array.from({ length: 4 }, () => [kind, kind]),
      { seed: seedForRepeatedKind(kind, 3), levelIndex: 1 },
    );
    match(session, 0, 0, 0, 1);
    match(session, 1, 0, 1, 1);
    match(session, 3, 0, 3, 1);

    expect(session.phase).toBe('cards');
    expect(session.board.tileAt(2, 0)).not.toBeNull();
    expect(session.board.tileAt(3, 0)).toBeNull();
    const shuffleBefore = session.shuffleResource;
    while (session.phase === 'cards') {
      session.chooseCard(session.cards.findIndex((card) => !card.revealed));
    }
    expect(session.board.tileAt(2, 0)).toBeNull();
    expect(session.board.tileAt(3, 0)).not.toBeNull();
    expect(session.shuffleResource).toBeGreaterThanOrEqual(shuffleBefore);
  });

  it('fails cleanly when the free card-close shuffle cannot make a move', () => {
    const kind = TILE_KINDS[0]!.id;
    const session = sessionWith(
      Array.from({ length: 4 }, () => [kind, kind]),
      { seed: seedForRepeatedKind(kind, 3) },
    );
    for (let row = 0; row < 3; row += 1) match(session, row, 0, row, 1);
    expect(session.phase).toBe('cards');
    vi.spyOn(session.board, 'shuffle').mockReturnValue(false);

    while (session.phase === 'cards') {
      session.chooseCard(session.cards.findIndex((card) => !card.revealed));
    }
    expect(session.phase).toBe('lost');
    expect(session.lossReason).toBe('no-moves');
  });

  it('continues with score and stars while adding difficulty-specific resources', () => {
    const weak = sessionWith([['a', 'a']], { difficulty: 0 });
    match(weak, 0, 0, 0, 1);
    const weakScore = weak.score;
    expect(weak.continueLevel()).toBe(true);
    expect(weak.levelIndex).toBe(1);
    expect(weak.layout.timeLimitMs).toBe(300_000);
    expect(weak.score).toBe(weakScore);
    expect(weak.hintResource).toBe(9);
    expect(weak.shuffleResource).toBe(8);

    const kind = TILE_KINDS[0]!.id;
    const strong = sessionWith(
      [[kind, kind], [kind, kind]],
      { difficulty: 1, seed: seedForPattern(kind, false) },
    );
    match(strong, 0, 0, 0, 1);
    match(strong, 1, 0, 1, 1);
    expect(strong.stars).toBe(1);
    expect(strong.continueLevel()).toBe(true);
    expect(strong.hintResource).toBe(6);
    expect(strong.shuffleResource).toBe(6);
    expect(strong.stars).toBe(1);
    expect(strong.continueLevel()).toBe(false);
  });

  it('restart resets the run, resources, stars, and loss state', () => {
    const session = sessionWith([['a', 'a']], { difficulty: 0 });
    session.tick(10_000);
    expect(session.phase).toBe('lost');
    session.restart(7);
    expect(session.phase).toBe('playing');
    expect(session.score).toBe(0);
    expect(session.hintResource).toBe(8);
    expect(session.shuffleResource).toBe(8);
    expect(session.stars).toBe(0);
    expect(session.lossReason).toBeNull();
  });
});

function match(
  session: GameSession,
  firstRow: number,
  firstCol: number,
  secondRow: number,
  secondCol: number,
) {
  session.select(firstRow, firstCol);
  return session.select(secondRow, secondCol);
}

function tileKindCounts(board: Board): Record<string, number> {
  return board.remainingTiles().reduce<Record<string, number>>((result, tile) => {
    result[tile.kind] = (result[tile.kind] ?? 0) + 1;
    return result;
  }, {});
}

function boardKinds(board: Board): string[] {
  return board.remainingTiles().map((tile) => tile.kind);
}

function seedForRepeatedKind(kind: string, count: number): number {
  const pool = testLayout.kindIds;
  for (let seed = 0; seed < 2_000_000; seed += 1) {
    const rng = mulberry32(seed);
    if (Array.from({ length: count }, () => pool[Math.floor(rng() * pool.length)]).every((value) => value === kind)) {
      return seed;
    }
  }
  throw new Error(`Could not find deterministic seed for ${kind}.`);
}

function seedForPattern(firstKind: string, secondMatches: boolean): number {
  const pool = testLayout.kindIds;
  for (let seed = 0; seed < 100_000; seed += 1) {
    const rng = mulberry32(seed);
    const first = pool[Math.floor(rng() * pool.length)];
    const second = pool[Math.floor(rng() * pool.length)];
    if (first === firstKind && (second === firstKind) === secondMatches) return seed;
  }
  throw new Error(`Could not find deterministic chance pattern for ${firstKind}.`);
}

function rewardHistogram(rewards: ReadonlyArray<{ kind: string; amount: number }>): Record<string, number> {
  return rewards.reduce<Record<string, number>>((result, reward) => {
    const key = `${reward.kind}:${reward.amount}`;
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {});
}
