<script setup lang="ts">
type CheckoutLineItem = {
  product: Record<string, unknown>;
  quantity: number;
};

const props = defineProps<{
  items: CheckoutLineItem[];
  subtotal: number;
  shippingValue: string;
  estimatedTax: number;
  totalAfterTax: number;
  subtotalLabel?: string;
  shippingLabel?: string;
  taxLabel?: string;
  totalLabel?: string;
  isFallbackShipping?: boolean;
  fallbackShippingWarning?: string;
}>();

function formatMoney(n: number): string {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function productName(p: Record<string, unknown>): string {
  return String(p.name ?? '');
}

function productImageUrl(p: Record<string, unknown>): string | null {
  const images = p.images as { url?: string }[] | undefined;
  return images?.[0]?.url ?? null;
}

function productSubtitle(p: Record<string, unknown>): string {
  const cats = p.categories as { name?: string }[] | undefined;
  if (cats?.length) return String(cats[0].name ?? '');
  const desc = p.description;
  if (desc != null && String(desc).trim()) {
    const s = String(desc).trim();
    return s.length > 120 ? `${s.slice(0, 117)}...` : s;
  }
  return '';
}

function lineUnitTotal(line: CheckoutLineItem): number {
  const d = line.product.discountedPrice;
  const unit = d != null && d !== '' && !Number.isNaN(Number(d)) ? Number(d) : Number(line.product.price) || 0;
  return unit * line.quantity;
}
</script>

<template>
  <div class="bg-surface-container-lowest p-6 sm:p-8 rounded-xl shadow-sm space-y-6 sm:space-y-8">
    <h3 class="text-xs uppercase tracking-[0.2em] font-bold text-on-surface-variant">
      Resumen de la orden
    </h3>

    <div v-if="props.items.length === 0" class="text-sm text-on-surface-variant">
      Tu carrito está vacío.
    </div>

    <div v-else class="space-y-8">
      <div v-for="(line, index) in props.items" :key="`${line.product.id ?? 'noid'}-${index}`" class="flex gap-6">
        <div class="w-24 h-32 bg-surface-container flex-shrink-0">
          <img
            v-if="productImageUrl(line.product)"
            :src="productImageUrl(line.product)!"
            :alt="productName(line.product)"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-xs text-on-surface-variant">
            Sin imagen
          </div>
        </div>
        <div class="flex flex-col justify-between py-1 min-w-0">
          <div>
            <h4 class="font-semibold text-on-surface truncate">{{ productName(line.product) }}</h4>
            <p v-if="productSubtitle(line.product)" class="text-sm text-on-surface-variant line-clamp-2">
              {{ productSubtitle(line.product) }}
            </p>
            <p class="text-xs text-on-surface-variant mt-1">Cantidad: {{ line.quantity }}</p>
          </div>
          <p class="font-semibold tabular-nums">${{ formatMoney(lineUnitTotal(line)) }}</p>
        </div>
      </div>
    </div>

    <div class="space-y-4 border-b border-outline-variant/20 pb-8">
      <div class="flex justify-between text-sm text-on-surface-variant gap-4">
        <span>{{ props.subtotalLabel ?? 'Subtotal' }}</span>
        <span class="tabular-nums">${{ formatMoney(props.subtotal) }}</span>
      </div>
      <div class="flex justify-between text-sm text-on-surface-variant gap-4">
        <span>{{ props.shippingLabel ?? 'Shipping' }}</span>
        <span class="text-right tabular-nums">{{ props.shippingValue }}</span>
      </div>
      <div class="flex justify-between text-sm text-on-surface-variant gap-4">
        <span>{{ props.taxLabel ?? 'Estimated Tax' }}</span>
        <span class="tabular-nums">${{ formatMoney(props.estimatedTax) }}</span>
      </div>
    </div>

    <div class="flex justify-between items-baseline gap-4">
      <div class="flex justify-between text-lg font-bold w-full">
        <span>{{ props.totalLabel ?? 'Total' }}</span>
        <span class="text-2xl sm:text-3xl font-extrabold tracking-tighter tabular-nums text-on-surface">
          ${{ formatMoney(props.totalAfterTax) }}
        </span>
      </div>
    </div>

    <p
      v-if="props.isFallbackShipping && props.fallbackShippingWarning?.trim()"
      class="text-xs text-on-surface-variant/90 leading-relaxed border border-outline-variant/30 rounded-lg px-3 py-2 bg-surface-container-high/40"
    >
      {{ props.fallbackShippingWarning }}
    </p>
  </div>
</template>
