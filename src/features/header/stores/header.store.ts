import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { HeaderData } from '../models';
import { HeaderService } from '../services/header.service';

export const useHeaderStore = defineStore('header', () => {
  const header = ref<HeaderData | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchHeader() {
    loading.value = true;
    error.value = null;
    try {
      const data = await HeaderService.getHeader();
      console.log('data', data);
      if (data) {
        header.value = data;
      } else {
        error.value = 'No se pudo cargar el encabezado';
        header.value = null;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar el encabezado';
      error.value = message;
      header.value = null;
    } finally {
      loading.value = false;
    }
  }

  return {
    header,
    loading,
    error,
    fetchHeader,
  };
});
