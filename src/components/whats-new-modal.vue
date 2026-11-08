<template>
  <div class="absolute inset-0 z-30 flex items-center justify-center bg-void/85 p-4">
    <div class="w-[min(92vw,28rem)] rounded-2xl bg-surface-1 p-6 text-text-primary shadow-[0_8px_24px_rgba(0,0,0,0.45)] border border-hairline">
      <div class="mb-1 text-xs font-medium text-accent">更新紀錄 · {{ release.version }}</div>
      <div class="mb-4 text-lg font-medium">{{ release.title }}</div>
      <ul class="flex max-h-[55vh] flex-col gap-2 overflow-auto text-sm leading-relaxed text-text-secondary">
        <li v-for="(it, i) in release.items" :key="i" class="flex gap-2">
          <span class="shrink-0 text-accent">·</span>
          <span>{{ it }}</span>
        </li>
      </ul>
      <button
        class="mt-6 w-full rounded-lg bg-accent px-4 py-3 text-lg font-medium text-void transition hover:bg-accent active:scale-95"
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
