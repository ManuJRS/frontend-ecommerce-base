import { api } from '@/core/api';
import type { HomePageData } from '../models';

export const HomeService = {
  async getHomePage(): Promise<HomePageData | null> {
    try {
      const response = await api.get('/home');
      const data = response.data.data;

      if (!data) return null;

      console.log('data', data);

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
