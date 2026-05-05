<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import qs from 'qs';
import { api } from '@/core/api';
import type { HomeSharedGridProductBlock } from '@/features/home/models';
import { resolveStrapiMediaUrl } from '@/shared/utils/strapiMedia';
import { getProductDescriptionHtmlExcerpt } from '@/features/products/utils/renderProductMarkdown';
import { useFavoritesStore } from '@/features/favorites/store/favorites.store';

type ProductLike = Record<string, any>;

/** Gap entre slides (equivale a `gap-12` en Tailwind = 3rem). */
const CAROUSEL_GAP_PX = 48;
const AUTOPLAY_MS = 4000;

const props = defineProps<{
  block: HomeSharedGridProductBlock;
}>();

const favoritesStore = useFavoritesStore();
const rawProducts = ref<ProductLike[]>([]);
const loading = ref(false);

const carouselRef = ref<HTMLElement | null>(null);
const slideWidthPx = ref(0);
/** Desktop: 4 visibles por defecto; tablet 2; móvil 1. */
const visibleCount = ref(4);
const offsetIndex = ref(0);
const disableTransition = ref(false);

let resizeObserver: ResizeObserver | null = null;
let autoplayTimer: ReturnType<typeof setInterval> | null = null;

const normalizedLimit = computed(() => {
  const n = Number(props.block.itemsLimit ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 6;
});

const displayProducts = computed(() => rawProducts.value.slice(0, normalizedLimit.value));

const productCount = computed(() => displayProducts.value.length);

/** Duplicado para bucle visual infinito. */
const loopSlides = computed(() => {
  const p = displayProducts.value;
  if (!p.length) return [];
  return [...p, ...p];
});

const stepPx = computed(() => slideWidthPx.value + CAROUSEL_GAP_PX);

const translateX = computed(() => offsetIndex.value * stepPx.value);

const carouselEnabled = computed(() => productCount.value > 1);

/** Arrastre con puntero (ratón / táctil): posición visual del track mientras se arrastra. */
const isDragging = ref(false);
const dragStartClientX = ref(0);
const dragStartTranslatePx = ref(0);
const dragDeltaX = ref(0);
const activeDragPointerId = ref<number | null>(null);
/** Tras un drag, evita que el click abra la ficha del producto. */
let suppressLinkNavigationUntil = 0;

const translatePxDisplay = computed(() => {
  if (!carouselEnabled.value) return 0;
  if (isDragging.value) {
    return dragStartTranslatePx.value - dragDeltaX.value;
  }
  return translateX.value;
});

/**
 * En Strapi: `true` = autoplay; `false` = sin avance automático.
 * Sin campo (bloques viejos): se mantiene autoplay como antes.
 */
const autoTransitionActive = computed(() =>
  props.block.autoTransition === undefined ? true : props.block.autoTransition === true
);

const showChevronsUi = computed(
  () => props.block.showChevron === true && carouselEnabled.value
);

function blockProductLinkAfterDrag(e: Event) {
  if (Date.now() < suppressLinkNavigationUntil) {
    e.preventDefault();
    e.stopPropagation();
  }
}

function onCarouselPointerDown(e: PointerEvent) {
  if (!carouselEnabled.value || slideWidthPx.value <= 0) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const t = e.target as HTMLElement | null;
  if (t?.closest?.('a[href], button')) return;

  isDragging.value = true;
  dragStartClientX.value = e.clientX;
  dragStartTranslatePx.value = offsetIndex.value * stepPx.value;
  dragDeltaX.value = 0;
  activeDragPointerId.value = e.pointerId;
  stopAutoplay();
  try {
    carouselRef.value?.setPointerCapture(e.pointerId);
  } catch {
    /* noop */
  }
}

function onCarouselPointerMove(e: PointerEvent) {
  if (!isDragging.value || activeDragPointerId.value !== e.pointerId) return;
  dragDeltaX.value = e.clientX - dragStartClientX.value;
}

function finishDrag() {
  if (!isDragging.value) return;

  const pid = activeDragPointerId.value;
  if (pid != null) {
    try {
      carouselRef.value?.releasePointerCapture(pid);
    } catch {
      /* noop */
    }
  }
  activeDragPointerId.value = null;

  const delta = dragDeltaX.value;
  const step = stepPx.value;
  const n = productCount.value;

  if (Math.abs(delta) > 12) {
    suppressLinkNavigationUntil = Date.now() + 500;
  }

  if (step <= 0 || n <= 1) {
    isDragging.value = false;
    dragDeltaX.value = 0;
    restartAutoplayIfNeeded();
    return;
  }

  const finalTranslate = dragStartTranslatePx.value - delta;
  let nextIndex = Math.round(finalTranslate / step);
  nextIndex = Math.max(0, Math.min(n, nextIndex));

  offsetIndex.value = nextIndex;
  isDragging.value = false;
  dragDeltaX.value = 0;
  restartAutoplayIfNeeded();
}

function onCarouselPointerUp(e: PointerEvent) {
  if (!isDragging.value || activeDragPointerId.value !== e.pointerId) return;
  finishDrag();
}

function onCarouselPointerCancel(e: PointerEvent) {
  if (!isDragging.value || activeDragPointerId.value !== e.pointerId) return;
  finishDrag();
}

function restartAutoplayIfNeeded() {
  stopAutoplay();
  startAutoplay();
}

function goNext() {
  advanceCarousel();
  restartAutoplayIfNeeded();
}

function goPrev() {
  const n = productCount.value;
  if (n <= 1 || slideWidthPx.value <= 0) return;
  if (offsetIndex.value > 0) {
    offsetIndex.value--;
    restartAutoplayIfNeeded();
    return;
  }
  disableTransition.value = true;
  offsetIndex.value = n;
  void nextTick(() => {
    requestAnimationFrame(() => {
      disableTransition.value = false;
      offsetIndex.value = n - 1;
      restartAutoplayIfNeeded();
    });
  });
}

function resolveVisibleCount(width: number): number {
  if (width < 768) return 1;
  if (width < 1024) return 2;
  return 4;
}

function measureCarousel() {
  const el = carouselRef.value;
  if (!el || visibleCount.value < 1) return;
  const w = el.clientWidth;
  const vc = visibleCount.value;
  const gaps = vc > 1 ? CAROUSEL_GAP_PX * (vc - 1) : 0;
  slideWidthPx.value = Math.max(0, (w - gaps) / vc);
}

function updateVisibleFromWidth(width: number) {
  visibleCount.value = resolveVisibleCount(width);
  measureCarousel();
}

function stopAutoplay() {
  if (autoplayTimer != null) {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }
}

function startAutoplay() {
  stopAutoplay();
  if (!autoTransitionActive.value || !carouselEnabled.value || slideWidthPx.value <= 0) return;
  autoplayTimer = setInterval(advanceCarousel, AUTOPLAY_MS);
}

watch(slideWidthPx, (w) => {
  if (loading.value || !carouselEnabled.value || !autoTransitionActive.value || w <= 0) return;
  if (autoplayTimer == null) startAutoplay();
});

watch(autoTransitionActive, (on) => {
  if (on) startAutoplay();
  else stopAutoplay();
});

function advanceCarousel() {
  const n = productCount.value;
  if (n <= 1 || slideWidthPx.value <= 0) return;
  if (offsetIndex.value < n - 1) {
    offsetIndex.value++;
    return;
  }
  if (offsetIndex.value === n - 1) {
    offsetIndex.value = n;
    return;
  }
}

function onTrackTransitionEnd(e: TransitionEvent) {
  if (e.propertyName !== 'transform') return;
  const n = productCount.value;
  if (n <= 0) return;
  if (offsetIndex.value >= n) {
    disableTransition.value = true;
    offsetIndex.value = 0;
    void nextTick(() => {
      requestAnimationFrame(() => {
        disableTransition.value = false;
      });
    });
  }
}

watch(displayProducts, () => {
  offsetIndex.value = 0;
  void nextTick(() => measureCarousel());
});

watch(visibleCount, () => {
  measureCarousel();
});

function setupCarouselSizing() {
  resizeObserver?.disconnect();
  resizeObserver = null;

  const el = carouselRef.value;
  if (!el || !carouselEnabled.value) {
    measureCarousel();
    return;
  }

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width ?? el.clientWidth;
      updateVisibleFromWidth(w);
      measureCarousel();
    });
    resizeObserver.observe(el);
  }
  updateVisibleFromWidth(el.clientWidth);
  measureCarousel();
}

watch(carouselEnabled, (enabled) => {
  offsetIndex.value = 0;
  void nextTick(() => {
    setupCarouselSizing();
    if (enabled && autoTransitionActive.value) startAutoplay();
    else stopAutoplay();
  });
});

watch(loading, async (isLoading) => {
  if (isLoading) {
    stopAutoplay();
    resizeObserver?.disconnect();
    resizeObserver = null;
    return;
  }
  await nextTick();
  setupCarouselSizing();
  startAutoplay();
});

const itemsToRender = computed(() => (carouselEnabled.value ? loopSlides.value : displayProducts.value));

function carouselItemKey(product: ProductLike, idx: number): string {
  return carouselEnabled.value ? `c-${idx}-${product.id}` : String(product.id);
}

const trackTransitionClass =
  'transition-transform duration-700 ease-[cubic-bezier(0.33,1,0.68,1)]';

const trackLayoutClass = computed(() => {
  if (!carouselEnabled.value) {
    return ['grid', 'grid-cols-1', 'gap-12', 'md:grid-cols-2', 'lg:grid-cols-4'];
  }
  return disableTransition.value || isDragging.value
    ? ['flex', 'gap-12']
    : ['flex', 'gap-12', trackTransitionClass];
});

function slideOuterStyle(carouselMode: boolean): Record<string, string> | undefined {
  if (!carouselMode) return undefined;
  if (slideWidthPx.value > 0) return { width: `${slideWidthPx.value}px`, flexShrink: '0' };
  return { minWidth: '260px', flexShrink: '0' };
}

onUnmounted(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  stopAutoplay();
  isDragging.value = false;
  activeDragPointerId.value = null;
});

function productTo(product: ProductLike): string {
  const slug = product?.slug;
  if (slug != null && String(slug).trim() !== '') return `/tienda/${String(slug).trim()}`;
  return '';
}

function productImageUrl(product: ProductLike): string {
  const media = Array.isArray(product?.images) && product.images.length > 0 ? product.images[0] : null;
  return resolveStrapiMediaUrl(media?.url ?? '');
}

function categoryLabel(product: ProductLike): string {
  const category = Array.isArray(product?.categories) && product.categories.length > 0
    ? product.categories[0]
    : null;
  return category?.name ? String(category.name) : 'No categorizado';
}

function effectiveDiscount(product: ProductLike): number {
  const d = Number(product?.discountPercentage ?? 0);
  return Number.isFinite(d) && d > 0 ? d : 0;
}

function discountedPrice(product: ProductLike): number {
  if (product?.discountedPrice != null && product.discountedPrice !== '') return Number(product.discountedPrice);
  const price = Number(product?.price ?? 0);
  const discount = effectiveDiscount(product);
  if (discount <= 0) return price;
  return price - (price * discount) / 100;
}

function discountAmount(product: ProductLike): number {
  const price = Number(product?.price ?? 0);
  const discounted = discountedPrice(product);
  return Math.max(0, price - discounted);
}

function discountBadge(product: ProductLike): string {
  const discount = effectiveDiscount(product);
  if (discount <= 0) return '';

  switch (props.block.badgeFormat) {
    case 'amount':
      return `Ahorra $${discountAmount(product).toFixed(0)}`;
    case 'text_only':
      return 'Descuento';
    case 'percentage':
    default:
      return `-${discount}%`;
  }
}

async function fetchAllProducts() {
  const query = qs.stringify(
    {
      populate: {
        images: true,
        categories: true,
      },
      pagination: { limit: normalizedLimit.value },
      sort: ['createdAt:desc'],
    },
    { encodeValuesOnly: true }
  );
  const response = await api.get(`/products?${query}`);
  rawProducts.value = Array.isArray(response.data?.data) ? response.data.data : [];
}

function fromBlockRelations() {
  if (props.block.dataSource === 'manual_selection') {
    rawProducts.value = Array.isArray(props.block.manualProducts) ? props.block.manualProducts : [];
    return;
  }
  if (props.block.dataSource === 'by_category') {
    rawProducts.value = Array.isArray(props.block.category?.products) ? props.block.category.products : [];
    return;
  }
  rawProducts.value = [];
}

onMounted(async () => {
  if (props.block.dataSource === 'all_products') {
    loading.value = true;
    try {
      await fetchAllProducts();
    } catch (error) {
      console.error('[SharedGridProduct] failed loading all products', error);
      rawProducts.value = [];
    } finally {
      loading.value = false;
    }
  } else {
    fromBlockRelations();
  }
  await nextTick();
  if (!loading.value) {
    setupCarouselSizing();
    startAutoplay();
  }
});
</script>

<template>
  <section
    class="w-full py-24 md:py-32"
    :class="{ 'bg-[#f2f4f6]': block.background === true, 'bg-white': block.background !== true }"
  >
    <div class="mx-auto max-w-screen-2xl px-4 md:px-8">
      <div class=" text-center">
        <h2 class="mb-4 text-4xl font-black tracking-tighter md:text-5xl">{{ block.title }}</h2>
        <p v-if="block.text" class="font-body text-on-surface-variant">{{ block.text }}</p>
        <p
          v-if="block.showItemsQuantity"
          class="mt-4 text-xs font-bold uppercase tracking-[0.3em] text-on-surface-variant"
        >
          ({{ displayProducts.length }})
        </p>
      </div>
      <div v-if="block.buttonText" class="flex justify-center md:mt-4 md:mb-24">
        <RouterLink
          :to="block.buttonLink || '/tienda'"
          class="border border-outline-variant px-10 py-4 text-xs font-bold uppercase tracking-[0.3em] text-on-surface-variant transition-all duration-300 hover:border-primary hover:bg-primary hover:text-on-primary"
        >
          {{ block.buttonText }}
        </RouterLink>
      </div>

      <div v-if="loading" class="py-16 text-center text-sm text-on-surface-variant">Cargando productos...</div>

      <div
        v-else-if="displayProducts.length > 0"
        class="relative"
      >
        <button
          v-if="showChevronsUi"
          type="button"
          class="pointer-events-auto absolute left-0 top-1/2 z-20 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-outline-variant bg-white/95 text-on-surface shadow-md transition-colors hover:border-primary hover:bg-primary hover:text-on-primary md:h-12 md:w-12 hover:cursor-pointer"
          aria-label="Anterior"
          @click="goPrev"
        >
          <span class="material-symbols-outlined text-2xl leading-none">chevron_left</span>
        </button>
        <button
          v-if="showChevronsUi"
          type="button"
          class="pointer-events-auto absolute right-0 top-1/2 z-20 flex h-11 w-11 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-outline-variant bg-white/95 text-on-surface shadow-md transition-colors hover:border-primary hover:bg-primary hover:text-on-primary md:h-12 md:w-12 hover:cursor-pointer"
          aria-label="Siguiente"
          @click="goNext"
        >
          <span class="material-symbols-outlined text-2xl leading-none">chevron_right</span>
        </button>

        <div
          ref="carouselRef"
          :class="[
            carouselEnabled ? 'overflow-hidden touch-none select-none' : '',
            carouselEnabled ? 'cursor-grab active:cursor-grabbing' : '',
          ]"
          @pointerdown="onCarouselPointerDown"
          @pointermove="onCarouselPointerMove"
          @pointerup="onCarouselPointerUp"
          @pointercancel="onCarouselPointerCancel"
        >
        <div
          class="will-change-transform"
          :class="trackLayoutClass"
          :style="carouselEnabled ? { transform: `translate3d(-${translatePxDisplay}px,0,0)` } : undefined"
          @transitionend="onTrackTransitionEnd"
        >
          <article
            v-for="(product, idx) in itemsToRender"
            :key="carouselItemKey(product, idx)"
            class="group"
            :class="carouselEnabled ? 'shrink-0' : ''"
            :style="slideOuterStyle(carouselEnabled)"
          >
          <div class="relative mb-6 aspect-[3/4] overflow-hidden bg-white">
            <img
              v-if="productImageUrl(product)"
              :src="productImageUrl(product)"
              :alt="String(product?.name ?? 'Producto')"
              class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              draggable="false"
              @dragstart.prevent
            />
            <div v-else class="flex h-full w-full items-center justify-center text-sm text-on-surface-variant">
              Sin imagen
            </div>

            <RouterLink
              v-if="productTo(product)"
              :to="productTo(product)"
              class="absolute inset-0"
              :aria-label="`Ver producto ${String(product?.name ?? '')}`"
              @click="blockProductLinkAfterDrag"
            />

            <div
              v-if="block.showDiscountBadge && discountBadge(product)"
              class="absolute left-4 top-4 bg-primary px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-on-primary"
            >
              {{ discountBadge(product) }}
            </div>

            <button
              v-if="block.showFavIcon"
              type="button"
              class="absolute right-4 top-4 z-10 text-primary"
              @click.stop="favoritesStore.toggleFavorite(product)"
            >
              <span
                class="material-symbols-outlined text-sm"
                :style="{
                  fontVariationSettings: favoritesStore.isFavorite(product.id) ? 'FILL 1' : 'FILL 0'
                }"
              >
                favorite
              </span>
            </button>
          </div>

          <div>
            <p
              v-if="block.showCategory"
              class="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant"
            >
              {{ categoryLabel(product) }}
            </p>
            <h4 class="mb-2 text-lg font-bold tracking-tight">{{ product.name }}</h4>
            <p class="text-sm font-medium">
              ${{ discountedPrice(product).toFixed(2) }}
              <span
                v-if="effectiveDiscount(product) > 0"
                class="ml-1 text-xs text-on-surface-variant line-through"
              >
                ${{ Number(product.price ?? 0).toFixed(2) }}
              </span>
            </p>

            <p
              v-if="block.showDescription"
              class="product-markdown product-markdown--grid mt-2 text-xs text-on-surface-variant break-words"
              v-html="getProductDescriptionHtmlExcerpt(product.description, 120)"
            />

            <div v-if="block.showCalification" class="flex gap-0.5 pt-2">
              <span class="material-symbols-outlined text-[10px]" style="font-variation-settings: 'FILL' 1;">star</span>
              <span class="material-symbols-outlined text-[10px]" style="font-variation-settings: 'FILL' 1;">star</span>
              <span class="material-symbols-outlined text-[10px]" style="font-variation-settings: 'FILL' 1;">star</span>
              <span class="material-symbols-outlined text-[10px]" style="font-variation-settings: 'FILL' 1;">star</span>
              <span class="material-symbols-outlined text-[10px]" style="font-variation-settings: 'FILL' 0;">star</span>
            </div>
          </div>
        </article>
        </div>
        </div>
      </div>

      <div
        v-else
        class="py-16 text-center text-sm font-bold uppercase tracking-widest text-on-surface-variant"
      >
        No hay productos en esta sección.
      </div>


    </div>
  </section>
</template>
