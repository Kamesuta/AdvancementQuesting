/**
 * 統計ダッシュボードテスト
 * DB-1. 統計タブに切り替えられる
 * DB-2. エディターはウィジェット追加バーが見える
 * DB-3. プレイヤーはウィジェット追加バーが見えない
 * DB-4. ウィジェットを追加するとグリッドに表示される
 * DB-5. ウィジェットの×ボタンで削除できる
 * DB-6. ウィジェット設定モーダルが開閉できる
 * DB-7. ダッシュボードレイアウトがリロード後も保持される
 */

import { test, expect } from '@playwright/test'
import { loginAs, MOCK } from './helpers.js'

async function resetDashboard(page: import('@playwright/test').Page) {
  await page.request.put(`${MOCK}/api/dashboard`, {
    headers: { Authorization: 'Bearer demo-editor-token' },
    data: { widgets: [] },
  })
}

async function openStatsTab(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /統計/ }).click()
  // 統計タブコンテンツが表示されるまで待つ（エディターの場合は追加バー、プレイヤーは空メッセージ）
  await expect(
    page.getByText('+ ウィジェット追加:').or(page.getByText('ダッシュボードが未設定です')),
  ).toBeVisible({ timeout: 5000 }).catch(() => {
    // empty dashboard with editor
  })
}

test.beforeEach(async ({ page }) => {
  await resetDashboard(page)
  await page.goto('/')
  await expect(page.locator('[data-node-id]').first()).toBeVisible({ timeout: 10000 })
})

test('DB-1: 統計タブに切り替えられる', async ({ page }) => {
  await loginAs(page, 'demo-editor-token')
  await page.getByRole('button', { name: /統計/ }).click()
  // エディターなのでウィジェット追加バーが見える
  await expect(page.getByText('+ ウィジェット追加:')).toBeVisible({ timeout: 5000 })
})

test('DB-2: エディターはウィジェット追加バーが見える', async ({ page }) => {
  await loginAs(page, 'demo-editor-token')
  await page.getByRole('button', { name: /統計/ }).click()
  await expect(page.getByText('+ ウィジェット追加:')).toBeVisible({ timeout: 5000 })
})

test('DB-3: プレイヤーはウィジェット追加バーが見えない', async ({ page }) => {
  await loginAs(page, 'demo-player-token')
  await page.getByRole('button', { name: /統計/ }).click()
  await expect(page.getByText('+ ウィジェット追加:')).toHaveCount(0)
})

test('DB-4: ウィジェットを追加するとグリッドに表示される', async ({ page }) => {
  await loginAs(page, 'demo-editor-token')
  await page.getByRole('button', { name: /統計/ }).click()
  await expect(page.getByText('+ ウィジェット追加:')).toBeVisible({ timeout: 5000 })

  // 空状態の確認
  await expect(page.getByText('ウィジェットを追加してください')).toBeVisible()

  // アクティビティウィジェットを追加（ボタンにはアイコン含む）
  await page.getByRole('button', { name: /アクティビティ/ }).click()

  // 空メッセージが消えウィジェットが表示される
  await expect(page.getByText('ウィジェットを追加してください')).toHaveCount(0)
  // ウィジェット削除ボタンが出る
  await expect(page.getByTitle('ウィジェットを削除')).toBeVisible({ timeout: 5000 })
})

test('DB-5: ウィジェットの×ボタンで削除できる', async ({ page }) => {
  await loginAs(page, 'demo-editor-token')
  await page.getByRole('button', { name: /統計/ }).click()
  await expect(page.getByText('+ ウィジェット追加:')).toBeVisible({ timeout: 5000 })

  await page.getByRole('button', { name: /アクティビティ/ }).click()
  await expect(page.getByTitle('ウィジェットを削除')).toBeVisible({ timeout: 5000 })

  // ×ボタンクリックで削除
  await page.getByTitle('ウィジェットを削除').click()
  await expect(page.getByText('ウィジェットを追加してください')).toBeVisible({ timeout: 3000 })
})

test('DB-6: ウィジェット設定モーダルが開閉できる', async ({ page }) => {
  await loginAs(page, 'demo-editor-token')
  await page.getByRole('button', { name: /統計/ }).click()
  await expect(page.getByText('+ ウィジェット追加:')).toBeVisible({ timeout: 5000 })

  await page.getByRole('button', { name: /ランキング/ }).click()
  await expect(page.getByTitle('ウィジェット設定')).toBeVisible({ timeout: 5000 })

  // ギアアイコンをクリックして設定モーダルを開く
  await page.getByTitle('ウィジェット設定').click()
  await expect(page.getByText('ウィジェット設定')).toBeVisible({ timeout: 3000 })

  // キャンセルで閉じる
  await page.getByRole('button', { name: 'キャンセル' }).click()
  // モーダルが閉じた → 設定フォームが消える（モーダルヘッダーの「ウィジェット設定」テキストが消える）
  await expect(page.getByRole('button', { name: 'キャンセル' })).toHaveCount(0)
})

test('DB-7: ダッシュボードレイアウトがリロード後も保持される', async ({ page }) => {
  await loginAs(page, 'demo-editor-token')
  await page.getByRole('button', { name: /統計/ }).click()
  await expect(page.getByText('+ ウィジェット追加:')).toBeVisible({ timeout: 5000 })

  await page.getByRole('button', { name: /アクティビティ/ }).click()
  await expect(page.getByTitle('ウィジェットを削除')).toBeVisible({ timeout: 5000 })

  // 保存待ち（debounce 800ms）
  await page.waitForTimeout(1500)

  // リロード後も保持される
  await page.reload()
  await expect(page.locator('[data-node-id]').first()).toBeVisible({ timeout: 10000 })
  await loginAs(page, 'demo-editor-token')
  await page.getByRole('button', { name: /統計/ }).click()
  await expect(page.getByTitle('ウィジェットを削除')).toBeVisible({ timeout: 5000 })
})
