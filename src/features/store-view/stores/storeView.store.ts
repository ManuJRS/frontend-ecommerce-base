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

  const currentSortBy = ref('default');

  function sortProducts(sortBy: string) {
    currentSortBy.value = sortBy;
    if (!currentPage.value) return;

    // Buscar el bloque de la cuadrícula de productos en la página actual
    const productGridBlock = currentPage.value.contentBlocks.find(
      (block) => block.__component === 'blocks.product-grid'
    );

    if (productGridBlock && productGridBlock.manualProducts) {
      if (sortBy === 'lowest') {
        productGridBlock.manualProducts.sort((a: any, b: any) => (a.price || 0) - (b.price || 0));
      } else if (sortBy === 'highest') {
        productGridBlock.manualProducts.sort((a: any, b: any) => (b.price || 0) - (a.price || 0));
      } else if (sortBy === 'newest') {
        productGridBlock.manualProducts.sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
      } else if (sortBy === 'best-sellers') {
         productGridBlock.manualProducts.sort((a: any, b: any) => {
             const valA = a.isBestseller || a.bestseller || a.bestProduct ? 1 : 0;
             const valB = b.isBestseller || b.bestseller || b.bestProduct ? 1 : 0;
             return valB - valA;
         });
      } else if (sortBy === 'default') {
         productGridBlock.manualProducts.sort((a: any, b: any) => (a.id || 0) - (b.id || 0));
      }
    }
  }

  return {
    currentPage,
    loading,
    error,
    currentSortBy,
    fetchPage,
    sortProducts,
  };
}, {
  persist: true,
});
