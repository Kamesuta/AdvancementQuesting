import { X } from 'lucide-react'
import type { EditorNode, EditorTask, EditorReward, ItemSelectorConfig } from '../types.js'
import { TASK_TYPES, REWARD_TYPES } from '../constants.js'
import { ItemIcon } from '../ItemIcon.js'

interface TaskRewardEditorModalProps {
  node: EditorNode
  /** 'task' か 'reward' かでタイトルや設定項目が変わる */
  category: 'task' | 'reward'
  itemId: string
  close: () => void
  updateNode: (node: EditorNode) => void
  openItemSelector: (config: ItemSelectorConfig) => void
}

/**
 * タスク/報酬の個別設定モーダル
 * 変更はリアルタイムでノードに反映される
 */
export function TaskRewardEditorModal({
  node,
  category,
  itemId,
  close,
  updateNode,
  openItemSelector,
}: TaskRewardEditorModalProps) {
  const items = category === 'task' ? node.tasks : node.rewards
  const item = items.find((i) => i.id === itemId)

  if (!item) return null

  const types = category === 'task' ? TASK_TYPES : REWARD_TYPES
  const typeDef = types.find((t) => t.id === item.type)

  /** フィールドを部分更新してノードに反映する */
  const handleChange = (changes: Partial<EditorTask> | Partial<EditorReward>) => {
    const newItems = items.map((i) => (i.id === itemId ? { ...i, ...changes } : i))
    updateNode({
      ...node,
      [category === 'task' ? 'tasks' : 'rewards']: newItems,
    })
  }

  /** アイテム選択モーダルを正しいコンテキストで開く */
  const handleOpenItemSelector = () => {
    if (category === 'task') {
      openItemSelector({ type: 'task_item', nodeId: node.id, taskId: item.id })
    } else {
      openItemSelector({ type: 'reward_item', nodeId: node.id, rewardId: item.id })
    }
  }

  const valueLabel =
    item.type === 'command'  ? 'コマンド文字列' :
    item.type === 'item'     ? '表示名 (空でデフォルト)' :
    '内容 / 値'

  const valuePlaceholder =
    item.type === 'command'    ? '/say hello' :
    item.type === 'checkmark'  ? '確認メッセージ' :
    '値を入力...'

  return (
    <div
      className="absolute inset-0 z-[55] flex items-center justify-center bg-black/70"
      onClick={close}
    >
      <div
        className="bg-[#2d2f3b] border-2 border-[#1e1f29] w-[450px] flex flex-col p-5 shadow-2xl text-white rounded-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-5 border-b border-gray-600 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{typeDef?.icon}</span>
            <h2 className="font-bold text-lg">
              {category === 'task' ? 'タスク編集' : '報酬編集'} — {typeDef?.label}
            </h2>
          </div>
          <button onClick={close} className="text-gray-400 hover:text-red-400">
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {/* アイテム種別の場合のみアイコンピッカーを表示 */}
          {item.type === 'item' && (
            <div className="flex items-center gap-4 bg-black/20 p-3 rounded-sm border border-gray-700">
              <div
                className="cursor-pointer bg-[#1e1f29] p-3 rounded hover:bg-opacity-80 ring-1 ring-gray-500"
                onClick={handleOpenItemSelector}
                title="アイテムを変更"
              >
                <ItemIcon type={(item as EditorTask).itemType ?? 'stone'} size={40} />
              </div>
              <div className="text-sm text-gray-300">
                左のアイコンをクリックして<br />アイテムの種類を変更できます。
              </div>
            </div>
          )}

          {/* テキスト入力 */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-blue-300 font-bold uppercase tracking-wider">
              {valueLabel}
            </label>
            <input
              type="text"
              value={item.value}
              onChange={(e) => handleChange({ value: e.target.value })}
              className="bg-black/40 border border-gray-600 p-3 text-sm text-white rounded-sm outline-none focus:border-blue-500"
              placeholder={valuePlaceholder}
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={close}
            className="bg-blue-600 hover:bg-blue-500 border border-blue-700 px-6 py-2 text-sm font-bold rounded-sm shadow-md transition-colors"
          >
            完了
          </button>
        </div>
      </div>
    </div>
  )
}
