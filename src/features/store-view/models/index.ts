export interface StoreViewBlock {
  __component: string;
  id: number;
  [key: string]: any;
  manualProducts?: any[]

}

export interface StoreViewPageData {
  title: string;
  slug: string;
  seoDescription?: string;
  contentBlocks: StoreViewBlock[];
}
