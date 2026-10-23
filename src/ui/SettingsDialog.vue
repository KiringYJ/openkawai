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
const difficulties = [{ title: '弱 · 較充裕的時間', value: 0 }, { title: '強 · 經典挑戰', value: 1 }, { title: '超強 · 分秒必爭', value: 2 }];
</script>

<template>
  <VDialog :model-value="modelValue" max-width="620" aria-labelledby="settings-title" @update:model-value="emit('update:modelValue', $event)">
    <VCard>
      <VCardTitle id="settings-title" class="dialog-heading">遊戲設定</VCardTitle>
      <VCardText>
        <p class="text-body-2 text-medium-emphasis mb-5">挑一套喜歡的動物圖案。36 種動物，五種個性。</p>
        <VSelect
          :model-value="settings.tileTheme" :items="TILE_THEMES" item-title="label" item-value="id"
          label="Emoji 圖案風格" @update:model-value="emit('update:settings', { ...settings, tileTheme: $event as TileThemeId })"
        />
        <p class="text-body-2 mt-3 mb-4">{{ TILE_THEMES.find((theme) => theme.id === settings.tileTheme)?.description }}</p>
        <div class="theme-preview" aria-label="全部 36 種動物預覽">
          <div v-for="animal in TILE_KINDS" :key="animal.id" class="theme-preview__tile" :title="animal.label" :aria-label="animal.label" role="img">
            <TileArtwork :kind="animal.id" :theme="settings.tileTheme" />
          </div>
        </div>
        <p class="text-caption text-medium-emphasis mt-3 mb-5">切換圖案立即生效，棋盤位置、配對規則與遊戲進度保持不變。</p>
        <VDivider class="mb-5" />
        <VSelect
          :model-value="settings.difficulty" :items="difficulties" label="新遊戲預設難度"
          @update:model-value="emit('update:settings', { ...settings, difficulty: $event as Difficulty })"
        />
        <p class="text-caption text-medium-emphasis mt-3">難度在開始新遊戲時套用。設定會自動儲存在此瀏覽器。</p>
        <VAlert v-if="inGame" type="info" variant="tonal" density="compact" class="mt-4">設定開啟時，遊戲仍會計時。需要休息請使用棋盤的暫停功能。</VAlert>
        <VAlert v-if="!storageAvailable" type="warning" variant="tonal" density="compact" class="mt-4">瀏覽器無法儲存資料；設定與紀錄會暫存到本次頁面關閉為止。</VAlert>
      </VCardText>
      <VCardActions class="pa-5 pt-0"><VBtn color="primary" variant="flat" block @click="emit('update:modelValue', false)">完成設定</VBtn></VCardActions>
    </VCard>
  </VDialog>
</template>
