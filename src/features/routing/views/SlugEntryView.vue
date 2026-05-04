<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCartConfigStore } from '@/features/cart/stores/cartConfig.store';
// 1. Importa tu servicio de páginas
import { type DynamicPage, fetchPageBySlug } from '@/features/routing/services/page.service';

const CartViewPage = defineAsyncComponent(() => import('@/features/cart/views/CartViewPage.vue'));
const StoreViewPage = defineAsyncComponent(() => import('@/features/store-view/views/StoreViewPage.vue'));
const DynamicPageView = defineAsyncComponent(() => import('@/features/routing/views/DynamicPageView.vue'));

const route = useRoute();
const router = useRouter();
const cartConfig = useCartConfigStore();

const ready = ref(false);
const isContentPage = ref(false);
const pageData = ref<DynamicPage | null>(null);

  async function load() {
  const slug = route.params.slug as string;
  await cartConfig.fetchFullCartConfig();
  
  if (!cartConfig.isCartSlug(slug)) {
    try {
      const data = await fetchPageBySlug(slug);
      
      if (data && data.length > 0) {
        isContentPage.value = true;
        // Ahora TypeScript permitirá esta asignación
        pageData.value = data[0]; 
      } else {
        isContentPage.value = false;
        pageData.value = null;
      }
    } catch (error) {
      isContentPage.value = false;
      pageData.value = null;
    }
  }

  ready.value = true;
  syncCartCanonicalSlug();
}

function syncCartCanonicalSlug() {
  const slug = route.params.slug as string;
  const canonical = cartConfig.pageCopy?.slug;
  if (cartConfig.isCartSlug(slug) && canonical && slug !== canonical) {
    void router.replace({ name: 'DynamicStoreView', params: { slug: canonical } });
  }
}

onMounted(() => {
  void load();
});

// Vigilamos el slug para re-evaluar si el usuario navega entre categorías o páginas
watch(
  () => route.params.slug,
  () => {
    ready.value = false; // Opcional: mostrar loading durante la re-evaluación
    void load();
  }
);

// Lógica de visualización
const showCart = computed(
  () => ready.value && cartConfig.isCartSlug(route.params.slug as string)
);

// Es una página si no es carrito y el servicio encontró datos
const showDynamicPage = computed(
  () => ready.value && !showCart.value && isContentPage.value
);

// Es la tienda solo si no es ninguna de las anteriores
const showStore = computed(
  () => ready.value && !showCart.value && !isContentPage.value
);
</script>

<template>
  <div>
    <div
      v-if="!ready"
      class="min-h-[40vh] flex items-center justify-center text-on-surface-variant text-sm"
    >
      Cargando…
    </div>
    
    <CartViewPage v-else-if="showCart" />
    
    <!-- Nueva prioridad: Páginas de Strapi -->
    <DynamicPageView 
      v-else-if="showDynamicPage" 
      :initialData="pageData" 
    />
    
    <StoreViewPage v-else-if="showStore" />
  </div>
</template>