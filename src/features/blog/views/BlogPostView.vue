<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';
import {
  fetchPostBySlug,
  fetchRelatedPosts,
  type BlogCategory,
  type BlogMedia,
  type Post,
} from '../services/blog.service';
import { resolveStrapiMediaUrl } from '@/shared/utils/strapiMedia';

const SITE_TITLE = 'Tienda E-commerce';

const route = useRoute();

const post = ref<Post | null>(null);
const relatedPosts = ref<Post[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const slug = computed(() => String(route.params.slug ?? ''));

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: true,
});

function mediaUrl(media: BlogMedia | null | undefined): string {
  if (!media) return '';
  if (media.url) return resolveStrapiMediaUrl(media.url);

  const formats = media.formats as
    | Record<string, { url?: string } | undefined>
    | undefined;
  const nested =
    formats?.large?.url ||
    formats?.medium?.url ||
    formats?.small?.url ||
    formats?.thumbnail?.url;

  return nested ? resolveStrapiMediaUrl(nested) : '';
}

function postCoverUrl(p: Post | null | undefined): string {
  if (!p) return '';
  return mediaUrl(p.cover) || mediaUrl(p.image);
}

function postPrimaryCategory(p: Post | null | undefined): BlogCategory | null {
  if (!p) return null;
  if (p.blogCategory) return p.blogCategory;
  if (p.category) return p.category;
  if (Array.isArray(p.categories) && p.categories.length > 0) return p.categories[0];
  return null;
}

function formatPublishedDate(value: string | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatReadingTime(value: string | number | null | undefined): string {
  if (value == null) return '';
  if (typeof value === 'number') return `${value} min de lectura`;
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /\d/.test(trimmed) && !/\D[a-zA-Z]/.test(trimmed)
    ? `${trimmed} min de lectura`
    : trimmed;
}

const heroImageUrl = computed(() => postCoverUrl(post.value));

const heroCategoryLabel = computed(
  () => postPrimaryCategory(post.value)?.name ?? 'Atelier Stories'
);

const publishedLabel = computed(() =>
  formatPublishedDate(post.value?.published ?? post.value?.createdAt)
);

const readingTimeLabel = computed(() => formatReadingTime(post.value?.readingTime));

const contentHtml = computed(() => {
  const raw = typeof post.value?.content === 'string' ? post.value.content : '';
  if (!raw.trim()) return '';
  const rendered = md.render(raw);
  return DOMPurify.sanitize(rendered, { ADD_ATTR: ['target', 'rel'] });
});

const showRelatedSection = computed(
  () => post.value?.showRelatedPosts === true && relatedPosts.value.length > 0
);

function applyDocumentTitle(p: Post | null) {
  if (typeof document === 'undefined') return;
  const seoTitle =
    typeof p?.seo === 'object' && p?.seo != null
      ? (p.seo as Record<string, unknown>).metaTitle
      : undefined;
  const candidate =
    (typeof seoTitle === 'string' && seoTitle.trim() !== '' ? seoTitle : null) ??
    (p?.title?.trim() ? p.title : null);
  document.title = candidate ? `${candidate} | ${SITE_TITLE}` : SITE_TITLE;
}

async function loadRelated(currentPost: Post) {
  if (currentPost.showRelatedPosts !== true) {
    relatedPosts.value = [];
    return;
  }

  const category = postPrimaryCategory(currentPost);
  const categoryId = category?.id ?? category?.documentId;
  const currentId = currentPost.id ?? currentPost.documentId;
  if (categoryId == null || currentId == null) {
    relatedPosts.value = [];
    return;
  }

  try {
    relatedPosts.value = await fetchRelatedPosts(categoryId, currentId, 3);
  } catch (err) {
    console.error('[BlogPostView] failed to fetch related posts', err);
    relatedPosts.value = [];
  }
}

async function load() {
  const slugValue = slug.value;
  if (!slugValue) {
    post.value = null;
    relatedPosts.value = [];
    error.value = 'Artículo no encontrado.';
    return;
  }

  loading.value = true;
  error.value = null;
  post.value = null;
  relatedPosts.value = [];

  try {
    const fetched = await fetchPostBySlug(slugValue);
    if (!fetched) {
      error.value = 'Artículo no encontrado.';
      return;
    }
    post.value = fetched;
    await loadRelated(fetched);
  } catch (err) {
    console.error('[BlogPostView] load', err);
    error.value = 'No se pudo cargar el artículo.';
    post.value = null;
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

watch(post, (value) => applyDocumentTitle(value), { immediate: true });

onBeforeUnmount(() => applyDocumentTitle(null));
</script>

<template>
  <div class="pb-32">
    <div v-if="loading" class="max-w-screen-2xl mx-auto px-8 py-32 text-center">
      <p class="text-xs font-bold uppercase tracking-widest text-on-surface-variant animate-pulse">
        Cargando artículo…
      </p>
    </div>

    <div v-else-if="error" class="max-w-screen-2xl mx-auto px-8 py-32 text-center">
      <p class="text-on-surface-variant">{{ error }}</p>
      <RouterLink
        to="/blog"
        class="mt-6 inline-block text-sm font-semibold text-primary border-b border-primary hover:opacity-70"
      >
        Volver al blog
      </RouterLink>
    </div>

    <article v-else-if="post">
      <header
        class="relative w-full h-[60vh] min-h-[480px] md:h-[819px] bg-surface-container-highest overflow-hidden"
      >
        <img
          v-if="heroImageUrl"
          :src="heroImageUrl"
          :alt="post.cover?.alternativeText ?? post.title ?? ''"
          class="absolute inset-0 w-full h-full object-cover object-center opacity-90"
        />
        <div
          class="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"
        />
        <div class="absolute bottom-0 left-0 w-full px-8 pb-16 md:px-16 lg:pb-32 max-w-[1920px] mx-auto">
          <div class="max-w-4xl mx-auto text-center">
            <span
              class="font-label text-sm tracking-widest text-on-surface-variant uppercase mb-6 block"
            >
              {{ heroCategoryLabel }}
            </span>
            <h1
              class="font-headline text-5xl md:text-7xl font-bold tracking-tight text-primary leading-[1.1] mb-8"
            >
              {{ post.title }}
            </h1>
            <div
              class="flex flex-wrap items-center justify-center gap-3 md:gap-6 font-label text-sm text-on-surface-variant"
            >
              <span v-if="post.author" class="font-medium text-primary">{{ post.author }}</span>
              <span
                v-if="post.author && publishedLabel"
                class="hidden md:inline-block w-1 h-1 rounded-full bg-outline-variant"
              />
              <span v-if="publishedLabel">{{ publishedLabel }}</span>
              <span
                v-if="publishedLabel && readingTimeLabel"
                class="hidden md:inline-block w-1 h-1 rounded-full bg-outline-variant"
              />
              <span v-if="readingTimeLabel">{{ readingTimeLabel }}</span>
            </div>
          </div>
        </div>
      </header>

      <section class="max-w-3xl mx-auto px-6 md:px-12 py-24 md:py-32">
        <div
          v-if="contentHtml"
          class="prose prose-lg prose-slate mx-auto max-w-none text-on-surface-variant"
          v-html="contentHtml"
        />
        <p v-else class="text-on-surface-variant text-center">
          Este artículo aún no tiene contenido.
        </p>

        <div
          v-if="post.excerpt"
          class="mt-16 pt-8 border-t border-outline-variant/15 text-on-surface-variant italic"
        >
          {{ post.excerpt }}
        </div>
      </section>
    </article>

    <section
      v-if="post && showRelatedSection"
      class="bg-surface-container-low py-32 px-6 md:px-12"
    >
      <div class="max-w-[1920px] mx-auto">
        <div class="flex justify-between items-end mb-16">
          <h3 class="text-4xl font-headline font-bold text-primary tracking-tight">
            Related Stories
          </h3>
          <RouterLink
            to="/blog"
            class="hidden md:flex items-center gap-2 text-primary font-medium hover:opacity-70 transition-opacity"
          >
            View All Stories
            <span class="material-symbols-outlined text-sm">arrow_forward</span>
          </RouterLink>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <RouterLink
            v-for="(related, idx) in relatedPosts"
            :key="related.documentId ?? related.id ?? idx"
            :to="related.slug ? `/blog/${related.slug}` : '/blog'"
            class="group block bg-surface-container-lowest rounded-xl overflow-hidden hover:scale-[1.02] transition-transform duration-300"
            :class="{ 'md:translate-y-12': idx === 1 }"
          >
            <div class="aspect-[4/3] bg-surface-container-high relative overflow-hidden">
              <img
                v-if="postCoverUrl(related)"
                :src="postCoverUrl(related)"
                :alt="related.cover?.alternativeText ?? related.title ?? ''"
                class="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
              />
              <div
                v-else
                class="w-full h-full flex items-center justify-center text-on-surface-variant text-sm"
              >
                Sin imagen
              </div>
            </div>
            <div class="p-8">
              <span
                class="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-4 block"
              >
                {{ postPrimaryCategory(related)?.name ?? 'Story' }}
              </span>
              <h4 class="text-xl font-headline font-bold text-primary mb-3">
                {{ related.title }}
              </h4>
              <p
                v-if="related.excerpt"
                class="text-on-surface-variant text-sm line-clamp-2"
              >
                {{ related.excerpt }}
              </p>
            </div>
          </RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>
