<template>
  <div class="absolute inset-0 flex flex-col items-center justify-center overflow-auto text-text-primary">
    <background-polygons />

    <div class="relative flex w-full max-w-3xl flex-col gap-5 p-6">
      <div class="flex items-center gap-3">
        <button
          class="rounded-lg bg-surface-2 px-4 py-2 font-medium transition hover:bg-surface-3 active:scale-95"
          @click="emit('back')"
        >
          <game-icon name="back" :size="16" />返回
        </button>
        <h1 class="text-lg font-medium">選擇難度</h1>
      </div>

      <div class="flex flex-col gap-3">
        <button
          v-for="d in difficulties"
          :key="d.id"
          class="flex items-center gap-4 rounded-2xl p-4 text-left border border-hairline transition hover:scale-[1.02]"
          :style="{ background: `linear-gradient(90deg, ${d.color}22, rgba(255,255,255,0.05))` }"
          @click="emit('select', d.id)"
        >
          <game-icon :name="d.icon" :size="22" class="text-text-secondary" />
          <div class="flex-1">
            <div class="text-lg font-medium" :style="{ color: d.color }">{{ d.name }}</div>
            <div class="text-sm text-text-secondary">{{ d.desc }}</div>
          </div>
          <div class="text-right text-xs text-text-muted">
            <div>怪物 ×{{ d.enemyHp }} 血</div>
            <div>金幣 ×{{ d.goldReward }}</div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import BackgroundPolygons from './background-polygons.vue';
import { DIFFICULTIES } from '../game/difficulty';
import GameIcon from './game-icon.vue';

const emit = defineEmits<{
  (e: 'select', id: string): void;
  (e: 'back'): void;
}>();

const difficulties = DIFFICULTIES;
</script>
