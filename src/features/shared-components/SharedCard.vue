<script setup lang="ts">
import { computed } from 'vue';
import type { HomeSharedCardBlock } from '@/features/home/models';

const props = defineProps<{
  block?: HomeSharedCardBlock;
  /** Usado por vistas dinámicas que pasan el bloque como `data` */
  data?: Record<string, unknown>;
}>();

const cardBlock = computed(
  () => (props.data ?? props.block ?? {}) as HomeSharedCardBlock
);

const fallbackImage =
  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80';

/** Lee slug en entidades Strapi v4/v5 (producto, página, etc.). */
function pickEntitySlug(entity: unknown): string {
  if (!entity || typeof entity !== 'object') return '';
  const o = entity as Record<string, unknown>;
  const top = o.slug;
  if (typeof top === 'string' && top.trim() !== '') return top.trim();
  const attrs = o.attributes as Record<string, unknown> | undefined;
  const fromAttrs = attrs?.slug;
  if (typeof fromAttrs === 'string' && fromAttrs.trim() !== '') return fromAttrs.trim();
  return '';
}

/**
 * Relación Strapi (producto, página, etc.): objeto plano, `{ data }`, `data[]`,
 * o solo id numérico si no está populada (sin slug usable).
 */
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

  let payload = relation.data;
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

const buttonHref = computed(() => {
  const productSlug = getSlugFromRelation(cardBlock.value.cardButtonRelationProduct);
  if (productSlug) return `/tienda/${productSlug}`;
  const pageSlug = getSlugFromRelation(cardBlock.value.cardButtonRelationPages);
  if (pageSlug) return `/${pageSlug}`;
  return cardBlock.value.cardButtonLink || '#';
});

const toAbsoluteMediaUrl = (url?: string) => {
  if (!url) return fallbackImage;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const apiUrl = import.meta.env.VITE_STRAPI_API_URL || 'http://localhost:1337/api';
  const base = apiUrl.replace(/\/api\/?$/, '');
  return `${base}${url}`;
};

const mediaUrl = computed(() => toAbsoluteMediaUrl(cardBlock.value.cardMedia?.url));

const isVideoMedia = computed(() => {
  const m = cardBlock.value.cardMedia;
  if (!m || typeof m !== 'object') return false;
  const mime = 'mime' in m ? String((m as { mime?: string }).mime ?? '') : '';
  if (mime.startsWith('video/')) return true;
  const url = (m as { url?: string }).url ?? '';
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
});

const isAlignRight = computed(() => cardBlock.value.cardAlignment === 'Right');

/** Left: texto primero; Right: media primero (misma lógica en móvil y desktop). */
const textColClass = computed(() => (isAlignRight.value ? 'order-2' : 'order-1'));

const mediaColClass = computed(() => (isAlignRight.value ? 'order-1' : 'order-2'));
</script>

<template>
  <section
    class="w-full py-16 md:py-32"
    :class="cardBlock.cardBackground ? 'bg-[#f2f4f6]' : 'bg-white'"
  >
    <div class="mx-auto grid max-w-screen-2xl grid-cols-1 items-center gap-12 px-4 md:grid-cols-2 md:gap-16 md:px-8">
      <div class="max-w-xl" :class="textColClass">
        <p
          v-if="cardBlock.cardSpan"
          class="mb-6 text-xs font-bold uppercase tracking-[0.4em] text-slate-400"
        >
          {{ cardBlock.cardSpan }}
        </p>
        <h2
          v-if="cardBlock.cardTitle"
          class="mb-8 text-4xl font-black leading-[1.1] tracking-tighter md:text-5xl md:text-6xl"
        >
          {{ cardBlock.cardTitle }}
        </h2>
        <p
          v-if="cardBlock.cardText"
          class="font-body mb-10 text-lg leading-relaxed text-on-surface-variant"
        >
          {{ cardBlock.cardText }}
        </p>
        <a
          v-if="cardBlock.cardButtonText"
          class="inline-block bg-black px-10 py-5 font-headline text-sm font-bold uppercase tracking-widest text-white transition-colors duration-300 hover:bg-slate-800"
          :href="buttonHref"
        >
          {{ cardBlock.cardButtonText }}
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
          :alt="cardBlock.cardMedia?.alternativeText || cardBlock.cardTitle || 'Card media'"
        />
      </div>
    </div>
  </section>
</template>
