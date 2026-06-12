import { Router } from 'express'
import { db } from '../db/client.js'
import { authCodes, playerSessions } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// POST /api/auth/code — 6桁コードでセッション確立
router.post('/code', async (req, res) => {
  const { code } = req.body as { code?: string }
  if (!code || !/^\d{6}$/.test(code)) {
    res.status(400).json({ error: 'Invalid code format' })
    return
  }

  const authCode = await db
    .select()
    .from(authCodes)
    .where(eq(authCodes.code, code))
    .get()

  if (!authCode || authCode.used || authCode.expiresAt < new Date()) {
    res.status(401).json({ error: 'Invalid or expired code' })
    return
  }

  // コードを使用済みにする
  await db.update(authCodes).set({ used: true }).where(eq(authCodes.code, code))

  // セッション作成 (7日間)
  const token = randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await db.insert(playerSessions).values({
    sessionToken: token,
    playerUuid: authCode.playerUuid,
    playerName: authCode.playerName,
    role: 'player',
    expiresAt,
  })

  res.json({ token, playerUuid: authCode.playerUuid, playerName: authCode.playerName, role: 'player' })
})

// POST /api/auth/quick — 開発用クイックログイン (固定トークンをupsert)
router.post('/quick', async (req, res) => {
  const { token } = req.body as { token?: string }
  const QUICK_SESSIONS: Record<string, { playerUuid: string; playerName: string; role: 'editor' | 'player' }> = {
    'demo-editor-token': { playerUuid: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff', playerName: 'Editor', role: 'editor' },
    'demo-player-token': { playerUuid: 'cccccccc-dddd-eeee-ffff-aaaaaaaaaaaa', playerName: 'Alex', role: 'player' },
    'demo-session-token-for-development': { playerUuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', playerName: 'Steve', role: 'editor' },
  }
  const session = token ? QUICK_SESSIONS[token] : undefined
  if (!session) {
    res.status(400).json({ error: 'Unknown quick token' })
    return
  }
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await db.insert(playerSessions).values({ sessionToken: token!, ...session, expiresAt })
    .onConflictDoUpdate({ target: playerSessions.sessionToken, set: { expiresAt } })
  res.json({ token, ...session })
})

// GET /api/auth/me — セッション情報取得
router.get('/me', requireAuth, (req: AuthRequest, res) => {
  res.json({ playerUuid: req.playerUuid, playerName: req.playerName, role: req.playerRole ?? 'player' })
})

// DELETE /api/auth/logout — ログアウト (セッションを削除)
router.delete('/logout', requireAuth, async (req: AuthRequest, res) => {
  const token = req.headers.authorization!.slice(7)
  await db.delete(playerSessions)
    .where(eq(playerSessions.sessionToken, token))
  res.status(204).send()
})

export default router
