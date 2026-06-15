import { expect, type Page } from '@playwright/test'

export const MOCK = 'http://localhost:3001'

export const EDITOR_UUID = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'
export const PLAYER_UUID = 'cccccccc-dddd-eeee-ffff-aaaaaaaaaaaa'

export const loggedInBtn  = (page: Page) => page.locator('button[title*="クリックでログアウト"]')
export const loggedOutBtn = (page: Page) => page.locator('button[title="ログイン"]')

/** /api/auth/quick でセッションをupsertしてからトークンを注入してリロード */
export async function loginAs(page: Page, token: 'demo-editor-token' | 'demo-player-token') {
  await page.request.post(`${MOCK}/api/auth/quick`, { data: { token } })
  await page.evaluate((t) => localStorage.setItem('token', t), token)
  await page.reload()
  await expect(loggedInBtn(page)).toBeVisible({ timeout: 8000 })
  if (token === 'demo-editor-token') {
    const editBtn = page.getByTitle('編集モード')
    if (await editBtn.isVisible()) await editBtn.click()
  }
}

/** ノード要素を data-node-id で取得してクリックし、クエストモーダルを開く */
export async function openQuestModal(page: Page, nodeId: string) {
  const node = page.locator(`[data-node-id="${nodeId}"]`)
  await expect(node).toBeVisible({ timeout: 5000 })
  const box = await node.boundingBox()
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await expect(page.getByPlaceholder('クエストのタイトル')).toBeVisible({ timeout: 3000 })
}

/** テスト用: 指定プレイヤー・クエストの進捗をリセット */
export async function resetProgress(page: Page) {
  await page.request.post(`${MOCK}/api/test/reset-progress`)
}

/** テスト用: 提案・proposed クエストをすべて削除 */
export async function resetProposals(page: Page) {
  await page.request.post(`${MOCK}/api/test/reset-proposals`)
}

/** テスト用: クエスト完了状態をセット (progress配列なし) */
export async function setProgress(
  page: Page,
  playerUuid: string,
  questId: number,
  opts: { completed: boolean; rewardClaimed?: boolean },
) {
  await page.request.post(`${MOCK}/api/test/set-progress`, {
    data: { playerUuid, questId, ...opts },
  })
}

/** テスト用: 条件単位の進捗をセット */
export async function setConditionProgress(
  page: Page,
  playerUuid: string,
  questId: number,
  progress: object[],
  opts: { completed?: boolean; rewardClaimed?: boolean } = {},
) {
  await page.request.post(`${MOCK}/api/test/set-condition-progress`, {
    data: { playerUuid, questId, progress, ...opts },
  })
}

/** テスト用: quest_complete SSE を発火 */
export async function notifyQuestComplete(
  page: Page,
  token: string,
  questId: number,
  questTitle: string,
  playerName = 'Editor',
) {
  await page.request.post(`${MOCK}/api/test/notify-quest-complete`, {
    data: { token, questId, questTitle, playerName },
  })
}

/** テスト用: progress_update SSE を発火 */
export async function notifyProgressUpdate(
  page: Page,
  token: string,
  questId: number,
  completed: boolean,
) {
  await page.request.post(`${MOCK}/api/test/notify-progress-update`, {
    data: { token, questId, completed },
  })
}
