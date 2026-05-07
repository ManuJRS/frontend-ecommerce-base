<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import type { BlogMedia, Post } from '@/features/blog/services/blog.service';
import { normalizeBlogPost } from '@/features/blog/services/blog.service';
import { resolveStrapiMediaUrl } from '@/shared/utils/strapiMedia';

type SharedFeaturedBlogBlock = {
  title?: string;
  post?: unknown;
  featuredPost?: unknown;
  blogFeatured?: unknown;
};

const props = defineProps<{
  title?: string;
  post?: unknown;
  block?: SharedFeaturedBlogBlock;
  data?: Record<string, unknown>;
}>();

const featuredBlock = computed(
  () => (props.data ?? props.block ?? {}) as SharedFeaturedBlogBlock
);

function relationFirst(raw: unknown): unknown {
  if (Array.isArray(raw)) return raw[0];
  if (raw && typeof raw === 'object' && 'data' in raw) {
    const data = (raw as { data?: unknown }).data;
    return Array.isArray(data) ? data[0] : data;
  }
  return raw;
}

const resolvedTitle = computed(() => props.title ?? featuredBlock.value.title ?? '');

const featuredPost = computed<Post | null>(() => {
  const raw =
    props.post ??
    featuredBlock.value.post ??
    featuredBlock.value.featuredPost ??
    featuredBlock.value.blogFeatured;
  const first = relationFirst(raw);
  if (!first) return null;
  const post = normalizeBlogPost(first);
  return post.id != null || post.documentId || post.slug || post.title ? post : null;
});

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

const coverUrl = computed(() => mediaUrl(featuredPost.value?.cover) || mediaUrl(featuredPost.value?.image));

const categoryLabel = computed(
  () =>
    featuredPost.value?.blogCategory?.name ??
    featuredPost.value?.category?.name ??
    featuredPost.value?.categories?.[0]?.name ??
    'Atelier Stories'
);

const postLink = computed(() => {
  const slug = featuredPost.value?.slug;
  return slug ? `/blog/${slug}` : '/blog';
});
</script>

<template>
  <section v-if="featuredPost" class="w-full px-8">
    <div class="mx-auto max-w-screen-2xl">
      <h2
        v-if="resolvedTitle"
        class="mb-10 text-center font-headline text-3xl font-black tracking-tight text-primary md:text-4xl"
      >
        {{ resolvedTitle }}
      </h2>

      <RouterLink
        :to="postLink"
        class="group grid grid-cols-1 gap-0 overflow-hidden rounded-xl bg-surface-container-lowest lg:grid-cols-12"
      >
        <div class="relative h-[500px] overflow-hidden lg:col-span-7">
          <img
            v-if="coverUrl"
            :src="coverUrl"
            :alt="featuredPost.cover?.alternativeText ?? featuredPost.title ?? 'Featured article'"
            class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div v-else class="flex h-full w-full items-center justify-center bg-surface-container text-sm text-on-surface-variant">
            Sin imagen
          </div>
        </div>
        <div
          class="flex flex-col justify-center bg-surface-container-low p-12 transition-colors duration-500 group-hover:bg-surface-container lg:col-span-5 lg:p-16"
        >
          <span
            class="mb-6 inline-block w-max rounded-DEFAULT bg-surface-container-highest px-3 py-1 text-xs font-bold uppercase tracking-widest text-on-surface"
          >
            {{ categoryLabel }}
          </span>
          <h3 class="mb-6 font-headline text-4xl font-bold leading-tight tracking-tight text-primary">
            {{ featuredPost.title }}
          </h3>
          <p v-if="featuredPost.excerpt" class="font-body mb-10 text-lg leading-relaxed text-on-surface-variant">
            {{ featuredPost.excerpt }}
          </p>
          <span class="inline-flex w-max items-center font-headline font-bold text-primary">
            Read Full Story
            <span class="material-symbols-outlined ml-2 transition-transform duration-300 group-hover:translate-x-2">
              arrow_forward
            </span>
          </span>
        </div>
      </RouterLink>
    </div>
  </section>
</template>
