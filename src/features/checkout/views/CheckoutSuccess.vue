<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useCartStore } from '@/features/cart/stores/cart.store';
import { useCartConfigStore } from '@/features/cart/stores/cartConfig.store';
import { renderProductDescriptionMarkdown } from '@/features/products/utils/renderProductMarkdown';
import { API_URL } from '@/shared/config/api';

type ResultKind = 'success' | 'failed' | 'pending' | 'verifying';
type PaymentMethod = 'stripe' | 'transfer';

const route = useRoute();
const router = useRouter();
const cart = useCartStore();
const cartConfig = useCartConfigStore();
const { checkoutCopy } = storeToRefs(cartConfig);

const result = ref<ResultKind>('pending');
const retryCount = ref(0);
const maxRetries = 5;
const detectedPaymentMethod = ref<PaymentMethod>('stripe');
const displayOrderId = ref<string | null>(null);
const isLoadingOrderInfo = ref(false);

const orderDocumentId = computed(() => {
  const doc = route.query.documentId;
  const camel = route.query.orderId;
  const snake = route.query.order_id;
  const raw = doc ?? camel ?? snake;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' && value.trim() ? value : undefined;
});

const queryPaymentMethod = computed<PaymentMethod | null>(() => {
  const raw = route.query.method ?? route.query.paymentMethod;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === 'transfer' || value === 'stripe' ? value : null;
});

const isTransferPayment = computed(() => detectedPaymentMethod.value === 'transfer');
const isCopyingBankDetails = ref(false);
const hasCopiedBankDetails = ref(false);
const bankDetailsHtml = computed(() => {
  const raw = checkoutCopy.value?.bankDetails;
  if (!raw || !String(raw).trim()) return '';
  return renderProductDescriptionMarkdown(raw);
});

function htmlToPlainText(html: string): string {
  if (!html.trim()) return '';
  if (typeof window === 'undefined') return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const el = document.createElement('div');
  el.innerHTML = html;
  return (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim();
}

async function copyBankDetails(): Promise<void> {
  const textToCopy = htmlToPlainText(bankDetailsHtml.value);
  if (!textToCopy || isCopyingBankDetails.value) return;
  isCopyingBankDetails.value = true;
  try {
    await navigator.clipboard.writeText(textToCopy);
    hasCopiedBankDetails.value = true;
    window.setTimeout(() => {
      hasCopiedBankDetails.value = false;
    }, 1800);
  } catch (error) {
    console.error('No se pudieron copiar los datos bancarios:', error);
  } finally {
    isCopyingBankDetails.value = false;
  }
}

async function fetchOrderDetails(documentId: string) {
  const response = await fetch(`${API_URL}/orders/${documentId}`);
  const orderData = await response.json();
  return orderData?.data ?? null;
}

function syncOrderDisplayId(orderNode: any): void {
  const ordRaw = orderNode?.orderId || orderNode?.attributes?.orderId;
  const ord = typeof ordRaw === 'string' ? ordRaw.trim() : String(ordRaw ?? '').trim();
  if (ord) {
    displayOrderId.value = ord;
  }
}

async function verifyOrder() {
  if (!orderDocumentId.value) return;
  
  result.value = 'verifying';
  isLoadingOrderInfo.value = true;
  
  try {
    const orderNode = await fetchOrderDetails(orderDocumentId.value);
    syncOrderDisplayId(orderNode);
    const currentStatus = orderNode?.status || orderNode?.attributes?.status;
    const methodRaw = orderNode?.paymentMethod || orderNode?.attributes?.paymentMethod;
    if (methodRaw === 'transfer' || methodRaw === 'stripe') {
      detectedPaymentMethod.value = methodRaw;
    }

    if (detectedPaymentMethod.value === 'transfer') {
      result.value = 'success';
      return;
    }

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
  } finally {
    isLoadingOrderInfo.value = false;
  }
}

function determineStatusFromQuery() {
  if (queryPaymentMethod.value) {
    detectedPaymentMethod.value = queryPaymentMethod.value;
  }

  if (detectedPaymentMethod.value === 'transfer') {
    result.value = 'success';
    return;
  }

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
  void cartConfig.fetchFullCartConfig();

  if (queryPaymentMethod.value) {
    detectedPaymentMethod.value = queryPaymentMethod.value;
  }

  if (orderDocumentId.value) {
    void verifyOrder();
  } else {
    const params = route.query;
    const status = params.redirect_status;
    if (status === 'succeeded' && detectedPaymentMethod.value === 'stripe') {
      cart.clearCart();
      result.value = 'success';
      return;
    }
    result.value = 'pending';
    isLoadingOrderInfo.value = false;
  }
});

const title = computed(() => {
  if (isTransferPayment.value) return '¡Orden recibida!';
  if (result.value === 'verifying') return 'Confirmando pago...';
  if (result.value === 'success') return '¡Pago Exitoso!';
  if (result.value === 'failed') return 'No se pudo completar el pago';
  return 'Estamos procesando tu pago';
});

const message = computed(() => {
  if (isTransferPayment.value) {
    return '¡Orden recibida! Estamos en espera de tu transferencia. Una vez que envíes tu comprobante, validaremos tu pago para procesar el envío.';
  }
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

        <div
          v-if="isTransferPayment"
          class="text-left rounded-xl border border-outline-variant/40 bg-surface-container-high p-4 space-y-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="text-sm">
              <span class="font-semibold">Número de orden:</span>
              <span class="ml-2">
                {{ isLoadingOrderInfo ? 'Cargando...' : displayOrderId || 'Pendiente de asignación' }}
              </span>
            </div>
            <button
              v-if="bankDetailsHtml"
              type="button"
              class="hover:cursor-pointer inline-flex items-center gap-1 rounded-md border border-outline-variant/50 px-2.5 py-1.5 text-xs text-on-surface-variant hover:bg-surface-container-highest disabled:opacity-60"
              :disabled="isCopyingBankDetails"
              @click="copyBankDetails"
            >
              <span class="material-symbols-outlined text-base leading-none">
                {{ hasCopiedBankDetails ? 'check' : 'content_copy' }}
              </span>
              <span>{{ hasCopiedBankDetails ? 'Copiado' : 'Copiar' }}</span>
            </button>
          </div>
          <div
            v-if="bankDetailsHtml"
            class="prose prose-sm max-w-none text-on-surface"
            v-html="bankDetailsHtml"
          />
          <p v-else class="text-sm text-on-surface-variant">
            Te enviaremos los datos de transferencia por correo en breve.
          </p>
        </div>
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
        <button @click="router.push('/tienda')" class="w-full sm:w-auto min-w-[200px] inline-flex items-center justify-center rounded-xl bg-primary px-8 py-4 text-sm font-bold uppercase text-on-primary">
          Volver al inicio
        </button>
      </div>

    </div>
  </main>
</template>
