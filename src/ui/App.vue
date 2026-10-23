<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue';
import {
  VAlert, VApp, VBtn, VBtnToggle, VCard, VCardActions, VCardText, VCardTitle, VChip,
  VContainer, VDialog, VDivider, VIcon, VMain, VProgressLinear,
  VSpacer, VTab, VTable, VTabs, VTextField,
} from 'vuetify/components';
import {
  mdiAlertCircleOutline, mdiArrowRight, mdiArrowULeftTop, mdiCardsOutline, mdiCheck,
  mdiCogOutline, mdiHelpCircleOutline, mdiHomeOutline, mdiInformationOutline, mdiLightbulbOutline,
  mdiPause, mdiPlay, mdiShuffleVariant, mdiStar, mdiStarOutline, mdiTrophyOutline,
} from '@mdi/js';
import { createLayout, type Difficulty } from '../content/layouts';
import { tileKind } from '../content/tile-kinds';
import { TILE_THEMES } from '../content/tile-themes';
import { loadSettings, saveSettings, type Settings } from '../config/settings';
import { browserStorage } from '../config/storage';
import type { Point } from '../core/board';
import { GameSession, type CardReward } from '../game/session';
import {
  highScoreRank, insertHighScore, loadHighScores, playerName, qualifiesForHighScore, recordHighScore, saveHighScores,
} from '../game/high-scores';
import GameBoard from './GameBoard.vue';
import SettingsDialog from './SettingsDialog.vue';
import TileArtwork from './TileArtwork.vue';

const DIFFICULTIES = [
  { title: '弱', value: 0 as Difficulty, seconds: 320, resources: 8 },
  { title: '強', value: 1 as Difficulty, seconds: 225, resources: 5 },
  { title: '超強', value: 2 as Difficulty, seconds: 160, resources: 5 },
];
const storage = browserStorage();
const settings = ref(loadSettings(storage));
const highScores = ref(loadHighScores(storage));
const storageAvailable = ref(storage !== null);
const session = shallowRef<GameSession | null>(null);
const revision = ref(0);
const timeLeft = ref(0);
const settingsOpen = ref(false);
const recordsOpen = ref(false);
const rulesOpen = ref(false);
const creditsOpen = ref(false);
const recordsDifficulty = ref<Difficulty>(settings.value.difficulty);
const leaveAction = ref<'restart' | null>(null);
const nameEntry = ref(false);
const enteredName = ref('');
const announcement = ref('');
const path = shallowRef<readonly Point[]>([]);
const mismatch = shallowRef<readonly Point[]>([]);
const lastReward = ref('');
let lastTick = performance.now();
let clock = 0;
let pathTimer = 0;
let mismatchTimer = 0;

const game = computed(() => {
  void revision.value;
  const current = session.value;
  return current ? {
    board: current.board, phase: current.phase, layout: current.layout,
    mode: current.mode, difficulty: current.difficulty, levelIndex: current.levelIndex, score: current.score,
    selected: current.selected, hint: current.activeHint, hints: current.hintResource,
    shuffles: current.shuffleResource, chance: current.chanceKind, stars: current.stars,
    cards: current.cards, picks: current.picksRemaining, bonus: current.lastBonus,
    lossReason: current.lossReason,
  } : null;
});
const menuDifficulty = computed(() => DIFFICULTIES[settings.value.mode === 'zen' ? 1 : settings.value.difficulty]!);
const recordRows = computed(() => Array.from({ length: 10 }, (_, rank) => ({
  rank: rank + 1, entry: highScores.value[recordsDifficulty.value][rank],
})));
const provisionalRecords = computed(() => {
  const current = game.value;
  if (!current || current.mode !== 'classic') return [];
  const table = highScores.value[current.difficulty];
  const rank = highScoreRank(table, current.score);
  const preview = insertHighScore(table, {
    name: enteredName.value, score: current.score,
    level: current.phase === 'completed' ? 11 : current.levelIndex,
  });
  return Array.from({ length: 10 }, (_, index) => ({
    entry: preview[index], rank: index + 1, pending: index === rank,
  }));
});
const publicBase = import.meta.env.BASE_URL;
const isPlaying = computed(() => game.value?.phase === 'playing');
const resultOpen = computed(() => !!game.value && ['won', 'completed', 'lost'].includes(game.value.phase) && !nameEntry.value);
const resultTitle = computed(() => game.value?.phase === 'won' ? '過關' : game.value?.phase === 'completed' ? '全部過關' : '遊戲結束');
const resultCopy = computed(() => game.value?.phase === 'won' ? '分數、資源與星星保留至下一關。'
  : game.value?.phase === 'completed' ? ''
    : game.value?.lossReason === 'no-moves' ? '無可配對圖案，且無法洗牌。' : '時間已用完。');

function formatTime(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function rewardLabel(reward: CardReward): string {
  return reward.kind === 'time' ? `時間 +${reward.amount / 1000} 秒`
    : reward.kind === 'hint' ? `提示 +${reward.amount}` : `洗牌 +${reward.amount}`;
}

function sync(): void {
  timeLeft.value = session.value?.timeLeftMs ?? 0;
  revision.value += 1;
}

function advanceTime(): void {
  const now = performance.now();
  const current = session.value;
  const before = current?.phase;
  current?.tick(now - lastTick);
  lastTick = now;
  timeLeft.value = current?.timeLeftMs ?? 0;
  if (before !== current?.phase) {
    settingsOpen.value = false;
    rulesOpen.value = false;
    creditsOpen.value = false;
    recordsOpen.value = false;
    leaveAction.value = null;
    sync();
  }
}

function updateSettings(value: Settings): void {
  settings.value = value;
  if (!saveSettings(storage, value)) storageAvailable.value = false;
}

function clearEffects(): void {
  window.clearTimeout(pathTimer);
  window.clearTimeout(mismatchTimer);
  path.value = [];
  mismatch.value = [];
  lastReward.value = '';
  announcement.value = '';
}

function startGame(): void {
  clearEffects();
  const difficulty = menuDifficulty.value.value;
  session.value = new GameSession({ mode: settings.value.mode, difficulty, layout: createLayout(difficulty) });
  lastTick = performance.now();
  sync();
}

function selectTile(row: number, col: number): void {
  advanceTime();
  const result = session.value?.select(row, col);
  if (!result || result.type === 'ignored') return;
  clearEffects();
  if (result.type === 'matched') {
    path.value = result.path;
    pathTimer = window.setTimeout(() => { path.value = []; }, 340);
    announcement.value = `配對成功，+${result.points} 分。`;
  } else if (result.type === 'mismatch') {
    mismatch.value = result.tiles;
    mismatchTimer = window.setTimeout(() => { mismatch.value = []; }, 380);
    announcement.value = result.reason === 'blocked' ? '無法連線。' : '圖案不同。';
  }
  sync();
}

function cancelSelection(): void {
  session.value?.clearSelection();
  announcement.value = '';
  sync();
}

function useHint(): void {
  advanceTime();
  if (!isPlaying.value) return;
  const hint = session.value?.hint();
  announcement.value = hint
    ? `提示：第 ${hint[0].row + 1} 列第 ${hint[0].col + 1} 欄與第 ${hint[1].row + 1} 列第 ${hint[1].col + 1} 欄可配對。`
    : '目前無法使用提示。';
  sync();
}

function shuffle(): void {
  advanceTime();
  if (!isPlaying.value) return;
  clearEffects();
  announcement.value = session.value?.shuffle() ? '已洗牌。' : '目前無法洗牌。';
  sync();
}

function pause(): void {
  advanceTime();
  session.value?.pause();
  sync();
}

function resume(): void {
  session.value?.resume();
  lastTick = performance.now();
  clearEffects();
  announcement.value = session.value?.phase === 'playing'
    ? '已洗牌，消耗 1 次洗牌。' : '無可配對圖案。';
  sync();
}

function chooseCard(index: number): void {
  const reward = session.value?.chooseCard(index);
  if (reward) lastReward.value = `獲得${rewardLabel(reward)}`;
  lastTick = performance.now();
  sync();
}

function continueLevel(): void {
  if (!session.value?.continueLevel()) return;
  clearEffects();
  lastTick = performance.now();
  sync();
}

function toMenu(): void {
  clearEffects();
  session.value = null;
  nameEntry.value = false;
  leaveAction.value = null;
  sync();
}

function finishRun(): void {
  const current = game.value;
  if (!current) return;
  if (current.mode === 'classic' && qualifiesForHighScore(highScores.value[current.difficulty], current.score)) {
    enteredName.value = '';
    nameEntry.value = true;
  } else toMenu();
}

function saveRecord(): void {
  const current = game.value;
  if (!current || current.mode !== 'classic') return;
  highScores.value = recordHighScore(highScores.value, current.difficulty, {
    name: enteredName.value, score: current.score, level: current.phase === 'completed' ? 11 : current.levelIndex,
  });
  if (!saveHighScores(storage, highScores.value)) storageAvailable.value = false;
  recordsDifficulty.value = current.difficulty;
  toMenu();
}

function confirmLeave(): void {
  const action = leaveAction.value;
  leaveAction.value = null;
  if (action === 'restart') {
    clearEffects();
    session.value?.restart();
    lastTick = performance.now();
    sync();
  }
}

function keyboard(event: KeyboardEvent): void {
  const target = event.target;
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || !session.value
    || settingsOpen.value || recordsOpen.value || rulesOpen.value || creditsOpen.value || leaveAction.value || nameEntry.value
    || (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select, [role="combobox"]')))) return;
  const key = event.key.toLowerCase();
  if (game.value?.phase === 'paused' && key === 'p') { event.preventDefault(); resume(); return; }
  if (!isPlaying.value) return;
  const actions: Record<string, () => void> = { h: useHint, s: shuffle, p: pause, r: () => { leaveAction.value = 'restart'; }, escape: cancelSelection };
  if (actions[key]) { event.preventDefault(); actions[key](); }
}

onMounted(() => {
  clock = window.setInterval(advanceTime, 100);
  document.addEventListener('keydown', keyboard);
});
onUnmounted(() => {
  window.clearInterval(clock);
  clearEffects();
  document.removeEventListener('keydown', keyboard);
});
</script>

<template>
  <VApp :class="{ 'game-active': !!game }">
    <a class="skip-link" :href="game ? '#board' : '#start-game'">跳至{{ game ? '棋盤' : '開始遊戲' }}</a>
    <div class="d-sr-only" role="status" aria-live="polite">{{ announcement }}</div>
    <VMain tag="div">
      <VContainer class="app-shell" :class="{ 'app-shell--playing': !!game }">
        <header class="site-header">
          <a class="brand" href="#" aria-label="openkawai 首頁" @click.prevent="toMenu">
            openkawai
          </a>
          <div class="header-actions">
            <VBtn v-if="game" variant="text" :icon="mdiHomeOutline" aria-label="返回主選單" @click="toMenu" />
            <VBtn v-else variant="text" :prepend-icon="mdiTrophyOutline" @click="recordsOpen = true">最佳紀錄</VBtn>
            <VBtn variant="text" :icon="mdiHelpCircleOutline" aria-label="玩法" @click="rulesOpen = true" />
            <VBtn v-if="game" variant="text" :icon="mdiInformationOutline" aria-label="素材與授權" @click="creditsOpen = true" />
            <VBtn variant="tonal" color="primary" :prepend-icon="mdiCogOutline" @click="settingsOpen = true">設定</VBtn>
          </div>
        </header>

        <main v-if="!game" class="menu-layout">
            <VCard border class="menu-panel pa-6">
              <h1 class="menu-title mb-6">KAWAI 連連看 2004</h1>
              <h2 class="text-subtitle-2 mb-3">遊戲模式</h2>
              <VBtnToggle :model-value="settings.mode" mandatory divided color="primary" variant="outlined" class="d-flex mb-5" aria-label="遊戲模式" @update:model-value="updateSettings({ ...settings, mode: $event })">
                <VBtn value="classic" class="w-50" :aria-pressed="settings.mode === 'classic'">Classic mode</VBtn>
                <VBtn value="zen" class="w-50" :aria-pressed="settings.mode === 'zen'">Zen mode</VBtn>
              </VBtnToggle>
              <template v-if="settings.mode === 'classic'">
                <h2 class="text-subtitle-2 mb-3">Classic 難度</h2>
                <div class="difficulty-options">
                  <VBtn v-for="difficulty in DIFFICULTIES" :key="difficulty.value" height="44" :variant="settings.difficulty === difficulty.value ? 'tonal' : 'outlined'" :color="settings.difficulty === difficulty.value ? 'primary' : undefined" :aria-pressed="settings.difficulty === difficulty.value" @click="updateSettings({ ...settings, difficulty: difficulty.value })">
                    {{ difficulty.title }}
                  </VBtn>
                </div>
              </template>
              <p class="text-caption text-medium-emphasis mt-4 mb-4">{{ settings.mode === 'zen' ? '無時間限制' : `第一關 ${formatTime(menuDifficulty.seconds * 1000)}` }} · 提示 {{ menuDifficulty.resources }} 次 · 洗牌 {{ menuDifficulty.resources }} 次</p>
              <p v-if="settings.mode === 'zen'" class="text-caption text-medium-emphasis mb-4">共 11 關，提示與洗牌有次數限制。不列入 Classic 最佳紀錄。</p>
              <VBtn id="start-game" color="primary" variant="flat" size="large" block @click="startGame">開始遊戲</VBtn>
            </VCard>
        </main>

        <main v-else class="play-layout">
          <section class="play-main" aria-label="遊戲區">
            <VCard variant="text" class="board-card">
              <div class="board-toolbar">
                <div class="level-heading">
                  <h1 class="level-title">{{ game.layout.name }}</h1>
                  <VChip color="primary" variant="tonal" size="x-small">{{ game.mode === 'zen' ? 'Zen' : `Classic · ${DIFFICULTIES[game.difficulty]?.title}` }} · {{ game.levelIndex + 1 }} / 11</VChip>
                </div>
                <div class="clock-stat" :class="{ 'text-error': game.mode === 'classic' && timeLeft <= 30000 }"><span class="text-caption">{{ game.mode === 'zen' ? '時間' : '剩餘時間' }}</span><strong>{{ game.mode === 'zen' ? '不限時' : formatTime(timeLeft) }}</strong></div>
                <div class="board-stat"><span class="text-caption">分數</span><strong>{{ game.score.toLocaleString() }}</strong></div>
                <aside class="chance-panel" aria-label="機會圖案，配對得 1 星，3 星可翻牌" title="配對此圖案得 1 星；3 星可翻牌。">
                  <div class="chance-animal" role="img" :aria-label="`機會圖案：${tileKind(game.chance).label}`"><TileArtwork :kind="game.chance" :theme="settings.tileTheme" /></div>
                  <div>
                    <h2 class="text-caption">機會圖案</h2>
                    <div class="chance-stars" :aria-label="`已收集 ${game.stars} 顆星，共需 3 顆`"><VIcon v-for="star in 3" :key="star" :icon="game.stars >= star ? mdiStar : mdiStarOutline" :color="game.stars >= star ? 'secondary' : 'grey'" size="18" /></div>
                  </div>
                </aside>
              </div>
              <VProgressLinear v-if="game.mode === 'classic'" :model-value="timeLeft / game.layout.timeLimitMs * 100" :color="timeLeft <= 30000 ? 'error' : 'primary'" height="5" :aria-label="`剩餘時間 ${formatTime(timeLeft)}`" />
              <VDivider v-else />
              <div class="board-surface" :class="{ 'board-surface--covered': game.phase === 'paused' }">
                <GameBoard :board="game.board" :revision="revision" :selected="game.selected" :hint="game.hint" :theme="settings.tileTheme" :disabled="!isPlaying" :path="path" :mismatch="mismatch" @select="selectTile" @cancel="cancelSelection" />
              </div>
              <VAlert v-if="!storageAvailable" type="warning" variant="text" density="compact" :icon="false" class="game-storage-notice">無法儲存設定與紀錄，僅保留於本次頁面。</VAlert>
            </VCard>
            <div class="play-actions">
              <VBtn variant="tonal" color="primary" :prepend-icon="mdiLightbulbOutline" :disabled="!isPlaying || game.hints === 0 || !!game.hint" @click="useHint">提示 <span class="resource-count">{{ game.hints }}</span><kbd>H</kbd></VBtn>
              <VBtn variant="tonal" color="primary" :prepend-icon="mdiShuffleVariant" :disabled="!isPlaying || game.shuffles === 0" @click="shuffle">洗牌 <span class="resource-count">{{ game.shuffles }}</span><kbd>S</kbd></VBtn>
              <VBtn variant="outlined" :prepend-icon="mdiPause" :disabled="!isPlaying || game.shuffles === 0" @click="pause">暫停<kbd>P</kbd></VBtn>
              <VBtn variant="text" :prepend-icon="mdiArrowULeftTop" :disabled="!isPlaying" @click="leaveAction = 'restart'">重新開始</VBtn>
            </div>
          </section>
        </main>

        <footer v-if="!game" class="site-footer"><VBtn size="small" variant="text" @click="creditsOpen = true">素材與授權</VBtn></footer>
        <VAlert v-if="!storageAvailable && !game" type="warning" variant="tonal" density="compact" class="mb-4">無法儲存設定與紀錄，僅保留於本次頁面。</VAlert>
      </VContainer>
    </VMain>

    <SettingsDialog v-model="settingsOpen" :settings="settings" :timed-game="isPlaying && game?.mode === 'classic'" :storage-available="storageAvailable" @update:settings="updateSettings" />

    <VDialog :model-value="game?.phase === 'paused'" persistent max-width="430" aria-labelledby="pause-title">
      <VCard class="pa-3"><VCardText class="text-center pt-8"><VIcon :icon="mdiPause" size="40" color="primary" /><h2 id="pause-title" class="mt-4 mb-3">暫停</h2><p><template v-if="game?.mode === 'classic'">計時已停止。</template>繼續時會洗牌並消耗 1 次洗牌。</p><p class="text-caption mt-3">剩餘 {{ game?.shuffles }} 次洗牌</p></VCardText><VCardActions class="pa-5"><VBtn block variant="flat" color="primary" :prepend-icon="mdiPlay" @click="resume">繼續遊戲</VBtn></VCardActions></VCard>
    </VDialog>

    <VDialog :model-value="game?.phase === 'cards'" persistent max-width="680" aria-labelledby="cards-title">
      <VCard><VCardTitle id="cards-title" class="dialog-heading"><VIcon :icon="mdiCardsOutline" color="primary" class="mr-2" />機會翻牌</VCardTitle><VCardText><p class="mb-5">可翻 {{ game?.picks }} 張{{ game?.mode === 'classic' ? '；計時暫停。' : '，獲得提示或洗牌。' }}</p><div class="chance-cards"><VBtn v-for="(card, index) in game?.cards" :key="index" class="chance-card" height="88" :variant="card.revealed ? 'tonal' : 'flat'" :color="card.revealed ? 'secondary' : 'primary'" :disabled="card.revealed" :aria-label="card.revealed ? rewardLabel(card.reward) : `翻開第 ${index + 1} 張牌`" @click="chooseCard(index)"><span v-if="card.revealed">{{ rewardLabel(card.reward) }}</span><VIcon v-else :icon="mdiCardsOutline" size="26" /></VBtn></div><p v-if="lastReward" class="text-body-2 text-primary mt-4" role="status">{{ lastReward }}</p></VCardText></VCard>
    </VDialog>

    <VDialog :model-value="resultOpen" persistent max-width="470" aria-labelledby="result-title">
      <VCard class="pa-2"><VCardText class="text-center pt-8"><VIcon :icon="game?.phase === 'lost' ? mdiAlertCircleOutline : mdiTrophyOutline" size="46" color="primary" /><h2 id="result-title" class="mt-4 mb-3">{{ resultTitle }}</h2><p v-if="resultCopy" class="text-body-2 text-medium-emphasis">{{ resultCopy }}</p><div class="result-score my-5">{{ game?.score.toLocaleString() }} <span>分</span></div><VChip v-if="game?.phase !== 'lost'" color="primary" variant="tonal">過關獎勵 +{{ game?.bonus.toLocaleString() }}</VChip></VCardText><VCardActions class="pa-5"><VBtn block color="primary" variant="flat" :append-icon="mdiArrowRight" @click="game?.phase === 'won' ? continueLevel() : finishRun()">{{ game?.phase === 'won' ? '下一關' : '確定' }}</VBtn></VCardActions></VCard>
    </VDialog>

    <VDialog :model-value="nameEntry" max-width="450" aria-labelledby="name-title" @update:model-value="!$event && toMenu()">
      <VCard>
        <VCardTitle id="name-title" class="dialog-heading">登錄最佳紀錄</VCardTitle>
        <VCardText>
          <p class="mb-4">本次 {{ game?.score.toLocaleString() }} 分。</p>
          <VTable density="compact" class="mb-5">
            <thead><tr><th>排名</th><th>玩家</th><th class="text-right">分數</th></tr></thead>
            <tbody>
              <tr v-for="row in provisionalRecords" :key="row.rank" :class="{ 'text-primary font-weight-bold': row.pending }" :aria-current="row.pending ? 'true' : undefined">
                <td>{{ row.rank }}</td>
                <td>{{ row.pending ? enteredName || '（本次）' : row.entry ? row.entry.name.trim() || '（未署名）' : '—' }}</td>
                <td class="text-right">{{ row.entry?.score.toLocaleString() ?? '—' }}</td>
              </tr>
            </tbody>
          </VTable>
          <form id="record-form" @submit.prevent="saveRecord">
            <VTextField :model-value="enteredName" label="玩家名稱" maxlength="16" counter="16" autofocus variant="outlined" hint="A–Z 與空格，最多 16 字元，可留白。" persistent-hint @update:model-value="enteredName = playerName($event ?? '')" />
          </form>
        </VCardText>
        <VCardActions class="pa-5 pt-0">
          <VBtn variant="text" @click="toMenu">略過</VBtn>
          <VSpacer />
          <VBtn type="submit" form="record-form" color="primary" variant="flat" :prepend-icon="mdiCheck">儲存紀錄</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="recordsOpen" max-width="620" aria-labelledby="records-title">
      <VCard><VCardTitle id="records-title" class="dialog-heading">Classic 最佳紀錄</VCardTitle><VTabs v-model="recordsDifficulty" color="primary" grow><VTab v-for="difficulty in DIFFICULTIES" :key="difficulty.value" :value="difficulty.value">{{ difficulty.title }}</VTab></VTabs><VCardText class="pt-2"><VTable density="comfortable"><thead><tr><th>排名</th><th>玩家</th><th class="text-right">分數</th><th class="text-right">關卡</th></tr></thead><tbody><tr v-for="row in recordRows" :key="row.rank"><td>{{ String(row.rank).padStart(2, '0') }}</td><td>{{ row.entry ? row.entry.name.trim() || '（未署名）' : '—' }}</td><td class="text-right font-weight-bold">{{ row.entry?.score.toLocaleString() ?? '—' }}</td><td class="text-right">{{ row.entry ? row.entry.level === 11 ? 'ALL PASS' : row.entry.level + 1 : '—' }}</td></tr></tbody></VTable><p class="text-caption text-medium-emphasis mt-3">Classic 各難度前十名，儲存於此瀏覽器。</p></VCardText><VCardActions class="pa-5 pt-0"><VSpacer /><VBtn color="primary" @click="recordsOpen = false">關閉</VBtn></VCardActions></VCard>
    </VDialog>

    <VDialog v-model="rulesOpen" max-width="580" aria-labelledby="rules-title">
      <VCard>
        <VCardTitle id="rules-title" class="dialog-heading">玩法</VCardTitle>
        <VCardText>
          <ol class="rules-list">
            <li><strong>遊戲模式。</strong>Classic mode 有弱、強、超強三種難度；Zen mode 不限時，沒有時間加分，也不列入 Classic 最佳紀錄。</li>
            <li><strong>配對相同圖案。</strong>連線只能經過空格，最多轉兩次彎，可繞行棋盤外框。</li>
            <li><strong>清除棋盤。</strong>每關 72 對，共 11 關。配對加分，Classic 另補充時間；各關消牌後的排列方式不同。</li>
            <li><strong>提示與洗牌。</strong>每次消耗 1 次。無解時自動洗牌；無可配對圖案且無法洗牌時結束。</li>
            <li><strong>機會翻牌。</strong>配對當前機會圖案得 1 星，3 星可翻牌獲得提示或洗牌，Classic 另有時間獎勵。每次配對後會更新機會圖案。</li>
            <li><strong>暫停。</strong>需有洗牌次數。繼續時消耗 1 次並洗牌。</li>
          </ol>
          <VDivider class="my-4" />
          <p class="text-body-2">鍵盤：方向鍵移動、Enter／空白鍵選取、H 提示、S 洗牌、P 暫停／繼續、R 重新開始、Esc 取消選取。滑鼠右鍵也可取消。</p>
        </VCardText>
        <VCardActions class="pa-5 pt-0"><VBtn block color="primary" variant="flat" @click="rulesOpen = false">關閉</VBtn></VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="creditsOpen" max-width="580" aria-labelledby="credits-title">
      <VCard><VCardTitle id="credits-title" class="dialog-heading">素材與授權</VCardTitle><VCardText><p class="text-body-2 mb-4">使用下列開源圖庫，圖檔未修改。</p><div v-for="theme in TILE_THEMES" :key="theme.id" class="credit-row"><div><a :href="theme.sourceUrl" target="_blank" rel="noopener noreferrer">{{ theme.label }}</a><p class="text-caption text-medium-emphasis mt-1">{{ theme.attribution }}</p><a v-if="'noticeFile' in theme" :href="`${publicBase}licenses/${theme.noticeFile}`" class="text-caption" target="_blank" rel="noopener noreferrer">著作權聲明</a></div><a :href="`${publicBase}licenses/${theme.licenseFile}`" target="_blank" rel="noopener noreferrer">{{ theme.license }}</a></div><p class="text-caption text-medium-emphasis mt-4">openkawai 為獨立網頁重製版，程式碼採 MIT 授權。未使用原作圖像、音樂或程式碼。</p></VCardText><VCardActions class="pa-5 pt-0"><VSpacer /><VBtn color="primary" @click="creditsOpen = false">關閉</VBtn></VCardActions></VCard>
    </VDialog>

    <VDialog :model-value="leaveAction !== null" max-width="420" aria-labelledby="leave-title" @update:model-value="!$event && (leaveAction = null)">
      <VCard><VCardTitle id="leave-title" class="dialog-heading">重新開始？</VCardTitle><VCardText>目前進度不會儲存。</VCardText><VCardActions class="pa-5"><VBtn @click="leaveAction = null">取消</VBtn><VSpacer /><VBtn color="primary" variant="flat" @click="confirmLeave">重新開始</VBtn></VCardActions></VCard>
    </VDialog>
  </VApp>
</template>
