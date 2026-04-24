<script setup>
import { ref } from 'vue';

const emit = defineEmits(['select-address']);
const isModalOpen = ref(false);

const addresses = {
  cdmx: {
    firstName: 'Juan',
    lastName: 'Pérez',
    address: 'Avenida Insurgentes Sur 123',
    city: 'Álvaro Obregón',
    state: 'Ciudad de México',
    zipCode: '01296', // Código postal para probar Envíoclick
    phone: '5512345678',
    country: 'México',
    deliveryInstructions: 'Prueba de envío NACIONAL'
  },
  merida: {
    firstName: 'Manuel',
    lastName: 'Santana',
    address: 'Calle 60 x 57 Centro',
    city: 'Mérida',
    state: 'Yucatán',
    zipCode: '97238', // Código postal para probar envío local
    phone: '9991234567',
    country: 'México',
    deliveryInstructions: 'Prueba de envío local'
  }
};

const selectAddress = (key) => {
  emit('select-address', addresses[key]);
  isModalOpen.value = false;
};

// Solo mostrar en desarrollo
const isDev = import.meta.env.DEV;
</script>

<template>
  <div v-if="isDev" class="fixed bottom-4 right-4 z-50">
    <button 
      @click="isModalOpen = true"
      class="bg-warning text-warning-container p-3 rounded-full shadow-lg hover:scale-105 transition-transform flex items-center gap-2 font-bold text-xs"
    >
      <span class="material-symbols-outlined text-sm">precision_manufacturing</span>
      AUTORRELLENAR FORM
    </button>

    <div v-if="isModalOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div class="bg-surface p-6 rounded-lg shadow-xl max-w-sm w-full">
        <h3 class="text-lg font-bold mb-4">Seleccionar Dirección de Prueba</h3>
        <div class="flex flex-col gap-3">
          <button 
            @click="selectAddress('cdmx')"
            class="p-4 border border-outline rounded-md hover:bg-surface-container text-left"
          >
            <p class="font-bold">CDMX (Nacional)</p>
            <p class="text-xs opacity-70">CP: 01000 - Prueba Envíoclick</p>
          </button>
          
          <button 
            @click="selectAddress('merida')"
            class="p-4 border border-outline rounded-md hover:bg-surface-container text-left"
          >
            <p class="font-bold">Mérida (Local)</p>
            <p class="text-xs opacity-70">CP: 97000 - Prueba Tarifa Local</p>
          </button>
        </div>
        <button @click="isModalOpen = false" class="mt-4 text-sm w-full text-center opacity-50">Cancelar</button>
      </div>
    </div>
  </div>
</template>