import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { HomePageData } from '../models';
import { HomeService } from '../services/home.service';

export const useHomeStore = defineStore('home', () => {
  const currentPage = ref<HomePageData | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchPage() {
    loading.value = true;
    error.value = null;
    try {
      const pageData = await HomeService.getHomePage();
      if (pageData) {
        currentPage.value = pageData;
      } else {
        error.value = 'Página no encontrada';
        currentPage.value = null;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar el inicio';
      error.value = message;
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
});
