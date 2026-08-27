import mysql from 'mysql2/promise'
import { loadEnvironmentFile } from '../src/server/load-env.js'

loadEnvironmentFile()

const database = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'angkham-final'
})

try {
  await database.query(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      session_id VARCHAR(64) NOT NULL PRIMARY KEY,
      admin_id INT NOT NULL,
      expires_at DATETIME NOT NULL,
      revoked_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX admin_sessions_active_idx (admin_id, revoked_at, expires_at),
      CONSTRAINT admin_sessions_admin_fk
        FOREIGN KEY (admin_id) REFERENCES data_admin(admin_id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB
  `)
  await database.query('DELETE FROM admin_sessions WHERE expires_at <= UTC_TIMESTAMP() OR revoked_at IS NOT NULL')
  await database.query(`
    CREATE TABLE IF NOT EXISTS auth_login_rate_limits (
      bucket_key VARCHAR(64) NOT NULL PRIMARY KEY,
      attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
      expires_at DATETIME NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX auth_login_rate_limits_expiry_idx (expires_at)
    ) ENGINE=InnoDB
  `)
  await database.query('DELETE FROM auth_login_rate_limits WHERE expires_at <= UTC_TIMESTAMP()')
  console.log('Security session and shared login-rate-limit schemas are ready.')
} finally {
  await database.end()
}
