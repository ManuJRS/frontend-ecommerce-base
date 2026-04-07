export interface StrapiDynamicBlockDTO {
  __component: string;
  id: number;
  [key: string]: any;
}

export interface StrapiStoreViewDTO {
  title: string;
  slug: string;
  contentBlocks: StrapiDynamicBlockDTO[];
}
