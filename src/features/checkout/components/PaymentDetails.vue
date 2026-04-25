<script setup lang="ts">
import { loadStripe, type Stripe, type StripeElements, type StripePaymentElement } from '@stripe/stripe-js';
import { computed, ref, watch } from 'vue';
import { renderProductDescriptionMarkdown } from '@/features/products/utils/renderProductMarkdown';

type PaymentMethod = 'stripe' | 'transfer';

const props = defineProps<{
  clientSecret: string | null;
  bankDetails?: string;
  bankTransferTitle?: string;
  allowBankTransfer?: boolean;
  stripeReturnUrl?: string | null;
  isPrefetchingIntent?: boolean;
}>();

const selectedMethod = defineModel<PaymentMethod>('selectedMethod', {
  default: 'stripe',
});

const stripeInstance = ref<Stripe | null>(null);
const elementsInstance = ref<StripeElements | null>(null);
const paymentElementInstance = ref<StripePaymentElement | null>(null);
const isLoading = ref(true);
const paymentError = ref<string | null>(null);
const isProcessing = ref(false);
const bankDetailsHtml = computed(() => {
  const raw = props.bankDetails;
  if (!raw || !String(raw).trim()) return '';
  return renderProductDescriptionMarkdown(raw);
});
const canUseBankTransfer = computed(() => props.allowBankTransfer !== false);

function destroyStripeElements() {
  try {
    paymentElementInstance.value?.unmount();
  } catch {
    /* ignore */
  }
  paymentElementInstance.value = null;
  elementsInstance.value = null;
  stripeInstance.value = null;
}

const initializeStripeElements = async () => {
  if (selectedMethod.value !== 'stripe') {
    destroyStripeElements();
    isLoading.value = false;
    return;
  }
  if (!props.clientSecret) {
    destroyStripeElements();
    isLoading.value = false;
    return;
  }

  try {
    isLoading.value = true;
    paymentError.value = null;
    destroyStripeElements();

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
  () => [props.clientSecret, selectedMethod.value],
  () => {
    void initializeStripeElements();
  },
  { immediate: true }
);

watch(
  () => canUseBankTransfer.value,
  (enabled) => {
    if (!enabled && selectedMethod.value !== 'stripe') {
      selectedMethod.value = 'stripe';
    }
  },
  { immediate: true }
);

const processStripePayment = async () => {
  if (!stripeInstance.value || !elementsInstance.value) {
    throw new Error('Stripe aún no está listo');
  }

  isProcessing.value = true;
  paymentError.value = null;

  const returnUrl =
    props.stripeReturnUrl?.trim() ||
    `${window.location.origin}/checkout/success`;

  const { error } = await stripeInstance.value.confirmPayment({
    elements: elementsInstance.value,
    confirmParams: {
      return_url: returnUrl,
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
        <button
          type="button"
          class="px-4 py-2 rounded-sm transition-all duration-200"
          :class="
            [
              !canUseBankTransfer ? 'w-full justify-center' : '',
              selectedMethod === 'stripe'
                ? 'opacity-100 bg-surface-container-high'
                : 'opacity-50 bg-surface-container',
            ]
          "
          @click="selectedMethod = 'stripe'"
        >
          <span class="material-symbols-outlined align-middle" data-icon="credit_card">
            credit_card
          </span>
          <span class="text-sm font-medium ml-2">Credit Card</span>
        </button>
        <button
          v-if="canUseBankTransfer"
          type="button"
          class="px-4 py-2 rounded-sm transition-all duration-200"
          :class="
            selectedMethod === 'transfer'
              ? 'opacity-100 bg-surface-container-high'
              : 'opacity-50 bg-surface-container'
          "
          @click="selectedMethod = 'transfer'"
        >
          <span class="material-symbols-outlined align-middle" data-icon="account_balance">
            account_balance
          </span>
          <span class="text-sm font-medium ml-2">{{ props.bankTransferTitle || 'Bank Transfer' }}</span>
        </button>
      </div>

      <div
        v-if="
          selectedMethod === 'stripe' &&
          ((!clientSecret && props.isPrefetchingIntent) || (clientSecret && isLoading))
        "
        class="text-center py-8 text-on-surface-variant animate-pulse"
      >
        Cargando pasarela segura...
      </div>

      <div v-show="selectedMethod === 'stripe' && clientSecret && !isLoading" class="space-y-6">
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
        v-if="selectedMethod === 'transfer'"
        class="rounded-xl border border-outline-variant/40 bg-surface-container-high p-4 text-sm text-on-surface"
      >
        <p class="text-xs uppercase tracking-widest text-on-surface-variant mb-2">Datos bancarios</p>
        <div
          v-if="bankDetailsHtml"
          class="prose prose-sm max-w-none prose-p:my-1"
          v-html="bankDetailsHtml"
        />
        <p v-else class="text-on-surface-variant">
          Te compartiremos los datos bancarios al confirmar la orden.
        </p>
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
