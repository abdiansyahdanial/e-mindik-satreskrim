import type { LucideIcon } from 'lucide-react'

export const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ')

type CornerSize = 'sm' | 'md' | 'lg'

const cornerSizes: Record<CornerSize, string> = {
  sm: 'size-2',
  md: 'size-3',
  lg: 'size-4',
}

/** L-shaped precision brackets on all four corners. Brightens when the nearest `group/card` is hovered. */
export function HudCorners({ size = 'md', className }: { size?: CornerSize; className?: string }) {
  const base = cn(
    'pointer-events-none absolute border-white/60 drop-shadow-[0_0_3px_rgba(255,255,255,0.6)] transition-colors duration-300 group-hover/card:border-white',
    cornerSizes[size],
  )
  return (
    <span aria-hidden="true" className={className}>
      <span className={cn(base, '-left-px -top-px border-l border-t')} />
      <span className={cn(base, '-right-px -top-px border-r border-t')} />
      <span className={cn(base, '-bottom-px -left-px border-b border-l')} />
      <span className={cn(base, '-bottom-px -right-px border-b border-r')} />
    </span>
  )
}

type HudCardProps = {
  children: React.ReactNode
  className?: string
  contentClassName?: string
  as?: 'div' | 'section' | 'article'
  dashed?: boolean
  'aria-labelledby'?: string
}

/** Translucent glass card with corner brackets and a white backlight on hover. */
export function HudCard({
  children,
  className,
  contentClassName,
  as: Tag = 'div',
  dashed = false,
  ...rest
}: HudCardProps) {
  return (
    <Tag
      {...rest}
      className={cn(
        'group/card relative rounded-md border bg-zinc-950/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_40px_-15px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-[border-color,box-shadow] duration-500',
        dashed ? 'border-dashed border-white/15 border-t-white/25' : 'border border-white/10 border-t-white/25',
        'hover:border-crimson/35 hover:border-t-crimson/55 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_0_48px_-16px_rgb(239_68_68/0.35)]',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-md opacity-0 transition-opacity duration-500 group-hover/card:opacity-100"
      >
        <span className="absolute -top-1/2 left-1/2 aspect-square w-[120%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.09),transparent)]" />
      </span>
      <HudCorners />
      <div className={cn('relative', contentClassName)}>{children}</div>
    </Tag>
  )
}

export function PulseDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn('relative inline-flex size-1.5 shrink-0', className)}>
      <span className="absolute inset-0 animate-radar rounded-full bg-crimson" />
      <span className="relative inline-flex size-1.5 rounded-full bg-crimson shadow-[0_0_8px_rgb(239_68_68/0.95)]" />
    </span>
  )
}

/** Bracketed micro tag, e.g. `[• +1 BARU]`. */
export function BracketTag({ children, pulse = false, className }: { children: React.ReactNode; pulse?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-white',
        className,
      )}
    >
      <span aria-hidden="true" className="text-white/40">
        [
      </span>
      {pulse && <PulseDot />}
      {children}
      <span aria-hidden="true" className="text-white/40">
        ]
      </span>
    </span>
  )
}

type TacticalButtonProps = {
  label: string
  href?: string
  onClick?: () => void
  variant?: 'accent' | 'primary' | 'ghost' | 'crimson-glow'
  icon?: LucideIcon
  trailingIcon?: LucideIcon
  size?: 'sm' | 'md'
  className?: string
}

export function TacticalButton({
  label,
  href,
  onClick,
  variant = 'ghost',
  icon: Icon,
  trailingIcon: TrailingIcon,
  size = 'md',
  className,
}: TacticalButtonProps) {
  const classes = variant === 'crimson-glow' ? cn(
    'group/card relative bg-gradient-to-b from-red-950/90 via-red-900/40 to-zinc-950 border border-red-500/60 text-red-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_0_20px_rgba(239,68,68,0.35)] hover:border-red-400 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_0_30px_rgba(239,68,68,0.55)] transition-all duration-300 font-mono text-[11px] md:text-xs font-semibold tracking-wider uppercase px-4 py-2 rounded-[3px] flex items-center justify-center shrink-0 gap-2',
    className
  ) : cn(
    'group/card relative inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden rounded-[3px] border font-mono font-medium uppercase tracking-[0.14em] transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
    size === 'md' ? 'h-11 px-5 text-xs' : 'h-9 px-3.5 text-[11px]',
    variant === 'accent'
      ? 'border-crimson/70 bg-crimson-deep/20 text-white shadow-[0_0_28px_-8px_rgb(239_68_68/0.7),inset_0_1px_0_rgb(255_255_255/0.18)] hover:border-crimson hover:bg-crimson-deep hover:shadow-[0_0_36px_-4px_rgb(239_68_68/0.75)]'
      : variant === 'primary'
      ? 'border-white/50 bg-white/[0.08] text-white shadow-[0_0_24px_-8px_rgb(255_255_255/0.55),inset_0_1px_0_rgb(255_255_255/0.12)] hover:border-white hover:bg-white hover:text-obsidian hover:shadow-[0_0_32px_-4px_rgb(255_255_255/0.6)]'
      : 'border-white/20 bg-zinc-900/80 text-white hover:border-white/40 hover:bg-zinc-800 hover:text-white',
    className,
  )

  const content = (
    <>
      {variant !== 'ghost' && variant !== 'crimson-glow' && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-1/4 animate-shimmer bg-gradient-to-r from-transparent via-white/25 to-transparent"
        />
      )}
      <HudCorners size="sm" />
      {Icon && <Icon className="relative size-3.5" aria-hidden="true" />}
      <span className="relative">{label}</span>
      {TrailingIcon && (
        <TrailingIcon
          className="relative size-3.5 transition-transform group-hover/card:translate-x-0.5"
          aria-hidden="true"
        />
      )}
    </>
  )

  if (href) {
    return (
      <a href={href} className={classes}>
        {content}
      </a>
    )
  }
  return (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>
  )
}

export function SectionHeader({
  id,
  code,
  title,
  icon: Icon,
  meta,
}: {
  id: string
  code: string
  title: string
  icon: LucideIcon
  meta?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] pb-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-[3px] border border-white/15 bg-white/[0.03] text-white">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">{code}</p>
          <h2 id={id} className="truncate text-base font-semibold tracking-tight text-white md:text-lg">
            {title}
          </h2>
        </div>
      </div>
      {meta}
    </div>
  )
}
