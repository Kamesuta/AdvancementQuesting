import type { EditorNode, EditorEdge } from './types.js'

// ---------------------------------------------------------------------------
// アイテム定義 — アイコン描画に使う色とアイテム名のマッピング
// ---------------------------------------------------------------------------
export const ITEM_TYPES: Record<string, { name: string; color: string }> = {
  book:      { name: 'クエストブック', color: '#8B4513' },
  diamond:   { name: 'ダイヤモンド',   color: '#55FFFF' },
  stone:     { name: '石',             color: '#AAAAAA' },
  grass:     { name: '草ブロック',     color: '#55FF55' },
  wood:      { name: '原木',           color: '#5c4033' },
  apple:     { name: 'リンゴ',         color: '#FF5555' },
  chest:     { name: 'チェスト',       color: '#D2B48C' },
  gold:      { name: '金ブロック',     color: '#FFAA00' },
  emerald:   { name: 'エメラルド',     color: '#55FF55' },
  redstone:  { name: 'レッドストーン', color: '#AA0000' },
  obsidian:  { name: '黒曜石',         color: '#110b1a' },
  sword:     { name: '木の剣',         color: '#8b5a2b' },
}

// ---------------------------------------------------------------------------
// タスク種別 — クエストの達成条件として選べる種類
// ---------------------------------------------------------------------------
export const TASK_TYPES = [
  { id: 'item',        label: 'アイテム',       icon: '📦' },
  { id: 'stat',        label: '統計',           icon: '📊' },
  { id: 'kill',        label: 'エンティティ討伐', icon: '⚔️' },
  { id: 'location',    label: '場所',           icon: '📍' },
  { id: 'checkmark',   label: 'チェックマーク', icon: '✔️' },
  { id: 'advancement', label: '進捗',           icon: '🏆' },
] as const

// ---------------------------------------------------------------------------
// 報酬種別 — クエスト達成時に付与できる報酬の種類
// ---------------------------------------------------------------------------
export const REWARD_TYPES = [
  { id: 'item',        label: 'アイテム',   icon: '📦' },
  { id: 'choice',      label: '報酬選択',   icon: '🎁' },
  { id: 'random',      label: 'ランダム報酬', icon: '🎲' },
  { id: 'loot',        label: 'ルート報酬', icon: '💰' },
  { id: 'command',     label: 'コマンド',   icon: '💻' },
  { id: 'xp',          label: '経験値',     icon: '🟢' },
  { id: 'advancement', label: '進捗',       icon: '🏆' },
  { id: 'toast',       label: 'トースト',   icon: '🍞' },
] as const

// ---------------------------------------------------------------------------
// 開発用初期データ — 将来は API から取得したデータに差し替える
// ---------------------------------------------------------------------------
export const INITIAL_NODES: EditorNode[] = [
  {
    id: '1', x: 100, y: 100, icon: 'book',
    title: '基本',
    subtitle: 'すべての始まり',
    description: 'この本を手に取ったあなたは、冒険の第一歩を踏み出しました。\nまずは基本を学びましょう。',
    tasks:   [{ id: 't1', type: 'checkmark', value: '確認する' }],
    rewards: [{ id: 'r1', type: 'item', itemType: 'apple', value: '' }],
  },
  {
    id: '2', x: 250, y: 100, icon: 'diamond',
    title: 'マナ理論',
    subtitle: '高度な知識',
    description: 'ロックされたクエストです。\n前提を完了する必要があります。',
    tasks:   [{ id: 't2', type: 'item', itemType: 'diamond', value: '' }],
    rewards: [{ id: 'r2', type: 'xp', value: '100 レベル' }],
  },
  {
    id: '3', x: 250, y: 250, icon: 'stone',
    title: '石器時代',
    subtitle: '掘って、切って、壊して！',
    description: '丸石を集めてツールを作りましょう。',
    tasks:   [{ id: 't3', type: 'item', itemType: 'stone', value: '' }],
    rewards: [],
  },
  {
    id: '4', x: 400, y: 250, icon: 'chest',
    title: '収納',
    subtitle: 'アイテムの整理',
    description: 'チェストを作成してアイテムを保管します。',
    tasks:   [{ id: 't4', type: 'item', itemType: 'wood', value: '' }],
    rewards: [{ id: 'r3', type: 'choice', value: 'HV Tier' }],
  },
]

export const INITIAL_EDGES: EditorEdge[] = [
  { id: 'e1', source: '1', target: '2' },
  { id: 'e2', source: '1', target: '3' },
  { id: 'e3', source: '3', target: '4' },
]
