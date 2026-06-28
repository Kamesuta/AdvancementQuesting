import { useRef, useEffect } from 'react'
import type { EditorNode } from '@/components/editor/types.js'

interface UseHashSyncParams {
  nodes: EditorNode[]
  editingNodeId: string | null
  setEditingNodeId: (id: string | null) => void
}

/** URL ハッシュ (#quest-<id>) と editingNodeId を双方向同期する */
export function useHashSync({ nodes, editingNodeId, setEditingNodeId }: UseHashSyncParams) {
  const mountedRef = useRef(false)

  // (A) editingNodeId → URL hash の書き出し (初回マウント時はスキップ)
  useEffect(() => {
    if (!mountedRef.current) return
    const base = window.location.pathname + window.location.search
    const desiredHash = editingNodeId ? `#quest-${editingNodeId}` : ''
    if (window.location.hash === desiredHash) return
    window.history.replaceState(null, '', base + desiredHash)
  }, [editingNodeId])

  // (B) URL hash → editingNodeId
  useEffect(() => {
    const idFromHash = () => {
      const m = window.location.hash.match(/^#quest-(.+)$/)
      return m ? decodeURIComponent(m[1]) : null
    }

    const id = idFromHash()
    if (id && nodes.some((n) => n.id === id)) setEditingNodeId(id)

    const onHashChange = () => {
      const hid = idFromHash()
      if (hid && nodes.some((n) => n.id === hid)) setEditingNodeId(hid)
      else setEditingNodeId(null)
    }
    window.addEventListener('hashchange', onHashChange)
    mountedRef.current = true
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [nodes, setEditingNodeId])
}
