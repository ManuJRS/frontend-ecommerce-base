<script setup lang="ts">
import type { StoreViewBlock } from '../models';

defineProps<{
  block: StoreViewBlock; // Ojo: Asegúrate de que tu interface incluya manualProducts?: any[]
}>();
</script>

<template>
  <div class="py-8">
    <h2 class="text-2xl font-bold mb-6 px-4">{{ block.title || 'Productos Destacados' }}</h2>
    
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 px-4">
      
      <div 
        v-for="product in block.manualProducts" 
        :key="product.id" 
        class="bg-white border text-center p-6 rounded-lg shadow-sm hover:shadow-md transition flex flex-col"
      >
      <div class="aspect-square rounded mb-4 overflow-hidden bg-gray-50">
        <img 
          v-if="product.images" 
          :src="product.images[0].url" 
          :alt="product.name" 
          class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
        <div 
          v-else 
          class="w-full h-full flex items-center justify-center text-gray-400 text-sm bg-gray-100"
        >
          Sin Imagen
        </div>
      </div>
        
        <h3 class="font-semibold text-gray-800">{{ product.name }}</h3>
        <p class="text-gray-500 mt-2">${{ product.price }}</p>

        <button class="mt-auto pt-4 text-blue-600 hover:text-blue-800 font-medium text-sm">
          Agregar al carrito
        </button>
      </div>

    </div>

    <div v-if="!block.manualProducts || block.manualProducts.length === 0" class="px-4 text-gray-500">
      No hay productos asignados a esta cuadrícula.
    </div>
  </div>
</template>