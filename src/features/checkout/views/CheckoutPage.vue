<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { fetchPaymentIntent, updateOrderAddress, type PaymentIntentItemPayload } from '@/core/api';
import { useCartStore } from '@/features/cart/stores/cart.store';
import { useCartConfigStore } from '@/features/cart/stores/cartConfig.store';
import ContactInformationSection from '@/features/checkout/components/ContactInformationSection.vue';
import ShippingAddressSection from '@/features/checkout/components/ShippingAddressSection.vue';
import OrderSummaryCard from '@/features/checkout/components/OrderSummaryCard.vue';
import CheckoutTrustIndicators from '@/features/checkout/components/CheckoutTrustIndicators.vue';
import PaymentDetails from '@/features/checkout/components/PaymentDetails.vue';
import { shippingService } from '@/core/api';

interface ShippingRate {
  id: string;
  carrier: string;
  service: string;
  price: number;
  days: number;
}


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
  state: string;
  city: string;
  phone: string;
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
    state: '',
    city: '',
    phone: '',
    postalCode: '',
    deliveryInstructions: '',
  },
});
const cart = useCartStore();
const cartConfig = useCartConfigStore();
const { items, subtotal } = storeToRefs(cart);
const { checkoutCopy, pageCopy } = storeToRefs(cartConfig);

const shippingRates = ref<ShippingRate[]>([]);
const selectedRate = ref<ShippingRate | null>(null);
const isLoadingRates = ref(false);
const noCoverageMessage = ref<string | null>(null);

function normalizeZipCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, 5);
}

function mapCartItemsToShippingPayload(): { documentId: string; quantity: number }[] {
  return items.value
    .map((line) => {
      const product = line.product;
      const documentId = String(product.documentId ?? product.variantDocumentId ?? '').trim();
      return {
        documentId,
        quantity: line.quantity,
      };
    })
    .filter((line) => line.documentId.length > 0);
}

function resetShippingRates(): void {
  shippingRates.value = [];
  selectedRate.value = null;
  noCoverageMessage.value = null;
}

function pickBestRate(rates: ShippingRate[]): ShippingRate | null {
  if (!rates.length) return null;

  const freeRate = rates.find((rate) => Number(rate.price) === 0);
  if (freeRate) return freeRate;

  const localRate = rates.find((rate) => rate.id === 'local_delivery');
  if (localRate) return localRate;

  return rates.reduce((cheapest, current) =>
    Number(current.price) < Number(cheapest.price) ? current : cheapest
  );
}

function buildFallbackStandardRate(): ShippingRate {
  const baseShipping = Number(checkoutCopy.value?.baseShippingCost ?? 0);
  const fallbackPrice = Number.isFinite(baseShipping) ? baseShipping : 0;
  return {
    id: 'standard_fallback',
    carrier: 'Envío estándar',
    service: 'Tarifa de respaldo',
    price: fallbackPrice,
    days: 0,
  };
}

async function handleZipCodeChange(): Promise<void> {
  const zipCode = normalizeZipCode(checkoutForm.shipping.postalCode);

  if (zipCode.length !== 5) {
    resetShippingRates();
    return;
  }

  const shippingItems = mapCartItemsToShippingPayload();
  if (shippingItems.length === 0) {
    resetShippingRates();
    return;
  }

  isLoadingRates.value = true;
  checkoutError.value = null;
  selectedRate.value = null;
  noCoverageMessage.value = null;

  try {
    const response = await shippingService.getEstimate(zipCode, shippingItems, subtotal.value);
    const parsedRates = Array.isArray(response) ? (response as ShippingRate[]) : [];
    if (parsedRates.length === 0) {
      noCoverageMessage.value =
        'No encontramos cobertura para este código postal. Mostramos una tarifa estándar de respaldo.';
      const fallbackRate = buildFallbackStandardRate();
      shippingRates.value = [fallbackRate];
      selectedRate.value = fallbackRate;
      return;
    }

    shippingRates.value = parsedRates;
    selectedRate.value = pickBestRate(parsedRates);
  } catch (error) {
    console.error('Error al obtener tarifas de envío:', error);
    checkoutError.value = 'No se pudieron obtener las tarifas de envío. Intenta nuevamente.';
    resetShippingRates();
  } finally {
    isLoadingRates.value = false;
  }
}

watch(
  () => checkoutForm.shipping.postalCode,
  (nextZipCode, prevZipCode) => {
    const normalizedNext = normalizeZipCode(nextZipCode);
    if (nextZipCode !== normalizedNext) {
      checkoutForm.shipping.postalCode = normalizedNext;
      return;
    }

    if (normalizedNext.length === 5 && normalizedNext !== normalizeZipCode(prevZipCode ?? '')) {
      selectedRate.value = null;
      void handleZipCodeChange();
      return;
    }

    if (normalizedNext.length !== 5) {
      resetShippingRates();
    }
  }
);

const shippingValue = computed(() => {
  const rate = selectedRate.value;
  if (!rate) {
    const c = checkoutCopy.value;
    return (c?.fallbackShippingText ?? '').trim() || 'Se calcula después...';
  }
  return `${rate.carrier} - ${rate.service}`;
});

const shippingAmount = computed(() => selectedRate.value?.price ?? 0);
const orderTotal = computed(() => subtotal.value + shippingAmount.value);
const isFallbackShipping = computed(() => !selectedRate.value);

const estimatedTax = computed(() => {
  const pct = pageCopy.value?.taxAmount ?? 0;
  const taxableBase = orderTotal.value;
  return taxableBase * (pct / 100);
});

const totalAfterTax = computed(() => {
  return orderTotal.value + estimatedTax.value;
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
    !!checkoutForm.shipping.postalCode.trim() &&
    !!checkoutForm.shipping.state.trim()
  );
});

function resolvePaymentIntentUnitPrice(product: Record<string, unknown>): number {
  const vpd = product.variantPriceWithDiscount;
  if (vpd != null && vpd !== '' && !Number.isNaN(Number(vpd))) {
    return Number(vpd);
  }
  const d = product.discountedPrice;
  if (d != null && d !== '' && !Number.isNaN(Number(d))) {
    return Number(d);
  }
  const pr = product.price;
  return pr != null && pr !== '' ? Number(pr) || 0 : 0;
}

function mapCartItemsToPaymentIntentPayload(): PaymentIntentItemPayload[] {
  return items.value.map((line) => {
    const p = line.product;
    const variantIdRaw = p.variantDocumentId || p.documentId;

    const productVariantId =
      typeof variantIdRaw === 'string'
        ? variantIdRaw.trim()
        : variantIdRaw != null
          ? String(variantIdRaw).trim()
          : '';

    if (!productVariantId) {
      throw new Error('Hay productos sin variante o documentId válido para procesar el pago');
    }

    return {
      documentId: productVariantId,
      quantity: line.quantity,
      price: resolvePaymentIntentUnitPrice(p),
    };
  });
}

function buildCheckoutSnapshot(
  itemsPayload: PaymentIntentItemPayload[],
  zipCode: string,
  shippingRate: ShippingRate | null
): string {
  return JSON.stringify({
    items: itemsPayload,
    zipCode,
    shippingRateId: shippingRate?.id ?? null,
    shippingRatePrice: shippingRate?.price ?? 0,
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

  if (!selectedRate.value?.id) {
    checkoutError.value = 'Selecciona un método de envío.';
    return;
  }

  isLoadingSecret.value = true;

  try {
    await cartConfig.fetchFullCartConfig();

    const itemsToBuy = mapCartItemsToPaymentIntentPayload();
    const zipCode = checkoutForm.shipping.postalCode.trim();
    const snapshot = buildCheckoutSnapshot(itemsToBuy, zipCode, selectedRate.value);

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
        shippingRateId: selectedRate.value.id,
      });
      clientSecret.value = payload.clientSecret;
      orderDocumentId.value = payload.documentId;
      cart.setCheckoutSession(payload.clientSecret, payload.documentId, snapshot);
    }

    isFormValidAndSubmitted.value = true;
  } catch (error: any) {
    isFormValidAndSubmitted.value = false;
    const responseData = error?.response?.data;
    // Buscamos el código y los detalles en la estructura estándar de Strapi v4 o plana
    const details = responseData?.error?.details || responseData;
    const code = details?.code || responseData?.error?.name;

    if (code === 'INSUFFICIENT_STOCK') {
      checkoutError.value = `Lo sentimos, no hay stock suficiente de "${details?.productName || 'este producto'}". Solo nos quedan ${details?.available} unidades disponibles.`;
    } else {
      checkoutError.value = 'No se pudo inicializar el pago. Intenta nuevamente.';
    }
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
            <span>información</span>
          </div>
          <div class="w-8 h-px bg-outline-variant/30" aria-hidden="true" />
          <div
            class="flex items-center gap-2 transition-colors"
            :class="
              isFormValidAndSubmitted ? 'text-primary font-bold' : 'text-on-surface-variant'
            "
          >
            <span>02</span>
            <span>Pago</span>
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
          <section class="space-y-4">
            <h2 class="text-2xl font-bold tracking-tight text-primary">Método de envío</h2>

            <div
              v-if="isLoadingRates"
              class="flex items-center gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4"
            >
              <span class="h-4 w-4 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
              <p class="text-sm text-on-surface-variant">Cotizando opciones de envío...</p>
            </div>

            <div v-else-if="shippingRates.length > 0" class="space-y-3">
              <button
                v-for="rate in shippingRates"
                :key="rate.id"
                type="button"
                class="w-full rounded-xl border p-4 text-left transition-all duration-200 hover:border-primary/60 hover:bg-surface-container-lowest/70"
                :class="
                  selectedRate?.id === rate.id
                    ? 'active border-primary bg-primary/5 shadow-sm'
                    : 'border-outline-variant/40'
                "
                @click="selectedRate = rate"
              >
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <p class="font-semibold text-on-surface">{{ rate.carrier }} - {{ rate.service }}</p>
                    <p class="text-xs uppercase tracking-wider text-on-surface-variant">
                      Entrega estimada: {{ rate.days }} días
                    </p>
                  </div>
                  <p class="font-bold text-on-surface">
                    {{
                      rate.price.toLocaleString('es-MX', {
                        style: 'currency',
                        currency: 'MXN',
                        minimumFractionDigits: 2,
                      })
                    }}
                  </p>
                </div>
              </button>
            </div>

            <p
              v-if="noCoverageMessage"
              class="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-on-surface-variant"
            >
              {{ noCoverageMessage }}
            </p>
          </section>

          <div
            v-if="checkoutError"
            class="text-red-600 bg-red-100 p-3 rounded-md mb-4 text-sm font-medium border border-red-200"
            role="alert"
          >
            {{ checkoutError }}
          </div>

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
          <div
            v-if="checkoutError"
            class="text-red-600 bg-red-100 p-3 rounded-md mb-4 text-sm font-medium border border-red-200"
            role="alert"
          >
            {{ checkoutError }}
          </div>

          <PaymentDetails
            v-if="clientSecret"
            ref="paymentComponentRef"
            :client-secret="clientSecret"
          />

          <button
            type="button"
            :disabled="isSubmitting || !clientSecret || !isFormValidAndSubmitted"
            class="w-full py-6 bg-primary text-on-primary font-bold tracking-widest uppercase text-sm hover:opacity-90 transition-opacity active:scale-[0.98] duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
            :is-fallback-shipping="isFallbackShipping"
            :fallback-shipping-warning="checkoutCopy?.fallbackShippingWarning"
          />
          <div class="bg-surface-container-lowest p-6 sm:p-8 rounded-xl shadow-sm space-y-6 sm:space-y-8">
            <CheckoutTrustIndicators />
            <div v-if="pageCopy?.summaryMessage" class="pt-4 border-t border-outline-variant/10">
              <p class="text-[10px] uppercase tracking-widest text-on-surface-variant/60 leading-relaxed">
                {{ pageCopy.summaryMessage }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
