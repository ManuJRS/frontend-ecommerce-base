<script setup lang="ts">
import { computed, reactive, ref } from 'vue';

type SharedContactFormBlock = {
  title?: string;
  text?: string;
  nameLabel?: string;
  namePlaceholder?: string;
  emailLabel?: string;
  emailPlaceholder?: string;
  subjectLabel?: string;
  subjectPlaceholder?: string;
  messageLabel?: string;
  messagePlaceholder?: string;
  buttonText?: string;
};

const props = defineProps<{
  block?: SharedContactFormBlock;
  data?: SharedContactFormBlock;
}>();

const emit = defineEmits<{
  (event: 'submit', payload: ContactFormPayload): void;
}>();

interface ContactFormPayload {
  fullName: string;
  email: string;
  subject: string;
  message: string;
}

const contactBlock = computed<SharedContactFormBlock>(
  () => props.data ?? props.block ?? {}
);

const resolvedTitle = computed(() => contactBlock.value.title ?? '');
const resolvedText = computed(() => contactBlock.value.text ?? '');
const resolvedNameLabel = computed(() => contactBlock.value.nameLabel ?? 'Full Name');
const resolvedNamePlaceholder = computed(
  () => contactBlock.value.namePlaceholder ?? 'Your name'
);
const resolvedEmailLabel = computed(() => contactBlock.value.emailLabel ?? 'Email Address');
const resolvedEmailPlaceholder = computed(
  () => contactBlock.value.emailPlaceholder ?? 'your@email.com'
);
const resolvedSubjectLabel = computed(() => contactBlock.value.subjectLabel ?? 'Subject');
const resolvedSubjectPlaceholder = computed(
  () => contactBlock.value.subjectPlaceholder ?? 'How can we assist you?'
);
const resolvedMessageLabel = computed(() => contactBlock.value.messageLabel ?? 'Message');
const resolvedMessagePlaceholder = computed(
  () => contactBlock.value.messagePlaceholder ?? 'Elaborate on your inquiry...'
);
const resolvedButtonText = computed(() => contactBlock.value.buttonText ?? 'Send Inquiry');

const form = reactive<ContactFormPayload>({
  fullName: '',
  email: '',
  subject: '',
  message: '',
});

const submitting = ref(false);

function onSubmit() {
  if (submitting.value) return;
  submitting.value = true;
  emit('submit', { ...form });
  submitting.value = false;
}
</script>

<template>
  <section class="w-full px-8 py-16 md:py-24">
    <div class="mx-auto grid max-w-screen-2xl grid-cols-1 gap-10 lg:grid-cols-12">
      <header class="mb-10 max-w-2xl lg:col-span-4 lg:mb-0">
        <h2
          v-if="resolvedTitle"
          class="font-display mb-6 text-5xl font-extrabold leading-tight tracking-tighter text-primary md:text-6xl"
        >
          {{ resolvedTitle }}
        </h2>
        <p
          v-if="resolvedText"
          class="font-body text-lg leading-relaxed text-on-surface-variant"
        >
          {{ resolvedText }}
        </p>
      </header>

      <div
        class="relative overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-container-lowest p-8 shadow-[0_20px_40px_rgba(25,28,30,0.06)] md:p-12 lg:col-span-8"
      >
        <form class="relative z-10 space-y-10" @submit.prevent="onSubmit">
          <div class="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div class="space-y-2">
              <label
                class="font-label block text-sm font-medium text-on-surface-variant"
                for="contact-form-fullName"
              >
                {{ resolvedNameLabel }}
              </label>
              <input
                id="contact-form-fullName"
                v-model="form.fullName"
                class="w-full rounded-DEFAULT border-none bg-surface-container-highest px-4 py-3 text-on-surface transition-all duration-300 focus:border focus:border-primary/20 focus:bg-surface-container-lowest focus:ring-0"
                name="fullName"
                type="text"
                autocomplete="name"
                :placeholder="resolvedNamePlaceholder"
                required
              />
            </div>

            <div class="space-y-2">
              <label
                class="font-label block text-sm font-medium text-on-surface-variant"
                for="contact-form-email"
              >
                {{ resolvedEmailLabel }}
              </label>
              <input
                id="contact-form-email"
                v-model="form.email"
                class="w-full rounded-DEFAULT border-none bg-surface-container-highest px-4 py-3 text-on-surface transition-all duration-300 focus:border focus:border-primary/20 focus:bg-surface-container-lowest focus:ring-0"
                name="email"
                type="email"
                autocomplete="email"
                :placeholder="resolvedEmailPlaceholder"
                required
              />
            </div>
          </div>

          <div class="space-y-2">
            <label
              class="font-label block text-sm font-medium text-on-surface-variant"
              for="contact-form-subject"
            >
              {{ resolvedSubjectLabel }}
            </label>
            <input
              id="contact-form-subject"
              v-model="form.subject"
              class="w-full rounded-DEFAULT border-none bg-surface-container-highest px-4 py-3 text-on-surface transition-all duration-300 focus:border focus:border-primary/20 focus:bg-surface-container-lowest focus:ring-0"
              name="subject"
              type="text"
              :placeholder="resolvedSubjectPlaceholder"
              required
            />
          </div>

          <div class="space-y-2">
            <label
              class="font-label block text-sm font-medium text-on-surface-variant"
              for="contact-form-message"
            >
              {{ resolvedMessageLabel }}
            </label>
            <textarea
              id="contact-form-message"
              v-model="form.message"
              class="w-full resize-none rounded-DEFAULT border-none bg-surface-container-highest px-4 py-3 text-on-surface transition-all duration-300 focus:border focus:border-primary/20 focus:bg-surface-container-lowest focus:ring-0"
              name="message"
              rows="5"
              :placeholder="resolvedMessagePlaceholder"
              required
            ></textarea>
          </div>

          <div class="pt-4">
            <button
              type="submit"
              :disabled="submitting"
              class="font-headline flex w-full items-center justify-center gap-3 rounded-DEFAULT bg-gradient-to-r from-primary to-primary-container px-10 py-4 font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
            >
              {{ resolvedButtonText }}
              <span class="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>
