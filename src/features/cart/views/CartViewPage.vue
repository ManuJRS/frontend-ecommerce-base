<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useCartStore } from '../stores/cart.store';
import { useCartConfigStore } from '../stores/cartConfig.store';

const cart = useCartStore();
const cartConfig = useCartConfigStore();
const route = useRoute();
const router = useRouter();

const { items, totalItemCount, subtotal } = storeToRefs(cart);
const { modalCopy, pageCopy } = storeToRefs(cartConfig);

const taxRate = 0;
const estimatedTax = computed(() => subtotal.value * taxRate);
const grandTotal = computed(() => subtotal.value + estimatedTax.value);

function formatMoney(n: number): string {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPageDescription(template: string, count: number): string {
  if (template.includes('{{count}}')) {
    return template.replace(/\{\{count\}\}/g, String(count));
  }
  return template.replace(/^\d+/, String(count));
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
    return s.length > 120 ? `${s.slice(0, 117)}…` : s;
  }
  return '';
}

function lineUnitTotal(line: { product: Record<string, unknown>; quantity: number }): number {
  const d = line.product.discountedPrice;
  const unit =
    d != null && d !== '' && !Number.isNaN(Number(d))
      ? Number(d)
      : Number(line.product.price) || 0;
  return unit * line.quantity;
}

onMounted(() => {
  const slug = route.params.slug as string;
  const canonical = pageCopy.value?.slug;
  if (canonical && slug && slug !== canonical) {
    void router.replace({ name: 'DynamicStoreView', params: { slug: canonical } });
  }
});
</script>

<template>
  <div class="pt-8 pb-20 px-4 sm:px-8 max-w-7xl mx-auto">
    <header class="mb-10 sm:mb-16">
      <h1 class="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tighter text-primary mb-3 sm:mb-4">
        {{ pageCopy?.pageTitle ?? '…' }}
      </h1>
      <p class="text-on-surface-variant font-body text-sm sm:text-base">
        {{ pageCopy ? formatPageDescription(pageCopy.pageDescription, totalItemCount) : '' }}: {{ totalItemCount }}
      </p>
    </header>

    <div v-if="items.length === 0" class="text-center py-16 text-on-surface-variant">
      {{ modalCopy?.emptyMessage ?? 'Tu carrito está vacío.' }}
    </div>

    <div v-else class="flex flex-col lg:flex-row gap-12 lg:gap-16">
      <div class="flex-grow space-y-8 sm:space-y-12 min-w-0">
        <div
          v-for="(line, index) in items"
          :key="`${line.product.id ?? 'noid'}-${index}`"
          class="group flex flex-col md:flex-row gap-6 sm:gap-8 bg-surface-container-lowest p-4 sm:p-6 rounded-lg transition-transform hover:scale-[1.01]"
        >
          <div class="w-full md:w-48 h-56 sm:h-64 bg-surface-container overflow-hidden rounded-sm shrink-0">
            <img
              v-if="productImageUrl(line.product)"
              :src="productImageUrl(line.product)!"
              :alt="productName(line.product)"
              class="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
            />
            <div
              v-else
              class="w-full h-full flex items-center justify-center text-xs text-on-surface-variant"
            >
              Sin imagen
            </div>
          </div>
          <div class="flex flex-col justify-between flex-grow py-2 min-w-0">
            <div class="flex justify-between items-start gap-4">
              <div>
                <h3 class="text-lg sm:text-xl font-bold tracking-tight text-primary mb-1">
                  {{ productName(line.product) }}
                </h3>
                <p v-if="productSubtitle(line.product)" class="text-on-surface-variant text-sm mb-4 line-clamp-3">
                  {{ productSubtitle(line.product) }}
                </p>
              </div>
              <span class="text-lg font-bold shrink-0 tabular-nums">${{ formatMoney(lineUnitTotal(line)) }}</span>
            </div>
            <div class="flex justify-between items-end flex-wrap gap-4">
              <div class="flex items-center bg-surface-container-low px-3 sm:px-4 py-2 rounded-full gap-4 sm:gap-6">
                <button
                  type="button"
                  class="hover:text-primary transition-colors"
                  aria-label="Reducir"
                  @click="cart.decrementQuantity(index)"
                >
                  <span class="material-symbols-outlined text-sm" data-icon="remove">remove</span>
                </button>
                <span class="text-sm font-bold font-headline tabular-nums">{{ line.quantity }}</span>
                <button
                  type="button"
                  class="hover:text-primary transition-colors"
                  aria-label="Aumentar"
                  @click="cart.incrementQuantity(index)"
                >
                  <span class="material-symbols-outlined text-sm" data-icon="add">add</span>
                </button>
              </div>
              <button
                type="button"
                class="text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2"
                @click="cart.removeLine(index)"
              >
                <span class="material-symbols-outlined text-sm" data-icon="close">close</span>
                {{ modalCopy?.revomeBtn ?? 'Quitar' }}
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="modalCopy?.promoText"
          class="mt-8 sm:mt-12 p-6 sm:p-8 bg-primary-fixed/30 rounded-xl flex items-center gap-4 sm:gap-6"
        >
          <span class="material-symbols-outlined text-primary shrink-0" data-icon="shipped">local_shipping</span>
          <p class="text-sm font-medium text-on-primary-fixed-variant leading-snug">
            {{ modalCopy.promoText }}
          </p>
        </div>
      </div>

      <aside class="w-full lg:w-96 shrink-0">
        <div class="lg:sticky lg:top-28 bg-surface-container-lowest p-6 sm:p-8 rounded-xl shadow-sm space-y-6 sm:space-y-8">
          <h2 class="text-xs uppercase tracking-[0.2em] font-bold text-on-surface-variant">
            {{ pageCopy?.orderSummaryTitle ?? '' }}
          </h2>
          <div class="space-y-4 border-b border-outline-variant/20 pb-8">
            <div class="flex justify-between text-on-surface-variant text-sm gap-4">
              <span>{{ pageCopy?.summarySubtotalText ?? 'Subtotal' }}</span>
              <span class="tabular-nums">${{ formatMoney(subtotal) }}</span>
            </div>
            <div class="flex justify-between text-on-surface-variant text-sm gap-4">
              <span>{{ pageCopy?.shippingRowLabel ?? '' }}</span>
              <span class="text-primary font-bold">FREE</span>
            </div>
            <div class="flex justify-between text-on-surface-variant text-sm gap-4">
              <span>{{ pageCopy?.summaryTaxText ?? '' }}</span>
              <span class="tabular-nums">${{ formatMoney(estimatedTax) }}</span>
            </div>
          </div>
          <div class="flex justify-between items-baseline gap-4">
            <span class="text-lg font-bold">Total</span>
            <span class="text-2xl sm:text-3xl font-extrabold tracking-tighter tabular-nums">
              ${{ formatMoney(grandTotal) }}
            </span>
          </div>
          <button
            type="button"
            class="w-full bg-primary text-on-primary py-6 rounded-md font-headline font-bold text-sm tracking-widest uppercase hover:opacity-90 transition-all shadow-xl shadow-primary/10"
          >
            {{ pageCopy?.summaryBtnCheckout ?? '' }}
          </button>
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
          <div v-if="pageCopy?.summaryMessage" class="pt-4 border-t border-outline-variant/10">
            <p class="text-[10px] uppercase tracking-widest text-on-surface-variant/60 leading-relaxed">
              {{ pageCopy.summaryMessage }}
            </p>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
