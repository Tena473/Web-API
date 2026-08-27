import crypto from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(crypto.scrypt)
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000

export const resources = Object.freeze({
  data_admin: { table: 'data_admin', primaryKey: 'admin_id', permission: 'super_admin' },
  data_student: { table: 'data_student', primaryKey: 'student_id', permission: 'manage_students' },
  data_payment: { table: 'data_payment', primaryKey: 'payment_id', permission: 'manage_payments' },
  data_product: { table: 'data_product', primaryKey: 'product_id', permission: 'manage_products' },
  data_order: { table: 'data_order', primaryKey: 'order_id', permission: 'view_product_report' }
})

export function parsePermissions(value) {
  if (Array.isArray(value)) return value.filter((permission) => typeof permission === 'string')
  if (typeof value !== 'string') return []

  try {
    return parsePermissions(JSON.parse(value))
  } catch {
    return []
  }
}

export function isSuperAdmin(user) {
  return user?.role === 'Super Admin'
}

export function hasPermission(user, permission) {
  return Boolean(user) && (isSuperAdmin(user) || parsePermissions(user.permissions).includes(permission))
}

export function canAccessResource(user, resourceName, action) {
  const resource = resources[resourceName]
  if (!resource) return false
  if (!user) return false
  if (isSuperAdmin(user)) return true

  const permissions = parsePermissions(user.permissions)
  if (resourceName === 'data_product' && action === 'read') {
    return permissions.includes('manage_products') || permissions.includes('create_orders')
  }
  if (resourceName === 'data_order') {
    if (action === 'create') return permissions.includes('create_orders')
    if (action === 'delete') return false
    return action === 'read' && permissions.includes('view_product_report')
  }
  return permissions.includes(resource.permission)
}

export function createSessionId() {
  return crypto.randomBytes(32).toString('base64url')
}

export async function hashPassword(password, requireMinimumLength = true) {
  if (typeof password !== 'string' || (requireMinimumLength && password.length < 12)) {
    throw new Error('Password must be at least 12 characters long')
  }

  const salt = crypto.randomBytes(16)
  const derivedKey = await scrypt(password, salt, 64)
  return `scrypt$${salt.toString('base64url')}$${derivedKey.toString('base64url')}`
}

export function isScryptHash(storedPassword) {
  if (typeof storedPassword !== 'string') return false
  const [algorithm, encodedSalt, encodedHash] = storedPassword.split('$')
  if (algorithm !== 'scrypt' || !/^[A-Za-z0-9_-]+$/.test(encodedSalt || '') || !/^[A-Za-z0-9_-]+$/.test(encodedHash || '')) return false
  try {
    return Buffer.from(encodedSalt, 'base64url').length === 16 && Buffer.from(encodedHash, 'base64url').length === 64
  } catch {
    return false
  }
}

export async function verifyPassword(password, storedPassword) {
  if (typeof password !== 'string' || !isScryptHash(storedPassword)) return false
  const [, encodedSalt, encodedHash] = storedPassword.split('$')

  try {
    const salt = Buffer.from(encodedSalt, 'base64url')
    const expected = Buffer.from(encodedHash, 'base64url')
    const actual = await scrypt(password, salt, expected.length)
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

export function matchesLegacyPassword(password, storedPassword) {
  if (typeof password !== 'string' || typeof storedPassword !== 'string') return false
  const supplied = Buffer.from(password)
  const stored = Buffer.from(storedPassword)
  return supplied.length === stored.length && crypto.timingSafeEqual(supplied, stored)
}

export function createSessionToken(user, secret, sessionId, now = Date.now()) {
  if (!secret) throw new Error('AUTH_SESSION_SECRET is required')
  if (typeof sessionId !== 'string' || sessionId.length < 32) throw new Error('A session ID is required')
  const payload = {
    sub: user.admin_id,
    sid: sessionId,
    exp: now + SESSION_TTL_MS
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url')
  return `${encodedPayload}.${signature}`
}

export function verifySessionToken(token, secret, now = Date.now()) {
  if (!token || !secret) return null
  const [encodedPayload, receivedSignature] = token.split('.')
  if (!encodedPayload || !receivedSignature) return null

  const expectedSignature = crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url')
  const received = Buffer.from(receivedSignature)
  const expected = Buffer.from(expectedSignature)
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return null

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))
    if (!Number.isInteger(payload.sub) || typeof payload.sid !== 'string' || payload.sid.length < 32 || !Number.isFinite(payload.exp) || payload.exp <= now) return null
    return {
      admin_id: payload.sub,
      session_id: payload.sid,
      expires_at: payload.exp
    }
  } catch {
    return null
  }
}
