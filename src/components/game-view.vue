<template>
  <div class="relative w-full h-full overflow-hidden bg-[#0b1020]">
    <canvas ref="canvasRef" class="w-full h-full block outline-none touch-none" />

    <hud :stats="stats" />

    <!-- 死鬥：連殺數（左上角，受擊歸零） -->
    <div
      v-if="stats.mode === 'deathmatch' && stats.combo >= 5 && stats.state === 'running'"
      class="pointer-events-none absolute left-1/2 top-20 z-10 -translate-x-1/2 text-center font-black text-amber-300 drop-shadow-[0_2px_0_rgba(0,0,0,0.5)]"
    >
      <span class="text-2xl sm:text-3xl">{{ stats.combo }}</span>
      <span class="ml-1 text-sm">連殺</span>
    </div>

    <!-- 死鬥：波數字卡（進新波時短暫顯示） -->
    <div
      v-if="stats.waveCard && stats.state === 'running'"
      class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
    >
      <div class="wave-card text-5xl font-black tracking-widest text-lime-300 sm:text-7xl" style="-webkit-text-stroke: 4px #14210f; paint-order: stroke fill">
        {{ stats.waveCard }}
      </div>
    </div>

    <!-- 右上控制：靜音／暫停／技能等級／Debug -->
    <div v-show="stats.state === 'running'" class="absolute right-3 top-3 z-10 flex items-center gap-1.5 sm:right-4 sm:top-4 sm:gap-2">
      <button
        class="flex h-9 w-9 items-center justify-center rounded-full sm:h-11 sm:w-11 bg-black/40 text-base text-white backdrop-blur-md sm:text-xl transition hover:bg-black/60 active:scale-95"
        @click="onToggleMute"
      >
        <game-icon :name="muted ? 'mute' : 'sound'" :size="16" />
      </button>
      <select
        v-model="quality"
        @change="onQuality"
        title="畫質"
        class="h-9 rounded-full border-0 bg-black/40 px-2 text-xs text-white outline-none backdrop-blur-md transition hover:bg-black/60 sm:h-11 sm:px-3 sm:text-sm"
      >
        <option v-for="q in qualities" :key="q.id" :value="q.id" class="bg-zinc-900 text-white">{{ q.name }}畫質</option>
      </select>
      <button
        class="flex h-9 w-9 items-center justify-center rounded-full sm:h-11 sm:w-11 bg-black/40 text-base text-white backdrop-blur-md sm:text-xl transition hover:bg-black/60 active:scale-95"
        @click="onTogglePause"
      >
        <game-icon name="pause" :size="16" />
      </button>
      <button
        class="flex h-9 w-9 items-center justify-center rounded-full sm:h-11 sm:w-11 text-base text-white backdrop-blur-md sm:text-xl transition active:scale-95"
        :class="showStats ? 'bg-cyan-500' : 'bg-black/40 hover:bg-black/60'"
        @click="onToggleStats"
      >
        <game-icon name="chart" :size="16" />
      </button>
      <button
        class="flex h-9 w-9 items-center justify-center rounded-full sm:h-11 sm:w-11 text-base text-white backdrop-blur-md sm:text-xl transition active:scale-95"
        :class="showDebug ? 'bg-fuchsia-500' : 'bg-black/40 hover:bg-black/60'"
        @click="onToggleDebug"
      >
        <game-icon name="wrench" :size="16" />
      </button>
    </div>

    <!-- 技能等級面板 -->
    <div
      v-if="showStats && stats.state === 'running'"
      class="absolute right-4 top-20 z-20 max-h-[78vh] w-60 overflow-y-auto rounded-2xl bg-black/75 p-3 text-xs text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-md"
    >
      <div class="mb-2 text-sm font-black text-cyan-300">技能等級</div>
      <div
        v-for="(u, i) in upgradeStatus"
        :key="i"
        class="mb-1 flex items-center justify-between"
        :class="u.level === 0 ? 'text-white/40' : ''"
      >
        <game-icon :name="u.icon" :size="14" class="text-text-secondary" />
          <span>{{ u.name }}</span>
        <span class="font-bold" :class="u.level >= u.maxLevel ? 'text-amber-300' : 'text-white/80'">
          Lv {{ u.level }}/{{ u.maxLevel }}
        </span>
      </div>
    </div>

    <!-- Debug 參數面板 -->
    <div
      v-if="showDebug && stats.state === 'running'"
      class="absolute right-4 top-20 z-20 max-h-[78vh] w-72 overflow-y-auto rounded-2xl bg-black/75 p-3 text-xs text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-md"
    >
      <!-- 召喚王 -->
      <div class="mb-3 rounded-lg bg-white/5 p-2">
        <div class="mb-1 text-sm font-black text-fuchsia-300">召喚王</div>
        <div class="flex gap-2">
          <select v-model.number="summonIndex" class="min-w-0 flex-1 rounded bg-black/50 px-2 py-1 text-white outline-none">
            <option v-for="(n, i) in bossNames" :key="i" :value="i" class="text-black">{{ i + 1 }}. {{ n }}</option>
          </select>
          <button class="rounded bg-fuchsia-500 px-3 py-1 font-black active:scale-95" @click="onSummonBoss">召喚</button>
        </div>
      </div>

      <template v-for="g in debugGroups" :key="g.group">
        <div class="mb-1 mt-2 text-sm font-black text-fuchsia-300">{{ g.group }}</div>
        <div v-for="item in g.items" :key="item.index" class="mb-2">
          <label v-if="item.type === 'bool'" class="flex cursor-pointer items-center justify-between">
            <span>{{ item.label }}</span>
            <input
              type="checkbox"
              class="h-4 w-4 accent-fuchsia-400"
              :checked="item.value > 0.5"
              @change="onDebugToggle(item.index, $event)"
            />
          </label>
          <template v-else>
            <div class="flex justify-between">
              <span>{{ item.label }}</span>
              <span class="font-bold text-white/70">{{ fmt(item.value) }}</span>
            </div>
            <input
              type="range"
              class="w-full accent-fuchsia-400"
              :min="item.min"
              :max="item.max"
              :step="item.step"
              :value="item.value"
              @input="onDebugInput(item.index, $event)"
            />
          </template>
        </div>
      </template>
    </div>

    <joystick
      v-show="stats.state === 'running'"
      class="absolute bottom-8 left-8 z-10"
      @move="onJoyMove"
      @end="onJoyEnd"
    />

    <!-- 跳躍鈕（手機，遊玩中顯示） -->
    <button
      v-show="stats.state === 'running'"
      class="absolute bottom-12 right-10 z-10 flex h-20 w-20 items-center justify-center rounded-full bg-sky-500/70 text-base font-black text-white backdrop-blur-md transition active:scale-90"
      @pointerdown.prevent="onJump"
    >
      跳躍
    </button>

    <!-- 祝福／詛咒：暫停式大彈窗（state=levelup） -->
    <level-up-modal
      v-if="stats.state === 'levelup'"
      :level="stats.level"
      :choices="stats.choices"
      @choose="onChoose"
    />

    <!-- 一般升級：不暫停的選項列（遊戲進行中且有待選） -->
    <level-up-bar
      v-if="stats.state === 'running' && stats.choices.length > 0"
      :choices="stats.choices"
      :pending="stats.pendingLevels"
      @choose="onChoose"
    />

    <game-over-modal
      v-if="stats.state === 'dead'"
      :stats="stats"
      @restart="onRestart"
      @menu="emit('menu')"
    />

    <victory-modal
      v-if="stats.state === 'won'"
      :stats="stats"
      @restart="onRestart"
      @menu="emit('menu')"
    />

    <pause-menu-modal
      v-if="stats.state === 'paused'"
      @resume="onTogglePause"
      @restart="onRestart"
      @menu="emit('menu')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import {
  createGame,
  type GameHandle,
  type GameStats,
  type RunResult,
  type DebugParamView,
  type UpgradeStatusView,
  type GameMode,
} from '../game/game';
import { QUALITIES, type QualityId } from '../game/quality';
import type { RunState } from '../game/upgrades';
import type { Difficulty } from '../game/difficulty';
import GameIcon from './game-icon.vue';
import Hud from './hud.vue';
import Joystick from './joystick.vue';
import LevelUpModal from './level-up-modal.vue';
import LevelUpBar from './level-up-bar.vue';
import GameOverModal from './game-over-modal.vue';
import VictoryModal from './victory-modal.vue';
import PauseMenuModal from './pause-menu-modal.vue';

const props = defineProps<{
  characterColor: [number, number, number];
  characterModel?: string;
  startRunState?: RunState;
  goldMultiplier: number;
  difficulty?: Difficulty;
  mode?: GameMode;
}>();
const emit = defineEmits<{
  (e: 'gameover', result: RunResult): void;
  (e: 'menu'): void;
}>();

const canvasRef = ref<HTMLCanvasElement>();
const stats = reactive<GameStats>({
  fps: 0,
  enemies: 0,
  kills: 0,
  time: 0,
  hp: 0,
  maxHp: 0,
  level: 1,
  xp: 0,
  xpToNext: 1,
  state: 'running',
  choices: [],
  bossActive: false,
  bossHp: 0,
  bossMaxHp: 0,
  bossName: '',
  bossSkill: '',
  bossDefeated: 0,
  bossTotal: 5,
  goldEarned: 0,
  musicTrack: 0,
  mode: 'story',
  wave: 0,
  combo: 0,
  waveCard: '',
  mutator: '',
  pendingLevels: 0,
});

let game: GameHandle | undefined;


const MUTE_KEY = 'animal-survivors:muted';
const muted = ref(localStorage.getItem(MUTE_KEY) === '1');

const QUALITY_KEY = 'animal-survivors:quality';
const qualities = QUALITIES;
const quality = ref<QualityId>((localStorage.getItem(QUALITY_KEY) as QualityId) || 'high'); // 預設高，不因裝置自動降

const showStats = ref(false);
const upgradeStatus = ref<UpgradeStatusView[]>([]);

const showDebug = ref(false);
const debugParams = ref<DebugParamView[]>([]);
const bossNames = ref<string[]>([]);
const summonIndex = ref(0);
const debugGroups = computed(() => {
  const map = new Map<string, (DebugParamView & { index: number })[]>();
  debugParams.value.forEach((p, i) => {
    if (!map.has(p.group)) map.set(p.group, []);
    map.get(p.group)!.push({ ...p, index: i });
  });
  return [...map.entries()].map(([group, items]) => ({ group, items }));
});

onMounted(() => {
  if (!canvasRef.value) return;
  game = createGame(canvasRef.value, {
    startRunState: props.startRunState,
    characterColor: props.characterColor,
    characterModel: props.characterModel,
    goldMultiplier: props.goldMultiplier,
    difficulty: props.difficulty,
    quality: quality.value,
    mode: props.mode,
    onStats: (s) => {
      Object.assign(stats, s);
      if (showStats.value && game) upgradeStatus.value = game.getUpgradeStatus();
    },
    onGameOver: (r) => emit('gameover', r),
  });
  game.setMuted(muted.value);
});

onBeforeUnmount(() => {
  game?.dispose();
});

function onJoyMove(dir: { x: number; z: number }) {
  game?.setJoystick(dir.x, dir.z);
}
function onJoyEnd() {
  game?.setJoystick(0, 0);
}
function onChoose(index: number) {
  game?.chooseUpgrade(index);
}
function onRestart() {
  game?.restart();
}
function onTogglePause() {
  game?.togglePause();
}
function onJump() {
  game?.jump();
}
function onToggleMute() {
  muted.value = !muted.value;
  localStorage.setItem(MUTE_KEY, muted.value ? '1' : '0');
  game?.setMuted(muted.value);
}
function onQuality() {
  localStorage.setItem(QUALITY_KEY, quality.value);
  game?.setQuality(quality.value);
}
function onToggleStats() {
  showStats.value = !showStats.value;
  if (showStats.value && game) upgradeStatus.value = game.getUpgradeStatus();
}
function onToggleDebug() {
  /** 每次開啟參數面板都需通過驗證（答對作者全名）；關閉不需要 */
  if (!showDebug.value) {
    const answer = window.prompt('請問作者的全名（三個字）？');
    if (answer === null) return;
    if (answer.trim() !== '黃國書') {
      window.alert('答錯了，無法開啟 Debug');
      return;
    }
    /** 開啟 Debug 即視為作弊，本局不列入排行榜（先讓玩家確認） */
    if (!window.confirm('開啟 Debug 面板後，本局成績將不列入排行榜。確定開啟？')) return;
    game?.markCheated();
  }
  showDebug.value = !showDebug.value;
  if (showDebug.value && game) {
    debugParams.value = game.getDebugParams();
    bossNames.value = game.getBossNames();
  }
}
function onSummonBoss() {
  game?.summonBoss(summonIndex.value);
}
function onDebugInput(index: number, e: Event) {
  const v = Number((e.target as HTMLInputElement).value);
  if (debugParams.value[index]) debugParams.value[index].value = v;
  game?.setDebugParam(index, v);
}
function onDebugToggle(index: number, e: Event) {
  const v = (e.target as HTMLInputElement).checked ? 1 : 0;
  if (debugParams.value[index]) debugParams.value[index].value = v;
  game?.setDebugParam(index, v);
}
function fmt(v: number) {
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}
</script>

<style scoped>
.wave-card {
  animation: wave-pop 1.6s ease-out forwards;
}
@keyframes wave-pop {
  0% { transform: scale(0.6); opacity: 0; }
  15% { transform: scale(1.1); opacity: 1; }
  30% { transform: scale(1); opacity: 1; }
  75% { opacity: 1; }
  100% { transform: scale(1); opacity: 0; }
}
</style>
