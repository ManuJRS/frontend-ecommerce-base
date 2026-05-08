import { computed, ref } from 'vue';
import type { BlogCategory, Post } from '../services/blog.service';

const selectedCategory = ref<BlogCategory | null>(null);

function categoryMatchKeys(category: BlogCategory | null | undefined): Set<string> {
  const keys = new Set<string>();
  if (!category) return keys;
  if (category.id != null) keys.add(`id:${category.id}`);
  if (category.documentId) keys.add(`documentId:${category.documentId}`);
  if (category.slug) keys.add(`slug:${category.slug}`);
  if (category.name) keys.add(`name:${category.name}`);
  return keys;
}

function postCategoryKeys(post: Post | null | undefined): Set<string> {
  const keys = new Set<string>();
  if (!post) return keys;

  const candidates: Array<BlogCategory | null | undefined> = [
    post.blogCategory ?? null,
    post.category ?? null,
    ...(Array.isArray(post.BlogCategory) ? post.BlogCategory : []),
    ...(Array.isArray(post.categories) ? post.categories : []),
  ];

  for (const candidate of candidates) {
    for (const key of categoryMatchKeys(candidate)) {
      keys.add(key);
    }
  }

  return keys;
}

export function useBlogFilter() {
  function setSelectedCategory(category: BlogCategory | null) {
    selectedCategory.value = category;
  }

  function clearSelectedCategory() {
    selectedCategory.value = null;
  }

  function matchesSelectedCategory(post: Post | null | undefined): boolean {
    const current = selectedCategory.value;
    if (!current) return true;
    if (!post) return false;

    const filterKeys = categoryMatchKeys(current);
    if (filterKeys.size === 0) return true;

    const postKeys = postCategoryKeys(post);
    for (const key of filterKeys) {
      if (postKeys.has(key)) return true;
    }
    return false;
  }

  const hasActiveFilter = computed(() => selectedCategory.value != null);

  return {
    selectedCategory,
    hasActiveFilter,
    setSelectedCategory,
    clearSelectedCategory,
    matchesSelectedCategory,
  };
}
