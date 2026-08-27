import express from 'express'
import mysql from 'mysql2/promise'
import cors from 'cors'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  canAccessResource,
  createSessionId,
  createSessionToken,
  hashPassword,
  hasPermission,
  isScryptHash,
  matchesLegacyPassword,
  parsePermissions,
  resources,
  SESSION_TTL_MS,
  verifyPassword,
  verifySessionToken
} from '../server/security.js'
import { loadEnvironmentFile } from '../server/load-env.js'

loadEnvironmentFile()

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url))
const frontendDirectory = path.resolve(sourceDirectory, '../../dist')
const frontendIndex = path.join(frontendDirectory, 'index.html')

function isLocalHttpOrigin(origin) {
  try {
    const url = new URL(origin)
    return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1')
  } catch {
    return false
  }
}

export function getRuntimeSecurityConfig(environment = process.env) {
  const sessionSecret = environment.AUTH_SESSION_SECRET
  const nodeEnvironment = environment.NODE_ENV
  const frontendOrigin = environment.FRONTEND_ORIGIN || (nodeEnvironment === 'development' ? 'http://localhost:7000' : '')

  if (!sessionSecret) throw new Error('AUTH_SESSION_SECRET must be set before starting the API server')
  if (nodeEnvironment === 'development' && isLocalHttpOrigin(frontendOrigin)) {
    return { sessionSecret, frontendOrigin, secureSessionCookie: false }
  }
  if (nodeEnvironment !== 'production') throw new Error('NODE_ENV must be development for local HTTP or production for a deployed API')
  if (!frontendOrigin.startsWith('https://')) throw new Error('FRONTEND_ORIGIN must use HTTPS in production')
  return { sessionSecret, frontendOrigin, secureSessionCookie: true }
}

const { sessionSecret, frontendOrigin, secureSessionCookie } = getRuntimeSecurityConfig()

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'angkham-final',
  // Security timestamps are compared with UTC_TIMESTAMP() in MySQL.
  timezone: 'Z'
})

// console.log("one", db)

const MAX_ACTIVE_SESSIONS_PER_ADMIN = 5
const DUMMY_PASSWORD_HASH = 'scrypt$d1K3RcL532f5hCs3WxQshA$UZ69HyFNiJttBERxGTHBNEFY2ATcm2l64rO75cH5wbky-9TdFSmJ6OzxNQ8ed-C2BThFXwyb_HKwAgRsVrAggA'

function getCookie(request, name) {
  const prefix = `${name}=`
  const value = (request.headers.cookie || '').split(';').map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(prefix))
  return value ? decodeURIComponent(value.slice(prefix.length)) : null
}

function setSessionCookie(response, token) {
  const attributes = ['Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=28800']
  if (secureSessionCookie) attributes.push('Secure')
  response.setHeader('Set-Cookie', `admin_session=${encodeURIComponent(token)}; ${attributes.join('; ')}`)
}

function clearSessionCookie(response) {
  const attributes = ['Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0']
  if (secureSessionCookie) attributes.push('Secure')
  response.setHeader('Set-Cookie', `admin_session=; ${attributes.join('; ')}`)
}

function createReadSession(database) {
  return async (request, _response, next) => {
    request.user = null
    request.sessionId = null
    const session = verifySessionToken(getCookie(request, 'admin_session'), sessionSecret)
    if (!session) return next()

    try {
      const [rows] = await database.query(
        `SELECT a.admin_id, a.admin_name, a.role, a.permissions
         FROM admin_sessions AS s
         INNER JOIN data_admin AS a ON a.admin_id = s.admin_id
         WHERE s.session_id = ? AND s.admin_id = ? AND s.revoked_at IS NULL AND s.expires_at > UTC_TIMESTAMP()
         LIMIT 1`,
        [session.session_id, session.admin_id]
      )
      if (rows[0]) {
        request.user = safeUser(rows[0])
        request.sessionId = session.session_id
      }
      return next()
    } catch (error) {
      return next(error)
    }
  }
}

function requireResourceAccess(resourceName, action) {
  return (request, response, next) => {
    if (canAccessResource(request.user, resourceName, action)) return next()
    return response.status(request.user ? 403 : 401).json({ error: request.user ? 'Insufficient permission' : 'Authentication required' })
  }
}

function requirePermission(permission) {
  return (request, response, next) => {
    if (hasPermission(request.user, permission)) return next()
    return response.status(request.user ? 403 : 401).json({ error: request.user ? 'Insufficient permission' : 'Authentication required' })
  }
}

function getResource(resourceName, response) {
  const resource = resources[resourceName]
  if (!resource) response.status(400).json({ error: 'Invalid resource' })
  return resource
}

function safeUser(user) {
  return { admin_id: user.admin_id, admin_name: user.admin_name, role: user.role, permissions: parsePermissions(user.permissions) }
}

function permissionsForRole(role, permissions) {
  // Employee accounts are deliberately limited to the internal order flow.
  // Enforce this at the API boundary instead of relying on the admin form.
  if (role === 'Employee') return ['create_orders']
  return parsePermissions(permissions)
}

function clientIp(request) {
  return request.socket.remoteAddress || 'unknown'
}

export function createLoginRateLimiter({ now = () => Date.now(), windowMs = 15 * 60 * 1000, maxPerAccount = 5, maxPerIp = 30 } = {}) {
  const attempts = new Map()
  let nextReservationId = 0

  function key(type, value) {
    return `${type}:${String(value).trim().toLowerCase()}`
  }

  function activeAttempts(bucketKey) {
    const cutoff = now() - windowMs
    const reservations = (attempts.get(bucketKey) || []).filter((reservation) => reservation.createdAt > cutoff)
    if (reservations.length) attempts.set(bucketKey, reservations)
    else attempts.delete(bucketKey)
    return reservations
  }

  function removeReservation(bucketKey, reservationId) {
    const remaining = activeAttempts(bucketKey).filter((reservation) => reservation.id !== reservationId)
    if (remaining.length) attempts.set(bucketKey, remaining)
    else attempts.delete(bucketKey)
  }

  return {
    reserve(ip, username) {
      const accountKey = key('account-ip', `${ip}:${username}`)
      const ipKey = key('ip', ip)
      const accountAttempts = activeAttempts(accountKey)
      const ipAttempts = activeAttempts(ipKey)
      const blocked = accountAttempts.length >= maxPerAccount || ipAttempts.length >= maxPerIp
      if (blocked) {
        const oldest = Math.min(accountAttempts[0]?.createdAt || Infinity, ipAttempts[0]?.createdAt || Infinity)
        return { blocked: true, retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now()) / 1000)) }
      }

      const reservation = { id: nextReservationId += 1, createdAt: now(), accountKey, ipKey }
      attempts.set(accountKey, [...accountAttempts, reservation])
      attempts.set(ipKey, [...ipAttempts, reservation])
      return { blocked: false, reservation }
    },
    recordFailure(_reservation) {
      // A reservation already counts as a failed attempt until it expires.
    },
    releaseSuccess(reservation) {
      if (!reservation) return
      // A verified account may clear only its own account/IP failures. The
      // aggregate IP bucket keeps failures for other usernames.
      attempts.delete(reservation.accountKey)
      removeReservation(reservation.ipKey, reservation.id)
    }
  }
}

function rateLimitBucket(type, value) {
  // Hashing keeps raw usernames and IP addresses out of the rate-limit table
  // while preserving a fixed-size, stable key for a shared MySQL store.
  return `${type}:${crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('base64url')}`
}

export function createDatabaseLoginRateLimiter(database, {
  now = () => Date.now(),
  windowMs = 15 * 60 * 1000,
  maxPerAccount = 5,
  maxPerIp = 30
} = {}) {
  if (!database?.getConnection) return createLoginRateLimiter({ now, windowMs, maxPerAccount, maxPerIp })

  return {
    async reserve(ip, username) {
      const normalizedUsername = String(username).trim().toLowerCase()
      const buckets = [
        { key: rateLimitBucket('account', normalizedUsername), maximum: maxPerAccount },
        { key: rateLimitBucket('account-ip', `${normalizedUsername}:${ip}`), maximum: maxPerAccount },
        { key: rateLimitBucket('ip', ip), maximum: maxPerIp }
      ].sort((left, right) => left.key.localeCompare(right.key))
      const connection = await database.getConnection()

      try {
        await connection.beginTransaction()
        await connection.query('DELETE FROM auth_login_rate_limits WHERE expires_at <= UTC_TIMESTAMP() LIMIT 1000')
        // Create the rows before locking them. This closes the otherwise empty-row
        // race on a first attempt while preserving one lock order across instances.
        for (const bucket of buckets) {
          await connection.query(
            'INSERT INTO auth_login_rate_limits (bucket_key, attempts, expires_at) VALUES (?, 0, ?) ON DUPLICATE KEY UPDATE bucket_key = VALUES(bucket_key)',
            [bucket.key, new Date(0)]
          )
        }
        const [rows] = await connection.query(
          `SELECT bucket_key, attempts, expires_at
           FROM auth_login_rate_limits
           WHERE bucket_key IN (?, ?, ?)
           FOR UPDATE`,
          buckets.map((bucket) => bucket.key)
        )
        const byKey = new Map(rows.map((row) => [row.bucket_key, row]))
        const currentTime = now()
        const blocked = buckets.find((bucket) => {
          const row = byKey.get(bucket.key)
          return row && new Date(row.expires_at).getTime() > currentTime && Number(row.attempts) >= bucket.maximum
        })
        if (blocked) {
          await connection.rollback()
          return { blocked: true, retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1000)) }
        }

        for (const bucket of buckets) {
          const row = byKey.get(bucket.key)
          const active = row && new Date(row.expires_at).getTime() > currentTime
          await connection.query(
            'UPDATE auth_login_rate_limits SET attempts = ?, expires_at = ? WHERE bucket_key = ?',
            [active ? Number(row.attempts) + 1 : 1, active ? row.expires_at : new Date(currentTime + windowMs), bucket.key]
          )
        }
        await connection.commit()
        return { blocked: false, reservation: { bucketKeys: buckets.map((bucket) => bucket.key) } }
      } catch (error) {
        await connection.rollback().catch(() => { })
        throw error
      } finally {
        connection.release()
      }
    },
    recordFailure() {
      // reserve() already records the attempt atomically before credential work.
    },
    async releaseSuccess(reservation) {
      if (!reservation?.bucketKeys?.length) return
      const connection = await database.getConnection()
      try {
        await connection.beginTransaction()
        await connection.query(
          `UPDATE auth_login_rate_limits
           SET attempts = GREATEST(attempts - 1, 0)
           WHERE bucket_key IN (?, ?, ?) AND expires_at > UTC_TIMESTAMP()`,
          reservation.bucketKeys
        )
        await connection.commit()
      } catch (error) {
        await connection.rollback().catch(() => { })
        throw error
      } finally {
        connection.release()
      }
    }
  }
}

async function createCappedSession(database, sessionId, adminId) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  if (!database?.getConnection) {
    await database.query('INSERT INTO admin_sessions (session_id, admin_id, expires_at) VALUES (?, ?, ?)', [sessionId, adminId, expiresAt])
    return
  }

  const connection = await database.getConnection()
  try {
    await connection.beginTransaction()
    await connection.query(
      'DELETE FROM admin_sessions WHERE admin_id = ? AND (expires_at <= UTC_TIMESTAMP() OR revoked_at IS NOT NULL)',
      [adminId]
    )
    const [activeSessions] = await connection.query(
      `SELECT session_id FROM admin_sessions
       WHERE admin_id = ? AND revoked_at IS NULL AND expires_at > UTC_TIMESTAMP()
       ORDER BY created_at ASC
       FOR UPDATE`,
      [adminId]
    )
    const sessionsToRevoke = activeSessions.slice(0, Math.max(0, activeSessions.length - (MAX_ACTIVE_SESSIONS_PER_ADMIN - 1)))
    if (sessionsToRevoke.length) {
      await connection.query(
        `UPDATE admin_sessions SET revoked_at = UTC_TIMESTAMP()
         WHERE session_id IN (${sessionsToRevoke.map(() => '?').join(', ')}) AND revoked_at IS NULL`,
        sessionsToRevoke.map((session) => session.session_id)
      )
    }
    await connection.query('INSERT INTO admin_sessions (session_id, admin_id, expires_at) VALUES (?, ?, ?)', [sessionId, adminId, expiresAt])
    await connection.commit()
  } catch (error) {
    await connection.rollback().catch(() => { })
    throw error
  } finally {
    connection.release()
  }
}

function calendarSources() {
  return [
    ...(process.env.GOOGLE_CALENDAR_ID ? [{ id: process.env.GOOGLE_CALENDAR_ID, label: 'My calendar', type: 'calendar' }] : []),
    { id: process.env.LAOS_HOLIDAY_CALENDAR_ID || 'en.la#holiday@group.v.calendar.google.com', label: 'Lao holidays', type: 'laos-holiday' },
    { id: process.env.US_HOLIDAY_CALENDAR_ID || 'en.usa#holiday@group.v.calendar.google.com', label: 'US holidays', type: 'us-holiday' }
  ]
}

function parseCalendarRange(request) {
  const timeMin = new Date(String(request.query.timeMin || ''))
  const timeMax = new Date(String(request.query.timeMax || ''))
  const maxRangeMs = 50 * 24 * 60 * 60 * 1000
  if (!Number.isFinite(timeMin.getTime()) || !Number.isFinite(timeMax.getTime()) || timeMax <= timeMin || timeMax - timeMin > maxRangeMs) return null
  return { timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString() }
}

export function createApp({ database = db, fetchImpl = globalThis.fetch, loginRateLimiter = createDatabaseLoginRateLimiter(database) } = {}) {
  const app = express()

  app.use(cors({
    origin(origin, callback) {
      if (!origin || origin === frontendOrigin) return callback(null, true)
      return callback(new Error('Origin is not allowed by CORS'))
    },
    credentials: true
  }))
  app.use(express.json({ limit: '100kb' }))
  app.use(createReadSession(database))

  app.post('/api/auth/login', async (request, response) => {
    const { username, password } = request.body || {}
    if (typeof username !== 'string' || typeof password !== 'string') {
      return response.status(400).json({ error: 'Username and password are required' })
    }

    const usernameKey = username.trim()
    if (!usernameKey || usernameKey.length > 128 || password.length > 1024) {
      return response.status(400).json({ error: 'Invalid username or password' })
    }
    const ip = clientIp(request)
    const rateLimit = await loginRateLimiter.reserve(ip, usernameKey)
    if (rateLimit.blocked) {
      response.setHeader('Retry-After', String(rateLimit.retryAfterSeconds))
      return response.status(429).json({ error: 'Too many sign-in attempts. Please try again later.' })
    }

    try {
      const [rows] = await database.query(
        'SELECT admin_id, admin_name, password, role, permissions FROM data_admin WHERE admin_name = ? LIMIT 1',
        [usernameKey]
      )
      const user = rows[0]
      // Every failed login performs scrypt work. Without this dummy hash, an
      // unknown username returns far earlier than a real account and exposes a
      // practical username-timing oracle.
      let validPassword
      if (isScryptHash(user?.password)) {
        validPassword = await verifyPassword(password, user.password)
      } else {
        await verifyPassword(password, DUMMY_PASSWORD_HASH)
        validPassword = Boolean(user) && !user.password?.startsWith('scrypt$') && matchesLegacyPassword(password, user.password)
      }
      if (!user || !validPassword) {
        await loginRateLimiter.recordFailure(rateLimit.reservation)
        return response.status(401).json({ error: 'Invalid username or password' })
      }

      if (!isScryptHash(user.password)) {
        await database.query('UPDATE data_admin SET password = ? WHERE admin_id = ?', [await hashPassword(password, false), user.admin_id])
      }

      const safe = safeUser(user)
      const sessionId = createSessionId()
      await createCappedSession(database, sessionId, safe.admin_id)
      await loginRateLimiter.releaseSuccess(rateLimit.reservation)
      setSessionCookie(response, createSessionToken(safe, sessionSecret, sessionId))
      return response.json({ user: safe })
    } catch (error) {
      console.error('Login failed', error)
      return response.status(500).json({ error: 'Unable to sign in' })
    }
  })

  app.post('/api/auth/logout', async (request, response, next) => {
    try {
      if (request.sessionId) await database.query('UPDATE admin_sessions SET revoked_at = UTC_TIMESTAMP() WHERE session_id = ? AND revoked_at IS NULL', [request.sessionId])
    } catch (error) {
      return next(error)
    }
    clearSessionCookie(response)
    return response.status(204).end()
  })

  app.get('/api/auth/me', (request, response) => {
    if (!request.user) return response.status(401).json({ error: 'Authentication required' })
    return response.json({ user: safeUser(request.user) })
  })

  app.get('/api/calendar/events', requirePermission('view_calendar'), async (request, response, next) => {
    const apiKey = process.env.GOOGLE_CALENDAR_API_KEY
    const range = parseCalendarRange(request)
    if (!range) return response.status(400).json({ error: 'Invalid calendar date range' })
    if (!apiKey || typeof fetchImpl !== 'function') return response.status(503).json({ error: 'Calendar is not configured' })

    try {
      const timeZone = process.env.GOOGLE_CALENDAR_TIME_ZONE || 'Asia/Vientiane'
      const params = new URLSearchParams({ key: apiKey, singleEvents: 'true', orderBy: 'startTime', ...range, timeZone, maxResults: '2500' })
      const calendars = calendarSources()
      const results = await Promise.allSettled(calendars.map(async (calendar) => {
        const googleResponse = await fetchImpl(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events?${params}`)
        const payload = await googleResponse.json()
        if (!googleResponse.ok) throw new Error(payload?.error?.message || `Unable to load ${calendar.label}`)
        return {
          calendar,
          summary: payload.summary,
          events: (payload.items || [])
            .filter((event) => event.status !== 'cancelled')
            .map((event) => ({ id: `${calendar.type}-${event.id}`, type: calendar.type, source: calendar.label, summary: event.summary || 'Untitled event', start: event.start || {} }))
        }
      }))
      const successes = results.filter((result) => result.status === 'fulfilled').map((result) => result.value)
      return response.setHeader('Cache-Control', 'no-store').json({
        calendarName: successes.find((result) => result.calendar.type === 'calendar')?.summary || 'Google Calendar',
        events: successes.flatMap((result) => result.events),
        failedCalendars: results.map((result, index) => result.status === 'rejected' ? calendars[index].label : null).filter(Boolean)
      })
    } catch (error) {
      return next(error)
    }
  })

  app.get('/api/get/:resourceName', async (request, response, next) => {
    const resourceName = request.params.resourceName
    const resource = getResource(resourceName, response)
    if (!resource) return
    return requireResourceAccess(resourceName, 'read')(request, response, async () => {
      try {
        const query = resourceName === 'data_admin'
          ? 'SELECT admin_id, admin_name, role, permissions, updatedAt FROM data_admin'
          : `SELECT * FROM ${resource.table}`
        const [rows] = await database.query(query)
        return response.json(rows)
      } catch (error) {
        return next(error)
      }
    })
  })

  app.post('/api/post/:resourceName', async (request, response, next) => {
    const resourceName = request.params.resourceName
    if (!getResource(resourceName, response)) return
    return requireResourceAccess(resourceName, 'create')(request, response, async () => {
      try {
        let result
        if (resourceName === 'data_admin') {
          const { admin_name, password, role, permissions, updatedAt } = request.body
            ;[result] = await database.query(
              'INSERT INTO data_admin (admin_name, password, role, permissions, updatedAt) VALUES (?, ?, ?, ?, ?)',
              [admin_name, await hashPassword(password), role, JSON.stringify(permissionsForRole(role, permissions)), updatedAt]
            )
        } else if (resourceName === 'data_student') {
          const { fullname, age, gender, phone, symptom, otherSymptom, updatedAt } = request.body
            ;[result] = await database.query('INSERT INTO data_student (fullname, age, gender, phone, symptom, otherSymptom, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)', [fullname, age, gender, phone, symptom, otherSymptom, updatedAt])
        } else if (resourceName === 'data_payment') {
          const { student_id, course, level, payment_date, start_study, end_study, time_study, no_of_weeks, usd, discount, place } = request.body
            ;[result] = await database.query('INSERT INTO data_payment (student_id, course, level, payment_date, start_study, end_study, time_study, no_of_weeks, usd, discount, place) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [student_id, course, level, payment_date, start_study, end_study, time_study, no_of_weeks, usd, discount, place])
        } else if (resourceName === 'data_product') {
          const { product_name, category, price, image_url, description, updatedAt } = request.body
            ;[result] = await database.query('INSERT INTO data_product (product_name, category, price, image_url, description, updatedAt) VALUES (?, ?, ?, ?, ?, ?)', [product_name, category, price, image_url, description, updatedAt])
        } else if (resourceName === 'data_order') {
          const productId = Number(request.body.product_id)
          const quantity = Number(request.body.quantity)
          if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) return response.status(400).json({ error: 'Invalid product or quantity' })
          const [products] = await database.query('SELECT product_id, product_name, category, price FROM data_product WHERE product_id = ? LIMIT 1', [productId])
          const product = products[0]
          if (!product) return response.status(404).json({ error: 'Product not found' })
          const orderDate = new Date().toISOString().slice(0, 19).replace('T', ' ')
            ;[result] = await database.query('INSERT INTO data_order (product_id, product_name, category, quantity, price, total, order_date) VALUES (?, ?, ?, ?, ?, ?, ?)', [product.product_id, product.product_name, product.category || '', quantity, product.price, Number(product.price) * quantity, orderDate])
        }
        return response.status(201).json({ id: result.insertId })
      } catch (error) {
        return next(error)
      }
    })
  })

  app.put('/api/put/:resourceName/:id', async (request, response, next) => {
    const resourceName = request.params.resourceName
    if (!getResource(resourceName, response)) return
    return requireResourceAccess(resourceName, 'update')(request, response, async () => {
      try {
        let result
        if (resourceName === 'data_admin') {
          const { admin_name, password, role, permissions, updatedAt } = request.body
          const passwordHash = password ? await hashPassword(password) : null
            ;[result] = await database.query('UPDATE data_admin SET admin_name = ?, password = COALESCE(?, password), role = ?, permissions = ?, updatedAt = ? WHERE admin_id = ?', [admin_name, passwordHash, role, JSON.stringify(permissionsForRole(role, permissions)), updatedAt, request.params.id])
          if (result.affectedRows > 0) await database.query('UPDATE admin_sessions SET revoked_at = UTC_TIMESTAMP() WHERE admin_id = ? AND revoked_at IS NULL', [request.params.id])
        } else if (resourceName === 'data_student') {
          const { fullname, age, gender, phone, symptom, otherSymptom, updatedAt } = request.body
            ;[result] = await database.query('UPDATE data_student SET fullname = ?, age = ?, gender = ?, phone = ?, symptom = ?, otherSymptom = ?, updatedAt = ? WHERE student_id = ?', [fullname, age, gender, phone, symptom, otherSymptom, updatedAt, request.params.id])
        } else if (resourceName === 'data_payment') {
          const { student_id, course, level, payment_date, start_study, end_study, time_study, no_of_weeks, usd, discount, place } = request.body
            ;[result] = await database.query('UPDATE data_payment SET student_id = ?, course = ?, level = ?, payment_date = ?, start_study = ?, end_study = ?, time_study = ?, no_of_weeks = ?, usd = ?, discount = ?, place = ? WHERE payment_id = ?', [student_id, course, level, payment_date, start_study, end_study, time_study, no_of_weeks, usd, discount, place, request.params.id])
        } else if (resourceName === 'data_product') {
          const { product_name, category, price, image_url, description, updatedAt } = request.body
            ;[result] = await database.query('UPDATE data_product SET product_name = ?, category = ?, price = ?, image_url = ?, description = ?, updatedAt = ? WHERE product_id = ?', [product_name, category, price, image_url, description, updatedAt, request.params.id])
        } else {
          return response.status(405).json({ error: 'Resource cannot be updated' })
        }
        if (result.affectedRows === 0) return response.status(404).json({ error: 'Record not found' })
        return response.json({ message: 'Record updated successfully' })
      } catch (error) {
        return next(error)
      }
    })
  })

  app.delete('/api/delete/:resourceName/:id', async (request, response, next) => {
    const resourceName = request.params.resourceName
    const resource = getResource(resourceName, response)
    if (!resource) return
    return requireResourceAccess(resourceName, 'delete')(request, response, async () => {
      try {
        if (resourceName === 'data_admin') await database.query('UPDATE admin_sessions SET revoked_at = UTC_TIMESTAMP() WHERE admin_id = ? AND revoked_at IS NULL', [request.params.id])
        const [result] = await database.query(`DELETE FROM ${resource.table} WHERE ${resource.primaryKey} = ?`, [request.params.id])
        if (result.affectedRows === 0) return response.status(404).json({ error: 'Record not found' })
        return response.json({ message: 'Record deleted successfully' })
      } catch (error) {
        return next(error)
      }
    })
  })

  app.get('/api/health', (_request, response) => response.json({ status: 'ok', message: 'Backend running' }))
  // The combined Railway service serves the Vue build and the Express API from
  // one public origin. Keeping API paths out of this fallback preserves JSON
  // responses for unknown API routes instead of returning the SPA document.
  if (fs.existsSync(frontendIndex)) {
    app.use(express.static(frontendDirectory))
    app.get(/^(?!\/api(?:\/|$)).*/, (request, response, next) => {
      if (request.method !== 'GET' || !request.accepts('html')) return next()
      return response.sendFile(frontendIndex)
    })
  }
  app.use((error, _request, response, _next) => {
    if (error.message === 'Origin is not allowed by CORS') return response.status(403).json({ error: error.message })
    console.error('API request failed', error)
    return response.status(500).json({ error: 'Internal server error' })
  })

  return app
}

if (process.argv[1]?.endsWith('connectDB.js')) {
  createApp().listen(process.env.PORT || 3000, () => console.log(`Server is running on port ${process.env.PORT || 3000}`))
}
