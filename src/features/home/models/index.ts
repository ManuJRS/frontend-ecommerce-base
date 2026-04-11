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

export type HomeSectionBlock = HomeDynamicHeroBlock;

export interface HomePageData {
  id: number;
  documentId?: string;
  title: string;
  sections: HomeSectionBlock[];
}
