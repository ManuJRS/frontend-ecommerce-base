import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { StoreViewPageData } from '../models';
import { StoreViewService } from '../services/storeView.service';

export const useStoreViewStore = defineStore('storeView', () => {
  const currentPage = ref<StoreViewPageData | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchPage() {
    loading.value = true;
    error.value = null;
    try {
      const pageData = await StoreViewService.getStoreViewPage();
      if (pageData) {
        currentPage.value = pageData;
      } else {
        error.value = 'Page not found';
        currentPage.value = null;
      }
    } catch (err: any) {
      error.value = err.message || 'Error fetching page';
      currentPage.value = null;
    } finally {
      loading.value = false;
    }
  }

  return {
    currentPage,
    loading,
    error,
    fetchPage,
  };
}, {
  persist: true,
});
