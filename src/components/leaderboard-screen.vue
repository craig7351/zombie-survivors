<template>
  <div class="absolute inset-0 overflow-auto text-text-primary">
    <background-polygons />

    <div class="relative mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <div class="flex items-center gap-3 pt-4">
        <button
          class="rounded-lg bg-surface-2 px-4 py-2 font-medium transition hover:bg-surface-3 active:scale-95"
          @click="emit('back')"
        >
          <game-icon name="back" :size="16" />返回
        </button>
        <h1 class="flex items-center gap-2 text-lg font-medium text-text-primary">
          <game-icon name="trophy" :size="20" />排行榜
        </h1>
        <span
          class="rounded-lg px-2 py-0.5 text-xs font-medium"
          :class="isGlobal ? 'bg-accent text-void' : 'bg-surface-2 text-text-secondary'"
        >
          {{ isGlobal ? '全球' : '本機' }}
        </span>
      </div>

      <!-- 模式切換：劇情 / 死鬥 -->
      <div class="flex gap-2">
        <button
          v-for="g in gameModes"
          :key="g.id"
          class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition active:scale-95"
          :class="gameMode === g.id ? 'bg-accent text-void' : 'bg-surface-1 text-text-secondary hover:bg-surface-3'"
          @click="selectGameMode(g.id)"
        >
          {{ g.label }}
        </button>
      </div>

      <!-- 劇情：破關榜 / 生存榜 -->
      <div v-if="gameMode === 'story'" class="flex gap-2">
        <button
          v-for="m in boards"
          :key="m.id"
          class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition active:scale-95"
          :class="board === m.id ? 'bg-accent text-void' : 'bg-surface-1 text-text-secondary hover:bg-surface-3'"
          @click="selectBoard(m.id)"
        >
          {{ m.label }}
        </button>
      </div>

      <p class="-mt-1 text-center text-xs text-text-muted">{{ hint }}</p>

      <!-- 難度分頁 -->
      <div class="flex flex-wrap gap-2">
        <button
          v-for="t in tabs"
          :key="t.id"
          class="rounded-lg px-3 py-1 text-sm font-medium transition active:scale-95"
          :class="selected === t.id ? 'bg-accent text-void' : 'bg-surface-1 text-text-secondary hover:bg-surface-3'"
          @click="selectTab(t.id)"
        >
          {{ t.label }}
        </button>
      </div>

      <div v-if="records.length === 0" class="rounded-2xl bg-surface-1 p-8 text-center text-text-secondary">
        {{ emptyHint }}
      </div>

      <!-- 死鬥榜 -->
      <div v-else-if="gameMode === 'deathmatch'" class="overflow-hidden rounded-2xl bg-surface-1 border border-hairline">
        <div class="grid grid-cols-[2.5rem_1fr_3rem_3.5rem_4.5rem] gap-2 border-b border-white/10 px-4 py-2 text-xs font-medium text-text-muted">
          <span>#</span>
          <span>玩家</span>
          <span class="text-right">波</span>
          <span class="text-right">擊殺</span>
          <span class="text-right">分數</span>
        </div>
        <div
          v-for="(r, i) in records"
          :key="i"
          class="grid grid-cols-[2.5rem_1fr_3rem_3.5rem_4.5rem] items-center gap-2 px-4 py-2 text-sm"
          :class="i % 2 ? 'bg-surface-1' : 'bg-surface-1'"
        >
          <span class="font-medium" :class="rankClass(i)">{{ i + 1 }}</span>
          <span class="min-w-0 truncate font-medium">
            {{ r.name || '玩家' }}
            <span class="text-[0.66rem] font-normal text-text-muted">{{ r.character }}</span>
            <span v-if="selected === ''" class="ml-1 text-[0.62rem]" :style="{ color: diffColor(r.difficulty) }">
              {{ diffLabel(r.difficulty) }}
            </span>
          </span>
          <span class="text-right font-medium text-danger">{{ r.wave }}</span>
          <span class="text-right">{{ r.kills }}</span>
          <span class="text-right font-mono text-accent">{{ r.score }}</span>
        </div>
      </div>

      <!-- 劇情榜（破關/生存） -->
      <div v-else class="overflow-hidden rounded-2xl bg-surface-1 border border-hairline">
        <div class="grid grid-cols-[2.5rem_1fr_4.5rem_3.5rem_3rem] gap-2 border-b border-white/10 px-4 py-2 text-xs font-medium text-text-muted">
          <span>#</span>
          <span>玩家</span>
          <span class="text-right">{{ board === 'cleared' ? '破關' : '存活' }}</span>
          <span class="text-right">擊殺</span>
          <span class="text-right">等級</span>
        </div>
        <div
          v-for="(r, i) in records"
          :key="i"
          class="grid grid-cols-[2.5rem_1fr_4.5rem_3.5rem_3rem] items-center gap-2 px-4 py-2 text-sm"
          :class="i % 2 ? 'bg-surface-1' : 'bg-surface-1'"
        >
          <span class="font-medium" :class="rankClass(i)">{{ i + 1 }}</span>
          <span class="min-w-0 truncate font-medium">
            {{ r.name || '玩家' }}
            <span class="text-[0.66rem] font-normal text-text-muted">{{ r.character }}</span>
            <span v-if="selected === ''" class="ml-1 text-[0.62rem]" :style="{ color: diffColor(r.difficulty) }">
              {{ diffLabel(r.difficulty) }}
            </span>
          </span>
          <span class="text-right font-mono" :class="board === 'cleared' ? 'text-accent' : ''">{{ timeText(r.time) }}</span>
          <span class="text-right">{{ r.kills }}</span>
          <span class="text-right">{{ r.level }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import GameIcon from './game-icon.vue';
import { computed, onMounted, ref } from 'vue';
import BackgroundPolygons from './background-polygons.vue';
import { loadRecords, type RunRecord } from '../game/leaderboard';
import { fetchLeaderboard } from '../game/api';
import { DIFFICULTIES, getDifficulty } from '../game/difficulty';

const emit = defineEmits<{ (e: 'back'): void }>();

type GameMode = 'story' | 'deathmatch';
type Board = 'cleared' | 'survival';
const gameModes: { id: GameMode; label: string }[] = [
  { id: 'story', label: '劇情模式' },
  { id: 'deathmatch', label: '死鬥模式' },
];
const boards: { id: Board; label: string }[] = [
  { id: 'cleared', label: '破關榜' },
  { id: 'survival', label: '生存榜' },
];
const tabs = [{ id: '', label: '全部' }, ...DIFFICULTIES.map((d) => ({ id: d.id, label: d.name }))];

const gameMode = ref<GameMode>('story');
const board = ref<Board>('cleared');
const selected = ref('');
const records = ref<RunRecord[]>([]);
const isGlobal = ref(false);

const hint = computed(() => {
  if (gameMode.value === 'deathmatch') return '無盡死鬥，比誰撐到最高波（分數 = 波數×1000 + 擊殺 + 秒數）';
  return board.value === 'cleared' ? '擊敗全部 7 王者，比誰破關最快' : '未破關者，比誰活得最久';
});
const emptyHint = computed(() => {
  if (gameMode.value === 'deathmatch') return '此難度尚無死鬥紀錄，來開一場！';
  return board.value === 'cleared' ? '此難度尚無人破關，來搶頭香！' : '此難度尚無紀錄，快去拚一場！';
});

async function refresh() {
  const diff = selected.value;
  const gm = gameMode.value;
  /** 本機回退：依模式過濾 + 排序 */
  records.value = loadRecords()
    .filter((r) => {
      if ((r.mode ?? 'story') !== gm) return false;
      if (diff && r.difficulty !== diff) return false;
      if (gm === 'story') return !!r.won === (board.value === 'cleared');
      return true;
    })
    .sort((a, b) =>
      gm === 'deathmatch' ? b.score - a.score : board.value === 'cleared' ? a.time - b.time : b.time - a.time,
    )
    .slice(0, 10);
  isGlobal.value = false;
  const global = await fetchLeaderboard(10, diff || undefined, board.value, gm);
  if (global) {
    records.value = global;
    isGlobal.value = true;
  }
}
function selectGameMode(g: GameMode) {
  gameMode.value = g;
  void refresh();
}
function selectBoard(b: Board) {
  board.value = b;
  void refresh();
}
function selectTab(id: string) {
  selected.value = id;
  void refresh();
}
onMounted(refresh);

function timeText(t: number) {
  const total = Math.floor(t);
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`;
}
function rankClass(i: number) {
  return ['text-accent', 'text-text-primary', 'text-text-secondary'][i] ?? 'text-text-muted';
}
function diffLabel(id: string) {
  const d = getDifficulty(id || 'easy');
  return d.name;
}
function diffColor(id: string) {
  return getDifficulty(id || 'easy').color;
}
</script>
