<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  fetchBlogPage,
  type BlogPage,
  type BlogPageBlock,
} from '../services/blog.service';

const SITE_TITLE = 'Tienda E-commerce';

const blogPage = ref<BlogPage | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const componentMap: Record<string, ReturnType<typeof defineAsyncComponent>> = {
  'shared.hero': defineAsyncComponent(
    () => import('@/features/shared-components/SharedHero.vue')
  ),
  'shared.intro': defineAsyncComponent(
    () => import('@/features/shared-components/SharedIntro.vue')
  ),
  'shared.newsletter-form': defineAsyncComponent(
    () => import('@/features/shared-components/SharedNewsletterForm.vue')
  ),
  'shared.grid-product': defineAsyncComponent(
    () => import('@/features/shared-components/SharedGridProduct.vue')
  ),
  'shared.grio-prioduct': defineAsyncComponent(
    () => import('@/features/shared-components/SharedGridProduct.vue')
  ),
  'shared.filters': defineAsyncComponent(
    () => import('@/features/shared-components/SharedFilters.vue')
  ),
  'shared.featured-blog': defineAsyncComponent(
    () => import('@/features/shared-components/SharedFeaturedBlog.vue')
  ),
  'shared.grid-blog': defineAsyncComponent(
    () => import('@/features/shared-components/SharedGridBlog.vue')
  ),
};

function pickDynamicBlocks(page: BlogPage | null): BlogPageBlock[] {
  if (!page) return [];

  const candidateFields: ReadonlyArray<keyof BlogPage> = [
    'blogSection',
    'content',
    'sections',
    'blocks',
  ];
  for (const field of candidateFields) {
    const value = page[field];
    if (Array.isArray(value) && value.some((b) => b && typeof b === 'object' && '__component' in b)) {
      return value as BlogPageBlock[];
    }
  }
  return [];
}

const blocks = computed<BlogPageBlock[]>(() => pickDynamicBlocks(blogPage.value));

function resolveComponent(componentName: string | undefined) {
  if (!componentName) return null;
  const component = componentMap[componentName];
  if (!component) {
    console.warn(`[BlogListView] Bloque no soportado: ${componentName}`);
    return null;
  }
  return component;
}

function applyDocumentTitle(page: BlogPage | null) {
  if (typeof document === 'undefined') return;
  const seoTitle =
    page?.seo && typeof page.seo === 'object'
      ? (page.seo as Record<string, unknown>).metaTitle
      : undefined;
  const candidate =
    (typeof seoTitle === 'string' && seoTitle.trim() !== '' ? seoTitle : null) ??
    (page?.title?.trim() ? page.title : null);
  document.title = candidate ? `${candidate} | ${SITE_TITLE}` : SITE_TITLE;
}

async function loadBlogPage() {
  loading.value = true;
  error.value = null;
  try {
    blogPage.value = await fetchBlogPage();
    if (!blogPage.value) {
      error.value = 'No se pudo cargar la página del blog.';
    }
  } catch (err) {
    console.error('[BlogListView] load error', err);
    blogPage.value = null;
    error.value = 'No se pudo cargar la página del blog.';
  } finally {
    loading.value = false;
  }
}

watch(blogPage, (value) => applyDocumentTitle(value), { immediate: true });

onMounted(() => {
  void loadBlogPage();
});

onBeforeUnmount(() => applyDocumentTitle(null));
</script>

<template>
  <section class="min-h-[40vh]">
    <div v-if="loading" class="flex items-center justify-center py-32 text-on-surface-variant">
      <p class="text-xs font-bold uppercase tracking-[0.3em] animate-pulse">Cargando blog…</p>
    </div>

    <div v-else-if="error" class="py-32 text-center">
      <h1 class="text-2xl font-bold text-error">Error</h1>
      <p class="mt-2 text-on-surface-variant">{{ error }}</p>
    </div>

    <template v-else-if="blogPage">
      <div v-if="blocks.length > 0">
        <component
          v-for="(block, idx) in blocks"
          :key="String(block.id ?? `${block.__component ?? 'block'}-${idx}`)"
          :is="resolveComponent(block.__component)"
          :block="block"
          :data="block"
        />
      </div>
      <div v-else class="py-32 text-center text-on-surface-variant">
        <p class="text-sm">El blog aún no tiene contenido.</p>
      </div>
    </template>
  </section>
</template>
