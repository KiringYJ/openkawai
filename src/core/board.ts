import { shuffleInPlace, type Rng } from './rng';

export interface Point {
  readonly row: number;
  readonly col: number;
}

export interface Tile extends Point {
  readonly id: number;
  kind: string;
  row: number;
  col: number;
}

type KindGrid = ReadonlyArray<ReadonlyArray<string | null>>;

interface SearchState {
  readonly row: number;
  readonly col: number;
  readonly direction: number;
  readonly turns: number;
  readonly path: ReadonlyArray<Point>;
}

const DIRECTIONS = [
  { row: -1, col: 0 },
  { row: 0, col: 1 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
] as const;

const MAX_TURNS = 2;

/**
 * A rectangular board with a one-cell empty border.
 *
 * Public coordinates are 0-based over the playable area. Paths returned by
 * `findPath` may contain border coordinates (-1 or rows/cols), because the
 * original game lets connections travel around the outside of the board.
 */
export class Board {
  readonly rows: number;
  readonly cols: number;

  private readonly cells: (Tile | null)[][];
  private nextId = 1;
  private remaining: number;

  private constructor(grid: KindGrid, private readonly rng: Rng) {
    this.rows = grid.length;
    const firstRow = grid[0];
    if (!firstRow || firstRow.length === 0) {
      throw new Error('Board requires at least one cell.');
    }

    this.cols = firstRow.length;
    this.cells = Array.from({ length: this.rows + 2 }, () =>
      Array.from({ length: this.cols + 2 }, () => null),
    );

    const counts = new Map<string, number>();
    let remaining = 0;

    for (let row = 0; row < this.rows; row += 1) {
      const sourceRow = grid[row];
      if (!sourceRow || sourceRow.length !== this.cols) {
        throw new Error('Board rows must all have the same width.');
      }

      for (let col = 0; col < this.cols; col += 1) {
        const kind = sourceRow[col] ?? null;
        if (kind === null) {
          continue;
        }

        const tile: Tile = {
          id: this.nextId,
          kind,
          row,
          col,
        };
        this.nextId += 1;
        this.cells[row + 1]![col + 1] = tile;
        counts.set(kind, (counts.get(kind) ?? 0) + 1);
        remaining += 1;
      }
    }

    for (const [kind, count] of counts) {
      if (count % 2 !== 0) {
        throw new Error(`Tile kind "${kind}" has an odd count (${count}).`);
      }
    }

    this.remaining = remaining;
  }

  /**
   * Build a full rectangular board from a list of tile kinds. Each kind is
   * repeated in pairs until the board is full, then the resulting pool is
   * shuffled.
   */
  static create(
    rows: number,
    cols: number,
    kinds: ReadonlyArray<string>,
    rng: Rng,
  ): Board {
    if (rows < 1 || cols < 1) {
      throw new Error('Board dimensions must be positive.');
    }
    if ((rows * cols) % 2 !== 0) {
      throw new Error('Board must contain an even number of cells.');
    }
    if (kinds.length === 0) {
      throw new Error('Board requires at least one tile kind.');
    }

    const pool: string[] = [];
    const pairCount = (rows * cols) / 2;
    for (let pair = 0; pair < pairCount; pair += 1) {
      const kind = kinds[pair % kinds.length]!;
      pool.push(kind, kind);
    }
    shuffleInPlace(pool, rng);

    const grid: string[][] = [];
    for (let row = 0; row < rows; row += 1) {
      grid.push(pool.slice(row * cols, (row + 1) * cols));
    }

    return new Board(grid, rng);
  }

  /**
   * Build a board from an explicit kind grid. `null` represents a hole.
   * Mostly useful for tests and for future non-rectangular layouts.
   */
  static fromGrid(grid: KindGrid, rng: Rng): Board {
    return new Board(grid, rng);
  }

  get remainingCount(): number {
    return this.remaining;
  }

  get isEmpty(): boolean {
    return this.remaining === 0;
  }

  tileAt(row: number, col: number): Tile | null {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return null;
    }
    return this.cells[row + 1]![col + 1] ?? null;
  }

  remainingTiles(): Tile[] {
    const tiles: Tile[] = [];
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const tile = this.cells[row + 1]![col + 1];
        if (tile) {
          tiles.push(tile);
        }
      }
    }
    return tiles;
  }

  /**
   * Find a connection with at most two turns. Returns a simplified polyline
   * whose first and last points are the selected tiles. Border coordinates are
   * allowed; the UI maps them into its outer ring.
   */
  findPath(a: Point, b: Point): Point[] | null {
    const first = this.tileAt(a.row, a.col);
    const second = this.tileAt(b.row, b.col);
    if (!first || !second || first.kind !== second.kind) {
      return null;
    }
    if (first.row === second.row && first.col === second.col) {
      return null;
    }

    const targetRow = second.row + 1;
    const targetCol = second.col + 1;
    const start: SearchState = {
      row: first.row + 1,
      col: first.col + 1,
      direction: -1,
      turns: 0,
      path: [{ row: first.row + 1, col: first.col + 1 }],
    };

    const queue: SearchState[] = [start];
    const seen = new Set<string>([`${start.row},${start.col},-1,0`]);
    let head = 0;

    while (head < queue.length) {
      const state = queue[head];
      head += 1;
      if (!state) {
        continue;
      }

      for (let direction = 0; direction < DIRECTIONS.length; direction += 1) {
        if (
          state.direction !== -1 &&
          direction === (state.direction + 2) % DIRECTIONS.length
        ) {
          continue;
        }

        const turns =
          state.direction === -1 || direction === state.direction
            ? state.turns
            : state.turns + 1;
        if (turns > MAX_TURNS) {
          continue;
        }

        const step = DIRECTIONS[direction]!;
        const nextRow = state.row + step.row;
        const nextCol = state.col + step.col;

        if (
          nextRow < 0 ||
          nextRow >= this.rows + 2 ||
          nextCol < 0 ||
          nextCol >= this.cols + 2
        ) {
          continue;
        }

        const nextPath = [
          ...state.path,
          { row: nextRow, col: nextCol } as const,
        ];

        if (nextRow === targetRow && nextCol === targetCol) {
          return simplifyPath(nextPath).map((point) => ({
            row: point.row - 1,
            col: point.col - 1,
          }));
        }

        if (this.cells[nextRow]![nextCol] !== null) {
          continue;
        }

        const key = `${nextRow},${nextCol},${direction},${turns}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);

        queue.push({
          row: nextRow,
          col: nextCol,
          direction,
          turns,
          path: nextPath,
        });
      }
    }

    return null;
  }

  /**
   * Find any currently connectable pair. Tiles are scanned row-major so a
   * deterministic board yields a deterministic hint.
   */
  findHint(): [Point, Point] | null {
    const tiles = this.remainingTiles();
    for (let first = 0; first < tiles.length; first += 1) {
      const a = tiles[first];
      if (!a) {
        continue;
      }
      for (let second = first + 1; second < tiles.length; second += 1) {
        const b = tiles[second];
        if (!b || a.kind !== b.kind) {
          continue;
        }
        if (this.findPath(a, b)) {
          return [
            { row: a.row, col: a.col },
            { row: b.row, col: b.col },
          ];
        }
      }
    }
    return null;
  }

  hasMoves(): boolean {
    return this.findHint() !== null;
  }

  /**
   * Re-deal the remaining tiles into the currently occupied cells. Board
   * geometry never changes, so a shuffle cannot alter the layout. Whole tile
   * records move, preserving each tile's stable ID and kind.
   *
   * Returns true when the resulting board has at least one legal move. If the
   * bounded random search fails, a deterministic whole-tile swap places a
   * matching pair in the first two occupied cells.
   */
  shuffle(): boolean {
    const tiles = this.remainingTiles();
    if (tiles.length < 2) {
      return false;
    }

    const positions = tiles.map((tile) => ({ row: tile.row, col: tile.col }));
    const shuffledTiles = [...tiles];

    for (let attempt = 0; attempt < 128; attempt += 1) {
      shuffleInPlace(shuffledTiles, this.rng);
      for (let index = 0; index < tiles.length; index += 1) {
        const position = positions[index]!;
        const tile = shuffledTiles[index]!;
        this.cells[position.row + 1]![position.col + 1] = tile;
        tile.row = position.row;
        tile.col = position.col;
      }
      if (this.hasMoves()) {
        return true;
      }
    }

    for (let index = 0; index < tiles.length; index += 1) {
      const position = positions[index]!;
      const tile = tiles[index]!;
      this.cells[position.row + 1]![position.col + 1] = tile;
      tile.row = position.row;
      tile.col = position.col;
    }

    // The first two row-major occupied cells can always connect through the
    // empty rows above them (or with one turn when only the first lies in that
    // row). Put a whole matching tile in the second cell as a deterministic
    // fallback, preserving the identity-to-kind mapping.
    const first = tiles[0]!;
    const second = tiles[1]!;
    if (first.kind === second.kind) {
      return this.findPath(first, second) !== null;
    }

    const donor = tiles.slice(2).find((tile) => tile.kind === first.kind);
    if (!donor) {
      return false;
    }
    const secondPosition = { row: second.row, col: second.col };
    const donorPosition = { row: donor.row, col: donor.col };
    this.cells[secondPosition.row + 1]![secondPosition.col + 1] = donor;
    this.cells[donorPosition.row + 1]![donorPosition.col + 1] = second;
    donor.row = secondPosition.row;
    donor.col = secondPosition.col;
    second.row = donorPosition.row;
    second.col = donorPosition.col;

    return this.findPath(first, donor) !== null;
  }

  /** Apply the confirmed post-match packing rule for a zero-based level. */
  rearrange(levelIndex: number): void {
    switch (levelIndex) {
      case 0:
        return;
      case 1:
        this.packAllColumns('down');
        return;
      case 2:
        this.packAllRows('left');
        return;
      case 3:
        this.packColumnsOutward();
        return;
      case 4:
        this.packRowsOutward();
        return;
      case 5:
        this.packColumnsInward();
        return;
      case 6:
        this.packRowsInward();
        return;
      case 7:
        for (let col = 0; col < this.cols; col += 1) {
          this.packColumn(col, 0, this.rows - 1, col < 8 ? 'down' : 'up');
        }
        return;
      case 8:
        for (let row = 0; row < this.rows; row += 1) {
          this.packRow(row, 0, this.cols - 1, row < 4 ? 'left' : 'right');
        }
        return;
      case 9:
        this.packRowsOutward();
        this.packColumnsOutward();
        return;
      case 10:
        this.packRowsInward();
        this.packColumnsInward();
        return;
      default:
        throw new RangeError('Level index must be between 0 and 10.');
    }
  }

  removePair(a: Point, b: Point): [Tile, Tile] | null {
    const first = this.tileAt(a.row, a.col);
    const second = this.tileAt(b.row, b.col);
    if (!first || !second || first.kind !== second.kind) {
      return null;
    }
    if (first.row === second.row && first.col === second.col) {
      return null;
    }

    this.cells[first.row + 1]![first.col + 1] = null;
    this.cells[second.row + 1]![second.col + 1] = null;
    this.remaining -= 2;
    return [first, second];
  }

  private packAllRows(direction: 'left' | 'right'): void {
    for (let row = 0; row < this.rows; row += 1) {
      this.packRow(row, 0, this.cols - 1, direction);
    }
  }

  private packAllColumns(direction: 'up' | 'down'): void {
    for (let col = 0; col < this.cols; col += 1) {
      this.packColumn(col, 0, this.rows - 1, direction);
    }
  }

  private packRowsOutward(): void {
    const split = Math.min(8, this.cols);
    for (let row = 0; row < this.rows; row += 1) {
      this.packRow(row, 0, split - 1, 'left');
      if (split < this.cols) {
        this.packRow(row, split, this.cols - 1, 'right');
      }
    }
  }

  private packRowsInward(): void {
    const split = Math.min(8, this.cols);
    for (let row = 0; row < this.rows; row += 1) {
      this.packRow(row, 0, split - 1, 'right');
      if (split < this.cols) {
        this.packRow(row, split, this.cols - 1, 'left');
      }
    }
  }

  private packColumnsOutward(): void {
    const split = Math.min(4, this.rows);
    for (let col = 0; col < this.cols; col += 1) {
      this.packColumn(col, 0, split - 1, 'up');
      if (split < this.rows) {
        this.packColumn(col, split, this.rows - 1, 'down');
      }
    }
  }

  private packColumnsInward(): void {
    const split = Math.min(4, this.rows);
    for (let col = 0; col < this.cols; col += 1) {
      this.packColumn(col, 0, split - 1, 'down');
      if (split < this.rows) {
        this.packColumn(col, split, this.rows - 1, 'up');
      }
    }
  }

  private packRow(
    row: number,
    startCol: number,
    endCol: number,
    direction: 'left' | 'right',
  ): void {
    const tiles: Tile[] = [];
    for (let col = startCol; col <= endCol; col += 1) {
      const tile = this.tileAt(row, col);
      if (tile) {
        tiles.push(tile);
      }
      this.cells[row + 1]![col + 1] = null;
    }

    const destination =
      direction === 'left' ? startCol : endCol - tiles.length + 1;
    for (let index = 0; index < tiles.length; index += 1) {
      const tile = tiles[index]!;
      const col = destination + index;
      this.cells[row + 1]![col + 1] = tile;
      tile.row = row;
      tile.col = col;
    }
  }

  private packColumn(
    col: number,
    startRow: number,
    endRow: number,
    direction: 'up' | 'down',
  ): void {
    const tiles: Tile[] = [];
    for (let row = startRow; row <= endRow; row += 1) {
      const tile = this.tileAt(row, col);
      if (tile) {
        tiles.push(tile);
      }
      this.cells[row + 1]![col + 1] = null;
    }

    const destination = direction === 'up' ? startRow : endRow - tiles.length + 1;
    for (let index = 0; index < tiles.length; index += 1) {
      const tile = tiles[index]!;
      const row = destination + index;
      this.cells[row + 1]![col + 1] = tile;
      tile.row = row;
      tile.col = col;
    }
  }
}

function simplifyPath(points: ReadonlyArray<Point>): Point[] {
  if (points.length <= 2) {
    return [...points];
  }

  const simplified: Point[] = [points[0]!];

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    const next = points[index + 1]!;

    const firstDirection = {
      row: current.row - previous.row,
      col: current.col - previous.col,
    };
    const secondDirection = {
      row: next.row - current.row,
      col: next.col - current.col,
    };

    if (
      firstDirection.row !== secondDirection.row ||
      firstDirection.col !== secondDirection.col
    ) {
      simplified.push(current);
    }
  }

  simplified.push(points[points.length - 1]!);
  return simplified;
}
