<script setup lang="ts">
import { VAlert, VBtn, VCard, VCardActions, VCardText, VCardTitle, VDialog, VDivider, VSelect } from 'vuetify/components';
import { TILE_KINDS } from '../content/tile-kinds';
import { TILE_THEMES, type TileThemeId } from '../content/tile-themes';
import { LEVEL_KIND_COUNT, type Difficulty, type GameMode } from '../content/layouts';
import type { Settings } from '../config/settings';
import TileArtwork from './TileArtwork.vue';

defineProps<{ modelValue: boolean; settings: Settings; timedGame: boolean; storageAvailable: boolean }>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean]; 'update:settings': [value: Settings];
}>();
const difficulties = [{ title: '弱', value: 0 }, { title: '強', value: 1 }, { title: '超強', value: 2 }];
const modes = [{ title: '經典模式', value: 'classic' }, { title: '禪意模式', value: 'zen' }];
</script>

<template>
  <VDialog :model-value="modelValue" max-width="620" aria-labelledby="settings-title" @update:model-value="emit('update:modelValue', $event)">
    <VCard>
      <VCardTitle id="settings-title" class="dialog-heading">遊戲設定</VCardTitle>
      <VCardText>
        <VSelect
          :model-value="settings.tileTheme" :items="TILE_THEMES" item-title="label" item-value="id"
          label="圖案風格" @update:model-value="emit('update:settings', { ...settings, tileTheme: $event as TileThemeId })"
        />
        <div class="theme-preview mt-4" :aria-label="`${TILE_KINDS.length} 種候選圖案預覽`">
          <div v-for="animal in TILE_KINDS" :key="animal.id" class="theme-preview__tile" :title="animal.label" :aria-label="animal.label" role="img">
            <span class="tile-face"><TileArtwork :kind="animal.id" :theme="settings.tileTheme" /></span>
          </div>
        </div>
        <p class="text-caption text-medium-emphasis mt-3 mb-5">每關從 {{ TILE_KINDS.length }} 種候選圖案隨機選取 {{ LEVEL_KIND_COUNT }} 種。切換風格不影響棋盤與進度。</p>
        <p v-if="settings.tileTheme === 'fluentanimated'" class="text-caption text-medium-emphasis mb-5">未提供動畫的圖案使用 Fluent 3D 靜態圖。偏好減少動態效果時，全部改用靜態圖。</p>
        <VDivider class="mb-5" />
        <VSelect
          :model-value="settings.mode" :items="modes" label="新遊戲模式"
          @update:model-value="emit('update:settings', { ...settings, mode: $event as GameMode })"
        />
        <VSelect
          v-if="settings.mode === 'classic'" :model-value="settings.difficulty" :items="difficulties" label="經典模式難度"
          @update:model-value="emit('update:settings', { ...settings, difficulty: $event as Difficulty })"
        />
        <p v-if="settings.mode === 'zen'" class="text-body-2 mb-3">禪意模式沒有時間限制。</p>
        <p class="text-caption text-medium-emphasis mt-3">模式與難度於下次遊戲生效。設定儲存於此瀏覽器。</p>
        <VAlert v-if="timedGame" type="info" variant="tonal" density="compact" class="mt-4">計時持續進行。</VAlert>
        <VAlert v-if="!storageAvailable" type="warning" variant="tonal" density="compact" class="mt-4">無法儲存，僅保留於本次頁面。</VAlert>
      </VCardText>
      <VCardActions class="pa-5 pt-0"><VBtn color="primary" variant="flat" block @click="emit('update:modelValue', false)">關閉</VBtn></VCardActions>
    </VCard>
  </VDialog>
</template>
