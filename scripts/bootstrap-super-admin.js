import mysql from 'mysql2/promise'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { loadEnvironmentFile } from '../src/server/load-env.js'
import { hashPassword } from '../src/server/security.js'

const SUPER_ADMIN_PERMISSIONS = [
  'view_calendar',
  'manage_students',
  'manage_payments',
  'manage_products',
  'view_product_report'
]

function promptHidden(question) {
  if (!input.isTTY) throw new Error('A TTY is required to enter a password securely')

  return new Promise((resolve, reject) => {
    let value = ''
    const onData = (character) => {
      if (character === '\u0003') {
        cleanup()
        reject(new Error('Cancelled'))
      } else if (character === '\r' || character === '\n') {
        output.write('\n')
        cleanup()
        resolve(value)
      } else if (character === '\u007f' || character === '\b') {
        value = value.slice(0, -1)
      } else if (character >= ' ') {
        value += character
      }
    }
    const cleanup = () => {
      input.off('data', onData)
      input.setRawMode(false)
      input.pause()
    }

    output.write(question)
    input.setRawMode(true)
    input.resume()
    input.setEncoding('utf8')
    input.on('data', onData)
  })
}

async function promptUsername() {
  const terminal = createInterface({ input, output })
  try {
    return (await terminal.question('Super Admin username: ')).trim()
  } finally {
    terminal.close()
  }
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log('Usage: npm run bootstrap-admin')
    console.log('Creates the first Super Admin only when no Super Admin exists.')
    return
  }

  loadEnvironmentFile()
  const username = await promptUsername()
  if (!username) throw new Error('Username is required')

  const password = await promptHidden('Password (at least 12 characters): ')
  const confirmation = await promptHidden('Confirm password: ')
  if (password !== confirmation) throw new Error('Passwords do not match')

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'angkham-final'
  })

  try {
    const [superAdmins] = await connection.query("SELECT admin_id FROM data_admin WHERE role = 'Super Admin' LIMIT 1")
    if (superAdmins.length > 0) {
      throw new Error('A Super Admin already exists. Refusing to create another bootstrap account.')
    }

    const [matchingUsers] = await connection.query('SELECT admin_id FROM data_admin WHERE admin_name = ? LIMIT 1', [username])
    if (matchingUsers.length > 0) throw new Error('That username already exists')

    const passwordHash = await hashPassword(password)
    await connection.query(
      'INSERT INTO data_admin (admin_name, password, role, permissions, updatedAt) VALUES (?, ?, ?, ?, ?)',
      [username, passwordHash, 'Super Admin', JSON.stringify(SUPER_ADMIN_PERMISSIONS), new Date().toISOString().slice(0, 10)]
    )
    console.log(`Created Super Admin account for ${username}. Store the password in a password manager.`)
  } finally {
    await connection.end()
  }
}

main().catch((error) => {
  console.error(`Bootstrap failed: ${error.message}`)
  process.exitCode = 1
})
