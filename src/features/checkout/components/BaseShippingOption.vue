<script setup lang="ts">
/** Tarifa de envío estándar configurable (cart-config); mismo contrato que las cotizaciones API. */
export interface BaseShippingRate {
  id: string;
  carrier: string;
  service: string;
  price: number;
  days: number;
  baseShippingAdvice?: string;
  localShippingAdvice?: string;
}

const props = defineProps<{
  rate: BaseShippingRate;
  selected: boolean;
}>();

const emit = defineEmits<{
  select: [rate: BaseShippingRate];
}>();
</script>

<template>
  <button
    type="button"
    class="w-full rounded-xl border p-4 text-left transition-all duration-200 hover:border-primary/60 hover:bg-surface-container-lowest/70"
    :class="
      selected
        ? 'active border-primary bg-primary/5 shadow-sm'
        : 'border-outline-variant/40'
    "
    @click="emit('select', rate)"
  >
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="font-semibold text-on-surface">{{ rate.carrier }} - {{ rate.service }}</p>
        <p
          v-if="(rate.localShippingAdvice ?? rate.baseShippingAdvice)?.trim()"
          class="text-xs leading-relaxed text-on-surface-variant"
        >
          {{ rate.localShippingAdvice ?? rate.baseShippingAdvice }}
        </p>
        <p
          v-else
          class="text-xs uppercase tracking-wider text-on-surface-variant"
        >
          Entrega estimada: {{ rate.days }} días
        </p>
      </div>
      <p class="font-bold text-on-surface tabular-nums">
        {{
          rate.price.toLocaleString('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 2,
          })
        }}
      </p>
    </div>
  </button>
</template>
