<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useFavoritesStore } from '@/features/favorites/store/favorites.store';
import { resolveStrapiMediaUrl } from '@/shared/utils/strapiMedia';

const favoritesStore = useFavoritesStore();
const { items, totalFavorites } = storeToRefs(favoritesStore);

function productDetailTo(product: Record<string, unknown>): string {
  const slug = product?.slug;
  if (slug != null && String(slug).trim() !== '') return `/tienda/${String(slug).trim()}`;
  return '';
}

function itemImageUrl(product: Record<string, unknown>): string {
  const imgs = product.images as { url?: string }[] | undefined;
  return resolveStrapiMediaUrl(imgs?.[0]?.url);
}

function itemBrandOrCategory(product: Record<string, unknown>): string {
  const categories = product.categories as { name?: string }[] | undefined;
  const firstCategory = categories?.[0]?.name;
  if (firstCategory != null && String(firstCategory).trim() !== '') return String(firstCategory).trim();
  return 'Sin categoría';
}

function itemDisplayPrice(product: Record<string, unknown>): number {
  const discounted = product.discountedPrice;
  if (discounted != null && discounted !== '' && !Number.isNaN(Number(discounted))) {
    return Number(discounted);
  }
  const price = product.price;
  return price != null && price !== '' ? Number(price) || 0 : 0;
}

function formatMoney(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function removeFromFavorites(product: Record<string, unknown>) {
  favoritesStore.toggleFavorite(product);
}

const favoriteItems = computed(() => items.value as Record<string, unknown>[]);
</script>

<template>
  <main class="pt-32 pb-24 px-6 md:px-12  max-w-7xl mx-auto">
    <header class="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div class="space-y-2">
        <h1 class="text-5xl font-extrabold tracking-tighter text-primary">Atelier Favorites</h1>
        <p class="text-on-surface-variant font-body max-w-md">
          A curated selection of your most desired pieces, saved for your future sanctuary.
        </p>
      </div>
      <span class="inline-flex items-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-lg font-label text-sm tracking-wide">
        <span
          class="material-symbols-outlined text-sm transition-all duration-300 text-red-500 scale-110"
          :style="{ fontVariationSettings: 'FILL 1' }"
        >
          favorite
        </span>
        {{ totalFavorites }} saved
      </span>
    </header>

    <section v-if="favoriteItems.length > 0">
      <div class="flex items-center gap-4 mb-8">
        <span class="text-[10px] uppercase tracking-[0.3em] font-bold text-on-surface-variant">
          Your Collection
        </span>
        <div class="h-[1px] flex-grow bg-outline-variant/30"></div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
        <article
          v-for="(product, idx) in favoriteItems"
          :key="String(product.id ?? product.documentId ?? product.slug ?? `favorite-${idx}`)"
          class="group"
        >
          <div class="aspect-[3/4] overflow-hidden bg-surface-container-low mb-4 relative transition-transform duration-500 group-hover:scale-[1.02]">
            <RouterLink
              :to="productDetailTo(product)"
              :aria-disabled="!productDetailTo(product)"
              class="block h-full w-full"
              :class="productDetailTo(product) ? '' : 'pointer-events-none'"
            >
              <img
                v-if="itemImageUrl(product)"
                :src="itemImageUrl(product)"
                :alt="String(product.name ?? 'Favorite product')"
                class="w-full h-full object-cover"
              />
              <div
                v-else
                class="w-full h-full flex items-center justify-center text-sm text-on-surface-variant"
              >
                Sin imagen
              </div>
            </RouterLink>

            <button
              type="button"
              class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-primary-container transition-colors hover:cursor-pointer"
              aria-label="Quitar de favoritos"
              @click="removeFromFavorites(product)"
            >
              <span
                class="material-symbols-outlined text-sm transition-all duration-300 text-red-500 scale-110"
                :style="{ fontVariationSettings: 'FILL 1' }"
              >
                favorite
              </span>
            </button>
          </div>

          <div class="space-y-1">
            <RouterLink
              :to="productDetailTo(product)"
              class="font-headline font-bold text-lg tracking-tight hover:opacity-70 transition-opacity"
              :class="productDetailTo(product) ? '' : 'pointer-events-none'"
            >
              {{ String(product.name ?? 'Producto') }}
            </RouterLink>
            <p class="font-body text-xs text-on-surface-variant uppercase tracking-widest">
              {{ itemBrandOrCategory(product) }}
            </p>
            <p class="font-body text-sm font-semibold mt-2">${{ formatMoney(itemDisplayPrice(product)) }}</p>
          </div>
        </article>
      </div>
    </section>

    <section v-else class="py-20 text-center space-y-4">
      <p class="text-on-surface-variant">No tienes productos guardados en favoritos.</p>
      <RouterLink
        to="/tienda"
        class="inline-flex items-center justify-center px-6 py-3 bg-primary text-on-primary rounded-md text-sm font-semibold tracking-wide hover:opacity-90 transition-opacity"
      >
        Explorar productos
      </RouterLink>
    </section>
  </main>
</template>
