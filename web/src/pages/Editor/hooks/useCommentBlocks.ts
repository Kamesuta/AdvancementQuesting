import type React from 'react'
import type { EditorComment, EditorNode } from '@/components/editor/types.js'
import { commentsApi } from '@/api/comments.js'

interface CommentDragState {
  offsetX: number; offsetY: number
  startX: number; startY: number
  members: { id: string; x: number; y: number }[]
}

interface UseCommentBlocksParams {
  draggingCommentId: string | null
  commentDragRef: React.MutableRefObject<CommentDragState | null>
  setComments: React.Dispatch<React.SetStateAction<EditorComment[]>>
  setNodes: React.Dispatch<React.SetStateAction<EditorNode[]>>
  comments: EditorComment[]
}

export function useCommentBlocks({
  draggingCommentId,
  commentDragRef,
  setComments,
  setNodes,
  comments,
}: UseCommentBlocksParams) {
  const dragCommentTo = (wx: number, wy: number) => {
    const d = commentDragRef.current
    if (!d || !draggingCommentId) return
    const newX = wx - d.offsetX
    const newY = wy - d.offsetY
    const dx = newX - d.startX
    const dy = newY - d.startY
    setComments((prev) => prev.map((c) =>
      c.id === draggingCommentId ? { ...c, x: newX, y: newY } : c))
    if (d.members.length > 0) {
      const byId = new Map(d.members.map((m) => [m.id, m]))
      setNodes((prev) => prev.map((n) => {
        const m = byId.get(n.id)
        return m ? { ...n, x: m.x + dx, y: m.y + dy } : n
      }))
    }
  }

  const saveCommentById = (id: string | null) => {
    if (!id) return
    const c = comments.find((c) => c.id === id)
    if (c) commentsApi.update(c.id, {
      x: c.x, y: c.y, width: c.width, height: c.height, title: c.title, color: c.color,
    }).catch(() => {})
  }

  return { dragCommentTo, saveCommentById }
}
