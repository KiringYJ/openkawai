<script setup lang="ts">
import { computed } from 'vue';
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
const same = (a: Point | null | undefined, b: Point) => a?.row === b.row && a?.col === b.col;
const points = computed(() => props.path.map((point) => `${point.col + 1.5},${point.row + 1.5}`).join(' '));
</script>

<template>
  <div class="board-viewport">
    <div
      id="board" class="game-board" role="group" aria-label="連連看棋盤" tabindex="-1"
      :style="{ '--board-cols': board.cols + 2, '--board-rows': board.rows + 2, '--board-aspect': (board.cols + 2) * 3 / ((board.rows + 2) * 4) }"
      @contextmenu.prevent="emit('cancel')"
    >
      <template v-for="cell in cells" :key="`${cell.row},${cell.col}`">
        <VBtn
          v-if="cell.tile" class="game-tile" variant="flat" :ripple="false"
          :data-row="cell.row" :data-col="cell.col" :data-kind="cell.tile.kind"
          :aria-label="`${tileKind(cell.tile.kind).label}，第 ${cell.row + 1} 列，第 ${cell.col + 1} 欄`"
          :aria-pressed="same(selected, cell)" tabindex="-1"
          :disabled="disabled"
          :class="{ 'game-tile--selected': same(selected, cell), 'game-tile--hint': hint?.some((p) => same(p, cell)), 'game-tile--mismatch': mismatch.some((p) => same(p, cell)), 'game-tile--edge-right': cell.exposedRight, 'game-tile--edge-bottom': cell.exposedBottom }"
          @click="$event.button === 0 && $event.detail > 0 && emit('select', cell.row, cell.col)"
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
