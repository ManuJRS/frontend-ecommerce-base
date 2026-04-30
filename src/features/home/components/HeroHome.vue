<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { HomeHeroBlock, HomeHeroCarouselItem } from '../models';

const props = defineProps<{
  block: HomeHeroBlock;
}>();

const heroHeightClass = computed(() =>
  props.block.height === 'Medium' ? 'h-[50vh]' : 'h-screen'
);

const showOverlay = computed(() => Boolean(props.block.overlayHero));

const isCarouselMode = computed(() => props.block.heroMode === 'carrousel');

const carouselItems = computed<HomeHeroCarouselItem[]>(() =>
  Array.isArray(props.block.heroCarousel) ? props.block.heroCarousel : []
);
const activeSlide = ref(0);

const fallbackImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAEuxx1qBq0weUbJqsdruCBsUJAUMdO423ngX1NhKvxgIgoedPbr3mbQeEZia7hQfIGj9h7iE8EtD4MkKYxgclX6SyNDlvp7EzRK-YyaPD5hzDBNQOKya7-fwCgJ6QZLJyTpiDXp_QencJrNJxXDeztRV0b3iRPSt_YkDy1gK3H4ltQDKnCj_fTAn8J0mKol04Eb99eBv535QMDpl89fz4oKFvqYaGnYYRDOfTzIOZ_bdG94zeIHlI4-daIL7Vcm5katnLTixrtz4g';

const heroImageUrl = computed(() => props.block.heroMedia?.url || fallbackImage);

watch(
  carouselItems,
  (items) => {
    if (activeSlide.value >= items.length) {
      activeSlide.value = 0;
    }
  },
  { immediate: true }
);

const currentSlide = computed(() => {
  if (!carouselItems.value.length) return null;
  return carouselItems.value[activeSlide.value] ?? carouselItems.value[0];
});

const getCarouselBackground = (item: HomeHeroCarouselItem | null) =>
  item?.heroCarouselButtonMedia?.url || heroImageUrl.value;

const getSlugFromRelation = (relationInput: unknown): string => {
  if (!relationInput || typeof relationInput !== 'object') return '';
  const relation = relationInput as Record<string, unknown>;
  const directSlug = relation.slug;
  if (typeof directSlug === 'string' && directSlug.trim() !== '') {
    return directSlug.trim();
  }

  const data = relation.data as Record<string, unknown> | undefined;
  if (!data) return '';
  const dataSlug = data.slug;
  if (typeof dataSlug === 'string' && dataSlug.trim() !== '') {
    return dataSlug.trim();
  }

  const attrs = data.attributes as Record<string, unknown> | undefined;
  const attrsSlug = attrs?.slug;
  if (typeof attrsSlug === 'string' && attrsSlug.trim() !== '') {
    return attrsSlug.trim();
  }
  return '';
};

const normalHeroTarget = computed(() => {
  const productSlug = getSlugFromRelation(props.block.productRelation);
  if (productSlug) return `/tienda/${productSlug}`;
  return props.block.heroButtonLink || '#';
});

const getProductSlugFromRelation = (item: HomeHeroCarouselItem | null): string =>
  getSlugFromRelation(item?.productCarouselRelation);

const getSlideTarget = (item: HomeHeroCarouselItem | null): string => {
  const productSlug = getProductSlugFromRelation(item);
  if (productSlug) return `/tienda/${productSlug}`;
  return item?.heroCarouselButtonLink || '#';
};

const goToSlide = (index: number) => {
  if (!carouselItems.value.length) return;
  const max = carouselItems.value.length - 1;
  activeSlide.value = Math.max(0, Math.min(index, max));
};

const goToNextSlide = () => {
  if (!carouselItems.value.length) return;
  activeSlide.value = (activeSlide.value + 1) % carouselItems.value.length;
};

const goToPrevSlide = () => {
  if (!carouselItems.value.length) return;
  activeSlide.value =
    (activeSlide.value - 1 + carouselItems.value.length) % carouselItems.value.length;
};

const toAbsoluteMediaUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const apiUrl = import.meta.env.VITE_STRAPI_API_URL || 'http://localhost:1337/api';
  const base = apiUrl.replace(/\/api\/?$/, '');
  return `${base}${url}`;
};
</script>

<template>
  <section v-if="!isCarouselMode" class="relative w-full overflow-hidden bg-surface-container" :class="heroHeightClass">
    <div class="absolute inset-0">
      <img :alt="block.heroTitle || 'Hero image'" class="h-full w-full object-cover" :src="toAbsoluteMediaUrl(heroImageUrl)" />
      <div v-if="showOverlay" class="absolute inset-0 bg-gradient-to-r from-black/50 via-black/15 to-transparent" />
    </div>

    <div class="relative mx-auto flex h-full w-full max-w-screen-2xl items-center px-8 md:px-16">
      <div class="max-w-2xl text-white">
        <p
          v-if="block.heroSpan"
          class="mb-6 text-xs font-semibold uppercase tracking-[0.3em] opacity-80"
        >
          {{ block.heroSpan }}
        </p>
        <h1
          v-if="block.heroTitle"
          class="mb-6 text-4xl font-black leading-[0.95] tracking-tight md:text-7xl"
        >
          {{ block.heroTitle }}
        </h1>
        <p v-if="block.heroText" class="mb-8 max-w-xl text-sm leading-relaxed md:text-base">
          {{ block.heroText }}
        </p>
        <a
          v-if="block.heroButtonText"
          class="inline-block bg-white px-8 py-4 text-xs font-bold uppercase tracking-[0.24em] text-black transition-colors duration-300 hover:bg-black hover:text-white"
          :href="normalHeroTarget"
        >
          {{ block.heroButtonText }}
        </a>
      </div>
    </div>
  </section>

  <section v-else class="relative w-full overflow-hidden bg-surface-container" :class="heroHeightClass">
    <div class="absolute inset-0">
      <img
        :alt="currentSlide?.heroCarouselButtonMedia?.alternativeText || currentSlide?.heroCarouselTitle || 'Hero carousel image'"
        class="h-full w-full object-cover transition-opacity duration-500"
        :src="toAbsoluteMediaUrl(getCarouselBackground(currentSlide))"
      />
      <div v-if="showOverlay" class="absolute inset-0 bg-gradient-to-r from-black/50 via-black/15 to-transparent" />
    </div>

    <div class="relative mx-auto flex h-full w-full max-w-screen-2xl items-center px-8 md:px-16">
      <div class="max-w-2xl text-white">
        <h2 v-if="currentSlide?.heroCarouselTitle" class="mb-8 text-4xl font-black leading-[0.95] tracking-tight md:text-7xl">
          {{ currentSlide.heroCarouselTitle }}
        </h2>
        <p v-if="currentSlide?.heroCarouselText" class="mb-8 text-sm leading-relaxed md:text-base">
          {{ currentSlide.heroCarouselText }}
        </p>
        <a
          v-if="currentSlide?.heroCarouselButtonText"
          class="inline-block bg-white px-8 py-4 text-xs font-bold uppercase tracking-[0.24em] text-black transition-colors duration-300 hover:bg-black hover:text-white"
          :href="getSlideTarget(currentSlide)"
        >
          {{ currentSlide.heroCarouselButtonText }}
        </a>
      </div>
    </div>

    <div v-if="carouselItems.length > 1" class="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 md:px-8">
      <button
        class="pointer-events-auto rounded-full bg-white/90 p-3 text-black transition hover:bg-white"
        type="button"
        aria-label="Slide anterior"
        @click="goToPrevSlide"
      >
        &#10094;
      </button>
      <button
        class="pointer-events-auto rounded-full bg-white/90 p-3 text-black transition hover:bg-white"
        type="button"
        aria-label="Slide siguiente"
        @click="goToNextSlide"
      >
        &#10095;
      </button>
    </div>

    <div v-if="carouselItems.length > 1" class="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
      <button
        v-for="(item, index) in carouselItems"
        :key="item.id"
        :class="index === activeSlide ? 'bg-white' : 'bg-white/40'"
        class="h-1.5 w-8 rounded-full transition-colors"
        type="button"
        :aria-label="`Ir al slide ${index + 1}`"
        @click="goToSlide(index)"
      />
    </div>
  </section>
</template>
