<template>
  <div class="absolute inset-0 z-20 flex items-center justify-center bg-black/55 backdrop-blur-sm">
    <div class="w-[min(92vw,40rem)] rounded-3xl bg-[#1a2236] p-6 text-white shadow-2xl ring-1 ring-white/10">
      <div class="mb-4 text-center">
        <div class="text-sm font-bold tracking-widest" :class="isChoice ? 'text-fuchsia-300' : 'text-amber-300'">
          {{ isChoice ? '祝福 / 詛咒' : `升級！ LV ${level}` }}
        </div>
        <div class="text-2xl font-black">{{ isChoice ? '二選一（有得有失）' : '選擇一項強化' }}</div>
      </div>

      <div class="grid gap-3" :class="isChoice ? 'sm:grid-cols-2' : 'sm:grid-cols-3'">
        <button
          v-for="(c, i) in choices"
          :key="c.id"
          class="flex flex-col items-center gap-2 rounded-2xl bg-white/5 p-5 text-center ring-1 ring-white/10 transition hover:scale-[1.03] hover:bg-white/10 hover:ring-amber-300/60 active:scale-95"
          @click="emit('choose', i)"
        >
          <game-icon :name="c.icon" :size="28" class="text-accent" />
          <span class="text-lg font-black">{{ c.name }}</span>
          <span class="text-sm text-white">{{ c.desc }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import GameIcon from './game-icon.vue';
import type { ChoiceView } from '../game/game';

const props = defineProps<{ level: number; choices: ChoiceView[] }>();
const emit = defineEmits<{ (e: 'choose', index: number): void }>();

/** 祝福/詛咒選項 id 以 bc_ 開頭，用以切換彈窗標題 */
const isChoice = computed(() => props.choices.some((c) => c.id.startsWith('bc_')));
</script>
