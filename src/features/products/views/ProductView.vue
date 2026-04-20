<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useProduct } from '../composables/useProduct';
import { useCartStore } from '@/features/cart/stores/cart.store';
import type { StrapiProduct } from '../models';
import { renderProductDescriptionMarkdown } from '../utils/renderProductMarkdown';

const {
  product,
  relatedProducts,
  galleryUrls,
  loading,
  error,
  effectivePrice,
  hasDiscount,
  productImageUrl,
  productStockNumber,
  showLowStockLabel,
  resolveStockMinAdviceTitle,
  isOutOfStock,
} = useProduct();

const cartStore = useCartStore();

/** Índice de la imagen mostrada en el hero (miniaturas actualizan este índice). */
const activeImageIndex = ref(0);

watch(
  () => product.value?.documentId,
  () => {
    activeImageIndex.value = 0;
  }
);

watch(galleryUrls, (urls) => {
  if (activeImageIndex.value >= urls.length) {
    activeImageIndex.value = Math.max(0, urls.length - 1);
  }
});

const heroImage = computed(() => galleryUrls.value[activeImageIndex.value] ?? '');
const showImageThumbnails = computed(() => galleryUrls.value.length > 1);

const breadcrumbCategory = computed(() => product.value?.categories?.[0]?.name ?? 'Catálogo');

const descriptionHtml = computed(() =>
  renderProductDescriptionMarkdown(product.value?.description)
);

function addToCart(p: StrapiProduct) {
  if (isOutOfStock(p)) return;
  cartStore.addProduct(p as unknown as Record<string, unknown>);
}

function formatMoney(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
</script>

<template>
  <div class="pt-8 pb-32">
    <div v-if="loading" class="max-w-screen-2xl mx-auto px-8 py-20 text-center">
      <p class="text-xs font-bold uppercase tracking-widest text-on-surface-variant animate-pulse">
        Cargando producto…
      </p>
    </div>

    <div v-else-if="error" class="max-w-screen-2xl mx-auto px-8 py-20 text-center">
      <p class="text-on-surface-variant">{{ error }}</p>
      <RouterLink
        to="/"
        class="mt-6 inline-block text-sm font-semibold text-primary border-b border-primary hover:opacity-70"
      >
        Volver al inicio
      </RouterLink>
    </div>

    <template v-else-if="product">
      <section class="max-w-screen-2xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div class="lg:col-span-7 flex flex-col gap-8">
          <div class="relative aspect-[4/5] bg-surface-container-low overflow-hidden group">
            <img
              v-if="heroImage"
              :src="heroImage"
              :alt="product.name"
              class="relative z-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div
              v-else
              class="relative z-0 flex h-full w-full items-center justify-center text-on-surface-variant text-sm"
            >
              Sin imagen
            </div>
            <div class="pointer-events-none absolute inset-0 z-[1] bg-black/5"></div>

            <div
              class="pointer-events-none absolute top-4 left-4 z-10 flex flex-col gap-1.5 items-start"
            >
              <div
                v-if="showLowStockLabel(product)"
                class="flex items-center bg-white/95 px-2.5 py-1.5 shadow-sm backdrop-blur-sm"
              >
                <span class="text-[10px] font-bold uppercase tracking-widest text-primary">
                  ({{ productStockNumber(product) }})
                  {{ resolveStockMinAdviceTitle(product) }}
                </span>
              </div>
            </div>

            <div
              class="pointer-events-none absolute right-4 bottom-4 z-10 flex flex-col gap-2 items-end"
            >
              <div
                v-if="product.newProduct"
                class="flex items-center gap-1.5 bg-white/90 px-2 py-1 shadow-sm backdrop-blur-sm"
              >
                <span class="material-symbols-outlined text-xs text-primary">new_releases</span>
                <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary"
                  >Nuevo</span
                >
              </div>
              <div
                v-if="product.bestProduct"
                class="flex items-center gap-1.5 bg-white/90 px-2 py-1 shadow-sm backdrop-blur-sm"
              >
                <span class="material-symbols-outlined text-xs text-primary">star</span>
                <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary"
                  >Bestseller</span
                >
              </div>
            </div>
          </div>

          <div
            v-if="showImageThumbnails"
            class="grid grid-cols-2 sm:grid-cols-3 gap-4"
            role="tablist"
            aria-label="Galería de imágenes del producto"
          >
            <button
              v-for="(src, idx) in galleryUrls"
              :key="`${src}-${idx}`"
              type="button"
              role="tab"
              :aria-selected="idx === activeImageIndex"
              class="relative aspect-square overflow-hidden bg-surface-container-low ring-2 transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              :class="
                idx === activeImageIndex
                  ? 'ring-primary'
                  : 'ring-transparent hover:ring-outline-variant'
              "
              @click="activeImageIndex = idx"
            >
              <img
                :src="src"
                :alt="`${product.name} — vista ${idx + 1}`"
                class="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          </div>
        </div>

        <div class="lg:col-span-5 flex flex-col pt-12 lg:sticky lg:top-36 h-fit">
          <nav
            class="flex items-center space-x-2 text-xs uppercase tracking-widest text-on-surface-variant mb-6 font-label"
          >
            <RouterLink to="/tienda" class="hover:text-primary transition-colors">Tienda</RouterLink>
            <span class="material-symbols-outlined text-[10px]">chevron_right</span>
            <span>{{ breadcrumbCategory }}</span>
          </nav>

          <h1
            class="text-5xl font-extrabold font-headline tracking-tighter text-primary leading-tight mb-4"
          >
            {{ product.name }}
          </h1>

          <div class="mb-8 flex flex-wrap items-baseline gap-3">
            <p class="text-2xl font-light font-headline tracking-tight text-on-surface">
              ${{ formatMoney(effectivePrice(product)) }}
            </p>
            <span
              v-if="hasDiscount(product)"
              class="text-lg line-through text-on-surface-variant"
            >
              ${{ formatMoney(Number(product.price) || 0) }}
            </span>
            <span
              v-if="hasDiscount(product) && product.discountPercentage != null"
              class="text-sm font-semibold text-primary"
            >
              −{{ product.discountPercentage }}%
            </span>
          </div>

          <div class="space-y-8">
            <div
              class="product-markdown max-w-md text-on-surface-variant leading-relaxed"
              v-html="descriptionHtml"
            />

            <div class="pt-8 space-y-4">
              <button
                type="button"
                :disabled="isOutOfStock(product)"
                class="hover:cursor-pointer w-full max-w-md py-5 font-bold tracking-tight text-lg transition-opacity flex justify-center items-center gap-3"
                :class="
                  isOutOfStock(product)
                    ? 'bg-on-surface-variant/30 text-on-surface-variant cursor-not-allowed'
                    : 'bg-primary text-on-primary hover:opacity-90'
                "
                @click="addToCart(product)"
              >
                {{ isOutOfStock(product) ? 'Agotado' : 'Añadir al carrito' }}
                <span v-if="!isOutOfStock(product)" class="material-symbols-outlined text-xl"
                  >arrow_forward</span
                >
              </button>
            </div>

            <div class="pt-12 space-y-6 max-w-md">
              <div class="border-t border-outline-variant pt-6">
                <div class="flex justify-between items-center w-full">
                  <span class="font-headline font-bold text-sm tracking-widest uppercase"
                    >Detalles</span
                  >
                </div>
                <p v-if="product.sku" class="mt-4 text-sm text-on-surface-variant leading-relaxed">
                  SKU: {{ product.sku }}
                </p>
                <p
                  v-if="product.stock != null"
                  class="mt-2 text-sm text-on-surface-variant leading-relaxed"
                >
                  Stock: {{ product.stock }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Related Products -->
      <section
        v-if="product.showRelatedProducts === true && relatedProducts.length > 0"
        class="mt-48 max-w-screen-2xl mx-auto px-8"
      >
        <div class="flex items-end justify-between mb-12">
          <div class="space-y-4">
            <h2 class="text-4xl font-extrabold font-headline tracking-tighter">También te puede interesar</h2>
            <p class="text-on-surface-variant">Selección de la misma categoría.</p>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <RouterLink
            v-for="(rp, idx) in relatedProducts"
            :key="rp.documentId"
            :to="rp.slug ? `/tienda/${rp.slug}` : '/'"
            class="group cursor-pointer"
          >
            <div
              class="aspect-[3/4] bg-surface-container overflow-hidden mb-6"
              :class="{
                'translate-y-8': idx === 1,
                'translate-y-12': idx === 3,
              }"
            >
              <img
                v-if="productImageUrl(rp)"
                :src="productImageUrl(rp)"
                :alt="rp.name"
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-sm text-on-surface-variant">
                Sin imagen
              </div>
            </div>
            <h3
              class="font-headline font-bold text-lg tracking-tight mb-1"
              :class="{ 'mt-8': idx === 1, 'mt-12': idx === 3 }"
            >
              {{ rp.name }}
            </h3>
            <div class="flex gap-2 items-baseline">
              <p class="text-on-surface-variant text-sm">
                ${{ formatMoney(effectivePrice(rp)) }}
              </p>
              <span v-if="hasDiscount(rp)" class="text-xs line-through text-on-surface-variant">
                ${{ formatMoney(Number(rp.price) || 0) }}
              </span>
            </div>
          </RouterLink>
        </div>
      </section>
    </template>
  </div>
</template>
