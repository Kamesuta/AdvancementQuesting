import type { EditorNode, ToolMode } from '@/components/editor/types.js'

/** 提案ノード (EditorNode + 提案メタ情報) */
export interface ProposalNode extends EditorNode {
  proposalId?: number
  proposerName?: string
  votesUp?: number
  myVote?: 'up' | 'down' | null
}

export const modeLabel: Record<ToolMode, string> = {
  select:      '選択',
  move:        '移動',
  add_node:    'クエスト追加',
  add_link:    '依存関係の作成',
  delete:      '削除モード',
  add_comment: 'コメントを追加',
}

/** クリックと判定する最大移動距離 (px) */
export const CLICK_MAX_DIST = 5
