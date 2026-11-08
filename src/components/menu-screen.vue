<template>
  <div class="absolute inset-0 overflow-auto bg-gradient-to-b from-[#0b1020] to-[#161f38] text-white">
    <!-- 返回首頁 -->
    <button
      class="absolute left-3 top-3 z-10 rounded-full bg-white/10 px-4 py-1 text-sm font-black backdrop-blur-md transition hover:bg-white/20 active:scale-95"
      @click="emit('home')"
    >
      <game-icon name="back" :size="16" />首頁
    </button>

    <!-- Debug 開關 -->
    <div class="absolute right-3 top-3 z-10 flex items-center gap-2">
      <button
        class="rounded-full px-3 py-1 text-xs font-black transition"
        :class="debug ? 'bg-lime-400 text-black' : 'bg-white/10 text-white/60'"
        @click="toggleDebug"
      >
        <game-icon name="wrench" :size="14" />Debug {{ debug ? 'ON' : 'OFF' }}
      </button>
      <button
        v-if="debug"
        class="rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-black"
        @click="emit('add-gold', 1000)"
      >
        +1000 金幣
      </button>
    </div>

    <div class="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <!-- 標題 -->
      <div class="pt-4 text-center">
        <div class="text-5xl font-black tracking-wider">殭屍大逃殺</div>
        <div class="mt-1 text-sm text-white/60">在殭屍潮中倖存・3D 倖存者類 roguelite</div>
        <div class="mt-3 inline-block rounded-full bg-amber-400/90 px-5 py-1 text-lg font-black text-black">
          <span class="num">{{ meta.gold }}</span> 金幣
        </div>
      </div>

      <!-- 角色 -->
      <div>
        <div class="mb-2 text-lg font-black">選擇角色</div>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div
            v-for="c in characters"
            :key="c.id"
            class="flex cursor-pointer flex-col items-center gap-1 rounded-2xl p-3 text-center ring-2 transition"
            :class="cardClass(c.id)"
            @click="onCard(c)"
          >
            <div class="relative h-36 w-36">
              <canvas
                :ref="(el) => setCanvas(c.id, el)"
                class="h-36 w-36 rounded-xl ring-1 ring-white/10"
                width="384"
                height="384"
              />
              <span
                v-if="!ready[c.id]"
                class="absolute inset-0 flex items-center justify-center"
              >
                <game-icon :name="c.icon" :size="28" class="text-text-muted" />
              </span>
            </div>
            <span class="font-black">{{ c.name }}</span>
            <span class="text-[0.72rem] font-bold leading-tight text-amber-200/80">{{ c.trait }}</span>
            <span class="text-[0.66rem] leading-snug text-white/55">{{ c.desc }}</span>
            <span
              v-if="!isUnlocked(c.id)"
              class="mt-1 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-black text-black"
              :class="{ 'opacity-40': meta.gold < c.cost }"
            >
              解鎖 {{ c.cost }} 金幣
            </span>
          </div>
        </div>
      </div>

      <!-- 商店 -->
      <div>
        <div class="mb-2 text-lg font-black">永久強化</div>
        <div class="flex flex-col gap-2">
          <div
            v-for="p in perma"
            :key="p.id"
            class="flex items-center gap-3 rounded-2xl bg-white/5 p-3"
          >
            <game-icon :name="p.icon" :size="18" class="text-text-secondary" />
            <div class="flex-1">
              <div class="font-black">{{ p.name }} <span class="text-white/50">{{ level(p.id) }}/{{ p.maxLevel }}</span></div>
              <div class="text-xs text-white/60">{{ p.desc }}</div>
            </div>
            <button
              class="rounded-full px-4 py-2 text-sm font-black transition"
              :class="buyClass(p)"
              :disabled="!canBuy(p)"
              @click="emit('buy', p.id)"
            >
              {{ level(p.id) >= p.maxLevel ? '已滿' : `${cost(p)} 金幣` }}
            </button>
          </div>
        </div>
      </div>

      <!-- 開始 -->
      <button
        class="sticky bottom-4 mt-2 w-full rounded-full bg-amber-400 py-4 text-2xl font-black text-black shadow-lg transition hover:bg-amber-300 active:scale-95"
        @click="emit('start', selectedId)"
      >
        <game-icon name="play" :size="20" />開始（{{ selectedName }}）
      </button>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { CHARACTERS, getCharacter, type Character } from '../game/characters';
import { PERMA, permaCost, type MetaData, type PermaUpgrade } from '../game/meta';
import { setupCharacterPreview, type PreviewHandle } from '../game/character-previews';
import GameIcon from './game-icon.vue';

const props = defineProps<{ meta: MetaData }>();
const emit = defineEmits<{
  (e: 'start', characterId: string): void;
  (e: 'buy', permaId: string): void;
  (e: 'unlock', characterId: string): void;
  (e: 'add-gold', amount: number): void;
  (e: 'home'): void;
}>();

const characters = CHARACTERS;
const perma = PERMA;
const selectedId = ref('matt');

/** 角色即時 3D 預覽：每張卡一個引擎，播 idle 並旋轉；就緒前以 emoji 替代 */
const ready = ref<Record<string, boolean>>({});
const canvases = new Map<string, HTMLCanvasElement>();
const handles: PreviewHandle[] = [];
function setCanvas(id: string, el: unknown) {
  if (el instanceof HTMLCanvasElement) canvases.set(id, el);
}
onMounted(async () => {
  await nextTick();
  for (const c of CHARACTERS) {
    const canvas = canvases.get(c.id);
    if (!canvas || !c.model) continue;
    const h = await setupCharacterPreview(canvas, c.model);
    if (h) {
      handles.push(h);
      ready.value = { ...ready.value, [c.id]: true };
    }
  }
});
onBeforeUnmount(() => {
  for (const h of handles) h.dispose();
});

const DEBUG_KEY = 'animal-survivors:debug';
const debug = ref(localStorage.getItem(DEBUG_KEY) === '1');
function toggleDebug() {
  /** 開啟需通過驗證；關閉不需要 */
  if (!debug.value) {
    const answer = window.prompt('請問作者的全名（三個字）？');
    if (answer === null) return;
    if (answer.trim() !== '黃國書') {
      window.alert('答錯了，無法開啟 Debug');
      return;
    }
  }
  debug.value = !debug.value;
  localStorage.setItem(DEBUG_KEY, debug.value ? '1' : '0');
}

const selectedName = computed(() => getCharacter(selectedId.value).name);

function isUnlocked(id: string) {
  return debug.value || props.meta.unlocked.includes(id);
}
function level(id: string) {
  return props.meta.perma[id] ?? 0;
}
function cost(p: PermaUpgrade) {
  return permaCost(p, level(p.id));
}
function canBuy(p: PermaUpgrade) {
  return level(p.id) < p.maxLevel && props.meta.gold >= cost(p);
}
function buyClass(p: PermaUpgrade) {
  return canBuy(p) ? 'bg-amber-400 text-black hover:bg-amber-300' : 'bg-white/10 text-white/40';
}
function cardClass(id: string) {
  if (selectedId.value === id) return 'bg-amber-400/20 ring-amber-300';
  if (isUnlocked(id)) return 'bg-white/5 ring-white/10 hover:ring-white/30';
  return 'bg-black/30 ring-white/5 opacity-80';
}
function onCard(c: Character) {
  if (isUnlocked(c.id)) {
    selectedId.value = c.id;
  } else if (props.meta.gold >= c.cost) {
    emit('unlock', c.id);
    selectedId.value = c.id;
  }
}
</script>
