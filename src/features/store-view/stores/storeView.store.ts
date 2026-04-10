import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { StoreViewPageData } from '../models';
import { StoreViewService } from '../services/storeView.service';

/** Filtros aplicados desde `StoreViewFilters` al pulsar «Filtrar». */
export interface AppliedProductFilters {
  /** Si viene definido, el precio efectivo del producto debe estar en [min, max]. */
  priceRange: { min: number; max: number } | null;
  /** Vacío = no filtrar por categoría; si hay ids, el producto debe pertenecer a alguna. */
  categoryIds: number[];
  availabilityOnly: boolean;
}

export const useStoreViewStore = defineStore('storeView', () => {
  const currentPage = ref<StoreViewPageData | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const currentSortBy = ref('default');

  /** `null`: aún no se ha pulsado «Filtrar» (se muestran todos los productos cargados). */
  const appliedProductFilters = ref<AppliedProductFilters | null>(null);

  async function fetchPage() {
    loading.value = true;
    error.value = null;
    try {
      const pageData = await StoreViewService.getStoreViewPage();
      if (pageData) {
        currentPage.value = pageData;
        appliedProductFilters.value = null;
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

  function sortProducts(sortBy: string) {
    currentSortBy.value = sortBy;
  }

  function applyProductFilters(filters: AppliedProductFilters) {
    appliedProductFilters.value = filters;
  }

  return {
    currentPage,
    loading,
    error,
    currentSortBy,
    appliedProductFilters,
    fetchPage,
    sortProducts,
    applyProductFilters,
  };
}, {
  persist: true,
});
