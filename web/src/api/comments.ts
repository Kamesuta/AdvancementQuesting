import { api } from './client.js'
import type { EditorComment } from '@/components/editor/types.js'

export const commentsApi = {
  list: () => api.get<EditorComment[]>('/comments'),

  create: (body: Omit<EditorComment, 'id'>) => api.post<EditorComment>('/comments', body),

  update: (id: string, body: Omit<EditorComment, 'id'>) =>
    api.put<EditorComment>(`/comments/${id}`, body),

  delete: (id: string) => api.delete<void>(`/comments/${id}`),
}
