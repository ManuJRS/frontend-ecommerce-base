import { ref, watch, computed, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import type { StrapiProduct } from '../models';
import {
  fetchProductBySlug,
  fetchRelatedProductsByFirstCategory,
} from '../services/product.service';
import { resolveStrapiMediaUrl } from '@/shared/utils/strapiMedia';

/** Debe coincidir con `<title>` en `index.html` para restaurar al salir de la ficha. */
const SITE_TITLE = 'Tienda E-commerce';

/** Resuelve URL de un media Strapi (campo `url` o `formats.*` si falta). */
function imageEntryToResolvedUrl(img: Record<string, unknown>): string {
  const direct = img.url;
  if (direct != null && String(direct).trim() !== '') {
    return resolveStrapiMediaUrl(String(direct));
  }
  const formats = img.formats as Record<string, { url?: string }> | undefined;
  if (formats && typeof formats === 'object') {
    const nested =
      formats.large?.url ||
      formats.medium?.url ||
      formats.small?.url ||
      formats.thumbnail?.url;
    if (nested) return resolveStrapiMediaUrl(nested);
  }
  return '';
}

function normalizeProductImages(product: StrapiProduct | null): string[] {
  if (!product?.images?.length) return [];
  return product.images
    .map((img) => imageEntryToResolvedUrl(img as Record<string, unknown>))
    .filter(Boolean);
}

export function useProduct() {
  const route = useRoute();

  const slug = computed(() => String(route.params.slug ?? ''));

  const product = ref<StrapiProduct | null>(null);
  const relatedProducts = ref<StrapiProduct[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const galleryUrls = computed(() => normalizeProductImages(product.value));

  function applyDocumentTitle(name: string | undefined) {
    if (typeof document === 'undefined') return;
    document.title = name ? `${name} | ${SITE_TITLE}` : SITE_TITLE;
  }

  watch(
    () => product.value?.name,
    (name) => {
      applyDocumentTitle(name);
    },
    { immediate: true }
  );

  onBeforeUnmount(() => {
    applyDocumentTitle(undefined);
  });

  async function load() {
    const slugValue = slug.value;
    if (!slugValue) {
      product.value = null;
      relatedProducts.value = [];
      error.value = 'Producto no encontrado.';
      return;
    }

    loading.value = true;
    error.value = null;
    product.value = null;
    relatedProducts.value = [];

    try {
      const p = await fetchProductBySlug(slugValue);
      if (!p) {
        error.value = 'Producto no encontrado.';
        return;
      }
      product.value = p;

      const firstCatName = p.categories?.[0]?.name;
      if (p.showRelatedProducts === true && firstCatName) {
        relatedProducts.value = await fetchRelatedProductsByFirstCategory(
          firstCatName,
          p.documentId,
          4
        );
      }
    } catch (e) {
      console.error('useProduct load', e);
      error.value = 'No se pudo cargar el producto.';
      product.value = null;
    } finally {
      loading.value = false;
    }
  }

  watch(
    () => route.params.slug,
    () => {
      void load();
    },
    { immediate: true }
  );

  function effectivePrice(p: StrapiProduct): number {
    const d = p.discountedPrice;
    if (d != null && !Number.isNaN(Number(d))) return Number(d);
    return Number(p.price) || 0;
  }

  function hasDiscount(p: StrapiProduct): boolean {
    const pct = p.discountPercentage;
    return pct != null && Number(pct) > 0;
  }

  function productImageUrl(p: StrapiProduct): string {
    const raw = p.images?.[0]?.url;
    return resolveStrapiMediaUrl(raw);
  }

  function productStockNumber(p: StrapiProduct): number | null {
    const s = p.stock;
    if (s == null) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function productStockMinAdvice(p: StrapiProduct): number | null {
    const record = p as unknown as Record<string, unknown>;
    const raw = p.stockMinAdvice ?? record.stock_min_advice;
    if (raw == null || raw === '') return null;
    const n = typeof raw === 'number' ? raw : Number.parseFloat(String(raw));
    return Number.isFinite(n) ? Math.floor(n) : null;
  }

  /** Título de la etiqueta de stock bajo (misma lógica que ProductGrid, sin bloque CMS). */
  function resolveStockMinAdviceTitle(p: StrapiProduct): string {
    const record = p as unknown as Record<string, unknown>;
    const t = p.stockMinAdviceTitle ?? record.stock_min_advice_title;
    if (t != null && String(t).trim() !== '') return String(t).trim();
    return '¡Disponibles!';
  }

  /** Muestra aviso de stock bajo si `stock > 0` y `stock <= stockMinAdvice`. */
  function showLowStockLabel(p: StrapiProduct): boolean {
    const stock = productStockNumber(p);
    const advice = productStockMinAdvice(p);
    if (stock === null || advice === null) return false;
    if (stock <= 0) return false;
    return stock <= advice;
  }

  function isOutOfStock(p: StrapiProduct): boolean {
    return productStockNumber(p) === 0;
  }

  return {
    slug,
    product,
    relatedProducts,
    galleryUrls,
    loading,
    error,
    load,
    effectivePrice,
    hasDiscount,
    productImageUrl,
    productStockNumber,
    productStockMinAdvice,
    resolveStockMinAdviceTitle,
    showLowStockLabel,
    isOutOfStock,
  };
}
