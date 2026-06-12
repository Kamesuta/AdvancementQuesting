import { api } from './client.js'
import type { AuthCodeRequest, AuthCodeResponse, PlayerSession } from '@/types/auth.js'

export const authApi = {
  loginWithCode: (body: AuthCodeRequest) =>
    api.post<AuthCodeResponse>('/auth/code', body),

  loginWithQuickToken: (token: string) =>
    api.post<AuthCodeResponse>('/auth/quick', { token }),

  me: () => api.get<PlayerSession>('/auth/me'),

  logout: () => api.delete<void>('/auth/logout'),
}
