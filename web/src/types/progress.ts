export interface ConditionProgress {
  conditionIndex: number
  currentCount: number
  completed: boolean
}

export interface PlayerProgress {
  id: number
  playerUuid: string
  questId: string
  progress: ConditionProgress[]
  completed: boolean
  rewardClaimed: boolean
  startedAt: string
  completedAt: string | null
}
