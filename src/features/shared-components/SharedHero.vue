<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { SharedHeroBlock, SharedHeroCarouselItem } from '@/features/shared-components/models';

const props = defineProps<{
  block?: SharedHeroBlock;
  data?: Record<string, unknown>;
}>();

const heroBlock = computed(
  () => (props.data ?? props.block ?? {}) as SharedHeroBlock
);

const heroHeightClass = computed(() =>
  heroBlock.value.height === 'Medium' ? 'h-[50vh]' : 'h-screen'
);

const showOverlay = computed(() => Boolean(heroBlock.value.overlayHero));

const heroModeNormalized = computed(() =>
  String(heroBlock.value.heroMode ?? '')
    .trim()
    .toLowerCase()
);

const isCarouselMode = computed(
  () => heroModeNormalized.value === 'carrousel' || heroModeNormalized.value === 'carousel'
);

const carouselItems = computed<SharedHeroCarouselItem[]>(() =>
  Array.isArray(heroBlock.value.heroCarousel) ? heroBlock.value.heroCarousel : []
);
const shouldUseCarousel = computed(
  () => isCarouselMode.value && carouselItems.value.length > 0
);
const activeSlide = ref(0);

const fallbackImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAEuxx1qBq0weUbJqsdruCBsUJAUMdO423ngX1NhKvxgIgoedPbr3mbQeEZia7hQfIGj9h7iE8EtD4MkKYxgclX6SyNDlvp7EzRK-YyaPD5hzDBNQOKya7-fwCgJ6QZLJyTpiDXp_QencJrNJxXDeztRV0b3iRPSt_YkDy1gK3H4ltQDKnCj_fTAn8J0mKol04Eb99eBv535QMDpl89fz4oKFvqYaGnYYRDOfTzIOZ_bdG94zeIHlI4-daIL7Vcm5katnLTixrtz4g';

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

const getSlideTitle = (item: SharedHeroCarouselItem | null): string =>
  item?.carouselTitle || item?.carouselTitle || '';

const toAbsoluteMediaUrl = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const apiUrl = import.meta.env.VITE_STRAPI_API_URL || 'http://localhost:1337/api';
  const base = apiUrl.replace(/\/api\/?$/, '');
  return `${base}${url}`;
};

const pickEntitySlug = (entity: unknown): string => {
  if (!entity || typeof entity !== 'object') return '';
  const o = entity as Record<string, unknown>;
  const top = o.slug;
  if (typeof top === 'string' && top.trim() !== '') return top.trim();
  const attrs = o.attributes as Record<string, unknown> | undefined;
  const fromAttrs = attrs?.slug;
  if (typeof fromAttrs === 'string' && fromAttrs.trim() !== '') return fromAttrs.trim();
  return '';
};

const getSlugFromRelation = (relationInput: unknown): string => {
  if (relationInput == null || relationInput === '') return '';
  if (typeof relationInput === 'number') return '';
  if (Array.isArray(relationInput)) {
    for (const item of relationInput) {
      const s = getSlugFromRelation(item);
      if (s) return s;
    }
    return '';
  }
  if (typeof relationInput !== 'object') return '';

  const relation = relationInput as Record<string, unknown>;
  const flat = pickEntitySlug(relation);
  if (flat) return flat;

  const payload = relation.data;
  if (Array.isArray(payload)) {
    for (const entry of payload) {
      const s = pickEntitySlug(entry);
      if (s) return s;
    }
    return '';
  }
  if (payload && typeof payload === 'object') {
    const fromData = pickEntitySlug(payload);
    if (fromData) return fromData;
    const inner = (payload as Record<string, unknown>).data;
    if (inner && typeof inner === 'object') {
      const nested = pickEntitySlug(inner);
      if (nested) return nested;
    }
  }
  return '';
};

const normalHeroTarget = computed(() => {
  const productSlug = getSlugFromRelation(heroBlock.value.productRelation);
  if (productSlug) return `/tienda/${productSlug}`;
  return heroBlock.value.heroButtonLink || '#';
});

const getSlideTarget = (item: SharedHeroCarouselItem | null): string => {
  const productSlug = getSlugFromRelation(item?.productCarouselRelation);
  if (productSlug) return `/tienda/${productSlug}`;
  return item?.carouselButtonLink || '#';
};

const heroMediaUrl = computed(() =>
  toAbsoluteMediaUrl(heroBlock.value.heroMedia?.url) || fallbackImage
);

const isVideoByMimeOrUrl = (mime?: string, url?: string) => {
  if (typeof mime === 'string' && mime.startsWith('video/')) return true;
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
};

const normalIsVideo = computed(() =>
  isVideoByMimeOrUrl(heroBlock.value.heroMedia?.mime, heroBlock.value.heroMedia?.url)
);

const slideMediaUrl = computed(() => {
  const candidate =
    currentSlide.value?.carouselMedia?.url ?? heroBlock.value.heroMedia?.url;
  return toAbsoluteMediaUrl(candidate) || heroMediaUrl.value;
});

const slideIsVideo = computed(() =>
  isVideoByMimeOrUrl(
    currentSlide.value?.carouselMedia?.mime,
    currentSlide.value?.carouselMedia?.url
  )
);

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
</script>

<template>
  <section
    v-if="!shouldUseCarousel"
    class="relative w-full overflow-hidden bg-surface-container"
    :class="heroHeightClass"
  >
    <div class="absolute inset-0">
      <video
        v-if="normalIsVideo"
        class="h-full w-full object-cover"
        :src="heroMediaUrl"
        autoplay
        muted
        loop
        playsinline
      />
      <img
        v-else
        :alt="heroBlock.heroTitle || 'Hero image'"
        class="h-full w-full object-cover"
        :src="heroMediaUrl"
      />
      <div
        v-if="showOverlay"
        class="absolute inset-0 bg-gradient-to-r from-black/50 via-black/15 to-transparent"
      />
    </div>

    <div class="relative mx-auto flex h-full w-full max-w-screen-2xl items-center px-8 md:px-16">
      <div class="max-w-2xl text-white">
        <p
          v-if="heroBlock.heroSpan"
          class="mb-6 text-xs font-semibold uppercase tracking-[0.3em] opacity-80"
        >
          {{ heroBlock.heroSpan }}
        </p>
        <h1
          v-if="heroBlock.heroTitle"
          class="mb-6 text-4xl font-black leading-[0.95] tracking-tight md:text-7xl"
        >
          {{ heroBlock.heroTitle }}
        </h1>
        <p v-if="heroBlock.heroText" class="mb-8 max-w-xl text-sm leading-relaxed md:text-base">
          {{ heroBlock.heroText }}
        </p>
        <a
          v-if="heroBlock.heroButtonText"
          class="inline-block bg-white px-8 py-4 text-xs font-bold uppercase tracking-[0.24em] text-black transition-colors duration-300 hover:bg-black hover:text-white"
          :href="normalHeroTarget"
        >
          {{ heroBlock.heroButtonText }}
        </a>
      </div>
    </div>
  </section>

  <section v-else class="relative w-full overflow-hidden bg-surface-container" :class="heroHeightClass">
    <div class="absolute inset-0">
      <video
        v-if="slideIsVideo"
        class="h-full w-full object-cover transition-opacity duration-500"
        :src="slideMediaUrl"
        autoplay
        muted
        loop
        playsinline
      />
      <img
        v-else
        :alt="
          currentSlide?.carouselMedia?.alternativeText ||
          getSlideTitle(currentSlide) ||
          'Hero carousel image'
        "
        class="h-full w-full object-cover transition-opacity duration-500"
        :src="slideMediaUrl"
      />
      <div
        v-if="showOverlay"
        class="absolute inset-0 bg-gradient-to-r from-black/50 via-black/15 to-transparent"
      />
    </div>

    <div class="relative mx-auto flex h-full w-full max-w-screen-2xl items-center px-8 md:px-16">
      <div class="max-w-2xl text-white">
        <h2
          v-if="getSlideTitle(currentSlide)"
          class="mb-8 text-4xl font-black leading-[0.95] tracking-tight md:text-7xl"
        >
          {{ getSlideTitle(currentSlide) }}
        </h2>
        <p v-if="currentSlide?.carouselText" class="mb-8 text-sm leading-relaxed md:text-base">
          {{ currentSlide.carouselText }}
        </p>
        <a
          v-if="currentSlide?.carouselButtonText"
          class="inline-block bg-white px-8 py-4 text-xs font-bold uppercase tracking-[0.24em] text-black transition-colors duration-300 hover:bg-black hover:text-white"
          :href="getSlideTarget(currentSlide)"
        >
          {{ currentSlide.carouselButtonText }}
        </a>
      </div>
    </div>

    <div
      v-if="carouselItems.length > 1"
      class="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 md:px-8"
    >
      <button
        class="pointer-events-auto rounded-full bg-white/90 p-3 text-black transition hover:bg-white hover:cursor-pointer"
        type="button"
        aria-label="Slide anterior"
        @click="goToPrevSlide"
      >
        &#10094;
      </button>
      <button
        class="pointer-events-auto rounded-full bg-white/90 p-3 text-black transition hover:bg-white hover:cursor-pointer"
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
