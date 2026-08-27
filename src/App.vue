<script setup>
import { onMounted } from 'vue';
import { RouterView } from 'vue-router'

import { useEventStore } from './stores/event';


const eventStore = useEventStore()

// onMounted(() => {
//   eventStore.popupMessage('success', 'Welcome to the application!');
// })

</script>

<template>
  <div>
    <div v-if="eventStore.alert" class="toast toast-top toast-center z-50">
      <div :class="`alert alert-${eventStore.data.status} `">
        <span>{{ eventStore.data.message }}</span>
      </div>
    </div>
    <RouterView />
  </div>
</template>