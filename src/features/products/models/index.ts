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

/** Componente repetible en ProductVariant (Strapi): name = tipo, value = opción. */
export interface StrapiVariantAttribute {
  name?: string;
  value?: string;
}

export interface StrapiProductVariant {
  id?: number;
  documentId?: string;
  sku?: string;
  variantSku?: string;
  productName?: string;
  variantName?: string;
  variantDescription?: string | null;
  variantDiscount?: number | null;
  /** Precio final con descuento de variante (Strapi), si existe. */
  variantPriceWithDiscount?: number | null;
  price?: number | null;
  stock?: number | null;
  attribute?: StrapiVariantAttribute[];
  images?: StrapiProductImage[];
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
  variants?: StrapiProductVariant[];
}
