import assert from 'node:assert/strict'
import { once } from 'node:events'
import test from 'node:test'
import { createSessionToken, hashPassword } from '../server/security.js'

process.env.AUTH_SESSION_SECRET = 'test-session-secret'
process.env.NODE_ENV = 'development'
process.env.FRONTEND_ORIGIN = 'http://localhost:7000'

const { createApp, createDatabaseLoginRateLimiter, createLoginRateLimiter, getRuntimeSecurityConfig } = await import('./connectDB.js')

function createDatabase(users = [], { loginQueryDelayMs = 0 } = {}) {
  const accounts = new Map(users.map((user) => [user.admin_id, { ...user }]))
  const sessions = new Map()
  return {
    accounts,
    sessions,
    async query(sql, params = []) {
      if (sql.includes('FROM admin_sessions AS s')) {
        const [sessionId, adminId] = params
        const session = sessions.get(sessionId)
        const user = accounts.get(adminId)
        return [[session && !session.revoked && session.admin_id === adminId && user ? { ...user } : undefined].filter(Boolean)]
      }
      if (sql.startsWith('SELECT admin_id, admin_name, password')) {
        if (loginQueryDelayMs) await new Promise((resolve) => setTimeout(resolve, loginQueryDelayMs))
        const username = params[0]
        return [[...accounts.values()].filter((user) => user.admin_name === username)]
      }
      if (sql.startsWith('INSERT INTO admin_sessions')) {
        const [sessionId, adminId] = params
        sessions.set(sessionId, { admin_id: adminId, revoked: false })
        return [{ insertId: 1 }]
      }
      if (sql.startsWith('UPDATE admin_sessions SET revoked_at')) {
        const id = params[0]
        for (const [sessionId, session] of sessions) {
          if (sessionId === id || session.admin_id === Number(id)) session.revoked = true
        }
        return [{ affectedRows: 1 }]
      }
      throw new Error(`Unexpected test query: ${sql}`)
    }
  }
}

function createSharedRateLimitDatabase() {
  const buckets = new Map()
  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async query(sql, params = []) {
      if (sql.startsWith('DELETE FROM auth_login_rate_limits')) {
        const currentTime = Date.now()
        for (const [key, bucket] of buckets) if (bucket.expires_at.getTime() <= currentTime) buckets.delete(key)
        return [{ affectedRows: 0 }]
      }
      if (sql.startsWith('INSERT INTO auth_login_rate_limits')) {
        const [key, _attempts, expiresAt] = params
        if (!buckets.has(key)) buckets.set(key, { bucket_key: key, attempts: 0, expires_at: expiresAt })
        return [{ affectedRows: 1 }]
      }
      if (sql.includes('SELECT bucket_key, attempts, expires_at')) {
        return [params.map((key) => buckets.get(key)).filter(Boolean).map((bucket) => ({ ...bucket }))]
      }
      if (sql.startsWith('UPDATE auth_login_rate_limits SET attempts = ?, expires_at = ?')) {
        const [attempts, expiresAt, key] = params
        buckets.set(key, { bucket_key: key, attempts, expires_at: expiresAt })
        return [{ affectedRows: 1 }]
      }
      if (sql.startsWith('UPDATE auth_login_rate_limits\n           SET attempts = GREATEST')) {
        for (const key of params) {
          const bucket = buckets.get(key)
          if (bucket) bucket.attempts = Math.max(0, bucket.attempts - 1)
        }
        return [{ affectedRows: 1 }]
      }
      throw new Error(`Unexpected shared-rate-limit query: ${sql}`)
    }
  }
  return { buckets, async getConnection() { return connection } }
}

function createSessionCapDatabase(user) {
  const sessions = new Map()
  let createdAt = 0
  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async query(sql, params = []) {
      if (sql.startsWith('DELETE FROM admin_sessions WHERE admin_id')) {
        for (const [sessionId, session] of sessions) if (session.admin_id === params[0] && session.revoked) sessions.delete(sessionId)
        return [{ affectedRows: 0 }]
      }
      if (sql.includes('SELECT session_id FROM admin_sessions')) {
        return [[...sessions.entries()]
          .filter(([, session]) => session.admin_id === params[0] && !session.revoked)
          .sort(([, left], [, right]) => left.created_at - right.created_at)
          .map(([session_id]) => ({ session_id }))]
      }
      if (sql.startsWith('UPDATE admin_sessions SET revoked_at') && sql.includes('IN (')) {
        for (const sessionId of params) sessions.get(sessionId).revoked = true
        return [{ affectedRows: params.length }]
      }
      if (sql.startsWith('INSERT INTO admin_sessions')) {
        const [sessionId, adminId] = params
        sessions.set(sessionId, { admin_id: adminId, revoked: false, created_at: createdAt += 1 })
        return [{ insertId: 1 }]
      }
      throw new Error(`Unexpected session-cap query: ${sql}`)
    }
  }
  return {
    sessions,
    async getConnection() { return connection },
    async query(sql, params = []) {
      if (sql.startsWith('SELECT admin_id, admin_name, password')) return [[params[0] === user.admin_name ? { ...user } : undefined].filter(Boolean)]
      throw new Error(`Unexpected session-cap database query: ${sql}`)
    }
  }
}

async function startApp(options) {
  const server = createApp(options).listen(0, '127.0.0.1')
  await once(server, 'listening')
  return { server, url: `http://127.0.0.1:${server.address().port}` }
}

test('a database-backed admin_session restores the current user and logout revokes it', async (t) => {
  const user = { admin_id: 7, admin_name: 'manager', password: 'scrypt$unused$unused', role: 'Admin', permissions: ['manage_students'] }
  const database = createDatabase([user])
  const sessionId = 'b'.repeat(43)
  database.sessions.set(sessionId, { admin_id: 7, revoked: false })
  const token = createSessionToken(user, process.env.AUTH_SESSION_SECRET, sessionId)
  const cookie = `admin_session=${encodeURIComponent(token)}`
  const { server, url } = await startApp({ database })
  t.after(() => server.close())

  const authenticated = await fetch(`${url}/api/auth/me`, { headers: { Cookie: cookie } })
  assert.equal(authenticated.status, 200)
  assert.deepEqual((await authenticated.json()).user, { admin_id: 7, admin_name: 'manager', role: 'Admin', permissions: ['manage_students'] })

  assert.equal((await fetch(`${url}/api/auth/logout`, { method: 'POST', headers: { Cookie: cookie } })).status, 204)
  assert.equal((await fetch(`${url}/api/auth/me`, { headers: { Cookie: cookie } })).status, 401)
})

test('calendar endpoint denies Employee and permits view_calendar', async (t) => {
  const employee = { admin_id: 1, admin_name: 'employee', password: '', role: 'Employee', permissions: ['create_orders'] }
  const viewer = { admin_id: 2, admin_name: 'viewer', password: '', role: 'Admin', permissions: ['view_calendar'] }
  const database = createDatabase([employee, viewer])
  for (const user of [employee, viewer]) database.sessions.set(`${user.admin_id}`.repeat(43), { admin_id: user.admin_id, revoked: false })
  const fetchImpl = async () => ({ ok: true, async json() { return { summary: 'Team', items: [] } } })
  process.env.GOOGLE_CALENDAR_API_KEY = 'test-key'
  const { server, url } = await startApp({ database, fetchImpl })
  t.after(() => server.close())
  const range = '?timeMin=2026-01-01T00%3A00%3A00.000Z&timeMax=2026-01-31T00%3A00%3A00.000Z'
  const employeeToken = createSessionToken(employee, process.env.AUTH_SESSION_SECRET, '1'.repeat(43))
  const viewerToken = createSessionToken(viewer, process.env.AUTH_SESSION_SECRET, '2'.repeat(43))
  assert.equal((await fetch(`${url}/api/calendar/events${range}`, { headers: { Cookie: `admin_session=${employeeToken}` } })).status, 403)
  assert.equal((await fetch(`${url}/api/calendar/events${range}`, { headers: { Cookie: `admin_session=${viewerToken}` } })).status, 200)
})

test('runtime configuration requires HTTPS and Secure cookies outside local development', () => {
  assert.throws(() => getRuntimeSecurityConfig({ AUTH_SESSION_SECRET: 'secret' }), /NODE_ENV must be development/)
  assert.throws(() => getRuntimeSecurityConfig({ AUTH_SESSION_SECRET: 'secret', NODE_ENV: 'production', FRONTEND_ORIGIN: 'http://example.com' }), /must use HTTPS/)
  assert.deepEqual(getRuntimeSecurityConfig({ AUTH_SESSION_SECRET: 'secret', NODE_ENV: 'production', FRONTEND_ORIGIN: 'https://example.com' }), {
    sessionSecret: 'secret', frontendOrigin: 'https://example.com', secureSessionCookie: true
  })
})

test('login limiter reserves attempts atomically and scopes account limits to the source IP', () => {
  let current = 1_000
  const limiter = createLoginRateLimiter({ now: () => current, maxPerAccount: 2, maxPerIp: 10, windowMs: 1_000 })
  const first = limiter.reserve('127.0.0.1', 'alice')
  const second = limiter.reserve('127.0.0.1', 'alice')
  assert.equal(first.blocked, false)
  assert.equal(second.blocked, false)
  assert.equal(limiter.reserve('127.0.0.1', 'alice').blocked, true)
  limiter.recordFailure(first.reservation)
  limiter.recordFailure(second.reservation)
  assert.equal(limiter.reserve('127.0.0.2', 'alice').blocked, false)
  current += 1_001
  assert.equal(limiter.reserve('127.0.0.1', 'alice').blocked, false)
})

test('successful login keeps failures for other usernames in the IP bucket', () => {
  const limiter = createLoginRateLimiter({ maxPerAccount: 5, maxPerIp: 2 })
  const target = limiter.reserve('127.0.0.1', 'target')
  limiter.recordFailure(target.reservation)
  const helper = limiter.reserve('127.0.0.1', 'helper')
  limiter.releaseSuccess(helper.reservation)
  assert.equal(limiter.reserve('127.0.0.1', 'another').blocked, false)
  assert.equal(limiter.reserve('127.0.0.1', 'fourth').blocked, true)
})

test('shared MySQL limiter applies one account limit across backend instances and source IPs', async () => {
  const database = createSharedRateLimitDatabase()
  const firstInstance = createDatabaseLoginRateLimiter(database, { maxPerAccount: 2, maxPerIp: 10 })
  const secondInstance = createDatabaseLoginRateLimiter(database, { maxPerAccount: 2, maxPerIp: 10 })

  assert.equal((await firstInstance.reserve('127.0.0.1', 'alice')).blocked, false)
  assert.equal((await secondInstance.reserve('127.0.0.2', 'alice')).blocked, false)
  assert.equal((await firstInstance.reserve('127.0.0.3', 'alice')).blocked, true)
})

test('successful repeated login keeps no more than five active sessions', async (t) => {
  const user = { admin_id: 9, admin_name: 'manager', password: await hashPassword('correct horse battery staple'), role: 'Admin', permissions: [] }
  const database = createSessionCapDatabase(user)
  const limiter = createLoginRateLimiter({ maxPerAccount: 20, maxPerIp: 20 })
  const { server, url } = await startApp({ database, loginRateLimiter: limiter })
  t.after(() => server.close())

  for (let attempt = 0; attempt < 7; attempt += 1) {
    const response = await fetch(`${url}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.admin_name, password: 'correct horse battery staple' })
    })
    assert.equal(response.status, 200)
  }

  assert.equal([...database.sessions.values()].filter((session) => !session.revoked).length, 5)
  assert.ok(database.sessions.size <= 6)
})

test('parallel login requests are limited before asynchronous database work', async (t) => {
  const limiter = createLoginRateLimiter({ maxPerAccount: 1, maxPerIp: 1 })
  const { server, url } = await startApp({ database: createDatabase([], { loginQueryDelayMs: 25 }), loginRateLimiter: limiter })
  t.after(() => server.close())

  const request = () => fetch(`${url}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'unknown', password: 'wrong-password' })
  })
  const responses = await Promise.all([request(), request()])
  assert.deepEqual((await Promise.all(responses.map((response) => response.status))).sort(), [401, 429])
})

test('login endpoint returns 429 after the configured failed-attempt limit', async (t) => {
  const limiter = createLoginRateLimiter({ maxPerAccount: 2, maxPerIp: 10 })
  const { server, url } = await startApp({ database: createDatabase(), loginRateLimiter: limiter })
  t.after(() => server.close())

  for (let attempt = 0; attempt < 2; attempt += 1) {
    assert.equal((await fetch(`${url}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'unknown', password: 'wrong-password' })
    })).status, 401)
  }
  const blocked = await fetch(`${url}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'unknown', password: 'wrong-password' })
  })
  assert.equal(blocked.status, 429)
  assert.ok(Number(blocked.headers.get('retry-after')) > 0)
})
