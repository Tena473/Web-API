<script setup>
import { defineProps } from 'vue';

defineProps({
  headers: Array
})

</script>

<template>
  <div class="w-full overflow-x-auto">
    <table class="table min-w-max">
      <!-- head -->
      <thead>
        <tr>
          <th v-for="header in headers" :key="header">{{ header }}</th>
        </tr>
      </thead>
      <tbody>
        <slot>
        </slot>
      </tbody>
    </table>
  </div>
</template>
