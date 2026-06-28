import type React from 'react'
import type { EditorNode, EditorComment, ToolMode, Vec2 } from '@/components/editor/types.js'
import { commentsApi } from '@/api/comments.js'
import { COMMENT_COLORS } from '@/components/editor/CommentBlockEl.js'
import type { ResizeDir } from '@/components/editor/CommentBlockEl.js'
import type { ProposalNode } from '../types.js'
import { CLICK_MAX_DIST } from '../types.js'

interface CommentDragState {
  offsetX: number; offsetY: number
  startX: number; startY: number
  members: { id: string; x: number; y: number }[]
}

interface UseCanvasHandlersParams {
  mode: ToolMode
  pan: Vec2
  panStart: Vec2
  isPanning: boolean
  draggingNode: string | null
  dragOffset: Vec2
  commentDraft: { x: number; y: number; w: number; h: number } | null
  commentDraftStartRef: React.MutableRefObject<{ wx: number; wy: number } | null>
  draggingCommentId: string | null
  commentDragRef: React.MutableRefObject<CommentDragState | null>
  resizingCommentId: string | null
  commentResizeStartRef: React.MutableRefObject<{ mouseX: number; mouseY: number; origX: number; origY: number; origW: number; origH: number; dir: ResizeDir } | null>
  mouseDownPos: React.MutableRefObject<Vec2 | null>
  mouseDownNodeId: React.MutableRefObject<{ nodeId: string; isProposal: boolean } | null>
  touchJustPlacedNode: React.MutableRefObject<boolean>
  linkStartNode: string | null
  canvasRef: React.RefObject<HTMLDivElement | null>
  panStartRef: React.MutableRefObject<Vec2>
  panRef: React.MutableRefObject<Vec2>
  proposalMode: boolean
  isEditor: boolean
  otherProposalNodes: ProposalNode[]
  setIsPanning: React.Dispatch<React.SetStateAction<boolean>>
  setPan: React.Dispatch<React.SetStateAction<Vec2>>
  setPanStart: React.Dispatch<React.SetStateAction<Vec2>>
  setNodes: React.Dispatch<React.SetStateAction<EditorNode[]>>
  setProposalNodes: React.Dispatch<React.SetStateAction<EditorNode[]>>
  setMyProposalEdits: React.Dispatch<React.SetStateAction<Map<number, EditorNode>>>
  setMousePos: React.Dispatch<React.SetStateAction<Vec2>>
  setCommentDraft: React.Dispatch<React.SetStateAction<{ x: number; y: number; w: number; h: number } | null>>
  setComments: React.Dispatch<React.SetStateAction<EditorComment[]>>
  setDraggingCommentId: React.Dispatch<React.SetStateAction<string | null>>
  setResizingCommentId: React.Dispatch<React.SetStateAction<string | null>>
  setLinkStartNode: React.Dispatch<React.SetStateAction<string | null>>
  setLinkHoverNode: React.Dispatch<React.SetStateAction<string | null>>
  setDraggingNode: React.Dispatch<React.SetStateAction<string | null>>
  isProposalDraft: (nodeId: string) => boolean
  addProposalNode: (wx: number, wy: number) => void
  dragCommentTo: (wx: number, wy: number) => void
  saveCommentById: (id: string | null) => void
  openNode: (nodeId: string, isOtherProposal: boolean) => void
  getNodeIdNearPoint: (clientX: number, clientY: number, excludeId?: string) => string | null
}

export function useCanvasHandlers({
  mode, pan, panStart, isPanning, draggingNode, dragOffset,
  commentDraft, commentDraftStartRef, draggingCommentId, commentDragRef,
  resizingCommentId, commentResizeStartRef,
  mouseDownPos, mouseDownNodeId, touchJustPlacedNode,
  linkStartNode, canvasRef, panStartRef, panRef,
  proposalMode, isEditor, otherProposalNodes,
  setIsPanning, setPan, setPanStart, setNodes, setProposalNodes, setMyProposalEdits,
  setMousePos, setCommentDraft, setComments, setDraggingCommentId, setResizingCommentId,
  setLinkStartNode, setLinkHoverNode, setDraggingNode,
  isProposalDraft, addProposalNode, dragCommentTo, saveCommentById, openNode, getNodeIdNearPoint,
}: UseCanvasHandlersParams) {
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2) {
      e.preventDefault()
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      setLinkStartNode(null)
      return
    }
    mouseDownNodeId.current = null
    mouseDownPos.current = { x: e.clientX, y: e.clientY }
    touchJustPlacedNode.current = false
    if (mode === 'select' || mode === 'move') {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    } else if (mode === 'add_node') {
      const rect = canvasRef.current!.getBoundingClientRect()
      const wx = e.clientX - rect.left - pan.x
      const wy = e.clientY - rect.top - pan.y
      if (proposalMode) {
        addProposalNode(wx, wy)
      } else if (isEditor) {
        setNodes((prev) => [...prev, {
          id: `node-${Date.now()}`, x: wx, y: wy,
          icon: 'stone', title: '新規クエスト', subtitle: '', description: '',
          tasks: [], rewards: [],
        }])
      }
    } else if (mode === 'add_link') {
      setLinkStartNode(null)
    } else if (mode === 'add_comment' && isEditor) {
      const rect = canvasRef.current!.getBoundingClientRect()
      const wx = e.clientX - rect.left - pan.x
      const wy = e.clientY - rect.top - pan.y
      commentDraftStartRef.current = { wx, wy }
      setCommentDraft({ x: wx, y: wy, w: 0, h: 0 })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    if (isPanning && !draggingNode && !draggingCommentId && !resizingCommentId) setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
    const wx = e.clientX - rect.left - pan.x
    const wy = e.clientY - rect.top - pan.y
    setMousePos({ x: wx, y: wy })

    if (mode === 'add_comment' && commentDraftStartRef.current) {
      const sx = commentDraftStartRef.current.wx
      const sy = commentDraftStartRef.current.wy
      setCommentDraft({ x: Math.min(sx, wx), y: Math.min(sy, wy), w: Math.abs(wx - sx), h: Math.abs(wy - sy) })
    }

    if (draggingCommentId) { dragCommentTo(wx, wy) }

    if (resizingCommentId && commentResizeStartRef.current) {
      const { mouseX, mouseY, origX, origY, origW, origH, dir } = commentResizeStartRef.current
      const dx = e.clientX - mouseX
      const dy = e.clientY - mouseY
      let newX = origX, newY = origY, newW = origW, newH = origH
      if (dir === 'right' || dir === 'se') newW = Math.max(80, origW + dx)
      if (dir === 'bottom' || dir === 'se') newH = Math.max(60, origH + dy)
      if (dir === 'left') { newW = Math.max(80, origW - dx); newX = origX + origW - newW }
      if (dir === 'top') { newH = Math.max(60, origH - dy); newY = origY + origH - newH }
      setComments(prev => prev.map(c =>
        c.id === resizingCommentId ? { ...c, x: newX, y: newY, width: newW, height: newH } : c
      ))
    }

    if (draggingNode && mode === 'move') {
      const tx = wx - dragOffset.x
      const ty = wy - dragOffset.y
      if (proposalMode && isProposalDraft(draggingNode)) {
        setProposalNodes((prev) => prev.map((n) => n.id === draggingNode ? { ...n, x: tx, y: ty } : n))
      } else if (draggingNode.startsWith('existing-proposal-')) {
        const proposalId = parseInt(draggingNode.replace('existing-proposal-', ''), 10)
        setMyProposalEdits((prev) => {
          const current = prev.get(proposalId) ?? otherProposalNodes.find((n) => n.id === draggingNode)
          if (!current) return prev
          const next = new Map(prev)
          next.set(proposalId, { ...current, x: tx, y: ty })
          return next
        })
      } else if (isEditor) {
        setNodes((prev) => prev.map((n) => n.id === draggingNode ? { ...n, x: tx, y: ty } : n))
      }
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (mode === 'add_comment' && commentDraftStartRef.current && commentDraft) {
      commentDraftStartRef.current = null
      const { x, y, w, h } = commentDraft
      setCommentDraft(null)
      if (w > 30 && h > 30 && isEditor) {
        const newComment = { x, y, width: w, height: h, title: 'コメント', color: COMMENT_COLORS[0].hex }
        commentsApi.create(newComment).then(created => {
          setComments(prev => [...prev, created])
        }).catch(() => {})
      }
      return
    }

    if (draggingCommentId) {
      saveCommentById(draggingCommentId)
      commentDragRef.current = null
      setDraggingCommentId(null)
      setIsPanning(false)
      return
    }

    if (resizingCommentId) {
      saveCommentById(resizingCommentId)
      setResizingCommentId(null)
      commentResizeStartRef.current = null
      setIsPanning(false)
      return
    }

    if (isPanning) setIsPanning(false)
    if (draggingNode) { setDraggingNode(null); return }

    if ((mode === 'select' || mode === 'add_node') && mouseDownNodeId.current && mouseDownPos.current && !touchJustPlacedNode.current) {
      const dx = e.clientX - mouseDownPos.current.x
      const dy = e.clientY - mouseDownPos.current.y
      if (dx * dx + dy * dy <= CLICK_MAX_DIST * CLICK_MAX_DIST) {
        const { nodeId, isProposal } = mouseDownNodeId.current
        openNode(nodeId, isProposal)
      }
    }
    mouseDownPos.current = null
    mouseDownNodeId.current = null
    touchJustPlacedNode.current = false
  }

  const handleCanvasTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    const t = e.touches[0]
    mouseDownNodeId.current = null
    mouseDownPos.current = { x: t.clientX, y: t.clientY }
    touchJustPlacedNode.current = false
    if (mode === 'select' || mode === 'move') {
      const newStart = { x: t.clientX - panRef.current.x, y: t.clientY - panRef.current.y }
      panStartRef.current = newStart
      setPanStart(newStart)
      setIsPanning(true)
    } else if (mode === 'add_node') {
      e.preventDefault()
      const rect = canvasRef.current!.getBoundingClientRect()
      const wx = t.clientX - rect.left - panRef.current.x
      const wy = t.clientY - rect.top - panRef.current.y
      if (proposalMode) {
        addProposalNode(wx, wy)
        touchJustPlacedNode.current = true
      } else if (isEditor) {
        setNodes((prev) => [...prev, {
          id: `node-${Date.now()}`, x: wx, y: wy,
          icon: 'stone', title: '新規クエスト', subtitle: '', description: '',
          tasks: [], rewards: [],
        }])
        touchJustPlacedNode.current = true
      }
    }
  }

  const handleCanvasTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1 || !canvasRef.current) return
    const t = e.touches[0]
    e.preventDefault()

    if ((mode === 'select' || mode === 'move') && isPanning && !draggingNode) {
      setPan({ x: t.clientX - panStartRef.current.x, y: t.clientY - panStartRef.current.y })
    }

    if (mode === 'add_link') {
      const rect = canvasRef.current.getBoundingClientRect()
      setMousePos({ x: t.clientX - rect.left - panRef.current.x, y: t.clientY - rect.top - panRef.current.y })
      const hoverId = getNodeIdNearPoint(t.clientX, t.clientY, linkStartNode ?? undefined)
      setLinkHoverNode(hoverId)
    }

    if (draggingCommentId) {
      const rect = canvasRef.current.getBoundingClientRect()
      dragCommentTo(t.clientX - rect.left - panRef.current.x, t.clientY - rect.top - panRef.current.y)
      return
    }

    if (resizingCommentId && commentResizeStartRef.current) {
      const { mouseX, mouseY, origX, origY, origW, origH, dir } = commentResizeStartRef.current
      const dx = t.clientX - mouseX
      const dy = t.clientY - mouseY
      let newX = origX, newY = origY, newW = origW, newH = origH
      if (dir === 'right' || dir === 'se') newW = Math.max(80, origW + dx)
      if (dir === 'bottom' || dir === 'se') newH = Math.max(60, origH + dy)
      if (dir === 'left') { newW = Math.max(80, origW - dx); newX = origX + origW - newW }
      if (dir === 'top') { newH = Math.max(60, origH - dy); newY = origY + origH - newH }
      setComments((prev) => prev.map((c) =>
        c.id === resizingCommentId ? { ...c, x: newX, y: newY, width: newW, height: newH } : c))
      return
    }

    if (mode === 'move' && draggingNode) {
      const rect = canvasRef.current.getBoundingClientRect()
      const wx = t.clientX - rect.left - panRef.current.x
      const wy = t.clientY - rect.top - panRef.current.y
      const tx = wx - dragOffset.x
      const ty = wy - dragOffset.y
      if (proposalMode && isProposalDraft(draggingNode)) {
        setProposalNodes((prev) => prev.map((n) => n.id === draggingNode ? { ...n, x: tx, y: ty } : n))
      } else if (draggingNode.startsWith('existing-proposal-')) {
        const proposalId = parseInt(draggingNode.replace('existing-proposal-', ''), 10)
        setMyProposalEdits((prev) => {
          const current = prev.get(proposalId) ?? otherProposalNodes.find((n) => n.id === draggingNode)
          if (!current) return prev
          const next = new Map(prev)
          next.set(proposalId, { ...current, x: tx, y: ty })
          return next
        })
      } else if (isEditor) {
        setNodes((prev) => prev.map((n) => n.id === draggingNode ? { ...n, x: tx, y: ty } : n))
      }
    }
  }

  const handleCanvasTouchEnd = (e: React.TouchEvent) => {
    setIsPanning(false)
    setLinkHoverNode(null)

    if (draggingCommentId) {
      saveCommentById(draggingCommentId)
      commentDragRef.current = null
      setDraggingCommentId(null)
      return
    }
    if (resizingCommentId) {
      saveCommentById(resizingCommentId)
      setResizingCommentId(null)
      commentResizeStartRef.current = null
      return
    }

    if (draggingNode) { setDraggingNode(null); return }

    if ((mode === 'select' || mode === 'add_node') && mouseDownNodeId.current && mouseDownPos.current && !touchJustPlacedNode.current) {
      const touch = e.changedTouches[0]
      const dx = touch.clientX - mouseDownPos.current.x
      const dy = touch.clientY - mouseDownPos.current.y
      if (dx * dx + dy * dy <= CLICK_MAX_DIST * CLICK_MAX_DIST) {
        const { nodeId, isProposal } = mouseDownNodeId.current
        openNode(nodeId, isProposal)
      }
    }
    mouseDownPos.current = null
    mouseDownNodeId.current = null
  }

  return { handleCanvasMouseDown, handleMouseMove, handleMouseUp, handleCanvasTouchStart, handleCanvasTouchMove, handleCanvasTouchEnd }
}
