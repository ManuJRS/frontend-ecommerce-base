<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import type { ShippingMethodOption } from '@/features/cart/models';
import { useCartStore } from '@/features/cart/stores/cart.store';
import { useCartConfigStore } from '@/features/cart/stores/cartConfig.store';

const props = defineProps<{
  postalCode: string;
  disabled?: boolean;
}>();

const selectedShippingMethod = defineModel<ShippingMethodOption | null>('selectedShippingMethod', {
  default: null,
});

const cart = useCartStore();
const cartConfig = useCartConfigStore();
const { subtotal, totalItemCount } = storeToRefs(cart);
const { checkoutCopy } = storeToRefs(cartConfig);

/** Valor del `<select>`; se sincroniza con el modelo y la auto-selección por prioridad. */
const selectedId = ref<string>('');

function formatMoneyLabel(n: number): string {
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const availableShippingMethods = computed<ShippingMethodOption[]>(() => {
  const c = checkoutCopy.value;
  const shippingCfg = c?.shippingConfiguration;
  const sm = c?.shippingMethods;
  const discountMode = shippingCfg?.discountMode ?? c?.discountMode ?? 'N/A';
  const quantityDiscount = shippingCfg?.quantityDiscount ?? c?.quantityDiscount ?? null;
  const amountDiscount = shippingCfg?.amountDiscount ?? c?.amountDiscount ?? null;
  const shippingFreeText = shippingCfg?.shippingFreeText ?? c?.shippingFreeText ?? '';
  const methods: ShippingMethodOption[] = [];

  if (!c || !sm) {
    return [
      {
        id: 'fallback',
        label: 'Se calcula después...',
        cost: 0,
      },
    ];
  }

  const baseRaw = Number(sm.baseShippingCost ?? 0);
  const baseVal = Number.isFinite(baseRaw) ? baseRaw : 0;
  const localRaw = Number(sm.localShippingCost ?? sm.baseShippingCost ?? 0);
  const localVal = Number.isFinite(localRaw) ? localRaw : baseVal;

  let freeApplies = false;
  if (discountMode !== 'N/A') {
    if (discountMode === 'discountByQuantity') {
      const min = quantityDiscount;
      freeApplies = min != null && totalItemCount.value >= min;
    } else if (discountMode === 'discountByAmount') {
      const min = amountDiscount;
      freeApplies = min != null && subtotal.value >= min;
    }
  }

  if (freeApplies) {
    const freeLabel =
      (shippingFreeText ?? '').trim() || `Envío Gratis (${formatMoneyLabel(0)})`;
    methods.push({
      id: 'free',
      label: freeLabel,
      cost: 0,
    });
  }

  const zip = props.postalCode.trim();
  const prefixes = (sm.localZipCodes ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const zipMatchesLocal = zip.length > 0 && prefixes.some((prefix) => zip.startsWith(prefix));

  if (sm.enableLocalShipping && zipMatchesLocal) {
    methods.push({
      id: 'local',
      label: `Envío Local (${formatMoneyLabel(localVal)})`,
      cost: localVal,
    });
  }

  if (sm.enableBaseShipping) {
    const baseTitle = (sm.baseShippingTitle ?? '').trim() || 'Envío Estándar';
    methods.push({
      id: 'base',
      label: `${baseTitle} (${formatMoneyLabel(baseVal)})`,
      cost: baseVal,
    });
  }

  if (methods.length === 0) {
    const fb = (c.fallbackShippingText ?? '').trim() || 'Se calcula después...';
    methods.push({
      id: 'fallback',
      label: fb,
      cost: 0,
    });
  }

  return methods;
});

const PRIORITY_ORDER = ['free', 'local', 'base', 'fallback'] as const;

function pickPriorityId(methods: ShippingMethodOption[]): string {
  const ids = new Set(methods.map((m) => m.id));
  for (const id of PRIORITY_ORDER) {
    if (ids.has(id)) return id;
  }
  return methods[0]?.id ?? '';
}

watch(
  availableShippingMethods,
  (methods) => {
    const nextId = pickPriorityId(methods);
    if (nextId) selectedId.value = nextId;
  },
  { immediate: true }
);

watch(
  [selectedId, availableShippingMethods],
  () => {
    const m = availableShippingMethods.value.find((x) => x.id === selectedId.value);
    selectedShippingMethod.value = m ?? null;
  },
  { immediate: true }
);
</script>

<template>
  <section>
    <h2 class="text-2xl font-bold tracking-tight mb-8 text-primary">Método de envío</h2>
    <label class="block">
      <span class="sr-only">Método de envío</span>
      <select
        v-model="selectedId"
        class="w-full appearance-none rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-3 pr-10 text-on-surface font-medium cursor-pointer transition-colors hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="props.disabled"
      >
        <option
          v-for="m in availableShippingMethods"
          :key="m.id"
          :value="m.id"
        >
          {{ m.label }}
        </option>
      </select>
    </label>
  </section>
</template>
