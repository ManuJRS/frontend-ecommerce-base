export type StrapiRelationWithSlug =
  | {
      id?: number;
      slug?: string;
      documentId?: string;
    }
  | {
      data?:
        | {
            id?: number;
            slug?: string;
            documentId?: string;
            attributes?: {
              slug?: string;
              documentId?: string;
            };
          }
        | null;
    }
  | null;

export interface SharedHeroCarouselItem {
  id: number;
  /** Compat con datos legacy/migrados. */
  carouselTitle?: string;
  heroCarouselTitle?: string;
  carouselText?: string;
  carouselButtonText?: string;
  carouselButtonLink?: string;
  productCarouselRelation?: StrapiRelationWithSlug;
  carouselMedia?: {
    id?: number;
    url?: string;
    mime?: string;
    alternativeText?: string | null;
  } | null;
  [key: string]: unknown;
}

export interface SharedHeroBlock {
  __component: 'shared.hero';
  id: number;
  heroMode?: 'normal' | 'carrousel' | 'carousel';
  heroTitle?: string;
  heroSpan?: string;
  heroText?: string;
  heroButtonText?: string;
  heroButtonLink?: string | null;
  overlayHero?: boolean;
  height?: 'Full' | 'Medium';
  heroMedia?: {
    id?: number;
    url?: string;
    mime?: string;
    alternativeText?: string | null;
  } | null;
  productRelation?: StrapiRelationWithSlug;
  heroCarousel?: SharedHeroCarouselItem[];
  [key: string]: unknown;
}
