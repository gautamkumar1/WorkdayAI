import dotenv from 'dotenv'
import path from 'path'

// Load .env so DATABASE_URL, JWT_SECRET, etc. are available in tests
dotenv.config({ path: path.resolve(__dirname, '../.env') })

// Override DB to test database
if (process.env['DATABASE_URL_TEST']) {
  process.env['DATABASE_URL'] = process.env['DATABASE_URL_TEST']
}
