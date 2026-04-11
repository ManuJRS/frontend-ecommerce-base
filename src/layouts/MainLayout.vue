<script setup lang="ts">
import AppHeader from '@/features/header/components/AppHeader.vue';
</script>

<template>
  <div class="min-h-screen flex flex-col bg-background">
    <AppHeader />
    <main class="flex-1 w-full pt-16 sm:pt-20">
      <router-view />
    </main>
  </div>
</template>
