<script setup lang="ts">
import { onMounted } from 'vue';
import AppHeader from '@/features/header/components/AppHeader.vue';
import CartModal from '@/features/cart/components/CartModal.vue';
import { useCartConfigStore } from '@/features/cart/stores/cartConfig.store';

const cartConfig = useCartConfigStore();

onMounted(() => {
  cartConfig.fetchFullCartConfig();
});
</script>

<template>
  <div class="min-h-screen flex flex-col bg-background">
    <AppHeader />
    <CartModal />
    <main class="flex-1 w-full pt-16 sm:pt-20">
      <router-view />
    </main>
  </div>
</template>
