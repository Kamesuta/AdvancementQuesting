import type { EditorTask, EditorReward } from './types.js'
import { ITEM_TYPES, TASK_TYPES, REWARD_TYPES } from './constants.js'

/**
 * タスク/報酬の一覧行に表示するテキストを生成する
 * 種別ラベル + 内容値 の形式。checkmark だけはラベルなしで値のみ表示
 */
export function getDisplayText(
  item: EditorTask | EditorReward,
  category: 'task' | 'reward',
): string {
  const types = category === 'task' ? TASK_TYPES : REWARD_TYPES
  const def = types.find((t) => t.id === item.type)
  const prefix = def?.label ?? ''

  let detail: string
  if (item.type === 'item') {
    // itemType からアイテム名を引く。未設定なら itemType そのものをフォールバック表示
    const itemName = ITEM_TYPES[item.itemType ?? '']?.name ?? item.itemType ?? ''
    detail = item.value || itemName
  } else if (item.value) {
    detail = item.value
  } else {
    detail = item.type === 'checkmark' ? '確認する' : '未設定'
  }

  // チェックマークはプレフィックス不要
  if (item.type === 'checkmark') return detail
  return `${prefix}: ${detail}`
}
