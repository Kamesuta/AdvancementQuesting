import type { ToolMode } from '@/components/editor/types.js'
import { ItemIcon } from '@/components/editor/ItemIcon.js'
import type { ProposalNode } from '../types.js'

export interface OtherProposalNodeElProps {
  node: ProposalNode
  mode: ToolMode
  isEditor: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onMouseUp: (e: React.MouseEvent) => void
  onTouchStart: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
}

export function OtherProposalNodeEl({ node, mode, isEditor: _isEditor, onMouseDown, onMouseUp, onTouchStart, onTouchMove, onTouchEnd }: OtherProposalNodeElProps) {
  return (
    <div
      data-node-id={node.id}
      className="absolute w-12 h-12 -ml-6 -mt-6 flex items-center justify-center cursor-pointer z-10"
      style={{ left: node.x, top: node.y, opacity: 0.7 }}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className={[
        'absolute inset-0 rounded-full ring-2 ring-yellow-400 ring-dashed',
        (mode === 'select') ? 'hover:ring-4 hover:opacity-80' : '',
      ].join(' ')}>
        <div className="w-full h-full bg-black/50 border-2 border-[#a0903a] rounded-full shadow-inner flex items-center justify-center" />
      </div>
      <div className="relative pointer-events-none">
        <ItemIcon type={node.icon} size={28} />
      </div>
      {(node.votesUp ?? 0) > 0 && (
        <div className="absolute -top-1 -right-1 bg-green-600 text-white text-[9px] font-bold px-1 rounded-full border border-white z-10 leading-4">
          👍{node.votesUp}
        </div>
      )}
      {node.proposerName && (
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full overflow-hidden border border-yellow-400 z-10 bg-black">
          <img
            src={`https://mc-heads.net/avatar/${node.proposerName}/20`}
            alt={node.proposerName}
            width={20}
            height={20}
            style={{ imageRendering: 'pixelated' }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        </div>
      )}
    </div>
  )
}
