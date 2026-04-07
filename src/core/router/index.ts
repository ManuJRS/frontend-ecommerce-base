import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
// We'll import StoreViewPage from features dynamically or directly
const StoreViewPage = () => import('@/features/store-view/views/StoreViewPage.vue');

const routes: Array<RouteRecordRaw> = [
  {
    // The main catch-all for dynamic pages coming from Strapi
    path: '/:pathMatch(.*)*',
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
