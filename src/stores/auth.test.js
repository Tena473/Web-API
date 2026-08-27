import assert from 'node:assert/strict'
import test from 'node:test'
import axios from 'axios'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from './auth.js'
import { useAdminDataStore } from './admin/data-CRUD.js'

test('loadSession restores the user after refresh and only clears state for 401', async () => {
  const originalGet = axios.get
  const user = { admin_id: 7, admin_name: 'manager', role: 'Admin', permissions: ['manage_students'] }

  try {
    setActivePinia(createPinia())
    axios.get = async () => ({ data: { user } })
    const authenticatedStore = useAuthStore()

    assert.deepEqual(await authenticatedStore.loadSession(), user)
    assert.equal(authenticatedStore.initialized, true)
    assert.deepEqual(authenticatedStore.permissions, ['manage_students'])

    setActivePinia(createPinia())
    axios.get = async () => {
      const error = new Error('Authentication required')
      error.response = { status: 401 }
      throw error
    }
    const signedOutStore = useAuthStore()

    assert.equal(await signedOutStore.loadSession(), null)
    assert.equal(signedOutStore.initialized, true)

    setActivePinia(createPinia())
    axios.get = async () => { throw new Error('Network unavailable') }
    const unavailableStore = useAuthStore()

    await assert.rejects(unavailableStore.loadSession(), /Network unavailable/)
    assert.equal(unavailableStore.initialized, false)
  } finally {
    axios.get = originalGet
  }
})

test('login clears data retained by a previous principal before replacing the user', async () => {
  const originalPost = axios.post
  try {
    setActivePinia(createPinia())
    const authStore = useAuthStore()
    const dataStore = useAdminDataStore()
    dataStore.list = [{ fullname: 'Sensitive Student' }]
    dataStore.recordsByResource = { data_student: [...dataStore.list] }
    dataStore.loaded = true
    axios.post = async () => ({ data: { user: { admin_id: 2, admin_name: 'employee', role: 'Employee', permissions: ['create_orders'] } } })

    await authStore.login('employee', 'a-valid-password')
    assert.deepEqual(dataStore.list, [])
    assert.deepEqual(dataStore.recordsByResource, {})
    assert.equal(dataStore.loaded, false)
  } finally {
    axios.post = originalPost
  }
})

test('only the Super Admin role is recognized as Super Admin', () => {
  setActivePinia(createPinia())
  const authStore = useAuthStore()

  authStore.user = { admin_id: 1, admin_name: 'admin', role: 'Admin', permissions: ['super_admin', 'manage_students', 'manage_payments'] }
  assert.equal(authStore.isSuperAdmin, false)

  authStore.user = { admin_id: 2, admin_name: 'owner', role: 'Super Admin', permissions: [] }
  assert.equal(authStore.isSuperAdmin, true)
})
