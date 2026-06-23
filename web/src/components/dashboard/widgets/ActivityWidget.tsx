import { useQuery } from '@tanstack/react-query'
import { statsApi } from '@/api/stats.js'
import { ItemIcon } from '@/components/editor/ItemIcon.js'
import type { ActivityConfig } from '@/types/dashboard.js'

interface Props {
  config: ActivityConfig
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'たった今'
  if (m < 60) return `${m}分前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}時間前`
  return `${Math.floor(h / 24)}日前`
}

export function ActivityWidget({ config }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['stats', 'activity', config.limit],
    queryFn: () => statsApi.activity(config.limit),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  })

  if (isLoading) return <div className="text-gray-400 text-xs text-center py-4">読み込み中...</div>
  if (!data || data.length === 0) return <div className="text-gray-500 text-xs text-center py-4">データなし</div>

  return (
    <ol className="space-y-2">
      {data.map((item) => (
        <li key={item.id} className="flex items-start gap-2">
          <img
            src={`https://mc-heads.net/avatar/${item.playerName}/20`}
            alt={item.playerName}
            width={20}
            height={20}
            style={{ imageRendering: 'pixelated' }}
            className="rounded-sm shrink-0 mt-0.5"
            onError={(ev) => { (ev.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-gray-200 truncate">{item.playerName}</span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <ItemIcon type={item.questIcon} size={12} />
              <span className="text-xs text-gray-400 truncate">{item.questTitle}</span>
            </div>
          </div>
          <span className="text-[10px] text-gray-500 shrink-0 mt-0.5">{relativeTime(item.completedAt)}</span>
        </li>
      ))}
    </ol>
  )
}
