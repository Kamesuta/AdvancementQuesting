export type QuestStatus = 'draft' | 'proposed' | 'public' | 'hidden'

export type ConditionType = 'advancement'

export interface Condition {
  type: ConditionType
  advancementId: string
  requiredCount: number
  combineMode?: 'AND' | 'OR'
}

export type RewardType = 'item' | 'command' | 'experience' | 'permission' | 'money'

export interface ItemReward {
  type: 'item'
  itemId: string
  count: number
  nbt?: string
}

export interface CommandReward {
  type: 'command'
  command: string
  opLevel: number
}

export interface ExperienceReward {
  type: 'experience'
  amount: number
  isLevel: boolean
}

export interface PermissionReward {
  type: 'permission'
  node: string
}

export interface MoneyReward {
  type: 'money'
  amount: number
}

export type Reward = ItemReward | CommandReward | ExperienceReward | PermissionReward | MoneyReward

export interface MapPosition {
  x: number
  y: number
}

export interface CustomButton {
  label: string
  command: string
  slot: number
}

export interface Quest {
  id: number
  title: string
  description: string | null
  icon: string | null
  category: string | null
  prerequisites: number[]
  conditions: Condition[]
  rewards: Reward[]
  mapPosition: MapPosition | null
  customButtons: CustomButton[]
  status: QuestStatus
  creatorUuid: string | null
  createdAt: string
  updatedAt: string
}

export type QuestCreateInput = Omit<Quest, 'id' | 'createdAt' | 'updatedAt' | 'creatorUuid'> & {
  prerequisites: number[]
  creatorUuid?: string | null
}
export type QuestUpdateInput = Partial<QuestCreateInput>
