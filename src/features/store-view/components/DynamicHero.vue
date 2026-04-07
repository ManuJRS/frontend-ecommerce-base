<script setup lang="ts">
import { ref } from 'vue';
import type { StoreViewBlock } from '../models';

defineProps<{
  block: StoreViewBlock;
}>();

const carouselRef = ref<HTMLElement | null>(null);
const activeIndex = ref(0);

const scrollLeft = () => {
  if (!carouselRef.value) return;
  const width = carouselRef.value.clientWidth;
  carouselRef.value.scrollBy({ left: -width, behavior: 'smooth' });
};

const scrollRight = () => {
  if (!carouselRef.value) return;
  const width = carouselRef.value.clientWidth;
  carouselRef.value.scrollBy({ left: width, behavior: 'smooth' });
};

const handleScroll = () => {
  if (!carouselRef.value) return;
  const scrollPosition = carouselRef.value.scrollLeft;
  const width = carouselRef.value.clientWidth;
  // gap size approx 16px (gap-4) plus width, though rough math works for snaps
  activeIndex.value = Math.round(scrollPosition / width);
};

const scrollToImage = (index: number | string) => {
  if (!carouselRef.value) return;
  const width = carouselRef.value.clientWidth;
  carouselRef.value.scrollTo({ left: width * Number(index), behavior: 'smooth' });
};

const isDragging = ref(false);
const startX = ref(0);
const scrollLeftAmount = ref(0);

const handleMouseDown = (e: MouseEvent) => {
  if (!carouselRef.value) return;
  isDragging.value = true;
  carouselRef.value.classList.remove('snap-mandatory');
  carouselRef.value.classList.add('cursor-grabbing');
  startX.value = e.pageX - carouselRef.value.offsetLeft;
  scrollLeftAmount.value = carouselRef.value.scrollLeft;
};

const handleMouseLeave = () => {
  isDragging.value = false;
  if(carouselRef.value) {
    carouselRef.value.classList.add('snap-mandatory');
    carouselRef.value.classList.remove('cursor-grabbing');
  }
};

const handleMouseUp = () => {
  isDragging.value = false;
  if(carouselRef.value) {
    carouselRef.value.classList.add('snap-mandatory');
    carouselRef.value.classList.remove('cursor-grabbing');
  }
};

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value || !carouselRef.value) return;
  e.preventDefault();
  const x = e.pageX - carouselRef.value.offsetLeft;
  const walk = (x - startX.value) * 2; 
  carouselRef.value.scrollLeft = scrollLeftAmount.value - walk;
};
</script>

<template>
  <div class="flex-1 md:px-12 px-4 py-8 bg-new-surface-bg">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div class="lg:col-span-5 space-y-8">
            <div class="flex flex-wrap gap-2" v-if="block.tags && block.tags.length > 0">
                <span v-for="tag in block.tags" :key="tag.id"
                    class="text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 border border-primary/20 bg-white text-primary">{{ tag.name }}</span>
            </div>
            <div>
                <h1 v-if="block.title" class="text-6xl font-black tracking-tighter mb-6 leading-[0.9]">{{ block.title }}</h1>
                <p v-if="block.description" class="text-on-surface-variant text-sm leading-relaxed max-w-md">{{ block.description }}</p>
            </div>
            <div class="flex items-center gap-6 pt-4">
                <a v-if="block.buttonFullText"
                   :href="block.buttonFullUrl || '#'"
                   class="bg-primary text-on-primary px-10 py-4 text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-slate-800 transition-all duration-300 inline-block text-center">{{ block.buttonFullText }}</a>
                <a v-if="block.buttonOutlineText"
                   :href="block.buttonOutlineUrl || '#'"
                   class="border border-outline-variant px-10 py-4 text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-surface-container-highest transition-all duration-300 inline-block text-center">{{ block.buttonOutlineText }}</a>
            </div>
        </div>
        <div class="lg:col-span-7 relative" v-if="block.media && block.media.length > 0">
            <div ref="carouselRef" @scroll="handleScroll" 
                 @mousedown="handleMouseDown"
                 @mouseleave="handleMouseLeave"
                 @mouseup="handleMouseUp"
                 @mousemove="handleMouseMove"
                 class="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-4 rounded-xl cursor-grab select-none">
                <div v-for="(image, index) in block.media" :key="image.id || index"
                    class="hero-carousel-item flex-none w-full aspect-[16/9] bg-surface-container overflow-hidden rounded-xl">
                    <img :alt="image.alternativeText || 'Hero Carousel Image'"
                        class="w-full h-full object-cover pointer-events-none"
                        draggable="false"
                        :src="image.url" />
                </div>
            </div>
            <!-- Carousel Indicators -->
            <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                <button v-for="(image, index) in block.media" :key="`indicator-${image.id || index}`"
                     @click="scrollToImage(index)"
                     :class="[ 'w-12 h-0.5 transition-colors duration-300 cursor-pointer', index === activeIndex ? 'bg-primary' : 'bg-primary/20' ]"></button>
            </div>
            <!-- Carousel Nav -->
            <div v-if="block.media.length > 1"
                class="absolute top-1/2 -translate-y-1/2 -left-2 -right-2 md:-left-6 md:-right-6 flex justify-between pointer-events-none">
                <button
                    @click="scrollLeft"
                    class="w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center pointer-events-auto hover:bg-slate-50 transition-colors hover:cursor-pointer">
                    <span class="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                <button
                    @click="scrollRight"
                    class="w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center pointer-events-auto hover:bg-slate-50 transition-colors hover:cursor-pointer">
                    <span class="material-symbols-outlined text-sm">chevron_right</span>
                </button>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
</style>
