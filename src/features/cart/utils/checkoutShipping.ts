import type { CheckoutConfig } from '../models';

export function resolveShippingAmount(
  checkout: CheckoutConfig | null | undefined,
  totalItemCount: number,
  subtotal: number,
  zipCode = ''
): number {
  const baseShippingCost = Number(checkout?.baseShippingCost ?? 0);
  const localShippingCost = Number(checkout?.localShippingCost ?? baseShippingCost);
  const paidAmount = Number.isFinite(baseShippingCost) ? baseShippingCost : 0;
  const localAmount = Number.isFinite(localShippingCost) ? localShippingCost : paidAmount;

  const cleanedZip = zipCode.trim();
  const localPrefixes = (checkout?.localZipCodes ?? '')
    .split(',')
    .map((prefix) => prefix.trim())
    .filter(Boolean);

  // Prioridad 1: envío gratis por reglas de descuento
  if (!checkout || checkout.discountMode === 'N/A') return paidAmount;

  if (checkout.discountMode === 'discountByQuantity') {
    const minQty = checkout.quantityDiscount;
    if (minQty != null && totalItemCount >= minQty) return 0;
  }

  if (checkout.discountMode === 'discountByAmount') {
    const minSubtotal = checkout.amountDiscount;
    if (minSubtotal != null && subtotal >= minSubtotal) return 0;
  }

  // Prioridad 2: envío local por prefijo de zip code
  if (
    cleanedZip &&
    localPrefixes.length > 0 &&
    localPrefixes.some((prefix) => cleanedZip.startsWith(prefix))
  ) {
    return localAmount;
  }

  // Prioridad 3: envío estándar
  return paidAmount;
}

/**
 * Texto de la fila de envío:
 * - `shippingFreeText` si aplican reglas de checkout;
 * - `baseShippingCost` formateado como moneda cuando no aplica envío gratis.
 *
 * - `discountByQuantity`: envío gratuito cuando `totalItemCount >= quantityDiscount`.
 * - `discountByAmount`: envío gratuito cuando `subtotal >= amountDiscount`.
 */
export function resolveShippingDisplayText(
  checkout: CheckoutConfig | null | undefined,
  modalShippingText: string,
  totalItemCount: number,
  subtotal: number,
  zipCode = ''
): string {
  const freeText = (checkout?.shippingFreeText ?? '').trim() || 'Gratis';
  const fallbackPaid = modalShippingText || '$0.00';
  const shippingAmount = resolveShippingAmount(checkout, totalItemCount, subtotal, zipCode);
  const paidText = Number.isFinite(shippingAmount)
    ? `$${shippingAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : fallbackPaid;
  return shippingAmount === 0 ? freeText : paidText;
}
