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
    const beforePositions = board.remainingTiles().map((tile) => ({
      row: tile.row,
      col: tile.col,
    }));
    const beforeIds = board.remainingTiles().map((tile) => tile.id).sort((a, b) => a - b);
    const beforeCounts = countKinds(board);

    const result = board.shuffle();

    expect(result).toBe(true);
    expect(
      board.remainingTiles().map((tile) => ({
        row: tile.row,
        col: tile.col,
      })),
    ).toEqual(beforePositions);
    expect(
      board.remainingTiles().map((tile) => tile.id).sort((a, b) => a - b),
    ).toEqual(beforeIds);
    expect(countKinds(board)).toEqual(beforeCounts);
  });

  it('falls back deterministically when bounded random attempts find no move', () => {
    const board = Board.fromGrid(
      [
        ['a', 'b'],
        ['b', 'a'],
      ],
      () => 0.99999,
    );
    const beforePositions = board.remainingTiles().map(({ row, col }) => ({
      row,
      col,
    }));
    const beforeCounts = countKinds(board);
    const beforeKindsById = Object.fromEntries(
      board.remainingTiles().map(({ id, kind }) => [id, kind]),
    );

    expect(board.hasMoves()).toBe(false);
    expect(board.shuffle()).toBe(true);

    expect(board.findHint()).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);
    expect(board.remainingTiles().map((tile) => tile.kind)).toEqual([
      'a',
      'a',
      'b',
      'b',
    ]);
    expect(board.remainingTiles().map((tile) => tile.id)).toEqual([1, 4, 3, 2]);
    expect(countKinds(board)).toEqual(beforeCounts);
    expect(
      Object.fromEntries(board.remainingTiles().map(({ id, kind }) => [id, kind])),
    ).toEqual(beforeKindsById);
    expect(board.remainingTiles().map(({ row, col }) => ({ row, col }))).toEqual(
      beforePositions,
    );
    for (const tile of board.remainingTiles()) {
      expect(board.tileAt(tile.row, tile.col)?.id).toBe(tile.id);
    }
  });
});

describe('Board.rearrange', () => {
  it.each(Array.from({ length: 11 }, (_, levelIndex) => levelIndex))(
    'applies the stable packing rules for level index %i',
    (levelIndex) => {
      const grid = markerGrid();
      const board = makeBoard(grid);
      const expected = rearrangeReference(idGrid(board), levelIndex);

      board.rearrange(levelIndex);

      expect(idGrid(board)).toEqual(expected);
      for (const tile of board.remainingTiles()) {
        expect(board.tileAt(tile.row, tile.col)?.id).toBe(tile.id);
      }
    },
  );

  it('rejects an unknown level index', () => {
    expect(() => makeBoard([['a', 'a']]).rearrange(11)).toThrow(/0 and 10/);
  });
});

function markerGrid(): ReadonlyArray<ReadonlyArray<string | null>> {
  const grid = Array.from({ length: 9 }, () =>
    Array.from<string | null>({ length: 16 }).fill(null),
  );
  for (const [row, col] of [
    [0, 1], [0, 6], [0, 9], [0, 14],
    [2, 3], [2, 12], [5, 2], [5, 7],
    [5, 10], [5, 15], [8, 0], [8, 13],
  ]) {
    grid[row]![col] = 'x';
  }
  return grid;
}

function idGrid(board: Board): (number | null)[][] {
  return Array.from({ length: board.rows }, (_, row) =>
    Array.from({ length: board.cols }, (_, col) => board.tileAt(row, col)?.id ?? null),
  );
}

function rearrangeReference(
  source: ReadonlyArray<ReadonlyArray<number | null>>,
  levelIndex: number,
): (number | null)[][] {
  const grid = source.map((row) => [...row]);
  const packRows = (leftDirection: 'left' | 'right', rightDirection = leftDirection) => {
    for (let row = 0; row < 9; row += 1) {
      packRow(grid, row, 0, rightDirection === leftDirection ? 15 : 7, leftDirection);
      if (rightDirection !== leftDirection) packRow(grid, row, 8, 15, rightDirection);
    }
  };
  const packColumns = (topDirection: 'up' | 'down', bottomDirection = topDirection) => {
    for (let col = 0; col < 16; col += 1) {
      packColumn(grid, col, 0, bottomDirection === topDirection ? 8 : 3, topDirection);
      if (bottomDirection !== topDirection) packColumn(grid, col, 4, 8, bottomDirection);
    }
  };

  switch (levelIndex) {
    case 0: break;
    case 1: packColumns('down'); break;
    case 2: packRows('left'); break;
    case 3: packColumns('up', 'down'); break;
    case 4: packRows('left', 'right'); break;
    case 5: packColumns('down', 'up'); break;
    case 6: packRows('right', 'left'); break;
    case 7:
      for (let col = 0; col < 16; col += 1) packColumn(grid, col, 0, 8, col < 8 ? 'down' : 'up');
      break;
    case 8:
      for (let row = 0; row < 9; row += 1) packRow(grid, row, 0, 15, row < 4 ? 'left' : 'right');
      break;
    case 9: packRows('left', 'right'); packColumns('up', 'down'); break;
    case 10: packRows('right', 'left'); packColumns('down', 'up'); break;
  }
  return grid;
}

function packRow(
  grid: (number | null)[][],
  row: number,
  start: number,
  end: number,
  direction: 'left' | 'right',
): void {
  const values = grid[row]!.slice(start, end + 1).filter((value): value is number => value !== null);
  grid[row]!.fill(null, start, end + 1);
  const offset = direction === 'left' ? start : end - values.length + 1;
  values.forEach((value, index) => { grid[row]![offset + index] = value; });
}

function packColumn(
  grid: (number | null)[][],
  col: number,
  start: number,
  end: number,
  direction: 'up' | 'down',
): void {
  const values = grid.slice(start, end + 1).map((row) => row[col]).filter((value): value is number => value !== null);
  for (let row = start; row <= end; row += 1) grid[row]![col] = null;
  const offset = direction === 'up' ? start : end - values.length + 1;
  values.forEach((value, index) => { grid[offset + index]![col] = value; });
}

function countKinds(board: Board): Record<string, number> {
  return board.remainingTiles().reduce<Record<string, number>>((counts, tile) => {
    counts[tile.kind] = (counts[tile.kind] ?? 0) + 1;
    return counts;
  }, {});
}
