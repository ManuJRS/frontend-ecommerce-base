<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { fetchPageBySlug, type DynamicPage } from '@/features/routing/services/page.service';

type DynamicBlock = {
  id?: number | string;
  __component?: string;
  [key: string]: unknown;
};

const props = defineProps<{
  initialData?: DynamicPage | null;
}>();

const route = useRoute();
const loading = ref(false);
const error = ref<string | null>(null);
const page = ref<DynamicPage | null>(null);

const componentMap: Record<string, ReturnType<typeof defineAsyncComponent>> = {
  'shared.hero': defineAsyncComponent(
    () => import('@/features/shared-components/SharedHero.vue')
  ),
  'shared.intro': defineAsyncComponent(
    () => import('@/features/shared-components/SharedIntro.vue')
  ),
  'shared.card': defineAsyncComponent(
    () => import('@/features/shared-components/SharedCard.vue')
  ),
  'shared.grid': defineAsyncComponent(
    () => import('@/features/shared-components/SharedGrid.vue')
  ),
  'shared.filters': defineAsyncComponent(
    () => import('@/features/shared-components/SharedFilters.vue')
  ),
  'shared.featured-blog': defineAsyncComponent(
    () => import('@/features/shared-components/SharedFeaturedBlog.vue')
  ),
  'shared.featured-post': defineAsyncComponent(
    () => import('@/features/shared-components/SharedFeaturedBlog.vue')
  ),
  'shared.grid-blog': defineAsyncComponent(
    () => import('@/features/shared-components/SharedGridBlog.vue')
  ),
  'shared.grio-prioduct': defineAsyncComponent(
    () => import('@/features/shared-components/SharedGridProduct.vue')
  ),
  'shared.newsletter-form': defineAsyncComponent(
    () => import('@/features/shared-components/SharedNewsletterForm.vue')
  ),
  'shared.map': defineAsyncComponent(() => import('@/features/shared-components/SharedMap.vue')),
};

const blocks = computed<DynamicBlock[]>(() => {
  const raw = page.value?.content;
  return Array.isArray(raw) ? (raw as DynamicBlock[]) : [];
});

const resolveComponent = (componentName: string | undefined) => {
  if (!componentName) return null;
  const component = componentMap[componentName];
  if (!component) {
    console.warn(`[DynamicPage] Bloque no soportado: ${componentName}`);
  }
  return component ?? null;
};

function applySeo() {
  const seoTitle = page.value?.seo?.metaTitle;
  if (seoTitle && String(seoTitle).trim() !== '') {
    document.title = String(seoTitle);
    return;
  }
  if (page.value?.title) {
    document.title = String(page.value.title);
  }
}

async function loadPage() {
  // 🚀 Si ya tenemos initialData, lo usamos y evitamos la petición a la API
  if (props.initialData) {
    page.value = props.initialData;
    applySeo();
    return;
  }

  const slug = String(route.params.slug ?? '').trim();
  if (!slug) {
    page.value = null;
    error.value = 'Slug no valido';
    return;
  }

  loading.value = true;
  error.value = null;
  try {
    const response = await fetchPageBySlug(slug);
    // Tu servicio ya devuelve un array, tomamos el primero
    page.value = response[0] ?? null; 
    
    if (!page.value) {
      error.value = 'No se encontro la pagina';
    }
    applySeo();
  } catch (e) {
    console.error('[DynamicPageView] load error', e);
    page.value = null;
    error.value = 'No se pudo cargar la pagina';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadPage();
});

watch(
  () => route.params.slug,
  () => {
    void loadPage();
  }
);
</script>

<template>
  <section class="min-h-[40vh]">
    <div v-if="loading" class="flex items-center justify-center py-20 text-gray-500">
      Cargando pagina...
    </div>

    <div v-else-if="error" class="py-20 text-center">
      <h1 class="text-2xl font-bold text-red-600">Error</h1>
      <p class="mt-2 text-gray-600">{{ error }}</p>
    </div>

    <div v-else-if="page">
      <component
        v-for="(block, idx) in blocks"
        :key="String(block.id ?? `${block.__component ?? 'block'}-${idx}`)"
        :is="resolveComponent(block.__component)"
        :block="block"
        :data="block"
      />
    </div>
  </section>
</template>
