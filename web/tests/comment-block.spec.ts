/**
 * コメントブロック機能テスト
 * C-1. 編集者: add_comment モードでドラッグするとコメントブロックが生成される
 * C-2. コメントブロック: タイトルをダブルクリックでインライン編集できる
 * C-3. コメントブロック: カラーボタンで色変更できる
 * C-4. コメントブロック: delete モードでクリックすると削除される
 * C-5. コメントブロック: リロード後も永続化される
 * C-6. コメントブロック: 未ログインでは add_comment ボタンが表示されない
 */

import { test, expect } from '@playwright/test'
import { loginAs, MOCK } from './helpers.js'

test.beforeEach(async ({ page }) => {
  // コメントデータをリセット
  await page.request.post(`${MOCK}/api/test/reset-comments`)
  await page.goto('/')
  await expect(page.locator('[data-node-id]').first()).toBeVisible({ timeout: 10000 })
})

// C-1
test('編集者: add_commentモードでドラッグするとコメントブロックが生成される (C-1)', async ({ page }) => {
  await loginAs(page, 'demo-editor-token')

  await page.getByTitle('コメントを追加').click()

  const canvas = page.locator('.flex-grow.relative.overflow-hidden').first()
  const box = await canvas.boundingBox()

  // ドラッグで矩形を描く (右下の空きエリア)
  const sx = box!.x + box!.width - 350
  const sy = box!.y + box!.height - 250
  await page.mouse.move(sx, sy)
  await page.mouse.down()
  await page.mouse.move(sx + 200, sy + 120, { steps: 10 })
  await page.mouse.up()

  // コメントブロックが生成されること
  await expect(page.locator('[data-comment-id]')).toBeVisible({ timeout: 3000 })
  await expect(page.locator('[data-comment-id]')).toContainText('コメント')
})

// C-2
test('コメントブロック: タイトルをダブルクリックでインライン編集できる (C-2)', async ({ page }) => {
  await loginAs(page, 'demo-editor-token')

  // コメントを作成 (右下の空きエリア)
  await page.getByTitle('コメントを追加').click()
  const canvas = page.locator('.flex-grow.relative.overflow-hidden').first()
  const box = await canvas.boundingBox()
  const sx = box!.x + box!.width - 350
  const sy = box!.y + box!.height - 250
  await page.mouse.move(sx, sy)
  await page.mouse.down()
  await page.mouse.move(sx + 200, sy + 120, { steps: 10 })
  await page.mouse.up()

  await expect(page.locator('[data-comment-id]')).toBeVisible({ timeout: 3000 })

  // コメントブロックのヘッダーを座標で直接ダブルクリック (ノードの裏に隠れないよう座標を使う)
  const commentBox = await page.locator('[data-comment-id]').first().boundingBox()
  // ヘッダーは上部 28px なのでその中央をダブルクリック
  await page.mouse.dblclick(commentBox!.x + commentBox!.width / 2, commentBox!.y + 14)

  // input が表示されること
  const input = page.locator('[data-comment-id] input')
  await expect(input).toBeVisible({ timeout: 2000 })
  await input.fill('テストコメント')
  await input.press('Enter')

  // タイトルが更新されること
  await expect(page.locator('[data-comment-id]')).toContainText('テストコメント')
})

// C-4
test('コメントブロック: deleteモードでクリックすると削除される (C-4)', async ({ page }) => {
  await loginAs(page, 'demo-editor-token')

  // コメントを作成 (右下の空きエリア)
  await page.getByTitle('コメントを追加').click()
  const canvas = page.locator('.flex-grow.relative.overflow-hidden').first()
  const box = await canvas.boundingBox()
  const sx = box!.x + box!.width - 350
  const sy = box!.y + box!.height - 250
  await page.mouse.move(sx, sy)
  await page.mouse.down()
  await page.mouse.move(sx + 200, sy + 120, { steps: 10 })
  await page.mouse.up()

  await expect(page.locator('[data-comment-id]')).toBeVisible({ timeout: 3000 })

  // 削除モードに切り替えてコメントをクリック
  await page.getByTitle('削除').click()
  const comment = page.locator('[data-comment-id]').first()
  const commentBox = await comment.boundingBox()
  await page.mouse.click(commentBox!.x + commentBox!.width / 2, commentBox!.y + commentBox!.height / 2)

  // コメントブロックが消えること
  await expect(page.locator('[data-comment-id]')).not.toBeVisible({ timeout: 3000 })
})

// C-5
test('コメントブロック: リロード後も永続化される (C-5)', async ({ page }) => {
  await loginAs(page, 'demo-editor-token')

  // コメントを作成 (右下の空きエリア)
  await page.getByTitle('コメントを追加').click()
  const canvas = page.locator('.flex-grow.relative.overflow-hidden').first()
  const box = await canvas.boundingBox()
  const sx = box!.x + box!.width - 350
  const sy = box!.y + box!.height - 250
  await page.mouse.move(sx, sy)
  await page.mouse.down()
  await page.mouse.move(sx + 200, sy + 120, { steps: 10 })
  await page.mouse.up()

  await expect(page.locator('[data-comment-id]')).toBeVisible({ timeout: 3000 })

  // ページをリロード
  await page.request.post(`${MOCK}/api/auth/quick`, { data: { token: 'demo-editor-token' } })
  await page.reload()
  await expect(page.locator('[data-node-id]').first()).toBeVisible({ timeout: 10000 })

  // コメントブロックが残っていること
  await expect(page.locator('[data-comment-id]')).toBeVisible({ timeout: 3000 })
})

// C-6
test('コメントブロック: 未ログイン時はコメント追加ボタンが非表示 (C-6)', async ({ page }) => {
  // 未ログイン状態ではコメント追加ボタンが見えないこと
  await expect(page.getByTitle('コメントを追加')).not.toBeVisible()
})
