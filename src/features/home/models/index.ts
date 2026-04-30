/**
 * Bloques de la zona dinámica `homeSection` del single type Home en Strapi.
 * Reutilizamos la forma compatible con `DynamicHero` del store-view.
 */
export interface HomeDynamicHeroBlock {
  __component: 'blocks.dynamic-hero';
  id: number;
  title?: string;
  description?: string;
  buttonFullText?: string | null;
  buttonFullUrl?: string | null;
  buttonOutlineText?: string | null;
  buttonOutlineUrl?: string | null;
  tags?: { id: number; name: string }[];
  media?: { id: number; url: string; alternativeText?: string }[];
  [key: string]: unknown;
}

export interface HomeHeroCarouselItem {
  id: number;
  heroCarouselTitle?: string;
  heroCarouselText?: string;
  heroCarouselButtonText?: string;
  heroCarouselButtonLink?: string;
  productCarouselRelation?:
    | {
        id?: number;
        slug?: string;
        documentId?: string;
      }
    | {
        data?: {
          id?: number;
          slug?: string;
          documentId?: string;
          attributes?: {
            slug?: string;
            documentId?: string;
          };
        } | null;
      }
    | null;
  heroCarouselButtonMedia?: {
    id?: number;
    url?: string;
    alternativeText?: string | null;
  } | null;
}

export interface HomeHeroBlock {
  __component: 'home.hero-home';
  id: number;
  heroMode?: 'normal' | 'carrousel';
  heroTitle?: string;
  heroSpan?: string;
  heroText?: string;
  heroButtonText?: string;
  heroButtonLink?: string;
  overlayHero?: boolean;
  height?: 'Full' | 'Medium';
  heroMedia?: {
    id?: number;
    url?: string;
    alternativeText?: string | null;
  } | null;
  productRelation?:
    | {
        id?: number;
        slug?: string;
        documentId?: string;
      }
    | {
        data?: {
          id?: number;
          slug?: string;
          documentId?: string;
          attributes?: {
            slug?: string;
            documentId?: string;
          };
        } | null;
      }
    | null;
  heroCarousel?: HomeHeroCarouselItem[];
  [key: string]: unknown;
}

export type HomeSectionBlock = HomeDynamicHeroBlock | HomeHeroBlock;

export interface HomePageData {
  id: number;
  documentId?: string;
  title: string;
  sections: HomeSectionBlock[];
}
