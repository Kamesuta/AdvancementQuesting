/**
 * 条件進捗 E2E テスト
 *
 * 確認内容:
 *  1. 原木を拾うとitem条件の進捗が更新され、クエスト完了メッセージが届く
 *  2. 条件ごとにチェックマーク(completed:true)がつく
 *  3. quest_edit uncomplete で解除すると条件進捗がリセットされる
 *  4. リセット後に再度アイテムを拾って再完了できる
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createBot, quitBot, waitForChat, apiRequest, rcon } from './helpers.js'
import type { Bot } from 'mineflayer'

const BOT_NAME = 'CondBot' + Math.floor(Math.random() * 100000)

interface ConditionProgress {
  conditionId: string
  completed: boolean
  current?: number
}

interface QuestProgress {
  completed: boolean
  progress?: ConditionProgress[]
}

/** ボット足元にアイテムをsummonして拾わせる */
async function summonAndPickup(bot: Bot, itemId: string, count = 1): Promise<void> {
  for (let i = 0; i < count; i++) {
    await rcon(`execute at ${BOT_NAME} run summon item ~ ~ ~ {Item:{id:"minecraft:${itemId}",Count:1b},PickupDelay:0s}`)
    await new Promise(r => setTimeout(r, 300))
  }
  // 少し動いて確実に拾う
  for (let i = 0; i < 3; i++) {
    bot.setControlState('forward', true)
    await new Promise(r => setTimeout(r, 200))
    bot.setControlState('forward', false)
    bot.setControlState('back', true)
    await new Promise(r => setTimeout(r, 200))
    bot.setControlState('back', false)
    if (i < count - 1) {
      await rcon(`execute at ${BOT_NAME} run summon item ~ ~ ~ {Item:{id:"minecraft:${itemId}",Count:1b},PickupDelay:0s}`)
    }
  }
}

describe('アイテム拾得 → 条件進捗 → uncomplete → 再達成', () => {
  let bot: Bot
  let token: string
  let questId: number

  before(async () => {
    bot = await createBot(BOT_NAME)
    await new Promise(r => setTimeout(r, 1500))

    await rcon(`op ${BOT_NAME}`).catch(() => {})
    await rcon(`gamemode survival ${BOT_NAME}`).catch(() => {})
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

    // oak_log×1 条件の public クエストを作成
    const { status: cs, body: created } = await apiRequest<{ id: number }>(
      'POST', '/api/quests', {
        token,
        body: {
          title: `条件テスト_oak_log_${Date.now()}`,
          status: 'public',
          icon: 'oak_log',
          prerequisites: [],
          conditions: [{ id: 'cond-log', type: 'item', itemType: 'minecraft:oak_log', count: 1 }],
          rewards: [],
          mapPosition: { x: 600, y: 600 },
          category: null,
          customButtons: [],
        },
      },
    )
    assert.ok(cs === 200 || cs === 201, `クエスト作成失敗(${cs}): ${JSON.stringify(created)}`)
    questId = created.id
    console.log(`テストクエスト作成: id=${questId}`)
  })

  after(async () => {
    if (questId && token) {
      await apiRequest('DELETE', `/api/quests/${questId}`, { token }).catch(() => {})
    }
    if (bot) await quitBot(bot)
  })

  it('1. 原木を拾うとクエスト完了チャットが届く', async () => {
    const chatPromise = waitForChat(
      bot,
      t => t.includes('クエスト完了') || t.includes('✨'),
      20000,
    ).catch(() => null)

    await summonAndPickup(bot, 'oak_log', 1)
    await new Promise(r => setTimeout(r, 500))
    await rcon(`execute at ${BOT_NAME} run summon item ~ ~ ~ {Item:{id:"minecraft:oak_log",Count:1b},PickupDelay:0s}`)
    await new Promise(r => setTimeout(r, 2000))

    const mcChat = await chatPromise
    console.log('完了チャット:', mcChat ? JSON.stringify(mcChat) : '(届かず)')

    const { status, body } = await apiRequest<QuestProgress>(`GET`, `/api/progress/${questId}`, { token })
    console.log('進捗API:', status, JSON.stringify(body))

    assert.ok(
      mcChat || (status === 200 && body.completed),
      `クエスト完了チャットが届かず、APIでも完了していない。EntityPickupItemEventが発火していない可能性。`,
    )
  })

  it('2. 条件ごとにチェックマーク(completed:true)がついている', async () => {
    const { status, body } = await apiRequest<QuestProgress>('GET', `/api/progress/${questId}`, { token })
    assert.equal(status, 200, `進捗取得失敗: ${JSON.stringify(body)}`)
    assert.ok(body.completed, 'クエストが完了状態でない')

    const condProgress = Array.isArray(body.progress)
      ? body.progress.find(p => p.conditionId === 'cond-log')
      : null
    assert.ok(condProgress, '条件 cond-log の進捗レコードがない')
    assert.ok(condProgress.completed === true, `条件のcompleted がtrueでない: ${JSON.stringify(condProgress)}`)
    console.log('条件進捗:', JSON.stringify(condProgress))
  })

  it('3. quest_edit uncomplete で条件進捗がリセットされる', async () => {
    await rcon(`quest_edit uncomplete ${BOT_NAME} ${questId}`)
    await new Promise(r => setTimeout(r, 1000))

    const { status, body } = await apiRequest<QuestProgress>('GET', `/api/progress/${questId}`, { token })
    assert.equal(status, 200, `進捗取得失敗: ${JSON.stringify(body)}`)
    assert.ok(!body.completed, 'uncomplete後もcompleted=trueのまま')

    const condProgress = Array.isArray(body.progress)
      ? body.progress.find(p => p.conditionId === 'cond-log')
      : null
    if (condProgress) {
      assert.ok(!condProgress.completed, `uncomplete後も条件completed=trueのまま: ${JSON.stringify(condProgress)}`)
    }
    console.log('uncomplete後の進捗:', JSON.stringify(body.progress))
  })

  it('4. uncomplete後に再度原木を拾って再完了できる', async () => {
    const chatPromise = waitForChat(
      bot,
      t => t.includes('クエスト完了') || t.includes('✨'),
      20000,
    ).catch(() => null)

    await summonAndPickup(bot, 'oak_log', 1)
    await new Promise(r => setTimeout(r, 500))
    await rcon(`execute at ${BOT_NAME} run summon item ~ ~ ~ {Item:{id:"minecraft:oak_log",Count:1b},PickupDelay:0s}`)
    await new Promise(r => setTimeout(r, 2000))

    const mcChat = await chatPromise
    console.log('再完了チャット:', mcChat ? JSON.stringify(mcChat) : '(届かず)')

    const { status, body } = await apiRequest<QuestProgress>('GET', `/api/progress/${questId}`, { token })
    console.log('再完了後の進捗API:', status, JSON.stringify(body))

    assert.ok(
      mcChat || (status === 200 && body.completed),
      '再度の原木拾得でクエストが再完了しなかった',
    )

    if (status === 200) {
      const condProgress = Array.isArray(body.progress)
        ? body.progress.find(p => p.conditionId === 'cond-log')
        : null
      if (condProgress) {
        assert.ok(condProgress.completed === true, `再完了後も条件completed=falseのまま: ${JSON.stringify(condProgress)}`)
      }
    }
  })
})
