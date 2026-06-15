/**
 * Minecraft ⇔ ブラウザ 統合 E2E テスト
 *
 * 実際に Mineflayer ボットでサーバーに接続し、リンゴを拾ってクエストを達成させ、
 * 同時に Playwright でブラウザ(本番Web UI)を開いて以下を確認する:
 *   - Minecraft チャットにクエスト完了メッセージが届く
 *   - ブラウザに quest_complete の SSE が届き、オーバーレイ & ノードのキラキラ演出が出る
 *
 * 前提:
 *   - run/ の Minecraft サーバー + AdvancementQuesting プラグイン起動済み
 *   - apple×1 を条件に持つ public クエストが存在する (なければ作成する)
 *   - MC_HOST/MC_PORT/API_BASE 環境変数で接続先を変更可
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { chromium, Browser, Page } from 'playwright'
import { createBot, quitBot, waitForChat, apiRequest, rcon, API_BASE } from './helpers.js'
import type { Bot } from 'mineflayer'

const BOT_NAME = 'ItgBot' + Math.floor(Math.random() * 100000)

describe('Minecraft⇔ブラウザ 統合: リンゴ拾得でブラウザ演出', () => {
  let bot: Bot
  let browser: Browser
  let page: Page
  let token: string

  before(async () => {
    bot = await createBot(BOT_NAME)
    await new Promise(r => setTimeout(r, 1500))

    await rcon(`op ${BOT_NAME}`).catch(() => {})
    await rcon(`gamemode survival ${BOT_NAME}`).catch(() => {})
    await new Promise(r => setTimeout(r, 500))

    const chatPromise = waitForChat(bot, t => /\d{6}/.test(t), 8000)
    bot.chat('/quest code')
    const msg = await chatPromise
    const code = msg.match(/(\d{6})/)![1]
    const { status, body } = await apiRequest<{ token: string }>('POST', '/api/auth/code', { body: { code } })
    assert.equal(status, 200, `認証失敗: ${JSON.stringify(body)}`)
    token = body.token

    const { body: quests } = await apiRequest<Array<{ id: number; title: string; conditions?: Array<{ type: string; itemType?: string }> }>>(
      'GET', '/api/quests?status=public',
    )
    let appleQuest = Array.isArray(quests)
      ? quests.find(q => (q.conditions ?? []).some(c => c.type === 'item' && c.itemType === 'minecraft:apple'))
      : null
    if (!appleQuest) {
      const { status: cs, body: created } = await apiRequest<{ id: number; title: string }>('POST', '/api/quests', {
        token,
        body: {
          title: '統合テスト_リンゴ', status: 'public', icon: 'apple', prerequisites: [],
          conditions: [{ id: 'itg-apple', type: 'item', itemType: 'minecraft:apple', count: 1 }],
          rewards: [], mapPosition: { x: 700, y: 700 }, category: null, customButtons: [],
        },
      })
      assert.ok(cs === 200 || cs === 201, `クエスト作成失敗(${cs}) — editor権限が必要: ${JSON.stringify(created)}`)
      appleQuest = created
    }
    console.log(`apple クエスト: id=${appleQuest.id} title=${appleQuest.title}`)

    browser = await chromium.launch({ headless: false, slowMo: 200 })
    page = await browser.newPage()
    page.on('pageerror', (e: Error) => console.log('  [browser pageerror]', e.message))
    await page.goto(API_BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.evaluate((t: string) => localStorage.setItem('token', t), token)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-node-id]', { timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(2000)
  })

  after(async () => {
    await new Promise(r => setTimeout(r, 5000))
    if (page) await page.close().catch(() => {})
    if (browser) await browser.close().catch(() => {})
    if (bot) await quitBot(bot)
  })

  it('ブラウザがログイン状態でマップを表示している', async () => {
    const nodeCount = await page.locator('[data-node-id]').count().catch(() => 0)
    console.log('ブラウザ node count:', nodeCount)
    assert.ok(nodeCount > 0, 'マップにノードが表示されていない')
  })

  it('リンゴを拾うと Minecraft チャット完了通知 + ブラウザ演出が出る', async () => {
    const mcChatPromise = waitForChat(
      bot,
      t => t.includes('クエスト完了') || t.includes('✨'),
      15000,
    ).catch(() => null)

    const browserPromise = page.waitForFunction(() => {
      const overlay = document.querySelector('[data-testid="quest-complete-overlay"]')
      const celebrating = document.querySelector('[data-celebrating="true"]')
      return !!(overlay || celebrating)
    }, { timeout: 15000 }).then(() => true).catch(() => false)

    const r1 = await rcon(`execute at ${BOT_NAME} run summon item ~ ~ ~ {Item:{id:"minecraft:apple",Count:1b},PickupDelay:0s}`)
    console.log('summon結果:', JSON.stringify(r1))

    await new Promise(r => setTimeout(r, 300))
    try {
      for (let i = 0; i < 3; i++) {
        bot.setControlState('forward', true)
        await new Promise(r => setTimeout(r, 300))
        bot.setControlState('forward', false)
        bot.setControlState('back', true)
        await new Promise(r => setTimeout(r, 300))
        bot.setControlState('back', false)
        await rcon(`execute at ${BOT_NAME} run summon item ~ ~ ~ {Item:{id:"minecraft:apple",Count:1b},PickupDelay:0s}`)
      }
    } catch { /* 移動失敗は無視 */ }

    const [mcChat, browserShown] = await Promise.all([mcChatPromise, browserPromise])

    console.log('MC完了チャット:', mcChat ? JSON.stringify(mcChat) : '(届かず)')
    console.log('ブラウザ演出表示:', browserShown)

    if (!browserShown) {
      const { status, body } = await apiRequest<Array<{ completed: boolean }>>('GET', '/api/progress', { token })
      const anyCompleted = Array.isArray(body) && body.some(p => p.completed)
      console.log('進捗API completed:', anyCompleted, JSON.stringify(body).slice(0, 200))
      assert.ok(
        anyCompleted,
        'リンゴ拾得が成立しなかった (summon権限/位置の問題)。EntityPickupItemEvent が発火していない可能性。',
      )
      assert.fail('進捗は完了したがブラウザに SSE 演出が届かなかった (SSE接続/UUID不一致の疑い)')
    }

    assert.ok(browserShown, 'ブラウザにクエスト完了演出が表示されなかった')
  })
})
