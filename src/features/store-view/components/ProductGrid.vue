<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { api } from '@/core/api';
import qs from 'qs';
import type { StoreViewBlock } from '../models';
import { useStoreViewStore } from '../stores/storeView.store';
import type { AppliedProductFilters } from '../stores/storeView.store';

const props = defineProps<{
  block: StoreViewBlock;
}>();

const rawProducts = ref<any[]>([]);
const isLoadingProducts = ref(false);
const store = useStoreViewStore();

function effectivePrice(p: any): number {
  const d = p.discountedPrice;
  if (d != null && d !== '' && !Number.isNaN(Number(d))) return Number(d);
  const pr = p.price;
  return pr != null && pr !== '' ? Number(pr) || 0 : 0;
}

function productMatchesFilters(p: any, f: AppliedProductFilters): boolean {
  if (f.priceRange) {
    const price = effectivePrice(p);
    if (price < f.priceRange.min || price > f.priceRange.max) return false;
  }

  if (f.categoryIds.length > 0) {
    const ids = (p.categories || []).map((c: { id: number }) => c.id);
    if (!f.categoryIds.some((cid) => ids.includes(cid))) return false;
  }

  if (f.availabilityOnly) {
    if (p.inStock === false) return false;
    if (typeof p.stock === 'number' && p.stock <= 0) return false;
  }

  return true;
}

function sortList(list: any[], sortBy: string): any[] {
  const sorted = [...list];
  if (sortBy === 'lowest') {
    sorted.sort((a, b) => effectivePrice(a) - effectivePrice(b));
  } else if (sortBy === 'highest') {
    sorted.sort((a, b) => effectivePrice(b) - effectivePrice(a));
  } else if (sortBy === 'newest') {
    sorted.sort((a, b) => (b.id || 0) - (a.id || 0));
  } else if (sortBy === 'best-sellers') {
    sorted.sort((a, b) => {
      const valA = a.isBestseller || a.bestseller || a.bestProduct ? 1 : 0;
      const valB = b.isBestseller || b.bestseller || b.bestProduct ? 1 : 0;
      return valB - valA;
    });
  } else {
    sorted.sort((a, b) => (a.id || 0) - (b.id || 0));
  }
  return sorted;
}

const displayProducts = computed(() => {
  const f = store.appliedProductFilters;
  let list = rawProducts.value;
  if (f) {
    list = list.filter((p) => productMatchesFilters(p, f));
  }
  return sortList(list, store.currentSortBy);
});

onMounted(async () => {
  if (props.block.dataSource === 'manual_selection') {
    rawProducts.value = [...(props.block.manualProducts || [])];
    return;
  }

  if (props.block.dataSource === 'by_category') {
    if (props.block.category && props.block.category.products) {
      const limit = props.block.itemsLimit || 12;
      rawProducts.value = props.block.category.products.slice(0, limit);
    } else {
      console.warn('La categoría no tiene productos asignados.');
      rawProducts.value = [];
    }
    return;
  }

  if (props.block.dataSource === 'all_products') {
    isLoadingProducts.value = true;
    try {
      const queryObj: any = {
        populate: ['images', 'categories'],
        pagination: {
          limit: props.block.itemsLimit || 12,
        },
        sort: ['createdAt:desc'],
      };

      const query = qs.stringify(queryObj, { encodeValuesOnly: true });
      const response = await api.get(`/products?${query}`);
      rawProducts.value = response.data.data || [];
    } catch (error) {
      console.error('Error obteniendo todos los productos:', error);
    } finally {
      isLoadingProducts.value = false;
    }
  }
});
</script>

<template>
  <section class="py-8 bg-new-surface-bg px-4 md:px-8">
    <div class="flex justify-between items-end mb-12">
      <h3 class="text-xs font-bold uppercase tracking-[0.3em] text-on-surface-variant">{{ block.title || 'The Collection' }}</h3>
      <p v-if="block.showItemsQuantity" class="text-xs text-on-surface-variant">Mostrando {{ displayProducts.length }} productos</p>
    </div>
    
    <div v-if="isLoadingProducts" class="flex justify-center py-20">
      <p class="text-xs font-bold uppercase tracking-widest text-on-surface-variant animate-pulse">
        Loading Collection...
      </p>
    </div>

    <div v-else-if="displayProducts.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-16 gap-x-8">
      
      <div 
        v-for="product in displayProducts" 
        :key="product.id" 
        class="group cursor-pointer"
      >
        <div class="relative bg-surface-container-low aspect-[3/4] overflow-hidden mb-6">
          <img 
            v-if="product.images && product.images.length > 0" 
            :src="product.images[0].url" 
            :alt="product.name" 
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-gray-400 text-sm bg-gray-100">
            Sin Imagen
          </div>

          <div class="flex flex-col gap-2 absolute bottom-4 right-4 items-end">
          <div
            v-if="product.newProduct"
            class="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2 py-1 shadow-sm opacity-100 group-hover:opacity-0 transition-opacity duration-300"
          >
            <span class="material-symbols-outlined text-[10px] text-primary">new_releases</span>
            <span class="text-[9px] font-bold uppercase tracking-[0.2em] text-primary">New Arrival</span>
          </div>

          <div 
            v-if="product.bestProduct"
            class="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2 py-1 shadow-sm opacity-100 group-hover:opacity-0 transition-opacity duration-300"
          >
            <span class="material-symbols-outlined text-[10px] text-primary">star</span>
            <span class="text-[9px] font-bold uppercase tracking-[0.2em] text-primary">Bestseller</span>
          </div>
          </div>


          <button class="absolute bottom-4 left-4 right-4 bg-primary text-on-primary py-4 text-[10px] font-bold uppercase tracking-[0.2em] translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
            Add to Cart
          </button>
          <div v-if="block.showDiscountBadge">
                    <div v-if="product.discountPercentage && product.discountPercentage > 0" 
                      class="absolute top-4 left-4 flex flex-col gap-1">
                      <div v-if="block.badgeFormat === 'amount'" class="bg-white px-2 py-1 flex flex-col items-start leading-none">
                          <span class="text-[10px] font-bold uppercase tracking-widest text-primary">
                            Ahorra ${{ (product.price - (product.discountedPrice || (product.price - (product.price * (product.discountPercentage / 100))))).toFixed(0) }}
                          </span>
                      </div>
                      <div v-if="block.badgeFormat === 'percentage'" class="bg-primary text-on-primary px-2 py-1 text-[10px] font-black tracking-tighter">
                          -{{ product.discountPercentage }}%
                      </div>
                    </div>
          </div>
          <button v-if="block.showFavIcon" class="absolute top-4 right-4 backdrop-blur-sm transition-all duration-300 group/fav">
            <span class="material-symbols-outlined text-sm text-primary hover:text-red-500/80 hover:cursor-pointer group-hover/fav:scale-110 transition-transform" style="font-variation-settings: 'FILL' 0;">favorite</span>
          </button>
        </div>

        <div class="space-y-1">
          <div class="flex justify-between items-start">
            <h4 class="text-sm font-bold tracking-tight">{{ product.name }}</h4>
            <div class="flex gap-2">
                <span :class="{'text-sm font-medium': true, 'text-on-tertiary-container': product.discountPercentage > 0}">
                  ${{ product.discountedPrice ? product.discountedPrice.toFixed(2) : product.price.toFixed(2) }}
                </span>
                <span v-if="product.discountPercentage > 0" class="text-xs line-through text-on-surface-variant">
                  ${{ product.price.toFixed(2) }}
                </span>
            </div>
          </div>
          <p v-if="block.showCategory" class="text-xs text-on-surface-variant">
            {{ product.categories && product.categories.length > 0 ? product.categories[0].name : 'Uncategorized' }}
          </p>
          <p v-if="block.showDescription" class="text-xs text-on-surface-variant">{{ product.description || 'No description added' }}</p>
          
          <div v-if="block.showCalification" class="flex gap-0.5 pt-2">
            <span class="material-symbols-outlined text-[10px]" style="font-variation-settings: 'FILL' 1;">star</span>
            <span class="material-symbols-outlined text-[10px]" style="font-variation-settings: 'FILL' 1;">star</span>
            <span class="material-symbols-outlined text-[10px]" style="font-variation-settings: 'FILL' 1;">star</span>
            <span class="material-symbols-outlined text-[10px]" style="font-variation-settings: 'FILL' 1;">star</span>
            <span class="material-symbols-outlined text-[10px]" style="font-variation-settings: 'FILL' 0;">star</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-20 text-gray-500 font-bold text-sm tracking-widest uppercase">
      No hay productos asignados a esta colección.
    </div>

    <div class="mt-24 flex justify-center w-full">
      <button class="border border-outline-variant px-12 py-4 text-xs font-bold uppercase tracking-[0.3em] hover:bg-primary hover:text-on-primary hover:border-primary transition-all duration-300 text-on-surface-variant">
        Load More Pieces
      </button>
    </div>
  </section>
</template>