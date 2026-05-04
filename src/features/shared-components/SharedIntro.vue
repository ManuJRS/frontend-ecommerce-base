<script setup lang="ts">
import { computed } from 'vue';
import type { HomeSharedIntroBlock } from '@/features/home/models';
import { resolveStrapiMediaUrl } from '@/shared/utils/strapiMedia';

const props = defineProps<{
  block?: HomeSharedIntroBlock;
  data?: Record<string, unknown>;
}>();

const introData = computed(() => (props.data ?? props.block ?? {}) as HomeSharedIntroBlock);

const outerClass = computed(() =>
  introData.value.introBackground ? 'bg-[#f2f4f6]' : 'bg-white'
);

const paddingYClass = computed(() => {
  const mode = introData.value.introPaddingY ?? 'double';
  return mode === 'normal' ? 'md:py-16' : 'md:py-32';
});

const innerAlignClass = computed(() => {
  switch (introData.value.introAlignment) {
    case 'Center':
      return 'items-center text-center';
    case 'Right':
      return 'items-end text-right';
    default:
      return 'items-start text-left';
  }
});

const contentWrapperClass = computed(() => {
  switch (introData.value.introAlignment) {
    case 'Center':
      return 'mx-auto';
    case 'Right':
      return 'ml-auto';
    default:
      return '';
  }
});

const buttonHref = computed(() => introData.value.introButtonLink || '#');

// Preparado para futuros bloques con media en Strapi.
const introImageUrl = computed(() => {
  const media = (introData.value as Record<string, unknown>).introImage;
  if (media && typeof media === 'object' && 'url' in media) {
    return resolveStrapiMediaUrl(String((media as { url?: string }).url ?? ''));
  }
  return '';
});
</script>

<template>
  <section class="w-full py-16" :class="[outerClass, paddingYClass]">
    <div class="mx-auto flex max-w-screen-2xl flex-col px-4 md:px-8" :class="innerAlignClass">
      <div class="flex max-w-3xl flex-col" :class="contentWrapperClass">
        <span
          v-if="introData.introSpan"
          class="mb-6 block text-[10px] font-bold uppercase tracking-[0.4em] text-on-surface-variant"
        >
          {{ introData.introSpan }}
        </span>
        <h1
          v-if="introData.introTitle"
          class="font-headline mb-8 text-4xl font-black leading-tight tracking-tighter md:text-5xl md:text-6xl"
        >
          {{ introData.introTitle }}
        </h1>
        <p
          v-if="introData.introText"
          class="font-body mb-10 text-lg leading-relaxed text-on-surface-variant"
        >
          {{ introData.introText }}
        </p>
        <div v-if="introData.introButtonText" class="pt-4">
          <a
            class="border-b-2 border-primary pb-2 text-xs font-bold uppercase tracking-widest transition-colors hover:text-on-primary-container"
            :href="buttonHref"
          >
            {{ introData.introButtonText }}
          </a>
        </div>

        <img
          v-if="introImageUrl"
          :src="introImageUrl"
          alt=""
          class="mt-8 h-auto w-full max-w-3xl rounded-md object-cover"
        />
      </div>
    </div>
  </section>
</template>
