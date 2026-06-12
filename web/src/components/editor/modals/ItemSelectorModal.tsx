import { ITEM_TYPES } from '../constants.js'
import { ItemIcon } from '../ItemIcon.js'

interface ItemSelectorModalProps {
  close: () => void
  /** 選択したアイテムキーを親に返すコールバック */
  onSelect: (itemType: string) => void
}

/**
 * Minecraft のインベントリ風アイテム選択モーダル
 * 選択するとモーダルを自動で閉じる (onSelect 内で close 相当の処理を行う)
 */
export function ItemSelectorModal({ close, onSelect }: ItemSelectorModalProps) {
  const itemKeys = Object.keys(ITEM_TYPES)
  // グリッドを 6列 × 複数行で埋めるためのダミーセル数
  const dummyCount = Math.max(0, 24 - itemKeys.length)

  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60"
      onClick={close}
    >
      {/* Minecraft風のグレーパネル */}
      <div
        className="bg-[#C6C6C6] border-t-white border-l-white border-b-[#555555] border-r-[#555555] border-4 p-4 shadow-2xl flex flex-col w-[500px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-black font-bold mb-4">アイテムを選択</div>

        {/* インベントリグリッド */}
        <div className="flex-1 bg-[#8B8B8B] border-t-[#3B3B3B] border-l-[#3B3B3B] border-b-[#C6C6C6] border-r-[#C6C6C6] border-2 p-2 grid grid-cols-6 gap-1 h-64 overflow-y-auto">
          {itemKeys.map((key) => (
            <div
              key={key}
              onClick={() => onSelect(key)}
              className="w-10 h-10 bg-[#C6C6C6] border-t-white border-l-white border-b-[#555555] border-r-[#555555] border-2 flex items-center justify-center cursor-pointer hover:bg-white"
              title={ITEM_TYPES[key]?.name}
            >
              <ItemIcon type={key} size={24} />
            </div>
          ))}
          {/* 空スロット (グリッドの見た目を整える) */}
          {Array.from({ length: dummyCount }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="w-10 h-10 bg-[#8B8B8B] border-t-[#555555] border-l-[#555555] border-b-white border-r-white border-2"
            />
          ))}
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
