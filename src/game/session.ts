import { TILE_KINDS } from '../content/tile-kinds';
import {
  createLayout,
  LEVELS,
  type Difficulty,
  type LayoutDefinition,
} from '../content/layouts';
import { Board, type Point, type Tile } from '../core/board';
import { mulberry32, randomSeed, shuffleInPlace, type Rng } from '../core/rng';

export type Phase =
  | 'playing'
  | 'paused'
  | 'cards'
  | 'won'
  | 'completed'
  | 'lost';

export type LossReason = 'timeout' | 'no-moves' | null;

export interface CardReward {
  readonly kind: 'time' | 'shuffle' | 'hint';
  readonly amount: number;
}

export interface CardEntry {
  readonly reward: CardReward;
  readonly revealed: boolean;
}

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
  readonly difficulty?: Difficulty;
  readonly levelIndex?: number;
  readonly seed?: number;
  /** Test seam: supply a prepared board instead of generating one. */
  readonly board?: Board;
}

export interface SessionStats {
  readonly hints: number;
  readonly shuffles: number;
  readonly matches: number;
}

const MATCH_TIME_MS: Record<Difficulty, number> = {
  0: 6000,
  1: 4000,
  2: 3000,
};

const CARD_PICK_TABLES: Record<Difficulty, ReadonlyArray<number>> = {
  0: [1, 1, 1, 1, 2, 2, 2, 3, 3, 3],
  1: [1, 1, 1, 1, 1, 1, 2, 2, 2, 3],
  2: [1, 1, 1, 1, 1, 1, 1, 2, 2, 3],
};

const CARD_REWARDS: ReadonlyArray<CardReward> = [
  { kind: 'time', amount: 10_000 },
  { kind: 'time', amount: 10_000 },
  { kind: 'time', amount: 10_000 },
  { kind: 'time', amount: 15_000 },
  { kind: 'time', amount: 15_000 },
  { kind: 'time', amount: 20_000 },
  { kind: 'shuffle', amount: 1 },
  { kind: 'shuffle', amount: 1 },
  { kind: 'shuffle', amount: 1 },
  { kind: 'shuffle', amount: 2 },
  { kind: 'shuffle', amount: 2 },
  { kind: 'shuffle', amount: 3 },
  { kind: 'hint', amount: 1 },
  { kind: 'hint', amount: 1 },
  { kind: 'hint', amount: 1 },
  { kind: 'hint', amount: 2 },
  { kind: 'hint', amount: 2 },
  { kind: 'hint', amount: 3 },
];

export class GameSession {
  readonly difficulty: Difficulty;

  private readonly initialLayout: LayoutDefinition;
  private readonly initialLevelIndex: number;
  private rng: Rng;
  private gameBoard: Board;
  private currentLayout: LayoutDefinition;
  private currentLevelIndex: number;
  private currentPhase: Phase = 'playing';
  private selectedTile: Point | null = null;
  private currentScore = 0;
  private timeLeft: number;
  private hintUses = 0;
  private shuffleUses = 0;
  private matchCount = 0;
  private hintCount: number;
  private shuffleCount: number;
  private cachedHint: readonly [Point, Point] | null = null;
  private shownHint: readonly [Point, Point] | null = null;
  private currentChanceKind = '';
  private starCount = 0;
  private remainingPicks = 0;
  private cardEntries: CardEntry[] = [];
  private currentLossReason: LossReason = null;
  private currentLastBonus = 0;

  constructor(options: GameSessionOptions) {
    this.difficulty = options.difficulty ?? 1;
    this.currentLevelIndex = options.levelIndex ?? 0;
    if (this.currentLevelIndex < 0 || this.currentLevelIndex >= LEVELS.length) {
      throw new RangeError(`Level index must be between 0 and ${LEVELS.length - 1}.`);
    }
    this.initialLevelIndex = this.currentLevelIndex;
    this.initialLayout = options.layout;
    this.currentLayout = options.layout;
    this.rng = mulberry32(options.seed ?? randomSeed());
    this.gameBoard =
      options.board ??
      Board.create(
        this.currentLayout.rows,
        this.currentLayout.cols,
        this.currentLayout.kindIds,
        this.rng,
      );
    this.timeLeft = this.currentLayout.timeLimitMs;
    this.hintCount = this.difficulty === 0 ? 8 : 5;
    this.shuffleCount = this.difficulty === 0 ? 8 : 5;
    this.startBoardState();
  }

  get layout(): LayoutDefinition {
    return this.currentLayout;
  }

  get levelIndex(): number {
    return this.currentLevelIndex;
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

  get timeLeftMs(): number {
    return this.timeLeft;
  }

  get selected(): Point | null {
    return this.selectedTile ? { ...this.selectedTile } : null;
  }

  get hintResource(): number {
    return this.hintCount;
  }

  get shuffleResource(): number {
    return this.shuffleCount;
  }

  get activeHint(): readonly [Point, Point] | null {
    return copyPair(this.shownHint);
  }

  get chanceKind(): string {
    return this.currentChanceKind;
  }

  get stars(): number {
    return this.starCount;
  }

  get picksRemaining(): number {
    return this.remainingPicks;
  }

  get cards(): ReadonlyArray<CardEntry> {
    return this.cardEntries;
  }

  get lossReason(): LossReason {
    return this.currentLossReason;
  }

  get lastBonus(): number {
    return this.currentLastBonus;
  }

  get stats(): SessionStats {
    return {
      hints: this.hintUses,
      shuffles: this.shuffleUses,
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
      return { type: 'mismatch', reason: 'kind', tiles: [first, tile] };
    }

    const path = this.gameBoard.findPath(first, tile);
    if (!path) {
      this.selectedTile = null;
      return { type: 'mismatch', reason: 'blocked', tiles: [first, tile] };
    }

    this.gameBoard.removePair(first, tile);
    this.selectedTile = null;
    this.shownHint = null;
    this.matchCount += 1;
    this.currentLastBonus = 0;

    const points = this.pairScore();
    this.currentScore += points;
    this.timeLeft = Math.min(
      this.currentLayout.timeLimitMs,
      this.timeLeft + MATCH_TIME_MS[this.difficulty],
    );

    if (first.kind === this.currentChanceKind) {
      this.starCount += 1;
      if (this.starCount >= 3) {
        this.openCards();
        return {
          type: 'matched',
          tiles: [first, tile],
          path,
          points,
          phase: this.currentPhase,
        };
      }
    }

    if (this.gameBoard.isEmpty) {
      this.finishLevel();
    } else {
      this.finishNonFinalMatch();
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
      this.lose('timeout');
    }
    return this.currentPhase;
  }

  hint(): readonly [Point, Point] | null {
    if (
      this.currentPhase !== 'playing' ||
      this.hintCount === 0 ||
      this.shownHint ||
      !this.cachedHint
    ) {
      return null;
    }

    this.hintCount -= 1;
    this.hintUses += 1;
    this.shownHint = copyPair(this.cachedHint);
    return copyPair(this.shownHint);
  }

  shuffle(): boolean {
    if (this.currentPhase !== 'playing' || this.shuffleCount === 0) {
      return false;
    }

    this.selectedTile = null;
    const shuffled = this.gameBoard.shuffle();
    if (!shuffled) {
      this.lose('no-moves');
      return false;
    }
    this.shuffleCount -= 1;
    this.shuffleUses += 1;
    this.refreshHint();
    this.rerollChanceKind();
    return true;
  }

  pause(): void {
    if (this.currentPhase === 'playing' && this.shuffleCount > 0) {
      this.currentPhase = 'paused';
      this.selectedTile = null;
    }
  }

  resume(): void {
    if (this.currentPhase !== 'paused') {
      return;
    }

    if (!this.gameBoard.shuffle()) {
      this.lose('no-moves');
      return;
    }
    this.shuffleCount -= 1;
    this.shuffleUses += 1;
    this.refreshHint();
    this.currentPhase = 'playing';
  }

  continueLevel(): boolean {
    if (
      this.currentPhase !== 'won' ||
      this.currentLevelIndex >= LEVELS.length - 1
    ) {
      return false;
    }

    this.currentLevelIndex += 1;
    this.currentLayout = createLayout(this.difficulty, this.currentLevelIndex);
    this.hintCount += 1;
    if (this.difficulty !== 0) {
      this.shuffleCount += 1;
    }
    this.gameBoard = Board.create(
      this.currentLayout.rows,
      this.currentLayout.cols,
      this.currentLayout.kindIds,
      this.rng,
    );
    this.timeLeft = this.currentLayout.timeLimitMs;
    this.currentPhase = 'playing';
    this.currentLastBonus = 0;
    this.selectedTile = null;
    this.startBoardState();
    return true;
  }

  chooseCard(index: number): CardReward | null {
    if (this.currentPhase !== 'cards' || this.remainingPicks === 0) {
      return null;
    }
    const card = this.cardEntries[index];
    if (!card || card.revealed) {
      return null;
    }

    const reward = card.reward;
    this.cardEntries[index] = { reward, revealed: true };
    this.applyReward(reward);
    this.remainingPicks -= 1;

    if (this.remainingPicks === 0) {
      this.starCount = 0;
      if (this.gameBoard.isEmpty) {
        this.finishLevel();
      } else {
        this.gameBoard.rearrange(this.currentLevelIndex);
        if (!this.gameBoard.shuffle()) {
          this.lose('no-moves');
          return reward;
        }
        this.refreshHint();
        this.rerollChanceKind();
        this.currentPhase = 'playing';
      }
    }

    return reward;
  }

  restart(seed?: number): void {
    this.rng = mulberry32(seed ?? randomSeed());
    this.currentLevelIndex = this.initialLevelIndex;
    this.currentLayout = this.initialLayout;
    this.gameBoard = Board.create(
      this.currentLayout.rows,
      this.currentLayout.cols,
      this.currentLayout.kindIds,
      this.rng,
    );
    this.currentPhase = 'playing';
    this.selectedTile = null;
    this.currentScore = 0;
    this.timeLeft = this.currentLayout.timeLimitMs;
    this.hintUses = 0;
    this.shuffleUses = 0;
    this.matchCount = 0;
    this.hintCount = this.difficulty === 0 ? 8 : 5;
    this.shuffleCount = this.difficulty === 0 ? 8 : 5;
    this.starCount = 0;
    this.remainingPicks = 0;
    this.cardEntries = [];
    this.currentLossReason = null;
    this.currentLastBonus = 0;
    this.startBoardState();
  }

  private pairScore(): number {
    const factor = (this.difficulty + 1) * (this.currentLevelIndex + 1);
    return (this.difficulty + 1) * factor;
  }

  private finishNonFinalMatch(): void {
    this.gameBoard.rearrange(this.currentLevelIndex);
    this.refreshHint();
    if (!this.cachedHint) {
      if (this.shuffleCount === 0) {
        this.lose('no-moves');
        return;
      }
      this.shuffleCount -= 1;
      this.shuffleUses += 1;
      if (!this.gameBoard.shuffle()) {
        this.lose('no-moves');
        return;
      }
      this.refreshHint();
    }
    this.rerollChanceKind();
  }

  private finishLevel(): void {
    const factor = (this.difficulty + 1) * (this.currentLevelIndex + 1);
    const wholeSeconds = Math.floor((this.timeLeft - 1) / 1000);
    let bonus = 50 * factor + 2 * factor * wholeSeconds;

    if (this.currentLevelIndex === LEVELS.length - 1) {
      bonus +=
        (this.hintCount + 1) * (this.difficulty + 1) * 100 +
        (this.shuffleCount + 1) * (this.difficulty + 1) * 100 +
        (this.difficulty + 1) * 5000;
      this.hintCount = 0;
      this.shuffleCount = 0;
      this.currentPhase = 'completed';
    } else {
      this.currentPhase = 'won';
    }

    this.currentLastBonus = bonus;
    this.currentScore += bonus;
    this.timeLeft = 0;
    this.cachedHint = null;
    this.shownHint = null;
  }

  private openCards(): void {
    const picks = CARD_PICK_TABLES[this.difficulty];
    this.remainingPicks = picks[Math.floor(this.rng() * picks.length)]!;
    const rewards = CARD_REWARDS.map((reward) => ({ ...reward }));
    shuffleInPlace(rewards, this.rng);
    this.cardEntries = rewards.map((reward) => ({ reward, revealed: false }));
    this.currentPhase = 'cards';
  }

  private applyReward(reward: CardReward): void {
    if (reward.kind === 'time') {
      this.timeLeft = Math.min(
        this.currentLayout.timeLimitMs,
        this.timeLeft + reward.amount,
      );
    } else if (reward.kind === 'shuffle') {
      this.shuffleCount += reward.amount;
    } else {
      this.hintCount += reward.amount;
    }
  }

  private startBoardState(): void {
    if (!this.gameBoard.hasMoves() && !this.gameBoard.shuffle()) {
      this.lose('no-moves');
      this.cachedHint = null;
      return;
    }
    this.refreshHint();
    this.rerollChanceKind();
  }

  private refreshHint(): void {
    const wasActive = this.shownHint !== null;
    this.cachedHint = this.gameBoard.findHint();
    if (wasActive) {
      this.shownHint = copyPair(this.cachedHint);
    }
  }

  private rerollChanceKind(): void {
    const pool = TILE_KINDS.map((kind) => kind.id);
    if (pool.length === 0) {
      this.currentChanceKind = '';
      return;
    }
    this.currentChanceKind = pool[Math.floor(this.rng() * pool.length)]!;
  }

  private lose(reason: Exclude<LossReason, null>): void {
    this.currentPhase = 'lost';
    this.currentLossReason = reason;
    this.selectedTile = null;
    this.shownHint = null;
  }
}

function copyPair(
  pair: readonly [Point, Point] | null,
): readonly [Point, Point] | null {
  return pair ? [{ ...pair[0] }, { ...pair[1] }] : null;
}
