import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const HomePage = () => import('@/features/home/views/HomePage.vue');
const StoreViewPage = () => import('@/features/store-view/views/StoreViewPage.vue');

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: HomePage,
  },
  {
    /** Slug canónico de la tienda (p. ej. `tiendas-1`), alineado con `StoreViewPageData.slug` */
    path: '/:slug',
    name: 'DynamicStoreView',
    component: StoreViewPage,
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
});

export default router;
