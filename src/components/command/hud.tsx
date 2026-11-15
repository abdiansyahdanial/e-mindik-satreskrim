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
    'pointer-events-none absolute border-[#E07020]/70 drop-shadow-[0_0_4px_rgba(224,112,32,0.45)] transition-colors duration-300 group-hover/card:border-[#FF5A1F]',
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

/** Translucent obsidian glass card with solar-orange corner brackets and warm spotlight lift on hover. */
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
        'cyber-card group/card relative rounded-[18px] border bg-[rgba(18,14,11,0.68)] shadow-[inset_0_1px_0_rgba(251,219,175,0.08),0_14px_36px_-12px_rgba(0,0,0,0.65)] backdrop-blur-[18px] transition-[border-color,box-shadow,background-color,transform] duration-300',
        dashed ? 'border-dashed border-[#FBDBAF]/25 border-t-[#E07020]/50' : 'border border-[#FBDBAF]/15 border-t-[#FBDBAF]/25',
        'hover:border-[#FBDBAF]/35 hover:border-t-[#E07020]/60',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-[#E07020]/60 to-transparent"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[18px] opacity-0 transition-opacity duration-500 group-hover/card:opacity-100"
      >
        <span className="absolute -top-1/2 left-1/2 aspect-square w-[120%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,90,31,0.12),transparent)]" />
      </span>
      <HudCorners />
      <div className={cn('relative', contentClassName)}>{children}</div>
    </Tag>
  )
}

export function PulseDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn('relative inline-flex size-1.5 shrink-0', className)}>
      <span className="absolute inset-0 animate-radar rounded-full bg-[#FF5A1F]" />
      <span className="relative inline-flex size-1.5 rounded-full bg-[#FF5A1F] shadow-[0_0_8px_rgba(255,90,31,0.95)]" />
    </span>
  )
}

/** Bracketed micro tag, e.g. `[• +1 BARU]`. */
export function BracketTag({ children, pulse = false, className }: { children: React.ReactNode; pulse?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#FBDBAF]/25 bg-[#181411] px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#FBDBAF]',
        className,
      )}
    >
      {pulse && <PulseDot />}
      <span>{children}</span>
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
    'group/card relative rounded-full bg-[#E07020] border border-[#FF5A1F] text-white shadow-[0_6px_24px_rgba(224,112,32,0.35)] hover:bg-white hover:border-white hover:text-[#0E0C0A] transition-all duration-200 font-mono text-[11px] md:text-xs font-bold tracking-wider uppercase px-5 py-2 flex items-center justify-center shrink-0 gap-2 cursor-pointer',
    className
  ) : cn(
    'group/card relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full border font-mono font-semibold uppercase tracking-[0.14em] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
    size === 'md' ? 'h-11 px-6 text-xs' : 'h-9 px-4 text-[11px]',
    variant === 'accent'
      ? 'border-[#FF5A1F] bg-[#E07020] text-white hover:bg-white hover:border-white hover:text-[#0E0C0A]'
      : variant === 'primary'
      ? 'border-white bg-white text-[#0E0C0A] font-bold hover:border-[#E07020] hover:bg-[#E07020] hover:text-white shadow-[0_4px_20px_rgba(255,255,255,0.16)]'
      : 'border-[#FBDBAF]/30 bg-transparent text-[#FBDBAF] hover:border-white hover:bg-white/10 hover:text-white',
    className,
  )

  const content = (
    <>
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
    <div className="flex items-start justify-between gap-4 border-b border-[#FBDBAF]/14 pb-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[#FBDBAF]/20 bg-[#181411] text-[#FF5A1F]">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#E07020]">{code}</p>
          <h2 id={id} className="heading-font truncate text-base font-semibold tracking-tight text-white md:text-lg">
            {title}
          </h2>
        </div>
      </div>
      {meta}
    </div>
  )
}
