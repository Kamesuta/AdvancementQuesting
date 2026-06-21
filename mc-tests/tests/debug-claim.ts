/**
 * デバッグ: クエスト63の報酬受取UI動作確認
 * 実行: API_BASE=http://localhost:8080 node --import tsx/esm mc-tests/tests/debug-claim.ts
 */
import { chromium } from 'playwright'

const BASE = process.env.API_BASE ?? 'http://localhost:8080'
const LOGIN_CODE = process.env.LOGIN_CODE ?? '694505'
const QUEST_ID = process.env.QUEST_ID ?? '63'

const browser = await chromium.launch({ headless: false })
const page = await browser.newPage()

page.on('console', m => console.log('[browser]', m.type(), m.text()))
page.on('response', r => {
  if (r.url().includes('/api/')) console.log('[net]', r.request().method(), r.url(), r.status())
})

console.log(`ログイン: ${BASE}/login?code=${LOGIN_CODE}`)
await page.goto(`${BASE}/login?code=${LOGIN_CODE}`)
await page.waitForTimeout(2000)
await page.screenshot({ path: 'tmp/01-after-login.png', fullPage: true })

await page.goto(`${BASE}/`)
await page.waitForTimeout(3000)
await page.screenshot({ path: 'tmp/02-map.png', fullPage: true })

const node = page.locator(`[data-node-id="${QUEST_ID}"]`)
const visible = await node.isVisible().catch(() => false)
console.log(`クエスト${QUEST_ID}ノード表示:`, visible)

if (!visible) {
  console.error('ノードが見つかりません')
  await browser.close()
  process.exit(1)
}

await node.click()
await page.waitForTimeout(1500)
await page.screenshot({ path: 'tmp/03-modal-open.png', fullPage: true })

const claimBtn = page.getByText(/報酬を受け取る/)
const hasClaim = await claimBtn.isVisible().catch(() => false)
console.log('報酬ボタン表示:', hasClaim)

if (hasClaim) {
  const token = await page.evaluate(() => localStorage.getItem('token'))
  const before = await page.evaluate(async (args) => {
    const r = await fetch(`/api/progress/${args.questId}`, { headers: { Authorization: 'Bearer ' + args.token } })
    return r.json()
  }, { questId: QUEST_ID, token })
  console.log('claim前の進捗:', JSON.stringify(before))

  await claimBtn.click()
  console.log('クリックした — 3秒待機...')
  await page.waitForTimeout(3000)
  await page.screenshot({ path: 'tmp/04-after-claim.png', fullPage: true })

  const stillVisible = await claimBtn.isVisible().catch(() => false)
  console.log('claim後ボタンまだある:', stillVisible)

  const after = await page.evaluate(async (args) => {
    const r = await fetch(`/api/progress/${args.questId}`, { headers: { Authorization: 'Bearer ' + args.token } })
    return r.json()
  }, { questId: QUEST_ID, token })
  console.log('claim後の進捗:', JSON.stringify(after))
} else {
  console.log('報酬ボタンなし — すでに受取済みか未完了')
  const token = await page.evaluate(() => localStorage.getItem('token'))
  const progress = await page.evaluate(async (args) => {
    const r = await fetch(`/api/progress/${args.questId}`, { headers: { Authorization: 'Bearer ' + args.token } })
    return r.json()
  }, { questId: QUEST_ID, token })
  console.log('現在の進捗:', JSON.stringify(progress))
}

console.log('ブラウザを10秒間開けたままにします...')
await page.waitForTimeout(10000)
await browser.close()
