import { api } from '@/core/api';
import qs from 'qs';

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
  const toArray = (responseData: unknown): DynamicPage[] => {
    const data = (responseData as { data?: unknown })?.data;
    return Array.isArray(data) ? (data as DynamicPage[]) : [];
  };

  const fallbackQuery = qs.stringify(
    {
      filters: { slug: { $eq: slug } },
      populate: '*',
    },
    { encodeValuesOnly: true }
  );

  try {
    const query = qs.stringify(
      {
        filters: { slug: { $eq: slug } },
        populate: {
          seo: true,
          content: {
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
              'shared.card': {
                populate: {
                  cardMedia: true,
                  cardButtonRelationProduct: true,
                  cardButtonRelationPages: true,
                },
              },
              'shared.intro': true,
              'shared.grid': {
                populate: {
                  gridRelation: {
                    populate: {
                      categoryImage: true,
                    },
                  },
                  gridManual: {
                    populate: {
                      gridManualImage: true,
                    },
                  },
                },
              },
              // 'shared.filters': {
              //   populate: {
              //     blogCategory: true,
              //   },
              // },
              // 'shared.featured-blog': {
              //   populate: {
              //     post: {
              //       populate: ['cover', 'category'],
              //     },
              //   },
              // },
              // 'shared.grid-blog': {
              //   populate: {
              //     blogManual: {
              //       populate: ['cover', 'category'],
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
              'shared.map': {
                populate: {
                  contactItems: true,
                  scheduleItems: true,
                },
              },
            },
          },
        },
      },
      { encodeValuesOnly: true }
    );
    const response = await api.get(`/pages?${query}`);
    return toArray(response.data);
  } catch (error) {
    console.warn('[page.service] detailed populate failed, trying fallback populate=*', error);
    try {
      const fallbackResponse = await api.get(`/pages?${fallbackQuery}`);
      return toArray(fallbackResponse.data);
    } catch (fallbackError) {
      console.error('[page.service] failed to fetch page by slug (fallback)', fallbackError);
      return [];
    }
  }
}
