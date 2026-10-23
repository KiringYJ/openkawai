<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { VBtn } from 'vuetify/components';
import { type Board, type Point } from '../core/board';
import { tileKind } from '../content/tile-kinds';
import type { TileThemeId } from '../content/tile-themes';
import TileArtwork from './TileArtwork.vue';

const props = defineProps<{
  board: Board; revision: number; theme: TileThemeId; disabled: boolean;
  selected: Point | null; hint: readonly [Point, Point] | null;
  path: readonly Point[]; mismatch: readonly Point[];
}>();
const emit = defineEmits<{ select: [row: number, col: number]; cancel: [] }>();
const boardElement = ref<HTMLElement>();
const focused = ref<Point | null>(null);
const cells = computed(() => {
  void props.revision;
  return Array.from({ length: (props.board.rows + 2) * (props.board.cols + 2) }, (_, index) => {
    const row = Math.floor(index / (props.board.cols + 2)) - 1;
    const col = index % (props.board.cols + 2) - 1;
    const tile = props.board.tileAt(row, col);
    return {
      row, col, tile,
      exposedRight: tile !== null && props.board.tileAt(row, col + 1) === null,
      exposedBottom: tile !== null && props.board.tileAt(row + 1, col) === null,
    };
  });
});
const firstTile = computed(() => cells.value.find((cell) => cell.tile)?.tile);
const focusPoint = computed(() => {
  void props.revision;
  return focused.value && props.board.tileAt(focused.value.row, focused.value.col)
    ? focused.value : firstTile.value;
});
const same = (a: Point | null | undefined, b: Point) => a?.row === b.row && a?.col === b.col;
const points = computed(() => props.path.map((point) => `${point.col + 1.5},${point.row + 1.5}`).join(' '));

function focusTile(point: Point): void {
  focused.value = point;
  const button = boardElement.value?.querySelector<HTMLButtonElement>(`[data-row="${point.row}"][data-col="${point.col}"]`);
  button?.focus({ preventScroll: true });
  button?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function navigate(event: KeyboardEvent): void {
  if (props.disabled || !focusPoint.value) return;
  const offsets: Record<string, Point> = {
    ArrowUp: { row: -1, col: 0 }, ArrowDown: { row: 1, col: 0 },
    ArrowLeft: { row: 0, col: -1 }, ArrowRight: { row: 0, col: 1 },
  };
  const step = offsets[event.key];
  if (!step) return;
  event.preventDefault();
  let { row, col } = focusPoint.value;
  while (true) {
    row += step.row;
    col += step.col;
    if (row < 0 || row >= props.board.rows || col < 0 || col >= props.board.cols) return;
    if (props.board.tileAt(row, col)) { focusTile({ row, col }); return; }
  }
}

watch(() => props.revision, async () => {
  const hadFocus = boardElement.value?.contains(document.activeElement);
  await nextTick();
  if (hadFocus && focusPoint.value && !props.disabled) focusTile(focusPoint.value);
});
</script>

<template>
  <div class="board-scroll" tabindex="-1">
    <div
      id="board" ref="boardElement" class="game-board" role="group" aria-label="連連看棋盤" tabindex="-1"
      :style="{ '--board-cols': board.cols + 2, '--board-rows': board.rows + 2 }"
      @contextmenu.prevent="emit('cancel')" @keydown="navigate"
    >
      <template v-for="cell in cells" :key="`${cell.row},${cell.col}`">
        <VBtn
          v-if="cell.tile" class="game-tile" variant="flat" :ripple="false"
          :data-row="cell.row" :data-col="cell.col" :data-kind="cell.tile.kind"
          :aria-label="`${tileKind(cell.tile.kind).label}，第 ${cell.row + 1} 列，第 ${cell.col + 1} 欄`"
          :aria-pressed="same(selected, cell)" :tabindex="same(focusPoint, cell) ? 0 : -1"
          :disabled="disabled"
          :class="{ 'game-tile--selected': same(selected, cell), 'game-tile--hint': hint?.some((p) => same(p, cell)), 'game-tile--mismatch': mismatch.some((p) => same(p, cell)), 'game-tile--edge-right': cell.exposedRight, 'game-tile--edge-bottom': cell.exposedBottom }"
          @focus="focused = { row: cell.row, col: cell.col }" @click="emit('select', cell.row, cell.col)"
        >
          <span class="tile-face">
            <TileArtwork :kind="cell.tile.kind" :theme="theme" />
            <span v-if="hint?.some((p) => same(p, cell))" class="tile-marker" aria-hidden="true">✦</span>
          </span>
        </VBtn>
        <span v-else class="empty-cell" aria-hidden="true" />
      </template>
      <svg class="path-layer" :viewBox="`0 0 ${board.cols + 2} ${board.rows + 2}`" preserveAspectRatio="none" aria-hidden="true">
        <polyline v-if="path.length" :points="points" />
      </svg>
    </div>
  </div>
</template>
