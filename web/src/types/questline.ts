export interface QuestlineMapNode {
  questId: string
  x: number
  y: number
}

export interface Questline {
  id: string
  order: number
  title: string
  icon: string | null
  questCount: number
  nodes: QuestlineMapNode[]
}
