import { Router } from 'express'

const router = Router()

// GET /api/config — サーバー設定 (タイトル・ファビコンアイテム等)
router.get('/', (_req, res) => {
  res.json({
    title: 'AdvancementQuesting',
    faviconItem: 'writable_book',
  })
})

export default router
