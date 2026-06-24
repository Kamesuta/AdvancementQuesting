import { api } from './client.js'
import type { RankingResponse, RankingType } from '@/types/ranking.js'

export interface RankingQuery {
  type?: RankingType
  limit?: number
  around?: number
  full?: boolean
}

export const rankingApi = {
  get: (questlineId: string, questId: string, q: RankingQuery = {}) => {
    const params = new URLSearchParams()
    if (q.type) params.set('type', q.type)
    if (q.limit != null) params.set('limit', String(q.limit))
    if (q.around != null) params.set('around', String(q.around))
    if (q.full) params.set('full', 'true')
    const qs = params.toString()
    return api.get<RankingResponse>(`/quests/${questlineId}/${questId}/ranking${qs ? `?${qs}` : ''}`)
  },
}
