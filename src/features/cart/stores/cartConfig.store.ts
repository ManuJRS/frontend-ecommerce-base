import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { CartModalConfig, CartPageCopy, CheckoutConfig, ShippingMethodsConfig } from '../models';
import { CartConfigService } from '../services/cartConfig.service';

export const useCartConfigStore = defineStore('cartConfig', () => {
  const modalCopy = ref<CartModalConfig | null>(null);
  const checkoutCopy = ref<CheckoutConfig | null>(null);
  const pageCopy = ref<CartPageCopy | null>(null);
  const loaded = ref(false);
  const loading = ref(false);

  let inflight: Promise<void> | null = null;

  async function fetchFullCartConfig(): Promise<void> {
    if (loaded.value && modalCopy.value && checkoutCopy.value && pageCopy.value) {
      return;
    }
    if (!inflight) {
      inflight = (async () => {
        loading.value = true;
        try {
          const full = await CartConfigService.getFullCartConfig();
          modalCopy.value = full.cartModal;
          checkoutCopy.value = full.checkoutConfig;
          pageCopy.value = full.page;
          loaded.value = true;
        } finally {
          loading.value = false;
          inflight = null;
        }
      })();
    }
    await inflight;
  }

  /** Slug de la ruta `/slug` que corresponde a la página del carrito (desde API). */
  function isCartSlug(slug: string | undefined | null): boolean {
    if (!slug || !pageCopy.value?.slug) return false;
    return pageCopy.value.slug === slug;
  }

  /** Envío base/local y métodos de pago (cart-config → `shippingMethods`). */
  const shippingMethods = computed<ShippingMethodsConfig | null>(() => {
    return checkoutCopy.value?.shippingMethods ?? null;
  });

  /** IVA (%): `taxAndCurrency.taxAmount` con fallback 16. */
  const taxAmount = computed<number>(() => {
    const value = checkoutCopy.value?.taxAndCurrency?.taxAmount;
    return Number.isFinite(Number(value)) ? Number(value) : 16;
  });

  /** Código de moneda reusable en UI (fallback `mxn`). */
  const currencyCode = computed<string>(() => {
    const value = checkoutCopy.value?.taxAndCurrency?.currencyCode;
    const normalized = String(value ?? '').trim();
    return normalized || 'mxn';
  });

  /** Símbolo de moneda reusable en UI (fallback `$`). */
  const currencySymbol = computed<string>(() => {
    const value = checkoutCopy.value?.taxAndCurrency?.currencySymbol;
    const normalized = String(value ?? '').trim();
    return normalized || '$';
  });

  return {
    modalCopy,
    checkoutCopy,
    shippingMethods,
    taxAmount,
    currencyCode,
    currencySymbol,
    pageCopy,
    loaded,
    loading,
    fetchFullCartConfig,
    isCartSlug,
  };
});
