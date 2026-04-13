export interface CartModalConfig {
  title: string;
  revomeBtn: string;
  shippingTitle: string;
  shippingText: string;
  checkoutButtonText: string;
  promoText: string;
  emptyMessage: string;
}

/** Reglas de envío / descuentos: campos en la entrada `cart-config` (mismo nivel que el resto). */
export interface CheckoutConfig {
  discountMode: 'N/A' | 'discountByQuantity' | 'discountByAmount';
  quantityDiscount: number | null;
  /** Umbral de subtotal para envío gratuito (modo `discountByAmount`). */
  amountDiscount: number | null;
  shippingFreeText: string;
}

/** Badges del resumen (página carrito). */
export interface SummaryBadgeItem {
  id: number;
  badgeText: string;
  /** URL del SVG (media Strapi) o null. */
  svg: string | null;
}

/** Textos de la página completa del carrito (`/cart-config`). */
export interface CartPageCopy {
  slug: string;
  pageTitle: string;
  /** Puede incluir `{{count}}` o un número al inicio que se reemplaza por `totalItemCount`. */
  pageDescription: string;
  /** Encabezado del bloque "Order summary" (API: `sumaryShippingText` typo). */
  orderSummaryTitle: string;
  summarySubtotalText: string;
  shippingRowLabel: string;
  summaryTaxText: string;
  /** Porcentaje de impuesto (ej. `16` = 16 %). */
  taxAmount: number;
  summaryBtnCheckout: string;
  summaryMessage: string;
  summaryBadge: SummaryBadgeItem[];
}

export interface CartFullConfig {
  cartModal: CartModalConfig;
  checkoutConfig: CheckoutConfig;
  page: CartPageCopy;
}
