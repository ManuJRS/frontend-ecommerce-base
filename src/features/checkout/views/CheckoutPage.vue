<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { fetchPaymentIntent, updateOrderAddress, type PaymentIntentItemPayload } from '@/core/api';
import type { ShippingMethodOption } from '@/features/cart/models';
import { useCartStore } from '@/features/cart/stores/cart.store';
import { useCartConfigStore } from '@/features/cart/stores/cartConfig.store';
import ContactInformationSection from '@/features/checkout/components/ContactInformationSection.vue';
import ShippingAddressSection from '@/features/checkout/components/ShippingAddressSection.vue';
import ShippingMethodSection from '@/features/checkout/components/ShippingMethodSection.vue';
import OrderSummaryCard from '@/features/checkout/components/OrderSummaryCard.vue';
import CheckoutTrustIndicators from '@/features/checkout/components/CheckoutTrustIndicators.vue';
import PaymentDetails from '@/features/checkout/components/PaymentDetails.vue';

type PaymentDetailsExposed = {
  processStripePayment: () => Promise<void>;
};

interface CheckoutContactForm {
  email: string;
  marketingOptIn: boolean;
}

interface CheckoutShippingForm {
  firstName: string;
  lastName: string;
  address: string;
  country: string;
  phone: string;
  city: string;
  postalCode: string;
  deliveryInstructions: string;
}

interface CheckoutFormModel {
  contact: CheckoutContactForm;
  shipping: CheckoutShippingForm;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clientSecret = ref<string | null>(null);
const orderDocumentId = ref<string | null>(null);
/** Carga al preparar PaymentIntent (Continuar al pago), no en el montaje de la página. */
const isLoadingSecret = ref(false);
const checkoutError = ref<string | null>(null);
const isSubmitting = ref(false);
const paymentComponentRef = ref<PaymentDetailsExposed | null>(null);
const phase1FormRef = ref<HTMLFormElement | null>(null);
/** Fase 2: datos enviados al backend y Stripe listo. */
const isFormValidAndSubmitted = ref(false);

const checkoutForm = reactive<CheckoutFormModel>({
  contact: {
    email: '',
    marketingOptIn: false,
  },
  shipping: {
    firstName: '',
    lastName: '',
    address: '',
    country: '',
    phone: '',
    city: '',
    postalCode: '',
    deliveryInstructions: '',
  },
});
const cart = useCartStore();
const cartConfig = useCartConfigStore();
const { items, subtotal } = storeToRefs(cart);
const { checkoutCopy, pageCopy } = storeToRefs(cartConfig);

/** Sincronizado con `ShippingMethodSection` (método elegido y costo). */
const selectedShippingMethod = ref<ShippingMethodOption | null>(null);

const shippingValue = computed(() => {
  const m = selectedShippingMethod.value;
  if (!m) {
    const c = checkoutCopy.value;
    return (c?.fallbackShippingText ?? '').trim() || 'Se calcula después...';
  }
  return m.label;
});

const isFallbackShipping = computed(() => {
  const m = selectedShippingMethod.value;
  return !m || m.id === 'fallback';
});

const shippingAmount = computed(() => selectedShippingMethod.value?.cost ?? 0);

const estimatedTax = computed(() => {
  const pct = pageCopy.value?.taxAmount ?? 0;
  const taxableBase = subtotal.value + (isFallbackShipping.value ? 0 : shippingAmount.value);
  return taxableBase * (pct / 100);
});

const totalAfterTax = computed(() => {
  const ship = isFallbackShipping.value ? 0 : shippingAmount.value;
  return subtotal.value + estimatedTax.value + ship;
});

const isCheckoutFormComplete = computed(() => {
  return (
    !!checkoutForm.contact.email.trim() &&
    !!checkoutForm.shipping.firstName.trim() &&
    !!checkoutForm.shipping.lastName.trim() &&
    !!checkoutForm.shipping.address.trim() &&
    !!checkoutForm.shipping.country.trim() &&
    !!checkoutForm.shipping.phone.trim() &&
    !!checkoutForm.shipping.city.trim() &&
    !!checkoutForm.shipping.postalCode.trim()
  );
});

function mapCartItemsToPaymentIntentPayload(): PaymentIntentItemPayload[] {
  return items.value.map((line) => {
    const documentId = line.product.documentId;
    if (typeof documentId !== 'string' || !documentId.trim()) {
      throw new Error('Hay productos sin documentId válido para procesar el pago');
    }

    return {
      documentId,
      quantity: line.quantity,
    };
  });
}

function buildCheckoutSnapshot(itemsPayload: PaymentIntentItemPayload[], zipCode: string): string {
  return JSON.stringify({
    items: itemsPayload,
    zipCode,
    contact: checkoutForm.contact,
    shipping: checkoutForm.shipping,
  });
}

async function handleContinueToPayment() {
  checkoutError.value = null;

  if (items.value.length === 0) {
    checkoutError.value = 'Tu carrito está vacío.';
    return;
  }

  const formEl = phase1FormRef.value;
  if (formEl && !formEl.checkValidity()) {
    formEl.reportValidity();
    return;
  }

  if (!isCheckoutFormComplete.value) {
    checkoutError.value = 'Completa todos los campos obligatorios.';
    return;
  }

  const email = checkoutForm.contact.email.trim();
  if (!EMAIL_REGEX.test(email)) {
    checkoutError.value = 'Ingresa un correo electrónico válido.';
    return;
  }

  if (!selectedShippingMethod.value) {
    checkoutError.value = 'Selecciona un método de envío.';
    return;
  }

  isLoadingSecret.value = true;

  try {
    await cartConfig.fetchFullCartConfig();

    const itemsToBuy = mapCartItemsToPaymentIntentPayload();
    const zipCode = checkoutForm.shipping.postalCode.trim();
    const snapshot = buildCheckoutSnapshot(itemsToBuy, zipCode);

    if (
      cart.activeClientSecret &&
      cart.activeOrderDocumentId &&
      cart.lastCheckoutSnapshot === snapshot
    ) {
      clientSecret.value = cart.activeClientSecret;
      orderDocumentId.value = cart.activeOrderDocumentId;
    } else {
      const payload = await fetchPaymentIntent({
        items: itemsToBuy,
        zipCode,
        contact: { ...checkoutForm.contact },
        shippingAddress: { ...checkoutForm.shipping, zipCode },
      });
      clientSecret.value = payload.clientSecret;
      orderDocumentId.value = payload.documentId;
      cart.setCheckoutSession(payload.clientSecret, payload.documentId, snapshot);
    }

    isFormValidAndSubmitted.value = true;
  } catch (error) {
    console.error('Error al preparar checkout:', error);
    checkoutError.value = 'No se pudo inicializar el pago. Intenta nuevamente.';
  } finally {
    isLoadingSecret.value = false;
  }
}

const handleCheckoutSubmit = async () => {
  if (!isFormValidAndSubmitted.value) return;
  if (!paymentComponentRef.value || !clientSecret.value) return;

  if (
    !checkoutForm.contact.email.trim() ||
    !checkoutForm.shipping.firstName.trim() ||
    !checkoutForm.shipping.address.trim() ||
    !checkoutForm.shipping.city.trim() ||
    !checkoutForm.shipping.postalCode.trim()
  ) {
    checkoutError.value = 'Completa email, nombre, dirección, ciudad y código postal para continuar.';
    return;
  }

  if (!orderDocumentId.value) {
    checkoutError.value = 'No se pudo identificar la orden. Recarga la página e intenta de nuevo.';
    return;
  }

  isSubmitting.value = true;
  checkoutError.value = null;

  try {
    await updateOrderAddress(orderDocumentId.value, checkoutForm);
  } catch (error) {
    console.error('Error al actualizar la dirección de envío:', error);
    checkoutError.value = 'No se pudo guardar la dirección de envío. Intenta de nuevo.';
    isSubmitting.value = false;
    return;
  }

  try {
    await paymentComponentRef.value.processStripePayment();
  } catch (error) {
    console.error('Error al procesar el pago:', error);
    checkoutError.value = 'No se pudo completar el pago.';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <main class="pt-32 pb-24 px-8 max-w-screen-2xl mx-auto">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-16">
      <div class="lg:col-span-7 space-y-20">
        <!-- Pasos (alineado con src/mock/steps.html): encima del bloque de información -->
        <nav
          class="flex items-center gap-6 text-[10px] font-label uppercase tracking-[0.2em] text-on-surface-variant"
          aria-label="Pasos del checkout"
        >
          <div
            class="flex items-center gap-2 transition-colors"
            :class="
              !isFormValidAndSubmitted ? 'text-primary font-bold' : 'text-on-surface-variant'
            "
          >
            <span>01</span>
            <span>Information</span>
          </div>
          <div class="w-8 h-px bg-outline-variant/30" aria-hidden="true" />
          <div
            class="flex items-center gap-2 transition-colors"
            :class="
              isFormValidAndSubmitted ? 'text-primary font-bold' : 'text-on-surface-variant'
            "
          >
            <span>02</span>
            <span>Payment</span>
          </div>
        </nav>

        <form
          v-if="!isFormValidAndSubmitted"
          ref="phase1FormRef"
          class="space-y-20"
          @submit.prevent="handleContinueToPayment"
        >
          <ContactInformationSection v-model="checkoutForm.contact" />
          <ShippingAddressSection v-model="checkoutForm.shipping" />
          <ShippingMethodSection
            v-model:selected-shipping-method="selectedShippingMethod"
            :postal-code="checkoutForm.shipping.postalCode"
          />

          <div class="space-y-4">
            <button
              type="submit"
              class="w-full py-6 bg-primary text-on-primary font-bold tracking-widest uppercase text-sm hover:opacity-90 transition-opacity active:scale-[0.98] duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="isLoadingSecret"
            >
              {{ isLoadingSecret ? 'Preparando pago...' : 'Continuar al Pago' }}
            </button>
            <p
              v-if="isLoadingSecret"
              class="text-sm text-on-surface-variant"
            >
              Enviando datos y preparando el pago seguro...
            </p>
          </div>
        </form>

        <div v-if="isFormValidAndSubmitted" class="space-y-6">
          <PaymentDetails
            v-if="clientSecret"
            ref="paymentComponentRef"
            :client-secret="clientSecret"
          />

          <div
            v-if="checkoutError"
            class="text-error text-sm font-medium bg-error-container p-3 rounded-md"
          >
            {{ checkoutError }}
          </div>

          <button
            type="button"
            :disabled="isSubmitting || !clientSecret || !isFormValidAndSubmitted"
            class="w-full py-6 bg-primary text-on-primary font-bold tracking-widest uppercase text-sm hover:opacity-90 transition-opacity active:scale-[0.98] duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="handleCheckoutSubmit"
          >
            {{ isSubmitting ? 'Procesando...' : 'Complete Purchase' }}
          </button>
        </div>

        <div
          v-if="checkoutError && !isFormValidAndSubmitted"
          class="text-error text-sm font-medium bg-error-container p-3 rounded-md"
        >
          {{ checkoutError }}
        </div>
      </div>

      <div class="lg:col-span-5">
        <div class="sticky top-32 space-y-8">
          <OrderSummaryCard
            :items="items"
            :subtotal="subtotal"
            :shipping-value="shippingValue"
            :estimated-tax="estimatedTax"
            :total-after-tax="totalAfterTax"
            :subtotal-label="pageCopy?.summarySubtotalText"
            :shipping-label="pageCopy?.shippingRowLabel"
            :tax-label="pageCopy?.summaryTaxText"
            :is-fallback-shipping="isFallbackShipping"
            :fallback-shipping-warning="checkoutCopy?.fallbackShippingWarning"
          />
          <CheckoutTrustIndicators />
        </div>
      </div>
    </div>
  </main>
</template>
