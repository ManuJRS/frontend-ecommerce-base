import { api } from '@/core/api';

export interface DynamicPage {
  id?: number;
  documentId?: string;
  slug?: string;
  title?: string;
  seo?: {
    metaTitle?: string;
    [key: string]: unknown;
  } | null;
  content?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export async function fetchPageBySlug(slug: string): Promise<DynamicPage[]> {
  try {
    const safeSlug = encodeURIComponent(slug);
    const response = await api.get(`/pages?filters[slug][$eq]=${safeSlug}&populate=*`);
    return Array.isArray(response.data?.data) ? (response.data.data as DynamicPage[]) : [];
  } catch (error) {
    console.error('[page.service] failed to fetch page by slug', error);
    return [];
  }
}
