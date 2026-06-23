import type { ReactNode } from 'react'
import type { WidgetType } from '@/types/dashboard.js'
import { WIDGET_LABELS } from '@/types/dashboard.js'

interface Props {
  type: WidgetType
  canEdit: boolean
  children: ReactNode
  onConfigOpen?: () => void
  onRemove?: () => void
}

export function WidgetWrapper({ type, canEdit, children, onConfigOpen, onRemove }: Props) {
  return (
    <div
      className="flex flex-col h-full rounded overflow-hidden border-2"
      style={{
        backgroundColor: '#1e1f29',
        borderColor: '#3B3B3B',
        borderTopColor: '#555',
        borderLeftColor: '#555',
        fontFamily: '"Courier New", Courier, monospace',
      }}
    >
      {/* ヘッダー */}
      <div
        className="flex items-center justify-between px-2 py-1 shrink-0 border-b-2"
        style={{ backgroundColor: '#2d2f3b', borderColor: '#3B3B3B' }}
      >
        <span className="text-xs font-bold text-gray-200">{WIDGET_LABELS[type]}</span>
        {canEdit && (
          <div className="flex gap-1">
            <button
              onClick={onConfigOpen}
              title="ウィジェット設定"
              className="text-xs px-1 py-0.5 border border-gray-500 text-gray-300 hover:bg-white/10"
            >
              ⚙
            </button>
            <button
              onClick={onRemove}
              title="ウィジェットを削除"
              className="text-xs px-1 py-0.5 border border-gray-500 text-gray-300 hover:bg-red-900/40"
            >
              ✕
            </button>
          </div>
        )}
      </div>
      {/* コンテンツ */}
      <div className="flex-1 overflow-auto p-2">
        {children}
      </div>
    </div>
  )
}
