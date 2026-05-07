<script setup lang="ts">
import { computed } from 'vue';
import type { SharedMapBlock } from '@/features/shared-components/models';

const props = defineProps<{
  block?: SharedMapBlock;
  data?: Record<string, unknown>;
}>();

const mapBlock = computed(() => (props.data ?? props.block ?? {}) as SharedMapBlock);

const showMap = computed(() => {
  const raw = mapBlock.value.iframe;
  return raw != null && String(raw).trim() !== '';
});

const iframeRaw = computed(() => String(mapBlock.value.iframe ?? '').trim());

/** Snippet HTML que incluye `<iframe>...</iframe>` desde Strapi. */
const iframeIsEmbedHtml = computed(() => iframeRaw.value.toLowerCase().startsWith('<iframe'));

const contactRows = computed(() =>
  Array.isArray(mapBlock.value.contactItems) ? mapBlock.value.contactItems : []
);

const scheduleRows = computed(() =>
  Array.isArray(mapBlock.value.scheduleItems) ? mapBlock.value.scheduleItems : []
);
</script>

<template>
  <section
    class="w-full py-16 md:py-32"
    :class="mapBlock.background ? 'bg-[#f2f4f6]' : 'bg-white'"
  >
    <div class="mx-auto max-w-screen-2xl px-8">
      <div
        class="grid grid-cols-1 items-center gap-16"
        :class="showMap ? 'md:grid-cols-2' : ''"
      >
        <!-- Mapa: solo si hay iframe -->
        <div
          v-if="showMap"
          class="relative aspect-[16/9] overflow-hidden bg-surface-container-highest md:aspect-square"
        >
          <div
            v-if="iframeIsEmbedHtml"
            class="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0"
            v-html="iframeRaw"
          />
          <iframe
            v-else
            class="absolute inset-0 h-full w-full border-0"
            :src="iframeRaw"
            title="Map"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
          />
        </div>

        <div class="flex flex-col">
          <span
            v-if="mapBlock.span"
            class="mb-6 text-xs font-bold uppercase tracking-[0.4em] text-on-surface-variant"
          >
            {{ mapBlock.span }}
          </span>
          <h2
            v-if="mapBlock.title"
            class="mb-10 text-5xl font-black tracking-tighter"
          >
            {{ mapBlock.title }}
          </h2>

          <div class="grid grid-cols-1 gap-12 sm:grid-cols-2">
            <div class="space-y-6">
              <div v-if="mapBlock.locationTitle || mapBlock.locationDescription">
                <p
                  v-if="mapBlock.locationTitle"
                  class="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant"
                >
                  {{ mapBlock.locationTitle }}
                </p>
                <p
                  v-if="mapBlock.locationDescription"
                  class="text-sm leading-relaxed whitespace-pre-line"
                >
                  {{ mapBlock.locationDescription }}
                </p>
              </div>

              <div v-if="mapBlock.contactTitle || contactRows.length">
                <p
                  v-if="mapBlock.contactTitle"
                  class="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant"
                >
                  {{ mapBlock.contactTitle }}
                </p>
                <template v-for="row in contactRows" :key="row.id">
                  <p v-if="row.item" class="text-sm">
                    {{ row.item }}
                  </p>
                </template>
              </div>
            </div>

            <div class="space-y-6">
              <div v-if="mapBlock.scheduleTitle || scheduleRows.length">
                <p
                  v-if="mapBlock.scheduleTitle"
                  class="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant"
                >
                  {{ mapBlock.scheduleTitle }}
                </p>
                <div class="space-y-3">
                  <div
                    v-for="row in scheduleRows"
                    :key="row.id"
                    class="flex justify-between "
                  >
                    <span class="text-sm">{{ row.days }}</span>
                    <span class="text-sm font-bold">{{ row.hours }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
