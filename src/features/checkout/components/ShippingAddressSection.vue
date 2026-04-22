<script setup lang="ts">
import { computed, watch } from 'vue';
import { MX_LOCATIONS } from '@/shared/constants/locations';

interface CheckoutShippingModel {
  firstName: string;
  lastName: string;
  address: string;
  country: string;
  state: string;
  city: string;
  phone: string;
  postalCode: string;
  deliveryInstructions: string;
}

const props = defineProps<{
  disabled?: boolean;
}>();

const model = defineModel<CheckoutShippingModel>({
  required: true,
});

model.value.country = 'México';

const availableCities = computed(() => {
  const selectedStateObj = MX_LOCATIONS.find((s) => s.state === model.value.state);
  return selectedStateObj ? selectedStateObj.cities : [];
});

watch(() => model.value.state, () => {
  model.value.city = '';
});

function sanitizeNameInput(value: string): string {
  return value.replace(/[0-9]/g, '');
}

function sanitizePhoneInput(value: string): string {
  return value.replace(/[^0-9+-]/g, '');
}
</script>

<template>
  <section>
    <h2 class="text-2xl font-bold tracking-tight mb-8 text-primary">Dirección de envío</h2>
    <div class="grid grid-cols-2 gap-6">
      <div class="col-span-1">
        <label
          class="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 ml-1"
        >
          Nombres <span class="text-error">*</span>
        </label>
        <input
          class="w-full bg-surface-container-highest border-none py-4 px-5 focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary/20 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
          placeholder="Julian"
          type="text"
          v-model="model.firstName"
          @input="model.firstName = sanitizeNameInput(model.firstName)"
          required
          :disabled="props.disabled"
        />
      </div>
      <div class="col-span-1">
        <label
          class="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 ml-1"
        >
          Apellidos <span class="text-error">*</span>
        </label>
        <input
          class="w-full bg-surface-container-highest border-none py-4 px-5 focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary/20 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
          placeholder="Voss"
          type="text"
          v-model="model.lastName"
          @input="model.lastName = sanitizeNameInput(model.lastName)"
          required
          :disabled="props.disabled"
        />
      </div>
      <div class="col-span-2">
        <label
          class="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 ml-1"
        >
          Dirección <span class="text-error">*</span>
        </label>
        <input
          class="w-full bg-surface-container-highest border-none py-4 px-5 focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary/20 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
          placeholder="Calle 123, Colonia 123"
          type="text"
          v-model="model.address"
          required
          :disabled="props.disabled"
        />
      </div>
    <div class="col-span-2 grid grid-cols-2 gap-6">
      <div class="col-span-1">
        <label class="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
          País <span class="text-error">*</span>
        </label>
        <select
          class="w-full bg-surface-container-highest border-none py-4 px-5 focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary/20 transition-all duration-300 disabled:opacity-60 appearance-none"
          v-model="model.country"
          disabled
        >
          <option value="México">México</option>
        </select>
      </div>

      <div class="col-span-1">
        <label class="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
          Estado <span class="text-error">*</span>
        </label>
        <select
          class="w-full bg-surface-container-highest border-none py-4 px-5 focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary/20 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed appearance-none"
          v-model="model.state"
          required
          :disabled="props.disabled"
        >
          <option value="" disabled>Selecciona un estado</option>
          <option v-for="item in MX_LOCATIONS" :key="item.state" :value="item.state">
            {{ item.state }}
          </option>
        </select>
      </div>

      </div>

      <div class="col-span-1">
        <label class="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
          Ciudad <span class="text-error">*</span>
        </label>
        <select
          class="w-full bg-surface-container-highest border-none py-4 px-5 focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary/20 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed appearance-none"
          v-model="model.city"
          required
          :disabled="props.disabled || !model.state"
        >
          <option value="" disabled>Selecciona una ciudad</option>
          <option v-for="city in availableCities" :key="city" :value="city">
            {{ city }}
          </option>
        </select>
      </div>
      <div class="col-span-1">
        <label
          class="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 ml-1"
        >
          Código postal <span class="text-error">*</span>
        </label>
        <input
          class="w-full bg-surface-container-highest border-none py-4 px-5 focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary/20 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
          placeholder="1264"
          type="text"
          v-model="model.postalCode"
          required
          :disabled="props.disabled"
        />
      </div>
      <div class="col-span-1">
        <label
          class="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 ml-1"
        >
          Teléfono <span class="text-error">*</span>
        </label>
        <input
          class="w-full bg-surface-container-highest border-none py-4 px-5 focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary/20 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
          placeholder="+45 12 34 56 78"
          type="tel"
          v-model="model.phone"
          @input="model.phone = sanitizePhoneInput(model.phone)"
          required
          :disabled="props.disabled"
        />
      </div>
      <div class="col-span-2">
        <label
          class="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 ml-1"
        >
          Instrucciones de entrega (Opcional)
        </label>
        <textarea
          class="w-full bg-surface-container-highest border-none py-4 px-5 focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary/20 transition-all duration-300 min-h-28 resize-y disabled:opacity-60 disabled:cursor-not-allowed"
          placeholder="Ej. Dejar en recepción, tocar timbre dos veces, entregar por la tarde..."
          v-model="model.deliveryInstructions"
          :disabled="props.disabled"
        />
      </div>
    </div>
  </section>
</template>
