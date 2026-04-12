import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { CartModalConfig } from '../models';
import { CartConfigService } from '../services/cartConfig.service';

export const useCartConfigStore = defineStore('cartConfig', () => {
  const modalCopy = ref<CartModalConfig | null>(null);
  const loaded = ref(false);

  async function fetchCartModalConfig() {
    modalCopy.value = await CartConfigService.getCartModalConfig();
    loaded.value = true;
  }

  return {
    modalCopy,
    loaded,
    fetchCartModalConfig,
  };
});
