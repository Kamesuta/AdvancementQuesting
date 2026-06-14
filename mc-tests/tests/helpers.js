import mineflayer from 'mineflayer'

const MC_HOST = process.env.MC_HOST ?? 'localhost'
const MC_PORT = parseInt(process.env.MC_PORT ?? '25599', 10)
const API_BASE = process.env.API_BASE ?? 'http://localhost:8090'

/** Mineflayer ボットを作成してスポーンするまで待つ */
export function createBot(username) {
  return new Promise((resolve, reject) => {
    const bot = mineflayer.createBot({
      host: MC_HOST,
      port: MC_PORT,
      username,
      version: '1.21.11',
      auth: 'offline',
    })
    bot.once('spawn', () => resolve(bot))
    bot.once('error', reject)
    bot.once('kicked', (reason) => reject(new Error(`kicked: ${reason}`)))
    setTimeout(() => reject(new Error('spawn timeout')), 15_000)
  })
}

/** ボットを切断して終了 */
export function quitBot(bot) {
  return new Promise((resolve) => {
    bot.once('end', resolve)
    bot.quit()
  })
}

/**
 * チャットメッセージを待ち受ける。
 * predicate が true を返した最初のメッセージを resolve する。
 */
export function waitForChat(bot, predicate, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      bot.removeListener('message', handler)
      reject(new Error(`waitForChat timeout (${timeoutMs}ms)`))
    }, timeoutMs)

    function handler(jsonMsg) {
      const text = jsonMsg.toString()
      if (predicate(text)) {
        clearTimeout(timer)
        bot.removeListener('message', handler)
        resolve(text)
      }
    }
    bot.on('message', handler)
  })
}

/** HTTP リクエストヘルパー */
export async function apiRequest(method, path, { body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = text }
  return { status: res.status, body: json }
}

export { API_BASE }
