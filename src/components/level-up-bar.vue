<template>
  <!-- 不暫停的升級選項列：遊戲繼續跑，玩家隨時點選 -->
  <div class="pointer-events-none absolute inset-x-0 bottom-44 z-20 flex justify-center px-3 sm:bottom-10">
    <div class="pointer-events-auto w-full max-w-md rounded-2xl bg-black/55 p-2 shadow-2xl ring-1 ring-amber-300/50 backdrop-blur-md">
      <div class="mb-1 text-center text-xs font-black text-amber-300">
        <game-icon name="levelup" :size="14" />升級！選一個強化<span v-if="pending > 1" class="text-white/60">（待選 {{ pending }}）</span>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="(c, i) in choices"
          :key="c.id"
          class="flex touch-manipulation flex-col items-center gap-0.5 rounded-xl bg-white/10 p-2 text-center ring-1 ring-white/10 transition hover:bg-white/20 hover:ring-amber-300/60 active:scale-95"
          @pointerdown.prevent="emit('choose', i)"
        >
          <game-icon :name="c.icon" :size="22" class="text-accent" />
          <span class="text-xs font-black leading-tight text-white sm:text-sm">{{ c.name }}</span>
          <span class="text-[0.62rem] leading-tight text-white">{{ c.desc }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChoiceView } from '../game/game';
import GameIcon from './game-icon.vue';

defineProps<{ choices: ChoiceView[]; pending: number }>();
const emit = defineEmits<{ (e: 'choose', index: number): void }>();
</script>
