import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import type { EditorNode, ItemSelectorConfig, EditingTaskReward } from '../types.js'
import { TASK_TYPES, REWARD_TYPES } from '../constants.js'
import { ItemIcon } from '../ItemIcon.js'
import { getDisplayText } from '../utils.js'

interface QuestEditorModalProps {
  node: EditorNode
  updateNode: (node: EditorNode) => void
  close: () => void
  openItemSelector: (config: ItemSelectorConfig) => void
  openTaskRewardEditor: (config: EditingTaskReward) => void
}

/**
 * クエストの詳細編集モーダル
 * タイトル・サブタイトル・説明文・タスク・報酬をまとめて編集できる
 */
export function QuestEditorModal({
  node,
  updateNode,
  close,
  openItemSelector,
  openTaskRewardEditor,
}: QuestEditorModalProps) {
  const [showTaskMenu, setShowTaskMenu] = useState(false)
  const [showRewardMenu, setShowRewardMenu] = useState(false)

  const addTask = (type: string) => {
    const newTask = {
      id: `t-${Date.now()}`,
      type,
      value: type === 'checkmark' ? '確認する' : '',
      ...(type === 'item' ? { itemType: 'stone' } : {}),
    }
    updateNode({ ...node, tasks: [...(node.tasks ?? []), newTask] })
    setShowTaskMenu(false)
    // 追加直後に詳細編集を開く
    openTaskRewardEditor({ nodeId: node.id, category: 'task', itemId: newTask.id })
  }

  const removeTask = (id: string) => {
    updateNode({ ...node, tasks: node.tasks.filter((t) => t.id !== id) })
  }

  const addReward = (type: string) => {
    const newReward = {
      id: `r-${Date.now()}`,
      type,
      value: '',
      ...(type === 'item' ? { itemType: 'stone' } : {}),
    }
    updateNode({ ...node, rewards: [...(node.rewards ?? []), newReward] })
    setShowRewardMenu(false)
    openTaskRewardEditor({ nodeId: node.id, category: 'reward', itemId: newReward.id })
  }

  const removeReward = (id: string) => {
    updateNode({ ...node, rewards: node.rewards.filter((r) => r.id !== id) })
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70" onClick={close}>
      <div
        className="bg-[#2d2f3b] border-2 border-[#1e1f29] w-[800px] h-[650px] flex flex-col p-4 shadow-2xl text-white rounded-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー: アイコン + タイトル */}
        <div className="flex items-center gap-3 mb-4 pb-2 border-b border-gray-600">
          <div
            className="cursor-pointer bg-black/30 p-2 rounded hover:bg-black/50 ring-1 ring-gray-600"
            onClick={() => openItemSelector({ type: 'quest_icon', nodeId: node.id })}
            title="アイコンを変更"
          >
            <ItemIcon type={node.icon} size={32} />
          </div>
          <input
            type="text"
            value={node.title}
            onChange={(e) => updateNode({ ...node, title: e.target.value })}
            className="flex-1 bg-transparent text-2xl font-bold border-b border-transparent focus:border-blue-400 outline-none placeholder-gray-500"
            placeholder="クエストのタイトル"
          />
          <button onClick={close} className="text-gray-400 hover:text-red-400">
            <X size={28} />
          </button>
        </div>

        {/* 中段: タスク列 / 報酬列 */}
        <div className="flex gap-4 mb-4 h-64">
          {/* タスク列 */}
          <div className="flex-1 flex flex-col bg-black/20 border border-gray-700 rounded-sm">
            <div className="flex justify-between items-center bg-[#1e1f29] p-2 border-b border-gray-700">
              <span className="font-bold text-sm text-blue-300">タスク</span>
              <div className="relative">
                <button
                  onClick={() => { setShowTaskMenu(!showTaskMenu); setShowRewardMenu(false) }}
                  className="hover:bg-white/10 p-1 rounded"
                >
                  <Plus size={18} className="text-green-400" />
                </button>
                {showTaskMenu && (
                  <div className="absolute top-full right-0 mt-1 bg-[#1e1f29] border border-gray-600 p-1 z-50 shadow-xl min-w-[180px] rounded-sm">
                    {TASK_TYPES.map((t) => (
                      <div
                        key={t.id}
                        className="px-3 py-2 hover:bg-blue-600 cursor-pointer text-sm flex items-center gap-3"
                        onClick={() => addTask(t.id)}
                      >
                        <span className="text-lg">{t.icon}</span> {t.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {node.tasks?.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-2 hover:bg-white/5 group bg-black/30 rounded-sm border border-transparent hover:border-gray-500 cursor-pointer transition-colors"
                  onClick={() => openTaskRewardEditor({ nodeId: node.id, category: 'task', itemId: task.id })}
                >
                  <div className="shrink-0">
                    {task.type === 'item' ? (
                      <ItemIcon type={task.itemType ?? 'stone'} size={24} />
                    ) : (
                      <span className="text-xl w-6 text-center block">
                        {TASK_TYPES.find((t) => t.id === task.type)?.icon}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 text-sm text-gray-200 truncate font-semibold">
                    {getDisplayText(task, 'task')}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeTask(task.id) }}
                    className="hidden group-hover:block text-red-400 hover:text-red-300 p-1"
                    title="削除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 報酬列 */}
          <div className="flex-1 flex flex-col bg-black/20 border border-gray-700 rounded-sm">
            <div className="flex justify-between items-center bg-[#1e1f29] p-2 border-b border-gray-700">
              <span className="font-bold text-sm text-yellow-300">報酬</span>
              <div className="relative">
                <button
                  onClick={() => { setShowRewardMenu(!showRewardMenu); setShowTaskMenu(false) }}
                  className="hover:bg-white/10 p-1 rounded"
                >
                  <Plus size={18} className="text-green-400" />
                </button>
                {showRewardMenu && (
                  <div className="absolute top-full right-0 mt-1 bg-[#1e1f29] border border-gray-600 p-1 z-50 shadow-xl min-w-[180px] rounded-sm">
                    {REWARD_TYPES.map((r) => (
                      <div
                        key={r.id}
                        className="px-3 py-2 hover:bg-blue-600 cursor-pointer text-sm flex items-center gap-3"
                        onClick={() => addReward(r.id)}
                      >
                        <span className="text-lg">{r.icon}</span> {r.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {node.rewards?.map((reward) => (
                <div
                  key={reward.id}
                  className="flex items-center gap-3 p-2 hover:bg-white/5 group bg-black/30 rounded-sm border border-transparent hover:border-gray-500 cursor-pointer transition-colors"
                  onClick={() => openTaskRewardEditor({ nodeId: node.id, category: 'reward', itemId: reward.id })}
                >
                  <div className="shrink-0">
                    {reward.type === 'item' ? (
                      <ItemIcon type={reward.itemType ?? 'stone'} size={24} />
                    ) : (
                      <span className="text-xl w-6 text-center block">
                        {REWARD_TYPES.find((r) => r.id === reward.type)?.icon}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 text-sm text-gray-200 truncate font-semibold">
                    {getDisplayText(reward, 'reward')}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeReward(reward.id) }}
                    className="hidden group-hover:block text-red-400 hover:text-red-300 p-1"
                    title="削除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 下段: サブタイトル + 説明文 */}
        <div className="flex flex-col gap-3 flex-1">
          <input
            type="text"
            value={node.subtitle}
            onChange={(e) => updateNode({ ...node, subtitle: e.target.value })}
            className="w-full bg-transparent text-gray-400 text-sm italic text-center outline-none border-b border-transparent focus:border-gray-600 placeholder-gray-600"
            placeholder="補足説明を入力 (例: 掘って、切って、壊して！)"
          />
          <textarea
            value={node.description}
            onChange={(e) => updateNode({ ...node, description: e.target.value })}
            className="w-full flex-1 min-h-[150px] bg-black/30 border border-gray-700 p-3 text-sm text-gray-200 resize-none outline-none focus:border-blue-500 rounded-sm leading-relaxed"
            placeholder="クエストの詳細な説明を入力してください..."
          />
        </div>
      </div>
    </div>
  )
}
