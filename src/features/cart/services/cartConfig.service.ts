import { api } from '@/core/api';
import qs from 'qs';
import type { CartModalConfig } from '../models';

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

const DEFAULT_CONFIG: CartModalConfig = {
  title: 'Tu carrito de compras',
  emptyMessage: 'Tu carrito está vacío.',
  revomeBtn: 'Quitar',
  shippingTitle: 'Envío',
  shippingText: 'se calcula en el checkout',
  checkoutButtonText: 'Proceder al pago',
  promoText: 'Envío gratuito en pedidos superiores a $1.000',
};

export const CartConfigService = {
  async getCartModalConfig(): Promise<CartModalConfig> {
    const query = qs.stringify(
      {
        populate: {
          cartModal: true,
        },
      },
      { encodeValuesOnly: true }
    );

    try {
      const response = await api.get(`/cart-config?${query}`);
      const data = unwrapEntity(response.data.data as Record<string, unknown>);
      const modalRaw = data.cartModal;
      const modal = unwrapComponent(modalRaw);

      if (!modal || Object.keys(modal).length === 0) {
        return DEFAULT_CONFIG;
      }

      return {
        title: String(modal.title ?? DEFAULT_CONFIG.title),
        emptyMessage: String(modal.emptyMessage ?? DEFAULT_CONFIG.emptyMessage),
        revomeBtn: String(modal.revomeBtn ?? DEFAULT_CONFIG.revomeBtn),
        shippingTitle: String(modal.shippingTitle ?? DEFAULT_CONFIG.shippingTitle),
        shippingText: String(modal.shippingText ?? DEFAULT_CONFIG.shippingText),
        checkoutButtonText: String(
          modal.checkoutButtonText ?? DEFAULT_CONFIG.checkoutButtonText
        ),
        promoText: String(modal.promoText ?? DEFAULT_CONFIG.promoText),
      };
    } catch {
      return DEFAULT_CONFIG;
    }
  },
};
