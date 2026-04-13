<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import type { HeaderNavLink } from '../models';
import { useHeaderStore } from '../stores/header.store';
import { useCartStore } from '@/features/cart/stores/cart.store';
import { useCartConfigStore } from '@/features/cart/stores/cartConfig.store';

const headerStore = useHeaderStore();
const cartStore = useCartStore();
const cartConfigStore = useCartConfigStore();
const route = useRoute();

const isOnCartViewPage = computed(() => {
  const slug = route.params.slug;
  return typeof slug === 'string' && cartConfigStore.isCartSlug(slug);
});

function onCartIconClick() {
  if (isOnCartViewPage.value) return;
  cartStore.openDrawer();
}

watch(isOnCartViewPage, (onCart) => {
  if (onCart) cartStore.closeDrawer();
});

const data = computed(() => headerStore.header);

const mobileNavOpen = ref(false);

const showTextLogo = computed(() => (data.value?.logDisplay ?? 'text') === 'text');
const showImageLogo = computed(() => !showTextLogo.value && data.value?.logoSVG);
const hasNavLinks = computed(() => Boolean(data.value?.navLinks?.length));
const showMobileMenu = computed(
  () => hasNavLinks.value || Boolean(data.value?.showSearch)
);

function normalizeInternalPath(url: string): string {
  const u = (url ?? '').trim();
  if (!u) return '/';
  if (u.startsWith('/')) return u;
  return `/${u}`;
}

function isExternalLink(link: HeaderNavLink): boolean {
  return link.isExternal === true;
}

function isAbsoluteHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test((url ?? '').trim());
}

function navLinkClasses(isActive: boolean, mobile = false): string {
  const base = mobile
    ? 'block w-full py-3 px-1 text-base font-manrope tracking-tight border-b border-slate-200/80 dark:border-slate-800 transition-colors last:border-b-0'
    : 'pb-1 border-b-2 transition-colors font-manrope tracking-tight';
  if (mobile) {
    if (isActive) {
      return `${base} text-slate-900 dark:text-slate-50 font-semibold`;
    }
    return `${base} text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100`;
  }
  if (isActive) {
    return `${base} text-slate-900 dark:text-slate-50 border-slate-900 dark:border-slate-50`;
  }
  return `${base} border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50`;
}

function isNavActive(link: HeaderNavLink): boolean {
  if (isExternalLink(link) || isAbsoluteHttpUrl(link.url)) return false;
  const path = normalizeInternalPath(link.url);
  return route.path === path;
}

function toggleMobileNav() {
  mobileNavOpen.value = !mobileNavOpen.value;
}

function closeMobileNav() {
  mobileNavOpen.value = false;
}

function onDocumentKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeMobileNav();
}

watch(
  () => route.fullPath,
  () => {
    closeMobileNav();
  }
);

watch(mobileNavOpen, (open) => {
  if (typeof document === 'undefined') return;
  document.body.style.overflow = open ? 'hidden' : '';
});

onMounted(() => {
  headerStore.fetchHeader();
  document.addEventListener('keydown', onDocumentKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', onDocumentKeydown);
  document.body.style.overflow = '';
});
</script>

<template>
  <header
    class="fixed top-0 w-full z-50 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm transition-all duration-300 ease-in-out"
  >
    <!-- Fondo al abrir menú móvil -->
    <div
      v-show="mobileNavOpen"
      class="fixed inset-0 z-[45] bg-black/35 md:hidden"
      aria-hidden="true"
      @click="closeMobileNav"
    />

    <div class="relative z-[55] bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-xl">
      <div
        class="flex justify-between items-center gap-3 sm:gap-4 px-4 sm:px-6 lg:px-8 min-h-16 sm:min-h-20 py-2 sm:py-0 w-full max-w-[100vw]"
      >
        <div class="flex items-center gap-2 sm:gap-4 md:gap-8 min-w-0 flex-1">
          <button
            v-if="showMobileMenu"
            type="button"
            class="md:hidden shrink-0 -ml-1 rounded-lg p-2 text-slate-800 dark:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
            :aria-expanded="mobileNavOpen"
            aria-controls="mobile-nav-panel"
            aria-label="Abrir o cerrar menú de navegación"
            @click="toggleMobileNav"
          >
            <span class="material-symbols-outlined text-2xl" aria-hidden="true">
              {{ mobileNavOpen ? 'close' : 'menu' }}
            </span>
          </button>

          <router-link
            to="/"
            class="flex items-center min-w-0 shrink text-lg sm:text-xl md:text-2xl font-bold tracking-tighter text-slate-900 dark:text-slate-50"
            @click="closeMobileNav"
          >
            <template v-if="showTextLogo">
              <span class="truncate max-w-[55vw] sm:max-w-[60vw] md:max-w-none">
                {{ data?.logoText || '\u00a0' }}
              </span>
            </template>
            <img
              v-else-if="showImageLogo"
              :src="data!.logoSVG!"
              :alt="data?.logoText || ''"
              class="h-7 sm:h-8 w-auto max-w-[40vw] object-contain object-left"
            />
          </router-link>

          <nav v-if="data?.navLinks?.length" class="hidden md:flex gap-6 lg:gap-8 items-center shrink-0">
            <template v-for="link in data.navLinks" :key="link.id">
              <a
                v-if="isExternalLink(link)"
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
                :class="navLinkClasses(false)"
              >
                {{ link.label }}
              </a>
              <a
                v-else-if="isAbsoluteHttpUrl(link.url)"
                :href="link.url"
                :class="navLinkClasses(false)"
              >
                {{ link.label }}
              </a>
              <router-link
                v-else
                :to="normalizeInternalPath(link.url)"
                :class="navLinkClasses(isNavActive(link))"
              >
                {{ link.label }}
              </router-link>
            </template>
          </nav>
        </div>

        <div class="flex items-center gap-2 sm:gap-4 md:gap-6 shrink-0">
          <div
            v-if="data?.showSearch"
            class="relative hidden md:block max-w-[10rem] lg:max-w-none"
          >
            <span
              class="material-symbols-outlined absolute left-2.5 lg:left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm pointer-events-none"
            >
              search
            </span>
            <input
              class="bg-surface-container-highest border-none rounded-lg pl-9 lg:pl-10 pr-3 lg:pr-4 py-2 w-full md:w-44 lg:w-64 focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary/20 text-sm font-body transition-all"
              placeholder="Search collections..."
              type="search"
              autocomplete="off"
            />
          </div>

          <div class="flex items-center gap-1 sm:gap-2 md:gap-4">
            <button
              v-if="data?.showProfileIcon"
              type="button"
              class="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded-md p-1.5 sm:p-2 transition-all"
              aria-label="Cuenta"
            >
              <span class="material-symbols-outlined text-[22px] sm:text-[24px]" data-icon="person"
                >person</span
              >
            </button>
            <button
              v-if="data?.showFavIcon"
              type="button"
              class="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded-md p-1.5 sm:p-2 transition-all"
              aria-label="Favoritos"
            >
              <span class="material-symbols-outlined text-[22px] sm:text-[24px]" data-icon="favorite"
                >favorite</span
              >
            </button>
            <button
              v-if="data?.showCart"
              type="button"
              class="hover:cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded-md p-1.5 sm:p-2 transition-all relative"
              aria-label="Carrito"
              @click="onCartIconClick"
            >
              <span class="material-symbols-outlined text-[22px] sm:text-[24px]" data-icon="shopping_bag"
                >shopping_bag</span
              >
              <span
                v-if="cartStore.totalItemCount > 0"
                class="absolute -top-0.5 -right-0.5 sm:top-0 sm:right-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary text-[10px] font-bold text-on-primary leading-none"
              >
                {{ cartStore.totalItemCount > 99 ? '99+' : cartStore.totalItemCount }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Panel móvil: enlaces + búsqueda -->
      <div
        v-show="mobileNavOpen && showMobileMenu"
        id="mobile-nav-panel"
        class="md:hidden border-t border-slate-200/60 dark:border-slate-800/60 max-h-[min(70vh,100dvh-4rem)] overflow-y-auto overscroll-contain px-4 pb-4 pt-2 shadow-inner"
      >
        <div v-if="data?.showSearch" class="relative mb-3 mt-1">
          <span
            class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm"
          >
            search
          </span>
          <input
            class="bg-surface-container-highest border-none rounded-lg pl-10 pr-4 py-2.5 w-full focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary/20 text-sm font-body transition-all"
            placeholder="Search collections..."
            type="search"
            autocomplete="off"
          />
        </div>

        <nav v-if="hasNavLinks" class="flex flex-col" aria-label="Navegación principal">
          <template v-for="link in data?.navLinks ?? []" :key="link.id">
            <a
              v-if="isExternalLink(link)"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              :class="navLinkClasses(false, true)"
              @click="closeMobileNav"
            >
              {{ link.label }}
            </a>
            <a
              v-else-if="isAbsoluteHttpUrl(link.url)"
              :href="link.url"
              :class="navLinkClasses(false, true)"
              @click="closeMobileNav"
            >
              {{ link.label }}
            </a>
            <router-link
              v-else
              :to="normalizeInternalPath(link.url)"
              :class="navLinkClasses(isNavActive(link), true)"
              @click="closeMobileNav"
            >
              {{ link.label }}
            </router-link>
          </template>
        </nav>
      </div>
    </div>
  </header>
</template>
