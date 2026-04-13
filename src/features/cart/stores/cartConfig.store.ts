import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { CartModalConfig, CartPageCopy } from '../models';
import { CartConfigService } from '../services/cartConfig.service';

export const useCartConfigStore = defineStore('cartConfig', () => {
  const modalCopy = ref<CartModalConfig | null>(null);
  const pageCopy = ref<CartPageCopy | null>(null);
  const loaded = ref(false);
  const loading = ref(false);

  let inflight: Promise<void> | null = null;

  async function fetchFullCartConfig(): Promise<void> {
    if (loaded.value && modalCopy.value && pageCopy.value) {
      return;
    }
    if (!inflight) {
      inflight = (async () => {
        loading.value = true;
        try {
          const full = await CartConfigService.getFullCartConfig();
          modalCopy.value = full.cartModal;
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

  return {
    modalCopy,
    pageCopy,
    loaded,
    loading,
    fetchFullCartConfig,
    isCartSlug,
  };
});
