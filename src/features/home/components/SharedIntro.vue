<script setup lang="ts">
import { computed } from 'vue';
import type { HomeSharedIntroBlock } from '../models';

const props = defineProps<{
  block: HomeSharedIntroBlock;
}>();

const outerClass = computed(() =>
  props.block.introBackground ? 'bg-[#f2f4f6]' : 'bg-white'
);

const paddingYClass = computed(() => {
  const mode = props.block.introPaddingY ?? 'double';
  return mode === 'normal' ? 'md:py-16' : 'md:py-32';
});

const innerAlignClass = computed(() => {
  switch (props.block.introAlignment) {
    case 'Center':
      return 'items-center text-center';
    case 'Right':
      return 'items-end text-right';
    default:
      return 'items-start text-left';
  }
});

const contentWrapperClass = computed(() => {
  switch (props.block.introAlignment) {
    case 'Center':
      return 'mx-auto';
    case 'Right':
      return 'ml-auto';
    default:
      return '';
  }
});

const buttonHref = computed(() => props.block.introButtonLink || '#');
</script>

<template>
  <section class="w-full py-16" :class="[outerClass, paddingYClass]">
    <div class="mx-auto flex max-w-screen-2xl flex-col px-4 md:px-8" :class="innerAlignClass">
      <div class="flex max-w-3xl flex-col" :class="contentWrapperClass">
        <span
          v-if="block.introSpan"
          class="mb-6 block text-[10px] font-bold uppercase tracking-[0.4em] text-on-surface-variant"
        >
          {{ block.introSpan }}
        </span>
        <h2
          v-if="block.introTitle"
          class="font-headline mb-8 text-4xl font-black leading-tight tracking-tighter md:text-5xl md:text-6xl"
        >
          {{ block.introTitle }}
        </h2>
        <p
          v-if="block.introText"
          class="font-body mb-10 text-lg leading-relaxed text-on-surface-variant"
        >
          {{ block.introText }}
        </p>
        <div v-if="block.introButtonText" class="pt-4">
          <a
            class="border-b-2 border-primary pb-2 text-xs font-bold uppercase tracking-widest transition-colors hover:text-on-primary-container"
            :href="buttonHref"
          >
            {{ block.introButtonText }}
          </a>
        </div>
      </div>
    </div>
  </section>
</template>
