<script setup lang="ts">
import { defineAsyncComponent, onMounted } from 'vue';
import type { StoreViewBlock } from '@/features/store-view/models';
import { useHomeStore } from '../stores/home.store';

const homeStore = useHomeStore();

const componentMap: Record<string, ReturnType<typeof defineAsyncComponent>> = {
  'blocks.dynamic-hero': defineAsyncComponent(
    () => import('@/features/store-view/components/DynamicHero.vue')
  ),
};

const resolveComponent = (componentName: string) => {
  const component = componentMap[componentName];
  if (!component) {
    console.warn(`[Home] Bloque no soportado: ${componentName}`);
  }
  return component || null;
};

onMounted(() => {
  homeStore.fetchPage();
});
</script>

<template>
  <div class="home-page min-h-screen bg-white">
    <div v-if="homeStore.loading" class="flex justify-center items-center py-20">
      <p class="text-gray-500 text-xl animate-pulse">Cargando inicio...</p>
    </div>

    <div v-else-if="homeStore.error" class="text-center py-20">
      <h1 class="text-3xl text-red-600 font-bold">Error</h1>
      <p class="text-gray-600 mt-2">{{ homeStore.error }}</p>
    </div>

    <div v-else-if="homeStore.currentPage">
      <component
        v-for="block in homeStore.currentPage.sections"
        :key="block.id"
        :is="resolveComponent(block.__component)"
        :block="block as StoreViewBlock"
      />
    </div>
  </div>
</template>
