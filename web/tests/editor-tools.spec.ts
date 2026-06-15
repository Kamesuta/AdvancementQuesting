/**
 * 編集操作・保存関連テスト
 * 11. 編集者: 移動ツールでノードをドラッグ → 位置が変わる
 * 13. 未ログイン: クエストクリックで読み取り専用モーダルが開く
 * 14. 保存永続化: ノード移動後に保存するとリロード後も位置が保持される
 * 21. タスク保存: advancement 条件を追加して保存→リロード後も保持
 * 22. タスク保存: item 条件を追加して保存→リロード後も itemType が保持
 */

import { test, expect } from '@playwright/test'
import { loginAs, loggedInBtn, MOCK } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-node-id]').first()).toBeVisible({ timeout: 10000 })
})

// 11
test('編集者: moveモードでノードをドラッグすると位置が変わる', async ({ page }) => {
  await loginAs(page, 'demo-editor-token')
  await page.getByTitle('移動').click()

  const canvas = page.locator('.flex-grow.relative.overflow-hidden').first()
  const box = await canvas.boundingBox()
  const nx = box!.x + 100
  const ny = box!.y + 100

  await page.mouse.move(nx, ny)
  await page.mouse.down()
  await page.mouse.move(nx + 80, ny + 60, { steps: 10 })
  await page.mouse.up()

  const style = await page.locator('[data-node-id="1"]').getAttribute('style')
  expect(style).not.toContain('left: 100px')
})

// 13
test('未ログイン: クエストノードをクリックすると読み取り専用モーダルが開く', async ({ page }) => {
  await expect(loggedInBtn(page)).not.toBeVisible()

  const canvas = page.locator('.flex-grow.relative.overflow-hidden').first()
  const box = await canvas.boundingBox()
  await page.mouse.click(box!.x + 100, box!.y + 100)

  await expect(page.getByPlaceholder('クエストのタイトル')).toBeVisible({ timeout: 3000 })
  await expect(page.getByPlaceholder('クエストのタイトル')).toHaveAttribute('readonly', '')

  await page.getByRole('button', { name: '閉じる' }).last().click()
  await expect(page.getByPlaceholder('クエストのタイトル')).not.toBeVisible()
})

// 14
test('保存永続化: 編集者がノード移動後に保存するとリロード後も位置が保持される', async ({ page }) => {
  await loginAs(page, 'demo-editor-token')
  await page.getByTitle('移動').click()

  const canvas = page.locator('.flex-grow.relative.overflow-hidden').first()
  const box = await canvas.boundingBox()
  const nx = box!.x + 100
  const ny = box!.y + 100

  await page.mouse.move(nx, ny)
  await page.mouse.down()
  await page.mouse.move(nx + 120, ny + 80, { steps: 15 })
  await page.mouse.up()

  const styleBefore = await page.locator('[data-node-id="1"]').getAttribute('style')
  expect(styleBefore).not.toContain('left: 100px')

  await page.getByText('💾 保存').click()
  await expect(page.getByText('保存しました')).toBeVisible({ timeout: 5000 })

  await page.request.post(`${MOCK}/api/auth/quick`, { data: { token: 'demo-editor-token' } })
  await page.reload()
  await expect(loggedInBtn(page)).toBeVisible({ timeout: 8000 })

  const styleAfter = await page.locator('[data-node-id="1"]').getAttribute('style')
  expect(styleAfter).not.toContain('left: 100px')
})

// 21
test('タスク保存: advancement 条件を追加して保存するとリロード後も保持される', async ({ page }) => {
  await loginAs(page, 'demo-editor-token')

  const node1 = page.locator('[data-node-id="1"]')
  await expect(node1).toBeVisible({ timeout: 5000 })
  const box = await node1.boundingBox()
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await expect(page.getByPlaceholder('クエストのタイトル')).toBeVisible({ timeout: 5000 })

  await page.locator('button.hover\\:bg-white\\/10').first().click()
  await page.locator('.px-3.py-2').filter({ hasText: '🏆' }).click()

  await expect(page.getByPlaceholder('minecraft:story/mine_wood')).toBeVisible({ timeout: 3000 })
  await page.getByPlaceholder('minecraft:story/mine_wood').fill('minecraft:story/mine_stone')
  await page.getByRole('button', { name: '完了' }).click()

  await expect(page.getByPlaceholder('クエストのタイトル')).toBeVisible({ timeout: 3000 })
  await expect(page.getByText('🏆').first()).toBeVisible()
  await page.getByRole('button', { name: '閉じる' }).last().click()

  await page.getByText('💾 保存').click()
  await expect(page.getByText('保存しました')).toBeVisible({ timeout: 5000 })

  const quest = await (await page.request.get(`${MOCK}/api/quests/1`)).json()
  const adv = quest.conditions.find((c: any) => c.type === 'advancement')
  expect(adv).toBeDefined()
  expect(adv.advancementId).toBe('minecraft:story/mine_stone')

  await page.request.post(`${MOCK}/api/auth/quick`, { data: { token: 'demo-editor-token' } })
  await page.reload()
  await expect(loggedInBtn(page)).toBeVisible({ timeout: 8000 })
  const node1r = page.locator('[data-node-id="1"]')
  await expect(node1r).toBeVisible({ timeout: 5000 })
  const box2 = await node1r.boundingBox()
  await page.mouse.click(box2!.x + box2!.width / 2, box2!.y + box2!.height / 2)
  await expect(page.getByPlaceholder('クエストのタイトル')).toBeVisible({ timeout: 5000 })
  await expect(page.getByText('🏆').first()).toBeVisible()
  await page.getByRole('button', { name: '閉じる' }).last().click()
})

// 22
test('タスク保存: item 条件を追加して保存するとリロード後も itemType が保持される', async ({ page }) => {
  await loginAs(page, 'demo-editor-token')

  const node1 = page.locator('[data-node-id="1"]')
  await expect(node1).toBeVisible({ timeout: 5000 })
  const box = await node1.boundingBox()
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await expect(page.getByPlaceholder('クエストのタイトル')).toBeVisible({ timeout: 5000 })

  await page.locator('button.hover\\:bg-white\\/10').first().click()
  await page.locator('.px-3.py-2').filter({ hasText: '📦' }).first().click()

  await expect(page.locator('input[type="number"]').first()).toBeVisible({ timeout: 3000 })
  await page.locator('input[type="number"]').first().fill('5')
  await page.getByRole('button', { name: '完了' }).click()

  await expect(page.getByPlaceholder('クエストのタイトル')).toBeVisible({ timeout: 3000 })
  await page.getByRole('button', { name: '閉じる' }).last().click()

  await page.getByText('💾 保存').click()
  await expect(page.getByText('保存しました')).toBeVisible({ timeout: 5000 })

  const quest = await (await page.request.get(`${MOCK}/api/quests/1`)).json()
  const item = quest.conditions.find((c: any) => c.type === 'item')
  expect(item).toBeDefined()
  expect(item.itemType).toBe('stone')
  expect(item.count).toBe(5)

  await page.request.post(`${MOCK}/api/auth/quick`, { data: { token: 'demo-editor-token' } })
  await page.reload()
  await expect(loggedInBtn(page)).toBeVisible({ timeout: 8000 })
  const node1r = page.locator('[data-node-id="1"]')
  await expect(node1r).toBeVisible({ timeout: 5000 })
  const box2 = await node1r.boundingBox()
  await page.mouse.click(box2!.x + box2!.width / 2, box2!.y + box2!.height / 2)
  await expect(page.getByPlaceholder('クエストのタイトル')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('img[src*="stone"]').first()).toBeVisible()
  await page.getByRole('button', { name: '閉じる' }).last().click()
})
