<template>
  <div class="absolute inset-0 overflow-auto bg-void text-text-primary">
    <whats-new-modal v-if="showWhatsNew" :release="latestRelease" @close="closeWhatsNew" />

    <div class="mx-auto grid min-h-full max-w-[1440px] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <!-- 左欄：文字與操作 -->
      <div class="flex flex-col justify-center gap-8 px-6 py-12 sm:px-8 lg:px-12">
        <div class="flex flex-col gap-3">
          <!-- 標題 -->
          <div class="flex items-baseline gap-3">
            <h1 class="text-[36px] leading-[1.05] font-semibold tracking-[-0.02em] text-text-primary sm:text-hero">
              殭屍大逃殺
            </h1>
            <button
              class="num rounded border border-hairline px-2 py-0.5 text-2xs text-text-muted transition-colors duration-150 hover:border-hairline-strong hover:text-text-secondary"
              title="查看更新紀錄"
              @click="openWhatsNew"
            >
              {{ version }}
            </button>
          </div>

          <p class="max-w-md text-lg leading-relaxed text-text-secondary">
            免安裝、開瀏覽器就能玩。你只負責走位，剩下的交給自動開火。
          </p>

          <!-- 在線人數：靜態狀態點，不做呼吸動態 -->
          <div v-if="online !== null" class="flex items-center gap-2 text-sm text-text-secondary">
            <span class="dot-live" />
            <span class="num font-medium text-text-primary">{{ online }}</span>
            <span>人正在遊玩</span>
          </div>
        </div>

        <!-- 暱稱 + 主 CTA -->
        <div class="flex max-w-sm flex-col gap-3">
          <label for="nickname" class="text-xs text-text-muted">暱稱</label>
          <input
            id="nickname"
            v-model="name"
            maxlength="16"
            placeholder="輸入暱稱後開始"
            class="w-full rounded-lg border border-hairline bg-surface-1 px-3 py-2.5 text-base text-text-primary outline-none transition-colors duration-150 placeholder:text-text-muted focus:border-accent"
            @change="saveName"
            @blur="saveName"
          />
          <p v-if="!canStart" class="text-xs text-danger">請先輸入暱稱</p>

          <button
            class="btn-accent mt-1 flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-base font-medium"
            :class="{ 'cursor-not-allowed opacity-45': !canStart }"
            :disabled="!canStart"
            @click="onStart"
          >
            <game-icon name="crosshair" :size="20" />
            遊戲開始
          </button>
        </div>

        <!-- 累積統計：主要數字 + 次要數字，節奏不等寬 -->
        <div class="flex flex-col gap-4 border-t border-hairline pt-6 sm:flex-row sm:items-end sm:gap-8">
          <div class="flex flex-col gap-1">
            <span class="num text-2xl font-semibold text-accent">{{ stats.plays }}</span>
            <span class="text-xs text-text-muted">遊玩場次</span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="num text-2xl font-semibold text-text-primary">{{ timeText }}</span>
            <span class="text-xs text-text-muted">累積時間</span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="num text-2xl font-semibold text-text-primary">{{ stats.totalKills }}</span>
            <span class="text-xs text-text-muted">累積擊殺</span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="num text-2xl font-semibold text-text-primary">{{ peak }}</span>
            <span class="text-xs text-text-muted">同時在線最高</span>
          </div>
        </div>

        <!-- 次要入口：文字連結，不是藥丸按鈕 -->
        <nav class="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-hairline pt-6">
          <button class="flex items-center gap-2 text-sm text-text-secondary transition-colors duration-150 hover:text-text-primary" @click="emit('leaderboard')">
            <game-icon name="trophy" :size="18" />
            排行榜
          </button>
          <button class="flex items-center gap-2 text-sm text-text-secondary transition-colors duration-150 hover:text-text-primary" @click="emit('bestiary')">
            <game-icon name="bestiary" :size="18" />
            怪物圖鑑
          </button>
          <button class="flex items-center gap-2 text-sm text-text-secondary transition-colors duration-150 hover:text-text-primary" @click="emit('messages')">
            <game-icon name="messages" :size="18" />
            留言板
          </button>
          <button class="flex items-center gap-2 text-sm text-text-secondary transition-colors duration-150 hover:text-text-primary" @click="emit('onlineHistory')">
            <game-icon name="chart" :size="18" />
            線上人數
          </button>
        </nav>
      </div>

      <!-- 右欄：實機畫面（真實產品視覺）＋ 警戒條紋記號 -->
      <div class="relative flex items-center px-6 pb-12 sm:px-8 lg:px-12 lg:py-12">
        <figure class="relative w-full overflow-hidden rounded-xl border border-hairline">
          <!-- Signature：左緣 4px 警戒條紋 -->
          <span class="warn-stripe absolute top-0 left-0 z-10 h-full w-1" aria-hidden="true" />
          <img
            src="/hero-gameplay.png"
            alt="殭屍大逃殺實機畫面：倖存者在一片廢墟中自動開火，殭屍潮從四面湧來"
            class="block w-full"
            width="1440"
            height="900"
          />
          <!-- 只疊不重繪：廢墟色調以半透明遮罩疊加 -->
          <span
            class="pointer-events-none absolute inset-0 bg-void/25 mix-blend-multiply"
            aria-hidden="true"
          />
          <figcaption class="absolute right-3 bottom-3 rounded bg-void/80 px-2 py-1 text-2xs text-text-muted">
            實機畫面
          </figcaption>
        </figure>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import GameIcon from './game-icon.vue';
import WhatsNewModal from './whats-new-modal.vue';
import { loadStats, getPlayerName, setPlayerName, type GlobalStats } from '../game/leaderboard';
import { fetchStats, enterOnline } from '../game/api';
import { APP_VERSION as version } from '../version';
import { CHANGELOG, LATEST_VERSION } from '../changelog';

/** 更新紀錄彈窗：首次（或版本更新後）自動跳一次，看過即記住 */
const CHANGELOG_KEY = 'animal-survivors:changelogSeen';
const showWhatsNew = ref(false);
const latestRelease = CHANGELOG[0];
function openWhatsNew() {
  showWhatsNew.value = true;
}
function closeWhatsNew() {
  showWhatsNew.value = false;
  try {
    localStorage.setItem(CHANGELOG_KEY, LATEST_VERSION);
  } catch {
    /* 忽略寫入失敗 */
  }
}

const emit = defineEmits<{
  (e: 'start'): void;
  (e: 'leaderboard'): void;
  (e: 'bestiary'): void;
  (e: 'messages'): void;
  (e: 'onlineHistory'): void;
}>();

const name = ref(getPlayerName());
const canStart = computed(() => name.value.trim().length > 0);
function saveName() {
  setPlayerName(name.value);
  name.value = getPlayerName();
}
function onStart() {
  if (!canStart.value) return;
  saveName();
  emit('start');
}

/** 先顯示本機統計，抓到全球就覆蓋 */
const stats = reactive<GlobalStats>(loadStats());

/** 目前遊玩人數 + 同時在線最高（近 3 小時活躍；進場記錄一次，不再輪詢） */
const online = ref<number | null>(null);
const peak = ref(0);
async function applyOnline(data: { online: number; peak: number } | null) {
  if (data !== null) {
    online.value = data.online;
    peak.value = data.peak;
  }
}

const timeText = computed(() => {
  const total = Math.floor(stats.totalTime);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h${m}m`;
  return `${m}分`;
});

onMounted(async () => {
  void applyOnline(await enterOnline());
  const global = await fetchStats();
  if (global) Object.assign(stats, global);
});
</script>
