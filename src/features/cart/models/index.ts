export interface CartModalConfig {
  title: string;
  revomeBtn: string;
  shippingTitle: string;
  shippingText: string;
  checkoutButtonText: string;
  promoText: string;
  emptyMessage: string;
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
  summaryBtnCheckout: string;
  summaryMessage: string;
  summaryBadge: SummaryBadgeItem[];
}

export interface CartFullConfig {
  cartModal: CartModalConfig;
  page: CartPageCopy;
}
