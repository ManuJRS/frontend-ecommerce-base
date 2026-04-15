<template>
  <section>
    <h2 class="text-2xl font-bold tracking-tight mb-8 text-primary">Shipping Method</h2>
    <div class="space-y-4">
      <label
        class="flex items-center justify-between p-6 bg-surface-container-lowest cursor-pointer group transition-all border border-transparent hover:border-outline-variant"
      >
        <div class="flex items-center gap-4">
          <input
            checked
            class="text-primary border-outline-variant focus:ring-primary"
            name="shipping"
            type="radio"
          />
          <div>
            <span class="block font-semibold text-on-surface">Standard Courier</span>
            <span class="text-sm text-on-surface-variant">3–5 Business Days</span>
          </div>
        </div>
        <span class="font-semibold text-on-surface">Free</span>
      </label>
      <label
        class="flex items-center justify-between p-6 bg-surface-container-lowest cursor-pointer group transition-all border border-transparent hover:border-outline-variant"
      >
        <div class="flex items-center gap-4">
          <input
            class="text-primary border-outline-variant focus:ring-primary"
            name="shipping"
            type="radio"
          />
          <div>
            <span class="block font-semibold text-on-surface">Express Editorial Delivery</span>
            <span class="text-sm text-on-surface-variant">Next Day Guaranteed</span>
          </div>
        </div>
        <span class="font-semibold text-on-surface">€25.00</span>
      </label>
    </div>
  </section>
</template>
