import { useState, useRef } from 'react'
import { MousePointer2, Plus, ArrowRight, Trash2, Edit3, Save, Settings, List } from 'lucide-react'
import type { EditorNode, EditorEdge, ToolMode, Vec2, ItemSelectorConfig, EditingTaskReward } from '@/components/editor/types.js'
import { INITIAL_NODES, INITIAL_EDGES, TASK_TYPES } from '@/components/editor/constants.js'
import { ItemIcon } from '@/components/editor/ItemIcon.js'
import { ToolButton } from '@/components/editor/ToolButton.js'
import { EdgePattern } from '@/components/editor/EdgePattern.js'
import { getDisplayText } from '@/components/editor/utils.js'
import { QuestEditorModal } from '@/components/editor/modals/QuestEditorModal.js'
import { TaskRewardEditorModal } from '@/components/editor/modals/TaskRewardEditorModal.js'
import { ItemSelectorModal } from '@/components/editor/modals/ItemSelectorModal.js'
import { RewardTableModal } from '@/components/editor/modals/RewardTableModal.js'

/**
 * クエストマップエディタのメインページ
 *
 * 状態構造:
 *   nodes / edges    — キャンバス上のクエストグラフ
 *   mode             — 現在のツールモード
 *   pan              — キャンバスのパン (スクロール) オフセット
 *   draggingNode     — ドラッグ中のノードID
 *   linkStartNode    — リンク作成の始点ノードID
 *   各種モーダル     — 編集対象を表す ID / config
 */
export default function EditorPage() {
  const [nodes, setNodes] = useState<EditorNode[]>(INITIAL_NODES)
  const [edges, setEdges] = useState<EditorEdge[]>(INITIAL_EDGES)

  const [mode, setMode] = useState<ToolMode>('select')

  // キャンバスパン状態
  const [pan, setPan] = useState<Vec2>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<Vec2>({ x: 0, y: 0 })

  // ノードドラッグ状態
  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<Vec2>({ x: 0, y: 0 })

  // リンク作成の始点
  const [linkStartNode, setLinkStartNode] = useState<string | null>(null)

  // ホバー中のノード (ツールチップ表示用)
  const [hoveredNode, setHoveredNode] = useState<EditorNode | null>(null)

  // キャンバス座標系でのマウス位置 (リンクプレビューに使用)
  const [mousePos, setMousePos] = useState<Vec2>({ x: 0, y: 0 })

  // モーダル管理
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [itemSelectorConfig, setItemSelectorConfig] = useState<ItemSelectorConfig | null>(null)
  const [showRewardTableModal, setShowRewardTableModal] = useState(false)
  const [editingTaskReward, setEditingTaskReward] = useState<EditingTaskReward | null>(null)

  const canvasRef = useRef<HTMLDivElement>(null)

  // ---------------------------------------------------------------------------
  // エッジ操作
  // ---------------------------------------------------------------------------

  /** リンク始点から targetNodeId へエッジを追加 (既存なら削除) */
  const handleLinkConnection = (targetNodeId: string) => {
    if (!linkStartNode || linkStartNode === targetNodeId) return

    const existingEdge = edges.find(
      (e) =>
        (e.source === linkStartNode && e.target === targetNodeId) ||
        (e.target === linkStartNode && e.source === targetNodeId),
    )

    if (existingEdge) {
      // 既にエッジがある場合は削除 (トグル)
      setEdges(edges.filter((e) => e.id !== existingEdge.id))
    } else {
      setEdges([...edges, { id: `e-${Date.now()}`, source: linkStartNode, target: targetNodeId }])
    }
    setLinkStartNode(null)
  }

  // ---------------------------------------------------------------------------
  // キャンバスイベント
  // ---------------------------------------------------------------------------

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // 中クリック・右クリックはパン操作
    if (e.button === 1 || e.button === 2) {
      e.preventDefault()
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      if (mode === 'add_link' && linkStartNode) setLinkStartNode(null)
      return
    }

    if (mode === 'select' || mode === 'edit_quest') {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    } else if (mode === 'add_node') {
      // キャンバス座標に変換してノードを追加
      const rect = canvasRef.current!.getBoundingClientRect()
      const wx = e.clientX - rect.left - pan.x
      const wy = e.clientY - rect.top - pan.y
      setNodes([
        ...nodes,
        {
          id: `node-${Date.now()}`,
          x: wx, y: wy,
          icon: 'stone',
          title: '新規クエスト',
          subtitle: '',
          description: '',
          tasks: [],
          rewards: [],
        },
      ])
    } else if (mode === 'add_link') {
      if (linkStartNode) setLinkStartNode(null)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()

    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
    }

    // キャンバス座標系でのマウス位置を更新 (リンクプレビュー用)
    const wx = e.clientX - rect.left - pan.x
    const wy = e.clientY - rect.top - pan.y
    setMousePos({ x: wx, y: wy })

    if (draggingNode && mode === 'select') {
      setNodes(
        nodes.map((n) =>
          n.id === draggingNode
            ? { ...n, x: wx - dragOffset.x, y: wy - dragOffset.y }
            : n,
        ),
      )
    }
  }

  const handleMouseUp = () => {
    if (isPanning) setIsPanning(false)
    if (draggingNode) setDraggingNode(null)
  }

  // ---------------------------------------------------------------------------
  // ノードイベント
  // ---------------------------------------------------------------------------

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    if (e.button === 1 || e.button === 2) return

    if (mode === 'select') {
      const node = nodes.find((n) => n.id === nodeId)!
      const rect = canvasRef.current!.getBoundingClientRect()
      const wx = e.clientX - rect.left - pan.x
      const wy = e.clientY - rect.top - pan.y
      setDragOffset({ x: wx - node.x, y: wy - node.y })
      setDraggingNode(nodeId)
    } else if (mode === 'add_link') {
      if (!linkStartNode) setLinkStartNode(nodeId)
      else handleLinkConnection(nodeId)
    } else if (mode === 'delete') {
      // ノードとそのノードに繋がる全エッジを削除
      setNodes(nodes.filter((n) => n.id !== nodeId))
      setEdges(edges.filter((e) => e.source !== nodeId && e.target !== nodeId))
    } else if (mode === 'edit_quest') {
      setEditingNodeId(nodeId)
    }
  }

  const handleNodeMouseUp = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    if (draggingNode) { setDraggingNode(null); return }
    // リンク作成の終点として確定
    if (mode === 'add_link' && linkStartNode && linkStartNode !== nodeId) {
      handleLinkConnection(nodeId)
    }
  }

  // ---------------------------------------------------------------------------
  // アイテム選択の確定処理
  // ---------------------------------------------------------------------------

  const handleItemSelect = (itemType: string) => {
    const config = itemSelectorConfig
    if (!config) return

    setNodes(
      nodes.map((n) => {
        if (n.id !== config.nodeId) return n
        if (config.type === 'quest_icon') {
          return { ...n, icon: itemType }
        } else if (config.type === 'task_item') {
          return { ...n, tasks: n.tasks.map((t) => t.id === config.taskId ? { ...t, itemType } : t) }
        } else {
          return { ...n, rewards: n.rewards.map((r) => r.id === config.rewardId ? { ...r, itemType } : r) }
        }
      }),
    )
    setItemSelectorConfig(null)
  }

  const updateNode = (updated: EditorNode) => {
    setNodes(nodes.map((n) => (n.id === updated.id ? updated : n)))
  }

  // ---------------------------------------------------------------------------
  // レンダリング
  // ---------------------------------------------------------------------------

  const editingNode = editingNodeId ? nodes.find((n) => n.id === editingNodeId) : null
  const taskRewardNode = editingTaskReward ? nodes.find((n) => n.id === editingTaskReward.nodeId) : null

  const modeLabel: Record<ToolMode, string> = {
    select:     '選択 / 移動',
    add_node:   'クエスト追加',
    add_link:   '依存関係の作成',
    edit_quest: 'クエスト編集',
    delete:     '削除モード',
  }

  return (
    <div
      className="min-h-screen bg-stone-900 flex items-center justify-center p-4 select-none"
      style={{ fontFamily: '"Minecraftia", "Courier New", Courier, monospace' }}
    >
      <div className="relative w-full max-w-5xl h-[80vh] flex shadow-2xl ring-4 ring-black">

        {/* ===== 左サイドバー: ツールバー ===== */}
        <div className="w-16 bg-[#8B8B8B] border-r-4 border-black p-2 flex flex-col items-center shrink-0 z-20 shadow-[inset_-2px_0_0_rgba(0,0,0,0.2)]">
          <ToolButton icon={MousePointer2} active={mode === 'select'}     onClick={() => setMode('select')}     tooltip="選択・パン移動" />
          <ToolButton icon={Plus}          active={mode === 'add_node'}   onClick={() => setMode('add_node')}   tooltip="クエストを追加" />
          <ToolButton icon={ArrowRight}    active={mode === 'add_link'}   onClick={() => setMode('add_link')}   tooltip="依存関係を追加" />
          <ToolButton icon={Edit3}         active={mode === 'edit_quest'} onClick={() => setMode('edit_quest')} tooltip="クエストを編集" />
          <ToolButton icon={Trash2}        active={mode === 'delete'}     onClick={() => setMode('delete')}     tooltip="削除" />
          <div className="flex-grow" />
          <ToolButton icon={List}     active={showRewardTableModal} onClick={() => setShowRewardTableModal(true)} tooltip="報酬テーブル" />
          <ToolButton icon={Settings} active={false}                onClick={() => {}}                           tooltip="設定" />
        </div>

        {/* ===== キャンバスエリア ===== */}
        <div
          ref={canvasRef}
          className={`flex-grow relative overflow-hidden ${isPanning ? 'cursor-grabbing' : 'cursor-crosshair'}`}
          style={{
            backgroundColor: '#5d6b5e',
            // グリッドをパンに追従させる
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.15) 2px, transparent 2px),
              linear-gradient(90deg, rgba(0,0,0,0.15) 2px, transparent 2px)
            `,
            backgroundSize: '40px 40px',
            backgroundPosition: `${pan.x}px ${pan.y}px`,
            boxShadow: 'inset 0 0 50px rgba(0, 0, 0, 0.4)',
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* パン変換をかけた描画レイヤー */}
          <div
            style={{ transform: `translate(${pan.x}px, ${pan.y}px)`, transformOrigin: '0 0' }}
            className="absolute inset-0 w-full h-full"
          >
            {/* エッジ (SVG レイヤー) */}
            <svg className="absolute inset-0 overflow-visible pointer-events-none z-0">
              {edges.map((edge) => {
                const src = nodes.find((n) => n.id === edge.source)
                const tgt = nodes.find((n) => n.id === edge.target)
                if (!src || !tgt) return null
                return <EdgePattern key={edge.id} source={src} target={tgt} />
              })}
              {/* リンク作成中のプレビューエッジ */}
              {mode === 'add_link' && linkStartNode && (() => {
                const startNode = nodes.find((n) => n.id === linkStartNode)
                if (!startNode) return null
                return <EdgePattern source={startNode} isPreview targetPos={mousePos} />
              })()}
            </svg>

            {/* ノード */}
            {nodes.map((node) => (
              <div
                key={node.id}
                className={`absolute w-12 h-12 -ml-6 -mt-6 flex items-center justify-center cursor-pointer z-10 transition-transform ${
                  draggingNode === node.id ? 'scale-110 z-20' : ''
                }`}
                style={{ left: node.x, top: node.y }}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onMouseUp={(e) => handleNodeMouseUp(e, node.id)}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* ノード背景円: モードに応じてリングを変化させる */}
                <div
                  className={[
                    'absolute inset-0 rounded-full',
                    linkStartNode === node.id    ? 'ring-4 ring-green-500' : '',
                    mode === 'delete'            ? 'hover:ring-4 hover:ring-red-500' : '',
                    mode === 'edit_quest'        ? 'hover:ring-4 hover:ring-yellow-400' : '',
                  ].join(' ')}
                >
                  <div className="w-full h-full bg-black/50 border-2 border-[#839384] rounded-full shadow-inner flex items-center justify-center" />
                </div>
                <div className="relative pointer-events-none">
                  <ItemIcon type={node.icon} size={28} />
                </div>
              </div>
            ))}
          </div>

          {/* ===== ツールチップ (ホバー時) ===== */}
          {hoveredNode && !draggingNode && !isPanning && !editingNodeId && !itemSelectorConfig && !editingTaskReward && (
            <div
              className="absolute z-30 bg-black/90 border-2 border-purple-700 text-white p-3 pointer-events-none shadow-xl max-w-xs"
              style={{
                // ビューポート端に寄り過ぎないようにクランプ
                left: Math.min(mousePos.x + pan.x + 20, (canvasRef.current?.offsetWidth ?? 0) - 200),
                top:  Math.min(mousePos.y + pan.y + 20, (canvasRef.current?.offsetHeight ?? 0) - 100),
              }}
            >
              <div className="font-bold text-blue-300 text-lg mb-1">{hoveredNode.title}</div>
              {hoveredNode.subtitle && (
                <div className="text-gray-400 text-xs italic mb-2">{hoveredNode.subtitle}</div>
              )}
              <div className="text-sm space-y-1">
                {hoveredNode.tasks?.map((task) => (
                  <div key={task.id} className="text-gray-300 flex items-center gap-1">
                    <span className="text-gray-500">
                      {TASK_TYPES.find((t) => t.id === task.type)?.icon ?? '•'}
                    </span>
                    {getDisplayText(task, 'task')}
                  </div>
                ))}
                {(!hoveredNode.tasks || hoveredNode.tasks.length === 0) && (
                  <div className="text-gray-500 text-xs">タスクがありません</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ===== 右サイドバー: 情報パネル ===== */}
        <div
          className="w-48 bg-[#d8cbb0] border-l-4 border-black p-4 flex flex-col shrink-0 z-20"
          style={{ boxShadow: 'inset 4px 0 10px rgba(0,0,0,0.1)' }}
        >
          <button className="w-full bg-[#C6C6C6] hover:bg-[#D6D6D6] border-t-white border-l-white border-b-[#555555] border-r-[#555555] border-2 py-2 mb-4 text-black font-bold flex items-center justify-center">
            <Save size={16} className="mr-2" /> すべて保存
          </button>

          <div className="text-sm text-[#5c4a30] space-y-2 mt-4 font-bold border-t-2 border-[#5c4a30] pt-4">
            <p>現在のモード:</p>
            <p className="bg-[#8B8B8B] text-white p-1 text-center border border-[#3B3B3B]">
              {modeLabel[mode]}
            </p>
            <p className="mt-4 text-xs opacity-80">
              [クエスト編集]<br />
              ペンアイコンを選択後、クエストをクリックして詳細を編集します。
            </p>
          </div>
        </div>

        {/* ===== モーダル群 ===== */}

        {editingNode && (
          <QuestEditorModal
            node={editingNode}
            updateNode={updateNode}
            close={() => setEditingNodeId(null)}
            openItemSelector={setItemSelectorConfig}
            openTaskRewardEditor={setEditingTaskReward}
          />
        )}

        {editingTaskReward && taskRewardNode && (
          <TaskRewardEditorModal
            node={taskRewardNode}
            category={editingTaskReward.category}
            itemId={editingTaskReward.itemId}
            updateNode={updateNode}
            close={() => setEditingTaskReward(null)}
            openItemSelector={setItemSelectorConfig}
          />
        )}

        {showRewardTableModal && (
          <RewardTableModal close={() => setShowRewardTableModal(false)} />
        )}

        {itemSelectorConfig && (
          <ItemSelectorModal
            close={() => setItemSelectorConfig(null)}
            onSelect={handleItemSelect}
          />
        )}

      </div>
    </div>
  )
}
