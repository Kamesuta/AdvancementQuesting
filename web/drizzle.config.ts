import { defineConfig } from 'drizzle-kit'
import { config } from 'dotenv'

config()

export default defineConfig({
  schema: './mock-server/db/schema.ts',
  out: './mock-server/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DB_PATH ?? './mock-server/db/quest.db',
  },
})
