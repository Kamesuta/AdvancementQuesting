import { Plus, X } from 'lucide-react'

interface RewardTableModalProps {
  close: () => void
}

/**
 * 報酬テーブル一覧モーダル
 * 複数クエストで共有できる報酬テーブルを管理する
 * TODO: APIと接続して実際のデータを表示する
 */
export function RewardTableModal({ close }: RewardTableModalProps) {
  // 開発用の仮データ — 将来は API から取得する
  const tables = ['LV 報酬', 'MV 報酬', 'HV 報酬', 'EV 報酬', 'IV 報酬', 'Steam 報酬']

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={close}
    >
      <div
        className="bg-[#2d2f3b] border-2 border-[#1e1f29] w-[400px] h-[500px] flex flex-col p-4 shadow-2xl text-white rounded-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between mb-4 border-b border-gray-600 pb-2">
          <h2 className="font-bold">報酬テーブル</h2>
          <button onClick={close} className="text-gray-400 hover:text-red-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-black/30 border border-gray-700 p-2 space-y-1">
          {tables.map((t) => (
            <div
              key={t}
              className="p-2 hover:bg-white/10 cursor-pointer border border-transparent hover:border-gray-500 rounded-sm flex items-center gap-2"
            >
              <span className="text-yellow-400">🎁</span> {t}
            </div>
          ))}
        </div>

        <button className="mt-4 bg-[#1e1f29] border border-gray-600 hover:bg-gray-700 py-2 flex items-center justify-center gap-2 rounded-sm text-sm">
          <Plus size={16} className="text-green-400" /> 報酬テーブルを追加
        </button>
      </div>
    </div>
  )
}
