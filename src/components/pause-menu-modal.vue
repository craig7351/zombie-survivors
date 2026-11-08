<template>
  <div class="absolute inset-0 z-20 flex items-center justify-center bg-void/85">
    <div class="w-[min(90vw,22rem)] rounded-2xl bg-surface-1 p-8 text-center text-text-primary shadow-[0_8px_24px_rgba(0,0,0,0.45)] border border-hairline">
      <div class="mb-6 text-lg font-medium">暫停</div>
      <div class="flex flex-col gap-3">
        <button
          class="rounded-lg bg-accent py-3 text-lg font-medium text-void transition hover:bg-accent active:scale-95"
          @click="emit('resume')"
        >
          繼續
        </button>
        <button
          class="rounded-lg bg-surface-2 py-3 text-lg font-medium transition hover:bg-surface-3 active:scale-95"
          @click="emit('restart')"
        >
          重新開始
        </button>
        <button
          class="rounded-lg bg-surface-2 py-3 text-lg font-medium transition hover:bg-surface-3 active:scale-95"
          @click="emit('menu')"
        >
          回主選單
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: 'resume'): void;
  (e: 'restart'): void;
  (e: 'menu'): void;
}>();
</script>
