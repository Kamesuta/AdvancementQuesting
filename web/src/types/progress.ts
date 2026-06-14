export interface ConditionProgress {
  conditionId: string
  current?: number
  required?: number
  completed: boolean
}

export interface PlayerProgress {
  id: number
  playerUuid: string
  questId: number
  progress: ConditionProgress[]
  completed: boolean
  rewardClaimed: boolean
  startedAt: string
  completedAt: string | null
}
