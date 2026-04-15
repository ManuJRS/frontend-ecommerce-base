<script setup lang="ts">
import { loadStripe, type Stripe, type StripeElements, type StripePaymentElement } from '@stripe/stripe-js';
import { onMounted, ref, watch } from 'vue';

const props = defineProps<{
  clientSecret: string | null;
}>();

const stripeInstance = ref<Stripe | null>(null);
const elementsInstance = ref<StripeElements | null>(null);
const paymentElementInstance = ref<StripePaymentElement | null>(null);
const isLoading = ref(true);
const paymentError = ref<string | null>(null);
const isProcessing = ref(false);

const initializeStripeElements = async () => {
  if (!props.clientSecret || paymentElementInstance.value) return;

  try {
    const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
    stripeInstance.value = await loadStripe(stripePublicKey);

    if (!stripeInstance.value) throw new Error('No se pudo cargar Stripe');

    elementsInstance.value = stripeInstance.value.elements({
      clientSecret: props.clientSecret,
      appearance: { theme: 'stripe' },
    });

    paymentElementInstance.value = elementsInstance.value.create('payment');
    paymentElementInstance.value.mount('#payment-element');
    isLoading.value = false;
  } catch (error) {
    console.error('Error al inicializar los detalles de pago:', error);
    paymentError.value = 'Hubo un problema al cargar el método de pago.';
    isLoading.value = false;
  }
};

watch(
  () => props.clientSecret,
  () => {
    void initializeStripeElements();
  },
  { immediate: true }
);

onMounted(() => {
  void initializeStripeElements();
});

const processStripePayment = async () => {
  if (!stripeInstance.value || !elementsInstance.value) {
    throw new Error('Stripe aún no está listo');
  }

  isProcessing.value = true;
  paymentError.value = null;

  const { error } = await stripeInstance.value.confirmPayment({
    elements: elementsInstance.value,
    confirmParams: {
      return_url: `${window.location.origin}/checkout/success`,
    },
  });

  if (error) {
    paymentError.value = error.message || 'El pago no pudo procesarse.';
    isProcessing.value = false;
    throw error;
  }
};

defineExpose({
  processStripePayment,
});
</script>

<template>
  <section>
    <h2 class="text-2xl font-bold tracking-tight mb-8 text-primary">Payment Details</h2>
    <div class="bg-surface-container-lowest p-8 space-y-8">
      <div class="flex gap-4 pb-4">
        <div class="px-4 py-2 bg-surface-container rounded-sm">
          <span class="material-symbols-outlined align-middle" data-icon="credit_card">
            credit_card
          </span>
          <span class="text-sm font-medium ml-2">Credit Card</span>
        </div>
        <div class="px-4 py-2 bg-surface-container-high rounded-sm opacity-50">
          <span class="material-symbols-outlined align-middle" data-icon="account_balance">
            account_balance
          </span>
          <span class="text-sm font-medium ml-2">Bank Transfer</span>
        </div>
      </div>

      <div v-if="isLoading" class="text-center py-8 text-on-surface-variant animate-pulse">
        Cargando pasarela segura...
      </div>

      <div v-show="!isLoading" class="space-y-6">
        <div class="group">
          <label
            class="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2"
          >
            Card Details
          </label>
          <div
            id="payment-element"
            class="w-full bg-surface-container-highest border-none py-4 px-5 focus-within:bg-white focus-within:ring-1 focus-within:ring-primary/20"
          ></div>
        </div>
      </div>

      <div
        v-if="paymentError"
        class="text-error text-sm font-medium bg-error-container p-3 rounded-md"
      >
        {{ paymentError }}
      </div>
    </div>
  </section>
</template>
