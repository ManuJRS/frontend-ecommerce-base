<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { StoreViewBlock } from '../models';
import { useStoreViewStore } from '../stores/storeView.store';
import { useCartConfigStore } from '@/features/cart/stores/cartConfig.store';

export interface StoreFilterCategory {
  id: number;
  name?: string;
  documentId?: string;
}

const cartConfig = useCartConfigStore();
const currencyCode = computed(() => cartConfig.currencyCode);
const currencySymbol = computed(() => cartConfig.currencySymbol);

function normalizeCategoriesSelection(raw: unknown): StoreFilterCategory[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item: Record<string, unknown>) => {
        const attrs = item.attributes as Record<string, unknown> | undefined;
        const id = (item.id as number) ?? Number(item.documentId);
        const name =
          (item.name as string) ??
          (attrs?.name as string | undefined) ??
          (attrs?.title as string | undefined);
        return { id, name, documentId: item.documentId as string | undefined };
      })
      .filter((c) => Number.isFinite(c.id));
  }
  if (typeof raw === 'object' && raw !== null && 'data' in raw) {
    const inner = (raw as { data: unknown }).data;
    return normalizeCategoriesSelection(inner);
  }
  return [];
}

const props = defineProps<{
  block: StoreViewBlock & {
    priceRange?: boolean;
    filterBtn?:string
    filterTitle?: string;
    filterShortDescription?: string;
    filterButtonLabel?: string;
    priceTitle?: string;
    categoryTitle?: string;
    availabilityTitle?: string;
    categories?: boolean;
    availability?: boolean;
    minPrice?: string;
    maxPrice?: string;
    categories_selection?: StoreFilterCategory[] | { data?: unknown[] };
  };
}>();

const emit = defineEmits<{
  applyFilters: [
    payload: {
      minPrice: number;
      maxPrice: number;
      priceRange: { min: number; max: number };
      categoryIds: number[];
      availabilityOnly: boolean;
    },
  ];
  priceRangeChange: [range: { min: number; max: number }];
}>();

const store = useStoreViewStore();

const availabilityOnly = ref(false);

const parsedMin = computed(() => {
  const n = Number.parseFloat(String(props.block.minPrice ?? '0'));
  return Number.isFinite(n) ? n : 0;
});

const parsedMax = computed(() => {
  const n = Number.parseFloat(String(props.block.maxPrice ?? '0'));
  const lo = parsedMin.value;
  return Number.isFinite(n) && n > lo ? n : lo + 1;
});

const selectedMaxPrice = ref(parsedMax.value);

/** Rango efectivo elegido: desde el mínimo del catálogo hasta el valor del slider. */
const selectedPriceRange = computed(() => ({
  min: parsedMin.value,
  max: selectedMaxPrice.value,
}));

watch([parsedMin, parsedMax], () => {
  selectedMaxPrice.value = Math.min(
    Math.max(selectedMaxPrice.value, parsedMin.value),
    parsedMax.value
  );
});

watch(
  selectedPriceRange,
  (range) => {
    emit('priceRangeChange', { ...range });
  },
  { immediate: true }
);

const categoryList = computed(() =>
  normalizeCategoriesSelection(props.block.categories_selection)
);

const selectedCategoryIds = ref<Record<number, boolean>>({});

watch(
  categoryList,
  (list) => {
    const next: Record<number, boolean> = {};
    for (const c of list) {
      next[c.id] = selectedCategoryIds.value[c.id] ?? false;
    }
    selectedCategoryIds.value = next;
  },
  { immediate: true }
);

function handleApplyFilters() {
  const categoryIds = props.block.categories
    ? categoryList.value.filter((c) => selectedCategoryIds.value[c.id]).map((c) => c.id)
    : [];

  const priceRange = props.block.priceRange
    ? { min: selectedPriceRange.value.min, max: selectedPriceRange.value.max }
    : null;

  store.applyProductFilters({
    priceRange,
    categoryIds,
    availabilityOnly: props.block.availability ? availabilityOnly.value : false,
  });

  emit('applyFilters', {
    minPrice: priceRange?.min ?? parsedMin.value,
    maxPrice: priceRange?.max ?? parsedMax.value,
    priceRange: priceRange ?? { min: parsedMin.value, max: parsedMax.value },
    categoryIds,
    availabilityOnly: props.block.availability ? availabilityOnly.value : false,
  });
}

defineExpose({
  selectedPriceRange,
  selectedMaxPrice,
});
</script>

<template>
  <aside
    class="flex w-full flex-col gap-8 bg-slate-100 p-6 dark:bg-slate-900 lg:fixed lg:left-0 lg:top-20 lg:z-20 lg:h-[calc(100vh-5rem)] lg:w-64 lg:overflow-y-auto"
    aria-label="Filtros de tienda"
  >
    <div class="space-y-1">
      <h2 class="font-manrope text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-slate-50">
        {{ block.filterTitle || 'Filters' }}
      </h2>
      <p class="text-[10px] uppercase tracking-wider text-slate-500">{{ block.filterShortDescription || 'Refine Collection' }}</p>
    </div>

    <nav class="flex flex-col space-y-6">
      <div v-if="block.priceRange" class="space-y-4">
        <div
          class="flex cursor-pointer items-center gap-3 font-bold text-slate-900 transition-transform hover:translate-x-1 dark:text-slate-50"
        >
          <span class="material-symbols-outlined text-sm">payments</span>
          <span class="font-manrope text-xs uppercase tracking-widest">{{ block.priceTitle || 'Price Range' }}</span>
        </div>
        <div class="space-y-2 px-7">
          <input
            v-model.number="selectedMaxPrice"
            class="h-1 w-full cursor-pointer appearance-none rounded-lg bg-surface-variant accent-primary"
            type="range"
            :min="parsedMin"
            :max="parsedMax"
            :step="1"
          />
          <div class="flex justify-between text-[10px] font-medium text-on-surface-variant">
            <span>{{ currencySymbol }}{{ selectedPriceRange.min }} {{ currencyCode }}</span>
            <span>{{ currencySymbol }}{{ selectedPriceRange.max }} {{ currencyCode }}</span>
          </div>
        </div>
      </div>

      <div v-if="block.categories" class="space-y-4">
        <div
          class="flex cursor-pointer items-center gap-3 text-slate-500 transition-transform hover:translate-x-1 dark:text-slate-400"
        >
          <span class="material-symbols-outlined text-sm">category</span>
          <span class="font-manrope text-xs uppercase tracking-widest">{{ block.categoryTitle || 'Categories' }}</span>
        </div>
        <div class="flex flex-col gap-2 px-7">
          <label
            v-for="cat in categoryList"
            :key="cat.id"
            class="flex cursor-pointer items-center gap-2 text-[11px] text-on-surface-variant transition-colors hover:text-primary"
          >
            <input
              v-model="selectedCategoryIds[cat.id]"
              class="hover:cursor-pointer rounded-sm border-outline-variant text-primary focus:ring-0"
              type="checkbox"
            />
            {{ cat.name || 'Sin nombre' }}
          </label>
        </div>
      </div>

      <div v-if="block.availability" class="space-y-4">
        <label
          class="flex cursor-pointer items-center gap-3 text-slate-500 transition-transform hover:translate-x-1 dark:text-slate-400"
        >
          <input
            v-model="availabilityOnly"
            type="checkbox"
            class="hover:cursor-pointer rounded-sm border-outline-variant text-primary focus:ring-0"
          />
          <span class="font-manrope text-xs uppercase tracking-widest">{{
            block.availabilityTitle || 'Availability'
          }}</span>
        </label>
      </div>
    </nav>

    <button
      type="button"
      class="hover:cursor-pointer w-full border border-outline-variant bg-primary py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-on-primary transition-colors hover:opacity-95 active:opacity-90 dark:border-slate-600"
      @click="handleApplyFilters"
    >
      {{ block.filterBtn || 'Filtrar' }}
    </button>
  </aside>
</template>
