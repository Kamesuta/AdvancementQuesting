import { createContext, useContext } from 'react'
import type { PlayerSession, Role } from '@/types/auth.js'

/** editor が選択中の表示モード */
export type ViewMode = 'edit' | 'play'

interface AuthContextValue {
  me: PlayerSession | undefined
  role: Role
  isEditor: boolean
  /** editor のみ有効。'edit'=編集モード / 'play'=プレイモード */
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
}

export const AuthContext = createContext<AuthContextValue>({
  me: undefined,
  role: 'player',
  isEditor: false,
  viewMode: 'edit',
  setViewMode: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}
