import { api } from './client.js'
import type { Quest, QuestCreateInput, QuestUpdateInput } from '@/types/quest.js'

export const questsApi = {
  list: (params?: { status?: string; category?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return api.get<Quest[]>(`/quests${qs ? `?${qs}` : ''}`)
  },

  get: (id: number) => api.get<Quest>(`/quests/${id}`),

  create: (body: QuestCreateInput) => api.post<Quest>('/quests', body),

  update: (id: number, body: QuestUpdateInput) => api.put<Quest>(`/quests/${id}`, body),

  delete: (id: number) => api.delete<void>(`/quests/${id}`),
}
