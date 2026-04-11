import { defineStore } from 'pinia';
import { ref } from 'vue';
import router from '@/core/router';
import type { StoreViewPageData } from '../models';
import { StoreViewService } from '../services/storeView.service';

export interface AppliedProductFilters {
  priceRange: { min: number; max: number } | null;
  categoryIds: number[];
  availabilityOnly: boolean;
}

export const useStoreViewStore = defineStore('storeView', () => {
  const currentPage = ref<StoreViewPageData | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const currentSortBy = ref('default');

  const appliedProductFilters = ref<AppliedProductFilters | null>(null);

  async function fetchPage() {
    loading.value = true;
    error.value = null;
    try {
      const pageData = await StoreViewService.getStoreViewPage();
      if (pageData) {
        currentPage.value = pageData;
        appliedProductFilters.value = null;
        if (pageData.slug) {
          const param = router.currentRoute.value.params.slug;
          const currentSlug =
            typeof param === 'string' ? param : Array.isArray(param) ? param[0] : undefined;
          if (currentSlug !== pageData.slug) {
            await router.replace({
              name: 'DynamicStoreView',
              params: { slug: pageData.slug },
            });
          }
        }
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
