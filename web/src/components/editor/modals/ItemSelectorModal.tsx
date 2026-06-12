import { ITEM_TYPES } from '../constants.js'
import { ItemIcon } from '../ItemIcon.js'
import { useIsMobile } from '@/hooks/useIsMobile.js'

interface ItemSelectorModalProps {
  close: () => void
  onSelect: (itemType: string) => void
}

/**
 * Minecraft のインベントリ風アイテム選択モーダル
 * スマホでは全画面グリッド、デスクトップでは中央ダイアログ
 */
export function ItemSelectorModal({ close, onSelect }: ItemSelectorModalProps) {
  const isMobile = useIsMobile()
  const itemKeys = Object.keys(ITEM_TYPES)
  const dummyCount = Math.max(0, 24 - itemKeys.length)

  const grid = (cols: number) => (
    <div
      className={`bg-[#8B8B8B] border-t-[#3B3B3B] border-l-[#3B3B3B] border-b-[#C6C6C6] border-r-[#C6C6C6] border-2 p-2 overflow-y-auto`}
      style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 2.5rem)`, gap: '4px' }}
    >
      {itemKeys.map((key) => (
        <div
          key={key}
          onClick={() => onSelect(key)}
          className="w-10 h-10 bg-[#C6C6C6] border-t-white border-l-white border-b-[#555555] border-r-[#555555] border-2 flex items-center justify-center cursor-pointer active:bg-gray-300"
          title={ITEM_TYPES[key]?.name}
        >
          <ItemIcon type={key} size={24} />
        </div>
      ))}
      {Array.from({ length: dummyCount }).map((_, i) => (
        <div
          key={`empty-${i}`}
          className="w-10 h-10 bg-[#8B8B8B] border-t-[#555555] border-l-[#555555] border-b-white border-r-white border-2"
        />
      ))}
    </div>
  )

  if (isMobile) {
    return (
      <div className="absolute inset-0 z-[60] flex flex-col bg-[#C6C6C6]">
        <div
          className="flex items-center justify-between px-4 py-3 border-b-4 border-black shrink-0"
          style={{ backgroundColor: '#8B8B8B' }}
        >
          <span className="font-bold text-black text-sm" style={{ fontFamily: '"Courier New", monospace' }}>
            アイテムを選択
          </span>
          <button
            onClick={close}
            className="bg-[#C6C6C6] border-t-white border-l-white border-b-[#555555] border-r-[#555555] border-2 px-3 py-1 text-black text-sm font-bold"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {grid(6)}
        </div>
      </div>
    )
  }

  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60"
      onClick={close}
    >
      <div
        className="bg-[#C6C6C6] border-t-white border-l-white border-b-[#555555] border-r-[#555555] border-4 p-4 shadow-2xl flex flex-col w-[500px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-black font-bold mb-4">アイテムを選択</div>
        <div className="h-64 overflow-y-auto">
          {grid(6)}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={close}
            className="bg-[#C6C6C6] hover:bg-[#D6D6D6] border-t-white border-l-white border-b-[#555555] border-r-[#555555] border-2 px-6 py-1 text-black"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}
