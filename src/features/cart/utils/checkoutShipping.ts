import type { CheckoutConfig } from '../models';

/**
 * Texto de la fila de envío: `shippingFreeText` si aplican reglas de checkout;
 * si no, `shippingText` del modal.
 *
 * - `discountByQuantity`: envío gratuito cuando `totalItemCount >= quantityDiscount`.
 * - `discountByAmount`: envío gratuito cuando `subtotal >= amountDiscount`.
 */
export function resolveShippingDisplayText(
  checkout: CheckoutConfig | null | undefined,
  modalShippingText: string,
  totalItemCount: number,
  subtotal: number
): string {
  const base = modalShippingText;
  if (!checkout || checkout.discountMode === 'N/A') return base;

  if (checkout.discountMode === 'discountByQuantity') {
    const minQty = checkout.quantityDiscount;
    if (minQty != null && totalItemCount >= minQty) {
      return (checkout.shippingFreeText ?? '').trim() || base;
    }
  }

  if (checkout.discountMode === 'discountByAmount') {
    const minSubtotal = checkout.amountDiscount;
    if (minSubtotal != null && subtotal >= minSubtotal) {
      return (checkout.shippingFreeText ?? '').trim() || base;
    }
  }

  return base;
}
