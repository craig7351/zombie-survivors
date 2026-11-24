<template>
  <div class="absolute inset-0 z-20 flex items-center justify-center bg-surface-2">
    <div class="w-[min(92vw,40rem)] rounded-2xl bg-surface-1 p-6 text-text-primary shadow-[0_8px_24px_rgba(0,0,0,0.45)] border border-hairline">
      <div class="mb-4 text-center">
        <!-- Signature：警戒條紋壓在標題左側 4px 豎條 -->
        <div class="mb-2 flex items-center justify-center gap-2">
          <span class="warn-stripe h-4 w-1 shrink-0" aria-hidden="true" />
          <span class="text-sm font-medium" :class="isChoice ? 'text-caution' : 'text-accent'">
            {{ isChoice ? '祝福 / 詛咒' : `升級！ LV ${level}` }}
          </span>
        </div>
        <div class="text-lg font-medium">{{ isChoice ? '二選一（有得有失）' : '選擇一項強化' }}</div>
      </div>

      <div class="grid gap-3" :class="isChoice ? 'sm:grid-cols-2' : 'sm:grid-cols-3'">
        <button
          v-for="(c, i) in choices"
          :key="c.id"
          class="flex flex-col items-center gap-2 rounded-2xl bg-surface-1 p-5 text-center border border-hairline transition hover:scale-[1.03] hover:bg-surface-3 hover:active:scale-95"
          @click="emit('choose', i)"
        >
          <game-icon :name="c.icon" :size="28" class="text-accent" />
          <span class="text-lg font-medium">{{ c.name }}</span>
          <span class="text-sm text-text-primary">{{ c.desc }}</span>
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
