<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useCartConfigStore } from '@/features/cart/stores/cartConfig.store';

interface CheckoutContactModel {
  email: string;
}

const model = defineModel<CheckoutContactModel>({
  required: true,
});

const cartConfigStore = useCartConfigStore();

const cartPath = computed(() => {
  const slug = cartConfigStore.pageCopy?.slug ?? 'carrito-de-compras';
  return `/${slug}`;
});

onMounted(() => {
  if (!cartConfigStore.loaded) {
    void cartConfigStore.fetchFullCartConfig();
  }
});
</script>

<template>
  <section>
    <nav class="mb-4 text-sm text-on-surface-variant" aria-label="Breadcrumb">
      <router-link :to="cartPath" class="hover:text-primary transition-colors">
        Carrito
      </router-link>
      <span class="mx-2">/</span>
      <span class="text-on-surface">Checkout</span>
    </nav>
    <h2 class="text-2xl font-bold tracking-tight mb-8 text-primary">Contact Information</h2>
    <div class="space-y-6">
      <div class="group">
        <label
          class="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 ml-1"
        >
          Email Address
        </label>
        <input
          class="w-full bg-surface-container-highest border-none py-4 px-5 focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary/20 transition-all duration-300"
          placeholder="curator@atelier.com"
          type="email"
          v-model="model.email"
        />
      </div>
      <div class="flex items-center gap-3 ml-1">
        <input
          id="newsletter"
          class="rounded-sm border-outline-variant text-primary focus:ring-primary"
          type="checkbox"
        />
        <label class="text-sm text-on-surface-variant" for="newsletter">
          Keep me updated with new collections and editorials
        </label>
      </div>
    </div>
  </section>
</template>
