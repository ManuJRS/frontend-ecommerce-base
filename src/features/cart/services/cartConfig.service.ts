import { api } from '@/core/api';
import qs from 'qs';
import type {
  CartFullConfig,
  CartModalConfig,
  CartPageCopy,
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
  summaryBtnCheckout: 'Ir al checkout',
  summaryMessage: '',
  summaryBadge: [],
};

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

function mapPage(data: Record<string, unknown>): CartPageCopy {
  return {
    slug: String(data.slug ?? DEFAULT_PAGE.slug),
    pageTitle: String(data.pageTitle ?? DEFAULT_PAGE.pageTitle),
    pageDescription: String(data.pageDescription ?? DEFAULT_PAGE.pageDescription),
    orderSummaryTitle: String(
      data.sumaryShippingText ?? data.summaryTitle ?? DEFAULT_PAGE.orderSummaryTitle
    ),
    summarySubtotalText: String(
      data.summarySubtotalText ?? DEFAULT_PAGE.summarySubtotalText
    ),
    shippingRowLabel: String(
      data.summaryShippingText ?? DEFAULT_PAGE.shippingRowLabel
    ),
    summaryTaxText: String(data.summaryTaxText ?? DEFAULT_PAGE.summaryTaxText),
    summaryBtnCheckout: String(
      data.summaryBtnCheckout ?? DEFAULT_PAGE.summaryBtnCheckout
    ),
    summaryMessage: String(data.summaryMessage ?? DEFAULT_PAGE.summaryMessage),
    summaryBadge: mapSummaryBadges(data.summaryBadge),
  };
}

export const CartConfigService = {
  async getFullCartConfig(): Promise<CartFullConfig> {
    const query = qs.stringify(
      {
        populate: {
          cartModal: true,
          summaryBadge: {
            populate: ['svg'],
          },
        },
      },
      { encodeValuesOnly: true }
    );

    try {
      const response = await api.get(`/cart-config?${query}`);
      const data = unwrapEntity(response.data.data as Record<string, unknown>);

      const modalRaw = data.cartModal;
      const modalFlat = unwrapComponent(modalRaw);
      const cartModal =
        modalFlat && Object.keys(modalFlat).length > 0
          ? mapModal(modalFlat)
          : DEFAULT_MODAL;

      const page = mapPage(data);

      return { cartModal, page };
    } catch {
      return {
        cartModal: DEFAULT_MODAL,
        page: DEFAULT_PAGE,
      };
    }
  },
};
