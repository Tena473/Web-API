import { defineStore } from 'pinia'
import axios from 'axios'
import { useAdminDataStore } from './admin/data-CRUD.js'

const sensitiveCacheKeys = ['data-students', 'data-payment', 'data-admin', 'data-product']

function clearSensitiveClientState() {
  if (typeof localStorage !== 'undefined') sensitiveCacheKeys.forEach((key) => localStorage.removeItem(key))
  // Pinia is per SPA instance; reset it when the authenticated principal changes.
  useAdminDataStore().clearSensitiveData()
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    initialized: false
  }),
  getters: {
    isSuperAdmin: (state) => state.user?.role === 'Super Admin',
    permissions: (state) => Array.isArray(state.user?.permissions) ? state.user.permissions : []
  },
  actions: {
    async loadSession() {
      if (this.initialized) return this.user

      try {
        const response = await axios.get('/api/auth/me')
        this.user = response.data.user
        this.initialized = true
        return this.user
      } catch (error) {
        // A 401 is a normal unauthenticated state. Do not treat an API or
        // network failure as a logout, otherwise a temporary outage hides
        // permission-based navigation and sends a signed-in user to login.
        if (error.response?.status !== 401) throw error
        this.user = null
        this.initialized = true
        clearSensitiveClientState()
        return null
      }
    },
    async login(username, password) {
      clearSensitiveClientState()
      this.user = null
      this.initialized = false
      const response = await axios.post('/api/auth/login', { username, password })
      this.user = response.data.user
      this.initialized = true
      return this.user
    },
    async logout() {
      try {
        await axios.post('/api/auth/logout')
      } finally {
        this.user = null
        this.initialized = true
        clearSensitiveClientState()
      }
    },
    hasPermission(permission) {
      return this.isSuperAdmin || this.permissions.includes(permission)
    }
  }
})
