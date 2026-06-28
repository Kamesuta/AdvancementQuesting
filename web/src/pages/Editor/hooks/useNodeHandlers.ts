import type React from 'react'
import type { EditorNode, EditorEdge, ToolMode, Vec2, ItemSelectorConfig } from '@/components/editor/types.js'
import type { ProposalNode } from '../types.js'
import { CLICK_MAX_DIST } from '../types.js'

interface UseNodeHandlersParams {
  mode: ToolMode
  pan: Vec2
  draggingNode: string | null
  dragOffset: Vec2
  linkStartNode: string | null
  linkHoverNode: string | null
  nodes: EditorNode[]
  proposalNodes: EditorNode[]
  otherProposalNodes: ProposalNode[]
  mouseDownPos: React.MutableRefObject<Vec2 | null>
  mouseDownNodeId: React.MutableRefObject<{ nodeId: string; isProposal: boolean } | null>
  longPressTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  longPressActiveRef: React.MutableRefObject<boolean>
  modeRef: React.MutableRefObject<ToolMode>
  canvasRef: React.RefObject<HTMLDivElement | null>
  panRef: React.MutableRefObject<Vec2>
  nodesRef: React.MutableRefObject<EditorNode[]>
  proposalNodesRef: React.MutableRefObject<EditorNode[]>
  proposalMode: boolean
  isEditor: boolean
  itemSelectorConfig: ItemSelectorConfig | null
  canMoveNode: (nodeId: string) => boolean
  canDeleteNode: (nodeId: string) => boolean
  isProposalDraft: (nodeId: string) => boolean
  connectNodes: (startId: string, targetId: string) => void
  openNode: (nodeId: string, isOtherProposal: boolean) => void
  getNodeIdNearPoint: (clientX: number, clientY: number, excludeId?: string) => string | null
  setDraggingNode: React.Dispatch<React.SetStateAction<string | null>>
  setDragOffset: React.Dispatch<React.SetStateAction<Vec2>>
  setIsPanning: React.Dispatch<React.SetStateAction<boolean>>
  setLinkStartNode: React.Dispatch<React.SetStateAction<string | null>>
  setLinkHoverNode: React.Dispatch<React.SetStateAction<string | null>>
  setMousePos: React.Dispatch<React.SetStateAction<Vec2>>
  setLongPressPopover: React.Dispatch<React.SetStateAction<{ node: EditorNode; x: number; y: number } | null>>
  setNodes: React.Dispatch<React.SetStateAction<EditorNode[]>>
  setEdges: React.Dispatch<React.SetStateAction<EditorEdge[]>>
  setProposalNodes: React.Dispatch<React.SetStateAction<EditorNode[]>>
  setProposalEdges: React.Dispatch<React.SetStateAction<EditorEdge[]>>
  setMyProposalEdits: React.Dispatch<React.SetStateAction<Map<number, EditorNode>>>
  setItemSelectorConfig: React.Dispatch<React.SetStateAction<ItemSelectorConfig | null>>
}

export function useNodeHandlers({
  mode, pan, draggingNode, dragOffset, linkStartNode, linkHoverNode,
  nodes, proposalNodes, otherProposalNodes,
  mouseDownPos, mouseDownNodeId, longPressTimerRef, longPressActiveRef, modeRef,
  canvasRef, panRef, nodesRef, proposalNodesRef,
  proposalMode, isEditor, itemSelectorConfig,
  canMoveNode, canDeleteNode, isProposalDraft, connectNodes, openNode, getNodeIdNearPoint,
  setDraggingNode, setDragOffset, setIsPanning, setLinkStartNode, setLinkHoverNode, setMousePos,
  setLongPressPopover, setNodes, setEdges, setProposalNodes, setProposalEdges, setMyProposalEdits,
  setItemSelectorConfig,
}: UseNodeHandlersParams) {
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string, isOtherProposal = false) => {
    e.stopPropagation()
    if (e.button === 1 || e.button === 2) return

    mouseDownPos.current = { x: e.clientX, y: e.clientY }
    mouseDownNodeId.current = { nodeId, isProposal: isOtherProposal }

    if (mode === 'move' && canMoveNode(nodeId)) {
      const node = [...nodes, ...proposalNodes, ...otherProposalNodes].find((n) => n.id === nodeId)!
      const rect = canvasRef.current!.getBoundingClientRect()
      const wx = e.clientX - rect.left - pan.x
      const wy = e.clientY - rect.top - pan.y
      setDragOffset({ x: wx - node.x, y: wy - node.y })
      setDraggingNode(nodeId)
      setIsPanning(false)
      if (nodeId.startsWith('existing-proposal-')) {
        const proposalId = parseInt(nodeId.replace('existing-proposal-', ''), 10)
        setMyProposalEdits((prev) => {
          if (prev.has(proposalId)) return prev
          const next = new Map(prev)
          next.set(proposalId, node)
          return next
        })
      }
    } else if (mode === 'add_link') {
      if (!linkStartNode) setLinkStartNode(nodeId)
      else connectNodes(linkStartNode, nodeId)
    } else if (mode === 'delete' && canDeleteNode(nodeId)) {
      if (isOtherProposal) return
      if (isProposalDraft(nodeId)) {
        setProposalNodes((prev) => prev.filter((n) => n.id !== nodeId))
        setProposalEdges((prev) => prev.filter((ed) => ed.source !== nodeId && ed.target !== nodeId))
      } else {
        setNodes((prev) => prev.filter((n) => n.id !== nodeId))
        setEdges((prev) => prev.filter((ed) => ed.source !== nodeId && ed.target !== nodeId))
      }
    }
  }

  const handleNodeMouseUp = (e: React.MouseEvent) => {
    if (draggingNode) { e.stopPropagation(); setDraggingNode(null) }
  }

  const handleNodeTouchStart = (e: React.TouchEvent, nodeId: string, isOtherProposal = false) => {
    e.stopPropagation()
    if (e.touches.length !== 1) return
    const t = e.touches[0]

    mouseDownPos.current = { x: t.clientX, y: t.clientY }
    mouseDownNodeId.current = { nodeId, isProposal: isOtherProposal }

    setLongPressPopover(null)
    longPressActiveRef.current = false
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    if (mode === 'select') {
      const lpNode = [...nodesRef.current, ...proposalNodesRef.current, ...otherProposalNodes].find((n) => n.id === nodeId) ?? null
      if (lpNode && (lpNode.rewards?.length ?? 0) > 0) {
        longPressTimerRef.current = setTimeout(() => {
          longPressActiveRef.current = true
          longPressTimerRef.current = null
          setLongPressPopover({ node: lpNode, x: t.clientX, y: t.clientY })
        }, 500)
      }
    }

    if (mode === 'move' && canMoveNode(nodeId)) {
      const node = [...nodesRef.current, ...proposalNodesRef.current, ...otherProposalNodes].find((n) => n.id === nodeId)!
      const rect = canvasRef.current!.getBoundingClientRect()
      const wx = t.clientX - rect.left - panRef.current.x
      const wy = t.clientY - rect.top - panRef.current.y
      setDragOffset({ x: wx - node.x, y: wy - node.y })
      setDraggingNode(nodeId)
      setIsPanning(false)
      if (nodeId.startsWith('existing-proposal-')) {
        const proposalId = parseInt(nodeId.replace('existing-proposal-', ''), 10)
        setMyProposalEdits((prev) => {
          if (prev.has(proposalId)) return prev
          const next = new Map(prev)
          next.set(proposalId, node)
          return next
        })
      }
    } else if (mode === 'add_link') {
      const rect = canvasRef.current!.getBoundingClientRect()
      setMousePos({ x: t.clientX - rect.left - panRef.current.x, y: t.clientY - rect.top - panRef.current.y })
      if (!linkStartNode) setLinkStartNode(nodeId)
    }
  }

  const handleNodeTouchMove = (e: React.TouchEvent, nodeId: string) => {
    e.stopPropagation()
    if (e.touches.length !== 1 || !canvasRef.current) return
    const t = e.touches[0]
    e.preventDefault()

    if (longPressTimerRef.current && mouseDownPos.current) {
      const dx = t.clientX - mouseDownPos.current.x
      const dy = t.clientY - mouseDownPos.current.y
      if (dx * dx + dy * dy > CLICK_MAX_DIST * CLICK_MAX_DIST) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
    }

    if (mode === 'move' && draggingNode === nodeId && canMoveNode(nodeId)) {
      const rect = canvasRef.current.getBoundingClientRect()
      const wx = t.clientX - rect.left - panRef.current.x
      const wy = t.clientY - rect.top - panRef.current.y
      const tx = wx - dragOffset.x
      const ty = wy - dragOffset.y
      if (proposalMode && isProposalDraft(nodeId)) {
        setProposalNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, x: tx, y: ty } : n))
      } else if (nodeId.startsWith('existing-proposal-')) {
        const proposalId = parseInt(nodeId.replace('existing-proposal-', ''), 10)
        setMyProposalEdits((prev) => {
          const current = prev.get(proposalId) ?? otherProposalNodes.find((n) => n.id === nodeId)
          if (!current) return prev
          const next = new Map(prev)
          next.set(proposalId, { ...current, x: tx, y: ty })
          return next
        })
      } else if (isEditor) {
        setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, x: tx, y: ty } : n))
      }
    } else if (mode === 'add_link') {
      const rect = canvasRef.current.getBoundingClientRect()
      setMousePos({ x: t.clientX - rect.left - panRef.current.x, y: t.clientY - rect.top - panRef.current.y })
      const hoverId = getNodeIdNearPoint(t.clientX, t.clientY, linkStartNode ?? undefined)
      setLinkHoverNode(hoverId)
    }
  }

  const handleNodeTouchEnd = (e: React.TouchEvent, nodeId: string, isOtherProposal = false) => {
    e.stopPropagation()

    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null }

    if (mode === 'move') {
      setDraggingNode(null)
      mouseDownPos.current = null
      mouseDownNodeId.current = null
      return
    }

    if (mode === 'add_link') {
      const touch = e.changedTouches[0]
      const targetId = linkHoverNode ?? getNodeIdNearPoint(touch.clientX, touch.clientY, nodeId)
      setLinkHoverNode(null)
      if (!linkStartNode) {
        setLinkStartNode(nodeId)
      } else if (targetId) {
        connectNodes(linkStartNode, targetId)
      } else {
        setLinkStartNode(null)
      }
      mouseDownPos.current = null
      mouseDownNodeId.current = null
      return
    }

    if (mode === 'delete' && canDeleteNode(nodeId) && !isOtherProposal) {
      if (isProposalDraft(nodeId)) {
        setProposalNodes((prev) => prev.filter((n) => n.id !== nodeId))
        setProposalEdges((prev) => prev.filter((ed) => ed.source !== nodeId && ed.target !== nodeId))
      } else {
        setNodes((prev) => prev.filter((n) => n.id !== nodeId))
        setEdges((prev) => prev.filter((ed) => ed.source !== nodeId && ed.target !== nodeId))
      }
      mouseDownPos.current = null
      mouseDownNodeId.current = null
      return
    }

    if (modeRef.current === 'select' && mouseDownPos.current) {
      const touch = e.changedTouches[0]
      const dx = touch.clientX - mouseDownPos.current.x
      const dy = touch.clientY - mouseDownPos.current.y
      if (dx * dx + dy * dy <= CLICK_MAX_DIST * CLICK_MAX_DIST) {
        if (longPressActiveRef.current) {
          longPressActiveRef.current = false
        } else {
          openNode(nodeId, isOtherProposal)
        }
      }
    }
    mouseDownPos.current = null
    mouseDownNodeId.current = null
  }

  const handleItemSelect = (itemType: string) => {
    const config = itemSelectorConfig
    if (!config) return
    const apply = (n: EditorNode): EditorNode => {
      if (n.id !== config.nodeId) return n
      if (config.type === 'quest_icon') return { ...n, icon: itemType }
      if (config.type === 'task_item') return { ...n, icon: itemType, tasks: n.tasks.map((t) => t.id === config.taskId ? { ...t, itemType } : t) }
      if (config.type === 'reward_item') return { ...n, rewards: n.rewards.map((r) => r.id === config.rewardId ? { ...r, itemType } : r) }
      return n
    }
    setNodes((prev) => prev.map(apply))
    setProposalNodes((prev) => prev.map(apply))
    if (config.nodeId.startsWith('existing-proposal-')) {
      const proposalId = parseInt(config.nodeId.replace('existing-proposal-', ''), 10)
      setMyProposalEdits((prev) => {
        const current = prev.get(proposalId) ?? otherProposalNodes.find((n) => n.id === config.nodeId)
        if (!current) return prev
        const next = new Map(prev)
        next.set(proposalId, apply(current))
        return next
      })
    }
    setItemSelectorConfig(null)
  }

  const updateNode = (updated: EditorNode) => {
    setNodes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
    setProposalNodes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
    if (updated.id.startsWith('existing-proposal-')) {
      const proposalId = parseInt(updated.id.replace('existing-proposal-', ''), 10)
      setMyProposalEdits((prev) => {
        const next = new Map(prev)
        next.set(proposalId, updated)
        return next
      })
    }
  }

  return { handleNodeMouseDown, handleNodeMouseUp, handleNodeTouchStart, handleNodeTouchMove, handleNodeTouchEnd, handleItemSelect, updateNode }
}
