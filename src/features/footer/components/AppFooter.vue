<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import type { FooterLinkItem } from '../models';
import { useFooterStore } from '../stores/footer.store';
import { toMailtoHrefIfEmail, toTelHrefIfPhone } from '../utils/footerContactHref';

const footerStore = useFooterStore();
const { footer } = storeToRefs(footerStore);

const email = ref('');

onMounted(async () => {
  await footerStore.fetchFooter();
  console.log('[AppFooter] datos del footer', footerStore.footer);
});

const data = computed(() => footer.value);

const showTextLogo = computed(() => (data.value?.logDisplay ?? 'text') === 'text');
const showImageLogo = computed(() => !showTextLogo.value && Boolean(data.value?.logoSvgUrl));

const showNewsletter = computed(() => data.value?.newslleter?.showNewslleter === true);
const showMapBlock = computed(
  () => data.value?.map?.showMap === true && Boolean((data.value?.map?.iframe ?? '').trim())
);

const socialIconsWithSvg = computed(
  () => data.value?.socialMedia?.icons.filter((i) => Boolean(i.svgUrl)) ?? []
);

function normalizeInternalPath(url: string): string {
  const u = (url ?? '').trim();
  if (!u) return '/';
  if (u.startsWith('/')) return u;
  return `/${u}`;
}

function isAbsoluteHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test((url ?? '').trim());
}

function isExternalHref(link: FooterLinkItem): boolean {
  const u = (link.link ?? '').trim();
  return u.startsWith('mailto:') || u.startsWith('tel:') || u.startsWith('sms:');
}

/** Compone las utilidades de contacto (correo antes que teléfono para no confundir `@` con texto telefónico). */
function footerLinkContactHref(link: string | null | undefined): string | null {
  const mailto = toMailtoHrefIfEmail(link);
  if (mailto !== null) return mailto;
  return toTelHrefIfPhone(link);
}

const footerContactHrefCache = new Map<string, string | null>();

/** Misma resolución que `footerLinkContactHref`, con memo por texto de `link` (evita doble cómputo en plantilla). */
function getFooterContactHrefCached(link: string | null | undefined): string | null {
  const key = String(link ?? '');
  if (!footerContactHrefCache.has(key)) {
    footerContactHrefCache.set(key, footerLinkContactHref(link));
  }
  return footerContactHrefCache.get(key) ?? null;
}

function linkClasses(): string {
  return 'text-slate-400 text-xs hover:text-white underline underline-offset-4 transition-opacity duration-200';
}

function footerLinkTextOnlyClasses(): string {
  return 'text-slate-400 text-xs leading-relaxed no-underline';
}

function isBlankLink(link: string | null | undefined): boolean {
  return link == null || String(link).trim() === '';
}

function onNewsletterSubmit() {
  // Integrar con endpoint de newsletter cuando exista en backend
}
</script>

<template>
  <footer
    v-if="data"
    class="relative z-30 w-full border-t border-slate-800 bg-slate-950 font-manrope dark:bg-black"
  >
    <div
      class="grid w-full gap-12 px-6 py-16 sm:px-10 md:px-12 md:py-20"
      style="grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr))"
    >
      <!-- Marca / logo -->
      <div class="min-w-0 md:max-w-xs">
        <router-link
          to="/"
          class="mb-6 block"
        >
          <span
            v-if="showTextLogo"
            class="text-xl font-black text-slate-50"
          >
            {{ data.logoText || '\u00a0' }}
          </span>
          <img
            v-else-if="showImageLogo"
            :src="data.logoSvgUrl!"
            :alt="data.logoText || ''"
            class="h-8 w-auto max-w-full object-contain object-left"
          />
        </router-link>
        <p
          v-if="data.footerText"
          class="text-xs leading-relaxed text-slate-400"
        >
          {{ data.footerText }}
        </p>
      </div>

      <!-- Columnas dinámicas -->
      <div
        v-for="col in data.column"
        :key="col.id"
        class="min-w-0"
      >
        <h4 class="mb-6 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-50">
          {{ col.footerColumnTitle }}
        </h4>
        <ul class="space-y-4">
          <li
            v-for="item in col.footerLink"
            :key="item.id"
          >
            <a
              v-if="isExternalHref(item)"
              :href="item.link"
              :class="linkClasses()"
            >
              {{ item.title }}
            </a>
            <a
              v-else-if="getFooterContactHrefCached(item.link)"
              :href="getFooterContactHrefCached(item.link)!"
              :class="linkClasses()"
            >
              {{ item.title }}
            </a>
            <a
              v-else-if="isAbsoluteHttpUrl(item.link)"
              :href="item.link"
              :class="linkClasses()"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ item.title }}
            </a>
            <span
              v-else-if="isBlankLink(item.link)"
              :class="footerLinkTextOnlyClasses()"
            >
              {{ item.title }}
            </span>
            <router-link
              v-else
              :to="normalizeInternalPath(item.link)"
              :class="linkClasses()"
            >
              {{ item.title }}
            </router-link>
          </li>
        </ul>
      </div>

      <!-- Newsletter (siempre al final del bloque principal cuando aplica) -->
      <div
        v-if="showNewsletter && data.newslleter"
        class="min-w-0"
      >
        <h4 class="mb-6 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-50">
          {{ data.newslleter.newslleterTitle }}
        </h4>
        <form
          class="relative"
          @submit.prevent="onNewsletterSubmit"
        >
          <label
            class="sr-only"
            :for="`footer-newsletter-${data.id}`"
          >{{ data.newslleter.newslleterInputText }}</label>
          <input
            :id="`footer-newsletter-${data.id}`"
            v-model="email"
            class="w-full border-none bg-slate-900 py-3 pl-4 pr-12 text-xs text-slate-50 focus:ring-1 focus:ring-slate-700"
            type="email"
            name="email"
            autocomplete="email"
            :placeholder="data.newslleter.newslleterInputText"
          />
          <button
            type="submit"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-white"
            aria-label="Suscribirse al newsletter"
          >
            <span
              class="material-symbols-outlined text-sm"
              aria-hidden="true"
            >arrow_forward</span>
          </button>
        </form>
        <p
          v-if="data.newslleter.newslleterAdvice"
          class="mt-4 text-[9px] leading-relaxed text-slate-500"
        >
          {{ data.newslleter.newslleterAdvice }}
        </p>
      </div>

      <!-- Mapa -->
      <div
        v-if="showMapBlock && data.map"
        class="min-w-0"
      >
        <h4 class="mb-6 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-50">
          {{ data.map.title }}
        </h4>
        <div
          class="aspect-square w-full overflow-hidden border border-slate-800 bg-slate-900 opacity-80 grayscale transition-opacity duration-500 hover:opacity-100"
        >
          <iframe
            :title="data.map.title"
            class="h-full w-full border-0"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
            :src="data.map.iframe"
          />
        </div>
        <p
          v-if="data.map.advice"
          class="mt-4 text-[9px] uppercase leading-relaxed tracking-widest text-slate-500"
        >
          {{ data.map.advice }}
        </p>
      </div>
    </div>

    <!-- Barra inferior -->
    <div
      v-if="data.socialMedia && (data.socialMedia.singTitle || socialIconsWithSvg.length)"
      class="flex flex-col items-center justify-between gap-6 border-t border-slate-900 px-6 py-8 sm:px-10 md:flex-row md:px-12"
    >
      <div
        v-if="data.socialMedia.singTitle"
        class="text-center text-[10px] font-medium tracking-widest text-slate-50 md:text-left"
      >
        {{ data.socialMedia.singTitle }}
      </div>
      <div
        v-if="socialIconsWithSvg.length"
        class="flex flex-wrap justify-center gap-6 text-slate-400 md:justify-end"
      >
        <a
          v-for="icon in socialIconsWithSvg"
          :key="icon.id"
          :href="icon.link"
          class="transition-colors hover:text-white"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="`Red social (${icon.link})`"
        >
          <img
            :src="icon.svgUrl!"
            alt=""
            class="h-5 w-5 object-contain"
            width="20"
            height="20"
          />
        </a>
      </div>
    </div>
  </footer>
</template>
