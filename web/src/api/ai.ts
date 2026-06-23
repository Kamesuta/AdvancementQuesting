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
  /** 任意。リロール/再提案時の会話履歴 */
  messages: QuestSuggestChatMsg[]
}

export const aiApi = {
  /** タスク/報酬の文脈とヒントから、クエスト名+説明の候補を3件提案させる */
  suggestQuest: (body: QuestSuggestBody) =>
    api.post<{ candidates: QuestCandidate[] }>('/ai/quest-suggest', body),
}
