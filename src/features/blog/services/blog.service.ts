import { api } from '@/core/api';
import qs from 'qs';

type UnknownRecord = Record<string, unknown>;
type CategoryRelationField = 'blogCategory' | 'BlogCategory' | 'category' | 'categories';

interface StrapiCollectionResponse<T> {
  data?: T[];
  meta?: unknown;
}

interface StrapiSingleResponse<T> {
  data?: T | null;
  meta?: unknown;
}

export interface BlogMedia {
  id?: number;
  documentId?: string;
  url?: string;
  alternativeText?: string | null;
  caption?: string | null;
  name?: string;
  formats?: UnknownRecord;
  [key: string]: unknown;
}

export interface BlogCategory {
  id?: number;
  documentId?: string;
  name?: string;
  slug?: string;
  description?: string | null;
  [key: string]: unknown;
}

export interface Post {
  id?: number;
  documentId?: string;
  title?: string;
  slug?: string;
  excerpt?: string | null;
  content?: string | null;
  author?: string | null;
  readingTime?: string | number | null;
  featured?: boolean | null;
  showRelatedPosts?: boolean | null;
  published?: string;
  createdAt?: string;
  updatedAt?: string;
  cover?: BlogMedia | null;
  image?: BlogMedia | null;
  blogCategory?: BlogCategory | null;
  BlogCategory?: BlogCategory[];
  category?: BlogCategory | null;
  categories?: BlogCategory[];
  [key: string]: unknown;
}

export interface BlogPageBlock extends UnknownRecord {
  id?: number | string;
  __component?: string;
}

export interface BlogPage {
  id?: number;
  documentId?: string;
  title?: string;
  subtitle?: string | null;
  description?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  heroImage?: BlogMedia | null;
  featuredPost?: Post | null;
  posts?: Post[];
  categories?: BlogCategory[];
  seo?: UnknownRecord | null;
  blogSection?: BlogPageBlock[];
  content?: BlogPageBlock[];
  published?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface FetchPostsParams {
  categoryId?: number | string;
  categoryDocumentId?: string;
  categorySlug?: string;
  categoryRelationField?: CategoryRelationField;
  publishedOnly?: boolean;
  dateOrder?: 'asc' | 'desc';
  sort?: string | string[];
  page?: number;
  pageSize?: number;
  limit?: number;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

function toStringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function relationData(raw: unknown): unknown {
  return isRecord(raw) && 'data' in raw ? raw.data : raw;
}

function relationArray(raw: unknown): unknown[] {
  const data = relationData(raw);
  if (Array.isArray(data)) return data;
  return data == null ? [] : [data];
}

function unwrapStrapiEntity(raw: unknown): UnknownRecord {
  const data = relationData(raw);
  if (!isRecord(data)) return {};

  const attributes = isRecord(data.attributes) ? data.attributes : {};
  const { attributes: _attributes, ...topLevel } = data;

  return {
    ...attributes,
    ...topLevel,
  };
}

function normalizeMedia(raw: unknown): BlogMedia | null {
  const entry = unwrapStrapiEntity(raw);
  if (Object.keys(entry).length === 0) return null;

  return {
    ...entry,
    id: toNumber(entry.id),
    documentId: toStringOrUndefined(entry.documentId),
    url: toStringOrUndefined(entry.url),
    alternativeText: (entry.alternativeText as string | null | undefined) ?? null,
    caption: (entry.caption as string | null | undefined) ?? null,
    name: toStringOrUndefined(entry.name),
  };
}

export function normalizeBlogCategory(raw: unknown): BlogCategory {
  const entry = unwrapStrapiEntity(raw);

  return {
    ...entry,
    id: toNumber(entry.id),
    documentId: toStringOrUndefined(entry.documentId),
    name: toStringOrUndefined(entry.name),
    slug: toStringOrUndefined(entry.slug),
    description: (entry.description as string | null | undefined) ?? null,
  };
}

export function normalizeBlogPost(raw: unknown): Post {
  const entry = unwrapStrapiEntity(raw);
  const blogCategoryRaw = relationData(entry.blogCategory);
  const categoryRaw = relationData(entry.category);
  const categories = relationArray(entry.categories).map(normalizeBlogCategory);
  const BlogCategory = relationArray(entry.BlogCategory).map(normalizeBlogCategory);

  return {
    ...entry,
    id: toNumber(entry.id),
    documentId: toStringOrUndefined(entry.documentId),
    title: toStringOrUndefined(entry.title),
    slug: toStringOrUndefined(entry.slug),
    excerpt: (entry.excerpt as string | null | undefined) ?? null,
    content: (entry.content as string | null | undefined) ?? null,
    author: (entry.author as string | null | undefined) ?? null,
    readingTime: (entry.readingTime as string | number | null | undefined) ?? null,
    featured: (entry.featured as boolean | null | undefined) ?? null,
    showRelatedPosts: (entry.showRelatedPosts as boolean | null | undefined) ?? null,
    published: toStringOrUndefined(entry.published),
    createdAt: toStringOrUndefined(entry.createdAt),
    updatedAt: toStringOrUndefined(entry.updatedAt),
    cover: normalizeMedia(entry.cover),
    image: normalizeMedia(entry.image),
    blogCategory: blogCategoryRaw == null ? null : normalizeBlogCategory(blogCategoryRaw),
    BlogCategory,
    category: categoryRaw == null ? null : normalizeBlogCategory(categoryRaw),
    categories,
  };
}

function normalizeBlogPage(raw: unknown): BlogPage | null {
  const entry = unwrapStrapiEntity(raw);
  if (Object.keys(entry).length === 0) return null;

  const blogSection = Array.isArray(entry.blogSection)
    ? (entry.blogSection as BlogPageBlock[])
    : undefined;
  const content = Array.isArray(entry.content)
    ? (entry.content as BlogPageBlock[])
    : undefined;

  return {
    ...entry,
    id: toNumber(entry.id),
    documentId: toStringOrUndefined(entry.documentId),
    title: toStringOrUndefined(entry.title),
    subtitle: (entry.subtitle as string | null | undefined) ?? null,
    description: (entry.description as string | null | undefined) ?? null,
    heroTitle: (entry.heroTitle as string | null | undefined) ?? null,
    heroSubtitle: (entry.heroSubtitle as string | null | undefined) ?? null,
    heroImage: normalizeMedia(entry.heroImage),
    featuredPost: relationData(entry.featuredPost) == null ? null : normalizeBlogPost(entry.featuredPost),
    posts: relationArray(entry.posts).map(normalizeBlogPost),
    categories: relationArray(entry.categories).map(normalizeBlogCategory),
    seo: isRecord(entry.seo) ? entry.seo : null,
    blogSection,
    content,
    published: toStringOrUndefined(entry.published),
    createdAt: toStringOrUndefined(entry.createdAt),
    updatedAt: toStringOrUndefined(entry.updatedAt),
  };
}

function buildCategoryFilter(params: FetchPostsParams): UnknownRecord | undefined {
  const filters: UnknownRecord = {};

  if (params.categoryId != null) {
    filters.id = { $eq: params.categoryId };
  }

  if (params.categoryDocumentId) {
    filters.documentId = { $eq: params.categoryDocumentId };
  }

  if (params.categorySlug) {
    filters.slug = { $eq: params.categorySlug };
  }

  return Object.keys(filters).length > 0 ? filters : undefined;
}

function buildPagination(params: FetchPostsParams): UnknownRecord | undefined {
  const pagination: UnknownRecord = {};

  if (params.page != null) pagination.page = params.page;
  if (params.pageSize != null) pagination.pageSize = params.pageSize;
  if (params.limit != null) pagination.limit = params.limit;

  return Object.keys(pagination).length > 0 ? pagination : undefined;
}

function buildPostExcludeFilter(currentPostId: number | string): UnknownRecord {
  const numericId = toNumber(currentPostId);

  return numericId != null
    ? { id: { $ne: numericId } }
    : { documentId: { $ne: String(currentPostId) } };
}

const BLOG_DYNAMIC_ZONE_POPULATE = {
  on: {
    'shared.hero': {
      populate: {
        heroMedia: true,
        productRelation: true,
        heroCarousel: {
          populate: {
            carouselMedia: true,
            productCarouselRelation: true,
          },
        },
      },
    },
    'shared.intro': true,
    'shared.newsletter-form': true,
    'shared.filters': {
      populate: {
        blogCategory: true,
      },
    },
    'shared.featured-blog': {
      populate: {
        post: {
          populate: ['cover', 'BlogCategory'],
        },
      },
    },
    'shared.grid-blog': {
      populate: {
        blogManual: {
          populate: ['cover', 'BlogCategory'],
        },
      },
    },
    // 'shared.': {
    //   populate: {
    //     manualProducts: {
    //       populate: ['images', 'categories'],
    //     },
    //     category: {
    //       populate: {
    //         products: {
    //           populate: ['images', 'categories'],
    //         },
    //       },
    //     },
    //   },
    // },
    'shared.grio-prioduct': {
      populate: {
        manualProducts: {
          populate: ['images', 'categories'],
        },
        category: {
          populate: {
            products: {
              populate: ['images', 'categories'],
            },
          },
        },
      },
    },
  },
} as const;

export async function fetchBlogPage(): Promise<BlogPage | null> {
  try {
    const query = qs.stringify(
      {
        populate: {
          blogSection: BLOG_DYNAMIC_ZONE_POPULATE,
        },
      },
      { encodeValuesOnly: true }
    );
    const response = await api.get<StrapiSingleResponse<unknown>>(`/blog?${query}`);
    return normalizeBlogPage(response.data.data);
  } catch (error) {
    console.warn('[blog.service] detailed populate failed, falling back to populate=*', error);
    try {
      const fallback = await api.get<StrapiSingleResponse<unknown>>(
        '/blog?populate[blogSection][populate]=*'
      );
      return normalizeBlogPage(fallback.data.data);
    } catch (fallbackError) {
      console.error('[blog.service] failed to fetch blog single type', fallbackError);
      return null;
    }
  }
}

export async function fetchPosts(params: FetchPostsParams = {}): Promise<Post[]> {
  const categoryFilter = buildCategoryFilter(params);
  const categoryRelationField = params.categoryRelationField ?? 'blogCategory';
  const filters = {
    ...(categoryFilter ? { [categoryRelationField]: categoryFilter } : {}),
    ...(params.publishedOnly ? { published: { $notNull: true } } : {}),
  };
  const query = qs.stringify(
    {
      populate: '*',
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      sort: params.sort ?? [`published:${params.dateOrder ?? 'desc'}`],
      pagination: buildPagination(params),
    },
    { encodeValuesOnly: true }
  );

  const response = await api.get<StrapiCollectionResponse<unknown>>(`/posts?${query}`);
  return (response.data.data ?? []).map(normalizeBlogPost);
}

export async function fetchPostBySlug(slug: string): Promise<Post | null> {
  const query = qs.stringify(
    {
      filters: { slug: { $eq: slug } },
      populate: '*',
    },
    { encodeValuesOnly: true }
  );

  const response = await api.get<StrapiCollectionResponse<unknown>>(`/posts?${query}`);
  const firstPost = response.data.data?.[0];

  return firstPost ? normalizeBlogPost(firstPost) : null;
}

export async function fetchRelatedPosts(
  categoryId: number | string,
  currentPostId: number | string,
  limit = 3,
  categoryRelationField: CategoryRelationField = 'blogCategory'
): Promise<Post[]> {
  const query = qs.stringify(
    {
      populate: '*',
      filters: {
        [categoryRelationField]: {
          id: { $eq: categoryId },
        },
        ...buildPostExcludeFilter(currentPostId),
      },
      sort: ['published:desc'],
      pagination: { limit },
    },
    { encodeValuesOnly: true }
  );

  const response = await api.get<StrapiCollectionResponse<unknown>>(`/posts?${query}`);
  return (response.data.data ?? []).map(normalizeBlogPost);
}
