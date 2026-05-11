<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, watch } from 'vue';
import { useRoute, type LocationQuery } from 'vue-router';
import { useStoreViewStore } from '../stores/storeView.store';

const storeViewStore = useStoreViewStore();
const route = useRoute();

const hasStoreFiltersBlock = computed(() =>
  storeViewStore.currentPage?.contentBlocks.some((b) => b.__component === 'config.store-filters')
);

const componentMap: Record<string, ReturnType<typeof defineAsyncComponent>> = {
  'blocks.dynamic-hero': defineAsyncComponent(() => import('../components/DynamicHero.vue')),
  'blocks.product-grid': defineAsyncComponent(() => import('../components/ProductGrid.vue')),
  'config.sort-by': defineAsyncComponent(() => import('../components/ConfigSortBy.vue')),
  'config.store-filters': defineAsyncComponent(() => import('../components/StoreViewFilters.vue')),
};

const resolveComponent = (componentName: string) => {
  const component = componentMap[componentName];
  if (!component) {
    console.warn(`[StoreView] Bloque no soportado: ${componentName}`);
  }
  return component || null;
};

function queryValue(query: LocationQuery, key: string): string | undefined {
  const raw = query[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

function numberQueryValue(query: LocationQuery, key: string): number | null {
  const value = queryValue(query, key);
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanQueryValue(query: LocationQuery, key: string): boolean {
  const value = queryValue(query, key)?.toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
}

function loadProductsFromQuery(query: LocationQuery) {
  const minPrice = numberQueryValue(query, 'minPrice');
  const maxPrice = numberQueryValue(query, 'maxPrice');
  const priceRange =
    minPrice != null && maxPrice != null
      ? { min: minPrice, max: maxPrice }
      : null;

  storeViewStore.applyProductFilters({
    priceRange,
    categoryIds: [],
    categorySlug: queryValue(query, 'category') ?? null,
    availabilityOnly: booleanQueryValue(query, 'stock'),
  });
}

onMounted(async () => {
  await storeViewStore.fetchPage();
  loadProductsFromQuery(route.query);
});

watch(
  () => route.query,
  (query) => {
    loadProductsFromQuery(query);
  },
  { deep: true, immediate: true }
);
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
    
    <div v-else-if="storeViewStore.currentPage" :class="hasStoreFiltersBlock ? 'lg:pl-64' : ''">
      <component
        v-for="block in storeViewStore.currentPage.contentBlocks"
        :key="block.id"
        :is="resolveComponent(block.__component)"
        :block="block"
      />
    </div>
  </div>
</template>