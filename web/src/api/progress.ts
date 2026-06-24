import { api } from './client.js'
import type { PlayerProgress } from '@/types/progress.js'

export const progressApi = {
  list: () => api.get<PlayerProgress[]>('/progress'),

  // 任意プレイヤーの全進捗 (view-as 用・認証不要)
  listByPlayer: (playerUuid: string) =>
    api.get<PlayerProgress[]>(`/players/${playerUuid}/progress`),

  get: (questlineId: string, questId: string) =>
    api.get<PlayerProgress>(`/progress/${questlineId}/${questId}`),

  claim: (questlineId: string, questId: string) =>
    api.post<{ claimed: boolean; rewards: unknown[] }>(`/progress/${questlineId}/${questId}/claim`),

  completeCondition: (questlineId: string, questId: string, conditionId: string) =>
    api.post<{ status: string }>(`/progress/${questlineId}/${questId}/condition/${conditionId}/complete`),

  deliver: (questlineId: string, questId: string) =>
    api.post<{ delivered: Record<string, number>; failed: Record<string, number> }>(`/progress/${questlineId}/${questId}/deliver`),
}
