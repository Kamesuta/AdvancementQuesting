/**
 * スコアボード条件達成 E2E テスト
 *
 * 確認内容:
 *  SB-1: スコアボードスコアが必要値以上になると scoreboard 条件が完了する
 *  SB-2: 完了後に /api/progress/{questId} で completed: true になる
 *
 * 前提:
 *  - run/ の Minecraft サーバー + AdvancementQuesting プラグイン起動済み
 *  - MC_HOST / MC_PORT / API_BASE 環境変数で接続先を変更できる
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createBot, quitBot, waitForChat, apiRequest, rcon } from './helpers.js'
import type { Bot } from 'mineflayer'

const BOT_NAME = 'SbBot' + Math.floor(Math.random() * 100000)

const OBJECTIVE = `test_sb_${Date.now()}`
const REQUIRED_SCORE = 10

interface QuestProgress {
  completed: boolean
  progress?: Array<{ conditionId: string; completed: boolean }>
}

describe('スコアボード条件達成', () => {
  let bot: Bot
  let token: string
  let questId: number

  before(async () => {
    bot = await createBot(BOT_NAME)
    await new Promise(r => setTimeout(r, 1500))

    await rcon(`op ${BOT_NAME}`).catch(() => {})
    await new Promise(r => setTimeout(r, 500))

    // トークン取得
    const chatPromise = waitForChat(bot, t => /\d{6}/.test(t), 8000)
    bot.chat('/quest code')
    const msg = await chatPromise
    const code = msg.match(/(\d{6})/)![1]
    const { status, body } = await apiRequest<{ token: string; playerUuid: string }>(
      'POST', '/api/auth/code', { body: { code } },
    )
    assert.equal(status, 200, `認証失敗: ${JSON.stringify(body)}`)
    token = body.token

    // スコアボード scoreboard 条件クエストを作成
    const condId = `cond-sb-${Date.now()}`
    const { status: cs, body: created } = await apiRequest<{ id: number }>(
      'POST', '/api/quests', {
        token,
        body: {
          title: `スコアボードテスト_${Date.now()}`,
          status: 'public',
          icon: 'paper',
          prerequisites: [],
          conditions: [{
            id: condId,
            type: 'scoreboard',
            objective: OBJECTIVE,
            score: REQUIRED_SCORE,
          }],
          rewards: [],
          mapPosition: { x: 800, y: 700 },
          category: null,
          customButtons: [],
        },
      },
    )
    assert.ok(cs === 200 || cs === 201, `クエスト作成失敗(${cs}): ${JSON.stringify(created)}`)
    questId = created.id
    console.log(`テストクエスト作成: id=${questId}, objective=${OBJECTIVE}, score>=${REQUIRED_SCORE}`)

    // スコアボードオブジェクティブを作成
    await rcon(`scoreboard objectives add ${OBJECTIVE} dummy "テスト"`).catch(() => {})
    await new Promise(r => setTimeout(r, 500))
  })

  after(async () => {
    if (questId && token) {
      await apiRequest('DELETE', `/api/quests/${questId}`, { token }).catch(() => {})
    }
    await rcon(`scoreboard objectives remove ${OBJECTIVE}`).catch(() => {})
    if (bot) await quitBot(bot)
  })

  it('SB-1: スコアが必要値以上になると scoreboard 条件が完了する', async () => {
    // クエスト完了チャットを待ち受ける
    const chatPromise = waitForChat(
      bot,
      t => t.includes('クエスト完了') || t.includes('✨'),
      15000,
    ).catch(() => null)

    // スコアを必要値以上に設定
    await rcon(`scoreboard players set ${BOT_NAME} ${OBJECTIVE} ${REQUIRED_SCORE}`)
    await new Promise(r => setTimeout(r, 3000))

    const mcChat = await chatPromise
    console.log('完了チャット:', mcChat ? JSON.stringify(mcChat) : '(届かず)')

    const { status, body } = await apiRequest<QuestProgress>('GET', `/api/progress/${questId}`, { token })
    console.log('進捗API:', status, JSON.stringify(body))

    assert.ok(
      mcChat || (status === 200 && body.completed),
      `スコアボード達成チャットが届かず、APIでも完了していない。ScoreSetEvent が発火していない可能性。`,
    )
  })

  it('SB-2: 完了後に API で completed: true が確認できる', async () => {
    const { status, body } = await apiRequest<QuestProgress>('GET', `/api/progress/${questId}`, { token })
    assert.equal(status, 200, `進捗取得失敗: ${JSON.stringify(body)}`)
    assert.ok(body.completed, `クエストが完了状態でない: ${JSON.stringify(body)}`)

    if (Array.isArray(body.progress) && body.progress.length > 0) {
      const cond = body.progress[0]
      assert.ok(cond.completed, `条件 completed がtrueでない: ${JSON.stringify(cond)}`)
    }
    console.log('進捗:', JSON.stringify(body))
  })
})
