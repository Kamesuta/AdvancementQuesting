import { api } from './client.js'
import type { Questline, QuestlineMapNode } from '@/types/questline.js'

export const questlinesApi = {
  list: () => api.get<Questline[]>('/questlines'),

  updateMap: (id: string, nodes: QuestlineMapNode[]) =>
    api.put<{ status: string; nodeCount: number }>(`/questlines/${id}/map`, { nodes }),
}
