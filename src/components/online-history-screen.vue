<template>
  <div class="absolute inset-0 overflow-auto text-text-primary">
    <background-polygons />

    <div class="relative mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <div class="flex items-center gap-3 pt-4">
        <button
          class="rounded-lg bg-surface-2 px-4 py-2 font-medium transition hover:bg-surface-3 active:scale-95"
          @click="emit('back')"
        >
          <game-icon name="back" :size="16" />返回
        </button>
        <h1 class="flex items-center gap-2 text-lg font-medium text-text-primary">
          <game-icon name="chart" :size="20" />線上人數
        </h1>
      </div>

      <!-- 區間切換 -->
      <div class="flex gap-2">
        <button
          v-for="r in ranges"
          :key="r.id"
          class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition active:scale-95"
          :class="range === r.id ? 'bg-accent text-void' : 'bg-surface-1 text-text-secondary hover:bg-surface-3'"
          @click="selectRange(r.id)"
        >
          {{ r.label }}
        </button>
      </div>

      <div class="rounded-2xl bg-surface-1 p-4 border border-hairline">
        <div class="mb-2 flex items-baseline justify-between">
          <span class="text-sm text-text-secondary">每小時最高同時在線</span>
          <span class="text-sm font-medium text-accent">區間尖峰 {{ maxPeak }} 人</span>
        </div>

        <div v-if="loading" class="py-16 text-center text-text-muted">載入中…</div>
        <div v-else-if="!hasData" class="py-16 text-center text-text-muted">
          資料剛開始累積，過幾天再回來看趨勢～
        </div>
        <svg v-else viewBox="0 0 720 260" class="w-full" preserveAspectRatio="none" style="height: 260px">
          <!-- Y 軸格線與標籤 -->
          <g v-for="t in yTicks" :key="'y' + t.v">
            <line :x1="padL" :y1="t.y" :x2="720 - padR" :y2="t.y" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
            <text :x="padL - 4" :y="t.y + 4" text-anchor="end" fill="rgba(255,255,255,0.45)" font-size="11">{{ t.v }}</text>
          </g>
          <!-- 長條 -->
          <rect
            v-for="(b, i) in bars"
            :key="i"
            :x="b.x"
            :y="b.y"
            :width="b.w"
            :height="b.h"
            :fill="b.peak > 0 ? 'var(--color-accent)' : 'transparent'"
            rx="0.5"
          />
          <!-- X 軸標籤 -->
          <text
            v-for="(l, i) in xLabels"
            :key="'x' + i"
            :x="l.x"
            :y="258"
            text-anchor="middle"
            fill="rgba(255,255,255,0.45)"
            font-size="11"
          >
            {{ l.text }}
          </text>
        </svg>
      </div>

      <p class="text-center text-xs text-text-muted">時間為當地時區・縱軸為人數・每根 = 1 小時內最高同時在線</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import GameIcon from './game-icon.vue';
import { computed, onMounted, ref } from 'vue';
import BackgroundPolygons from './background-polygons.vue';
import { fetchOnlineHistory, type OnlineHourPoint } from '../game/api';

const emit = defineEmits<{ (e: 'back'): void }>();

type RangeId = '24h' | '7d' | '30d';
const ranges: { id: RangeId; label: string; days: number; hours: number }[] = [
  { id: '24h', label: '24 小時', days: 1, hours: 24 },
  { id: '7d', label: '7 天', days: 7, hours: 168 },
  { id: '30d', label: '30 天', days: 30, hours: 720 },
];

const range = ref<RangeId>('7d');
const points = ref<OnlineHourPoint[]>([]);
const loading = ref(true);

const padL = 28;
const padR = 8;
const padT = 12;
const padB = 26;

async function refresh() {
  loading.value = true;
  const cfg = ranges.find((r) => r.id === range.value)!;
  const data = await fetchOnlineHistory(cfg.days);
  if (data) points.value = data;
  loading.value = false;
}
function selectRange(id: RangeId) {
  range.value = id;
  void refresh();
}
onMounted(refresh);

/** 把稀疏資料補成連續的整點 bucket（缺的小時補 0） */
const buckets = computed(() => {
  const cfg = ranges.find((r) => r.id === range.value)!;
  const nowHour = Math.floor(Date.now() / 3600000);
  const start = nowHour - (cfg.hours - 1);
  const map = new Map(points.value.map((p) => [p.hour, p.peak]));
  const out: { hour: number; peak: number }[] = [];
  for (let h = start; h <= nowHour; h++) out.push({ hour: h, peak: map.get(h) ?? 0 });
  return out;
});

const maxPeak = computed(() => Math.max(1, ...buckets.value.map((b) => b.peak)));
const hasData = computed(() => buckets.value.some((b) => b.peak > 0));

const innerW = 720 - padL - padR;
const innerH = 260 - padT - padB;

const bars = computed(() => {
  const arr = buckets.value;
  const bw = innerW / arr.length;
  const gap = bw > 6 ? bw * 0.2 : 0;
  return arr.map((b, i) => {
    const h = (b.peak / maxPeak.value) * innerH;
    return { x: padL + i * bw + gap / 2, y: padT + innerH - h, w: Math.max(0.6, bw - gap), h, peak: b.peak };
  });
});

const yTicks = computed(() => {
  const m = maxPeak.value;
  const vals = m <= 4 ? Array.from({ length: m + 1 }, (_, i) => i) : [0, Math.round(m / 2), m];
  return [...new Set(vals)].map((v) => ({ v, y: padT + innerH - (v / m) * innerH }));
});

/** X 軸標籤：24h 顯示整點，跨天顯示日期（當地午夜） */
const xLabels = computed(() => {
  const arr = buckets.value;
  const bw = innerW / arr.length;
  const is24 = range.value === '24h';
  const out: { x: number; text: string }[] = [];
  arr.forEach((b, i) => {
    const d = new Date(b.hour * 3600000);
    const x = padL + (i + 0.5) * bw;
    if (is24) {
      if (d.getHours() % 6 === 0) out.push({ x, text: `${d.getHours()}:00` });
    } else if (d.getHours() === 0) {
      out.push({ x, text: `${d.getMonth() + 1}/${d.getDate()}` });
    }
  });
  return out;
});
</script>
