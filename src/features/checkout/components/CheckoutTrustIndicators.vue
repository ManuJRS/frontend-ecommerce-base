<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useCartConfigStore } from '@/features/cart/stores/cartConfig.store';

const cartConfig = useCartConfigStore();
const { pageCopy } = storeToRefs(cartConfig);
</script>

<template>
  <div v-if="pageCopy?.summaryBadge?.length" class="space-y-4 pt-2">
    <div
      v-for="badge in pageCopy.summaryBadge"
      :key="badge.id"
      class="flex items-center gap-3 text-xs text-on-surface-variant"
    >
      <img
        v-if="badge.svg"
        :src="badge.svg"
        alt=""
        class="w-5 h-5 shrink-0 object-contain"
      />
      <span
        v-else
        class="material-symbols-outlined text-sm shrink-0 text-on-surface-variant"
        aria-hidden="true"
      >
        verified
      </span>
      <span>{{ badge.badgeText }}</span>
    </div>
  </div>
</template>
