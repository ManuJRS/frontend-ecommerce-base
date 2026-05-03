<script setup lang="ts">
import { ref } from 'vue';
import type { HomeSharedNewsletterFormBlock } from '../models';

defineProps<{
  block: HomeSharedNewsletterFormBlock;
}>();

const email = ref('');

function onSubmit() {
  // Integrar con endpoint de newsletter cuando exista en backend
}
</script>

<template>
  <section class="bg-white py-24 md:py-32">
    <div class="mx-auto max-w-4xl px-4 text-center md:px-8">
      <span
        v-if="block.newsletterSpan"
        class="mb-8 block text-sm font-bold uppercase tracking-[0.4em] text-slate-400"
      >
        {{ block.newsletterSpan }}
      </span>
      <h2
        v-if="block.newsletterTitle"
        class="mb-10 text-4xl font-black leading-tight tracking-tighter md:text-5xl md:text-7xl"
      >
        {{ block.newsletterTitle }}
      </h2>
      <form
        class="mx-auto flex max-w-lg flex-col gap-4 md:flex-row"
        @submit.prevent="onSubmit"
      >
        <label class="sr-only" for="newsletter-email">{{ block.newsletterInputText || 'Email' }}</label>
        <input
          id="newsletter-email"
          v-model="email"
          class="flex-1 border-none bg-surface-container-low px-6 py-4 font-body text-sm focus:ring-1 focus:ring-primary"
          name="email"
          type="email"
          autocomplete="email"
          :placeholder="block.newsletterInputText || 'Email'"
          required
        />
        <button
          type="submit"
          class="bg-primary px-8 py-4 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-slate-800"
        >
          {{ block.newsletterButtonText || 'Subscribe' }}
        </button>
      </form>
    </div>
  </section>
</template>
