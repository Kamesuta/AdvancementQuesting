import type { FC } from 'react'
import { useState } from 'react'

interface ItemIconProps {
  type: string
  size?: number
}

const FALLBACK_COLORS: Record<string, string> = {
  book:      '#8B4513',
  diamond:   '#55FFFF',
  stone:     '#AAAAAA',
  grass:     '#55FF55',
  wood:      '#5c4033',
  apple:     '#FF5555',
  chest:     '#D2B48C',
  gold:      '#FFAA00',
  emerald:   '#55FF55',
  redstone:  '#AA0000',
  obsidian:  '#110b1a',
  sword:     '#8b5a2b',
}

/** PNG テクスチャで描画し、失敗時はブロックテクスチャ → カラー四角にフォールバック */
export const ItemIcon: FC<ItemIconProps> = ({ type, size = 32 }) => {
  const [itemFailed, setItemFailed] = useState(false)
  const [blockFailed, setBlockFailed] = useState(false)

  const color = FALLBACK_COLORS[type] ?? '#888888'

  if (!itemFailed) {
    return (
      <img
        src={`/mc/textures/item/${type}.png`}
        width={size}
        height={size}
        style={{ imageRendering: 'pixelated' }}
        onError={() => setItemFailed(true)}
        alt={type}
      />
    )
  }

  if (!blockFailed) {
    return (
      <img
        src={`/mc/textures/block/${type}.png`}
        width={size}
        height={size}
        style={{ imageRendering: 'pixelated' }}
        onError={() => setBlockFailed(true)}
        alt={type}
      />
    )
  }

  // 最終フォールバック: カラー四角
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect x="2" y="2" width="28" height="28" fill={color} stroke="rgba(0,0,0,0.4)" strokeWidth="2" rx="2" />
    </svg>
  )
}
