'use client'

import { useEffect, useState } from 'react'
import { PulseDot } from './hud'

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Makassar',
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Makassar',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

export function LiveClock({ className }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div
      className={`items-center gap-3 rounded-[3px] border border-white/10 bg-white/[0.025] px-3 py-1.5 ${className ?? ''}`}
      role="timer"
      aria-label="Waktu Indonesia Tengah"
    >
      <PulseDot />
      <div className="flex flex-col leading-tight">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
          {now ? dateFormatter.format(now) : '--- --- ----'}
        </span>
        <span className="font-mono text-sm font-medium tabular-nums tracking-wider text-white">
          {now ? timeFormatter.format(now).replaceAll('.', ':') : '--:--:--'}
          <span className="ml-1.5 text-[10px] text-slate-400">WITA</span>
        </span>
      </div>
    </div>
  )
}
