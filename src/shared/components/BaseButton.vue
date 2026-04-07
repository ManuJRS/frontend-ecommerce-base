<script setup lang="ts">
// Simple base button to establish the shared components folder
defineProps<{
  label?: string;
}>();
</script>

<template>
  <button class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition">
    <slot>{{ label }}</slot>
  </button>
</template>
