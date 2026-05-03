import { api } from '@/core/api';
import qs from 'qs';
import type { HomePageData } from '../models';

export const HomeService = {
  async getHomePage(): Promise<HomePageData | null> {
    try {
      const query = qs.stringify(
        {
          populate: {
            homeSection: {
              on: {
                'home.hero-home': {
                  populate: {
                    heroMedia: true,
                    productRelation: true,
                    heroCarousel: {
                      populate: {
                        heroCarouselButtonMedia: true,
                        productCarouselRelation: true,
                      },
                    },
                  }
                },
                'home.grid-home': {
                    populate: {
                      gridRelation: {
                        populate: {
                          categoryImage: true,
                        },
                      },
                      griManual: {
                        populate: {
                          gridManualImage: true,
                        },
                      },
                  },
                },
                'shared.card': {
                  populate: {
                    cardMedia: true,
                    cardButtonRelationProduct: true,
                  },
                },
                'shared.intro': true,
                'shared.newsletter-form': true,
              },
            },
          },
        },
        { encodeValuesOnly: true }
      );
      const response = await api.get(`/home?${query}`);
      const data = response.data.data;
      console.log('[home.service] /api/home raw response:', response.data);
      console.log('[home.service] /api/home homeSection:', data?.homeSection);
      const gridHomeBlocks = (data?.homeSection ?? []).filter(
        (block: { __component?: string }) => block.__component === 'home.grid-home'
      );
      console.log('[home.service] /api/home grid-home blocks:', gridHomeBlocks);

      if (!data) return null;

      return {
        id: data.id,
        documentId: data.documentId,
        title: data.Title ?? data.title ?? '',
        sections: data.homeSection ?? [],
      };
    } catch (error) {
      console.error('Failed to fetch home page', error);
      return null;
    }
  },
};
