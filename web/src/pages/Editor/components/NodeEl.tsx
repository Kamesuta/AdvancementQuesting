import { RotateCw, CheckSquare } from 'lucide-react'
import type { EditorNode, ToolMode } from '@/components/editor/types.js'
import { ItemIcon } from '@/components/editor/ItemIcon.js'

export interface NodeElProps {
  node: EditorNode
  mode: ToolMode
  draggingNode: string | null
  linkStartNode: string | null
  linkHoverNode: string | null
  setHoveredNode: (n: EditorNode | null) => void
  isDraft?: boolean
  completed?: boolean
  celebrating?: boolean
  rewardClaimable?: boolean
  isEditor?: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onMouseUp: (e: React.MouseEvent) => void
  onTouchStart: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
}

export function NodeEl({ node, mode, draggingNode, linkStartNode, linkHoverNode, setHoveredNode, isDraft, completed, celebrating, rewardClaimable, isEditor, onMouseDown, onMouseUp, onTouchStart, onTouchMove, onTouchEnd }: NodeElProps) {
  const isCheckmarkOnly = (node.tasks?.length ?? 0) > 0 && node.tasks!.every((t) => t.type === 'checkmark')
  const isHidden = node.status === 'hidden'
  return (
    <div
      data-node-id={node.id}
      data-completed={completed ? 'true' : undefined}
      data-celebrating={celebrating ? 'true' : undefined}
      data-hidden={isHidden ? 'true' : undefined}
      className={`absolute w-12 h-12 -ml-6 -mt-6 flex items-center justify-center cursor-pointer z-10 transition-transform ${
        draggingNode === node.id ? 'scale-110 z-20' : ''
      } ${celebrating ? 'z-30' : ''}`}
      style={{ left: node.x, top: node.y, opacity: isDraft ? 0.85 : isHidden ? 0.5 : 1 }}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseEnter={() => setHoveredNode(node)}
      onMouseLeave={() => setHoveredNode(null)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {completed && (
        <div
          className="absolute -inset-1 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,215,0,0.45) 0%, rgba(255,215,0,0) 70%)',
            animation: celebrating ? 'none' : 'aq-completed-glow 2.5s ease-in-out infinite',
          }}
        />
      )}

      {celebrating && (
        <div className="absolute inset-0 pointer-events-none z-20">
          <div className="absolute inset-0 rounded-full" style={{ animation: 'aq-celebrate-ring 1s ease-out 2', border: '3px solid #FFD700' }} />
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="absolute left-1/2 top-1/2 text-yellow-300"
              style={{
                fontSize: '14px',
                marginLeft: '-7px',
                marginTop: '-7px',
                ['--r' as string]: `${i * 45}deg`,
                animation: `aq-celebrate-spark 1.2s ease-out ${(i % 4) * 0.05}s`,
              }}
            >
              ✦
            </span>
          ))}
        </div>
      )}

      <div
        className={[
          'absolute inset-0 rounded-full',
          linkStartNode === node.id ? 'ring-4 ring-green-500' : '',
          linkHoverNode === node.id ? 'ring-4 ring-yellow-300 scale-110' : '',
          mode === 'delete' ? 'hover:ring-4 hover:ring-red-500' : '',
          mode === 'select' ? 'hover:ring-4 hover:ring-yellow-400' : '',
          isDraft ? 'ring-2 ring-blue-400 ring-dashed' : '',
          completed ? 'ring-2 ring-yellow-400' : '',
        ].join(' ')}
      >
        <div className={`w-full h-full bg-black/50 border-2 rounded-full shadow-inner flex items-center justify-center ${completed ? 'border-yellow-400' : 'border-[#839384]'}`} />
      </div>
      {isDraft && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full border border-white z-10" title="提案ドラフト" />
      )}

      {node.repeat && node.repeat.type !== 'none' && (
        <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-[#1a2a3a] border border-[#4a9edd] z-10 flex items-center justify-center" title="繰り返しクエスト">
          <RotateCw size={11} strokeWidth={2.5} className="text-[#7ec8ff]" style={{ transform: 'translate(-0.5px, -0.5px)' }} />
        </div>
      )}

      {isCheckmarkOnly && (
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#1a3a2a] border border-[#4add9e] z-10 flex items-center justify-center" title="チェックマーク条件のみ">
          <CheckSquare size={11} strokeWidth={2.5} className="text-[#4add9e]" />
        </div>
      )}

      {rewardClaimable && (
        <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-[#3a1a00] border border-[#dd7a1a] z-10 flex items-center justify-center" title="報酬を受け取れます" style={{ fontSize: '11px' }}>
          🎁
        </div>
      )}

      {isHidden && isEditor && (
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#2a1a3a] border border-[#9a6acc] z-10 flex items-center justify-center" title="非公開クエスト" style={{ fontSize: '11px' }}>
          🔒
        </div>
      )}

      {completed && !(isHidden && isEditor) && (
        <div
          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border border-yellow-700 z-20 flex items-center justify-center"
          style={{ backgroundColor: '#FFD700', fontSize: '10px', lineHeight: 1 }}
          title="達成済み"
        >
          ✓
        </div>
      )}

      <div className={`relative pointer-events-none ${celebrating ? 'animate-bounce' : ''}`}>
        <ItemIcon type={node.icon} size={28} />
      </div>
    </div>
  )
}
