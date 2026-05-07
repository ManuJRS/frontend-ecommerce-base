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

/** Ítems del modo Manual del bloque `shared.grid`. */
export interface SharedGridManualItem {
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

/** Categorías en modo Auto (`gridRelation`). */
export interface SharedGridRelationItem {
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

export interface SharedGridBlock {
  __component: 'shared.grid';
  id: number;
  gridTitle?: string;
  gridButtonText?: string;
  gridButtonLink?: string | null;
  gridRelationButtonText?: string;
  /** Campo tal cual en Strapi (typo intencional). */
  girdText?: string;
  gridMode?: 'Auto' | 'Manual';
  gridBackground?: boolean;
  gridRelation?: SharedGridRelationItem[];
  gridManual?: SharedGridManualItem[];
  [key: string]: unknown;
}

/** Fila de contacto en `shared.map` (teléfono, email, etc.). */
export interface SharedMapContactItem {
  id: number;
  item?: string;
  [key: string]: unknown;
}

/** Fila de horario en `shared.map`. */
export interface SharedMapScheduleItem {
  id: number;
  days?: string;
  hours?: string;
  [key: string]: unknown;
}

export interface SharedMapBlock {
  __component: 'shared.map';
  id: number;
  /** URL del mapa o snippet HTML del iframe; vacío → sin mapa. */
  iframe?: string | null;
  span?: string;
  title?: string;
  locationTitle?: string;
  locationDescription?: string;
  contactTitle?: string;
  scheduleTitle?: string;
  background?: boolean;
  contactItems?: SharedMapContactItem[];
  scheduleItems?: SharedMapScheduleItem[];
  [key: string]: unknown;
}
