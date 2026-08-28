<script setup>
const props = defineProps({
  show: Boolean,
  title: {
    type: String,
    default: 'Delete item?'
  },
  message: {
    type: String,
    default: 'This action permanently removes the selected item.'
  },
  details: {
    type: Array,
    default: () => []
  },
  confirmLabel: {
    type: String,
    default: 'Delete'
  },
  loading: Boolean
})

const emit = defineEmits(['close', 'confirm'])

const close = () => {
  if (!props.loading) emit('close')
}
</script>

<template>
  <div v-if="show" class="modal modal-open modal-bottom sm:modal-middle" role="dialog" aria-modal="true" aria-labelledby="delete-confirm-title">
    <div class="modal-box w-11/12 max-w-lg">
      <h2 id="delete-confirm-title" class="text-2xl font-bold text-error">{{ title }}</h2>
      <p class="mt-2 text-base-content/70">{{ message }}</p>

      <dl v-if="details.length" class="mt-5 space-y-3 rounded-lg bg-base-200 p-4">
        <div v-for="detail in details" :key="detail.label" class="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4"
          :class="detail.emphasis ? 'border-t border-base-300 pt-3' : ''">
          <dt :class="detail.emphasis ? 'font-semibold' : 'text-base-content/70'">{{ detail.label }}</dt>
          <dd class="break-words text-left sm:text-right" :class="detail.emphasis ? 'font-bold text-success' : 'font-semibold'">
            {{ detail.value || '-' }}
          </dd>
        </div>
      </dl>

      <div class="modal-action flex-col-reverse sm:flex-row">
        <button class="btn btn-ghost w-full sm:w-auto" :disabled="loading" @click="emit('close')">Cancel</button>
        <button class="btn btn-error w-full sm:w-auto" :disabled="loading" @click="emit('confirm')">
          <span v-if="loading" class="loading loading-spinner loading-sm"></span>
          {{ loading ? 'Deleting...' : confirmLabel }}
        </button>
      </div>
    </div>
    <div class="modal-backdrop" @click="close"></div>
  </div>
</template>
