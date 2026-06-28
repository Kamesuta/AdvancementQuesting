import type { EditorNode, EditorEdge } from '@/components/editor/types.js'
import type { Quest, Condition, Reward } from '@/types/quest.js'

export function questToNode(q: Quest): EditorNode {
  const sid = String(q.id)
  return {
    id: sid,
    x: q.mapPosition?.x ?? 100,
    y: q.mapPosition?.y ?? 100,
    icon: q.icon ?? 'stone',
    title: q.title,
    subtitle: (q as any).subtitle ?? '',
    description: q.description ?? '',
    creatorName: q.creatorName ?? null,
    tasks: (q.conditions ?? []).map((c, i) => ({
      id: c.id ?? `${sid}-t${i}`,
      type: c.type,
      value: (c as any).label ?? (c as any).value ?? '',
      ...(c.type === 'advancement' ? { advancementId: c.advancementId ?? '' } : {}),
      ...(c.type === 'item' ? { itemType: c.itemType ?? 'stone', count: c.count ?? 1, ...(c.nbt ? { nbt: c.nbt } : {}), ...(c.displayName ? { displayName: c.displayName } : {}) } : {}),
      ...(c.type === 'delivery' ? { itemType: (c as any).itemType ?? 'stone', count: (c as any).count ?? 1, ...((c as any).nbt ? { nbt: (c as any).nbt } : {}), ...((c as any).displayName ? { displayName: (c as any).displayName } : {}) } : {}),
      ...(c.type === 'stat' ? { statType: (c as any).statType ?? '', statId: (c as any).statId ?? '', count: (c as any).count ?? 1 } : {}),
      ...(c.type === 'location' ? { locX: (c as any).x ?? 0, locY: (c as any).y ?? 0, locZ: (c as any).z ?? 0, dimension: (c as any).dimension ?? 'overworld', radius: (c as any).radius ?? 10 } : {}),
      ...(c.type === 'scoreboard' ? { objective: (c as any).objective ?? '', score: (c as any).score ?? 1 } : {}),
    })),
    rewards: (q.rewards ?? []).map((r, i) => {
      const base = { id: `${sid}-r${i}`, value: '' }
      if (r.type === 'item') return { ...base, type: 'item', itemType: r.itemId, count: r.count ?? 1, ...(r.nbt ? { nbt: r.nbt } : {}), ...(r.displayName ? { displayName: r.displayName } : {}) }
      if (r.type === 'experience') return { ...base, type: 'xp', value: String(r.amount) }
      if (r.type === 'money') return { ...base, type: 'xp', value: `💰${r.amount}` }
      if (r.type === 'point') return { ...base, type: 'point', amount: r.amount }
      return { ...base, type: r.type }
    }),
    repeat: q.repeat ? { type: q.repeat.type, cooldownHours: q.repeat.cooldownHours, cron: q.repeat.cron } : undefined,
    status: q.status,
  }
}

export function nodeToApiBody(node: EditorNode, edgeList: EditorEdge[]) {
  const conditions: Condition[] = (node.tasks ?? []).map((t) => {
    const ta = t as any
    if (t.type === 'advancement') return { id: t.id, type: 'advancement' as const, advancementId: ta.advancementId ?? t.value ?? '' }
    if (t.type === 'item') return { id: t.id, type: 'item' as const, itemType: ta.itemType ?? 'stone', count: ta.count ?? 1, ...(ta.nbt ? { nbt: ta.nbt } : {}), ...(ta.displayName ? { displayName: ta.displayName } : {}) }
    if (t.type === 'delivery') return { id: t.id, type: 'delivery' as const, itemType: ta.itemType ?? 'stone', count: ta.count ?? 1, ...(ta.nbt ? { nbt: ta.nbt } : {}), ...(ta.displayName ? { displayName: ta.displayName } : {}) }
    if (t.type === 'checkmark') return { id: t.id, type: 'checkmark' as const, label: ta.label ?? t.value ?? '' }
    if (t.type === 'stat') return { id: t.id, type: 'stat' as const, statType: ta.statType ?? '', statId: ta.statId ?? '', count: ta.count ?? 1 }
    if (t.type === 'location') return { id: t.id, type: 'location' as const, x: ta.locX ?? 0, y: ta.locY ?? 0, z: ta.locZ ?? 0, dimension: ta.dimension ?? 'overworld', radius: ta.radius ?? 10 }
    if (t.type === 'scoreboard') return { id: t.id, type: 'scoreboard' as const, objective: ta.objective ?? '', score: ta.score ?? 1, ...(t.value ? { label: t.value } : {}) }
    return { id: t.id, type: 'checkmark' as const, label: t.value }
  })
  const rewards: Reward[] = (node.rewards ?? []).map((r) => {
    if (r.type === 'item') return { type: 'item' as const, itemId: r.itemType ?? 'stone', count: r.count ?? 1, ...(r.nbt ? { nbt: r.nbt } : {}), ...(r.displayName ? { displayName: r.displayName } : {}) }
    if (r.type === 'xp') return { type: 'experience' as const, amount: parseInt(r.value || '0', 10), isLevel: false }
    if (r.type === 'command') return { type: 'command' as const, command: r.value, opLevel: 0 }
    if (r.type === 'point') return { type: 'point' as const, amount: (r as any).amount ?? 0 }
    return { type: 'command' as const, command: '', opLevel: 0 }
  })
  return {
    title: node.title,
    subtitle: node.subtitle,
    description: node.description,
    icon: node.icon,
    mapPosition: { x: node.x, y: node.y },
    prerequisites: edgeList
      .filter((e) => e.target === node.id)
      .map((e) => parseInt(e.source, 10))
      .filter((n) => !isNaN(n)),
    conditions,
    rewards,
    repeat: node.repeat && node.repeat.type !== 'none' ? node.repeat : null,
  }
}

export function questsToEdges(quests: Quest[]): EditorEdge[] {
  const edges: EditorEdge[] = []
  for (const q of quests) {
    for (const prereqId of (q.prerequisites ?? [])) {
      edges.push({ id: `e-${prereqId}-${q.id}`, source: String(prereqId), target: String(q.id) })
    }
  }
  return edges
}
