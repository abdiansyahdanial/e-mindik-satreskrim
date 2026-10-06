'use client'

import { useEffect, useRef } from 'react'
import { FilePen, LogOut, Menu, Search } from 'lucide-react'
import { LiveClock } from './live-clock'
import { HudCorners, TacticalButton } from './hud'

export function CommandBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-white/[0.07] bg-obsidian/75 px-4 backdrop-blur-xl md:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        className="grid size-10 shrink-0 place-items-center rounded-[3px] border border-white/10 text-white transition-colors hover:border-white/40 lg:hidden"
        aria-label="Buka menu navigasi"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      <form role="search" className="relative min-w-0 flex-1 md:max-w-md" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="global-search" className="sr-only">
          Cari perkara
        </label>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
        <input
          ref={searchRef}
          id="global-search"
          type="search"
          placeholder="Cari No. LP, Tersangka, Pasal, Saksi..."
          className="h-10 w-full rounded-[3px] border border-white/10 bg-white/[0.025] pl-10 pr-20 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-white/40 focus:bg-white/[0.05] focus:shadow-[0_0_24px_-10px_rgb(255_255_255/0.5)]"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-[2px] border border-white/15 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-slate-400 sm:block">
          CTRL + K
        </kbd>
      </form>

      <LiveClock className="hidden md:flex" />

      <div className="ml-auto flex items-center gap-3">
        <TacticalButton label="Buat Mindik" icon={FilePen} variant="accent" size="sm" className="hidden sm:inline-flex" />

        <div className="group/card relative hidden items-center gap-3 rounded-[3px] border border-white/10 bg-white/[0.025] py-1.5 pl-1.5 pr-3 xl:flex">
          <HudCorners size="sm" />
          <span className="grid size-9 place-items-center rounded-[2px] border border-white/25 bg-white/[0.06] font-mono text-xs font-bold text-white">
            SA
          </span>
          <div className="leading-tight">
            <p className="text-xs font-semibold text-white">Super Admin / Pengembang Web</p>
            <p className="mt-0.5 font-mono text-[10px] tracking-[0.15em] text-slate-400">
              <span className="text-white">93060021</span> <span aria-hidden="true">•</span> SUPER ADMIN
            </p>
          </div>
        </div>

        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-[3px] border border-white/10 px-3 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-300 transition-colors hover:border-white/40 hover:bg-white/[0.05] hover:text-white active:scale-[0.97]"
        >
          <LogOut className="size-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Keluar</span>
          <span className="sr-only sm:hidden">Keluar</span>
        </button>
      </div>
    </header>
  )
}
