export interface LeaderboardEntry {
  rank: number
  playerUuid: string
  playerName: string
  value: number
}

export interface LeaderboardResponse {
  metric: string
  entries: LeaderboardEntry[]
}

export interface TimeseriesPoint {
  date: string
  value: number
}

export interface TimeseriesResponse {
  metric: string
  days: number
  data: TimeseriesPoint[]
}

export interface RewardAggEntry {
  rewardType: string
  rewardLabel: string | null
  totalAmount: number
  claimCount: number
}

export type RewardsStatsResponse = RewardAggEntry[]

export interface QuestStatEntry {
  questId: number
  questTitle: string
  questIcon: string
  completionCount: number
  uniquePlayers: number
}

export type QuestsStatsResponse = QuestStatEntry[]

export interface GlobalActivityItem {
  id: number
  playerUuid: string
  playerName: string
  questId: number
  questTitle: string
  questIcon: string
  completedAt: string
}

export type GlobalActivityResponse = GlobalActivityItem[]
