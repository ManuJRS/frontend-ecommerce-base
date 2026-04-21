<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useProduct } from '../composables/useProduct';
import { useCartStore } from '@/features/cart/stores/cart.store';
import type { StrapiProduct, StrapiProductVariant } from '../models';
import { renderProductDescriptionMarkdown } from '../utils/renderProductMarkdown';

const {
  product,
  relatedProducts,
  galleryUrls,
  loading,
  error,
  effectivePrice,
  hasDiscount,
  productImageUrl,
  productStockNumber,
  showLowStockLabel,
  resolveStockMinAdviceTitle,
  isOutOfStock,
} = useProduct();

const cartStore = useCartStore();
const route = useRoute();

const activeImageIndex = ref(0);
const selectedAttributes = reactive<Record<string, string>>({});

function normalizeVariantAttributes(variant: StrapiProductVariant): Record<string, string> {
  const list = variant.attribute;
  if (!Array.isArray(list) || list.length === 0) return {};

  const normalized: Record<string, string> = {};
  for (const entry of list) {
    const name = entry?.name != null ? String(entry.name).trim() : '';
    const value = entry?.value;
    if (!name || value == null || String(value).trim() === '') continue;
    normalized[name] = String(value).trim();
  }
  return normalized;
}

const productVariants = computed(() => product.value?.variants ?? []);

const variantAttributeOptions = computed<Record<string, string[]>>(() => {
  const optionsByAttribute = new Map<string, Set<string>>();

  productVariants.value.forEach((variant) => {
    const attrs = normalizeVariantAttributes(variant);
    Object.entries(attrs).forEach(([name, value]) => {
      if (!optionsByAttribute.has(name)) optionsByAttribute.set(name, new Set<string>());
      optionsByAttribute.get(name)?.add(value);
    });
  });

  return Array.from(optionsByAttribute.entries()).reduce<Record<string, string[]>>(
    (acc, [name, values]) => {
      acc[name] = Array.from(values.values()).sort((a, b) => a.localeCompare(b));
      return acc;
    },
    {}
  );
});

const attributeNamesOrdered = computed(() =>
  Object.keys(variantAttributeOptions.value).sort((a, b) => a.localeCompare(b))
);

function resetSelectedAttributes() {
  Object.keys(selectedAttributes).forEach((k) => {
    delete selectedAttributes[k];
  });

  const firstVariant = productVariants.value[0];
  if (!firstVariant) return;
  const firstVariantAttributes = normalizeVariantAttributes(firstVariant);
  Object.entries(firstVariantAttributes).forEach(([name, value]) => {
    selectedAttributes[name] = value;
  });
}

function applyVariantFromDocumentId(documentId: string) {
  const id = documentId.trim();
  if (!id) return;
  const match = productVariants.value.find(
    (v) =>
      (v.documentId != null && String(v.documentId).trim() === id) ||
      String(v.id ?? '') === id
  );
  if (!match) return;
  const attrs = normalizeVariantAttributes(match);
  Object.keys(selectedAttributes).forEach((k) => {
    delete selectedAttributes[k];
  });
  Object.entries(attrs).forEach(([name, value]) => {
    selectedAttributes[name] = value;
  });
}

const selectionComplete = computed(() => {
  const keys = Object.keys(variantAttributeOptions.value);
  if (keys.length === 0) return true;
  return keys.every((k) => Boolean(selectedAttributes[k]));
});

const activeVariant = computed<StrapiProductVariant | null>(() => {
  if (productVariants.value.length === 0) return null;

  const optionKeys = Object.keys(variantAttributeOptions.value);
  if (optionKeys.length === 0) return null;
  if (optionKeys.some((key) => !selectedAttributes[key])) return null;

  const match = productVariants.value.find((variant) => {
    const attrs = normalizeVariantAttributes(variant);
    if (!optionKeys.every((key) => attrs[key] === selectedAttributes[key])) return false;
    for (const row of variant.attribute ?? []) {
      const n = row?.name != null ? String(row.name).trim() : '';
      const v = row?.value != null ? String(row.value).trim() : '';
      if (!n || !v) continue;
      if (selectedAttributes[n] !== v) return false;
    }
    return true;
  });
  return match ?? null;
});

const isInvalidCombination = computed(() => {
  if (productVariants.value.length === 0) return false;
  if (!selectionComplete.value) return false;
  return activeVariant.value == null;
});

function resolveImageUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const base = import.meta.env.VITE_STRAPI_URL || '';
  return `${base}${url}`;
}

const activeVariantImages = computed(() => {
  const variantImgs = activeVariant.value?.images ?? [];
  return variantImgs
    .map((img) => resolveImageUrl(img?.url))
    .filter((url) => url.trim() !== '');
});

const displayedGalleryUrls = computed(() =>
  activeVariantImages.value.length > 0 ? activeVariantImages.value : galleryUrls.value
);

/** Todas las URLs únicas (padre + cada variante) para productos con variantes. */
const allVariableProductGalleryUrls = computed(() => {
  if (productVariants.value.length === 0) return [] as string[];
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (url: string) => {
    const t = url.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };
  for (const url of galleryUrls.value) push(url);
  for (const v of productVariants.value) {
    for (const img of v.images ?? []) {
      push(resolveImageUrl(img?.url));
    }
  }
  return out;
});

/** Hero + miniaturas: en productos variables muestra la unión de todas las imágenes; si no, la galería actual (padre o variante activa). */
const galleryUrlsForView = computed(() => {
  if (productVariants.value.length > 0) {
    const agg = allVariableProductGalleryUrls.value;
    return agg.length > 0 ? agg : galleryUrls.value;
  }
  return displayedGalleryUrls.value;
});

const heroImage = computed(() => galleryUrlsForView.value[activeImageIndex.value] ?? '');
const showImageThumbnails = computed(() => galleryUrlsForView.value.length > 1);

const variantFullName = computed(() => {
  if (!activeVariant.value) return null;
  const explicitName = activeVariant.value.variantName;
  if (explicitName != null && String(explicitName).trim() !== '') return String(explicitName).trim();

  const productName = activeVariant.value.productName?.trim() || product.value?.name?.trim() || '';
  const attrs = Object.entries(normalizeVariantAttributes(activeVariant.value))
    .map(([, value]) => value)
    .join(' ');
  const resolved = [productName, attrs].filter(Boolean).join(' - ').trim();
  return resolved || null;
});

const displayTitle = computed(() => variantFullName.value ?? product.value?.name ?? '');

const displayDescription = computed(() => {
  const variantDescription = activeVariant.value?.variantDescription;
  if (variantDescription != null && String(variantDescription).trim() !== '') {
    return String(variantDescription).trim();
  }
  return product.value?.description;
});

const effectiveVariantDiscount = computed(() => {
  const raw = activeVariant.value?.variantDiscount;
  if (raw == null) return null;
  const discount = Number(raw);
  if (!Number.isFinite(discount) || discount <= 0) return null;
  return Math.min(discount, 100);
});

const displayPrice = computed((): number | null => {
  if (!product.value) return 0;
  if (productVariants.value.length > 0) {
    if (isInvalidCombination.value) return null;
    if (activeVariant.value) {
      const variantPrice = activeVariant.value.price;
      if (variantPrice != null && !Number.isNaN(Number(variantPrice))) {
        const base = Number(variantPrice);
        if (effectiveVariantDiscount.value != null) {
          return base * (1 - effectiveVariantDiscount.value / 100);
        }
        return base;
      }
    }
    return effectivePrice(product.value);
  }
  return effectivePrice(product.value);
});

const displayOriginalVariantPrice = computed(() => {
  if (!activeVariant.value) return null;
  if (effectiveVariantDiscount.value == null) return null;
  const base = activeVariant.value.price;
  if (base == null || Number.isNaN(Number(base))) return null;
  return Number(base);
});

const displayStock = computed((): number | null => {
  if (!product.value) return null;
  if (productVariants.value.length > 0) {
    if (isInvalidCombination.value) return null;
    if (activeVariant.value) {
      const variantStock = activeVariant.value.stock;
      if (variantStock != null && !Number.isNaN(Number(variantStock))) return Number(variantStock);
    }
    return productStockNumber(product.value);
  }
  return productStockNumber(product.value);
});

const canAddToCart = computed(() => {
  if (!product.value) return false;
  if (productVariants.value.length > 0) {
    if (isInvalidCombination.value) return false;
    if (!activeVariant.value) return false;
    return (displayStock.value ?? 0) > 0;
  }
  return !isOutOfStock(product.value);
});

const addToCartButtonLabel = computed(() => {
  if (isInvalidCombination.value) return 'Combinación no disponible';
  if (productVariants.value.length > 0) {
    if (!selectionComplete.value) return 'Selecciona opciones';
    if (!activeVariant.value) return 'Combinación no disponible';
    if ((displayStock.value ?? 0) <= 0) return 'Agotado';
  }
  if (product.value && isOutOfStock(product.value)) return 'Agotado';
  return 'Añadir al carrito';
});

const selectedAttributesDescription = computed(() =>
  Object.entries(selectedAttributes)
    .map(([name, value]) => `${name}: ${value}`)
    .join(' / ')
);

const displaySku = computed(() => {
  if (activeVariant.value) {
    const candidate = activeVariant.value.variantSku ?? activeVariant.value.sku;
    if (candidate != null && String(candidate).trim() !== '') return String(candidate).trim();
  }
  const productSku = product.value?.sku;
  if (productSku != null && String(productSku).trim() !== '') return String(productSku).trim();
  return null;
});

watch(
  () => product.value?.documentId,
  () => {
    activeImageIndex.value = 0;
    resetSelectedAttributes();
    const q = route.query.variant;
    const variantId = typeof q === 'string' ? q.trim() : '';
    if (variantId) {
      void nextTick(() => applyVariantFromDocumentId(variantId));
    }
  }
);

watch(
  () => route.query.variant,
  (q) => {
    if (!product.value) return;
    const variantId = typeof q === 'string' ? q.trim() : '';
    if (variantId) applyVariantFromDocumentId(variantId);
  }
);

watch(galleryUrlsForView, (urls) => {
  if (activeImageIndex.value >= urls.length) {
    activeImageIndex.value = Math.max(0, urls.length - 1);
  }
});

/** Al cambiar de variante, mostrar la primera imagen de esa variante en la galería agregada (si existe). */
watch(activeVariant, (v) => {
  if (productVariants.value.length === 0 || !v) return;
  const variantUrls = new Set(
    (v.images ?? [])
      .map((img) => resolveImageUrl(img?.url).trim())
      .filter(Boolean)
  );
  if (variantUrls.size === 0) return;
  const urls = galleryUrlsForView.value;
  for (let i = 0; i < urls.length; i++) {
    if (variantUrls.has(urls[i].trim())) {
      activeImageIndex.value = i;
      return;
    }
  }
});

const breadcrumbCategory = computed(() => product.value?.categories?.[0]?.name ?? 'Catálogo');

const descriptionHtml = computed(() =>
  renderProductDescriptionMarkdown(displayDescription.value)
);

function addToCart(p: StrapiProduct) {
  if (!canAddToCart.value) return;

  if (productVariants.value.length > 0 && activeVariant.value) {
    const variantPayload: Record<string, unknown> = {
      ...p,
      id: `${p.id}-${activeVariant.value.documentId ?? activeVariant.value.id ?? 'variant'}`,
      variantId: activeVariant.value.documentId ?? String(activeVariant.value.id ?? ''),
      documentId: activeVariant.value.documentId ?? p.documentId,
      name: variantFullName.value ?? p.name,
      sku: activeVariant.value.variantSku ?? activeVariant.value.sku ?? p.sku,
      variantSku: activeVariant.value.variantSku ?? activeVariant.value.sku ?? p.sku,
      price: activeVariant.value.price ?? p.price,
      discountedPrice: displayPrice.value,
      stock: activeVariant.value.stock ?? 0,
      images:
        activeVariant.value.images && activeVariant.value.images.length > 0
          ? activeVariant.value.images
          : p.images,
      selectedAttributes: { ...selectedAttributes },
      variantDescription: selectedAttributesDescription.value,
      variantName: variantFullName.value ?? p.name,
      parentProductDocumentId: p.documentId,
      variantPriceWithDiscount: (activeVariant.value as Record<string, unknown>).variantPriceWithDiscount,
    };
    cartStore.addProduct(variantPayload);
    return;
  }

  cartStore.addProduct(p as unknown as Record<string, unknown>);
}

function formatMoney(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
</script>

<template>
  <div class="pt-8 pb-32">
    <div v-if="loading" class="max-w-screen-2xl mx-auto px-8 py-20 text-center">
      <p class="text-xs font-bold uppercase tracking-widest text-on-surface-variant animate-pulse">
        Cargando producto…
      </p>
    </div>

    <div v-else-if="error" class="max-w-screen-2xl mx-auto px-8 py-20 text-center">
      <p class="text-on-surface-variant">{{ error }}</p>
      <RouterLink
        to="/"
        class="mt-6 inline-block text-sm font-semibold text-primary border-b border-primary hover:opacity-70"
      >
        Volver al inicio
      </RouterLink>
    </div>

    <template v-else-if="product">
      <section class="max-w-screen-2xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div class="lg:col-span-7 flex flex-col gap-8">
          <div class="relative aspect-[4/5] bg-surface-container-low overflow-hidden group">
            <img
              v-if="heroImage"
              :src="heroImage"
              :alt="product.name"
              class="relative z-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div
              v-else
              class="relative z-0 flex h-full w-full items-center justify-center text-on-surface-variant text-sm"
            >
              Sin imagen
            </div>
            <div class="pointer-events-none absolute inset-0 z-[1] bg-black/5"></div>

            <div
              class="pointer-events-none absolute top-4 left-4 z-10 flex flex-col gap-1.5 items-start"
            >
              <div
                v-if="showLowStockLabel(product)"
                class="flex items-center bg-white/95 px-2.5 py-1.5 shadow-sm backdrop-blur-sm"
              >
                <span class="text-[10px] font-bold uppercase tracking-widest text-primary">
                  ({{ productStockNumber(product) }})
                  {{ resolveStockMinAdviceTitle(product) }}
                </span>
              </div>
            </div>

            <div
              class="pointer-events-none absolute right-4 bottom-4 z-10 flex flex-col gap-2 items-end"
            >
              <div
                v-if="product.newProduct"
                class="flex items-center gap-1.5 bg-white/90 px-2 py-1 shadow-sm backdrop-blur-sm"
              >
                <span class="material-symbols-outlined text-xs text-primary">new_releases</span>
                <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary"
                  >Nuevo</span
                >
              </div>
              <div
                v-if="product.bestProduct"
                class="flex items-center gap-1.5 bg-white/90 px-2 py-1 shadow-sm backdrop-blur-sm"
              >
                <span class="material-symbols-outlined text-xs text-primary">star</span>
                <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary"
                  >Bestseller</span
                >
              </div>
            </div>
          </div>

          <div
            v-if="showImageThumbnails"
            class="grid grid-cols-2 sm:grid-cols-3 gap-4"
            role="tablist"
            aria-label="Galería de imágenes del producto"
          >
            <button
              v-for="(src, idx) in galleryUrlsForView"
              :key="`${src}-${idx}`"
              type="button"
              role="tab"
              :aria-selected="idx === activeImageIndex"
              class="relative aspect-square overflow-hidden bg-surface-container-low ring-2 transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              :class="
                idx === activeImageIndex
                  ? 'ring-primary'
                  : 'ring-transparent hover:ring-outline-variant'
              "
              @click="activeImageIndex = idx"
            >
              <img
                :src="src"
                :alt="`${product.name} — vista ${idx + 1}`"
                class="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          </div>
        </div>

        <div class="lg:col-span-5 flex flex-col pt-12 lg:sticky lg:top-36 h-fit">
          <nav
            class="flex items-center space-x-2 text-xs uppercase tracking-widest text-on-surface-variant mb-6 font-label"
          >
            <RouterLink to="/tienda" class="hover:text-primary transition-colors">Tienda</RouterLink>
            <span class="material-symbols-outlined text-[10px]">chevron_right</span>
            <span>{{ breadcrumbCategory }}</span>
          </nav>

          <h1
            class="text-5xl font-extrabold font-headline tracking-tighter text-primary leading-tight mb-4"
          >
            {{ displayTitle }}
          </h1>

          <div class="mb-8 flex flex-wrap items-baseline gap-3">
            <p
              v-if="displayPrice != null"
              class="text-2xl font-light font-headline tracking-tight text-on-surface"
            >
              ${{ formatMoney(displayPrice) }}
            </p>
            <span
              v-if="displayOriginalVariantPrice != null"
              class="text-lg line-through text-red-500 "
            >
              ${{ formatMoney(displayOriginalVariantPrice) }}
            </span>
            <span v-if="effectiveVariantDiscount != null" class="text-sm font-semibold text-primary">
              −{{ effectiveVariantDiscount }}%
            </span>
            <p
              v-else
              class="text-2xl font-light font-headline tracking-tight text-on-surface-variant"
            >
              
            </p>
            <span
              v-if="hasDiscount(product) && !activeVariant"
              class="text-lg line-through text-on-surface-variant"
            >
              ${{ formatMoney(Number(product.price) || 0) }}
            </span>
            <span
              v-if="hasDiscount(product) && product.discountPercentage != null && !activeVariant"
              class="text-sm font-semibold text-primary"
            >
              −{{ product.discountPercentage }}%
            </span>
          </div>

          <div class="space-y-8">
            <div v-if="attributeNamesOrdered.length > 0" class="space-y-5 max-w-md">
              <div
                v-for="attrName in attributeNamesOrdered"
                :key="attrName"
                class="space-y-2"
              >
                <p class="text-xs uppercase tracking-widest text-on-surface-variant font-semibold">
                  {{ attrName }}
                </p>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="value in variantAttributeOptions[attrName]"
                    :key="`${attrName}-${value}`"
                    type="button"
                    class="px-4 py-2 border text-xs uppercase tracking-widest transition-colors hover:cursor-pointer"
                    :class="
                      selectedAttributes[attrName] === value
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-outline-variant text-on-surface hover:border-primary'
                    "
                    @click="selectedAttributes[attrName] = value"
                  >
                    {{ value }}
                  </button>
                </div>
              </div>
            </div>

            <div
              class="product-markdown max-w-md text-on-surface-variant leading-relaxed"
              v-html="descriptionHtml"
            />

            <div class="pt-8 space-y-4">
              <button
                type="button"
                :disabled="!canAddToCart"
                class="hover:cursor-pointer w-full max-w-md py-5 font-bold tracking-tight text-lg transition-opacity flex justify-center items-center gap-3"
                :class="
                  !canAddToCart
                    ? 'bg-on-surface-variant/30 text-on-surface-variant cursor-not-allowed'
                    : 'bg-primary text-on-primary hover:opacity-90'
                "
                @click="addToCart(product)"
              >
                {{ addToCartButtonLabel }}
                <span v-if="canAddToCart" class="material-symbols-outlined text-xl"
                  >arrow_forward</span
                >
              </button>
            </div>

            <div class="pt-12 space-y-6 max-w-md">
              <div class="border-t border-outline-variant pt-6">
                <div class="flex justify-between items-center w-full">
                  <span class="font-headline font-bold text-sm tracking-widest uppercase"
                    >Detalles</span
                  >
                </div>
                <p v-if="displaySku" class="mt-4 text-sm text-on-surface-variant leading-relaxed">
                  SKU: {{ displaySku }}
                </p>
                <p
                  v-if="displayStock != null || (productVariants.length > 0 && isInvalidCombination)"
                  class="mt-2 text-sm text-on-surface-variant leading-relaxed"
                >
                  <template v-if="displayStock != null">Stock: {{ displayStock }}</template>
                  <template v-else>Stock: —</template>
                </p>
                <p
                  v-if="activeVariant && selectedAttributesDescription"
                  class="mt-2 text-sm text-on-surface-variant leading-relaxed"
                >
                  Variante: {{ selectedAttributesDescription }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Related Products -->
      <section
        v-if="product.showRelatedProducts === true && relatedProducts.length > 0"
        class="mt-48 max-w-screen-2xl mx-auto px-8"
      >
        <div class="flex items-end justify-between mb-12">
          <div class="space-y-4">
            <h2 class="text-4xl font-extrabold font-headline tracking-tighter">También te puede interesar</h2>
            <p class="text-on-surface-variant">Selección de la misma categoría.</p>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <RouterLink
            v-for="(rp, idx) in relatedProducts"
            :key="rp.documentId"
            :to="rp.slug ? `/tienda/${rp.slug}` : '/'"
            class="group cursor-pointer"
          >
            <div
              class="aspect-[3/4] bg-surface-container overflow-hidden mb-6"
              :class="{
                'translate-y-8': idx === 1,
                'translate-y-12': idx === 3,
              }"
            >
              <img
                v-if="productImageUrl(rp)"
                :src="productImageUrl(rp)"
                :alt="rp.name"
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-sm text-on-surface-variant">
                Sin imagen
              </div>
            </div>
            <h3
              class="font-headline font-bold text-lg tracking-tight mb-1"
              :class="{ 'mt-8': idx === 1, 'mt-12': idx === 3 }"
            >
              {{ rp.name }}
            </h3>
            <div class="flex gap-2 items-baseline">
              <p class="text-on-surface-variant text-sm">
                ${{ formatMoney(effectivePrice(rp)) }}
              </p>
              <span v-if="hasDiscount(rp)" class="text-xs line-through text-on-surface-variant">
                ${{ formatMoney(Number(rp.price) || 0) }}
              </span>
            </div>
          </RouterLink>
        </div>
      </section>
    </template>
  </div>
</template>
