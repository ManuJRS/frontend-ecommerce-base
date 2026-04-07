<script setup lang="ts">
import type { StoreViewBlock } from '../models';

defineProps<{
  block: StoreViewBlock;
}>();
</script>

<template>
  <div class="flex-1 md:px-12 px-4 py-8 bg-new-surface-bg">
    <h1 class="text-4xl md:text-5xl font-black tracking-tighter mb-4">{{ block.title || 'Default Hero Title' }}</h1>
    <p class="max-w-xl text-on-surface-variant text-sm leading-relaxed">{{ block.description || 'Supporting subtitle goes here.' }}</p>
  </div>
</template>
