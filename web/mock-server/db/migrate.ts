import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db } from './client.js'

migrate(db, { migrationsFolder: './mock-server/db/migrations' })
console.log('Migration complete')
