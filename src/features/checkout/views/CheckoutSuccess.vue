<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCartStore } from '@/features/cart/stores/cart.store';

type ResultKind = 'success' | 'failed' | 'pending';

const route = useRoute();
const router = useRouter();
const cart = useCartStore();

const result = ref<ResultKind>('pending');

onMounted(() => {
  const raw = route.query.redirect_status;
  const status = Array.isArray(raw) ? raw[0] : raw;
  if (status === 'succeeded') {
    cart.clearCart();
    result.value = 'success';
  } else if (status === 'failed') {
    result.value = 'failed';
  } else {
    result.value = 'pending';
  }
});

const title = computed(() => {
  if (result.value === 'success') return '¡Pago Exitoso!';
  if (result.value === 'failed') return 'No se pudo completar el pago';
  return 'Estamos procesando tu pago';
});

const message = computed(() => {
  if (result.value === 'success') {
    return 'Tu pedido ha sido procesado correctamente.';
  }
  if (result.value === 'failed') {
    return 'El pago no pudo completarse. Puedes volver al carrito e intentar de nuevo con otro método de pago.';
  }
  return 'Si acabas de pagar, puede tardar unos instantes en reflejarse. Revisa tu correo o el estado del pedido en tu cuenta.';
});

function goHome() {
  void router.push({ name: 'Home' });
}
</script>

<template>
  <main
    class="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 sm:px-6 py-16 sm:py-24 bg-surface-container-highest/30"
  >
    <div
      class="w-full max-w-lg rounded-2xl bg-surface-container-lowest p-8 sm:p-10 shadow-lg border border-outline-variant/10 text-center"
    >
      <!-- Success -->
      <div v-if="result === 'success'" class="space-y-6">
        <div
          class="mx-auto flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-green-500/15 ring-2 ring-green-500/30"
          aria-hidden="true"
        >
          <span class="material-symbols-outlined text-4xl sm:text-5xl text-green-600 dark:text-green-400">
            check_circle
          </span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-primary">
          {{ title }}
        </h1>
        <p class="text-sm sm:text-base text-on-surface-variant leading-relaxed">
          {{ message }}
        </p>
      </div>

      <!-- Failed -->
      <div v-else-if="result === 'failed'" class="space-y-6">
        <div
          class="mx-auto flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-error-container/40 ring-2 ring-error/20"
          aria-hidden="true"
        >
          <span class="material-symbols-outlined text-4xl sm:text-5xl text-error">
            cancel
          </span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-primary">
          {{ title }}
        </h1>
        <p class="text-sm sm:text-base text-on-surface-variant leading-relaxed">
          {{ message }}
        </p>
      </div>

      <!-- Pending / unknown -->
      <div v-else class="space-y-6">
        <div
          class="mx-auto flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-surface-container-high ring-2 ring-outline-variant/30"
          aria-hidden="true"
        >
          <span class="material-symbols-outlined text-4xl sm:text-5xl text-on-surface-variant animate-pulse">
            hourglass_top
          </span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-primary">
          {{ title }}
        </h1>
        <p class="text-sm sm:text-base text-on-surface-variant leading-relaxed">
          {{ message }}
        </p>
      </div>

      <div class="mt-10">
        <button
          type="button"
          class="w-full sm:w-auto min-w-[200px] inline-flex items-center justify-center rounded-xl bg-primary px-8 py-4 text-sm font-bold tracking-widest uppercase text-on-primary shadow-md shadow-primary/20 transition-all hover:opacity-90 active:scale-[0.98]"
          @click="goHome"
        >
          Volver a la tienda
        </button>
      </div>
    </div>
  </main>
</template>
