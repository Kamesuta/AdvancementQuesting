import { Router } from 'express'
import type { AuthRequest } from '../middleware/auth.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// 実APIは呼ばず、決定的なダミー3候補を返す。
// messages の長さでテーマを切り替え、リロール/再提案で内容が変わることを検証できる。
const THEMES = [
  {
    titles: ['マナ理論の覚醒', '失われし魔導の書', '古の魔法陣'],
    tone: '古の魔法陣が眠る遺跡で、忘れ去られた魔力の理を解き明かそう。',
  },
  {
    titles: ['鋼鉄の誓い', '鍛冶神の試練', '炉の中の約束'],
    tone: '炎と鉄の試練を越え、伝説に語られる武具を自らの手で鍛え上げよ。',
  },
  {
    titles: ['豊穣の約束', '大地のささやき', '実りの祝祭'],
    tone: 'のどかな畑を耕し、大地の恵みを村のみんなへと届けよう。',
  },
]

const DEFAULT_PROMPT = 'あなたはマインクラフトのクエスト作成を補助するアシスタントです。\n（モック用デフォルトプロンプト）'

// 編集者全員で共有するプロンプト (本番は prompt.txt、モックはメモリ保持)
let sharedPrompt = DEFAULT_PROMPT

function isEditor(req: AuthRequest): boolean {
  return req.playerRole === 'editor' || req.playerRole === 'admin'
}

// POST /api/ai/quest-suggest — editor 以上
router.post('/quest-suggest', requireAuth, (req: AuthRequest, res) => {
  if (!isEditor(req)) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const body = req.body as {
    tasks?: string[]
    rewards?: string[]
    messages?: { role: string; content: string }[]
    currentTitle?: string
    currentSubtitle?: string
    currentDescription?: string
  }
  const tasks = Array.isArray(body.tasks) ? body.tasks : []
  const msgLen = Array.isArray(body.messages) ? body.messages.length : 0

  const theme = THEMES[msgLen % THEMES.length]!
  const taskHint = tasks.length > 0 ? `（目標: ${tasks[0]}）` : ''

  // 既存タイトルがあれば「修正案」であることを反映する
  const existing = (body.currentTitle ?? '').trim()
  const isRevision = existing !== '' && existing !== '新規クエスト'
  const prefix = isRevision ? '【改】' : ''

  const candidates = theme.titles.map((title) => ({
    title: `${prefix}${title}`,
    description: `${theme.tone}${taskHint}${isRevision ? `（「${existing}」をもとに改善）` : ''}`,
  }))

  res.json({ candidates })
})

// GET /api/ai/prompt — 現在のプロンプトを取得 (editor 以上)
router.get('/prompt', requireAuth, (req: AuthRequest, res) => {
  if (!isEditor(req)) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  res.json({ prompt: sharedPrompt })
})

// PUT /api/ai/prompt — プロンプトを保存 (editor 以上・全員で共有)
router.put('/prompt', requireAuth, (req: AuthRequest, res) => {
  if (!isEditor(req)) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt : ''
  sharedPrompt = prompt
  res.json({ prompt })
})

export default router
