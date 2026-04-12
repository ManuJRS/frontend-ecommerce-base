<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { api } from '@/core/api';
import qs from 'qs';
import type { ProductGridBlock } from '../models';
import { useStoreViewStore } from '../stores/storeView.store';
import type { AppliedProductFilters } from '../stores/storeView.store';
import { useCartStore } from '@/features/cart/stores/cart.store';

const props = defineProps<{
  block: ProductGridBlock;
}>();

const rawProducts = ref<any[]>([]);
const isLoadingProducts = ref(false);
const store = useStoreViewStore();
const cartStore = useCartStore();

function addToCart(product: Record<string, unknown>) {
  if (isOutOfStock(product)) return;
  cartStore.addProduct(product);
}

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
    const sn = productStockNumber(p);
    if (sn !== null && sn <= 0) return false;
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

function productStockNumber(product: any): number | null {
  const s = product?.stock ?? product?.attributes?.stock;
  if (s == null || s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function productStockMinAdvice(product: any): number | null {
  const p = product as Record<string, unknown>;
  const attrs = p.attributes as Record<string, unknown> | undefined;
  const raw =
    p.stockMinAdvice ??
    p.stock_min_advice ??
    attrs?.stockMinAdvice ??
    attrs?.stock_min_advice;
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number.parseFloat(String(raw));
  return Number.isFinite(n) ? Math.floor(n) : null;
}

function resolveStockMinAdviceTitle(product: any): string {
  const p = product as Record<string, unknown>;
  const attrs = p.attributes as Record<string, unknown> | undefined;
  const fromProduct =
    p.stockMinAdviceTitle ??
    p.stock_min_advice_title ??
    attrs?.stockMinAdviceTitle ??
    attrs?.stock_min_advice_title;
  if (fromProduct != null && fromProduct !== '') return String(fromProduct);
  const b = props.block as Record<string, unknown>;
  const fromBlock = b.stockMinAdviceTitle ?? b.stock_min_advice_title;
  if (fromBlock != null && fromBlock !== '') return String(fromBlock);
  return '¡Disponibles!';
}

/** Muestra la etiqueta si hay stock y `stock <= stockMinAdvice` del producto. */
function showLowStockLabel(product: any): boolean {
  const stock = productStockNumber(product);
  const advice = productStockMinAdvice(product);
  if (stock === null || advice === null) return false;
  if (stock <= 0) return false;
  return stock <= advice;
}

function isOutOfStock(product: any): boolean {
  return productStockNumber(product) === 0;
}

onMounted(async () => {
  if (props.block.dataSource === 'manual_selection') {
    rawProducts.value = [...(props.block.manualProducts || [])];
  } else if (props.block.dataSource === 'by_category') {
    if (props.block.category && props.block.category.products) {
      const limit = props.block.itemsLimit || 12;
      rawProducts.value = props.block.category.products.slice(0, limit);
    } else {
      console.warn('La categoría no tiene productos asignados.');
      rawProducts.value = [];
    }
  } else if (props.block.dataSource === 'all_products') {
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
        class="group"
        :class="isOutOfStock(product) ? 'cursor-not-allowed' : 'cursor-pointer'"
      >
        <div
          class="relative mb-6 aspect-[3/4] overflow-hidden bg-surface-container-low transition-opacity duration-300"
          :class="isOutOfStock(product) ? 'opacity-60' : ''"
        >
          <img
            v-if="product.images && product.images.length > 0"
            :src="product.images[0].url"
            :alt="product.name"
            class="h-full w-full object-cover transition-transform duration-500"
            :class="
              isOutOfStock(product)
                ? 'grayscale'
                : 'group-hover:scale-105'
            "
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
            <span class="text-[9px] font-bold uppercase tracking-[0.2em] text-primary">Nuevo</span>
          </div>

          <div 
            v-if="product.bestProduct"
            class="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2 py-1 shadow-sm opacity-100 group-hover:opacity-0 transition-opacity duration-300"
          >
            <span class="material-symbols-outlined text-[10px] text-primary">star</span>
            <span class="text-[9px] font-bold uppercase tracking-[0.2em] text-primary">Bestseller</span>
          </div>
          </div>
          <button
            type="button"
            :disabled="isOutOfStock(product)"
            class="absolute bottom-4 left-4 right-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300"
            :class="
              isOutOfStock(product)
                ? 'translate-y-0 cursor-not-allowed bg-on-surface-variant/30 text-on-surface-variant opacity-100'
                : 'translate-y-12 bg-primary text-on-primary opacity-0 group-hover:translate-y-0 group-hover:opacity-100'
            "
            @click.stop="addToCart(product)"
          >
            {{ isOutOfStock(product) ? 'Agotado' : 'Add to Cart' }}
          </button>
          <div class="absolute top-4 left-4 z-10 flex flex-col gap-1 items-start pointer-events-none">
            <div v-if="block.showDiscountBadge">
              <div
                v-if="product.discountPercentage && product.discountPercentage > 0"
                class="flex flex-col gap-1"
              >
                <div
                  v-if="block.badgeFormat === 'amount'"
                  class="flex flex-col items-start bg-white px-2 py-1 leading-none"
                >
                  <span class="text-[10px] font-bold uppercase tracking-widest text-primary">
                    Ahorra ${{
                      (
                        product.price -
                        (product.discountedPrice ||
                          (product.price - product.price * (product.discountPercentage / 100)))
                      ).toFixed(0)
                    }}
                  </span>
                </div>
                <div
                  v-if="block.badgeFormat === 'percentage'"
                  class="bg-primary px-2 py-1 text-[10px] font-black tracking-tighter text-on-primary"
                >
                  -{{ product.discountPercentage }}%
                </div>
              </div>
            </div>
            <div
              v-if="showLowStockLabel(product)"
              class="bg-white/95 px-2 shadow-sm backdrop-blur-sm text-primary pb-0.5"
            >
              <span
                class="text-[10px] font-bold uppercase tracking-widest text-primary"
              >
                ({{ productStockNumber(product) }})
                {{ resolveStockMinAdviceTitle(product) }}
              </span>
            </div>
          </div>
          <button
            v-if="block.showFavIcon"
            type="button"
            :disabled="isOutOfStock(product)"
            class="absolute top-4 right-4 transition-all duration-300 group/fav disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span
              class="material-symbols-outlined text-sm text-primary transition-transform group-hover/fav:scale-110"
              :class="isOutOfStock(product) ? '' : 'hover:cursor-pointer hover:text-red-500/80'"
              style="font-variation-settings: 'FILL' 0"
            >favorite</span>
          </button>
        </div>

        <div class="space-y-1" :class="isOutOfStock(product) ? 'opacity-70' : ''">
          <div class="flex justify-between items-start">
            <h4
              class="text-sm font-bold tracking-tight"
              :class="isOutOfStock(product) ? 'text-on-surface-variant' : ''"
            >
              {{ product.name }}
            </h4>
            <div class="flex gap-2">
                <span
                  :class="{
                    'text-sm font-medium': true,
                    'text-on-tertiary-container': product.discountPercentage > 0 && !isOutOfStock(product),
                    'text-on-surface-variant': isOutOfStock(product),
                  }"
                >
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