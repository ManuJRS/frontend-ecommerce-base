import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const HomePage = () => import('@/features/home/views/HomePage.vue');
const SlugEntryView = () => import('@/features/routing/views/SlugEntryView.vue');

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: HomePage,
  },
  {
    /**
     * Página de tienda (`StoreViewPage`) o carrito (`CartViewPage`) según `slug` en `cart-config`.
     */
    path: '/:slug',
    name: 'DynamicStoreView',
    component: SlugEntryView,
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
