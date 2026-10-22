import { tileKind } from '../content/tile-kinds';
import type { Point } from '../core/board';
import { GameSession, HINT_COST, type Phase } from '../game/session';

interface ModalOptions {
  readonly mode: 'pause' | 'result';
  readonly kicker: string;
  readonly title: string;
  readonly copy: string;
  readonly stats: ReadonlyArray<readonly [string, string]>;
  readonly primaryLabel: string;
  readonly secondaryLabel?: string;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element #${id}`);
  }
  return element as T;
}

function svgElement<K extends keyof SVGElementTagNameMap>(
  name: K,
): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, name);
}

function formatClock(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export class GameView {
  private readonly session: GameSession;

  private readonly boardElement = byId<HTMLDivElement>('board');
  private readonly pathLayer = document.querySelector<SVGSVGElement>('#path-layer');
  private readonly statusElement = byId<HTMLParagraphElement>('status');
  private readonly timeElement = byId<HTMLElement>('time');
  private readonly scoreElement = byId<HTMLElement>('score');
  private readonly remainingElement = byId<HTMLElement>('remaining');
  private readonly comboElement = byId<HTMLElement>('combo');
  private readonly timerFill = byId<HTMLDivElement>('timer-fill');
  private readonly timeStat = document.querySelector<HTMLElement>(
    '.hud__item--time',
  );
  private readonly boardNote = byId<HTMLParagraphElement>('board-note');

  private readonly modal = byId<HTMLDialogElement>('modal');
  private readonly modalKicker = byId<HTMLElement>('modal-kicker');
  private readonly modalTitle = byId<HTMLElement>('modal-title');
  private readonly modalCopy = byId<HTMLElement>('modal-copy');
  private readonly modalStats = byId<HTMLDListElement>('modal-stats');
  private readonly modalPrimary = byId<HTMLButtonElement>('modal-primary');
  private readonly modalSecondary = byId<HTMLButtonElement>('modal-secondary');

  private lastFrame = performance.now();
  private lastPhase: Phase;
  private pathTimer = 0;
  private flashTimer = 0;
  private resultTimer = 0;
  private modalMode: 'pause' | 'result' | null = null;

  constructor(session: GameSession) {
    if (!this.pathLayer || !this.timeStat) {
      throw new Error('The game shell is incomplete.');
    }

    this.session = session;
    this.lastPhase = session.phase;
    this.boardNote.textContent = `棋盤 ${session.layout.cols} × ${session.layout.rows} · 原型規則：直線或最多兩次轉彎 · 外框可通行`;
    this.boardElement.style.setProperty('--grid-cols', String(session.layout.cols + 2));
    this.boardElement.style.setProperty('--grid-rows', String(session.layout.rows + 2));
    this.boardElement.style.aspectRatio = `${session.layout.cols + 2} / ${session.layout.rows + 2}`;
    this.boardElement.parentElement?.style.setProperty(
      '--ratio',
      String((session.layout.cols + 2) / (session.layout.rows + 2)),
    );

    this.bindEvents();
    this.render();
    requestAnimationFrame(this.frame);
  }

  private bindEvents(): void {
    this.boardElement.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const button = target.closest<HTMLButtonElement>('button.tile');
      if (!button) {
        return;
      }
      const row = Number(button.dataset.row);
      const col = Number(button.dataset.col);
      if (!Number.isInteger(row) || !Number.isInteger(col)) {
        return;
      }
      this.handleSelection(row, col);
    });

    byId<HTMLButtonElement>('hint').addEventListener('click', () => {
      this.showHint();
    });
    byId<HTMLButtonElement>('shuffle').addEventListener('click', () => {
      this.shuffleBoard();
    });
    byId<HTMLButtonElement>('pause').addEventListener('click', () => {
      this.togglePause();
    });
    byId<HTMLButtonElement>('restart').addEventListener('click', () => {
      this.restart();
    });

    this.modalPrimary.addEventListener('click', () => {
      if (this.modalMode === 'pause') {
        this.resume();
      } else if (this.modalMode === 'result') {
        this.restart();
      }
    });

    this.modalSecondary.addEventListener('click', () => {
      if (this.modalMode === 'pause') {
        this.restart();
      }
    });

    this.modal.addEventListener('cancel', (event) => {
      event.preventDefault();
      if (this.modalMode === 'pause') {
        this.resume();
      }
    });

    document.addEventListener('keydown', (event) => {
      this.handleKeydown(event);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.session.phase === 'playing') {
        this.togglePause();
      }
    });
  }

  private handleKeydown(event: KeyboardEvent): void {
    if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        target.matches('input, textarea, select'))
    ) {
      return;
    }

    if (this.modal.open) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case 'h':
        event.preventDefault();
        this.showHint();
        break;
      case 's':
        event.preventDefault();
        this.shuffleBoard();
        break;
      case 'p':
        event.preventDefault();
        this.togglePause();
        break;
      case 'r':
        event.preventDefault();
        this.restart();
        break;
      case 'escape': {
        const selected = this.session.selected;
        if (selected) {
          this.session.clearSelection();
          this.renderBoard(selected);
          this.announce('已取消選取。');
        }
        break;
      }
      default:
        break;
    }
  }

  private handleSelection(row: number, col: number): void {
    const result = this.session.select(row, col);

    switch (result.type) {
      case 'ignored':
        return;
      case 'selected':
        this.renderBoard({ row, col });
        this.announce(
          `已選取${tileKind(result.tile.kind).label}，再選一個相同圖案。`,
        );
        return;
      case 'deselected':
        this.renderBoard({ row, col });
        this.announce('已取消選取。');
        return;
      case 'mismatch':
        this.renderBoard({ row, col });
        this.flashCells(result.tiles, 'tile--error', 380);
        this.announce(
          result.reason === 'kind'
            ? '圖案不同，連線取消。'
            : '這兩個方塊之間找不到兩彎以內的路徑。',
        );
        return;
      case 'matched':
        this.renderBoard();
        this.focusFirstTile();
        this.updateHud();
        this.drawPath(result.path);
        this.flashCells(result.tiles, 'tile--matched', 240);
        this.announce(`配對成功 +${result.points} 分。`);
        this.lastPhase = result.phase;
        if (result.phase === 'won') {
          window.clearTimeout(this.resultTimer);
          this.resultTimer = window.setTimeout(() => {
            this.openResult('won');
          }, 520);
        }
        return;
      default:
        return;
    }
  }

  private showHint(): void {
    if (this.session.phase !== 'playing') {
      return;
    }

    const pair = this.session.hint();
    if (!pair) {
      this.announce('目前沒有可連線的配對，試試洗牌。');
      return;
    }

    this.updateHud();
    this.flashCells(pair, 'tile--hint', 1400);
    this.announce(
      `已標示一組可連線的方塊（提示 -${HINT_COST} 分，剩餘 ${this.session.score} 分）。`,
    );
  }

  private shuffleBoard(): void {
    if (this.session.phase !== 'playing') {
      return;
    }

    const hasMoves = this.session.shuffle();
    this.render();
    this.focusFirstTile();
    this.announce(
      hasMoves
        ? '已重新洗牌。'
        : '洗牌後仍找不到可連線的組合，再按一次試試。',
    );
  }

  private togglePause(): void {
    if (this.session.phase === 'playing') {
      this.session.pause();
      this.renderBoard();
      this.openPause();
      return;
    }

    if (this.session.phase === 'paused') {
      this.resume();
    }
  }

  private resume(): void {
    this.closeModal();
    this.session.resume();
    this.lastFrame = performance.now();
    this.renderBoard();
    this.focusFirstTile();
    this.announce('繼續遊戲。');
  }

  private restart(): void {
    window.clearTimeout(this.resultTimer);
    window.clearTimeout(this.pathTimer);
    window.clearTimeout(this.flashTimer);
    this.closeModal();
    this.session.restart();
    this.lastPhase = this.session.phase;
    this.lastFrame = performance.now();
    this.clearPath();
    this.render();
    this.focusFirstTile();
    this.announce('新的一局，選取兩個相同圖案。');
  }

  private frame = (now: number): void => {
    const delta = Math.min(1000, Math.max(0, now - this.lastFrame));
    this.lastFrame = now;

    if (this.session.phase === 'playing') {
      const phase = this.session.tick(delta);
      this.updateClock();

      if (phase !== this.lastPhase) {
        this.lastPhase = phase;
        this.updateHud();
        if (phase === 'lost') {
          this.openResult('lost');
        }
      }
    }

    requestAnimationFrame(this.frame);
  };

  private render(): void {
    this.updateHud();
    this.renderBoard();
  }

  private renderBoard(focus?: Point): void {
    const { rows, cols } = this.session.board;
    const selected = this.session.selected;
    const fragment = document.createDocumentFragment();

    for (let gridRow = 0; gridRow < rows + 2; gridRow += 1) {
      for (let gridCol = 0; gridCol < cols + 2; gridCol += 1) {
        const row = gridRow - 1;
        const col = gridCol - 1;
        const inPlayfield =
          row >= 0 && row < rows && col >= 0 && col < cols;
        const tile = inPlayfield ? this.session.board.tileAt(row, col) : null;

        if (!tile) {
          const cell = document.createElement('div');
          cell.className = inPlayfield
            ? 'cell cell--empty'
            : 'cell cell--void';
          cell.setAttribute('aria-hidden', 'true');
          fragment.append(cell);
          continue;
        }

        const kind = tileKind(tile.kind);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tile';
        button.dataset.row = String(row);
        button.dataset.col = String(col);
        button.style.setProperty('--hue', String(kind.hue));
        button.setAttribute(
          'aria-label',
          `${kind.label}，第 ${row + 1} 列，第 ${col + 1} 欄`,
        );

        const isSelected =
          selected !== null &&
          selected.row === row &&
          selected.col === col;
        button.setAttribute('aria-pressed', String(isSelected));
        if (isSelected) {
          button.classList.add('tile--selected');
        }
        if (this.session.phase !== 'playing') {
          button.disabled = true;
        }

        const glyph = document.createElement('span');
        glyph.className = 'tile__glyph';
        glyph.textContent = kind.glyph;
        glyph.setAttribute('aria-hidden', 'true');
        button.append(glyph);
        fragment.append(button);
      }
    }

    this.boardElement.replaceChildren(fragment);
    this.boardElement.style.setProperty(
      '--grid-cols',
      String(cols + 2),
    );
    this.boardElement.style.setProperty(
      '--grid-rows',
      String(rows + 2),
    );
    this.boardElement.style.aspectRatio = `${cols + 2} / ${rows + 2}`;
    this.pathLayer?.setAttribute(
      'viewBox',
      `0 0 ${cols + 2} ${rows + 2}`,
    );

    if (focus) {
      this.findTile(focus)?.focus();
    }
  }

  private findTile(point: Point): HTMLButtonElement | null {
    return this.boardElement.querySelector<HTMLButtonElement>(
      `button[data-row="${point.row}"][data-col="${point.col}"]`,
    );
  }

  private focusFirstTile(): void {
    const first = this.boardElement.querySelector<HTMLButtonElement>('button.tile');
    (first ?? this.boardElement).focus();
  }

  private updateHud(): void {
    this.scoreElement.textContent = String(this.session.score);
    this.remainingElement.textContent = String(
      this.session.board.remainingCount,
    );
    this.comboElement.textContent = `×${this.session.combo}`;
    this.updateClock();
  }

  private updateClock(): void {
    const { timeLimitMs } = this.session.layout;
    const remaining = this.session.timeLeftMs;
    this.timeElement.textContent = formatClock(remaining);
    const ratio = timeLimitMs > 0 ? remaining / timeLimitMs : 0;
    this.timerFill.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
    this.timeStat?.classList.toggle('is-low', remaining <= 30_000);
  }

  private drawPath(path: ReadonlyArray<Point>): void {
    if (!this.pathLayer) {
      return;
    }

    const points = path
      .map((point) => `${point.col + 1.5},${point.row + 1.5}`)
      .join(' ');

    const halo = svgElement('polyline');
    halo.setAttribute('points', points);
    halo.setAttribute('class', 'path path--halo');

    const line = svgElement('polyline');
    line.setAttribute('points', points);
    line.setAttribute('class', 'path path--line');

    const nodes: SVGElement[] = [halo, line];
    const first = path[0];
    const last = path[path.length - 1];

    for (const point of [first, last]) {
      if (!point) {
        continue;
      }
      const haloDot = svgElement('circle');
      haloDot.setAttribute('cx', String(point.col + 1.5));
      haloDot.setAttribute('cy', String(point.row + 1.5));
      haloDot.setAttribute('r', '0.18');
      haloDot.setAttribute('class', 'path-dot path-dot--halo');

      const dot = svgElement('circle');
      dot.setAttribute('cx', String(point.col + 1.5));
      dot.setAttribute('cy', String(point.row + 1.5));
      dot.setAttribute('r', '0.1');
      dot.setAttribute('class', 'path-dot');
      nodes.push(haloDot, dot);
    }

    this.pathLayer.replaceChildren(...nodes);
    window.clearTimeout(this.pathTimer);
    this.pathTimer = window.setTimeout(() => {
      this.clearPath();
    }, 480);
  }

  private clearPath(): void {
    this.pathLayer?.replaceChildren();
  }

  private flashCells(
    points: ReadonlyArray<Point>,
    className: string,
    duration: number,
  ): void {
    window.clearTimeout(this.flashTimer);
    const elements: HTMLElement[] = [];

    for (const point of points) {
      const element = this.boardElement.querySelector<HTMLElement>(
        `button[data-row="${point.row}"][data-col="${point.col}"]`,
      );
      if (element) {
        element.classList.add(className);
        elements.push(element);
      }
    }

    this.flashTimer = window.setTimeout(() => {
      for (const element of elements) {
        element.classList.remove(className);
      }
    }, duration);
  }

  private openPause(): void {
    this.openModal({
      mode: 'pause',
      kicker: '已暫停',
      title: '先喘口氣。',
      copy: '計時器已停下。準備好再回到棋盤。',
      stats: this.modalStatsForSession(),
      primaryLabel: '繼續遊戲',
      secondaryLabel: '重新開始',
    });
  }

  private openResult(phase: 'won' | 'lost'): void {
    const remainingPairs = Math.ceil(this.session.board.remainingCount / 2);
    const won = phase === 'won';

    this.openModal({
      mode: 'result',
      kicker: won ? 'clear' : 'time up',
      title: won ? '全部配對完成。' : '時間到。',
      copy: won
        ? '棋盤已經清空。這一局的分數與節奏，會成為之後調整規則的基準。'
        : `還剩下 ${remainingPairs} 組方塊。重新整理節奏，再試一次。`,
      stats: this.modalStatsForSession(),
      primaryLabel: '再玩一次',
    });
  }

  private modalStatsForSession(): Array<readonly [string, string]> {
    const stats = this.session.stats;
    return [
      ['分數', String(stats.score)],
      ['最高連擊', `×${stats.bestCombo}`],
      ['剩餘時間', formatClock(this.session.timeLeftMs)],
      ['提示 / 洗牌', `${stats.hints} / ${stats.shuffles}`],
    ];
  }

  private openModal(options: ModalOptions): void {
    this.modalMode = options.mode;
    this.modalKicker.textContent = options.kicker;
    this.modalTitle.textContent = options.title;
    this.modalCopy.textContent = options.copy;

    const stats = document.createDocumentFragment();
    for (const [label, value] of options.stats) {
      const item = document.createElement('div');
      item.className = 'modal__stat';

      const term = document.createElement('dt');
      term.textContent = label;
      const description = document.createElement('dd');
      description.textContent = value;

      item.append(term, description);
      stats.append(item);
    }
    this.modalStats.replaceChildren(stats);

    this.modalPrimary.textContent = options.primaryLabel;

    if (options.secondaryLabel) {
      this.modalSecondary.hidden = false;
      this.modalSecondary.textContent = options.secondaryLabel;
    } else {
      this.modalSecondary.hidden = true;
    }

    if (this.modal.open) {
      this.modal.close();
    }
    this.modal.showModal();
    this.modalPrimary.focus();
  }

  private closeModal(): void {
    this.modalMode = null;
    if (this.modal.open) {
      this.modal.close();
    }
  }

  private announce(message: string): void {
    this.statusElement.textContent = message;
  }
}
