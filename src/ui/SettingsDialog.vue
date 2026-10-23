<script setup lang="ts">
import { VAlert, VBtn, VCard, VCardActions, VCardText, VCardTitle, VDialog, VDivider, VSelect } from 'vuetify/components';
import { TILE_KINDS } from '../content/tile-kinds';
import { TILE_THEMES, type TileThemeId } from '../content/tile-themes';
import type { Difficulty } from '../content/layouts';
import type { Settings } from '../config/settings';
import TileArtwork from './TileArtwork.vue';

defineProps<{ modelValue: boolean; settings: Settings; inGame: boolean; storageAvailable: boolean }>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean]; 'update:settings': [value: Settings];
}>();
const difficulties = [{ title: '弱', value: 0 }, { title: '強', value: 1 }, { title: '超強', value: 2 }];
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
        <div class="theme-preview mt-4" aria-label="36 種圖案預覽">
          <div v-for="animal in TILE_KINDS" :key="animal.id" class="theme-preview__tile" :title="animal.label" :aria-label="animal.label" role="img">
            <TileArtwork :kind="animal.id" :theme="settings.tileTheme" />
          </div>
        </div>
        <p class="text-caption text-medium-emphasis mt-3 mb-5">切換圖案不影響棋盤與進度。</p>
        <VDivider class="mb-5" />
        <VSelect
          :model-value="settings.difficulty" :items="difficulties" label="新遊戲難度"
          @update:model-value="emit('update:settings', { ...settings, difficulty: $event as Difficulty })"
        />
        <p class="text-caption text-medium-emphasis mt-3">難度於下次遊戲生效。設定儲存於此瀏覽器。</p>
        <VAlert v-if="inGame" type="info" variant="tonal" density="compact" class="mt-4">計時持續進行。</VAlert>
        <VAlert v-if="!storageAvailable" type="warning" variant="tonal" density="compact" class="mt-4">無法儲存，僅保留於本次頁面。</VAlert>
      </VCardText>
      <VCardActions class="pa-5 pt-0"><VBtn color="primary" variant="flat" block @click="emit('update:modelValue', false)">關閉</VBtn></VCardActions>
    </VCard>
  </VDialog>
</template>
