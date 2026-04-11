import { api } from '@/core/api';
import qs from 'qs';
import type { HeaderData, HeaderNavLink } from '../models';

/** Strapi REST suele devolver `data.attributes`; otras configs devuelven campos planos en `data`. */
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

function mapNavLinks(raw: unknown): HeaderNavLink[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: Record<string, unknown>) => {
    const flat =
      item.attributes && typeof item.attributes === 'object' && !Array.isArray(item.attributes)
        ? { id: item.id, ...(item.attributes as Record<string, unknown>) }
        : item;
    return {
      id: Number(flat.id),
      label: String(flat.label ?? ''),
      url: String(flat.url ?? '/'),
      isExternal: (flat.isExternal as boolean | null | undefined) ?? null,
    };
  });
}

export const HeaderService = {
  async getHeader(): Promise<HeaderData | null> {
    const query = qs.stringify(
      {
        /** Sin esto Strapi suele omitir componentes repetibles como `navLinks` (array vacío o ausente). */
        populate: {
          navLinks: true,
          logoSVG: true,
        },
      },
      { encodeValuesOnly: true }
    );

    try {
      const response = await api.get(`/header?${query}`);
      const raw = response.data.data;
      if (!raw) return null;

      const data = unwrapEntity(raw as Record<string, unknown>);

      const logoSvgRaw = data.logoSVG as unknown;
      const logoSVG =
        typeof logoSvgRaw === 'string'
          ? logoSvgRaw
          : logoSvgRaw &&
              typeof logoSvgRaw === 'object' &&
              logoSvgRaw !== null &&
              'url' in logoSvgRaw &&
              (logoSvgRaw as { url?: string }).url != null
            ? String((logoSvgRaw as { url: string }).url)
            : null;

      return {
        id: Number(data.id),
        documentId: data.documentId as string | undefined,
        logoText: String(data.logoText ?? ''),
        logDisplay: String(data.logDisplay ?? data.logoDisplay ?? 'text'),
        logoSVG,
        showSearch: Boolean(data.showSearch),
        showFavIcon: Boolean(data.showFavIcon),
        showCart: Boolean(data.showCart),
        showProfileIcon: Boolean(data.showProfileIcon),
        navLinks: mapNavLinks(data.navLinks),
      };
    } catch (error) {
      console.error('Failed to fetch header', error);
      return null;
    }
  },
};
