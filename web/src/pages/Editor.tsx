import { useState, useRef, useEffect, useCallback } from 'react'
import { MousePointer2, Plus, ArrowRight, Trash2, Edit3, List, Settings } from 'lucide-react'
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

function ModeToast({ label, visible }: { label: string; visible: boolean }) {
  return (
    <div
      className="pointer-events-none absolute left-1/2 bottom-12 z-50 -translate-x-1/2 px-6 py-2 border-2 font-bold text-sm transition-all duration-300"
      style={{
        fontFamily: '"Courier New", Courier, monospace',
        backgroundColor: '#1a1a1a',
        color: '#d8cbb0',
        borderTopColor: '#555555',
        borderLeftColor: '#555555',
        borderBottomColor: '#C6C6C6',
        borderRightColor: '#C6C6C6',
        opacity: visible ? 1 : 0,
        transform: `translateX(-50%) translateY(${visible ? '0px' : '8px'})`,
      }}
    >
      {label}
    </div>
  )
}

export default function EditorPage() {
  const [nodes, setNodes] = useState<EditorNode[]>(INITIAL_NODES)
  const [edges, setEdges] = useState<EditorEdge[]>(INITIAL_EDGES)
  const [mode, setMode] = useState<ToolMode>('select')

  const [pan, setPan] = useState<Vec2>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<Vec2>({ x: 0, y: 0 })

  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<Vec2>({ x: 0, y: 0 })

  const [linkStartNode, setLinkStartNode] = useState<string | null>(null)
  // add_link モードでドラッグ中に指が重なっているノード (接続候補)
  const [linkHoverNode, setLinkHoverNode] = useState<string | null>(null)
  const [hoveredNode, setHoveredNode] = useState<EditorNode | null>(null)
  const [mousePos, setMousePos] = useState<Vec2>({ x: 0, y: 0 })

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [itemSelectorConfig, setItemSelectorConfig] = useState<ItemSelectorConfig | null>(null)
  const [showRewardTableModal, setShowRewardTableModal] = useState(false)
  const [editingTaskReward, setEditingTaskReward] = useState<EditingTaskReward | null>(null)

  const [toastVisible, setToastVisible] = useState(false)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  // タッチハンドラのクロージャから最新値を読めるよう ref でも保持
  const panStartRef = useRef<Vec2>({ x: 0, y: 0 })
  const panRef = useRef<Vec2>({ x: 0, y: 0 })
  const nodesRef = useRef<EditorNode[]>(INITIAL_NODES)

  const modeLabel: Record<ToolMode, string> = {
    select:     '選択 / 移動',
    add_node:   'クエスト追加',
    add_link:   '依存関係の作成',
    edit_quest: 'クエスト編集',
    delete:     '削除モード',
  }

  const changeMode = useCallback((next: ToolMode) => {
    setMode(next)
    setLinkStartNode(null)
    setToastVisible(true)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2000)
  }, [])

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
  }, [])

  // state が変わったら ref も同期
  useEffect(() => { panRef.current = pan }, [pan])
  useEffect(() => { nodesRef.current = nodes }, [nodes])

  // ---------------------------------------------------------------------------
  // エッジ操作
  // ---------------------------------------------------------------------------

  const connectNodes = useCallback((startId: string, targetId: string) => {
    if (startId === targetId) return
    setEdges((prev) => {
      const existing = prev.find(
        (e) =>
          (e.source === startId && e.target === targetId) ||
          (e.target === startId && e.source === targetId),
      )
      return existing
        ? prev.filter((e) => e.id !== existing.id)
        : [...prev, { id: `e-${Date.now()}`, source: startId, target: targetId }]
    })
    setLinkStartNode(null)
    setLinkHoverNode(null)
  }, [])

  /**
   * クライアント座標から最も近いノードIDを返す (ノード半径 24px 以内に限る)
   * タッチイベントは発生元要素に固定されるため elementFromPoint の代わりに使う
   */
  const getNodeIdNearPoint = useCallback((clientX: number, clientY: number, excludeId?: string): string | null => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return null
    const wx = clientX - rect.left - panRef.current.x
    const wy = clientY - rect.top - panRef.current.y
    const HIT_R = 30
    for (const n of nodesRef.current) {
      if (n.id === excludeId) continue
      const dx = n.x - wx
      const dy = n.y - wy
      if (dx * dx + dy * dy <= HIT_R * HIT_R) return n.id
    }
    return null
  }, [])

  // ---------------------------------------------------------------------------
  // キャンバスイベント (マウス)
  // ---------------------------------------------------------------------------

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2) {
      e.preventDefault()
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      setLinkStartNode(null)
      return
    }
    if (mode === 'select' || mode === 'edit_quest') {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    } else if (mode === 'add_node') {
      const rect = canvasRef.current!.getBoundingClientRect()
      const wx = e.clientX - rect.left - pan.x
      const wy = e.clientY - rect.top - pan.y
      setNodes((prev) => [...prev, {
        id: `node-${Date.now()}`, x: wx, y: wy,
        icon: 'stone', title: '新規クエスト', subtitle: '', description: '',
        tasks: [], rewards: [],
      }])
    } else if (mode === 'add_link') {
      // キャンバスの空白クリック → 始点リセット
      setLinkStartNode(null)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    if (isPanning) setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
    const wx = e.clientX - rect.left - pan.x
    const wy = e.clientY - rect.top - pan.y
    setMousePos({ x: wx, y: wy })
    if (draggingNode && mode === 'select') {
      setNodes((prev) => prev.map((n) =>
        n.id === draggingNode ? { ...n, x: wx - dragOffset.x, y: wy - dragOffset.y } : n,
      ))
    }
  }

  const handleMouseUp = () => {
    if (isPanning) setIsPanning(false)
    if (draggingNode) setDraggingNode(null)
  }

  // ---------------------------------------------------------------------------
  // キャンバスイベント (タッチ) — add_link は touchend のヒットテストで処理
  // ---------------------------------------------------------------------------

  const handleCanvasTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    const t = e.touches[0]
    if (mode === 'select' || mode === 'edit_quest') {
      const newStart = { x: t.clientX - panRef.current.x, y: t.clientY - panRef.current.y }
      panStartRef.current = newStart
      setPanStart(newStart)
      setIsPanning(true)
    } else if (mode === 'add_node') {
      e.preventDefault()
      const rect = canvasRef.current!.getBoundingClientRect()
      const wx = t.clientX - rect.left - panRef.current.x
      const wy = t.clientY - rect.top - panRef.current.y
      setNodes((prev) => [...prev, {
        id: `node-${Date.now()}`, x: wx, y: wy,
        icon: 'stone', title: '新規クエスト', subtitle: '', description: '',
        tasks: [], rewards: [],
      }])
    }
    // add_link はノードの touchstart/touchend で完結するため、ここでは何もしない
  }

  const handleCanvasTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1 || !canvasRef.current) return
    const t = e.touches[0]
    e.preventDefault()

    if ((mode === 'select' || mode === 'edit_quest') && isPanning) {
      setPan({ x: t.clientX - panStartRef.current.x, y: t.clientY - panStartRef.current.y })
    }

    // add_link のプレビューライン更新
    if (mode === 'add_link') {
      const rect = canvasRef.current.getBoundingClientRect()
      setMousePos({
        x: t.clientX - rect.left - panRef.current.x,
        y: t.clientY - rect.top - panRef.current.y,
      })
      // 指が重なっているノードをリアルタイムで検出して光らせる
      const hoverId = getNodeIdNearPoint(t.clientX, t.clientY, linkStartNode ?? undefined)
      setLinkHoverNode(hoverId)
    }
  }

  const handleCanvasTouchEnd = () => {
    setIsPanning(false)
    setLinkHoverNode(null)
  }

  // ---------------------------------------------------------------------------
  // ノードイベント (マウス)
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
      if (!linkStartNode) {
        setLinkStartNode(nodeId)
      } else {
        connectNodes(linkStartNode, nodeId)
      }
    } else if (mode === 'delete') {
      setNodes((prev) => prev.filter((n) => n.id !== nodeId))
      setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId))
    } else if (mode === 'edit_quest') {
      setEditingNodeId(nodeId)
    }
  }

  const handleNodeMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (draggingNode) setDraggingNode(null)
  }

  // ---------------------------------------------------------------------------
  // ノードイベント (タッチ)
  // ---------------------------------------------------------------------------

  const handleNodeTouchStart = (e: React.TouchEvent, nodeId: string) => {
    e.stopPropagation()
    if (e.touches.length !== 1) return
    const t = e.touches[0]

    if (mode === 'select') {
      // ドラッグ開始（パンは起動しない）
      const node = nodes.find((n) => n.id === nodeId)!
      const rect = canvasRef.current!.getBoundingClientRect()
      const wx = t.clientX - rect.left - panRef.current.x
      const wy = t.clientY - rect.top - panRef.current.y
      setDragOffset({ x: wx - node.x, y: wy - node.y })
      setDraggingNode(nodeId)
      setIsPanning(false)
    } else if (mode === 'add_link') {
      // プレビューラインの起点を更新
      const rect = canvasRef.current!.getBoundingClientRect()
      setMousePos({
        x: t.clientX - rect.left - panRef.current.x,
        y: t.clientY - rect.top - panRef.current.y,
      })
      if (!linkStartNode) {
        setLinkStartNode(nodeId)
      }
      // 終点判定は touchend のヒットテストで行う
    }
  }

  const handleNodeTouchMove = (e: React.TouchEvent, nodeId: string) => {
    e.stopPropagation()
    if (e.touches.length !== 1 || !canvasRef.current) return
    const t = e.touches[0]
    e.preventDefault()

    if (mode === 'select' && draggingNode === nodeId) {
      const rect = canvasRef.current.getBoundingClientRect()
      const wx = t.clientX - rect.left - panRef.current.x
      const wy = t.clientY - rect.top - panRef.current.y
      setNodes((prev) => prev.map((n) =>
        n.id === nodeId ? { ...n, x: wx - dragOffset.x, y: wy - dragOffset.y } : n,
      ))
    } else if (mode === 'add_link') {
      const rect = canvasRef.current.getBoundingClientRect()
      setMousePos({
        x: t.clientX - rect.left - panRef.current.x,
        y: t.clientY - rect.top - panRef.current.y,
      })
      // 指が重なっているノードをリアルタイムで検出して光らせる
      const hoverId = getNodeIdNearPoint(t.clientX, t.clientY, linkStartNode ?? undefined)
      setLinkHoverNode(hoverId)
    }
  }

  const handleNodeTouchEnd = (e: React.TouchEvent, nodeId: string) => {
    e.stopPropagation()

    if (mode === 'select') {
      setDraggingNode(null)
      return
    }

    if (mode === 'add_link') {
      const touch = e.changedTouches[0]
      // touchmove で追跡済みの linkHoverNode を優先、なければ離した座標でも判定
      const targetId = linkHoverNode ?? getNodeIdNearPoint(touch.clientX, touch.clientY, nodeId)
      setLinkHoverNode(null)

      if (!linkStartNode) {
        // 始点がなければ今タップしたノードを始点に
        setLinkStartNode(nodeId)
      } else if (targetId) {
        // 接続先が確定 → 接続
        connectNodes(linkStartNode, targetId)
      } else {
        // ノード外で離した → 始点リセット
        setLinkStartNode(null)
      }
      return
    }

    if (mode === 'delete') {
      setNodes((prev) => prev.filter((n) => n.id !== nodeId))
      setEdges((prev) => prev.filter((ed) => ed.source !== nodeId && ed.target !== nodeId))
      return
    }

    if (mode === 'edit_quest') {
      setEditingNodeId(nodeId)
      return
    }
  }

  // ---------------------------------------------------------------------------
  // アイテム選択の確定処理
  // ---------------------------------------------------------------------------

  const handleItemSelect = (itemType: string) => {
    const config = itemSelectorConfig
    if (!config) return
    setNodes((prev) => prev.map((n) => {
      if (n.id !== config.nodeId) return n
      if (config.type === 'quest_icon') return { ...n, icon: itemType }
      if (config.type === 'task_item') return { ...n, tasks: n.tasks.map((t) => t.id === config.taskId ? { ...t, itemType } : t) }
      return { ...n, rewards: n.rewards.map((r) => r.id === config.rewardId ? { ...r, itemType } : r) }
    }))
    setItemSelectorConfig(null)
  }

  const updateNode = (updated: EditorNode) => {
    setNodes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
  }

  // ---------------------------------------------------------------------------
  // レンダリング
  // ---------------------------------------------------------------------------

  const editingNode = editingNodeId ? nodes.find((n) => n.id === editingNodeId) : null
  const taskRewardNode = editingTaskReward ? nodes.find((n) => n.id === editingTaskReward.nodeId) : null

  return (
    <div
      className="flex-1 relative flex overflow-hidden select-none min-h-0"
      style={{ fontFamily: '"Minecraftia", "Courier New", Courier, monospace' }}
    >

      {/* ===== 左サイドバー: ツールバー ===== */}
      <div className="w-16 bg-[#8B8B8B] border-r-4 border-black p-2 flex flex-col items-center shrink-0 z-20 shadow-[inset_-2px_0_0_rgba(0,0,0,0.2)]">
        <ToolButton icon={MousePointer2} active={mode === 'select'}     onClick={() => changeMode('select')}     tooltip="選択・パン移動" />
        <ToolButton icon={Plus}          active={mode === 'add_node'}   onClick={() => changeMode('add_node')}   tooltip="クエストを追加" />
        <ToolButton icon={ArrowRight}    active={mode === 'add_link'}   onClick={() => changeMode('add_link')}   tooltip="依存関係を追加" />
        <ToolButton icon={Edit3}         active={mode === 'edit_quest'} onClick={() => changeMode('edit_quest')} tooltip="クエストを編集" />
        <ToolButton icon={Trash2}        active={mode === 'delete'}     onClick={() => changeMode('delete')}     tooltip="削除" />
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
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.15) 2px, transparent 2px),
            linear-gradient(90deg, rgba(0,0,0,0.15) 2px, transparent 2px)
          `,
          backgroundSize: '40px 40px',
          backgroundPosition: `${pan.x}px ${pan.y}px`,
          boxShadow: 'inset 0 0 50px rgba(0, 0, 0, 0.4)',
          touchAction: 'none',
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
        onTouchStart={handleCanvasTouchStart}
        onTouchMove={handleCanvasTouchMove}
        onTouchEnd={handleCanvasTouchEnd}
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
            {mode === 'add_link' && linkStartNode && (() => {
              const startNode = nodes.find((n) => n.id === linkStartNode)
              if (!startNode) return null
              return <EdgePattern source={startNode} isPreview targetPos={mousePos} />
            })()}
          </svg>

          {/* ノード — data-node-id でタッチヒットテストに使う */}
          {nodes.map((node) => (
            <div
              key={node.id}
              data-node-id={node.id}
              className={`absolute w-12 h-12 -ml-6 -mt-6 flex items-center justify-center cursor-pointer z-10 transition-transform ${
                draggingNode === node.id ? 'scale-110 z-20' : ''
              }`}
              style={{ left: node.x, top: node.y }}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              onMouseUp={(e) => handleNodeMouseUp(e)}
              onMouseEnter={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
              onTouchStart={(e) => handleNodeTouchStart(e, node.id)}
              onTouchMove={(e) => handleNodeTouchMove(e, node.id)}
              onTouchEnd={(e) => handleNodeTouchEnd(e, node.id)}
            >
              {/* ノード背景円 */}
              <div
                className={[
                  'absolute inset-0 rounded-full',
                  linkStartNode === node.id  ? 'ring-4 ring-green-500' : '',
                  linkHoverNode === node.id  ? 'ring-4 ring-yellow-300 scale-110' : '',
                  mode === 'delete'          ? 'hover:ring-4 hover:ring-red-500' : '',
                  mode === 'edit_quest'      ? 'hover:ring-4 hover:ring-yellow-400' : '',
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

        {/* ===== ツールチップ (ホバー時・デスクトップのみ) ===== */}
        {hoveredNode && !draggingNode && !isPanning && !editingNodeId && !itemSelectorConfig && !editingTaskReward && (
          <div
            className="absolute z-30 bg-black/90 border-2 border-purple-700 text-white p-3 pointer-events-none shadow-xl max-w-xs hidden sm:block"
            style={{
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

        {/* ===== モード切替トースト ===== */}
        <ModeToast label={modeLabel[mode]} visible={toastVisible} />
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
  )
}
