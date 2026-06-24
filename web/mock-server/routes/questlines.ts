import { Router } from 'express'
import { db } from '../db/client.js'
import { questlines } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// GET /api/questlines
router.get('/', async (_req, res) => {
  const rows = await db.select().from(questlines).orderBy(questlines.order)
  res.json(rows.map((ql) => ({
    id: ql.id,
    order: ql.order,
    title: ql.title,
    icon: ql.icon,
    questCount: 0,
    nodes: ql.nodes,
  })))
})

// PUT /api/questlines/:id/map — ノード配置を一括更新
router.put('/:id/map', requireAuth, async (req: AuthRequest, res) => {
  const id = String(req.params['id'])
  const body = req.body as { nodes?: Array<{ questId: string; x: number; y: number }> }
  const nodes = Array.isArray(body.nodes) ? body.nodes : []
  await db.update(questlines).set({ nodes }).where(eq(questlines.id, id))
  res.json({ status: 'updated', nodeCount: nodes.length })
})

export default router
