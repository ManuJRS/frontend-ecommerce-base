<script setup lang="ts">
import { ref } from 'vue';
import type { StoreViewBlock } from '../models';
import { useStoreViewStore } from '../stores/storeView.store';

defineProps<{
  block: StoreViewBlock & {
    showNewest?: boolean;
    showHighestPrice?: boolean;
    showLowestPrice?: boolean;
    showBestSellers?: boolean;
  };
}>();

const store = useStoreViewStore();
const selectedSort = ref('default');

const handleSortChange = () => {
  store.sortProducts(selectedSort.value);
};
</script>

<template>
  <div class="flex justify-between items-center pb-6 pt-8 px-4 md:px-8 bg-new-surface-bg">
    <nav class="flex text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-medium">
      <!-- <a class="hover:text-primary transition-colors" href="#">Home</a>
      <span class="mx-2">/</span>
      <a class="hover:text-primary transition-colors" href="#">Collections</a>
      <span class="mx-2">/</span>
      <span class="text-primary font-bold">New Arrivals</span> -->
    </nav>
    <div class="flex items-center gap-4">
      <span class="hidden md:inline text-[10px] uppercase tracking-widest text-on-surface-variant">Sort By</span>
      <select
        id="sortBy"
        v-model="selectedSort"
        @change="handleSortChange"
        class="bg-transparent border-none text-[11px] font-bold uppercase tracking-widest focus:ring-0 cursor-pointer !pr-8 outline-none"
      >
        <option value="default">Todos</option>
        <option v-if="block.showNewest" value="newest">Más recientes</option>
        <option v-if="block.showLowestPrice" value="lowest">Precio: Bajo a Alto</option>
        <option v-if="block.showHighestPrice" value="highest">Precio: Alto a Bajo</option>
        <option v-if="block.showBestSellers" value="best-sellers">Más populares</option>
      </select>
    </div>
  </div>
</template>
