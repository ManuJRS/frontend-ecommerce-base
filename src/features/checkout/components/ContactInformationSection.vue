<script setup lang="ts">
import { computed } from 'vue';
import { useCartConfigStore } from '@/features/cart/stores/cartConfig.store';

interface CheckoutContactModel {
  email: string;
  marketingOptIn: boolean;
}

const props = defineProps<{
  disabled?: boolean;
}>();

const model = defineModel<CheckoutContactModel>({
  required: true,
});

const cartConfigStore = useCartConfigStore();

const cartPath = computed(() => {
  const slug = cartConfigStore.pageCopy?.slug ?? 'carrito-de-compras';
  return `/${slug}`;
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hasEmailFormatError = computed(() => {
  const email = model.value.email.trim();
  return email.length > 0 && !EMAIL_REGEX.test(email);
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
          Email Address <span class="text-error">*</span>
        </label>
        <input
          class="w-full bg-surface-container-highest border-none py-4 px-5 focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary/20 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
          :class="hasEmailFormatError ? 'ring-1 ring-error/60' : ''"
          placeholder="curator@atelier.com"
          type="email"
          v-model="model.email"
          required
          :disabled="props.disabled"
          :aria-invalid="hasEmailFormatError"
        />
        <p v-if="hasEmailFormatError" class="mt-2 ml-1 text-xs text-error">
          Ingresa un correo electronico valido (ejemplo@dominio.com)
        </p>
      </div>
      <div class="flex items-center gap-3 ml-1">
        <input
          id="newsletter"
          class="rounded-sm border-outline-variant text-primary focus:ring-primary disabled:opacity-60"
          type="checkbox"
          v-model="model.marketingOptIn"
          :disabled="props.disabled"
        />
        <label class="text-sm text-on-surface-variant" for="newsletter">
          Keep me updated with new collections and editorials
        </label>
      </div>
    </div>
  </section>
</template>
