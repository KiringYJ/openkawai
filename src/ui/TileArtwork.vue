<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { tileKind } from '../content/tile-kinds';
import { tileImageUrl, type TileThemeId } from '../content/tile-themes';

const props = defineProps<{ kind: string; theme: TileThemeId }>();
const failed = ref(false);
const source = computed(() => tileImageUrl(props.kind, props.theme));
const animal = computed(() => tileKind(props.kind));
watch(source, () => { failed.value = false; });
</script>

<template>
  <span class="tile-artwork" aria-hidden="true">
    <span v-if="failed" class="tile-artwork__fallback">{{ animal.glyph }}</span>
    <picture v-else>
      <source
        v-if="theme === 'fluentanimated'"
        media="(prefers-reduced-motion: reduce)"
        :srcset="tileImageUrl(kind, 'fluent3d')"
      />
      <img :src="source" alt="" draggable="false" @error="failed = true" />
    </picture>
  </span>
</template>
