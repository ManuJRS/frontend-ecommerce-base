<script setup lang="ts">
import type { StoreViewBlock } from '../models';

defineProps<{
  block: StoreViewBlock; // Ojo: Asegúrate de que tu interface incluya manualProducts?: any[]
}>();
</script>

<template>
  <section class="py-8 bg-new-surface-bg px-4 md:px-8">
    <div class="flex justify-between items-end mb-12">
      <h3 class="text-xs font-bold uppercase tracking-[0.3em] text-on-surface-variant">{{ block.title || 'The Collection' }}</h3>
      <p class="text-xs text-on-surface-variant">Mostrando {{ block.manualProducts?.length || 0 }} productos</p>
    </div>
    
    <div v-if="block.manualProducts && block.manualProducts.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-16 gap-x-8">
      
      <!-- Product Card Dinámica -->
      <div 
        v-for="product in block.manualProducts" 
        :key="product.id" 
        class="group cursor-pointer"
      >
        <div class="relative bg-surface-container-low aspect-[3/4] overflow-hidden mb-6">
          <img 
            v-if="product.images && product.images.length > 0" 
            :src="product.images[0].url" 
            :alt="product.name" 
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-gray-400 text-sm bg-gray-100">
            Sin Imagen
          </div>

          <!-- Bestseller Badge Dinámico -->
          <div 
            v-if="product.isBestseller"
            class="absolute bottom-4 right-4 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2 py-1 shadow-sm opacity-100 group-hover:opacity-0 transition-opacity duration-300"
          >
            <span class="material-symbols-outlined text-[10px] text-primary">star</span>
            <span class="text-[9px] font-bold uppercase tracking-[0.2em] text-primary">Bestseller</span>
          </div>

          <!-- Botón Add to Cart -->
          <button class="absolute bottom-4 left-4 right-4 bg-primary text-on-primary py-4 text-[10px] font-bold uppercase tracking-[0.2em] translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
            Add to Cart
          </button>

          <!-- Badges Superiores (Sale, Save Amount)-->
          <div v-if="product.saveAmount" class="absolute top-4 left-4 flex flex-col gap-1">
            <div class="bg-white px-2 py-1 flex flex-col items-start leading-none">
                <span class="text-[10px] font-bold uppercase tracking-widest text-primary">Save ${{ product.saveAmount }}</span>
                <span class="text-[8px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">OFF</span>
            </div>
            <div v-if="product.discountPercentage" class="bg-primary text-on-primary px-2 py-1 text-[10px] font-black tracking-tighter">
                -{{ product.discountPercentage }}%
            </div>
          </div>
          <span v-else-if="product.isOnSale" class="absolute top-4 left-4 bg-tertiary-container text-on-tertiary-container px-2 py-1 text-[9px] font-bold uppercase tracking-widest">
            Sale
          </span>

          <!-- Botón de Favorito -->
          <button class="absolute top-4 right-4 backdrop-blur-sm transition-all duration-300 group/fav">
            <span class="material-symbols-outlined text-sm text-primary hover:text-red-500/80 hover:cursor-pointer group-hover/fav:scale-110 transition-transform" style="font-variation-settings: 'FILL' 0;">favorite</span>
          </button>
        </div>

        <div class="space-y-1">
          <div class="flex justify-between items-start">
            <h4 class="text-sm font-bold tracking-tight">{{ product.name }}</h4>
            <div class="flex gap-2">
                <span :class="{'text-sm font-medium': true, 'text-on-tertiary-container': product.isOnSale}">
                  ${{ product.price }}
                </span>
                <span v-if="product.originalPrice" class="text-xs line-through text-on-surface-variant">${{ product.originalPrice }}</span>
            </div>
          </div>
          <p class="text-xs text-on-surface-variant">{{ product.category?.name || 'Varios' }}</p>
          
          <!-- Rating Estrellas Simulado -->
          <div class="flex gap-0.5 pt-2">
            <span class="material-symbols-outlined text-[10px]" style="font-variation-settings: 'FILL' 1;">star</span>
            <span class="material-symbols-outlined text-[10px]" style="font-variation-settings: 'FILL' 1;">star</span>
            <span class="material-symbols-outlined text-[10px]" style="font-variation-settings: 'FILL' 1;">star</span>
            <span class="material-symbols-outlined text-[10px]" style="font-variation-settings: 'FILL' 1;">star</span>
            <span class="material-symbols-outlined text-[10px]" style="font-variation-settings: 'FILL' 0;">star</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!block.manualProducts || block.manualProducts.length === 0" class="text-center py-20 text-gray-500">
      No hay productos asignados a esta colección.
    </div>

    <!-- Cargar Más -->
    <div class="mt-24 flex justify-center w-full">
      <button class="border border-outline-variant px-12 py-4 text-xs font-bold uppercase tracking-[0.3em] hover:bg-primary hover:text-on-primary hover:border-primary transition-all duration-300 text-on-surface-variant">
        Load More Pieces
      </button>
    </div>
  </section>
</template>