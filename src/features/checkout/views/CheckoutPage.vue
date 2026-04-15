<script setup lang="ts">
import { computed, onMounted, reactive, ref, toRaw } from 'vue';
import { storeToRefs } from 'pinia';
import { fetchPaymentIntent, updateOrderAddress, type PaymentIntentItemPayload } from '@/core/api';
import { useCartStore } from '@/features/cart/stores/cart.store';
import { useCartConfigStore } from '@/features/cart/stores/cartConfig.store';
import { resolveShippingDisplayText } from '@/features/cart/utils/checkoutShipping';
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
}

interface CheckoutShippingForm {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postalCode: string;
}

interface CheckoutFormModel {
  contact: CheckoutContactForm;
  shipping: CheckoutShippingForm;
}

const clientSecret = ref<string | null>(null);
const orderDocumentId = ref<string | null>(null);
const isLoadingSecret = ref(true);
const checkoutError = ref<string | null>(null);
const isSubmitting = ref(false);
const paymentComponentRef = ref<PaymentDetailsExposed | null>(null);
const checkoutForm = reactive<CheckoutFormModel>({
  contact: {
    email: '',
  },
  shipping: {
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    postalCode: '',
  },
});
const cart = useCartStore();
const cartConfig = useCartConfigStore();
const { items, totalItemCount, subtotal } = storeToRefs(cart);
const { modalCopy, checkoutCopy, pageCopy } = storeToRefs(cartConfig);

const shippingValue = computed(() =>
  resolveShippingDisplayText(
    checkoutCopy.value,
    modalCopy.value?.shippingText ?? 'se calcula en el checkout',
    totalItemCount.value,
    subtotal.value
  )
);

const estimatedTax = computed(() => {
  const pct = pageCopy.value?.taxAmount ?? 0;
  return subtotal.value * (pct / 100);
});

const totalAfterTax = computed(() => subtotal.value + estimatedTax.value);

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

onMounted(async () => {
  try {
    const itemsToBuy = mapCartItemsToPaymentIntentPayload();
    const currentSnapshot = JSON.stringify(itemsToBuy);

    const resolvePaymentIntent = async () => {
      if (
        cart.activeClientSecret &&
        cart.activeOrderDocumentId &&
        cart.lastCheckoutSnapshot === currentSnapshot
      ) {
        clientSecret.value = cart.activeClientSecret;
        orderDocumentId.value = cart.activeOrderDocumentId;
        return;
      }

      const payload = await fetchPaymentIntent(itemsToBuy);
      clientSecret.value = payload.clientSecret;
      orderDocumentId.value = payload.documentId;
      cart.setCheckoutSession(payload.clientSecret, payload.documentId, currentSnapshot);
    };

    await Promise.all([resolvePaymentIntent(), cartConfig.fetchFullCartConfig()]);
  } catch (error) {
    console.error('Error al preparar checkout:', error);
    checkoutError.value = 'No se pudo inicializar el pago. Intenta nuevamente.';
  } finally {
    isLoadingSecret.value = false;
  }
});

const handleCheckoutSubmit = async () => {
  if (!paymentComponentRef.value || isLoadingSecret.value || !clientSecret.value) return;

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
  console.log('Datos listos para enviar a Strapi:', checkoutForm);
  console.log('Datos reales:', JSON.parse(JSON.stringify(checkoutForm)));
  console.log('Datos reales raw:', toRaw(checkoutForm));

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
        <ContactInformationSection v-model="checkoutForm.contact" />
        <ShippingAddressSection v-model="checkoutForm.shipping" />
        <ShippingMethodSection />

        <div>
          <div v-if="isLoadingSecret" class="text-on-surface-variant animate-pulse">
            Inicializando checkout...
          </div>
          <PaymentDetails
            v-else-if="clientSecret"
            ref="paymentComponentRef"
            :client-secret="clientSecret"
          />

          <div
            v-if="checkoutError"
            class="text-error text-sm font-medium bg-error-container p-3 rounded-md mt-4"
          >
            {{ checkoutError }}
          </div>
          <pre class="text-xs bg-gray-100 p-4 mt-4">{{ checkoutForm }}</pre>
          <button
            type="button"
            :disabled="isSubmitting || isLoadingSecret || !clientSecret"
            class="w-full py-6 bg-primary text-on-primary font-bold tracking-widest uppercase text-sm hover:opacity-90 transition-opacity active:scale-[0.98] duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            @click="handleCheckoutSubmit"
          >
            {{ isSubmitting ? 'Procesando...' : 'Complete Purchase' }}
          </button>
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
          />
          <CheckoutTrustIndicators />
        </div>
      </div>
    </div>
  </main>
</template>
