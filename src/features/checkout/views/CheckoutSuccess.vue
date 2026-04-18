<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCartStore } from '@/features/cart/stores/cart.store';
import { API_URL } from '@/shared/config/api';

type ResultKind = 'success' | 'failed' | 'pending' | 'verifying';

const route = useRoute();
const router = useRouter();
const cart = useCartStore();

const result = ref<ResultKind>('pending');
const retryCount = ref(0);
const maxRetries = 5;

const orderId = computed(() => route.query.order_id as string | undefined);

async function verifyOrder() {
  if (!orderId.value) return;
  
  result.value = 'verifying';
  
  try {
    const response = await fetch(`${API_URL}/orders/${orderId.value}`);
    const orderData = await response.json();
    const currentStatus = orderData.data?.status || orderData.data?.attributes?.status;
    if (currentStatus === 'paid') {
      cart.clearCart();
      result.value = 'success';
    } else if (retryCount.value < maxRetries) {
      retryCount.value++;
      setTimeout(verifyOrder, 2000);
    } else {
      determineStatusFromQuery();
    }
  } catch (error) {
    console.error('Error verificando orden:', error);
    determineStatusFromQuery();
  }
}

function determineStatusFromQuery() {
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
}

onMounted(() => {
  const params = route.query;
  const status = params.redirect_status;

  if (status === 'succeeded') {
    cart.clearCart();
    result.value = 'success';
    return;
  }

  if (orderId.value) {
    verifyOrder();
  } else {
    result.value = 'pending';
  }
});

const title = computed(() => {
  if (result.value === 'verifying') return 'Confirmando pago...';
  if (result.value === 'success') return '¡Pago Exitoso!';
  if (result.value === 'failed') return 'No se pudo completar el pago';
  return 'Estamos procesando tu pago';
});

const message = computed(() => {
  if (result.value === 'verifying') {
    return 'Estamos validando con tu banco. Por favor, no cierres esta ventana.';
  }
  if (result.value === 'success') {
    return 'Tu pedido ha sido procesado correctamente.';
  }
  if (result.value === 'failed') {
    return 'El pago no pudo completarse. Puedes volver al carrito e intentar de nuevo.';
  }
  return 'Si acabas de pagar, puede tardar unos instantes en reflejarse.';
});
</script>

<template>
  <main class="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-16 bg-surface-container-highest/30">
    <div class="w-full max-w-lg rounded-2xl bg-surface-container-lowest p-8 shadow-lg text-center">
      
      <div v-if="result === 'verifying'" class="space-y-6">
        <div class="mx-auto flex h-20 w-20 items-center justify-center">
          <span class="material-symbols-outlined text-5xl text-primary animate-spin">sync</span>
        </div>
        <h1 class="text-2xl font-bold text-primary">{{ title }}</h1>
        <p class="text-on-surface-variant">{{ message }}</p>
      </div>

      <div v-else-if="result === 'success'" class="space-y-6">
        <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/15 ring-2 ring-green-500/30">
          <span class="material-symbols-outlined text-5xl text-green-600">check_circle</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-primary">{{ title }}</h1>
        <p class="text-sm sm:text-base text-on-surface-variant leading-relaxed">{{ message }}</p>
      </div>

      <div v-else-if="result === 'failed'" class="space-y-6">
        <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-error-container/40 ring-2 ring-error/20">
          <span class="material-symbols-outlined text-5xl text-error">cancel</span>
        </div>
        <h1 class="text-2xl font-bold text-primary">{{ title }}</h1>
        <p class="text-on-surface-variant">{{ message }}</p>
      </div>

      <div v-else class="space-y-6">
        <div class="mx-auto flex h-20 w-20 items-center justify-center">
          <span class="material-symbols-outlined text-5xl text-on-surface-variant animate-pulse">hourglass_top</span>
        </div>
        <h1 class="text-2xl font-bold text-primary">{{ title }}</h1>
        <p class="text-on-surface-variant">{{ message }}</p>
      </div>

      <div class="mt-10">
        <button @click="router.push('/')" class="w-full sm:w-auto min-w-[200px] inline-flex items-center justify-center rounded-xl bg-primary px-8 py-4 text-sm font-bold uppercase text-on-primary">
          Volver al inicio
        </button>
      </div>

    </div>
  </main>
</template>
