import type { FC } from 'react'
import { ITEM_TYPES } from './constants.js'

interface ItemIconProps {
  type: string
  size?: number
}

/**
 * マインクラフト風のアイテムアイコンをSVGで描画する
 * 未知の type は石 (stone) にフォールバックする
 */
export const ItemIcon: FC<ItemIconProps> = ({ type, size = 32 }) => {
  const item = ITEM_TYPES[type] ?? ITEM_TYPES['stone']!

  const renderShape = () => {
    switch (type) {
      case 'diamond':
        return <polygon points="16,2 30,16 16,30 2,16" fill="#55FFFF" stroke="#33AAAA" strokeWidth="2" />
      case 'book':
        return <rect x="6" y="4" width="20" height="24" rx="2" fill="#8B4513" stroke="#5c2e0b" strokeWidth="2" />
      case 'grass':
        return (
          <g>
            <rect x="4" y="4" width="24" height="24" fill="#8B4513" stroke="#5c2e0b" strokeWidth="2" />
            <rect x="4" y="4" width="24" height="8" fill="#55FF55" />
          </g>
        )
      case 'apple':
        return <circle cx="16" cy="18" r="10" fill="#FF5555" stroke="#AA0000" strokeWidth="2" />
      case 'sword':
        return <line x1="8" y1="24" x2="24" y2="8" stroke="#8b5a2b" strokeWidth="6" strokeLinecap="square" />
      case 'chest':
        return (
          <g>
            <rect x="4" y="8" width="24" height="20" fill="#D2B48C" stroke="#8B4513" strokeWidth="2" />
            <rect x="14" y="14" width="4" height="4" fill="#AAAAAA" />
          </g>
        )
      default:
        return <rect x="4" y="4" width="24" height="24" fill={item.color} stroke="rgba(0,0,0,0.5)" strokeWidth="2" />
    }
  }

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className="drop-shadow-md">
      {renderShape()}
    </svg>
  )
}
