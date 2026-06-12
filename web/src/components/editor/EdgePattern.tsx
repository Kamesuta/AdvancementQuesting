import type { FC } from 'react'
import type { Vec2 } from './types.js'

interface EdgePatternProps {
  source: Vec2
  /** 通常エッジのターゲット座標。プレビュー時は targetPos を使うので省略可 */
  target?: Vec2
  /** true にするとプレビュー色 (緑) で描画する */
  isPreview?: boolean
  /** リンク作成中のマウス追従先。isPreview === true の場合に使用 */
  targetPos?: Vec2
}

/**
 * クエスト間の依存関係を示すシェブロン矢印エッジ
 * SVG の <g> 要素を返すため、親の <svg> タグ内に配置すること
 *
 * 実装: ノードの円半径分を切り詰めた直線の上に
 * 一定間隔でシェブロン(>記号)を並べて方向を示す
 */
export const EdgePattern: FC<EdgePatternProps> = ({
  source,
  target,
  isPreview = false,
  targetPos,
}) => {
  const x1 = source.x
  const y1 = source.y
  const x2 = targetPos?.x ?? target?.x ?? source.x
  const y2 = targetPos?.y ?? target?.y ?? source.y

  const dx = x2 - x1
  const dy = y2 - y1
  const dist = Math.sqrt(dx * dx + dy * dy)

  // ノードの円半径分だけ両端を縮める
  const radius = 24
  if (dist <= radius * 2) return null

  const ux = dx / dist // x方向の単位ベクトル
  const uy = dy / dist // y方向の単位ベクトル

  // エッジの実際の始点・終点
  const sx = x1 + ux * radius
  const sy = y1 + uy * radius
  const tx = x2 - ux * radius
  const ty = y2 - uy * radius

  const actualDist = dist - radius * 2
  // 法線ベクトル (シェブロンの幅方向)
  const nx = -uy
  const ny = ux

  const spacing = 16 // シェブロン間隔 (px)
  const w = 6        // シェブロンの奥行き
  const h = 10       // シェブロンの幅

  const chevrons: string[] = []
  for (let i = 8; i < actualDist - 8; i += spacing) {
    const cx = sx + ux * i
    const cy = sy + uy * i
    const tipX   = cx + ux * (w / 2)
    const tipY   = cy + uy * (w / 2)
    const backX  = cx - ux * (w / 2)
    const backY  = cy - uy * (w / 2)
    const leftX  = backX + nx * (h / 2)
    const leftY  = backY + ny * (h / 2)
    const rightX = backX - nx * (h / 2)
    const rightY = backY - ny * (h / 2)
    chevrons.push(`M ${leftX} ${leftY} L ${tipX} ${tipY} L ${rightX} ${rightY}`)
  }

  const baseColor   = isPreview ? 'rgba(85, 255, 85, 0.5)' : '#a39698'
  const strokeColor = isPreview ? '#55FF55' : '#6d585b'

  return (
    <g className="drop-shadow-sm">
      <line
        x1={sx} y1={sy} x2={tx} y2={ty}
        stroke={baseColor} strokeWidth="10" strokeLinecap="round"
      />
      {chevrons.length > 0 && (
        <path
          d={chevrons.join(' ')}
          fill="none"
          stroke={strokeColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="miter"
        />
      )}
    </g>
  )
}
