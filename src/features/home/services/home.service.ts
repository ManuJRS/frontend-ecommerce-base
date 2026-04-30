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
                }
              },
            },
          },
        },
        { encodeValuesOnly: true }
      );
      const response = await api.get(`/home?${query}`);
      const data = response.data.data;

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
