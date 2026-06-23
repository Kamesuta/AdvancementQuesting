export type WidgetType = 'leaderboard' | 'timeseries' | 'rewards' | 'quests' | 'activity'

export interface LeaderboardConfig {
  metric: 'points' | 'completions'
  limit: number
}

export interface TimeseriesConfig {
  metric: 'completions' | 'points'
  days: number
}

export interface RewardsConfig {
  limit: number
}

export interface QuestsConfig {
  sort: 'popular' | 'hardest'
  limit: number
}

export interface ActivityConfig {
  limit: number
}

export interface DashboardWidget {
  id: string
  type: WidgetType
  config: Record<string, unknown>
  layout: { x: number; y: number; w: number; h: number }
}

export interface DashboardConfig {
  widgets: DashboardWidget[]
}

export const DEFAULT_WIDGET_CONFIGS: Record<WidgetType, Record<string, unknown>> = {
  leaderboard: { metric: 'points', limit: 10 } satisfies LeaderboardConfig,
  timeseries: { metric: 'completions', days: 30 } satisfies TimeseriesConfig,
  rewards: { limit: 10 } satisfies RewardsConfig,
  quests: { sort: 'popular', limit: 10 } satisfies QuestsConfig,
  activity: { limit: 20 } satisfies ActivityConfig,
}

export const DEFAULT_WIDGET_SIZES: Record<WidgetType, { w: number; h: number }> = {
  leaderboard: { w: 4, h: 7 },
  timeseries: { w: 8, h: 5 },
  rewards: { w: 6, h: 5 },
  quests: { w: 6, h: 5 },
  activity: { w: 4, h: 7 },
}

export const WIDGET_LABELS: Record<WidgetType, string> = {
  leaderboard: '🏆 ランキング',
  timeseries: '📈 時系列グラフ',
  rewards: '🎁 報酬集計',
  quests: '📋 クエスト統計',
  activity: '⚡ アクティビティ',
}
