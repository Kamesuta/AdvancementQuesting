import { useRef, useState, useCallback } from 'react'
import type { EditorComment } from './types.js'

// プリセットカラー (ダーク系で視認性を確保)
export const COMMENT_COLORS = [
  { label: 'グレー',  hex: '#4A4A4A' },
  { label: '赤',      hex: '#8B2020' },
  { label: '青',      hex: '#1A3A6B' },
  { label: '緑',      hex: '#1A5C2A' },
  { label: '黄',      hex: '#6B5B00' },
  { label: '紫',      hex: '#4A1A6B' },
]

/** hex カラーに透明度を付与 (alpha: 0-255 を hex 2桁) */
function withAlpha(hex: string, alpha: number): string {
  return hex + Math.round(alpha).toString(16).padStart(2, '0')
}

interface CommentBlockElProps {
  comment: EditorComment
  mode: string
  /** ヘッダードラッグ開始時 (移動) */
  onMoveStart: (e: React.MouseEvent | React.TouchEvent) => void
  /** リサイズハンドルドラッグ開始時 */
  onResizeStart: (e: React.MouseEvent | React.TouchEvent) => void
  /** 削除モードでクリック */
  onDelete: () => void
  /** タイトル・カラー変更完了 */
  onEdit: (updates: Partial<Pick<EditorComment, 'title' | 'color'>>) => void
}

export function CommentBlockEl({
  comment,
  mode,
  onMoveStart,
  onResizeStart,
  onDelete,
  onEdit,
}: CommentBlockElProps) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState(comment.title)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleHeaderDoubleClick = useCallback((e: React.MouseEvent) => {
    if (mode === 'delete') return
    e.stopPropagation()
    setDraftTitle(comment.title)
    setEditingTitle(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }, [mode, comment.title])

  const commitTitle = useCallback(() => {
    setEditingTitle(false)
    if (draftTitle.trim() !== comment.title) {
      onEdit({ title: draftTitle.trim() || comment.title })
    }
  }, [draftTitle, comment.title, onEdit])

  const handleColorClick = useCallback((e: React.MouseEvent, hex: string) => {
    e.stopPropagation()
    setShowColorPicker(false)
    onEdit({ color: hex })
  }, [onEdit])

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (mode === 'delete') {
      e.stopPropagation()
      onDelete()
    }
  }, [mode, onDelete])

  const color = comment.color || '#4A4A4A'

  return (
    <div
      className="absolute select-none"
      style={{
        left: comment.x,
        top: comment.y,
        width: comment.width,
        height: comment.height,
        zIndex: 1,
        borderRadius: 6,
        border: `2px solid ${color}`,
        background: withAlpha(color, 0x33),
        boxSizing: 'border-box',
      }}
      onClick={handleClick}
      data-comment-id={comment.id}
    >
      {/* ヘッダー (ドラッグハンドル) */}
      <div
        className="flex items-center gap-2 px-2 cursor-grab active:cursor-grabbing overflow-hidden"
        style={{
          background: color,
          borderRadius: '4px 4px 0 0',
          height: 28,
          userSelect: 'none',
        }}
        onMouseDown={mode !== 'delete' ? onMoveStart : undefined}
        onTouchStart={mode !== 'delete' ? onMoveStart : undefined}
        onDoubleClick={handleHeaderDoubleClick}
      >
        {editingTitle ? (
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-white text-sm font-bold outline-none min-w-0"
            value={draftTitle}
            onChange={e => setDraftTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={e => {
              if (e.key === 'Enter') commitTitle()
              if (e.key === 'Escape') { setEditingTitle(false); setDraftTitle(comment.title) }
            }}
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 text-white text-sm font-bold truncate">{comment.title || 'コメント'}</span>
        )}

        {/* カラーボタン */}
        {mode !== 'delete' && !editingTitle && (
          <div className="relative flex-shrink-0">
            <button
              className="w-4 h-4 rounded-full border border-white/50 cursor-pointer"
              style={{ background: color }}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); setShowColorPicker(v => !v) }}
              title="色を変更"
            />
            {showColorPicker && (
              <div
                className="absolute top-6 right-0 flex gap-1 p-1.5 rounded shadow-lg z-50"
                style={{ background: '#2a2a2a', border: '1px solid #555' }}
                onMouseDown={e => e.stopPropagation()}
              >
                {COMMENT_COLORS.map(c => (
                  <button
                    key={c.hex}
                    className="w-5 h-5 rounded-full border-2 cursor-pointer transition-transform hover:scale-110"
                    style={{
                      background: c.hex,
                      borderColor: c.hex === color ? 'white' : 'transparent',
                    }}
                    title={c.label}
                    onClick={e => handleColorClick(e, c.hex)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 削除モード表示 */}
        {mode === 'delete' && (
          <span className="text-red-300 text-xs font-bold">✕</span>
        )}
      </div>

      {/* リサイズハンドル (右下) */}
      {mode !== 'delete' && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          style={{ touchAction: 'none' }}
          onMouseDown={e => { e.stopPropagation(); onResizeStart(e) }}
          onTouchStart={e => { e.stopPropagation(); onResizeStart(e) }}
        >
          {/* 三角形のリサイズアイコン */}
          <svg viewBox="0 0 12 12" width="12" height="12" className="absolute bottom-0.5 right-0.5 opacity-60">
            <path d="M12 12 L12 6 L6 12 Z" fill={color} />
          </svg>
        </div>
      )}

      {/* 削除モード時のオーバーレイ */}
      {mode === 'delete' && (
        <div
          className="absolute inset-0 cursor-pointer"
          style={{ borderRadius: 4, background: 'rgba(220,50,50,0.15)' }}
        />
      )}
    </div>
  )
}
