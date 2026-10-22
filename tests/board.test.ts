import { describe, expect, it } from 'vitest';
import { Board, type Point } from '../src/core/board';
import { mulberry32 } from '../src/core/rng';

function makeBoard(grid: ReadonlyArray<ReadonlyArray<string | null>>): Board {
  return Board.fromGrid(grid, mulberry32(1));
}

function turnCount(path: ReadonlyArray<Point>): number {
  let turns = 0;
  for (let index = 2; index < path.length; index += 1) {
    const a = path[index - 2]!;
    const b = path[index - 1]!;
    const c = path[index]!;
    const first = { row: b.row - a.row, col: b.col - a.col };
    const second = { row: c.row - b.row, col: c.col - b.col };
    if (first.row !== second.row || first.col !== second.col) {
      turns += 1;
    }
  }
  return turns;
}

describe('Board.create', () => {
  it('creates a full board with paired kinds', () => {
    const board = Board.create(8, 12, ['a', 'b', 'c'], mulberry32(42));

    expect(board.rows).toBe(8);
    expect(board.cols).toBe(12);
    expect(board.remainingCount).toBe(96);

    const counts = new Map<string, number>();
    for (const tile of board.remainingTiles()) {
      counts.set(tile.kind, (counts.get(tile.kind) ?? 0) + 1);
    }
    for (const count of counts.values()) {
      expect(count % 2).toBe(0);
    }
  });

  it('rejects an odd number of cells', () => {
    expect(() => Board.create(3, 3, ['a'], mulberry32(1))).toThrow(
      /even number of cells/,
    );
  });

  it('rejects an empty kind list', () => {
    expect(() => Board.create(2, 2, [], mulberry32(1))).toThrow(
      /at least one tile kind/,
    );
  });

  it('rejects an odd count for a kind in a custom grid', () => {
    expect(() => makeBoard([['a', 'a', 'b']])).toThrow(/odd count/);
  });
});

describe('Board.findPath', () => {
  it('connects adjacent tiles with a straight line', () => {
    const board = makeBoard([['a', 'a']]);
    const path = board.findPath({ row: 0, col: 0 }, { row: 0, col: 1 });

    expect(path).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);
  });

  it('connects diagonal tiles with one turn', () => {
    const board = makeBoard([
      ['a', null],
      [null, 'a'],
    ]);
    const path = board.findPath({ row: 0, col: 0 }, { row: 1, col: 1 });

    expect(path).not.toBeNull();
    expect(path).toHaveLength(3);
    expect(turnCount(path!)).toBe(1);
  });

  it('uses two turns when the direct route is blocked', () => {
    const board = makeBoard([
      ['a', 'x', 'a'],
      [null, null, null],
      [null, null, 'x'],
    ]);
    const path = board.findPath({ row: 0, col: 0 }, { row: 0, col: 2 });

    expect(path).not.toBeNull();
    expect(turnCount(path!)).toBe(2);
  });

  it('rejects a path that needs more than two turns', () => {
    const board = makeBoard([
      [null, null, null, null, null],
      [null, 'a', 'x', null, null],
      [null, 'x', null, 'x', null],
      [null, null, 'x', 'a', null],
      [null, null, null, null, null],
    ]);
    const path = board.findPath({ row: 1, col: 1 }, { row: 3, col: 3 });

    expect(path).toBeNull();
  });

  it('rejects a path through a blocked board', () => {
    const board = makeBoard([
      ['x', 'x', 'x', 'x'],
      ['x', 'a', 'x', 'x'],
      ['x', 'x', 'a', 'x'],
      ['x', 'x', 'x', 'x'],
    ]);
    const path = board.findPath({ row: 1, col: 1 }, { row: 2, col: 2 });

    expect(path).toBeNull();
  });

  it('does not connect different kinds', () => {
    const board = makeBoard([
      ['a', 'b'],
      ['a', 'b'],
    ]);
    expect(board.findPath({ row: 0, col: 0 }, { row: 0, col: 1 })).toBeNull();
  });

  it('uses the outer border for connections', () => {
    const board = makeBoard([
      ['a', 'x', 'a'],
      ['x', 'x', 'x'],
      [null, 'x', 'x'],
    ]);
    const path = board.findPath({ row: 0, col: 0 }, { row: 0, col: 2 });

    expect(path).not.toBeNull();
    expect(path!.some((point) => point.row === -1)).toBe(true);
  });
});

describe('Board.findHint', () => {
  it('returns a connectable pair or null', () => {
    const withMove = makeBoard([
      ['a', 'a'],
      [null, null],
    ]);
    expect(withMove.findHint()).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);

    const empty = makeBoard([[null, null]]);
    expect(empty.findHint()).toBeNull();
  });
});

describe('Board.shuffle', () => {
  it('keeps positions and the kind multiset while looking for a move', () => {
    const board = Board.create(4, 4, ['a', 'b', 'c', 'd'], mulberry32(7));
    const before = board.remainingTiles().map((tile) => ({
      id: tile.id,
      row: tile.row,
      col: tile.col,
    }));
    const beforeCounts = countKinds(board);

    const result = board.shuffle();

    expect(result).toBe(true);
    expect(
      board.remainingTiles().map((tile) => ({
        id: tile.id,
        row: tile.row,
        col: tile.col,
      })),
    ).toEqual(before);
    expect(countKinds(board)).toEqual(beforeCounts);
  });
});

function countKinds(board: Board): Record<string, number> {
  return board.remainingTiles().reduce<Record<string, number>>((counts, tile) => {
    counts[tile.kind] = (counts[tile.kind] ?? 0) + 1;
    return counts;
  }, {});
}
