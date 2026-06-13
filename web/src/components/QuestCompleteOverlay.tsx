import { useEffect, useRef } from 'react'
import type { QuestCompleteEvent } from '@/hooks/useQuestNotifications.js'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  life: number
  maxLife: number
}

const COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98FB98']
const AUTO_DISMISS_MS = 3500

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function createParticles(count: number): Particle[] {
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 3
  return Array.from({ length: count }, () => ({
    x: cx + randomBetween(-60, 60),
    y: cy + randomBetween(-20, 20),
    vx: randomBetween(-4, 4),
    vy: randomBetween(-8, -2),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: randomBetween(4, 10),
    life: 1,
    maxLife: randomBetween(60, 120),
  }))
}

interface Props {
  /** nonce 付きの完了イベント。null で非表示。nonce が変わると演出を再生する */
  event: (QuestCompleteEvent & { nonce: number }) | null
  /** 閉じる (自動 / クリック / 次の通知) */
  onDismiss: () => void
}

export function QuestCompleteOverlay({ event, onDismiss }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  // nonce が変わったときだけ演出 (パーティクル + 自動消滅タイマー) を起動する。
  // モード切替などの再レンダリングでは再生しない。
  const nonce = event?.nonce ?? null
  useEffect(() => {
    if (nonce == null) return

    // パーティクル生成
    let particles = createParticles(80)
    const canvas = canvasRef.current
    if (canvas) {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      const animate = () => {
        const ctx = canvas.getContext('2d')!
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        particles = particles
          .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.15, life: p.life - 1 / p.maxLife }))
          .filter((p) => p.life > 0)
        for (const p of particles) {
          ctx.globalAlpha = p.life
          ctx.fillStyle = p.color
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
        if (particles.length > 0) rafRef.current = requestAnimationFrame(animate)
      }
      rafRef.current = requestAnimationFrame(animate)
    }

    // 一定時間で自動的に閉じる
    const timer = setTimeout(() => onDismissRef.current(), AUTO_DISMISS_MS)

    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(timer)
    }
  }, [nonce])

  if (!event) return null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center cursor-pointer"
      style={{ top: '15%' }}
      data-testid="quest-complete-overlay"
      onClick={onDismiss}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ top: 0, left: 0, position: 'fixed' }}
      />
      <div
        className="relative px-6 py-3 border-4 font-bold text-center"
        style={{
          fontFamily: '"Courier New", Courier, monospace',
          backgroundColor: '#1a1a0a',
          color: '#FFD700',
          borderColor: '#FFD700',
          boxShadow: '0 0 20px rgba(255,215,0,0.5)',
          animation: 'quest-complete-pop 0.4s ease-out',
        }}
      >
        <div className="text-xs mb-1" style={{ color: '#C6C6C6' }}>クエスト完了！</div>
        <div className="text-lg">{event.questTitle}</div>
      </div>
      <style>{`
        @keyframes quest-complete-pop {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  )
}
