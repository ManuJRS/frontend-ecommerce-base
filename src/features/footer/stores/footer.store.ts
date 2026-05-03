import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { FooterData } from '../models';
import { FooterService } from '../services/footer.service';

export const useFooterStore = defineStore('footer', () => {
  const footer = ref<FooterData | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchFooter() {
    loading.value = true;
    error.value = null;
    try {
      const data = await FooterService.getFooter();
      if (data) {
        footer.value = data;
      } else {
        error.value = 'No se pudo cargar el pie de página';
        footer.value = null;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar el pie de página';
      error.value = message;
      footer.value = null;
    } finally {
      loading.value = false;
    }
  }

  return {
    footer,
    loading,
    error,
    fetchFooter,
  };
});
