import { useState, useEffect } from 'react'

/** 画面幅が 640px 未満のとき true を返す */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => window.innerWidth < 640)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return mobile
}
