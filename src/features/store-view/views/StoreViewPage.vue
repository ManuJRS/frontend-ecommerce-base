<script setup lang="ts">
import { defineAsyncComponent, onMounted } from 'vue';
import { useStoreViewStore } from '../stores/storeView.store';

const storeViewStore = useStoreViewStore();

const componentMap: Record<string, ReturnType<typeof defineAsyncComponent>> = {
  'blocks.dynamic-hero': defineAsyncComponent(() => import('../components/DynamicHero.vue')),
  'blocks.product-grid': defineAsyncComponent(() => import('../components/ProductGrid.vue')),
};

const resolveComponent = (componentName: string) => {
  const component = componentMap[componentName];
  if (!component) {
    console.warn(`[StoreView] Bloque no soportado: ${componentName}`);
  }
  return component || null;
};

onMounted(() => {
  storeViewStore.fetchPage(); 
});
</script>

<template>
  <div class="store-view-page min-h-screen bg-white">
    <div v-if="storeViewStore.loading" class="flex justify-center items-center py-20">
      <p class="text-gray-500 text-xl animate-pulse">Cargando la tienda...</p>
    </div>
    
    <div v-else-if="storeViewStore.error" class="text-center py-20">
      <h1 class="text-3xl text-red-600 font-bold">Error</h1>
      <p class="text-gray-600 mt-2">{{ storeViewStore.error }}</p>
    </div>
    
    <div v-else-if="storeViewStore.currentPage">
      <component
        v-for="block in storeViewStore.currentPage.contentBlocks"
        :key="block.id"
        :is="resolveComponent(block.__component)"
        :block="block"
      />
    </div>
  </div>
</template>