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

export interface HomeGridManualItem {
  id: number;
  gridManualTitle?: string;
  gridManualButtonText?: string;
  gridManualButtonLink?: string | null;
  gridManualImage?: {
    id?: number;
    url?: string;
    alternativeText?: string | null;
  } | null;
}

export interface HomeGridRelationItem {
  id: number;
  name?: string;
  slug?: string;
  documentId?: string;
  categoryImage?: {
    id?: number;
    url?: string;
    alternativeText?: string | null;
  } | null;
  image?: {
    id?: number;
    url?: string;
    alternativeText?: string | null;
  } | null;
  [key: string]: unknown;
}

export interface HomeSharedNewsletterFormBlock {
  __component: 'shared.newsletter-form';
  id: number;
  newsletterSpan?: string;
  newsletterTitle?: string;
  newsletterInputText?: string;
  newsletterButtonText?: string;
  [key: string]: unknown;
}

export interface HomeSharedIntroBlock {
  __component: 'shared.intro';
  id: number;
  introSpan?: string;
  introTitle?: string;
  introText?: string;
  introButtonText?: string;
  introButtonLink?: string | null;
  introBackground?: boolean;
  introAlignment?: 'Left' | 'Center' | 'Right';
  /** `normal` → md:py-16, `double` → md:py-32 (móvil siempre py-16) */
  introPaddingY?: 'normal' | 'double';
  [key: string]: unknown;
}

export interface HomeSharedCardBlock {
  __component: 'shared.card';
  id: number;
  cardSpan?: string;
  cardText?: string;
  cardButtonText?: string;
  cardButtonLink?: string | null;
  cardBackground?: boolean;
  cardAlignment?: 'Left' | 'Right';
  cardTitle?: string;
  cardMedia?: {
    id?: number;
    url?: string;
    mime?: string;
    alternativeText?: string | null;
  } | null;
  cardButtonRelationProduct?:
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
  [key: string]: unknown;
}

export interface HomeGridBlock {
  __component: 'home.grid-home';
  id: number;
  gridTitle?: string;
  gridButtonText?: string;
  gridButtonLink?: string | null;
  gridBackground?: boolean;
  gridRelationButtonText?: string;
  girdText?: string;
  gridMode?: 'Auto' | 'Manual';
  gridRelation?: HomeGridRelationItem[];
  griManual?: HomeGridManualItem[];
  [key: string]: unknown;
}

export type HomeSectionBlock =
  | HomeDynamicHeroBlock
  | HomeHeroBlock
  | HomeGridBlock
  | HomeSharedCardBlock
  | HomeSharedIntroBlock
  | HomeSharedNewsletterFormBlock;

export interface HomePageData {
  id: number;
  documentId?: string;
  title: string;
  sections: HomeSectionBlock[];
}
