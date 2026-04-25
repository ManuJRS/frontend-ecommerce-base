<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { fetchPaymentIntent, updateOrderAddress, type PaymentIntentItemPayload } from '@/core/api';
import { useRouter } from 'vue-router';
import { useCartStore } from '@/features/cart/stores/cart.store';
import { useCartConfigStore } from '@/features/cart/stores/cartConfig.store';
import ContactInformationSection from '@/features/checkout/components/ContactInformationSection.vue';
import ShippingAddressSection from '@/features/checkout/components/ShippingAddressSection.vue';
import OrderSummaryCard from '@/features/checkout/components/OrderSummaryCard.vue';
import CheckoutTrustIndicators from '@/features/checkout/components/CheckoutTrustIndicators.vue';
import PaymentDetails from '@/features/checkout/components/PaymentDetails.vue';
import DevAddressSeeder from '@/dev/DevAddressSeeder.vue';
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
type PaymentMethod = 'stripe' | 'transfer';

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
/** Tipo de la última orden creada vía API (evita duplicar intent al volver a tarjeta). */
const orderKind = ref<'none' | 'stripe' | 'transfer'>('none');
const isPrefetchingStripe = ref(false);
/** Solo al avanzar a la fase de pago (sin crear PaymentIntent). */
const isAdvancingToPhase2 = ref(false);
const checkoutError = ref<string | null>(null);
/** Clic en «Confirmar pago»: crea orden / intent y evita doble envío. */
const isConfirmingPayment = ref(false);
const paymentComponentRef = ref<PaymentDetailsExposed | null>(null);
const phase1FormRef = ref<HTMLFormElement | null>(null);
/** Fase 2: método de pago y confirmación (el intent se crea al confirmar). */
const isFormValidAndSubmitted = ref(false);
const selectedMethod = ref<PaymentMethod>('stripe');

const stripeReturnUrl = computed(() => {
  if (!orderDocumentId.value) return null;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/checkout/success?documentId=${encodeURIComponent(orderDocumentId.value)}&method=stripe`;
});

const isStripeSubmitBlocked = computed(
  () =>
    selectedMethod.value === 'stripe' &&
    (!clientSecret.value || isPrefetchingStripe.value)
);

function validatePhase2CheckoutPrereqs(): string | null {
  if (items.value.length === 0) {
    return 'Tu carrito está vacío.';
  }
  if (
    !checkoutForm.contact.email.trim() ||
    !checkoutForm.shipping.firstName.trim() ||
    !checkoutForm.shipping.address.trim() ||
    !checkoutForm.shipping.city.trim() ||
    !checkoutForm.shipping.postalCode.trim()
  ) {
    return 'Completa email, nombre, dirección, ciudad y código postal para continuar.';
  }
  const email = checkoutForm.contact.email.trim();
  if (!EMAIL_REGEX.test(email)) {
    return 'Ingresa un correo electrónico válido.';
  }
  if (!selectedRate.value?.id) {
    return 'Selecciona un método de envío.';
  }
  return null;
}

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
const router = useRouter();

/** Limpia estado de pago en memoria para una futura compra (documentId, intent, tipo de orden). */
function resetCheckoutPaymentLocals(): void {
  clientSecret.value = null;
  orderDocumentId.value = null;
  orderKind.value = 'none';
  isPrefetchingStripe.value = false;
}

/** Tras respuesta OK del servidor en transferencia: vacía carrito, resetea refs y navega. */
async function finalizeTransferCheckoutSuccess(documentId: string): Promise<void> {
  cart.clearCart();
  resetCheckoutPaymentLocals();
  await router.push({
    path: '/checkout/success',
    query: {
      documentId,
      method: 'transfer',
    },
  });
}
const { items, subtotal } = storeToRefs(cart);
const { checkoutCopy, pageCopy } = storeToRefs(cartConfig);
const allowBankTransfer = computed(
  () =>
    (checkoutCopy.value as (typeof checkoutCopy.value & { allowBankTransfer?: boolean }) | null)
      ?.allowBankTransfer !== false
);
const bankTransferTitle = computed(
  () =>
    (checkoutCopy.value as (typeof checkoutCopy.value & { bankTransferTitle?: string }) | null)
      ?.bankTransferTitle ?? ''
);

const shippingRates = ref<ShippingRate[]>([]);
const selectedRate = ref<ShippingRate | null>(null);
const isLoadingRates = ref(false);
const noCoverageMessage = ref<string | null>(null);

function normalizeZipCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, 5);
}

/** Rellena `checkoutForm` desde `DevAddressSeeder` (el seeder usa `zipCode`; el formulario usa `postalCode`). */
function fillForm(data: {
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  zipCode?: string;
  deliveryInstructions?: string;
}) {
  checkoutForm.shipping.firstName = String(data.firstName ?? '');
  checkoutForm.shipping.lastName = String(data.lastName ?? '');
  checkoutForm.shipping.address = String(data.address ?? '');
  checkoutForm.shipping.city = String(data.city ?? '');
  checkoutForm.shipping.state = String(data.state ?? '');
  checkoutForm.shipping.country = String(data.country ?? '');
  checkoutForm.shipping.phone = String(data.phone ?? '');
  checkoutForm.shipping.postalCode = normalizeZipCode(String(data.zipCode ?? ''));
  checkoutForm.shipping.deliveryInstructions = String(data.deliveryInstructions ?? '');

  if (!checkoutForm.contact.email.trim()) {
    checkoutForm.contact.email = 'dev@example.com';
  }
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
  shippingRate: ShippingRate | null,
  paymentMethod: PaymentMethod
): string {
  return JSON.stringify({
    items: itemsPayload,
    zipCode,
    shippingRateId: shippingRate?.id ?? null,
    shippingRatePrice: shippingRate?.price ?? 0,
    paymentMethod,
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

  isAdvancingToPhase2.value = true;

  try {
    await cartConfig.fetchFullCartConfig();
    cart.clearCheckoutSession();
    clientSecret.value = null;
    orderDocumentId.value = null;
    orderKind.value = 'none';
    isFormValidAndSubmitted.value = true;
  } catch (error) {
    console.error('Error al cargar configuración del carrito:', error);
    checkoutError.value = 'No se pudo continuar. Intenta nuevamente.';
    isFormValidAndSubmitted.value = false;
  } finally {
    isAdvancingToPhase2.value = false;
  }
}

async function runStripePrefetchFromWatcher(): Promise<void> {
  if (!isFormValidAndSubmitted.value || selectedMethod.value !== 'stripe') return;
  if (clientSecret.value) return;
  if (isPrefetchingStripe.value) return;

  const errMsg = validatePhase2CheckoutPrereqs();
  if (errMsg) {
    checkoutError.value = errMsg;
    return;
  }

  isPrefetchingStripe.value = true;
  checkoutError.value = null;

  try {
    await cartConfig.fetchFullCartConfig();
    const itemsToBuy = mapCartItemsToPaymentIntentPayload();
    const zipCode = checkoutForm.shipping.postalCode.trim();

    const payload = await fetchPaymentIntent({
      items: itemsToBuy,
      zipCode,
      contact: { ...checkoutForm.contact },
      shippingAddress: { ...checkoutForm.shipping, zipCode },
      shippingRateId: selectedRate.value!.id,
      paymentMethod: 'stripe',
    });

    if (selectedMethod.value !== 'stripe') {
      return;
    }

    orderDocumentId.value = payload.documentId;
    if (!payload.clientSecret) {
      checkoutError.value = 'No se recibió la clave de pago. Intenta nuevamente.';
      return;
    }

    clientSecret.value = payload.clientSecret;
    orderKind.value = 'stripe';

    await updateOrderAddress(payload.documentId, checkoutForm);

    cart.setCheckoutSession(
      payload.clientSecret,
      payload.documentId,
      buildCheckoutSnapshot(itemsToBuy, zipCode, selectedRate.value, 'stripe')
    );
  } catch (error: any) {
    if (selectedMethod.value !== 'stripe') return;
    const responseData = error?.response?.data;
    const details = responseData?.error?.details || responseData;
    const code = details?.code || responseData?.error?.name;

    if (code === 'INSUFFICIENT_STOCK') {
      checkoutError.value = `Lo sentimos, no hay stock suficiente de "${details?.productName || 'este producto'}". Solo nos quedan ${details?.available} unidades disponibles.`;
    } else {
      checkoutError.value = 'No se pudo preparar el pago con tarjeta. Intenta nuevamente.';
    }
  } finally {
    isPrefetchingStripe.value = false;
  }
}

watch(
  () => [isFormValidAndSubmitted.value, selectedMethod.value] as const,
  () => {
    void runStripePrefetchFromWatcher();
  },
  { immediate: true }
);

watch(
  () => allowBankTransfer.value,
  (enabled) => {
    if (!enabled && selectedMethod.value !== 'stripe') {
      selectedMethod.value = 'stripe';
    }
  },
  { immediate: true }
);

async function handleCheckout() {
  if (!isFormValidAndSubmitted.value) return;

  checkoutError.value = null;

  const prereqError = validatePhase2CheckoutPrereqs();
  if (prereqError) {
    checkoutError.value = prereqError;
    return;
  }

  const method = selectedMethod.value;

  isConfirmingPayment.value = true;

  try {
    await cartConfig.fetchFullCartConfig();

    const itemsToBuy = mapCartItemsToPaymentIntentPayload();
    const zipCode = checkoutForm.shipping.postalCode.trim();

    if (method === 'stripe' || !allowBankTransfer.value) {
      if (!clientSecret.value || !orderDocumentId.value) {
        checkoutError.value =
          'La pasarela aún se está cargando o hubo un error. Espera un momento o cambia de método y vuelve a «Tarjeta».';
        return;
      }

      await updateOrderAddress(orderDocumentId.value, checkoutForm);

      await nextTick();
      await nextTick();

      await paymentComponentRef.value?.processStripePayment();
      return;
    }

    if (orderKind.value === 'transfer' && orderDocumentId.value) {
      const transferDocumentId = orderDocumentId.value;
      await updateOrderAddress(transferDocumentId, checkoutForm);
      await finalizeTransferCheckoutSuccess(transferDocumentId);
      return;
    }

    const payload = await fetchPaymentIntent({
      items: itemsToBuy,
      zipCode,
      contact: { ...checkoutForm.contact },
      shippingAddress: { ...checkoutForm.shipping, zipCode },
      shippingRateId: selectedRate.value!.id,
      paymentMethod: 'transfer',
    });

    const transferDocumentId = payload.documentId;
    orderDocumentId.value = transferDocumentId;
    orderKind.value = 'transfer';

    await updateOrderAddress(transferDocumentId, checkoutForm);

    await finalizeTransferCheckoutSuccess(transferDocumentId);
  } catch (error: any) {
    const responseData = error?.response?.data;
    const details = responseData?.error?.details || responseData;
    const code = details?.code || responseData?.error?.name;

    if (code === 'INSUFFICIENT_STOCK') {
      checkoutError.value = `Lo sentimos, no hay stock suficiente de "${details?.productName || 'este producto'}". Solo nos quedan ${details?.available} unidades disponibles.`;
    } else {
      checkoutError.value = 'No se pudo completar el pago. Intenta nuevamente.';
    }
  } finally {
    isConfirmingPayment.value = false;
  }
}
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
              :disabled="isAdvancingToPhase2"
            >
              {{ isAdvancingToPhase2 ? 'Cargando...' : 'Continuar al Pago' }}
            </button>
            <p
              v-if="isAdvancingToPhase2"
              class="text-sm text-on-surface-variant"
            >
              Preparando el paso de pago...
            </p>
          </div>
        </form>
        <DevAddressSeeder @select-address="fillForm" />

        <div v-if="isFormValidAndSubmitted" class="space-y-6">
          <div
            v-if="checkoutError"
            class="text-red-600 bg-red-100 p-3 rounded-md mb-4 text-sm font-medium border border-red-200"
            role="alert"
          >
            {{ checkoutError }}
          </div>

          <PaymentDetails
            ref="paymentComponentRef"
            :client-secret="clientSecret"
            :stripe-return-url="stripeReturnUrl"
            :is-prefetching-intent="isPrefetchingStripe"
            :allow-bank-transfer="allowBankTransfer"
            v-model:selected-method="selectedMethod"
            :bank-details="checkoutCopy?.bankDetails"
            :bank-transfer-title="bankTransferTitle"
          />

          <button
            type="button"
            :disabled="isConfirmingPayment || !isFormValidAndSubmitted || isStripeSubmitBlocked"
            class="inline-flex w-full items-center justify-center gap-3 py-6 bg-primary text-on-primary font-bold tracking-widest uppercase text-sm hover:opacity-90 transition-opacity active:scale-[0.98] duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="handleCheckout"
          >
            <span
              v-if="isConfirmingPayment"
              class="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary"
              aria-hidden="true"
            />
            <span>{{ isConfirmingPayment ? 'Procesando...' : 'Confirmar pago' }}</span>
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
