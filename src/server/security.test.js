import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canAccessResource,
  createSessionToken,
  hashPassword,
  isScryptHash,
  resources,
  verifyPassword,
  verifySessionToken
} from './security.js'

test('session tokens reject tampering and expiration', () => {
  const secret = 'test-secret'
  const token = createSessionToken(
    { admin_id: 1, admin_name: 'admin', role: 'Admin', permissions: ['manage_students'] },
    secret,
    'a'.repeat(43),
    1_000
  )

  assert.equal(verifySessionToken(token, secret, 1_001).admin_id, 1)
  assert.equal(verifySessionToken(token, secret, 1_001).session_id, 'a'.repeat(43))
  assert.equal(verifySessionToken(`${token}x`, secret, 1_001), null)
  assert.equal(verifySessionToken(token, secret, 1_000 + (8 * 60 * 60 * 1000) + 1), null)
})

test('resource authorization is server-side and permission-specific', () => {
  const studentManager = { role: 'Admin', permissions: ['manage_students'] }
  const employee = { role: 'Employee', permissions: ['create_orders'] }
  const reportViewer = { role: 'Admin', permissions: ['view_product_report'] }

  assert.equal(canAccessResource(null, 'data_student', 'read'), false)
  assert.equal(canAccessResource(studentManager, 'data_student', 'read'), true)
  assert.equal(canAccessResource(studentManager, 'data_payment', 'read'), false)
  assert.equal(canAccessResource(null, 'data_product', 'read'), false)
  assert.equal(canAccessResource(null, 'data_order', 'create'), false)
  assert.equal(canAccessResource(employee, 'data_product', 'read'), true)
  assert.equal(canAccessResource(employee, 'data_order', 'create'), true)
  assert.equal(canAccessResource(employee, 'data_order', 'read'), false)
  assert.equal(canAccessResource(reportViewer, 'data_order', 'read'), true)
  assert.equal(canAccessResource(reportViewer, 'data_order', 'delete'), false)
  assert.equal(resources.data_payment.primaryKey, 'payment_id')
  assert.equal(resources['data_payment OR 1=1'], undefined)
})

test('passwords are one-way scrypt values', async () => {
  const hash = await hashPassword('a-strong-test-password')

  assert.match(hash, /^scrypt\$/)
  assert.equal(isScryptHash(hash), true)
  assert.equal(isScryptHash('scrypt$bad$hash'), false)
  assert.equal(await verifyPassword('a-strong-test-password', hash), true)
  assert.equal(await verifyPassword('wrong-password', hash), false)
})
