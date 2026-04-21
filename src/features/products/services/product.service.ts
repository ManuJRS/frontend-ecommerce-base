import { api } from '@/core/api';
import qs from 'qs';
import type {
  StrapiCategory,
  StrapiProduct,
  StrapiProductImage,
  StrapiProductVariant,
  StrapiVariantAttribute,
} from '../models';

/** Convierte relaciones Strapi `{ data: [...] }` al array plano usado en el front. */
function unwrapEntry(entry: {
  id?: number;
  attributes?: Record<string, unknown>;
}): Record<string, unknown> & { id?: number } {
  if (entry?.attributes) return { id: entry.id, ...entry.attributes };
  return entry as Record<string, unknown> & { id?: number };
}

function normalizeImages(raw: unknown): StrapiProductImage[] {
  if (!raw) return [];
  const list = Array.isArray(raw)
    ? raw
    : (raw as { data?: unknown }).data != null
      ? Array.isArray((raw as { data: unknown[] }).data)
        ? (raw as { data: unknown[] }).data
        : [(raw as { data: unknown }).data]
      : [];
  return list.map(
    (item) => unwrapEntry(item as { id?: number; attributes?: Record<string, unknown> }) as StrapiProductImage
  );
}

function normalizeCategories(raw: unknown): StrapiCategory[] {
  if (!raw) return [];
  const list = Array.isArray(raw)
    ? raw
    : (raw as { data?: unknown }).data != null
      ? Array.isArray((raw as { data: unknown[] }).data)
        ? (raw as { data: unknown[] }).data
        : [(raw as { data: unknown }).data]
      : [];
  return list.map(
    (item) => unwrapEntry(item as { id?: number; attributes?: Record<string, unknown> }) as StrapiCategory
  );
}

function normalizeAttributeArray(raw: unknown): StrapiVariantAttribute[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: unknown) => {
      const row = item as Record<string, unknown>;
      return {
        name: row.name != null ? String(row.name).trim() : '',
        value: row.value != null ? String(row.value).trim() : '',
      };
    })
    .filter((a) => a.name && a.value);
}

function normalizeVariants(raw: unknown): StrapiProductVariant[] {
  const relation = raw as { data?: unknown } | undefined;
  const list = Array.isArray(raw)
    ? raw
    : relation?.data != null
      ? Array.isArray(relation.data)
        ? relation.data
        : [relation.data]
      : [];

  return list.map((item) => {
    const variantData = unwrapEntry(item as { id?: number; attributes?: Record<string, unknown> }) as
      | StrapiProductVariant
      | (StrapiProductVariant & { images?: unknown; attribute?: unknown });
    return {
      ...variantData,
      attribute: normalizeAttributeArray(variantData.attribute),
      images: normalizeImages(variantData.images),
    };
  });
}

export function normalizeStrapiProduct(raw: StrapiProduct): StrapiProduct {
  return {
    ...raw,
    images: normalizeImages(raw.images as unknown),
    categories: normalizeCategories(raw.categories as unknown),
    variants: normalizeVariants(raw.variants as unknown),
  };
}

/**
 * Un producto por slug (Strapi v5 devuelve `data` como array al filtrar).
 */
export async function fetchProductBySlug(slug: string): Promise<StrapiProduct | null> {
  const query = qs.stringify(
    {
      filters: { slug: { $eq: slug } },
      populate: {
        images: { populate: '*' },
        categories: { populate: '*' },
        variants: {
          populate: {
            attribute: true, 
            images: true
          }
        }
      },
      pagination: { limit: 1 },
    },
    { encodeValuesOnly: true }
  );

  const response = await api.get<{ data: StrapiProduct[] }>(`/products?${query}`);
  const first = response.data.data?.[0];
  if (!first) return null;
  return normalizeStrapiProduct(first);
}

/**
 * Productos de la misma categoría (por nombre), excluyendo el actual.
 * Alineado con el filtro Strapi: categories por nombre + documentId distinto.
 */
export async function fetchRelatedProductsByFirstCategory(
  categoryName: string,
  excludeDocumentId: string,
  limit = 4
): Promise<StrapiProduct[]> {
  const query = qs.stringify(
    {
      populate: '*',
      filters: {
        categories: {
          name: { $eq: categoryName },
        },
        documentId: { $ne: excludeDocumentId },
      },
      pagination: { limit },
    },
    { encodeValuesOnly: true }
  );

  const response = await api.get<{ data: StrapiProduct[] }>(`/products?${query}`);
  const list = response.data.data ?? [];
  return list.map((p) => normalizeStrapiProduct(p));
}
