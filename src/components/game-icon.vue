<script setup lang="ts">
/**
 * 統一圖示元件：全站所有 lucide 圖示都經過這裡，
 * 確保尺寸 18px、線寬 1.5、間距一致。
 *
 * unslop by Damir Sokolovsky ([@heydamir](https://x.com/heydamir)), CC BY 4.0.
 */
import { getIcon } from '../ui/icons';

const props = withDefaults(
  defineProps<{
    name: string;
    size?: number;
  }>(),
  { size: 18 },
);
</script>

<template>
  <component
    :is="getIcon(props.name)"
    :size="props.size"
    :stroke-width="1.5"
    aria-hidden="true"
    class="flex-none"
  />
</template>
