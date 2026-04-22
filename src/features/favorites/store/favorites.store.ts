import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useFavoritesStore = defineStore('favorites', () => {
  const items = ref<any[]>([]);

  const totalFavorites = computed(() => items.value.length);

  function isFavorite(productId: string | number) {
    return items.value.some((item) => item.id === productId);
  }

  function toggleFavorite(product: any) {
    const index = items.value.findIndex((item) => item.id === product.id);
    if (index > -1) {
      items.value.splice(index, 1);
    } else {
      items.value.push(product);
    }
  }

  return {
    items,
    totalFavorites,
    isFavorite,
    toggleFavorite,
  };
}, {
  persist: true
});