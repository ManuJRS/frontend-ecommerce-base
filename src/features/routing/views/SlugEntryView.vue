<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCartConfigStore } from '@/features/cart/stores/cartConfig.store';

const CartViewPage = defineAsyncComponent(() => import('@/features/cart/views/CartViewPage.vue'));
const StoreViewPage = defineAsyncComponent(() => import('@/features/store-view/views/StoreViewPage.vue'));

const route = useRoute();
const router = useRouter();
const cartConfig = useCartConfigStore();

const ready = ref(false);

async function load() {
  await cartConfig.fetchFullCartConfig();
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

watch(
  () => route.params.slug,
  () => {
    if (ready.value) syncCartCanonicalSlug();
  }
);

const showCart = computed(
  () => ready.value && cartConfig.isCartSlug(route.params.slug as string)
);
const showStore = computed(
  () => ready.value && !cartConfig.isCartSlug(route.params.slug as string)
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
    <StoreViewPage v-else-if="showStore" />
  </div>
</template>
