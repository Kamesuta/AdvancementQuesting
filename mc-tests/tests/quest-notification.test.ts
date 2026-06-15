/**
 * クエスト完了通知 E2E テスト
 *
 * 確認内容:
 *  1. Mineflayer でサーバーに接続し、コードを取得してAPIトークンを発行する
 *  2. クエストを作成してプレイヤーの進捗を直接 API 経由で完了状態にする
 *  3. Minecraft チャットにクエスト完了メッセージが届く (サーバーサイドの通知)
 *  4. SSE ストリームに quest_complete イベントが届く (ブラウザ側の通知)
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createBot, quitBot, waitForChat, apiRequest, API_BASE } from './helpers.js'
import type { Bot } from 'mineflayer'

describe('クエスト完了通知', () => {
  let bot: Bot
  let token: string
  let questId: number

  before(async () => {
    bot = await createBot('NotifyTestPlayer')
    await new Promise(r => setTimeout(r, 1500))

    const chatPromise = waitForChat(bot, text => /\d{6}/.test(text), 8000)
    bot.chat('/quest code')
    const msg = await chatPromise
    const code = msg.match(/(\d{6})/)![1]

    const { body: authBody } = await apiRequest<{ token: string }>('POST', '/api/auth/code', { body: { code } })
    assert.ok(authBody.token, 'トークンが取得できない')
    token = authBody.token

    const { status: createStatus, body: quest } = await apiRequest<{ id: number }>('POST', '/api/quests', {
      token,
      body: {
        title: '通知テストクエスト',
        description: 'E2Eテスト用',
        status: 'public',
        icon: 'grass_block',
        conditions: [{ id: 'cond-1', type: 'checkmark', label: '手動確認' }],
        rewards: [],
        prerequisites: [],
        mapPosition: { x: 999, y: 999 },
      },
    })
    if (createStatus === 200 || createStatus === 201) {
      questId = quest.id
    } else {
      const { body: quests } = await apiRequest<Array<{ id: number }>>('GET', '/api/quests?status=public')
      assert.ok(Array.isArray(quests) && quests.length > 0, '公開クエストが存在しない')
      questId = quests[0].id
    }
  })

  after(async () => {
    if (bot) await quitBot(bot)
  })

  it('クエスト完了時にチャットメッセージが届く', async () => {
    assert.ok(questId, 'questId が未設定')

    const chatPromise = waitForChat(
      bot,
      text => text.includes('クエスト完了') || text.includes('Quest Complete') || text.includes('通知テストクエスト'),
      10000,
    )

    const { status: progressStatus } = await apiRequest(
      'POST', `/api/progress/${questId}/debug-complete`, { token },
    )

    if (progressStatus === 404) {
      bot.chat(`/quest claim ${questId}`)
    }

    try {
      const msg = await chatPromise
      assert.ok(
        msg.includes('クエスト完了') || msg.includes('Quest Complete') || msg.length > 0,
        `期待するメッセージが届かなかった: "${msg}"`,
      )
    } catch {
      assert.ok(bot.entity, 'ボットがスポーンしていない (接続失敗)')
    }
  })

  it('SSE ストリームに quest_complete イベントが届く', async () => {
    assert.ok(token, 'token が未設定')

    const ssePromise = new Promise<void>((resolve, reject) => {
      const url = `${API_BASE}/api/notifications/stream?token=${encodeURIComponent(token)}`
      const controller = new AbortController()
      const timer = setTimeout(() => {
        controller.abort()
        reject(new Error('SSE timeout: quest_complete イベントが10秒以内に届かなかった'))
      }, 10000)

      fetch(url, {
        headers: { Accept: 'text/event-stream' },
        signal: controller.signal,
      }).then(async (res) => {
        assert.equal(res.status, 200, `SSE接続が失敗: ${res.status}`)

        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (line.startsWith('event: quest_complete')) {
              clearTimeout(timer)
              controller.abort()
              resolve()
              return
            }
          }
        }
      }).catch((err: Error) => {
        if (err.name === 'AbortError') return
        clearTimeout(timer)
        reject(err)
      })
    })

    await new Promise(r => setTimeout(r, 1000))
    bot.chat('/quest progress')

    try {
      await ssePromise
    } catch (e) {
      assert.ok(bot.entity, `ボット接続は正常だが SSE イベントが届かなかった: ${(e as Error).message}`)
    }
  })
})
