<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { BlogCategory } from '@/features/blog/services/blog.service';
import { normalizeBlogCategory } from '@/features/blog/services/blog.service';
import { useBlogFilter } from '@/features/blog/composables/useBlogFilter';

type SharedFiltersBlock = Record<string, unknown> & {
  title?: string;
  span?: string;
  blogCategory?: unknown;
  blogCategories?: unknown;
  categories?: unknown;
};

const props = defineProps<{
  block?: SharedFiltersBlock;
  data?: SharedFiltersBlock;
}>();

const emit = defineEmits<{
  (event: 'filter-selected', category: BlogCategory | null): void;
  (event: 'update:selectedCategory', category: BlogCategory | null): void;
}>();

const filtersBlock = computed<SharedFiltersBlock>(
  () => props.data ?? props.block ?? {}
);

const { setSelectedCategory } = useBlogFilter();

const selectedKey = ref('all');

function relationItems(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && 'data' in raw) {
    const data = (raw as { data?: unknown }).data;
    if (Array.isArray(data)) return data;
    return data == null ? [] : [data];
  }
  return raw == null ? [] : [raw];
}

const resolvedTitle = computed(() => (filtersBlock.value.title as string | undefined) ?? '');
const resolvedSpan = computed(() => (filtersBlock.value.span as string | undefined) ?? '');

const categories = computed<BlogCategory[]>(() => {
  const block = filtersBlock.value;
  const raw =
    block.blogCategory ?? block.blogCategories ?? block.categories;

  return relationItems(raw)
    .map(normalizeBlogCategory)
    .filter(
      (category) =>
        category.id != null || category.documentId || category.slug || category.name
    );
});

function categoryKey(category: BlogCategory): string {
  return String(category.documentId ?? category.id ?? category.slug ?? category.name ?? '');
}

function selectCategory(category: BlogCategory | null) {
  selectedKey.value = category ? categoryKey(category) : 'all';
  setSelectedCategory(category);
  emit('filter-selected', category);
  emit('update:selectedCategory', category);
}

watch(categories, (list) => {
  if (selectedKey.value === 'all') return;
  if (!list.some((category) => categoryKey(category) === selectedKey.value)) {
    selectCategory(null);
  }
});
</script>

<template>
  <section v-if="categories.length > 0" class="w-full px-8 md:py-32 py-16">
    <div v-if="resolvedTitle || resolvedSpan" class="mx-auto mb-8 max-w-screen-2xl text-center">
      <span
        v-if="resolvedSpan"
        class="mb-3 block text-xs font-bold uppercase tracking-[0.35em] text-on-surface-variant"
      >
        {{ resolvedSpan }}
      </span>
      <h2 v-if="resolvedTitle" class="font-headline text-3xl font-black tracking-tight text-primary md:text-4xl">
        {{ resolvedTitle }}
      </h2>
    </div>

    <nav class="flex w-full justify-center" :aria-label="resolvedTitle || 'Filtros de blog'">
      <ul
        class="flex flex-wrap justify-center gap-4 rounded-full bg-surface-container-lowest px-8 py-4 shadow-[0px_20px_40px_rgba(25,28,30,0.06)] md:gap-8"
      >
        <li>
          <button
            type="button"
            class="rounded-full px-4 py-2 text-sm tracking-wide transition-colors hover:cursor-pointer"
            :class="
              selectedKey === 'all'
                ? 'bg-primary-fixed font-bold text-primary'
                : 'font-semibold text-on-surface-variant hover:text-primary'
            "
            @click="selectCategory(null)"
          >
            Todo
          </button>
        </li>
        <li v-for="category in categories" :key="categoryKey(category)">
          <button
            type="button"
            class="rounded-full px-4 py-2 text-sm tracking-wide transition-colors hover:cursor-pointer"
            :class="
              selectedKey === categoryKey(category)
                ? 'bg-primary-fixed font-bold text-primary'
                : 'font-semibold text-on-surface-variant hover:text-primary'
            "
            @click="selectCategory(category)"
          >
            {{ category.name }}
          </button>
        </li>
      </ul>
    </nav>
  </section>
</template>
