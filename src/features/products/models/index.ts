/** Producto Strapi (REST v5) tal como lo devuelve `populate=*`. */
export interface StrapiCategory {
  id?: number;
  documentId?: string;
  name?: string;
  slug?: string;
}

export interface StrapiProductImage {
  id?: number;
  documentId?: string;
  url?: string;
  alternativeText?: string | null;
  name?: string;
}

export interface StrapiProduct {
  id: number;
  documentId: string;
  name: string;
  slug?: string;
  sku?: string;
  price: number;
  stock?: number;
  description?: string | null;
  discountPercentage?: number | null;
  discountedPrice?: number | null;
  newProduct?: boolean | null;
  bestProduct?: boolean | null;
  stockMinAdvice?: number | null;
  stockMinAdviceTitle?: string | null;
  showRelatedProducts?: boolean | null;
  images?: StrapiProductImage[];
  categories?: StrapiCategory[];
}
