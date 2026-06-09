import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db } from './db/client.js'

import authRoutes from './routes/auth.js'
import questRoutes from './routes/quests.js'
import progressRoutes from './routes/progress.js'
import proposalRoutes from './routes/proposals.js'

config()

// 起動時に自動マイグレーション
migrate(db, { migrationsFolder: './mock-server/db/migrations' })

const app = express()
const port = parseInt(process.env.MOCK_PORT ?? '3000', 10)

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/quests', questRoutes)
app.use('/api/progress', progressRoutes)
app.use('/api/proposals', proposalRoutes)

// ヘルスチェック
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(port, () => {
  console.log(`Mock server running on http://localhost:${port}`)
})
