import { api } from './client.js'

export interface QuestCandidate {
  title: string
  description: string
}

export interface QuestSuggestChatMsg {
  role: 'user' | 'assistant'
  content: string
}

export interface QuestSuggestBody {
  /** 人間可読のタスク要約 (getDisplayText の出力) */
  tasks: string[]
  /** 人間可読の報酬要約 */
  rewards: string[]
  /** 任意。リロール/再提案時のユーザーヒント履歴 */
  messages: QuestSuggestChatMsg[]
  /** 現在入力済みのクエスト名 (あれば修正案として活かす) */
  currentTitle?: string
  /** 現在入力済みの補足 */
  currentSubtitle?: string
  /** 現在入力済みの説明 */
  currentDescription?: string
}

export const aiApi = {
  /** タスク/報酬の文脈とヒントから、クエスト名+説明の候補を3件提案させる */
  suggestQuest: (body: QuestSuggestBody) =>
    api.post<{ candidates: QuestCandidate[] }>('/ai/quest-suggest', body),

  /** 現在のプロンプト (編集者全員で共有) を取得する */
  getPrompt: () => api.get<{ prompt: string }>('/ai/prompt'),

  /** プロンプトを保存する (編集者全員で共有・prompt.txt) */
  savePrompt: (prompt: string) =>
    api.put<{ prompt: string }>('/ai/prompt', { prompt }),
}
