<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue';
import {
  VAlert, VApp, VBtn, VCard, VCardActions, VCardText, VCardTitle, VChip,
  VContainer, VDialog, VDivider, VIcon, VMain, VProgressLinear,
  VSpacer, VTab, VTable, VTabs, VTextField,
} from 'vuetify/components';
import {
  mdiArrowRight, mdiArrowULeftTop, mdiCardsOutline, mdiCheck, mdiChevronRight,
  mdiCogOutline, mdiHelpCircleOutline, mdiHomeOutline, mdiLeaf, mdiLightbulbOutline,
  mdiPause, mdiPlay, mdiShuffleVariant, mdiStar, mdiStarOutline, mdiTrophyOutline,
} from '@mdi/js';
import { createLayout, type Difficulty } from '../content/layouts';
import { TILE_KINDS, tileKind } from '../content/tile-kinds';
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
  { title: '弱', value: 0 as Difficulty, subtitle: '慢慢找，也很好', seconds: 320, resources: 8 },
  { title: '強', value: 1 as Difficulty, subtitle: '剛剛好的挑戰', seconds: 225, resources: 5 },
  { title: '超強', value: 2 as Difficulty, subtitle: '考驗你的眼力', seconds: 160, resources: 5 },
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
const status = ref('選取兩個相同的動物，讓牠們找到彼此。');
const path = shallowRef<readonly Point[]>([]);
const mismatch = shallowRef<readonly Point[]>([]);
const lastReward = ref('');
const sampleAnimals = TILE_KINDS.filter((_, index) => [0, 1, 2, 5, 9, 10, 13, 15, 17, 23, 30, 35].includes(index));
let lastTick = performance.now();
let clock = 0;
let pathTimer = 0;
let mismatchTimer = 0;

const game = computed(() => {
  void revision.value;
  const current = session.value;
  return current ? {
    board: current.board, phase: current.phase, layout: current.layout,
    difficulty: current.difficulty, levelIndex: current.levelIndex, score: current.score,
    selected: current.selected, hint: current.activeHint, hints: current.hintResource,
    shuffles: current.shuffleResource, chance: current.chanceKind, stars: current.stars,
    cards: current.cards, picks: current.picksRemaining, bonus: current.lastBonus,
    lossReason: current.lossReason, remaining: current.board.remainingCount,
  } : null;
});
const activeTheme = computed(() => TILE_THEMES.find((theme) => theme.id === settings.value.tileTheme)!);
const menuDifficulty = computed(() => DIFFICULTIES[settings.value.difficulty]!);
const recordRows = computed(() => Array.from({ length: 10 }, (_, rank) => ({
  rank: rank + 1, entry: highScores.value[recordsDifficulty.value][rank],
})));
const provisionalRecords = computed(() => {
  const current = game.value;
  if (!current) return [];
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
const resultTitle = computed(() => game.value?.phase === 'won' ? '這一關，漂亮！' : game.value?.phase === 'completed' ? '十一關，全數過關！' : '休息一下，再挑戰。');
const resultCopy = computed(() => game.value?.phase === 'won' ? '分數與剩餘資源將帶往下一關，機會星星也會保留。'
  : game.value?.phase === 'completed' ? '動物們都找到彼此了。你完成了所有關卡！'
    : game.value?.lossReason === 'no-moves' ? '棋盤已沒有可連的配對，洗牌次數也用完了。' : '時間到了！每次配對都會補回一點時間，下次再試試。');

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
}

function startGame(): void {
  clearEffects();
  session.value = new GameSession({ difficulty: settings.value.difficulty, layout: createLayout(settings.value.difficulty) });
  lastTick = performance.now();
  status.value = '找找看，哪兩隻動物可以連在一起？';
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
    status.value = `配對成功！+${result.points} 分`;
  } else if (result.type === 'mismatch') {
    mismatch.value = result.tiles;
    mismatchTimer = window.setTimeout(() => { mismatch.value = []; }, 380);
    status.value = result.reason === 'blocked' ? '路被擋住了，試試另一對；連線最多轉兩個彎。' : '這兩隻不一樣，再找找牠的夥伴。';
  } else if (result.type === 'deselected') status.value = '已取消選取。';
  else status.value = '已選取，接著找另一隻相同的動物。';
  sync();
}

function cancelSelection(): void {
  session.value?.clearSelection();
  status.value = '已取消選取。';
  sync();
}

function useHint(): void {
  advanceTime();
  if (!isPlaying.value) return;
  const hint = session.value?.hint();
  status.value = hint ? '帶有星光的兩隻動物可以配對。' : '目前無法使用提示。';
  sync();
}

function shuffle(): void {
  advanceTime();
  if (!isPlaying.value) return;
  clearEffects();
  status.value = session.value?.shuffle() ? '洗好牌了，再找找看！' : '目前無法洗牌。';
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
  status.value = session.value?.phase === 'playing'
    ? '歡迎回來！棋盤已重新洗牌，消耗 1 次洗牌。' : '棋盤已沒有可連的配對。';
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
  status.value = '新的一關，新的排列方式。加油！';
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
  if (qualifiesForHighScore(highScores.value[current.difficulty], current.score)) {
    enteredName.value = '';
    nameEntry.value = true;
  } else toMenu();
}

function saveRecord(): void {
  const current = game.value;
  if (!current) return;
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
  if (action === 'restart') startGame();
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
  <VApp>
    <a class="skip-link" :href="game ? '#board' : '#start-game'">跳至{{ game ? '棋盤' : '開始遊戲' }}</a>
    <VMain tag="div">
      <VContainer class="app-shell">
        <header class="site-header">
          <a class="brand" href="#" aria-label="openkawai 首頁" @click.prevent="toMenu">
            <span class="brand-mark"><VIcon :icon="mdiLeaf" size="23" /></span>
            <span>openkawai<span class="brand-dot">.</span></span>
          </a>
          <div class="header-actions">
            <VBtn v-if="game" variant="text" :icon="mdiHomeOutline" aria-label="返回主選單" @click="toMenu" />
            <VBtn v-else variant="text" :prepend-icon="mdiTrophyOutline" @click="recordsOpen = true">最佳紀錄</VBtn>
            <VBtn variant="tonal" color="primary" :prepend-icon="mdiCogOutline" @click="settingsOpen = true">設定</VBtn>
          </div>
        </header>

        <main v-if="!game" class="menu-layout">
          <section class="welcome">
            <VChip color="primary" variant="tonal" size="small" class="mb-5">一場給眼睛的小旅行</VChip>
            <p class="eyebrow mb-3">THE LITTLE JOY OF FINDING A PAIR</p>
            <h1>找一找，<br />把可愛<span class="text-primary">連起來。</span></h1>
            <p class="welcome-copy">熟悉的連連看，遇上 36 位動物朋友。<br />兩個轉彎之內，找到牠們通往彼此的路。</p>
            <div class="welcome-facts">
              <span><strong>36</strong> 種動物</span><span><strong>11</strong> 道關卡</span><span><strong>5</strong> 種風格</span>
            </div>
            <VCard border class="start-card pa-6">
              <div class="d-flex align-center justify-space-between mb-4"><h2 class="text-subtitle-1 font-weight-bold">今天，想挑戰哪一種？</h2><span class="text-caption text-medium-emphasis">選擇難度</span></div>
              <div class="difficulty-options">
                <VBtn v-for="difficulty in DIFFICULTIES" :key="difficulty.value" height="72" :variant="settings.difficulty === difficulty.value ? 'tonal' : 'outlined'" :color="settings.difficulty === difficulty.value ? 'primary' : undefined" :aria-pressed="settings.difficulty === difficulty.value" @click="updateSettings({ ...settings, difficulty: difficulty.value })">
                  <span><strong class="d-block text-subtitle-1">{{ difficulty.title }}</strong><span class="difficulty-subtitle">{{ difficulty.subtitle }}</span></span>
                </VBtn>
              </div>
              <p class="text-caption text-medium-emphasis mt-4 mb-4">第一關 {{ formatTime(menuDifficulty.seconds * 1000) }} · 提示 {{ menuDifficulty.resources }} 次 · 洗牌 {{ menuDifficulty.resources }} 次</p>
              <VBtn id="start-game" color="primary" variant="flat" size="x-large" block :append-icon="mdiArrowRight" @click="startGame">開始遊戲</VBtn>
            </VCard>
            <VBtn variant="text" :prepend-icon="mdiHelpCircleOutline" class="mt-3" @click="rulesOpen = true">第一次玩？看看玩法</VBtn>
          </section>
          <section class="animal-garden" aria-label="動物圖案展示">
            <div class="garden-orbit" aria-hidden="true" />
            <div class="garden-label"><span class="garden-label__dot" /> {{ activeTheme.label }} <span class="text-medium-emphasis">/ 36 FRIENDS</span></div>
            <div class="animal-mosaic">
              <div v-for="(animal, index) in sampleAnimals" :key="animal.id" class="animal-mosaic__tile" :class="`animal-mosaic__tile--${index % 4}`" :title="animal.label">
                <TileArtwork :kind="animal.id" :theme="settings.tileTheme" />
              </div>
            </div>
            <div class="garden-caption"><span class="handwritten">a little match, a little joy.</span><VBtn variant="text" size="small" :append-icon="mdiChevronRight" @click="settingsOpen = true">換個圖案風格</VBtn></div>
          </section>
        </main>

        <main v-else class="play-layout">
          <section class="play-main" aria-label="遊戲區">
            <div class="level-heading">
              <div><p class="eyebrow mb-2">LET'S FIND THEIR FRIENDS</p><h1 class="level-title">{{ game.layout.name }}</h1></div>
              <VChip color="primary" variant="tonal">{{ DIFFICULTIES[game.difficulty]?.title }} · {{ game.levelIndex + 1 }} / 11</VChip>
            </div>
            <VCard border class="board-card">
              <div class="board-toolbar">
                <div class="clock-stat" :class="{ 'text-error': timeLeft <= 30000 }"><span class="text-caption">剩餘時間</span><strong>{{ formatTime(timeLeft) }}</strong></div>
                <div class="board-stat"><span class="text-caption">分數</span><strong>{{ game.score.toLocaleString() }}</strong></div>
                <div class="board-stat"><span class="text-caption">剩餘配對</span><strong>{{ game.remaining / 2 }}<small> / 72</small></strong></div>
              </div>
              <VProgressLinear :model-value="timeLeft / game.layout.timeLimitMs * 100" :color="timeLeft <= 30000 ? 'error' : 'primary'" height="5" :aria-label="`剩餘時間 ${formatTime(timeLeft)}`" />
              <div class="board-surface" :class="{ 'board-surface--covered': game.phase === 'paused' }">
                <GameBoard :board="game.board" :revision="revision" :selected="game.selected" :hint="game.hint" :theme="settings.tileTheme" :disabled="!isPlaying" :path="path" :mismatch="mismatch" @select="selectTile" @cancel="cancelSelection" />
              </div>
              <div class="board-status" role="status" aria-live="polite"><VIcon :icon="mdiLeaf" size="17" color="primary" /><span>{{ status }}</span></div>
            </VCard>
            <p class="scroll-note text-caption text-medium-emphasis mt-2">小螢幕可橫向捲動棋盤，或轉為橫向顯示。</p>
            <div class="play-actions">
              <VBtn variant="tonal" color="primary" :prepend-icon="mdiLightbulbOutline" :disabled="!isPlaying || game.hints === 0 || !!game.hint" @click="useHint">提示 <span class="resource-count">{{ game.hints }}</span><kbd>H</kbd></VBtn>
              <VBtn variant="tonal" color="primary" :prepend-icon="mdiShuffleVariant" :disabled="!isPlaying || game.shuffles === 0" @click="shuffle">洗牌 <span class="resource-count">{{ game.shuffles }}</span><kbd>S</kbd></VBtn>
              <VBtn variant="outlined" :prepend-icon="mdiPause" :disabled="!isPlaying || game.shuffles === 0" @click="pause">暫停<kbd>P</kbd></VBtn>
              <VBtn variant="text" :prepend-icon="mdiArrowULeftTop" :disabled="!isPlaying" @click="leaveAction = 'restart'">重新開始</VBtn>
            </div>
          </section>

          <aside class="play-sidebar">
            <VCard border class="pa-5 chance-panel">
              <p class="eyebrow mb-4">A LITTLE EXTRA LUCK</p><h2 class="text-subtitle-1 font-weight-bold">機會動物</h2>
              <div class="chance-animal" role="img" :aria-label="`機會動物：${tileKind(game.chance).label}`"><TileArtwork :kind="game.chance" :theme="settings.tileTheme" /></div>
              <div class="chance-stars" :aria-label="`已收集 ${game.stars} 顆星，共需 3 顆`"><VIcon v-for="star in 3" :key="star" :icon="game.stars >= star ? mdiStar : mdiStarOutline" :color="game.stars >= star ? 'secondary' : 'grey'" size="30" /></div>
              <p class="text-body-2 text-medium-emphasis mt-3">配對目前的機會動物，收集一顆星。集滿三顆就能抽獎！</p>
              <p v-if="lastReward" class="text-body-2 text-primary mt-3" role="status">{{ lastReward }}</p>
            </VCard>
            <VCard color="surface-variant" class="pa-5 mt-4"><h2 class="text-subtitle-2 mb-2">兩個轉彎，一次相遇。</h2><p class="text-body-2">連線只能走空格，可以繞過棋盤外側。右鍵或 Esc 可取消選取。</p><VBtn variant="text" size="small" class="mt-2" :append-icon="mdiChevronRight" @click="rulesOpen = true">完整玩法</VBtn></VCard>
            <p class="text-caption text-medium-emphasis mt-4 px-2">目前風格 · {{ activeTheme.label }}</p>
          </aside>
        </main>

        <footer class="site-footer"><span>openkawai · 把小小的快樂，連在一起。</span><div><VBtn size="small" variant="text" @click="creditsOpen = true">素材與授權</VBtn><span class="text-caption">獨立重製 · MIT</span></div></footer>
        <VAlert v-if="!storageAvailable" type="warning" variant="tonal" density="compact" class="mb-4">此瀏覽器無法儲存設定與最佳紀錄；本次仍可遊玩。</VAlert>
      </VContainer>
    </VMain>

    <SettingsDialog v-model="settingsOpen" :settings="settings" :in-game="isPlaying" :storage-available="storageAvailable" @update:settings="updateSettings" />

    <VDialog :model-value="game?.phase === 'paused'" persistent max-width="430" aria-labelledby="pause-title">
      <VCard class="pa-3"><VCardText class="text-center pt-8"><VIcon :icon="mdiPause" size="40" color="primary" /><h2 id="pause-title" class="mt-4 mb-3">先休息一下。</h2><p>計時已停止。繼續時會重新洗牌，<br />消耗 1 次洗牌，機會動物保持不變。</p><p class="text-caption mt-3">目前剩餘 {{ game?.shuffles }} 次洗牌</p></VCardText><VCardActions class="pa-5"><VBtn block variant="flat" color="primary" :prepend-icon="mdiPlay" @click="resume">繼續遊戲</VBtn></VCardActions></VCard>
    </VDialog>

    <VDialog :model-value="game?.phase === 'cards'" persistent max-width="680" aria-labelledby="cards-title">
      <VCard><VCardTitle id="cards-title" class="dialog-heading"><VIcon :icon="mdiCardsOutline" color="primary" class="mr-2" />幸運翻牌</VCardTitle><VCardText><p class="mb-5">集滿三顆星！還可以翻 {{ game?.picks }} 張牌，計時暫停中。</p><div class="chance-cards"><VBtn v-for="(card, index) in game?.cards" :key="index" class="chance-card" height="88" :variant="card.revealed ? 'tonal' : 'flat'" :color="card.revealed ? 'secondary' : 'primary'" :disabled="card.revealed" :aria-label="card.revealed ? rewardLabel(card.reward) : `翻開第 ${index + 1} 張牌`" @click="chooseCard(index)"><span v-if="card.revealed">{{ rewardLabel(card.reward) }}</span><VIcon v-else :icon="mdiLeaf" size="26" /></VBtn></div><p class="text-body-2 text-primary mt-4" role="status">{{ lastReward || '選一張，讓好運來找你。' }}</p></VCardText></VCard>
    </VDialog>

    <VDialog :model-value="resultOpen" persistent max-width="470" aria-labelledby="result-title">
      <VCard class="pa-2"><VCardText class="text-center pt-8"><VIcon :icon="game?.phase === 'lost' ? mdiLeaf : mdiTrophyOutline" size="46" color="primary" /><h2 id="result-title" class="mt-4 mb-3">{{ resultTitle }}</h2><p class="text-body-2 text-medium-emphasis">{{ resultCopy }}</p><div class="result-score my-5">{{ game?.score.toLocaleString() }} <span>分</span></div><VChip v-if="game?.phase !== 'lost'" color="primary" variant="tonal">過關獎勵 +{{ game?.bonus.toLocaleString() }}</VChip></VCardText><VCardActions class="pa-5"><VBtn block color="primary" variant="flat" :append-icon="mdiArrowRight" @click="game?.phase === 'won' ? continueLevel() : finishRun()">{{ game?.phase === 'won' ? '前往下一關' : '查看本次紀錄' }}</VBtn></VCardActions></VCard>
    </VDialog>

    <VDialog v-model="nameEntry" persistent max-width="450" aria-labelledby="name-title">
      <VCard><VCardTitle id="name-title" class="dialog-heading">恭喜，進入最佳紀錄！</VCardTitle><VCardText><p class="mb-4">{{ game?.score.toLocaleString() }} 分。留下你的名字吧。</p><VTable density="compact" class="mb-5"><thead><tr><th>排名</th><th>玩家</th><th class="text-right">分數</th></tr></thead><tbody><tr v-for="row in provisionalRecords" :key="row.rank" :class="{ 'text-primary font-weight-bold': row.pending }" :aria-current="row.pending ? 'true' : undefined"><td>{{ row.rank }}</td><td>{{ row.pending ? enteredName || '你（待儲存）' : row.entry ? row.entry.name.trim() || '（未署名）' : '等待你的名字' }}</td><td class="text-right">{{ row.entry?.score.toLocaleString() ?? '—' }}</td></tr></tbody></VTable><form id="record-form" @submit.prevent="saveRecord"><VTextField :model-value="enteredName" label="玩家名稱" maxlength="16" counter="16" autofocus variant="outlined" hint="使用 A–Z 與空格，最多 16 個字元；也可以留白。" persistent-hint @update:model-value="enteredName = playerName($event ?? '')" @keydown.esc.prevent /></form></VCardText><VCardActions class="pa-5 pt-0"><VBtn type="submit" form="record-form" block color="primary" variant="flat" :prepend-icon="mdiCheck">儲存紀錄</VBtn></VCardActions></VCard>
    </VDialog>

    <VDialog v-model="recordsOpen" max-width="620" aria-labelledby="records-title">
      <VCard><VCardTitle id="records-title" class="dialog-heading">最佳紀錄</VCardTitle><VTabs v-model="recordsDifficulty" color="primary" grow><VTab v-for="difficulty in DIFFICULTIES" :key="difficulty.value" :value="difficulty.value">{{ difficulty.title }}</VTab></VTabs><VCardText class="pt-2"><VTable density="comfortable"><thead><tr><th>排名</th><th>玩家</th><th class="text-right">分數</th><th class="text-right">關卡</th></tr></thead><tbody><tr v-for="row in recordRows" :key="row.rank"><td>{{ String(row.rank).padStart(2, '0') }}</td><td>{{ row.entry ? row.entry.name.trim() || '（未署名）' : '等待你的名字' }}</td><td class="text-right font-weight-bold">{{ row.entry?.score.toLocaleString() ?? '—' }}</td><td class="text-right">{{ row.entry ? row.entry.level === 11 ? 'ALL PASS' : row.entry.level + 1 : '—' }}</td></tr></tbody></VTable><p class="text-caption text-medium-emphasis mt-3">依難度分別記錄前十名，儲存在此瀏覽器。</p></VCardText><VCardActions class="pa-5 pt-0"><VSpacer /><VBtn color="primary" @click="recordsOpen = false">關閉</VBtn></VCardActions></VCard>
    </VDialog>

    <VDialog v-model="rulesOpen" max-width="580" aria-labelledby="rules-title">
      <VCard><VCardTitle id="rules-title" class="dialog-heading">一分鐘，學會連連看。</VCardTitle><VCardText><ol class="rules-list"><li><strong>找兩隻相同的動物。</strong>依序點選，連線只能走空格，最多轉兩個彎；棋盤外側也可以通行。</li><li><strong>把握時間。</strong>每次配對會加分、補回時間。清空 72 對就能前進下一關，共有 11 關，動物會依關卡往不同方向靠攏。</li><li><strong>善用提示與洗牌。</strong>提示會標出一組可配對的動物；洗牌會重排剩餘圖案。無解時會自動消耗洗牌；若已用完，遊戲結束。</li><li><strong>讓運氣幫忙。</strong>配對機會動物可得一顆星，集滿三顆就能翻牌，獲得時間、提示或洗牌。每次配對後機會動物都可能改變。</li><li><strong>暫停也有小代價。</strong>需有剩餘洗牌次數才能暫停；繼續時消耗 1 次並重排棋盤。</li></ol><VDivider class="my-4" /><p class="text-body-2">鍵盤：方向鍵移動、Enter／空白鍵選取、H 提示、S 洗牌、P 暫停／繼續、R 重新開始、Esc 取消選取。滑鼠右鍵也可取消。</p><p class="text-body-2 mt-3">設定中的圖案風格可隨時更換，棋盤與進度不會重設。</p></VCardText><VCardActions class="pa-5 pt-0"><VBtn block color="primary" variant="flat" @click="rulesOpen = false">知道了，來找朋友！</VBtn></VCardActions></VCard>
    </VDialog>

    <VDialog v-model="creditsOpen" max-width="580" aria-labelledby="credits-title">
      <VCard><VCardTitle id="credits-title" class="dialog-heading">素材與授權</VCardTitle><VCardText><p class="text-body-2 mb-4">謝謝讓動物們如此可愛的創作者。五套圖案皆使用原始作品，未修改圖檔。</p><div v-for="theme in TILE_THEMES" :key="theme.id" class="credit-row"><div><a :href="theme.sourceUrl" target="_blank" rel="noopener noreferrer">{{ theme.label }}</a><p class="text-caption text-medium-emphasis mt-1">{{ theme.attribution }}</p><a v-if="'noticeFile' in theme" :href="`${publicBase}licenses/${theme.noticeFile}`" class="text-caption" target="_blank" rel="noopener noreferrer">著作權聲明</a></div><a :href="`${publicBase}licenses/${theme.licenseFile}`" target="_blank" rel="noopener noreferrer">{{ theme.license }}</a></div><p class="text-caption text-medium-emphasis mt-4">openkawai 為獨立重製，程式碼採 MIT 授權。本專案不含《KAWAI 連連看 2004》原作的圖像、音樂或程式。素材的完整授權與來源隨專案附上。</p></VCardText><VCardActions class="pa-5 pt-0"><VSpacer /><VBtn color="primary" @click="creditsOpen = false">關閉</VBtn></VCardActions></VCard>
    </VDialog>

    <VDialog :model-value="leaveAction !== null" max-width="420" aria-labelledby="leave-title" @update:model-value="!$event && (leaveAction = null)">
      <VCard><VCardTitle id="leave-title" class="dialog-heading">重新開始這趟旅程？</VCardTitle><VCardText>本次尚未完成的遊戲進度將不會儲存。</VCardText><VCardActions class="pa-5"><VBtn @click="leaveAction = null">繼續玩</VBtn><VSpacer /><VBtn color="primary" variant="flat" @click="confirmLeave">重新開始</VBtn></VCardActions></VCard>
    </VDialog>
  </VApp>
</template>
