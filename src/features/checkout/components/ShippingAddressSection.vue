<script setup lang="ts">
interface CheckoutShippingModel {
  firstName: string;
  lastName: string;
  address: string;
  country: string;
  phone: string;
  city: string;
  postalCode: string;
  deliveryInstructions: string;
}

const props = defineProps<{
  disabled?: boolean;
}>();

const model = defineModel<CheckoutShippingModel>({
  required: true,
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
    <h2 class="text-2xl font-bold tracking-tight mb-8 text-primary">Shipping Address</h2>
    <div class="grid grid-cols-2 gap-6">
      <div class="col-span-1">
        <label
          class="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 ml-1"
        >
          First Name <span class="text-error">*</span>
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
          Last Name <span class="text-error">*</span>
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
          Address <span class="text-error">*</span>
        </label>
        <input
          class="w-full bg-surface-container-highest border-none py-4 px-5 focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary/20 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
          placeholder="128 Artistry Lane, Suite 4"
          type="text"
          v-model="model.address"
          required
          :disabled="props.disabled"
        />
      </div>
      <div class="col-span-1">
        <label
          class="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 ml-1"
        >
          Country <span class="text-error">*</span>
        </label>
        <input
          class="w-full bg-surface-container-highest border-none py-4 px-5 focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary/20 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
          placeholder="Denmark"
          type="text"
          v-model="model.country"
          required
          :disabled="props.disabled"
        />
      </div>
      <div class="col-span-1">
        <label
          class="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 ml-1"
        >
          Phone <span class="text-error">*</span>
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
      <div class="col-span-1">
        <label
          class="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 ml-1"
        >
          City <span class="text-error">*</span>
        </label>
        <input
          class="w-full bg-surface-container-highest border-none py-4 px-5 focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary/20 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
          placeholder="Copenhagen"
          type="text"
          v-model="model.city"
          required
          :disabled="props.disabled"
        />
      </div>
      <div class="col-span-1">
        <label
          class="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 ml-1"
        >
          Postal Code <span class="text-error">*</span>
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
      <div class="col-span-2">
        <label
          class="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 ml-1"
        >
          Delivery Instructions (Optional)
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
