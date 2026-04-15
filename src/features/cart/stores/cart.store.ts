import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

/** Línea del carrito: snapshot JSON del producto (Strapi) + cantidad. */
export interface CartLineItem {
  product: Record<string, unknown>;
  quantity: number;
}

function cloneProductJson(product: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(product)) as Record<string, unknown>;
}

function unitPrice(product: Record<string, unknown>): number {
  const d = product.discountedPrice;
  if (d != null && d !== '' && !Number.isNaN(Number(d))) return Number(d);
  const pr = product.price;
  return pr != null && pr !== '' ? Number(pr) || 0 : 0;
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartLineItem[]>([]);
  const drawerOpen = ref(false);
  const activeClientSecret = ref<string | null>(null);
  const activeOrderDocumentId = ref<string | null>(null);
  const lastCheckoutSnapshot = ref<string | null>(null);

  const totalItemCount = computed(() =>
    items.value.reduce((sum, line) => sum + line.quantity, 0)
  );

  const subtotal = computed(() =>
    items.value.reduce((sum, line) => sum + unitPrice(line.product) * line.quantity, 0)
  );

  function openDrawer() {
    drawerOpen.value = true;
  }

  function closeDrawer() {
    drawerOpen.value = false;
  }

  function setCheckoutSession(secret: string, documentId: string, snapshot: string) {
    activeClientSecret.value = secret;
    activeOrderDocumentId.value = documentId;
    lastCheckoutSnapshot.value = snapshot;
  }

  function clearCheckoutSession() {
    activeClientSecret.value = null;
    activeOrderDocumentId.value = null;
    lastCheckoutSnapshot.value = null;
  }

  function clearCart() {
    items.value = [];
    clearCheckoutSession();
    drawerOpen.value = false;
  }

  function addProduct(product: Record<string, unknown>) {
    const snapshot = cloneProductJson(product);
    const id = snapshot.id;
    if (id == null) {
      items.value.push({ product: snapshot, quantity: 1 });
      clearCheckoutSession();
      return;
    }
    const existing = items.value.find((line) => line.product.id === id);
    if (existing) {
      existing.quantity += 1;
    } else {
      items.value.push({ product: snapshot, quantity: 1 });
    }
    clearCheckoutSession();
  }

  function removeLine(index: number) {
    if (index < 0 || index >= items.value.length) return;
    items.value.splice(index, 1);
    clearCheckoutSession();
  }

  function incrementQuantity(index: number) {
    const line = items.value[index];
    if (!line) return;
    line.quantity += 1;
    clearCheckoutSession();
  }

  function decrementQuantity(index: number) {
    const line = items.value[index];
    if (!line) return;
    if (line.quantity <= 1) {
      removeLine(index);
    } else {
      line.quantity -= 1;
      clearCheckoutSession();
    }
  }

  return {
    items,
    drawerOpen,
    activeClientSecret,
    activeOrderDocumentId,
    lastCheckoutSnapshot,
    totalItemCount,
    subtotal,
    openDrawer,
    closeDrawer,
    setCheckoutSession,
    clearCheckoutSession,
    clearCart,
    addProduct,
    removeLine,
    incrementQuantity,
    decrementQuantity,
  };
}, {
  persist: {
    pick: ['items', 'activeClientSecret', 'activeOrderDocumentId', 'lastCheckoutSnapshot'],
  },
});
