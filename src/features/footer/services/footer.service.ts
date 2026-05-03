import { api } from '@/core/api';
import qs from 'qs';
import type {
  FooterColumn,
  FooterData,
  FooterLinkItem,
  FooterMap,
  FooterNewsletter,
  FooterSocialBlock,
  FooterSocialIcon,
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

function flattenListItem(item: Record<string, unknown>): Record<string, unknown> {
  if (item.attributes && typeof item.attributes === 'object' && !Array.isArray(item.attributes)) {
    return { id: item.id, documentId: item.documentId, ...(item.attributes as Record<string, unknown>) };
  }
  return item;
}

function mediaUrl(raw: unknown): string | null {
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (!raw || typeof raw !== 'object') return null;
  const u = (raw as { url?: string }).url;
  return u != null && String(u).trim() !== '' ? String(u) : null;
}

function mapFooterLinks(raw: unknown): FooterLinkItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry: Record<string, unknown>) => {
    const flat = flattenListItem(entry);
    return {
      id: Number(flat.id),
      title: String(flat.title ?? ''),
      link: flat.link == null ? '' : String(flat.link),
    };
  });
}

function mapColumns(raw: unknown): FooterColumn[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry: Record<string, unknown>) => {
    const flat = flattenListItem(entry);
    const linksRaw =
      flat.footerLink ??
      flat.footerLinks ??
      (flat as { footer_link?: unknown }).footer_link;
    return {
      id: Number(flat.id),
      footerColumnTitle: String(flat.footerColumnTitle ?? flat.footer_column_title ?? ''),
      footerLink: mapFooterLinks(linksRaw),
    };
  });
}

function mapNewsletter(raw: unknown): FooterNewsletter | null {
  if (!raw || typeof raw !== 'object') return null;
  const flat = unwrapEntity(raw as Record<string, unknown>);
  return {
    id: flat.id != null ? Number(flat.id) : undefined,
    newslleterTitle: String(flat.newslleterTitle ?? ''),
    newslleterInputText: String(flat.newslleterInputText ?? ''),
    newslleterAdvice: String(flat.newslleterAdvice ?? ''),
    showNewslleter: Boolean(flat.showNewslleter),
  };
}

function mapMap(raw: unknown): FooterMap | null {
  if (!raw || typeof raw !== 'object') return null;
  const flat = unwrapEntity(raw as Record<string, unknown>);
  return {
    id: flat.id != null ? Number(flat.id) : undefined,
    showMap: Boolean(flat.showMap),
    title: String(flat.title ?? ''),
    advice: String(flat.advice ?? ''),
    iframe: String(flat.iframe ?? ''),
  };
}

function mapSocialIconsFromElements(raw: unknown): FooterSocialIcon[] {
  if (!Array.isArray(raw)) return [];
  const out: FooterSocialIcon[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Record<string, unknown>;
    let inner = row.socialMedia ?? row.social_media;
    if (!inner || typeof inner !== 'object') {
      if (row.link != null || row.svg != null) inner = row;
      else continue;
    }
    const sm = flattenListItem(inner as Record<string, unknown>);
    const svgRaw = sm.svg ?? sm.SVG;
    out.push({
      id: Number(sm.id ?? row.id),
      link: String(sm.link ?? '#'),
      svgUrl: mediaUrl(svgRaw),
    });
  }
  return out;
}

function mapSocialBlock(raw: unknown): FooterSocialBlock | null {
  if (!raw || typeof raw !== 'object') return null;
  const flat = unwrapEntity(raw as Record<string, unknown>);
  const elements =
    flat.socialMediaElements ??
    flat.social_media_elements ??
    (flat as { SocialMediaElements?: unknown }).SocialMediaElements;
  const icons = mapSocialIconsFromElements(elements);
  const singTitle = String(flat.singTitle ?? flat.signTitle ?? '');
  if (!singTitle && icons.length === 0) return null;
  return { singTitle, icons };
}

export const FooterService = {
  async getFooter(): Promise<FooterData | null> {
    const query = qs.stringify(
      {
        populate: {
          logoSvg: true,
          column: {
            populate: {
              footerLink: true,
            },
          },
          newslleter: true,
          map: true,
          socialMedia: {
            populate: {
              socialMediaElements: {
                populate: '*',
              },
            },
          },
        },
      },
      { encodeValuesOnly: true }
    );

    try {
      const response = await api.get(`/footer?${query}`);
      const raw = response.data.data;
      if (!raw) return null;

      const data = unwrapEntity(raw as Record<string, unknown>);
      const logoSvgRaw = data.logoSvg ?? data.logoSVG;

      return {
        id: Number(data.id),
        documentId: data.documentId as string | undefined,
        logoText: String(data.logoText ?? ''),
        logDisplay: String(data.logDisplay ?? data.logoDisplay ?? 'text'),
        footerText: String(data.footerText ?? ''),
        logoSvgUrl: mediaUrl(logoSvgRaw),
        column: mapColumns(data.column),
        newslleter: mapNewsletter(data.newslleter ?? data.newsletter),
        map: mapMap(data.map),
        socialMedia: mapSocialBlock(data.socialMedia ?? data.social_media),
      };
    } catch (error) {
      console.error('Failed to fetch footer', error);
      return null;
    }
  },
};
