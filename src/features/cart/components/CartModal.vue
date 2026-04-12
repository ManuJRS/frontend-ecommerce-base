<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useCartStore } from '../stores/cart.store';
import { useCartConfigStore } from '../stores/cartConfig.store';

const cart = useCartStore();
const cartConfig = useCartConfigStore();
const { items, drawerOpen, subtotal } = storeToRefs(cart);

const copy = computed(() => cartConfig.modalCopy);

function productName(p: Record<string, unknown>): string {
  return String(p.name ?? '');
}

function productImageUrl(p: Record<string, unknown>): string | null {
  const images = p.images as { url?: string }[] | undefined;
  const first = images?.[0];
  return first?.url ?? null;
}

function productSubtitle(p: Record<string, unknown>): string {
  const cats = p.categories as { name?: string }[] | undefined;
  if (cats?.length) return String(cats[0].name ?? '');
  const desc = p.description;
  if (desc != null && String(desc).trim()) {
    const s = String(desc).trim();
    return s.length > 80 ? `${s.slice(0, 77)}…` : s;
  }
  return '';
}

function formatMoney(n: number): string {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function lineTotalAmount(line: { product: Record<string, unknown>; quantity: number }): number {
  const d = line.product.discountedPrice;
  const unit =
    d != null && d !== '' && !Number.isNaN(Number(d))
      ? Number(d)
      : Number(line.product.price) || 0;
  return unit * line.quantity;
}

function onBackdropClick() {
  cart.closeDrawer();
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && drawerOpen.value) {
    cart.closeDrawer();
  }
}

watch(drawerOpen, (open) => {
  if (typeof document === 'undefined') return;
  document.body.style.overflow = open ? 'hidden' : '';
});

onMounted(() => {
  document.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <div
      v-show="drawerOpen"
      class="fixed inset-0 z-[60] flex justify-end"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="copy ? 'cart-modal-title' : undefined"
    >
      <div
        class="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-500"
        aria-hidden="true"
        @click="onBackdropClick"
      />

      <div
        class="relative w-full max-w-lg h-full bg-surface-container-lowest shadow-2xl flex flex-col"
        @click.stop
      >
        <div class="px-6 sm:px-8 h-24 flex items-center justify-between border-b border-outline-variant/15 shrink-0">
          <h2 id="cart-modal-title" class="text-xl sm:text-2xl font-bold font-manrope tracking-tight pr-2">
            {{ copy?.title ?? '…' }}
          </h2>
          <button
            type="button"
            class="p-2 hover:cursor-pointer transition-colors rounded-full shrink-0 hover:text-error transition-colors"
            aria-label="Cerrar carrito"
            @click="cart.closeDrawer()"
          >
            <span class="material-symbols-outlined text-2xl" data-icon="close">close</span>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-6 sm:px-8 py-8 sm:py-10">
          <div v-if="items.length === 0" class="text-center text-sm text-on-surface-variant py-12">
            {{copy?.emptyMessage ?? 'Tu carrito está vacío.'}}
          </div>

          <div v-else class="space-y-10 sm:space-y-12">
            <div
              v-for="(line, index) in items"
              :key="`${line.product.id ?? 'noid'}-${index}`"
              class="flex gap-4 sm:gap-6 items-start"
            >
              <div class="w-24 sm:w-32 aspect-[3/4] bg-surface-container-low overflow-hidden shrink-0">
                <img
                  v-if="productImageUrl(line.product)"
                  :src="productImageUrl(line.product)!"
                  :alt="productName(line.product)"
                  class="w-full h-full object-cover"
                />
                <div
                  v-else
                  class="w-full h-full flex items-center justify-center text-xs text-on-surface-variant p-2 text-center"
                >
                  Sin imagen
                </div>
              </div>
              <div class="flex-1 flex flex-col justify-between min-h-[140px] sm:min-h-[160px] min-w-0">
                <div>
                  <div class="flex justify-between gap-2 mb-1">
                    <h4 class="font-manrope font-bold text-base sm:text-lg leading-tight">
                      {{ productName(line.product) }}
                    </h4>
                    <span class="font-medium shrink-0 tabular-nums">${{ formatMoney(lineTotalAmount(line)) }}</span>
                  </div>
                  <p v-if="productSubtitle(line.product)" class="text-sm text-on-surface-variant line-clamp-2">
                    {{ productSubtitle(line.product) }}
                  </p>
                </div>
                <div class="flex items-center justify-between pt-4 gap-2 flex-wrap">
                  <div class="flex items-center bg-surface-container-highest/50 px-2 sm:px-3 py-1.5 rounded-sm">
                    <button
                      type="button"
                      class="p-1 hover:text-primary transition-colors"
                      aria-label="Reducir cantidad"
                      @click="cart.decrementQuantity(index)"
                    >
                      <span class="hover:cursor-pointer material-symbols-outlined text-sm" data-icon="remove">remove</span>
                    </button>
                    <span class="px-3 sm:px-4 text-sm font-medium tabular-nums">{{ line.quantity }}</span>
                    <button
                      type="button"
                      class="p-1 hover:text-primary transition-colors"
                      aria-label="Aumentar cantidad"
                      @click="cart.incrementQuantity(index)"
                    >
                      <span class="hover:cursor-pointer material-symbols-outlined text-sm" data-icon="add">add</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    class="hover:cursor-pointer text-xs font-medium uppercase tracking-widest text-on-surface-variant hover:text-error transition-colors"
                    @click="cart.removeLine(index)"
                  >
                    {{ copy?.revomeBtn ?? 'Quitar' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="items.length > 0"
          class="p-6 sm:p-8 bg-surface-container-low border-t border-outline-variant/15 space-y-6 shrink-0"
        >
          <div class="space-y-2">
            <div class="flex justify-between text-sm text-on-surface-variant gap-4">
              <span>{{ copy?.shippingTitle ?? 'Envío' }}</span>
              <span class="text-right">{{ copy?.shippingText ?? '' }}</span>
            </div>
            <div class="flex justify-between items-end gap-4">
              <span class="text-lg font-bold font-manrope">Subtotal</span>
              <span class="text-2xl font-bold font-manrope tabular-nums">
                ${{ subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </span>
            </div>
          </div>
          <button
            type="button"
            class="hover:cursor-pointer w-full h-16 bg-primary text-on-primary font-manrope font-bold tracking-widest uppercase text-sm hover:bg-primary/90 transition-all active:scale-[0.98] shadow-lg"
          >
            {{ copy?.checkoutButtonText ?? 'Proceder al pago' }}
          </button>
          <p class="text-[10px] text-center text-on-surface-variant tracking-wider uppercase leading-relaxed">
            {{ copy?.promoText ?? '' }}
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>
