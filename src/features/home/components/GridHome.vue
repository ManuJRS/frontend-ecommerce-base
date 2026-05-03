<script setup lang="ts">
import { computed } from 'vue';
import type { HomeGridBlock, HomeGridManualItem, HomeGridRelationItem } from '../models';

const props = defineProps<{
  block: HomeGridBlock;
}>();

const fallbackImage =
  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1400&q=80';

const isManualMode = computed(() => props.block.gridMode === 'Manual');

const manualItems = computed<HomeGridManualItem[]>(() =>
  Array.isArray(props.block.griManual) ? props.block.griManual : []
);

const relationItems = computed<HomeGridRelationItem[]>(() =>
  Array.isArray(props.block.gridRelation) ? props.block.gridRelation : []
);

const visibleItems = computed(() => (isManualMode.value ? manualItems.value : relationItems.value));
type GridVisibleItem = HomeGridManualItem | HomeGridRelationItem;

const toAbsoluteMediaUrl = (url?: string) => {
  if (!url) return fallbackImage;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const apiUrl = import.meta.env.VITE_STRAPI_API_URL || 'http://localhost:1337/api';
  const base = apiUrl.replace(/\/api\/?$/, '');
  return `${base}${url}`;
};

const isManualItem = (item: GridVisibleItem): item is HomeGridManualItem => 'gridManualImage' in item;

const resolveImage = (item: GridVisibleItem) => {
  if (isManualItem(item)) return toAbsoluteMediaUrl(item.gridManualImage?.url);
  return toAbsoluteMediaUrl(item.categoryImage?.url || item.image?.url);
};

const resolveTitle = (item: GridVisibleItem) => {
  if (isManualItem(item)) return item.gridManualTitle;
  return item.name;
};

const resolveButtonText = (item: GridVisibleItem) => {
  if (isManualItem(item)) {
    return item.gridManualButtonText || props.block.gridRelationButtonText;
  }
  return props.block.gridRelationButtonText;
};

const resolveLink = (item: GridVisibleItem): string => {
  if (isManualItem(item) && item.gridManualButtonLink) return item.gridManualButtonLink;
  if (!isManualItem(item) && item.slug) return `/tienda?category=${encodeURIComponent(item.slug)}`;
  return '#';
};
</script>

<template>
  <section
    class="w-full py-16 md:py-32"
    :class="{ 'bg-[#f2f4f6]': block.gridBackground }"
  >
    <div class="mx-auto max-w-screen-2xl px-4 md:px-8">
      <div class="mb-10 flex flex-col gap-4 md:mb-14 md:flex-row md:items-end md:justify-between">
        <div class="max-w-2xl">
          <h2 class="text-3xl font-black tracking-tight md:text-5xl">
            {{ block.gridTitle || '' }}
          </h2>
          <p v-if="block.girdText" class="mt-4 text-sm leading-relaxed text-on-surface-variant md:text-base">
            {{ block.girdText }}
          </p>
        </div>
        <a
          v-if="block.gridButtonText"
          class="inline-block bg-primary px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-slate-800"
          :href="block.gridButtonLink || '#'"
        >
          {{ block.gridButtonText }}
        </a>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="item in visibleItems"
          :key="item.id"
          class="group relative min-h-[280px] overflow-hidden bg-surface-container-low sm:min-h-[340px]"
        >
          <img
            :src="resolveImage(item)"
            :alt="resolveTitle(item)"
            class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div class="absolute inset-0 bg-black/20 transition-opacity group-hover:bg-black/35" />
          <div class="absolute bottom-6 left-6 right-6 text-white">
            <h3 class="mb-3 text-2xl font-black tracking-tight">
              {{ resolveTitle(item) }}
            </h3>
            <a
              class="text-[10px] font-bold uppercase tracking-[0.2em] border-b border-white/50 pb-1 transition-colors hover:border-white"
              :href="resolveLink(item)"
            >
              {{ resolveButtonText(item) }}
            </a>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
