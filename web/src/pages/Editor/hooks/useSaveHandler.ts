import { useCallback, useEffect } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import type { EditorNode, EditorEdge } from '@/components/editor/types.js'
import { questsApi } from '@/api/quests.js'
import { authApi } from '@/api/auth.js'
import type { Quest } from '@/types/quest.js'
import { nodeToApiBody } from '../utils/conversions.js'

interface UseSaveHandlerParams {
  saving: boolean
  setSaving: (v: boolean) => void
  nodes: EditorNode[]
  edges: EditorEdge[]
  questsData: Quest[] | undefined
  myProposalEdits: Map<number, EditorNode>
  existingProposals: any[] | undefined
  queryClient: QueryClient
  setSaveQuests: (fn: () => (() => Promise<void>)) => void
  setProposalMode: (v: boolean) => void
  setMyProposalEdits: React.Dispatch<React.SetStateAction<Map<number, EditorNode>>>
  showToast: (label: string) => void
}

export function useSaveHandler({
  saving, setSaving,
  nodes, edges, questsData,
  myProposalEdits, existingProposals,
  queryClient, setSaveQuests,
  setProposalMode, setMyProposalEdits,
  showToast,
}: UseSaveHandlerParams) {
  const handleSave = useCallback(async () => {
    if (saving) return
    setSaving(true)
    try {
      const existingIds = new Set((questsData ?? []).map((q) => String(q.id)))
      const currentNodeIds = new Set(nodes.map((n) => n.id))
      await Promise.all(
        (questsData ?? [])
          .filter((q) => q.status !== 'proposed' && !currentNodeIds.has(String(q.id)))
          .map((q) => questsApi.delete(q.id))
      )
      await Promise.all(nodes.map(async (node) => {
        const savedStatus: 'hidden' | 'public' = node.status === 'hidden' ? 'hidden' : 'public'
        const body = { ...nodeToApiBody(node, edges), status: savedStatus }
        if (existingIds.has(node.id)) {
          await questsApi.update(parseInt(node.id, 10), body)
        } else {
          await questsApi.create({ ...body, category: null, customButtons: [] })
        }
      }))
      for (const [proposalId, node] of myProposalEdits) {
        const p = existingProposals?.find((p: any) => p.id === proposalId) as any
        if (p) await questsApi.update(p.questId, nodeToApiBody(node, edges))
      }
      if (myProposalEdits.size > 0) {
        queryClient.invalidateQueries({ queryKey: ['proposals'] })
        setMyProposalEdits(new Map())
      }
      queryClient.invalidateQueries({ queryKey: ['quests'] })
      showToast('保存しました')
    } catch {
      showToast('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }, [saving, nodes, edges, questsData, myProposalEdits, existingProposals, queryClient, setSaving, setMyProposalEdits, showToast])

  useEffect(() => {
    setSaveQuests(() => handleSave)
  }, [handleSave, setSaveQuests])

  const handleLogout = async () => {
    try { await authApi.logout() } catch (_) {}
    localStorage.removeItem('token')
    queryClient.setQueryData(['me'], null)
    queryClient.clear()
    setProposalMode(false)
  }

  return { handleSave, handleLogout }
}
