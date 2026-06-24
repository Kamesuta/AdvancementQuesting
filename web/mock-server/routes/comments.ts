import { Router } from 'express'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'
import { randomUUID } from 'crypto'

const router = Router()

// インメモリストア (テスト間でリセット可能)
export let commentStore: Array<Record<string, unknown>> = []
export function resetComments() { commentStore = [] }

// GET /api/comments — 認証不要
router.get('/', (_req, res) => {
  res.json(commentStore)
})

// POST /api/comments — editor 以上
router.post('/', requireAuth, (req: AuthRequest, res) => {
  if (req.playerRole !== 'editor' && req.playerRole !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return }
  const body = req.body as Record<string, unknown>
  const block = { ...body, id: randomUUID() }
  commentStore.push(block)
  res.status(201).json(block)
})

// PUT /api/comments/:id — editor 以上
router.put('/:id', requireAuth, (req: AuthRequest, res) => {
  if (req.playerRole !== 'editor' && req.playerRole !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return }
  const { id } = req.params
  const idx = commentStore.findIndex((c) => c['id'] === id)
  if (idx === -1) { res.status(404).json({ error: 'Not found' }); return }
  const updated = { ...req.body as Record<string, unknown>, id }
  commentStore[idx] = updated
  res.json(updated)
})

// DELETE /api/comments/:id — editor 以上
router.delete('/:id', requireAuth, (req: AuthRequest, res) => {
  if (req.playerRole !== 'editor' && req.playerRole !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return }
  const { id } = req.params
  const idx = commentStore.findIndex((c) => c['id'] === id)
  if (idx === -1) { res.status(404).json({ error: 'Not found' }); return }
  commentStore.splice(idx, 1)
  res.status(204).send()
})

export default router
