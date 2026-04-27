import type { CheckoutConfig } from '../models';

/** Reglas de umbral en `shippingConfiguration` (alineado con checkout). */
export function isFreeShippingEligible(
  checkout: CheckoutConfig | null | undefined,
  totalItemCount: number,
  subtotal: number
): boolean {
  const shippingCfg = checkout?.shippingConfiguration;
  const discountMode =
    shippingCfg?.discountMode ?? checkout?.discountMode ?? 'N/A';

  if (discountMode === 'discountByAmount') {
    const min =
      shippingCfg?.amountDiscount ?? checkout?.amountDiscount ?? null;
    return min != null && subtotal >= min;
  }
  if (discountMode === 'discountByQuantity') {
    const min =
      shippingCfg?.quantityDiscount ?? checkout?.quantityDiscount ?? null;
    return min != null && totalItemCount >= min;
  }
  return false;
}

export function resolveShippingAmount(
  checkout: CheckoutConfig | null | undefined,
  totalItemCount: number,
  subtotal: number,
  zipCode = ''
): number {
  const shippingCfg = checkout?.shippingConfiguration;
  const discountMode = shippingCfg?.discountMode ?? checkout?.discountMode ?? 'N/A';
  const quantityDiscount = shippingCfg?.quantityDiscount ?? checkout?.quantityDiscount ?? null;
  const amountDiscount = shippingCfg?.amountDiscount ?? checkout?.amountDiscount ?? null;
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
  if (!checkout || discountMode === 'N/A') return paidAmount;

  if (discountMode === 'discountByQuantity') {
    const minQty = quantityDiscount;
    if (minQty != null && totalItemCount >= minQty) return 0;
  }

  if (discountMode === 'discountByAmount') {
    const minSubtotal = amountDiscount;
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
  const shippingCfg = checkout?.shippingConfiguration;
  const discountMode = shippingCfg?.discountMode ?? checkout?.discountMode ?? 'N/A';
  const freeText = (shippingCfg?.shippingFreeText ?? checkout?.shippingFreeText ?? '').trim() || 'Gratis';
  const fallbackPaid = modalShippingText || '$0.00';
  const shippingAmount = resolveShippingAmount(checkout, totalItemCount, subtotal, zipCode);
  const paidText = Number.isFinite(shippingAmount)
    ? `$${shippingAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : fallbackPaid;
  if (discountMode === 'N/A') return paidText;
  return shippingAmount === 0 ? freeText : paidText;
}
