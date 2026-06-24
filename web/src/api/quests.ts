import { api } from './client.js'
import type { Quest, QuestCreateInput, QuestUpdateInput } from '@/types/quest.js'

export const questsApi = {
  list: (params?: { status?: string; category?: string; questlineId?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return api.get<Quest[]>(`/quests${qs ? `?${qs}` : ''}`)
  },

  get: (questlineId: string, questId: string) =>
    api.get<Quest>(`/quests/${questlineId}/${questId}`),

  create: (body: QuestCreateInput) => api.post<Quest>('/quests', body),

  update: (questlineId: string, questId: string, body: QuestUpdateInput) =>
    api.put<Quest>(`/quests/${questlineId}/${questId}`, body),

  delete: (questlineId: string, questId: string) =>
    api.delete<void>(`/quests/${questlineId}/${questId}`),
}
