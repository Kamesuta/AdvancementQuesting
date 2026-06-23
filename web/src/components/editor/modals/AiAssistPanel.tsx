import { useState } from 'react'
import { X, Sparkles, Wand2, Send } from 'lucide-react'
import { aiApi } from '@/api/ai.js'
import type { QuestCandidate, QuestSuggestChatMsg } from '@/api/ai.js'

interface AiAssistPanelProps {
  /** タスク要約 (getDisplayText の出力) */
  tasks: string[]
  /** 報酬要約 */
  rewards: string[]
  /** カード採用時: タイトルと説明をセットで反映する */
  onAdopt: (title: string, description: string) => void
  /** パネルを閉じる */
  onClose: () => void
}

/**
 * クエスト作成補助AIパネル。
 * タスク/報酬の文脈と任意のヒント(チャット)から、クエスト名+説明の候補を3件提案する。
 * 「生成する」で初回生成、再押下でリロール、下部チャットでヒントを送ると再提案する。
 */
export function AiAssistPanel({ tasks, rewards, onAdopt, onClose }: AiAssistPanelProps) {
  const [messages, setMessages] = useState<QuestSuggestChatMsg[]>([])
  const [candidates, setCandidates] = useState<QuestCandidate[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatInput, setChatInput] = useState('')

  const generate = async (userMsg?: string) => {
    if (loading) return
    setLoading(true)
    setError(null)
    const nextMessages: QuestSuggestChatMsg[] = userMsg
      ? [...messages, { role: 'user', content: userMsg }]
      : messages
    try {
      const res = await aiApi.suggestQuest({ tasks, rewards, messages: nextMessages })
      setCandidates(res.candidates)
      // 次のリロール/再提案の文脈に使うため、提案内容を履歴に残す
      setMessages([
        ...nextMessages,
        { role: 'assistant', content: JSON.stringify({ candidates: res.candidates }) },
      ])
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const sendChat = () => {
    const text = chatInput.trim()
    if (!text || loading) return
    setChatInput('')
    void generate(text)
  }

  return (
    <div className="flex flex-col h-full text-white">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-600 shrink-0">
        <Sparkles size={18} className="text-yellow-300" />
        <span className="font-bold text-sm flex-1">AIアシスト</span>
        <button onClick={onClose} aria-label="AIパネルを閉じる" className="text-gray-400 hover:text-red-400">
          <X size={20} />
        </button>
      </div>

      {/* 本体: スクロール領域 */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-3">
        {candidates == null && !loading && (
          <div className="flex flex-col items-center gap-3 text-center py-6">
            <p className="text-xs text-gray-400 leading-relaxed">
              タスクと報酬の内容から、<br />クエスト名と説明文を提案します。
            </p>
            <button
              data-testid="ai-generate-btn"
              onClick={() => void generate()}
              className="flex items-center gap-2 px-4 py-2 border-2 font-bold text-sm rounded-sm"
              style={{
                color: '#1f1a0a',
                backgroundColor: '#E8C830',
                borderTopColor: '#F5E042',
                borderLeftColor: '#F5E042',
                borderBottomColor: '#8B7020',
                borderRightColor: '#8B7020',
                cursor: 'pointer',
              }}
            >
              <Wand2 size={16} /> 生成する
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-2 py-8 text-gray-400 text-sm" data-testid="ai-loading">
            <Sparkles size={24} className="text-yellow-300 animate-pulse" />
            <span>AIが考えています...</span>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-300 bg-red-900/30 border border-red-700 rounded-sm p-2" data-testid="ai-error">
            {error}
          </div>
        )}

        {candidates != null && !loading && candidates.map((c, i) => (
          <div
            key={i}
            data-testid="ai-card"
            className="bg-black/30 border border-gray-700 rounded-sm p-3 flex flex-col gap-2"
          >
            <div className="font-bold text-sm text-yellow-200" data-testid="ai-card-title">{c.title}</div>
            <div className="text-xs text-gray-300 leading-relaxed" data-testid="ai-card-desc">{c.description}</div>
            <button
              data-testid="ai-card-adopt"
              onClick={() => onAdopt(c.title, c.description)}
              className="self-end text-xs px-3 py-1 border font-bold rounded-sm"
              style={{ color: '#0a1f0a', backgroundColor: '#7BC67B', borderColor: '#3B7B3B', cursor: 'pointer' }}
            >
              この案を使う
            </button>
          </div>
        ))}

        {candidates != null && !loading && (
          <button
            data-testid="ai-reroll-btn"
            onClick={() => void generate('別の案を出してください')}
            className="flex items-center justify-center gap-2 text-xs text-gray-300 border border-gray-600 rounded-sm py-1.5 hover:bg-white/5"
          >
            <Wand2 size={14} /> 別の案を生成
          </button>
        )}
      </div>

      {/* 下部: チャット欄 (ヒントを送って再提案) */}
      <div className="shrink-0 mt-3 pt-2 border-t border-gray-600 flex items-end gap-2">
        <textarea
          data-testid="ai-chat-input"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendChat()
            }
          }}
          rows={2}
          placeholder="雰囲気のヒント（例: ダンジョン系、ほのぼの農業）"
          className="flex-1 bg-black/30 border border-gray-700 p-2 text-xs text-gray-200 resize-none outline-none rounded-sm focus:border-blue-500"
        />
        <button
          data-testid="ai-chat-send"
          onClick={sendChat}
          disabled={loading || !chatInput.trim()}
          aria-label="ヒントを送信"
          className="p-2 rounded-sm border border-gray-600 text-blue-300 hover:bg-white/5 disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
