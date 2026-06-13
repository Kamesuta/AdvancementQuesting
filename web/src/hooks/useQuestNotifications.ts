import { useEffect, useRef } from 'react'

export interface QuestCompleteEvent {
  questId: number
  questTitle: string
  playerUuid: string
  playerName: string
}

export interface ProgressUpdateEvent {
  questId: number
  completed: boolean
  playerUuid: string
}

interface Handlers {
  /** 達成通知（演出あり） */
  onQuestComplete: (event: QuestCompleteEvent) => void
  /** 進捗変化通知（演出なし・達成済み表示の即時更新用） */
  onProgressUpdate?: (event: ProgressUpdateEvent) => void
}

/**
 * SSE でクエスト完了 / 進捗変化通知を購読する。
 * @param handlers 各イベントのコールバック
 * @param authKey ログイン状態が変わると再接続するためのキー (例: playerUuid)。
 *                これが変わると EventSource を張り直す。
 */
export function useQuestNotifications(
  handlers: Handlers,
  authKey?: string | null,
) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const url = `/api/notifications/stream?token=${encodeURIComponent(token)}`
    const es = new EventSource(url)

    es.addEventListener('quest_complete', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as QuestCompleteEvent
        handlersRef.current.onQuestComplete(data)
      } catch {
        // ignore parse errors
      }
    })

    es.addEventListener('progress_update', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as ProgressUpdateEvent
        handlersRef.current.onProgressUpdate?.(data)
      } catch {
        // ignore parse errors
      }
    })

    es.onerror = () => {
      // EventSource reconnects automatically
    }

    return () => {
      es.close()
    }
    // authKey が変わる (= ログイン/ログアウト) と接続を張り直す
  }, [authKey])
}
