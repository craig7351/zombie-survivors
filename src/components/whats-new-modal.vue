<template>
  <div class="absolute inset-0 z-30 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
    <div class="w-[min(92vw,28rem)] rounded-3xl bg-[#1a2236] p-6 text-white shadow-2xl ring-1 ring-white/10">
      <div class="mb-1 text-xs font-black tracking-widest text-lime-300">更新紀錄 · {{ release.version }}</div>
      <div class="mb-4 text-2xl font-black">{{ release.title }}</div>
      <ul class="flex max-h-[55vh] flex-col gap-2 overflow-auto text-sm leading-relaxed text-white/85">
        <li v-for="(it, i) in release.items" :key="i" class="flex gap-2">
          <span class="shrink-0 text-accent">·</span>
          <span>{{ it }}</span>
        </li>
      </ul>
      <button
        class="mt-6 w-full rounded-full bg-lime-500 px-4 py-3 text-lg font-black text-black transition hover:bg-lime-400 active:scale-95"
        @click="emit('close')"
      >
        關閉
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Release } from '../changelog';

defineProps<{ release: Release }>();
const emit = defineEmits<{ (e: 'close'): void }>();
</script>
