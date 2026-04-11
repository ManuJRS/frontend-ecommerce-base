export interface StoreViewBlock {
  __component: string;
  id: number;
  [key: string]: any;
  manualProducts?: any[];
}

export interface ProductGridBlock extends StoreViewBlock {
  __component: 'blocks.product-grid';
  /** Texto por defecto de la etiqueta de stock bajo si el producto no trae título propio. */
  stockMinAdviceTitle?: string;
  stock_min_advice_title?: string;
}

export interface StoreViewPageData {
  title: string;
  slug: string;
  seoDescription?: string;
  contentBlocks: StoreViewBlock[];
}
