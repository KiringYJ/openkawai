import { describe, expect, it } from 'vitest';
import { Board } from '../src/core/board';
import type { LayoutDefinition } from '../src/content/layouts';
import { mulberry32 } from '../src/core/rng';
import {
  GameSession,
  HINT_COST,
  SCORE_BASE,
  SCORE_COMBO_STEP,
} from '../src/game/session';

const layout: LayoutDefinition = {
  id: 'test-layout',
  name: 'Test',
  description: 'Two tiles.',
  rows: 1,
  cols: 2,
  timeLimitMs: 1000,
  kindIds: ['a'],
};

function board(
  grid: ReadonlyArray<ReadonlyArray<string | null>>,
): Board {
  return Board.fromGrid(grid, mulberry32(1));
}

function sessionWith(
  grid: ReadonlyArray<ReadonlyArray<string | null>>,
  overrides: Partial<LayoutDefinition> = {},
): GameSession {
  return new GameSession({
    layout: { ...layout, rows: grid.length, cols: grid[0]?.length ?? 0, ...overrides },
    board: board(grid),
    seed: 1,
  });
}

describe('GameSession selection', () => {
  it('selects, deselects, and ignores the same interaction twice', () => {
    const session = sessionWith([
      ['a', 'a'],
      [null, null],
    ]);

    expect(session.select(0, 0)).toMatchObject({ type: 'selected' });
    expect(session.selected).toEqual({ row: 0, col: 0 });
    expect(session.select(0, 0)).toEqual({ type: 'deselected' });
    expect(session.selected).toBeNull();
  });

  it('removes a matching pair and awards base points', () => {
    const session = sessionWith([
      ['a', 'a'],
      [null, null],
    ]);

    session.select(0, 0);
    const result = session.select(0, 1);

    expect(result.type).toBe('matched');
    if (result.type !== 'matched') {
      return;
    }
    expect(result.points).toBe(SCORE_BASE);
    expect(result.phase).toBe('won');
    expect(session.score).toBe(SCORE_BASE);
    expect(session.board.remainingCount).toBe(0);
    expect(session.phase).toBe('won');
  });

  it('increases the combo bonus to a pair of matches', () => {
    const session = sessionWith([
      ['a', 'b'],
      ['a', 'b'],
    ]);

    session.select(0, 0);
    expect(session.select(1, 0)).toMatchObject({
      type: 'matched',
      points: SCORE_BASE,
    });

    session.select(0, 1);
    expect(session.select(1, 1)).toMatchObject({
      type: 'matched',
      points: SCORE_BASE + SCORE_COMBO_STEP,
    });
    expect(session.score).toBe(SCORE_BASE * 2 + SCORE_COMBO_STEP);
    expect(session.bestCombo).toBe(2);
  });

  it('resets the combo when kinds differ', () => {
    const session = sessionWith([
      ['a', 'b'],
      ['a', 'b'],
    ]);

    session.select(0, 0);
    const result = session.select(0, 1);

    expect(result).toMatchObject({ type: 'mismatch', reason: 'kind' });
    expect(session.combo).toBe(0);

    session.select(0, 0);
    expect(session.select(1, 0)).toMatchObject({
      type: 'matched',
      points: SCORE_BASE,
    });

    session.select(0, 1);
    expect(session.select(1, 1)).toMatchObject({
      type: 'matched',
      points: SCORE_BASE + SCORE_COMBO_STEP,
    });
  });

  it('reports a blocked pair without removing tiles', () => {
    const session = sessionWith([
      ['x', 'x', 'x', 'x'],
      ['x', 'a', 'x', 'x'],
      ['x', 'x', 'a', 'x'],
      ['x', 'x', 'x', 'x'],
    ]);

    session.select(1, 1);
    const result = session.select(2, 2);

    expect(result).toMatchObject({ type: 'mismatch', reason: 'blocked' });
    expect(session.board.remainingCount).toBe(16);
    expect(session.score).toBe(0);
  });
});

describe('GameSession timer and pause', () => {
  it('counts down and loses at zero', () => {
    const session = sessionWith([['a', 'a']]);

    expect(session.tick(400)).toBe('playing');
    expect(session.timeLeftMs).toBe(600);
    expect(session.tick(600)).toBe('lost');
    expect(session.timeLeftMs).toBe(0);
    expect(session.phase).toBe('lost');
    expect(session.select(0, 0)).toEqual({ type: 'ignored' });
  });

  it('does not count down while paused', () => {
    const session = sessionWith([['a', 'a']]);

    session.pause();
    expect(session.phase).toBe('paused');
    expect(session.tick(500)).toBe('paused');
    expect(session.timeLeftMs).toBe(1000);
    expect(session.select(0, 0)).toEqual({ type: 'ignored' });

    session.resume();
    expect(session.tick(500)).toBe('playing');
    expect(session.timeLeftMs).toBe(500);
  });
});

describe('GameSession helpers', () => {
  it('charges for hints without going negative', () => {
    const session = sessionWith([['a', 'a']]);

    expect(session.hint()).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);
    expect(session.score).toBe(0);
    expect(session.stats.hints).toBe(1);

    session.select(0, 0);
    session.select(0, 1);
    expect(session.hint()).toBeNull();
    expect(session.score).toBe(SCORE_BASE);
  });

  it('counts shuffles and clears the selection', () => {
    const session = sessionWith([['a', 'a']]);
    session.select(0, 0);

    expect(session.shuffle()).toBe(true);
    expect(session.selected).toBeNull();
    expect(session.stats.shuffles).toBe(1);
    expect(session.board.remainingCount).toBe(2);
  });

  it('restarts all per-round state', () => {
    const session = sessionWith([['a', 'a']]);
    session.select(0, 0);
    session.select(0, 1);
    expect(session.phase).toBe('won');

    session.restart(2);

    expect(session.phase).toBe('playing');
    expect(session.score).toBe(0);
    expect(session.stats).toEqual({
      score: 0,
      combo: 0,
      bestCombo: 0,
      hints: 0,
      shuffles: 0,
      matches: 0,
    });
    expect(session.timeLeftMs).toBe(1000);
    expect(session.board.remainingCount).toBe(2);
  });

  it('penalises a hint by the advertised amount', () => {
    const session = sessionWith([
      ['a', 'b'],
      ['a', 'b'],
    ]);
    session.select(0, 0);
    session.select(1, 0);

    expect(session.score).toBe(SCORE_BASE);
    session.hint();
    expect(session.score).toBe(SCORE_BASE - HINT_COST);
  });
});
