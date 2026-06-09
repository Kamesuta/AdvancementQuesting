import { useQuery } from '@tanstack/react-query'
import { questsApi } from '@/api/quests.js'
import type { Quest } from '@/types/quest.js'

const STATUS_LABEL: Record<Quest['status'], string> = {
  draft: '下書き',
  proposed: '提案中',
  public: '公開',
  hidden: '非公開',
}

const STATUS_COLOR: Record<Quest['status'], string> = {
  draft: 'bg-gray-700 text-gray-300',
  proposed: 'bg-yellow-900 text-yellow-300',
  public: 'bg-green-900 text-green-300',
  hidden: 'bg-red-900 text-red-300',
}

function QuestCard({ quest }: { quest: Quest }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-gray-500 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {quest.icon && (
            <span className="text-2xl shrink-0">{iconEmoji(quest.icon)}</span>
          )}
          <div className="min-w-0">
            <h2 className="font-semibold truncate">{quest.title}</h2>
            {quest.category && (
              <span className="text-xs text-gray-400">{quest.category}</span>
            )}
          </div>
        </div>
        <span
          className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[quest.status]}`}
        >
          {STATUS_LABEL[quest.status]}
        </span>
      </div>
      {quest.description && (
        <p className="mt-2 text-sm text-gray-400 line-clamp-2">{quest.description}</p>
      )}
      <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
        <span>{quest.conditions.length} 条件</span>
        <span>{quest.rewards.length} 報酬</span>
        {quest.prerequisites.length > 0 && (
          <span>前提 {quest.prerequisites.length}件</span>
        )}
      </div>
    </div>
  )
}

function iconEmoji(icon: string): string {
  const map: Record<string, string> = {
    oak_log: '🪵',
    stone_pickaxe: '⛏️',
    diamond: '💎',
    diamond_pickaxe: '⛏️',
    obsidian: '⬛',
    fire_resistance: '🧪',
  }
  return map[icon] ?? '📦'
}

export default function QuestListPage() {
  const { data: quests, isPending, error } = useQuery({
    queryKey: ['quests'],
    queryFn: () => questsApi.list(),
  })

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-24 text-red-400">
        データの取得に失敗しました: {error.message}
      </div>
    )
  }

  const grouped = (quests ?? []).reduce<Record<string, Quest[]>>((acc, q) => {
    const key = q.category ?? '未分類'
    ;(acc[key] ??= []).push(q)
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">クエスト一覧</h1>
        <span className="text-sm text-gray-400">{quests?.length ?? 0} 件</span>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-24 text-gray-500">クエストがありません</div>
      ) : (
        <div className="flex flex-col gap-8">
          {Object.entries(grouped).map(([category, items]) => (
            <section key={category}>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {category}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((q) => (
                  <QuestCard key={q.id} quest={q} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
