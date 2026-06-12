import { Router } from 'express'
import { db } from '../db/client.js'
import { playerProgress, quests } from '../db/schema.js'
import { and, eq } from 'drizzle-orm'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// GET /api/progress
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const rows = await db
    .select()
    .from(playerProgress)
    .where(eq(playerProgress.playerUuid, req.playerUuid!))

  res.json(rows)
})

// GET /api/progress/:questId
router.get('/:questId', requireAuth, async (req: AuthRequest, res) => {
  // Express 5 の型定義では params が string | string[] になるため明示的にキャスト
  const questId = String(req.params['questId'])
  const row = await db
    .select()
    .from(playerProgress)
    .where(
      and(
        eq(playerProgress.playerUuid, req.playerUuid!),
        eq(playerProgress.questId, questId),
      ),
    )
    .get()

  if (!row) {
    res.status(404).json({ error: 'Progress not found' })
    return
  }

  res.json(row)
})

// POST /api/progress/:questId/claim — 報酬受け取り
router.post('/:questId/claim', requireAuth, async (req: AuthRequest, res) => {
  const questId = String(req.params['questId'])
  const progress = await db
    .select()
    .from(playerProgress)
    .where(
      and(
        eq(playerProgress.playerUuid, req.playerUuid!),
        eq(playerProgress.questId, questId),
      ),
    )
    .get()

  if (!progress) {
    res.status(404).json({ error: 'Progress not found' })
    return
  }

  if (!progress.completed) {
    res.status(400).json({ error: 'Quest not completed yet' })
    return
  }

  if (progress.rewardClaimed) {
    res.status(400).json({ error: 'Reward already claimed' })
    return
  }

  await db
    .update(playerProgress)
    .set({ rewardClaimed: true })
    .where(eq(playerProgress.id, progress.id))

  // モック: 報酬内容を返す
  const quest = await db.select().from(quests).where(eq(quests.id, questId)).get()
  res.json({ claimed: true, rewards: quest?.rewards ?? [] })
})

export default router
