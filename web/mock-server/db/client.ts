import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema.js'
import { config } from 'dotenv'
import { mkdirSync } from 'fs'
import { dirname } from 'path'

config()

const dbPath = process.env.DB_PATH ?? './mock-server/db/quest.db'
mkdirSync(dirname(dbPath), { recursive: true })

const sqlite = new Database(dbPath)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })
