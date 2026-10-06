'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Archive,
  FileCode2,
  FilePen,
  FilePlus2,
  FolderLock,
  LayoutGrid,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { cn, PulseDot } from './hud'

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  badge?: string
  active?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard Taktis', href: '/', icon: LayoutGrid, active: true },
  { label: 'Input Dumas / Baru', href: '#input-dumas', icon: FilePlus2, badge: '1' },
  { label: 'Berkas Perkara', href: '#berkas-perkara', icon: FolderLock, badge: '1' },
  { label: 'Generator Mindik', href: '#generator-mindik', icon: FilePen, badge: 'DOCX' },
  { label: 'Arsip Dokumen', href: '#arsip-dokumen', icon: Archive, badge: '0' },
  { label: 'Direktori Personel', href: '#direktori-personel', icon: Users, badge: '7' },
  { label: 'Template Studio', href: '#template-studio', icon: FileCode2, badge: 'STORAGE' },
]

const TOUCH_QUERY = '(hover: none), (pointer: coarse)'

type SidebarProps = {
  /** Keep the rail permanently expanded (mobile drawer). */
  forceExpanded?: boolean
  onNavigate?: () => void
  className?: string
}

/**
 * Collapsed icon rail that expands on hover, keyboard focus, or first tap (touch).
 * Escape collapses it; selections are announced through a polite live region.
 */
export function Sidebar({ forceExpanded = false, onNavigate, className }: SidebarProps) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('')
  const navRef = useRef<HTMLElement>(null)
  const expanded = forceExpanded || open

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpen(false)
      const active = document.activeElement
      if (active instanceof HTMLElement && navRef.current?.contains(active)) active.blur()
    }
    function handlePointerDown(event: PointerEvent) {
      if (window.matchMedia(TOUCH_QUERY).matches && !navRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [])

  function handleItemClick(event: React.MouseEvent, label: string) {
    if (!forceExpanded && window.matchMedia(TOUCH_QUERY).matches && !open) {
      event.preventDefault()
      setOpen(true)
      return
    }
    setStatus(`${label} dipilih`)
    onNavigate?.()
  }

  return (
    <aside
      ref={navRef}
      aria-label="Navigasi utama"
      data-expanded={expanded}
      onPointerEnter={(e) => e.pointerType !== 'touch' && setOpen(true)}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'touch' && !navRef.current?.contains(document.activeElement)) setOpen(false)
      }}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false)
      }}
      className={cn(
        'group/rail flex h-full flex-col overflow-hidden border-r border-white/[0.07] bg-obsidian-raised/90 backdrop-blur-xl',
        'transition-[width,box-shadow] duration-700 ease-expand will-change-[width]',
        expanded ? 'w-72 shadow-[24px_0_60px_-20px_rgb(0_0_0/0.9)]' : 'w-[84px]',
        className,
      )}
    >
      <div className="flex h-full w-72 flex-col">
        <Brand expanded={expanded} />

        <div className="flex h-11 items-center gap-3 border-b border-white/[0.07] px-5">
          <span className="flex w-11 shrink-0 justify-center">
            <PulseDot />
          </span>
          <span className={cn('flex flex-1 items-center justify-between transition-opacity duration-300', fade(expanded))}>
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-white">Super Admin</span>
            <span className="rounded-[2px] border border-white/15 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.2em] text-slate-400">
              PRESISI
            </span>
          </span>
        </div>

        <nav aria-label="Menu" className="flex-1 overflow-y-auto overflow-x-hidden py-3">
          <ul role="list" className="flex flex-col">
            {NAV_ITEMS.map((item) => (
              <li
                key={item.label}
                className="relative after:pointer-events-none after:absolute after:inset-x-6 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-white/[0.01] after:via-white/[0.07] after:to-transparent last:after:hidden"
              >
                <a
                  href={item.href}
                  aria-current={item.active ? 'page' : undefined}
                  onClick={(e) => handleItemClick(e, item.label)}
                  className={cn(
                    'relative mx-3 my-1.5 flex h-12 items-center gap-3 rounded-[4px] px-2 outline-none transition-colors duration-150',
                    'focus-visible:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.7)]',
                    item.active
                      ? 'bg-white/[0.06] text-white'
                      : 'text-slate-400 hover:bg-white/[0.04] hover:text-white focus-visible:text-white',
                  )}
                >
                  {item.active && (
                    <span
                      aria-hidden="true"
                      className="absolute -left-3 inset-y-2 w-0.5 rounded-r bg-white shadow-[0_0_10px_rgb(255_255_255/0.9)]"
                    />
                  )}
                  <span
                    className={cn(
                      'grid size-11 shrink-0 place-items-center rounded-[3px] border transition-colors',
                      item.active
                        ? 'border-white/40 bg-white/[0.08] shadow-[0_0_18px_-6px_rgb(255_255_255/0.6)]'
                        : 'border-white/10 bg-white/[0.02]',
                    )}
                  >
                    <item.icon className="size-[18px]" aria-hidden="true" />
                  </span>
                  <span
                    className={cn(
                      'flex flex-1 items-center justify-between gap-2 pr-1 transition-opacity duration-300',
                      fade(expanded),
                    )}
                  >
                    <span className="whitespace-nowrap text-sm font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="rounded-[2px] border border-white/12 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] tracking-[0.15em] text-slate-300">
                        {item.badge}
                      </span>
                    )}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-white/[0.07] p-3">
          <a
            href="#kelola-rbac"
            onClick={(e) => handleItemClick(e, 'Kelola Akun RBAC')}
            className="group/card relative flex h-14 items-center gap-3 rounded-[4px] border border-white/10 bg-white/[0.03] px-2 text-white outline-none transition-colors hover:border-white/30 focus-visible:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.7)]"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-[3px] border border-white/20 bg-white/[0.05]">
              <UserCog className="size-[18px]" aria-hidden="true" />
            </span>
            <span className={cn('flex flex-1 items-center justify-between pr-1 transition-opacity duration-300', fade(expanded))}>
              <span className="whitespace-nowrap text-sm font-semibold">Kelola Akun RBAC</span>
              <span className="rounded-[2px] border border-white/30 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.15em] text-white">
                ADMIN
              </span>
            </span>
          </a>
        </div>

        <div className="flex h-12 items-center gap-3 border-t border-white/[0.07] px-5">
          <span className="flex w-11 shrink-0 justify-center font-mono text-[10px] text-slate-500">v2.1</span>
          <span className={cn('whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 transition-opacity duration-300', fade(expanded))}>
            Mindik Presisi // Online
          </span>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {status}
      </p>
    </aside>
  )
}

function fade(expanded: boolean) {
  return expanded ? 'opacity-100 delay-150' : 'pointer-events-none opacity-0'
}

function Brand({ expanded }: { expanded: boolean }) {
  return (
    <div className="flex h-20 shrink-0 items-center gap-3 border-b border-white/[0.07] px-5">
      <span className="relative grid size-11 shrink-0 place-items-center">
        <img
          src="/images/logo-satreskrim-koltim.png"
          alt="Lambang Sat Reskrim Polres Kolaka Timur"
          width={40}
          height={56}
          className="h-11 w-auto drop-shadow-[0_0_10px_rgb(255_255_255/0.15)]"
        />
      </span>
      <span className={cn('min-w-0 transition-opacity duration-300', fade(expanded))}>
        <span className="block whitespace-nowrap text-sm font-bold uppercase tracking-[0.08em] text-white">
          E-Mindik Satreskrim
        </span>
        <span className="block whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">
          Polres Kolaka Timur
        </span>
      </span>
    </div>
  )
}
