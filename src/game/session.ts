import { Board, type Point, type Tile } from '../core/board';
import { mulberry32, randomSeed, type Rng } from '../core/rng';
import type { LayoutDefinition } from '../content/layouts';

export const SCORE_BASE = 100;
export const SCORE_COMBO_STEP = 25;
export const HINT_COST = 25;

export type Phase = 'playing' | 'paused' | 'won' | 'lost';

export type SelectionResult =
  | { readonly type: 'ignored' }
  | { readonly type: 'selected'; readonly tile: Tile }
  | { readonly type: 'deselected' }
  | {
      readonly type: 'mismatch';
      readonly reason: 'kind' | 'blocked';
      readonly tiles: readonly [Tile, Tile];
    }
  | {
      readonly type: 'matched';
      readonly tiles: readonly [Tile, Tile];
      readonly path: readonly Point[];
      readonly points: number;
      readonly phase: Phase;
    };

export interface GameSessionOptions {
  readonly layout: LayoutDefinition;
  readonly seed?: number;
  /** Test seam: supply a prepared board instead of generating one. */
  readonly board?: Board;
}

export interface SessionStats {
  readonly score: number;
  readonly combo: number;
  readonly bestCombo: number;
  readonly hints: number;
  readonly shuffles: number;
  readonly matches: number;
}

export class GameSession {
  readonly layout: LayoutDefinition;

  private rng: Rng;
  private gameBoard: Board;
  private currentPhase: Phase = 'playing';
  private selectedTile: Point | null = null;
  private currentScore = 0;
  private currentCombo = 0;
  private currentBestCombo = 0;
  private timeLeft: number;
  private hintCount = 0;
  private shuffleCount = 0;
  private matchCount = 0;

  constructor(options: GameSessionOptions) {
    this.layout = options.layout;
    this.rng = mulberry32(options.seed ?? randomSeed());
    this.gameBoard =
      options.board ??
      Board.create(
        options.layout.rows,
        options.layout.cols,
        options.layout.kindIds,
        this.rng,
      );
    this.timeLeft = options.layout.timeLimitMs;
  }

  get board(): Board {
    return this.gameBoard;
  }

  get phase(): Phase {
    return this.currentPhase;
  }

  get score(): number {
    return this.currentScore;
  }

  get combo(): number {
    return this.currentCombo;
  }

  get bestCombo(): number {
    return this.currentBestCombo;
  }

  get timeLeftMs(): number {
    return this.timeLeft;
  }

  get selected(): Point | null {
    return this.selectedTile
      ? { row: this.selectedTile.row, col: this.selectedTile.col }
      : null;
  }

  get stats(): SessionStats {
    return {
      score: this.currentScore,
      combo: this.currentCombo,
      bestCombo: this.currentBestCombo,
      hints: this.hintCount,
      shuffles: this.shuffleCount,
      matches: this.matchCount,
    };
  }

  select(row: number, col: number): SelectionResult {
    if (this.currentPhase !== 'playing') {
      return { type: 'ignored' };
    }

    const tile = this.gameBoard.tileAt(row, col);
    if (!tile) {
      return { type: 'ignored' };
    }

    const selected = this.selectedTile;
    if (!selected) {
      this.selectedTile = { row, col };
      return { type: 'selected', tile };
    }

    if (selected.row === row && selected.col === col) {
      this.selectedTile = null;
      return { type: 'deselected' };
    }

    const first = this.gameBoard.tileAt(selected.row, selected.col);
    if (!first) {
      this.selectedTile = { row, col };
      return { type: 'selected', tile };
    }

    if (first.kind !== tile.kind) {
      this.selectedTile = null;
      this.currentCombo = 0;
      return { type: 'mismatch', reason: 'kind', tiles: [first, tile] };
    }

    const path = this.gameBoard.findPath(first, tile);
    if (!path) {
      this.selectedTile = null;
      this.currentCombo = 0;
      return { type: 'mismatch', reason: 'blocked', tiles: [first, tile] };
    }

    this.gameBoard.removePair(first, tile);
    this.selectedTile = null;
    this.currentCombo += 1;
    this.currentBestCombo = Math.max(this.currentBestCombo, this.currentCombo);
    this.matchCount += 1;

    const points =
      SCORE_BASE + (this.currentCombo - 1) * SCORE_COMBO_STEP;
    this.currentScore += points;

    if (this.gameBoard.isEmpty) {
      this.currentPhase = 'won';
    }

    return {
      type: 'matched',
      tiles: [first, tile],
      path,
      points,
      phase: this.currentPhase,
    };
  }

  clearSelection(): void {
    this.selectedTile = null;
  }

  tick(deltaMs: number): Phase {
    if (this.currentPhase !== 'playing' || deltaMs <= 0) {
      return this.currentPhase;
    }

    this.timeLeft = Math.max(0, this.timeLeft - deltaMs);
    if (this.timeLeft === 0) {
      this.currentPhase = 'lost';
      this.selectedTile = null;
      this.currentCombo = 0;
    }
    return this.currentPhase;
  }

  hint(): readonly [Point, Point] | null {
    if (this.currentPhase !== 'playing') {
      return null;
    }

    const pair = this.gameBoard.findHint();
    if (!pair) {
      return null;
    }

    this.hintCount += 1;
    this.currentScore = Math.max(0, this.currentScore - HINT_COST);
    return pair;
  }

  shuffle(): boolean {
    if (this.currentPhase !== 'playing') {
      return false;
    }

    this.selectedTile = null;
    this.shuffleCount += 1;
    return this.gameBoard.shuffle();
  }

  pause(): void {
    if (this.currentPhase === 'playing') {
      this.currentPhase = 'paused';
      this.selectedTile = null;
    }
  }

  resume(): void {
    if (this.currentPhase === 'paused') {
      this.currentPhase = 'playing';
    }
  }

  restart(seed?: number): void {
    this.rng = mulberry32(seed ?? randomSeed());
    this.gameBoard = Board.create(
      this.layout.rows,
      this.layout.cols,
      this.layout.kindIds,
      this.rng,
    );
    this.currentPhase = 'playing';
    this.selectedTile = null;
    this.currentScore = 0;
    this.currentCombo = 0;
    this.currentBestCombo = 0;
    this.timeLeft = this.layout.timeLimitMs;
    this.hintCount = 0;
    this.shuffleCount = 0;
    this.matchCount = 0;
  }
}
