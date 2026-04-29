<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '@/core/api';
import qs from 'qs';
import type { ProductGridBlock } from '../models';
import { useStoreViewStore } from '../stores/storeView.store';
import type { AppliedProductFilters } from '../stores/storeView.store';
import { useCartStore } from '@/features/cart/stores/cart.store';
import { useCartConfigStore } from '@/features/cart/stores/cartConfig.store';
import { getProductDescriptionHtmlExcerpt } from '@/features/products/utils/renderProductMarkdown';
import { useFavoritesStore } from '@/features/favorites/store/favorites.store';

const favoritesStore = useFavoritesStore();

function handleFavoriteClick(product: any) {
  favoritesStore.toggleFavorite(product);
}

const props = defineProps<{
  block: ProductGridBlock;
}>();

const rawProducts = ref<any[]>([]);
const isLoadingProducts = ref(false);
const store = useStoreViewStore();
const cartStore = useCartStore();
const cartConfig = useCartConfigStore();

const currencyCode = computed(() => cartConfig.currencyCode);
const currencySymbol = computed(() => cartConfig.currencySymbol);

function hasVariantOptions(product: Record<string, unknown>): boolean {
  const v = product.variants as unknown[] | undefined;
  return Array.isArray(v) && v.length > 0;
}

/** Sin esto, el carrito agrupa por `id` del producto padre y solo cuenta la primera variante. */
function needsVariantSelection(product: Record<string, unknown>): boolean {
  if (!hasVariantOptions(product)) return false;
  return product._activeVariantId == null && product._selectedVariant == null;
}

function addToCart(product: Record<string, unknown>) {
  if (needsVariantSelection(product)) return;
  if (isOutOfStock(product)) return;
  cartStore.addProduct(buildCartLineProduct(product));
}

/** Línea de carrito alineada con ProductView: `id` único por variante + `documentId` de la variante. */
function buildCartLineProduct(product: Record<string, unknown>): Record<string, unknown> {
  if (!hasVariantOptions(product)) {
    return JSON.parse(JSON.stringify(product)) as Record<string, unknown>;
  }
  const variants = product.variants as Record<string, unknown>[];
  const variant =
    (product._selectedVariant as Record<string, unknown> | undefined) ??
    variants.find((x) => x.id === product._activeVariantId);
  if (!variant) {
    return JSON.parse(JSON.stringify(product)) as Record<string, unknown>;
  }

  const parentId = product.id as number;
  const parentDocId = product.documentId as string | undefined;
  const vDoc = variant.documentId ?? variant.id;
  const unitFinal =
    variant.variantPriceWithDiscount != null && variant.variantPriceWithDiscount !== ''
      ? Number(variant.variantPriceWithDiscount)
      : variant.price != null
        ? Number(variant.price)
        : Number(product.price) || 0;

  return {
    ...JSON.parse(JSON.stringify(product)),
    id: `${parentId}-${String(vDoc ?? 'variant')}`,
    variantId: variant.documentId != null ? String(variant.documentId) : String(variant.id ?? ''),
    documentId: variant.documentId ?? parentDocId,
    name: variantOnlyTitle(variant) || String(product.name ?? ''),
    sku: variant.variantSku ?? variant.sku ?? product.sku,
    variantSku: variant.variantSku ?? variant.sku,
    price: variant.price ?? product.price,
    discountedPrice: unitFinal,
    stock: variant.stock,
    discountPercentage: variant.variantDiscount ?? product.discountPercentage,
    images:
      Array.isArray(variant.images) && (variant.images as unknown[]).length > 0
        ? variant.images
        : product.images,
    parentProductDocumentId: parentDocId,
    variantName: variantOnlyTitle(variant) || String(product.name ?? ''),
    variantPriceWithDiscount:
      variant.variantPriceWithDiscount != null && variant.variantPriceWithDiscount !== ''
        ? Number(variant.variantPriceWithDiscount)
        : undefined,
  };
}

function addToCartButtonLabel(product: Record<string, unknown>): string {
  if (needsVariantSelection(product)) return 'Selecciona una variante';
  if (isOutOfStock(product)) return 'Agotado';
  return 'Add to Cart';
}

function addToCartDisabled(product: Record<string, unknown>): boolean {
  return needsVariantSelection(product) || isOutOfStock(product);
}

/** Ruta de ficha de producto (`/tienda/:slug`); vacío si no hay slug en Strapi. */
function productDetailTo(product: Record<string, unknown>): string {
  const slug = product?.slug;
  if (slug != null && String(slug).trim() !== '') return `/tienda/${String(slug).trim()}`;
  return '';
}

/** Precio efectivo leyendo `price` / `discountedPrice` actuales (puede mutar al elegir variante). */
function effectivePriceFromFields(p: any): number {
  const d = p.discountedPrice;
  if (d != null && d !== '' && !Number.isNaN(Number(d))) return Number(d);
  const pr = p.price;
  return pr != null && pr !== '' ? Number(pr) || 0 : 0;
}

/**
 * Precio congelado al cargar la lista (orden estable; filtros por rango no saltan al cambiar variante).
 * Si no hubo captura, cae al cálculo por campos actuales.
 */
function baselineEffectivePrice(p: any): number {
  const raw = p._gridSortEffectivePrice;
  if (raw != null && raw !== '' && Number.isFinite(Number(raw))) return Number(raw);
  return effectivePriceFromFields(p);
}

function captureProductBaselines(p: Record<string, unknown>) {
  if (p._gridSortBaselineCaptured) return;
  p._gridSortEffectivePrice = effectivePriceFromFields(p);
  if (p._originalName == null && p.name != null) {
    p._originalName = String(p.name);
  }
  p._gridSortBaselineCaptured = true;
}

function captureBaselinesForList(products: unknown[]) {
  for (const item of products) {
    captureProductBaselines(item as Record<string, unknown>);
  }
}

function productMatchesFilters(p: any, f: AppliedProductFilters): boolean {
  if (f.priceRange) {
    const price = baselineEffectivePrice(p);
    if (price < f.priceRange.min || price > f.priceRange.max) return false;
  }

  if (f.categoryIds.length > 0) {
    const ids = (p.categories || []).map((c: { id: number }) => c.id);
    if (!f.categoryIds.some((cid) => ids.includes(cid))) return false;
  }

  if (f.availabilityOnly) {
    if (p.inStock === false) return false;
    const sn = productStockNumber(p);
    if (sn !== null && sn <= 0) return false;
  }

  return true;
}

function sortList(list: any[], sortBy: string): any[] {
  const sorted = [...list];
  if (sortBy === 'lowest') {
    sorted.sort((a, b) => {
      const diff = baselineEffectivePrice(a) - baselineEffectivePrice(b);
      if (diff !== 0) return diff;
      return (a.id || 0) - (b.id || 0);
    });
  } else if (sortBy === 'highest') {
    sorted.sort((a, b) => {
      const diff = baselineEffectivePrice(b) - baselineEffectivePrice(a);
      if (diff !== 0) return diff;
      return (a.id || 0) - (b.id || 0);
    });
  } else if (sortBy === 'newest') {
    sorted.sort((a, b) => (b.id || 0) - (a.id || 0));
  } else if (sortBy === 'best-sellers') {
    sorted.sort((a, b) => {
      const valA = a.isBestseller || a.bestseller || a.bestProduct ? 1 : 0;
      const valB = b.isBestseller || b.bestseller || b.bestProduct ? 1 : 0;
      return valB - valA;
    });
  } else {
    sorted.sort((a, b) => (a.id || 0) - (b.id || 0));
  }
  return sorted;
}

const displayProducts = computed(() => {
  const f = store.appliedProductFilters;
  let list = rawProducts.value;
  if (f) {
    list = list.filter((p) => productMatchesFilters(p, f));
  }
  return sortList(list, store.currentSortBy);
});

function productStockNumber(product: any): number | null {
  const s = product?.stock ?? product?.attributes?.stock;
  if (s == null || s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function productStockMinAdvice(product: any): number | null {
  const p = product as Record<string, unknown>;
  const attrs = p.attributes as Record<string, unknown> | undefined;
  const raw =
    p.stockMinAdvice ??
    p.stock_min_advice ??
    attrs?.stockMinAdvice ??
    attrs?.stock_min_advice;
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number.parseFloat(String(raw));
  return Number.isFinite(n) ? Math.floor(n) : null;
}

function resolveStockMinAdviceTitle(product: any): string {
  const p = product as Record<string, unknown>;
  const attrs = p.attributes as Record<string, unknown> | undefined;
  const fromProduct =
    p.stockMinAdviceTitle ??
    p.stock_min_advice_title ??
    attrs?.stockMinAdviceTitle ??
    attrs?.stock_min_advice_title;
  if (fromProduct != null && fromProduct !== '') return String(fromProduct);
  const b = props.block as Record<string, unknown>;
  const fromBlock = b.stockMinAdviceTitle ?? b.stock_min_advice_title;
  if (fromBlock != null && fromBlock !== '') return String(fromBlock);
  return '¡Disponibles!';
}

/** Muestra la etiqueta si hay stock y `stock <= stockMinAdvice` del producto. */
function showLowStockLabel(product: any): boolean {
  const stock = productStockNumber(product);
  const advice = productStockMinAdvice(product);
  if (stock === null || advice === null) return false;
  if (stock <= 0) return false;
  return stock <= advice;
}

function isOutOfStock(product: any): boolean {
  return productStockNumber(product) === 0;
}

onMounted(async () => {
  await cartConfig.fetchFullCartConfig();
  if (props.block.dataSource === 'manual_selection') {
    rawProducts.value = [...(props.block.manualProducts || [])];
    captureBaselinesForList(rawProducts.value);
  } else if (props.block.dataSource === 'by_category') {
    if (props.block.category && props.block.category.products) {
      const limit = props.block.itemsLimit || 12;
      rawProducts.value = props.block.category.products.slice(0, limit);
      captureBaselinesForList(rawProducts.value);
    } else {
      console.warn('La categoría no tiene productos asignados.');
      rawProducts.value = [];
    }
  } else if (props.block.dataSource === 'all_products') {
    isLoadingProducts.value = true;
    try {
      const queryObj: any = {
        populate: {
          images: { populate: '*' },
          categories: { populate: '*' },
          variants: {
            populate: {
              attribute: true,
              images: true
            }
          }
        },
        pagination: { limit: props.block.itemsLimit || 12 },
        sort: ['createdAt:desc'],
      };

      const query = qs.stringify(queryObj, { encodeValuesOnly: true });
      const response = await api.get(`/products?${query}`);
      rawProducts.value = response.data.data || [];
      captureBaselinesForList(rawProducts.value);
    } catch (error) {
      console.error('Error obteniendo todos los productos:', error);
    } finally {
      isLoadingProducts.value = false;
    }
  }
});

/** Nombre solo de la variante (sin prefijo del producto padre). */
function variantOnlyTitle(variant: Record<string, unknown> | null | undefined): string {
  if (!variant) return '';
  const vn = variant.variantName;
  if (vn != null && String(vn).trim() !== '') return String(vn).trim();
  const an = variant.attrName;
  if (an != null && String(an).trim() !== '') return String(an).trim();
  const attrs = variant.attribute as { name?: string; value?: string }[] | undefined;
  if (Array.isArray(attrs) && attrs.length > 0) {
    const parts = attrs
      .map((a) => {
        if (a?.name != null && String(a.name).trim() !== '' && a?.value != null && String(a.value).trim() !== '') {
          return `${String(a.name).trim()}: ${String(a.value).trim()}`;
        }
        return a?.value != null ? String(a.value).trim() : '';
      })
      .filter((s) => s !== '');
    if (parts.length) return parts.join(' · ');
  }
  return '';
}

/** Título en grid: nombre de variante solo tras elegir chip; si no, nombre base del producto. */
function gridProductTitle(product: Record<string, unknown>): string {
  const variants = product.variants as Record<string, unknown>[] | undefined;
  if (variants && Array.isArray(variants) && variants.length > 0) {
    let v = product._selectedVariant as Record<string, unknown> | undefined;
    if (!v && product._activeVariantId != null) {
      v = variants.find((x) => x.id === product._activeVariantId);
    }
    if (v) {
      const t = variantOnlyTitle(v);
      if (t) return t;
    }
  }
  if (product._originalName != null && String(product._originalName).trim() !== '') {
    return String(product._originalName).trim();
  }
  return product.name != null ? String(product.name) : '';
}

/** * Cambia los datos visuales del producto por los de la variante seleccionada
 */
function selectVariant(product: any, variant: any) {
  // 1. Guardamos el nombre e imágenes originales para poder hacer "swaps" limpios
  if (!product._originalName) {
    product._originalName = product.name;
  }
  if (!product._originalImages) {
    product._originalImages = [...(product.images || [])];
  }

  // 2. Nombre visible y carrito: solo el nombre de la variante
  const only = variantOnlyTitle(variant as Record<string, unknown>);
  product.name = only || product._originalName;

  // 3. Actualización de datos numéricos y de stock
  product._selectedVariant = variant;
  product.price = variant.price;
  product.discountedPrice = variant.variantPriceWithDiscount;
  product.variantSku = variant.variantSku;
  product.stock = variant.stock;
  product.discountPercentage = variant.variantDiscount; // Para que los badges de % se actualicen
  
  // 4. Cambio de Imagen: Si la variante tiene fotos, la ponemos de primera
  if (variant.images && variant.images.length > 0) {
    product.images = [variant.images[0], ...product._originalImages];
  } else {
    product.images = [...product._originalImages];
  }
  
  // 5. Estado de selección para los botones (UI)
  product._activeVariantId = variant.id;
}

function getVariantLabel(variant: any): string {
  // 1. Intentamos sacar el valor del componente 'attribute' (ej: 'M', 'Rojo')
  if (variant.attribute && Array.isArray(variant.attribute) && variant.attribute.length > 0) {
    // Tomamos el valor del primer atributo
    return variant.attribute[0].value; 
  }

  // 2. Si no hay componente, intentamos con 'variantName' 
  // (Pero solo si no es igual al nombre del producto)
  if (variant.variantName) {
    return variant.variantName;
  }

  return 'Var';
}
</script>

<template>
  <section class="py-8 bg-new-surface-bg px-4 md:px-8">
    <div class="flex justify-between items-end mb-12">
      <h3 class="text-xs font-bold uppercase tracking-[0.3em] text-on-surface-variant">{{ block.title || 'The Collection' }}</h3>
      <p v-if="block.showItemsQuantity" class="text-xs text-on-surface-variant">Mostrando {{ displayProducts.length }} productos</p>
    </div>
    
    <div v-if="isLoadingProducts" class="flex justify-center py-20">
      <p class="text-xs font-bold uppercase tracking-widest text-on-surface-variant animate-pulse">
        Loading Collection...
      </p>
    </div>

    <div v-else-if="displayProducts.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-16 gap-x-8">
      
      <div
        v-for="product in displayProducts"
        :key="product.id"
        class="group"
        :class="isOutOfStock(product) ? 'cursor-not-allowed' : 'cursor-pointer'"
      >
        <div
          class="group/image relative mb-6 aspect-[3/4] overflow-hidden bg-surface-container-low transition-opacity duration-300"
          :class="isOutOfStock(product) ? 'opacity-60' : ''"
        >
          <img
            v-if="product.images && product.images.length > 0"
            :src="product.images[0].url"
            :alt="gridProductTitle(product)"
            class="relative z-0 h-full w-full object-cover transition-transform duration-500"
            :class="
              isOutOfStock(product)
                ? 'grayscale'
                : 'group-hover:scale-105'
            "
          />
          <div v-else class="relative z-0 w-full h-full flex items-center justify-center text-gray-400 text-sm bg-gray-100">
            Sin Imagen
          </div>

          <RouterLink
            v-if="productDetailTo(product)"
            :to="productDetailTo(product)"
            class="absolute inset-0 z-[5]"
            :aria-label="`Ver producto: ${gridProductTitle(product)}`"
          />

          <div class="flex flex-col gap-2 absolute bottom-4 right-4 z-[6] items-end pointer-events-none">
          <div
            v-if="product.newProduct"
            class="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2 py-1 shadow-sm opacity-100 group-hover:opacity-0 transition-opacity duration-300"
          >
            <span class="material-symbols-outlined text-[10px] text-primary">new_releases</span>
            <span class="text-[9px] font-bold uppercase tracking-[0.2em] text-primary">Nuevo</span>
          </div>

          <div 
            v-if="product.bestProduct"
            class="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2 py-1 shadow-sm opacity-100 group-hover:opacity-0 transition-opacity duration-300"
          >
            <span class="material-symbols-outlined text-[10px] text-primary">star</span>
            <span class="text-[9px] font-bold uppercase tracking-[0.2em] text-primary">Bestseller</span>
          </div>
          </div>
          <button
            type="button"
            :disabled="addToCartDisabled(product)"
            class="absolute bottom-4 left-4 right-4 z-20 py-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 translate-y-12 opacity-0 pointer-events-none group-hover/image:translate-y-0 group-hover/image:opacity-100 group-hover/image:pointer-events-auto"
            :class="
              addToCartDisabled(product)
                ? 'cursor-not-allowed bg-on-surface-variant/30 text-white'
                : 'bg-primary text-on-primary'
            "
            @click.stop="addToCart(product)"
          >
            {{ addToCartButtonLabel(product) }}
          </button>
          <div class="absolute top-4 left-4 z-[6] flex flex-col gap-1 items-start pointer-events-none">
            <div v-if="block.showDiscountBadge">
              <div
                v-if="product.discountPercentage && product.discountPercentage > 0"
                class="flex flex-col gap-1"
              >
                <div
                  v-if="block.badgeFormat === 'amount'"
                  class="flex flex-col items-start bg-white px-2 py-1 leading-none"
                >
                  <span class="text-[10px] font-bold uppercase tracking-widest text-primary">
                    Ahorra ${{
                      (
                        product.price -
                        (product.discountedPrice ||
                          (product.price - product.price * (product.discountPercentage / 100)))
                      ).toFixed(0)
                    }}
                  </span>
                </div>
                <div
                  v-if="block.badgeFormat === 'percentage'"
                  class="bg-primary px-2 py-1 text-[10px] font-black tracking-tighter text-on-primary"
                >
                  -{{ product.discountPercentage }}%
                </div>
              </div>
            </div>
            <div
              v-if="showLowStockLabel(product)"
              class="bg-white/95 px-2 shadow-sm backdrop-blur-sm text-primary pb-0.5"
            >
              <span
                class="text-[10px] font-bold uppercase tracking-widest text-primary"
              >
                ({{ productStockNumber(product) }})
                {{ resolveStockMinAdviceTitle(product) }}
              </span>
            </div>
          </div>
            <button
                v-if="block.showFavIcon"
                type="button"
                class="pointer-events-auto absolute top-4 right-4 z-20 transition-all duration-300 group/fav"
                @click.stop="handleFavoriteClick(product)"
              >
                <span
                  class="material-symbols-outlined text-sm transition-all duration-300"
                  :class="{
                    'text-red-500 scale-110': favoritesStore.isFavorite(product.id),
                    'text-primary hover:text-red-500/80': !favoritesStore.isFavorite(product.id)
                  }"
                  :style="{
                    fontVariationSettings: favoritesStore.isFavorite(product.id) ? 'FILL 1' : 'FILL 0'
                  }"
                >
                  favorite
                </span>
              </button>
        </div>

        <component
          :is="productDetailTo(product) ? RouterLink : 'div'"
          v-bind="productDetailTo(product) ? { to: productDetailTo(product) } : {}"
          class="space-y-1 block"
          :class="isOutOfStock(product) ? 'opacity-70' : ''"
        >
          <div class="flex justify-between items-start gap-2">
            <h4
              class="text-sm font-bold tracking-tight"
              :class="isOutOfStock(product) ? 'text-on-surface-variant' : ''"
            >
              {{ gridProductTitle(product) }}
            </h4>
            <div class="flex shrink-0 gap-2">
                <span
                  :class="{
                    'text-sm font-medium': true,
                    'text-on-tertiary-container': product.discountPercentage > 0 && !isOutOfStock(product),
                    'text-on-surface-variant': isOutOfStock(product),
                  }"
                >
                  {{ currencySymbol }}{{ product.discountedPrice ? product.discountedPrice.toFixed(2) : product.price.toFixed(2) }} {{ currencyCode }}
                </span>
                <span v-if="product.discountPercentage > 0" class="text-xs line-through text-on-surface-variant">
                  {{ currencySymbol }}{{ product.price.toFixed(2) }} {{ currencyCode }}
                </span>
            </div>
          </div>
          <p v-if="block.showCategory" class="text-xs text-on-surface-variant">
            {{ product.categories && product.categories.length > 0 ? product.categories[0].name : 'No categorizado' }}
          </p>
          <div
            v-if="block.showDescription"
            class="product-markdown product-markdown--grid text-xs text-on-surface-variant break-words"
            v-html="getProductDescriptionHtmlExcerpt(product.description, 120)"
          />
          
          <div v-if="block.showCalification" class="flex gap-0.5 pt-2">
            <span class="material-symbols-outlined text-[10px]" style="font-variation-settings: 'FILL' 1;">star</span>
            <span class="material-symbols-outlined text-[10px]" style="font-variation-settings: 'FILL' 1;">star</span>
            <span class="material-symbols-outlined text-[10px]" style="font-variation-settings: 'FILL' 1;">star</span>
            <span class="material-symbols-outlined text-[10px]" style="font-variation-settings: 'FILL' 1;">star</span>
            <span class="material-symbols-outlined text-[10px]" style="font-variation-settings: 'FILL' 0;">star</span>
          </div>
        </component>
        <div v-if="product.variants && product.variants.length > 0" class="flex flex-wrap gap-2 pt-4">
          <button
            v-for="variant in product.variants.slice(0, 3)"
            :key="variant.id"
            type="button"
            @click.stop="selectVariant(product, variant)"
            class="px-2 py-1 text-[10px] font-bold border transition-all duration-200 uppercase tracking-wider hover:cursor-pointer"
            :class="product._activeVariantId === variant.id 
              ? 'border-primary bg-primary text-on-primary' 
              : 'border-outline-variant text-on-surface-variant hover:border-primary bg-white'"
          >
            {{ getVariantLabel(variant) }}
          </button>
          <span v-if="product.variants.length > 3" class="text-[10px] text-on-surface-variant/60 self-center font-medium">
            +{{ product.variants.length - 3 }}
          </span>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-20 text-gray-500 font-bold text-sm tracking-widest uppercase">
      No hay productos asignados a esta colección.
    </div>

    <div class="mt-24 flex justify-center w-full">
      <button class="border border-outline-variant px-12 py-4 text-xs font-bold uppercase tracking-[0.3em] hover:bg-primary hover:text-on-primary hover:border-primary transition-all duration-300 text-on-surface-variant">
        Load More Pieces
      </button>
    </div>
  </section>
</template>