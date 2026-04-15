<script setup lang="ts">
interface CheckoutShippingModel {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postalCode: string;
}

const model = defineModel<CheckoutShippingModel>({
  required: true,
});
</script>

<template>
  <section>
    <h2 class="text-2xl font-bold tracking-tight mb-8 text-primary">Shipping Address</h2>
    <div class="grid grid-cols-2 gap-6">
      <div class="col-span-1">
        <label
          class="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 ml-1"
        >
          First Name
        </label>
        <input
          class="w-full bg-surface-container-highest border-none py-4 px-5 focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary/20 transition-all duration-300"
          placeholder="Julian"
          type="text"
          v-model="model.firstName"
        />
      </div>
      <div class="col-span-1">
        <label
          class="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 ml-1"
        >
          Last Name
        </label>
        <input
          class="w-full bg-surface-container-highest border-none py-4 px-5 focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary/20 transition-all duration-300"
          placeholder="Voss"
          type="text"
          v-model="model.lastName"
        />
      </div>
      <div class="col-span-2">
        <label
          class="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 ml-1"
        >
          Address
        </label>
        <input
          class="w-full bg-surface-container-highest border-none py-4 px-5 focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary/20 transition-all duration-300"
          placeholder="128 Artistry Lane, Suite 4"
          type="text"
          v-model="model.address"
        />
      </div>
      <div class="col-span-1">
        <label
          class="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 ml-1"
        >
          City
        </label>
        <input
          class="w-full bg-surface-container-highest border-none py-4 px-5 focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary/20 transition-all duration-300"
          placeholder="Copenhagen"
          type="text"
          v-model="model.city"
        />
      </div>
      <div class="col-span-1">
        <label
          class="block text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-2 ml-1"
        >
          Postal Code
        </label>
        <input
          class="w-full bg-surface-container-highest border-none py-4 px-5 focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary/20 transition-all duration-300"
          placeholder="1264"
          type="text"
          v-model="model.postalCode"
        />
      </div>
    </div>
  </section>
</template>
