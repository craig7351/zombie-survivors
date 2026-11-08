<template>
  <div class="absolute inset-0 z-20 flex items-center justify-center bg-void/85">
    <div class="w-[min(90vw,26rem)] rounded-2xl bg-surface-1 p-8 text-center text-text-primary shadow-[0_8px_24px_rgba(0,0,0,0.45)] border border-hairline">
      <div class="text-lg font-medium text-danger">你被殭屍吞噬了！</div>

      <!-- 死鬥：波數 + 分數 -->
      <div v-if="stats.mode === 'deathmatch'" class="my-4 rounded-2xl bg-danger/15 py-3">
        <div class="text-sm text-text-secondary">撐到 第 {{ stats.wave }} 波</div>
        <div class="text-lg font-medium text-accent">{{ deathScore }} 分</div>
      </div>

      <div class="my-5 grid grid-cols-3 gap-3">
        <div class="rounded-2xl bg-surface-1 p-3">
          <div class="text-xs text-text-secondary">存活</div>
          <div class="text-lg font-medium">{{ timeText }}</div>
        </div>
        <div class="rounded-2xl bg-surface-1 p-3">
          <div class="text-xs text-text-secondary">擊殺</div>
          <div class="text-lg font-medium">{{ stats.kills }}</div>
        </div>
        <div class="rounded-2xl bg-surface-1 p-3">
          <div class="text-xs text-text-secondary">等級</div>
          <div class="text-lg font-medium">{{ stats.level }}</div>
        </div>
      </div>

      <div class="mb-6 flex items-center justify-center gap-2 rounded-xl bg-surface-2 py-2 text-lg font-medium text-accent">
        <game-icon name="coins" :size="20" />
        獲得 <span class="num">{{ stats.goldEarned }}</span> 金幣
      </div>

      <div class="flex gap-3">
        <button
          class="flex-1 rounded-lg bg-surface-2 px-4 py-3 text-lg font-medium transition hover:bg-surface-3 active:scale-95"
          @click="emit('menu')"
        >
          主選單
        </button>
        <button
          class="flex-1 rounded-lg bg-accent px-4 py-3 text-lg font-medium text-void transition hover:bg-accent active:scale-95"
          @click="emit('restart')"
        >
          再玩一次
        </button>
      </div>

      <a
        href="https://www.facebook.com/people/Book-Ai/61584339789020/"
        target="_blank"
        rel="noopener"
        class="mt-3 block rounded-lg bg-surface-3 px-4 py-2.5 text-center text-sm font-medium text-text-primary transition hover:bg-surface-4 active:scale-95"
      >
        加我粉專獲得最新遊戲資訊
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import GameIcon from './game-icon.vue';
import { computed } from 'vue';
import type { GameStats } from '../game/game';

const props = defineProps<{ stats: GameStats }>();
const emit = defineEmits<{ (e: 'restart'): void; (e: 'menu'): void }>();

const timeText = computed(() => {
  const total = Math.floor(props.stats.time);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
});
/** 死鬥分數：波數×1000 + 擊殺 + 秒數（與後端 deathmatchScore 一致） */
const deathScore = computed(() => props.stats.wave * 1000 + props.stats.kills + Math.floor(props.stats.time));
</script>
