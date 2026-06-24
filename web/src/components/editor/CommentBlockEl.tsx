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

export type ResizeDir = 'right' | 'bottom' | 'left' | 'se'

interface CommentBlockElProps {
  comment: EditorComment
  mode: string
  /** 編集可能か (editor かつ編集モードのときのみ true) */
  editable: boolean
  /** ヘッダードラッグ開始時 (移動) */
  onMoveStart: (e: React.MouseEvent | React.TouchEvent) => void
  /** リサイズハンドルドラッグ開始時 */
  onResizeStart: (e: React.MouseEvent | React.TouchEvent, dir: ResizeDir) => void
  /** 削除モードでクリック */
  onDelete: () => void
  /** タイトル・カラー変更完了 */
  onEdit: (updates: Partial<Pick<EditorComment, 'title' | 'color'>>) => void
}

export function CommentBlockEl({
  comment,
  mode,
  editable,
  onMoveStart,
  onResizeStart,
  onDelete,
  onEdit,
}: CommentBlockElProps) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState(comment.title)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 編集可能 かつ 削除モードでない場合だけ各種操作を許可
  const canEdit = editable && mode !== 'delete'

  const handleHeaderDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!canEdit) return
    e.stopPropagation()
    setShowColorPicker(false)
    setDraftTitle(comment.title)
    setEditingTitle(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }, [canEdit, comment.title])

  const commitTitle = useCallback(() => {
    setEditingTitle(false)
    if (draftTitle !== comment.title) {
      onEdit({ title: draftTitle })
    }
  }, [draftTitle, comment.title, onEdit])

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (editable && mode === 'delete') {
      e.stopPropagation()
      onDelete()
    }
  }, [editable, mode, onDelete])

  const color = comment.color || '#4A4A4A'
  const isDeleteMode = editable && mode === 'delete'

  // リサイズハンドル共通
  const resizeHandle = (dir: ResizeDir) => ({
    onMouseDown: (e: React.MouseEvent) => { e.stopPropagation(); onResizeStart(e, dir) },
    onTouchStart: (e: React.TouchEvent) => { e.stopPropagation(); onResizeStart(e, dir) },
  })

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
      {/* ヘッダー (ドラッグハンドル / タイトル — 複数行対応で内容に応じて伸長) */}
      <div
        className="relative flex items-start gap-1 px-2 py-1 overflow-visible"
        style={{
          background: color,
          borderRadius: '4px 4px 0 0',
          minHeight: 28,
          cursor: canEdit ? 'grab' : 'default',
        }}
        onMouseDown={canEdit && !editingTitle ? onMoveStart : undefined}
        onTouchStart={canEdit && !editingTitle ? onMoveStart : undefined}
        onDoubleClick={handleHeaderDoubleClick}
      >
        {editingTitle ? (
          <textarea
            ref={inputRef}
            className="flex-1 bg-transparent text-white text-sm font-bold outline-none min-w-0 resize-none overflow-hidden leading-snug"
            rows={Math.max(1, draftTitle.split('\n').length)}
            value={draftTitle}
            onChange={e => setDraftTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={e => {
              // Enter は改行 / Escape でキャンセル / Ctrl(Cmd)+Enter で確定
              if (e.key === 'Escape') { e.preventDefault(); setEditingTitle(false); setDraftTitle(comment.title) }
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); commitTitle() }
            }}
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 text-white text-sm font-bold whitespace-pre-wrap break-words leading-snug">
            {comment.title || 'コメント'}
          </span>
        )}

        {/* カラーボタン (canEdit 時のみ) */}
        {canEdit && !editingTitle && (
          <div className="relative flex-shrink-0">
            <button
              className="w-4 h-4 rounded-sm border border-white/50 mt-0.5 flex-shrink-0"
              style={{ background: color }}
              title="色を変更"
              onClick={e => { e.stopPropagation(); setShowColorPicker(v => !v) }}
              onMouseDown={e => e.stopPropagation()}
              onTouchStart={e => e.stopPropagation()}
            />
            {/* カラーパレット */}
            {showColorPicker && (
              <div
                className="absolute right-0 flex gap-1 p-1.5 rounded shadow-lg"
                style={{ top: '100%', marginTop: 4, background: '#1a1a1a', zIndex: 100 }}
                onMouseDown={e => e.stopPropagation()}
                onTouchStart={e => e.stopPropagation()}
              >
                {COMMENT_COLORS.map(c => (
                  <button
                    key={c.hex}
                    className="w-5 h-5 rounded-sm"
                    style={{
                      background: c.hex,
                      outline: color === c.hex ? '2px solid white' : '2px solid transparent',
                      outlineOffset: 1,
                    }}
                    title={c.label}
                    onClick={e => {
                      e.stopPropagation()
                      onEdit({ color: c.hex })
                      setShowColorPicker(false)
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 削除モード表示 */}
        {isDeleteMode && (
          <span className="text-red-300 text-xs font-bold flex-shrink-0 mt-0.5">✕</span>
        )}
      </div>

      {/* リサイズハンドル群 (canEdit 時のみ) */}
      {canEdit && (
        <>
          {/* 右端 */}
          <div
            className="absolute top-0 right-0 cursor-e-resize"
            style={{ width: 6, bottom: 12, touchAction: 'none' }}
            {...resizeHandle('right')}
          />
          {/* 下端 */}
          <div
            className="absolute bottom-0 left-0 cursor-s-resize"
            style={{ height: 6, right: 12, touchAction: 'none' }}
            {...resizeHandle('bottom')}
          />
          {/* 左端 */}
          <div
            className="absolute top-0 left-0 cursor-w-resize"
            style={{ width: 6, bottom: 0, touchAction: 'none' }}
            {...resizeHandle('left')}
          />
          {/* 右下コーナー */}
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            style={{ touchAction: 'none' }}
            {...resizeHandle('se')}
          >
            <svg viewBox="0 0 12 12" width="12" height="12" className="absolute bottom-0.5 right-0.5 opacity-60">
              <path d="M12 12 L12 6 L6 12 Z" fill={color} />
            </svg>
          </div>
        </>
      )}

      {/* 削除モード時のオーバーレイ */}
      {isDeleteMode && (
        <div
          className="absolute inset-0 cursor-pointer"
          style={{ borderRadius: 4, background: 'rgba(220,50,50,0.15)' }}
        />
      )}
    </div>
  )
}
