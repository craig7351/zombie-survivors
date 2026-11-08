<template>
  <div class="absolute inset-0 overflow-auto text-text-primary">
    <background-polygons />

    <div class="relative mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div class="flex items-center gap-3 pt-4">
        <button
          class="rounded-lg bg-surface-2 px-4 py-2 font-medium transition hover:bg-surface-3 active:scale-95"
          @click="emit('back')"
        >
          <game-icon name="back" :size="16" />返回
        </button>
        <h1 class="flex items-center gap-2 text-lg font-medium text-text-primary">
          <game-icon name="bestiary" :size="20" />怪物圖鑑
        </h1>
      </div>

      <!-- 怪物 -->
      <div>
        <div class="mb-2 text-lg font-medium">一般殭屍</div>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div
            v-for="z in zombieInfo"
            :key="z.name"
            class="flex flex-col items-center gap-1 rounded-2xl bg-surface-1 p-3 text-center border border-hairline"
          >
            <img v-if="modelThumbs[z.model]" :src="modelThumbs[z.model]" class="h-24 w-24 rounded-xl" :alt="z.name" />
            <span v-else class="flex h-24 w-24 items-center justify-center">
              <game-icon name="bestiary" :size="28" class="text-text-muted" />
            </span>
            <div class="font-medium">{{ z.name }}</div>
            <div class="text-[0.72rem] font-medium text-success/80">{{ z.role }}</div>
            <div class="text-[0.68rem] leading-snug text-text-muted">{{ z.desc }}</div>
          </div>
        </div>
      </div>

      <!-- 王 -->
      <div>
        <div class="mb-2 text-lg font-medium">殭屍王（依序登場）</div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div
            v-for="(b, i) in bossInfo"
            :key="b.name"
            class="flex items-center gap-3 rounded-2xl bg-surface-1 p-3 border border-hairline"
          >
            <img v-if="modelThumbs[b.model]" :src="modelThumbs[b.model]" class="h-20 w-20 shrink-0 rounded-xl" :alt="b.name" />
            <span v-else class="flex h-20 w-20 shrink-0 items-center justify-center">
              <game-icon name="skull" :size="24" class="text-text-muted" />
            </span>
            <div class="min-w-0">
              <div class="font-medium">{{ i + 1 }}. {{ b.name }}</div>
              <div class="text-xs font-medium text-danger/80">招式：{{ b.skill }}</div>
              <div class="text-[0.7rem] leading-snug text-text-muted">{{ b.desc }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import GameIcon from './game-icon.vue';
import { onMounted, ref } from 'vue';
import BackgroundPolygons from './background-polygons.vue';
import { ZOMBIE_INFO } from '../game/zombie-horde';
import { BOSS_INFO } from '../game/boss';
import { renderModelThumbnails } from '../game/model-thumbs';

const emit = defineEmits<{ (e: 'back'): void }>();

const zombieInfo = ZOMBIE_INFO;
const bossInfo = BOSS_INFO;
const modelThumbs = ref<Record<string, string>>({});

onMounted(() => {
  const models = [...ZOMBIE_INFO.map((z) => z.model), ...BOSS_INFO.map((b) => b.model)];
  void renderModelThumbnails(models, (model, url) => {
    modelThumbs.value = { ...modelThumbs.value, [model]: url };
  });
});
</script>
