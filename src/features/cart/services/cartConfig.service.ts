import { api } from '@/core/api';
import qs from 'qs';
import type {
  CartFullConfig,
  CartModalConfig,
  CheckoutConfig,
  CartPageCopy,
  ShippingMethodsConfig,
  SummaryBadgeItem,
} from '../models';

function unwrapEntity(raw: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {};
  const attrs = raw.attributes as Record<string, unknown> | undefined;
  if (attrs && typeof attrs === 'object' && !Array.isArray(attrs)) {
    return {
      id: raw.id,
      documentId: raw.documentId,
      ...attrs,
    };
  }
  return raw;
}

function unwrapComponent(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {};
  const o = raw as Record<string, unknown>;
  const attrs = o.attributes as Record<string, unknown> | undefined;
  if (attrs && typeof attrs === 'object') {
    return { id: o.id, ...attrs };
  }
  return o;
}

function mediaUrl(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw !== null && 'url' in raw) {
    return String((raw as { url: string }).url);
  }
  return null;
}

function mapSummaryBadges(raw: unknown): SummaryBadgeItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: unknown) => {
    const flat = unwrapComponent(item);
    return {
      id: Number(flat.id ?? 0),
      badgeText: String(flat.badgeText ?? ''),
      svg: mediaUrl(flat.svg),
    };
  });
}

const DEFAULT_MODAL: CartModalConfig = {
  title: 'Tu carrito de compras',
  emptyMessage: 'Tu carrito está vacío.',
  revomeBtn: 'Quitar',
  shippingTitle: 'Envío',
  shippingText: 'se calcula en el checkout',
  checkoutButtonText: 'Proceder al pago',
  promoText: 'Envío gratuito en pedidos superiores a $1.000',
};

const DEFAULT_PAGE: CartPageCopy = {
  slug: 'carrito-de-compras',
  pageTitle: 'Tu carrito',
  pageDescription: '{{count}} artículos en tu colección',
  orderSummaryTitle: 'Resumen del pedido',
  summarySubtotalText: 'Subtotal',
  shippingRowLabel: 'Envío estimado',
  summaryTaxText: 'Impuestos',
  taxAmount: 0,
  summaryBtnCheckout: 'Ir al checkout',
  summaryMessage: '',
  summaryBadge: [],
};

const DEFAULT_SHIPPING_METHODS: ShippingMethodsConfig = {
  enableEnvioclick: false,
  enableBaseShipping: false,
  enableLocalShipping: false,
  enableFreeShipping: false,
  baseShippingCost: 0,
  baseShippingTitle: '',
  localShippingCost: 0,
  localZipCodes: '',
  bankDetails: '',
  bankTransferTitle: '',
  allowBankTransfer: true,
};

const DEFAULT_CHECKOUT: CheckoutConfig = {
  discountMode: 'N/A',
  quantityDiscount: null,
  amountDiscount: null,
  shippingMethods: { ...DEFAULT_SHIPPING_METHODS },
  taxAndCurrency: { taxAmount: 16 },
  shippingFreeText: '',
  fallbackShippingText: '',
  fallbackShippingWarning: '',
};

const CHECKOUT_DISCOUNT_MODES: readonly CheckoutConfig['discountMode'][] = [
  'N/A',
  'discountByQuantity',
  'discountByAmount',
];

function numOrNull(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function boolOr(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === 'boolean') return raw;
  if (raw === 'true' || raw === true) return true;
  if (raw === 'false' || raw === false) return false;
  return fallback;
}

function mapShippingMethods(
  shippingMethodsFromCms: Record<string, unknown> | undefined,
  raw: Record<string, unknown>
): ShippingMethodsConfig {
  const sm =
    shippingMethodsFromCms && Object.keys(shippingMethodsFromCms).length > 0
      ? shippingMethodsFromCms
      : {};
  return {
    enableEnvioclick: boolOr(
      sm.enableEnvioclick ?? sm.EnableEnvioclick ?? raw.enableEnvioclick ?? raw.EnableEnvioclick,
      DEFAULT_SHIPPING_METHODS.enableEnvioclick
    ),
    enableBaseShipping: boolOr(
      sm.enableBaseShipping ?? raw.enableBaseShipping,
      DEFAULT_SHIPPING_METHODS.enableBaseShipping
    ),
    enableLocalShipping: boolOr(
      sm.enableLocalShipping ?? raw.enableLocalShipping,
      DEFAULT_SHIPPING_METHODS.enableLocalShipping
    ),
    enableFreeShipping: boolOr(
      sm.enableFreeShipping ?? raw.enableFreeShipping,
      DEFAULT_SHIPPING_METHODS.enableFreeShipping
    ),
    baseShippingCost:
      numOrNull(sm.baseShippingCost ?? raw.baseShippingCost) ??
      DEFAULT_SHIPPING_METHODS.baseShippingCost,
    baseShippingTitle: String(
      sm.baseShippingTitle ?? raw.baseShippingTitle ?? DEFAULT_SHIPPING_METHODS.baseShippingTitle
    ),
    localShippingCost:
      numOrNull(sm.localShippingCost ?? raw.localShippingCost) ??
      DEFAULT_SHIPPING_METHODS.localShippingCost,
    localZipCodes: String(sm.localZipCodes ?? raw.localZipCodes ?? DEFAULT_SHIPPING_METHODS.localZipCodes),
    bankDetails: String(sm.bankDetails ?? raw.bankDetails ?? DEFAULT_SHIPPING_METHODS.bankDetails),
    bankTransferTitle: String(
      sm.bankTransferTitle ??
        sm.BankTransferTitle ??
        raw.bankTransferTitle ??
        raw.BankTransferTitle ??
        DEFAULT_SHIPPING_METHODS.bankTransferTitle
    ),
    allowBankTransfer: boolOr(
      sm.allowBankTransfer ?? sm.AllowBankTransfer ?? raw.allowBankTransfer ?? raw.AllowBankTransfer,
      DEFAULT_SHIPPING_METHODS.allowBankTransfer
    ),
  };
}

function mapCheckout(
  raw: Record<string, unknown>,
  summaryResume?: Record<string, unknown>,
  shippingConfiguration?: Record<string, unknown>,
  shippingMethodsFromCms?: Record<string, unknown>,
  taxAndCurrencyFromCms?: Record<string, unknown>
): CheckoutConfig {
  const mode = shippingConfiguration?.discountMode ?? raw.discountMode;
  const discountMode =
    typeof mode === 'string' &&
    (CHECKOUT_DISCOUNT_MODES as readonly string[]).includes(mode)
      ? (mode as CheckoutConfig['discountMode'])
      : DEFAULT_CHECKOUT.discountMode;

  const amountRaw =
    shippingConfiguration?.amountDiscount ??
    shippingConfiguration?.discountByAmount ??
    raw.amountDiscount ??
    raw.discountByAmount;
  const quantityRaw = shippingConfiguration?.quantityDiscount ?? raw.quantityDiscount;
  const shippingFreeTextRaw = shippingConfiguration?.shippingFreeText ?? raw.shippingFreeText;
  const shippingAdviceRaw =
    shippingConfiguration?.shippingAdvice ?? raw.shippingAdvice;
  const taxAmountRaw = taxAndCurrencyFromCms?.taxAmount ?? raw.taxAmount;
  const taxAmount = Number(taxAmountRaw);

  return {
    discountMode,
    quantityDiscount: numOrNull(quantityRaw),
    amountDiscount: numOrNull(amountRaw),
    shippingMethods: mapShippingMethods(shippingMethodsFromCms, raw),
    taxAndCurrency: {
      taxAmount: Number.isFinite(taxAmount) ? taxAmount : DEFAULT_CHECKOUT.taxAndCurrency.taxAmount,
    },
    shippingFreeText: String(shippingFreeTextRaw ?? DEFAULT_CHECKOUT.shippingFreeText),
    fallbackShippingText: String(
      summaryResume?.fallbackShippingText ??
        raw.fallbackShippingText ??
        DEFAULT_CHECKOUT.fallbackShippingText
    ),
    fallbackShippingWarning: String(
      summaryResume?.fallbackShippingWarning ??
        raw.fallbackShippingWarning ??
        DEFAULT_CHECKOUT.fallbackShippingWarning
    ),
    shippingConfiguration: {
      discountMode,
      quantityDiscount: numOrNull(quantityRaw),
      amountDiscount: numOrNull(amountRaw),
      shippingFreeText: String(shippingFreeTextRaw ?? DEFAULT_CHECKOUT.shippingFreeText),
      shippingAdvice: String(shippingAdviceRaw ?? ''),
    },
  };
}

function mapModal(modal: Record<string, unknown>): CartModalConfig {
  return {
    title: String(modal.title ?? DEFAULT_MODAL.title),
    emptyMessage: String(modal.emptyMessage ?? DEFAULT_MODAL.emptyMessage),
    revomeBtn: String(modal.revomeBtn ?? DEFAULT_MODAL.revomeBtn),
    shippingTitle: String(modal.shippingTitle ?? DEFAULT_MODAL.shippingTitle),
    shippingText: String(modal.shippingText ?? DEFAULT_MODAL.shippingText),
    checkoutButtonText: String(
      modal.checkoutButtonText ?? DEFAULT_MODAL.checkoutButtonText
    ),
    promoText: String(modal.promoText ?? DEFAULT_MODAL.promoText),
  };
}

function mapPage(data: Record<string, unknown>, summaryResume?: Record<string, unknown>): CartPageCopy {
  return {
    slug: String(data.slug ?? DEFAULT_PAGE.slug),
    pageTitle: String(data.pageTitle ?? DEFAULT_PAGE.pageTitle),
    pageDescription: String(data.pageDescription ?? DEFAULT_PAGE.pageDescription),
    orderSummaryTitle: String(
      summaryResume?.sumaryShippingText ??
        summaryResume?.summaryTitle ??
        data.sumaryShippingText ??
        data.summaryTitle ??
        DEFAULT_PAGE.orderSummaryTitle
    ),
    summarySubtotalText: String(
      summaryResume?.summarySubtotalText ??
        data.summarySubtotalText ??
        DEFAULT_PAGE.summarySubtotalText
    ),
    shippingRowLabel: String(
      summaryResume?.summaryShippingText ??
        data.summaryShippingText ??
        DEFAULT_PAGE.shippingRowLabel
    ),
    summaryTaxText: String(
      summaryResume?.summaryTaxText ?? data.summaryTaxText ?? DEFAULT_PAGE.summaryTaxText
    ),
    taxAmount: (() => {
      const n = Number(data.taxAmount);
      return Number.isFinite(n) ? n : DEFAULT_PAGE.taxAmount;
    })(),
    summaryBtnCheckout: String(
      summaryResume?.summaryBtnCheckout ??
        data.summaryBtnCheckout ??
        DEFAULT_PAGE.summaryBtnCheckout
    ),
    summaryMessage: String(
      summaryResume?.summaryMessage ?? data.summaryMessage ?? DEFAULT_PAGE.summaryMessage
    ),
    summaryBadge: mapSummaryBadges(summaryResume?.summaryBadge ?? data.summaryBadge),
  };
}

export const CartConfigService = {
  async getFullCartConfig(): Promise<CartFullConfig> {
    const query = qs.stringify(
      {
        populate: {
          cartModal: true,
          SummaryResume: {
            populate: {
              summaryBadge: {
                populate: ['svg']
              }
            }
          },
          shippingConfiguration: { populate: '*' },
          shippingMethods: { populate: '*' },
          taxAndCurrency: { populate: '*' }
        },
      },
      { encodeValuesOnly: true }
    );

    try {
      const response = await api.get(`/cart-config?${query}`);
      console.log('[cart-config] /api/cart-config', response.data);
      const data = unwrapEntity(response.data.data as Record<string, unknown>);

      const modalRaw = data.cartModal;
      const modalFlat = unwrapComponent(modalRaw);
      const summaryResumeRaw = data.SummaryResume ?? data.summaryResume;
      const summaryResume = unwrapComponent(summaryResumeRaw);
      const shippingConfigurationRaw =
        data.shippingConfiguration ?? data.ShippingConfiguration;
      const shippingConfiguration = unwrapComponent(shippingConfigurationRaw);
      const shippingMethodsRaw = data.shippingMethods ?? data.ShippingMethods;
      const shippingMethodsFlat = unwrapComponent(shippingMethodsRaw);
      const taxAndCurrencyRaw = data.taxAndCurrency ?? data.TaxAndCurrency;
      const taxAndCurrencyFlat = unwrapComponent(taxAndCurrencyRaw);
      const cartModal =
        modalFlat && Object.keys(modalFlat).length > 0
          ? mapModal(modalFlat)
          : DEFAULT_MODAL;

      /** Reglas de envío: vienen en la misma entidad `cart-config`, no anidadas en otro recurso. */
      const checkoutConfig = mapCheckout(
        data,
        summaryResume,
        shippingConfiguration,
        shippingMethodsFlat,
        taxAndCurrencyFlat
      );

      const page = mapPage(data, summaryResume);

      return { cartModal, checkoutConfig, page };
    } catch {
      return {
        cartModal: DEFAULT_MODAL,
        checkoutConfig: DEFAULT_CHECKOUT,
        page: DEFAULT_PAGE,
      };
    }
  },
};
