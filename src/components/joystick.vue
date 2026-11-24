<template>
  <!-- 外層透明緩衝區：圈圈外一圈也算搖桿地盤，攔截觸控避免落到 canvas 變成轉鏡頭 -->
  <div
    ref="zoneRef"
    class="zone touch-none"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="onUp"
  >
    <div ref="padRef" class="pad rounded-full bg-surface-2">
      <div class="thumb" :style="thumbStyle" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const emit = defineEmits<{
  (e: 'move', dir: { x: number; z: number }): void;
  (e: 'end'): void;
}>();

const zoneRef = ref<HTMLElement>();
const padRef = ref<HTMLElement>();
const dragging = ref(false);
const offset = ref({ x: 0, y: 0 });

const thumbStyle = computed(() => ({
  transform: `translate(${offset.value.x}px, ${offset.value.y}px)`,
}));

function update(clientX: number, clientY: number) {
  const el = padRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let dx = clientX - cx;
  let dy = clientY - cy;
  const radius = rect.width / 2;
  const len = Math.hypot(dx, dy);
  if (len > radius) {
    dx = (dx / len) * radius;
    dy = (dy / len) * radius;
  }
  offset.value = { x: dx, y: dy };

  /** 螢幕向上 = 世界 +z（遠離相機）；螢幕向右 = 世界 +x */
  emit('move', { x: dx / radius, z: -dy / radius });
}

function onDown(e: PointerEvent) {
  dragging.value = true;
  zoneRef.value?.setPointerCapture(e.pointerId);
  update(e.clientX, e.clientY);
}
function onMove(e: PointerEvent) {
  if (!dragging.value) return;
  update(e.clientX, e.clientY);
}
function onUp() {
  dragging.value = false;
  offset.value = { x: 0, y: 0 };
  emit('end');
}
</script>

<style scoped>
/** 緩衝區比可見圈大一圈；可見圈靠左下對齊（保持原本位置），緩衝往上、往右延伸 */
.zone {
  width: min(13rem, 46vw);
  height: min(13rem, 46vw);
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
}
.pad {
  width: min(9rem, 32vw);
  height: min(9rem, 32vw);
  display: flex;
  align-items: center;
  justify-content: center;
}
.thumb {
  width: 42%;
  height: 42%;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.55);
}
</style>
