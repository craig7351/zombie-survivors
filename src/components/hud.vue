<template>
  <div class="pointer-events-none absolute inset-0 z-10 select-none">
    <!-- 左上：狀態 -->
    <!-- 手機：整個資訊區下移到右上控制列下方，才有整排寬度可一列排開；桌機維持 top-4 -->
    <div class="absolute top-16 left-4 flex flex-col gap-3 sm:top-4">
      <!-- 標題（手機隱藏，避免與按鈕/王血條重疊） -->
      <div class="hidden items-center gap-3 sm:flex">
        <span class="text-xl font-semibold text-text-primary">殭屍大逃殺</span>
      </div>

      <!-- 狀態列：單一表面 + 髮絲線，數字等寬 -->
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
        <span class="num">FPS {{ stats.fps }}</span>
        <span class="num">敵人 {{ stats.enemies }}</span>
        <span class="num">擊殺 {{ stats.kills }}</span>
        <span class="num">時間 {{ timeText }}</span>
        <span v-if="stats.mode === 'deathmatch'" class="num font-medium text-danger">
          第 {{ stats.wave }} 波
        </span>
        <span v-if="stats.mutator" class="font-medium text-caution">{{ stats.mutator }}</span>
      </div>

      <!-- 血量 -->
      <div class="flex items-center gap-2">
        <div class="track relative h-2 w-40 overflow-hidden rounded-full sm:w-56">
          <div
            class="h-full rounded-full bg-danger transition-[width] duration-150"
            :style="{ width: hpPercent + '%' }"
          />
        </div>
        <span class="num text-xs text-text-secondary">{{ stats.hp }} / {{ stats.maxHp }}</span>
      </div>

      <!-- 等級與經驗 -->
      <div class="flex items-center gap-2">
        <span class="num rounded border border-hairline bg-surface-2 px-2 py-0.5 text-xs font-medium text-text-primary">
          Lv {{ stats.level }}
        </span>
        <div class="track h-1.5 w-32 overflow-hidden rounded-full sm:w-44">
          <div
            class="h-full rounded-full bg-success transition-[width] duration-150"
            :style="{ width: xpPercent + '%' }"
          />
        </div>
      </div>
    </div>

    <!-- 王血條：全站唯一的高潮時刻 -->
    <div
      v-if="stats.bossActive"
      class="absolute left-1/2 top-32 w-[min(92vw,32rem)] -translate-x-1/2 text-center sm:top-4 sm:w-[min(80vw,32rem)]"
    >
      <div class="mb-1 flex items-center justify-center gap-2 text-sm text-text-primary">
        <span class="font-medium">{{ stats.bossName }}</span>
        <span class="text-xs text-text-secondary">{{ stats.bossSkill }}</span>
        <span v-if="stats.mode !== 'deathmatch'" class="num text-xs text-text-muted">
          {{ stats.bossDefeated + 1 }}/{{ stats.bossTotal }}
        </span>
      </div>
      <div class="relative overflow-hidden rounded-full">
        <!-- Signature：警戒條紋壓在血條上緣 4px -->
        <span class="warn-stripe absolute top-0 left-0 z-10 h-1 w-full" aria-hidden="true" />
        <div class="track h-3 overflow-hidden rounded-full">
          <div
            class="h-full bg-danger transition-[width] duration-150"
            :style="{ width: bossPercent + '%' }"
          />
        </div>
      </div>
    </div>

    <!-- 操作提示 -->
    <div class="absolute right-4 bottom-4 text-xs text-text-muted">
      WASD／方向鍵移動・左下搖桿（觸控）・武器自動攻擊
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { GameStats } from '../game/game';

const props = defineProps<{ stats: GameStats }>();

const bossPercent = computed(() =>
  props.stats.bossMaxHp > 0 ? (props.stats.bossHp / props.stats.bossMaxHp) * 100 : 0,
);

const hpPercent = computed(() =>
  props.stats.maxHp > 0 ? (props.stats.hp / props.stats.maxHp) * 100 : 0,
);
const xpPercent = computed(() =>
  props.stats.xpToNext > 0 ? Math.min(100, (props.stats.xp / props.stats.xpToNext) * 100) : 0,
);
const timeText = computed(() => {
  const total = Math.floor(props.stats.time);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
});
</script>
