import { api } from '@/core/api';
import qs from 'qs';
import type { StoreViewPageData } from '../models';

export const StoreViewService = {
  async getStoreViewPage(): Promise<StoreViewPageData | null> {
    const query = qs.stringify(
      {
        populate: {
          StoreView: {
            on: {
              'blocks.product-grid': {
                populate: {
                  manualProducts: {
                    populate: ['images']
                  }
                }
              },
              'blocks.dynamic-hero': {
                populate: '*'
              },
              'config.sort-by': {
                populate: '*'
              }
            }
          }
        }
      },
      { encodeValuesOnly: true }
    );

    try {
      const response = await api.get(`/store-view?${query}`);
      const data = response.data.data;
      console.log('DATA CRUDA DE STRAPI:', data);

      if (!data) return null;

      return {
        title: data.title,
        slug: data.slug,
        contentBlocks: data.StoreView || [],
      };
    } catch (error) {
      console.error('Failed to fetch store view', error);
      return null;
    }
  },
};