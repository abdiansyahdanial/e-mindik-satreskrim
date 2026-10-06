'use client'

import Image from 'next/image'
import { useState } from 'react'
import { X } from 'lucide-react'
import { Sidebar } from './sidebar'
import { CommandBar } from './command-bar'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="relative flex min-h-dvh bg-obsidian">
      <AmbientBackdrop />

      <div className="sticky top-0 z-40 hidden h-dvh w-[84px] shrink-0 lg:block">
        <Sidebar className="absolute inset-y-0 left-0" />
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu navigasi">
          <button
            type="button"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            aria-label="Tutup menu"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative h-full w-72 animate-in slide-in-from-left duration-300">
            <Sidebar forceExpanded onNavigate={() => setDrawerOpen(false)} />
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="absolute -right-12 top-4 grid size-10 place-items-center rounded-[3px] border border-white/15 bg-obsidian text-white"
              aria-label="Tutup menu"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <CommandBar onOpenMenu={() => setDrawerOpen(true)} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  )
}

function AmbientBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute left-[20%] top-[10%] size-[60vmax] animate-smoke-a rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.045),transparent)] blur-3xl" />
      <div className="absolute bottom-[-20%] right-[-10%] size-[55vmax] animate-smoke-b rounded-full bg-[radial-gradient(closest-side,rgb(148_163_184/0.06),transparent)] blur-3xl" />
      <div className="absolute left-1/2 top-1/2 size-[40vmax] -translate-x-1/2 -translate-y-1/2 animate-smoke-c rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.035),transparent)] blur-2xl" />

      <div className="absolute left-1/2 top-1/2 w-[min(52vmin,560px)] -translate-x-1/2 -translate-y-1/2 lg:left-[calc(50%+42px)]">
        <Image
          src="/images/logo-satreskrim-koltim.png"
          alt=""
          width={500}
          height={700}
          className="h-auto w-full opacity-[0.045] grayscale"
        />
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgb(5_7_10/0.85))]" />
    </div>
  )
}
