<script setup lang="ts">
import { computed } from 'vue';
import type { HomeSharedCardBlock } from '../models';

const props = defineProps<{
  block: HomeSharedCardBlock;
}>();

const fallbackImage =
  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80';

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

const buttonHref = computed(() => {
  const slug = getSlugFromRelation(props.block.cardButtonRelationProduct);
  if (slug) return `/tienda/${slug}`;
  return props.block.cardButtonLink || '#';
});

const toAbsoluteMediaUrl = (url?: string) => {
  if (!url) return fallbackImage;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const apiUrl = import.meta.env.VITE_STRAPI_API_URL || 'http://localhost:1337/api';
  const base = apiUrl.replace(/\/api\/?$/, '');
  return `${base}${url}`;
};

const mediaUrl = computed(() => toAbsoluteMediaUrl(props.block.cardMedia?.url));

const isVideoMedia = computed(() => {
  const m = props.block.cardMedia;
  if (!m || typeof m !== 'object') return false;
  const mime = 'mime' in m ? String((m as { mime?: string }).mime ?? '') : '';
  if (mime.startsWith('video/')) return true;
  const url = (m as { url?: string }).url ?? '';
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
});

const isAlignRight = computed(() => props.block.cardAlignment === 'Right');

/** Left: texto primero; Right: media primero (misma lógica en móvil y desktop). */
const textColClass = computed(() => (isAlignRight.value ? 'order-2' : 'order-1'));

const mediaColClass = computed(() => (isAlignRight.value ? 'order-1' : 'order-2'));
</script>

<template>
  <section
    class="w-full py-16 md:py-32"
    :class="block.cardBackground ? 'bg-[#f2f4f6]' : 'bg-white'"
  >
    <div class="mx-auto grid max-w-screen-2xl grid-cols-1 items-center gap-12 px-4 md:grid-cols-2 md:gap-16 md:px-8">
      <div class="max-w-xl" :class="textColClass">
        <p
          v-if="block.cardSpan"
          class="mb-6 text-xs font-bold uppercase tracking-[0.4em] text-slate-400"
        >
          {{ block.cardSpan }}
        </p>
        <h2
          v-if="block.cardTitle"
          class="mb-8 text-4xl font-black leading-[1.1] tracking-tighter md:text-5xl md:text-6xl"
        >
          {{ block.cardTitle }}
        </h2>
        <p
          v-if="block.cardText"
          class="font-body mb-10 text-lg leading-relaxed text-on-surface-variant"
        >
          {{ block.cardText }}
        </p>
        <a
          v-if="block.cardButtonText"
          class="inline-block bg-black px-10 py-5 font-headline text-sm font-bold uppercase tracking-widest text-white transition-colors duration-300 hover:bg-slate-800"
          :href="buttonHref"
        >
          {{ block.cardButtonText }}
        </a>
      </div>

      <div
        class="relative aspect-square overflow-hidden md:aspect-[4/5]"
        :class="mediaColClass"
      >
        <video
          v-if="isVideoMedia"
          class="h-full w-full object-cover"
          :src="mediaUrl"
          autoplay
          muted
          loop
          playsinline
        />
        <img
          v-else
          class="h-full w-full object-cover"
          :src="mediaUrl"
          :alt="block.cardMedia?.alternativeText || block.cardTitle || 'Card media'"
        />
      </div>
    </div>
  </section>
</template>
