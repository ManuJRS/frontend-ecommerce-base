<script setup lang="ts">
import type { StoreViewBlock } from '../models';

defineProps<{
  block: StoreViewBlock;
}>();
</script>

<template>
  <section class="bg-gray-100 py-12 px-4 shadow-sm my-4 rounded-xl text-center">
    <h1 class="text-4xl font-bold mb-4 text-gray-800">{{ block.title || 'Default Hero Title' }}</h1>
    <p class="text-lg text-gray-600 max-w-2xl mx-auto">{{ block.subtitle || 'Supporting subtitle goes here.' }}</p>
  </section>
</template>
