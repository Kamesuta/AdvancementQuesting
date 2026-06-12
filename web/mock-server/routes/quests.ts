import { Router } from 'express'
import { db } from '../db/client.js'
import { quests } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// GET /api/quests
router.get('/', async (req, res) => {
  const { status, category } = req.query as Record<string, string>
  const rows = await db.select().from(quests)

  const filtered = rows.filter((q) => {
    if (status && q.status !== status) return false
    if (category && q.category !== category) return false
    return true
  })

  res.json(filtered)
})

// GET /api/quests/:id
router.get('/:id', async (req, res) => {
  const id = parseInt(String(req.params['id']), 10)
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return }
  const quest = await db.select().from(quests).where(eq(quests.id, id)).get()
  if (!quest) {
    res.status(404).json({ error: 'Quest not found' })
    return
  }
  res.json(quest)
})

// POST /api/quests — id は AUTOINCREMENT で採番
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const body = req.body
  const now = new Date()
  const values = {
    title: body.title ?? 'New Quest',
    description: body.description ?? null,
    icon: body.icon ?? null,
    category: body.category ?? null,
    prerequisites: body.prerequisites ?? [],
    conditions: body.conditions ?? [],
    rewards: body.rewards ?? [],
    mapPosition: body.mapPosition ?? null,
    customButtons: body.customButtons ?? [],
    status: body.status ?? 'draft',
    creatorUuid: req.playerUuid!,
    createdAt: now,
    updatedAt: now,
  }

  const result = await db.insert(quests).values(values).returning()
  res.status(201).json(result[0])
})

// PUT /api/quests/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(String(req.params['id']), 10)
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return }
  const existing = await db.select().from(quests).where(eq(quests.id, id)).get()
  if (!existing) {
    res.status(404).json({ error: 'Quest not found' })
    return
  }

  const body = req.body
  const updated = { ...body, updatedAt: new Date() }

  await db.update(quests).set(updated).where(eq(quests.id, id))
  res.json({ ...existing, ...updated })
})

// DELETE /api/quests/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const id = parseInt(String(req.params['id']), 10)
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return }
  await db.delete(quests).where(eq(quests.id, id))
  res.status(204).send()
})

export default router
