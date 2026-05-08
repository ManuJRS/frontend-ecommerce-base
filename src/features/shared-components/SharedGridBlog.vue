<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import type { BlogMedia, Post } from '@/features/blog/services/blog.service';
import { useBlogFilter } from '@/features/blog/composables/useBlogFilter';
import { fetchPosts, normalizeBlogPost } from '@/features/blog/services/blog.service';
import { resolveStrapiMediaUrl } from '@/shared/utils/strapiMedia';

type GridBlogMode = 'auto' | 'manual';

type SharedGridBlogBlock = {
  title?: string;
  span?: string;
  mode?: GridBlogMode;
  blogManual?: unknown;
  posts?: unknown;
};

const props = defineProps<{
  title?: string;
  span?: string;
  mode?: GridBlogMode;
  blogManual?: unknown;
  block?: SharedGridBlogBlock;
  data?: Record<string, unknown>;
}>();

const gridBlock = computed(() => (props.data ?? props.block ?? {}) as SharedGridBlogBlock);

const { matchesSelectedCategory } = useBlogFilter();

const posts = ref<Post[]>([]);
const loading = ref(false);

const resolvedTitle = computed(() => props.title ?? gridBlock.value.title ?? '');
const resolvedSpan = computed(() => props.span ?? gridBlock.value.span ?? '');
const resolvedMode = computed<GridBlogMode>(() => props.mode ?? gridBlock.value.mode ?? 'manual');

const filteredPosts = computed(() => posts.value.filter((post) => matchesSelectedCategory(post)));

const manualSource = computed(
  () => props.blogManual ?? gridBlock.value.blogManual ?? gridBlock.value.posts
);

function relationItems(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && 'data' in raw) {
    const data = (raw as { data?: unknown }).data;
    if (Array.isArray(data)) return data;
    return data == null ? [] : [data];
  }
  return raw == null ? [] : [raw];
}

function normalizeManualPosts(raw: unknown): Post[] {
  return relationItems(raw)
    .map(normalizeBlogPost)
    .filter((post) => post.id != null || post.documentId || post.slug || post.title);
}

function mediaUrl(media: BlogMedia | null | undefined): string {
  if (!media) return '';
  if (media.url) return resolveStrapiMediaUrl(media.url);
  const formats = media.formats as Record<string, { url?: string } | undefined> | undefined;
  const nested =
    formats?.large?.url ||
    formats?.medium?.url ||
    formats?.small?.url ||
    formats?.thumbnail?.url;
  return nested ? resolveStrapiMediaUrl(nested) : '';
}

function postCoverUrl(post: Post): string {
  return mediaUrl(post.cover) || mediaUrl(post.image);
}

function categoryLabel(post: Post): string {
  return post.blogCategory?.name ?? post.category?.name ?? post.categories?.[0]?.name ?? post.BlogCategory?.[0]?.name ?? 'Blog';
}

function postLink(post: Post): string {
  return post.slug ? `/blog/${post.slug}` : '/blog';
}

function postExcerpt(post: Post): string {
  if (post.excerpt?.trim()) return post.excerpt.trim();
  if (!post.content?.trim()) return '';
  return post.content
    .replace(/[#>*_`[\]()!-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
}

async function loadPosts() {
  if (resolvedMode.value === 'manual') {
    posts.value = normalizeManualPosts(manualSource.value);
    return;
  }

  loading.value = true;
  try {
    posts.value = await fetchPosts({ publishedOnly: true, dateOrder: 'desc' });
  } catch (error) {
    console.error('[SharedGridBlog] failed loading posts', error);
    posts.value = [];
  } finally {
    loading.value = false;
  }
}

watch([resolvedMode, manualSource], () => void loadPosts(), { immediate: true, deep: true });
</script>

<template>
  <section v-if="loading || posts.length > 0" class="w-full px-8 py-16 md:py-24">
    <div class="mx-auto max-w-screen-2xl">
      <div v-if="resolvedTitle || resolvedSpan" class="mb-12 text-center md:mb-16">
        <span
          v-if="resolvedSpan"
          class="mb-3 block text-xs font-bold uppercase tracking-[0.35em] text-on-surface-variant"
        >
          {{ resolvedSpan }}
        </span>
        <h2 v-if="resolvedTitle" class="font-headline text-3xl font-black tracking-tight text-primary md:text-5xl">
          {{ resolvedTitle }}
        </h2>
      </div>

      <div v-if="loading" class="py-16 text-center text-sm text-on-surface-variant">
        Cargando historias...
      </div>

      <div
        v-else-if="filteredPosts.length === 0"
        class="py-16 text-center text-sm text-on-surface-variant"
      >
        No hay publicaciones en esta categoría.
      </div>

      <div v-else class="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-3 lg:gap-16">
        <article
          v-for="(post, idx) in filteredPosts"
          :key="post.documentId ?? post.id ?? idx"
          class="group flex flex-col"
          :class="{ 'lg:mt-24': idx % 3 === 1 }"
        >
          <RouterLink :to="postLink(post)" class="block">
            <div
              class="mb-6 overflow-hidden rounded-lg bg-surface-container-low"
              :class="idx % 3 === 1 ? 'aspect-square' : idx % 3 === 2 ? 'aspect-[3/4]' : 'aspect-[4/5]'"
            >
              <img
                v-if="postCoverUrl(post)"
                :src="postCoverUrl(post)"
                :alt="post.cover?.alternativeText ?? post.title ?? 'Article image'"
                class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
              <div v-else class="flex h-full w-full items-center justify-center text-sm text-on-surface-variant">
                Sin imagen
              </div>
            </div>
          </RouterLink>

          <span class="mb-3 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            {{ categoryLabel(post) }}
          </span>
          <RouterLink :to="postLink(post)" class="block">
            <h3
              class="mb-3 font-headline text-2xl font-bold leading-snug text-primary transition-colors group-hover:text-surface-tint"
            >
              {{ post.title }}
            </h3>
          </RouterLink>
          <p v-if="postExcerpt(post)" class="font-body mb-6 line-clamp-3 text-on-surface-variant">
            {{ postExcerpt(post) }}
          </p>
          <span class="mb-3 text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            tiempo de lectura: {{ post.readingTime }} min
          </span>
          <div class="mt-auto">
            <RouterLink :to="postLink(post)" class="inline-flex items-center text-sm font-bold text-primary">
              Read More
              <span class="material-symbols-outlined ml-1 text-[1rem]">east</span>
            </RouterLink>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
