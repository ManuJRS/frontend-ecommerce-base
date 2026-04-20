import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const HomePage = () => import('@/features/home/views/HomePage.vue');
const SlugEntryView = () => import('@/features/routing/views/SlugEntryView.vue');
const CheckoutPage = () => import('@/features/checkout/views/CheckoutPage.vue');
const CheckoutSuccessPage = () => import('@/features/checkout/views/CheckoutSuccess.vue');
const ProductView = () => import('@/features/products/views/ProductView.vue');

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: HomePage,
  },
  {
    /** `slug` del producto en Strapi (coincide con el campo `slug`). */
    path: '/tienda/:slug',
    name: 'Product',
    component: ProductView,
  },
  {
    path: '/checkout/success',
    name: 'CheckoutSuccess',
    component: CheckoutSuccessPage,
  },
  {
    path: '/checkout',
    name: 'Checkout',
    component: CheckoutPage,
  },
  {
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
