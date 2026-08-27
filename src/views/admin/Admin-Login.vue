<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const router = useRouter()
const authStore = useAuthStore()

const login = async () => {
  error.value = ''
  loading.value = true
  try {
    const user = await authStore.login(username.value, password.value)
    router.push({ name: user.role === 'Employee' ? 'employee-order-list' : 'admin-student-list' })
  } catch {
    error.value = 'The username or password is incorrect'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="h-screen flex items-center">
    <div class="flex-1 max-w-2xl shadow-xl mx-auto p-8">
      <div class="flex flex-col items-center"><h1 class="text-3xl">Admin Login</h1></div>
      <label class="form-control w-full">
        <div class="label"><span class="label-text">Name</span></div>
        <input v-model="username" type="text" autocomplete="username" class="input input-bordered w-full" />
      </label>
      <label class="form-control w-full">
        <div class="label"><span class="label-text">Password</span></div>
        <input v-model="password" type="password" autocomplete="current-password" class="input input-bordered w-full" @keyup.enter="login" />
      </label>
      <div v-if="error" class="text-red-500 my-2">{{ error }}</div>
      <button class="btn btn-neutral mt-4 w-full" :disabled="loading" @click="login">{{ loading ? 'Signing in...' : 'Login' }}</button>
    </div>
  </div>
</template>
