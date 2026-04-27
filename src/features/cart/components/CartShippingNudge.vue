<script setup lang="ts">
import { computed } from 'vue';
import type { CheckoutConfig } from '../models';

const props = withDefaults(
  defineProps<{
    checkoutCopy: CheckoutConfig | null | undefined;
    totalItemCount: number;
    subtotal: number;
    promoText?: string | null;
    variant?: 'floating' | 'inline' | 'block';
  }>(),
  { variant: 'floating' }
);

function formatMoney(n: number): string {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const showQuantity = computed(() => {
  const c = props.checkoutCopy;
  const shippingCfg = c?.shippingConfiguration;
  return (
    (shippingCfg?.discountMode ?? c?.discountMode) === 'discountByQuantity' &&
    props.totalItemCount < (shippingCfg?.quantityDiscount ?? c?.quantityDiscount ?? 0)
  );
});

const showAmount = computed(() => {
  const c = props.checkoutCopy;
  const shippingCfg = c?.shippingConfiguration;
  return (
    (shippingCfg?.discountMode ?? c?.discountMode) === 'discountByAmount' &&
    props.subtotal < (shippingCfg?.amountDiscount ?? c?.amountDiscount ?? 0)
  );
});

const visible = computed(
  () => !!props.promoText?.trim() && (showQuantity.value || showAmount.value)
);

const qtyRemaining = computed(() => {
  const shippingCfg = props.checkoutCopy?.shippingConfiguration;
  const q = shippingCfg?.quantityDiscount ?? props.checkoutCopy?.quantityDiscount ?? 0;
  return q - props.totalItemCount;
});

const amountRemaining = computed(() => {
  const shippingCfg = props.checkoutCopy?.shippingConfiguration;
  const t = shippingCfg?.amountDiscount ?? props.checkoutCopy?.amountDiscount ?? 0;
  return Math.max(0, t - props.subtotal);
});

const wrapperClass = computed(() => {
  if (props.variant === 'block') {
    return 'relative w-full mt-4';
  }
  if (props.variant === 'inline') {
    return 'mt-8 flex justify-center sm:mt-12';
  }
  return 'pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-6 sm:px-8';
});

const cardClass = computed(() => {
  const base =
    'pointer-events-auto flex w-full items-center gap-3 rounded-xl border border-primary/20 bg-primary-fixed/40 p-3 shadow-lg backdrop-blur-sm sm:gap-4 sm:p-4';
  if (props.variant === 'block') {
    return `${base} max-w-none`;
  }
  return `${base} max-w-md`;
});
</script>

<template>
  <div v-if="visible" :class="wrapperClass" role="status">
    <div v-if="showQuantity" :class="cardClass">
      <span class="material-symbols-outlined shrink-0 text-primary" data-icon="shipped">local_shipping</span>
      <p
        v-if="qtyRemaining > 1"
        class="text-sm font-medium leading-snug text-on-primary-fixed-variant"
      >
        Te faltan {{ qtyRemaining }} productos para obtener envío gratis!
      </p>
      <p v-else class="text-sm font-medium leading-snug text-on-primary-fixed-variant">
        Te falta {{ qtyRemaining }} producto para obtener envío gratis!
      </p>
    </div>
    <div v-else-if="showAmount" :class="cardClass">
      <span class="material-symbols-outlined shrink-0 text-primary" data-icon="shipped">local_shipping</span>
      <p class="text-sm font-medium leading-snug text-on-primary-fixed-variant">
        Agrega ${{ formatMoney(amountRemaining) }} más para obtener envío gratis!
      </p>
    </div>
  </div>
</template>
