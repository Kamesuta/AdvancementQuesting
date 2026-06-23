import { api } from './client.js'
import type {
  LeaderboardResponse,
  TimeseriesResponse,
  RewardsStatsResponse,
  QuestsStatsResponse,
  GlobalActivityResponse,
} from '@/types/stats.js'

export const statsApi = {
  leaderboard: (metric: 'points' | 'completions' = 'points', limit = 10) => {
    const params = new URLSearchParams({ metric, limit: String(limit) })
    return api.get<LeaderboardResponse>(`/stats/leaderboard?${params}`)
  },

  timeseries: (metric: 'completions' | 'points' = 'completions', days = 30) => {
    const params = new URLSearchParams({ metric, days: String(days) })
    return api.get<TimeseriesResponse>(`/stats/timeseries?${params}`)
  },

  rewards: (limit = 20) => {
    const params = new URLSearchParams({ limit: String(limit) })
    return api.get<RewardsStatsResponse>(`/stats/rewards?${params}`)
  },

  quests: (sort: 'popular' | 'hardest' = 'popular', limit = 10) => {
    const params = new URLSearchParams({ sort, limit: String(limit) })
    return api.get<QuestsStatsResponse>(`/stats/quests?${params}`)
  },

  activity: (limit = 20) => {
    const params = new URLSearchParams({ limit: String(limit) })
    return api.get<GlobalActivityResponse>(`/stats/activity?${params}`)
  },
}
