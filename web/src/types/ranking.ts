export type RankingType = 'first' | 'count'

export interface RankingEntry {
  rank: number
  playerUuid: string
  playerName: string
  completedAt: string
  clears: number
  isMe?: boolean
}

export interface RankingResponse {
  type: RankingType
  questId: number
  totalPlayers: number
  top: RankingEntry[]
  around: RankingEntry[]
  me: { rank: number; clears: number; completedAt: string } | null
}
