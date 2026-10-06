import { Plus, Zap } from 'lucide-react'
import { BracketTag, HudCard, TacticalButton } from './hud'

export function HeroBanner({ onNewCase, onOpenGenerator }: { onNewCase?: () => void, onOpenGenerator?: () => void }) {
  return (
    <HudCard as="section" aria-labelledby="hero-title" className="overflow-hidden" contentClassName="px-6 py-8 md:px-10 md:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-y-12 -inset-x-10 hud-grid [mask-image:radial-gradient(ellipse_at_70%_50%,black,transparent_70%)]"
      />
      <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-24 h-80 w-[36rem] max-w-full">
        <span className="absolute inset-0 rounded-full bg-white/[0.08] blur-3xl" />
        <span className="absolute left-1/4 top-1/3 h-2/3 w-2/3 rounded-full bg-crimson/[0.08] blur-3xl" />
      </div>
      <RadarScope />

      <div className="relative flex max-w-3xl flex-col gap-5">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <BracketTag pulse>Database Reserse Digital</BracketTag>
          <span className="text-sm text-slate-400">Satreskrim Polres Kolaka Timur</span>
        </p>

        <h1 id="hero-title" className="text-balance text-3xl font-bold leading-[1.05] tracking-tight text-white md:text-5xl">
          Pusat Operasional Database & Administrasi Reserse Kriminal
        </h1>

        <div className="mt-2 flex flex-wrap gap-3">
          <TacticalButton label="Registrasi LP Baru" icon={Plus} onClick={onNewCase} variant="primary" />
          <TacticalButton label="Mulai Buat Dokumen" icon={Zap} onClick={() => onOpenGenerator?.()} variant="crimson-glow" />
        </div>

        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-white/[0.07] pt-4 font-mono text-[10px] uppercase tracking-[0.2em]">
          <div className="flex gap-2">
            <dt className="text-slate-500">Status</dt>
            <dd className="text-white">Operasional</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-slate-500">Satuan</dt>
            <dd className="text-white">Sat Reskrim</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-slate-500">Zona</dt>
            <dd className="text-white">WITA / UTC+8</dd>
          </div>
        </dl>
      </div>
    </HudCard>
  )
}

function RadarScope() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute right-[-6%] top-1/2 hidden aspect-square w-[420px] -translate-y-1/2 lg:block"
    >
      <div className="absolute inset-0 rounded-full border border-white/[0.06]" />
      <div className="absolute inset-[16%] rounded-full border border-white/[0.07]" />
      <div className="absolute inset-[32%] rounded-full border border-white/[0.08]" />
      <div className="absolute inset-[46%] rounded-full border border-white/15" />
      <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.06]" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-white/[0.06]" />
      <div className="absolute inset-0 animate-sweep rounded-full bg-[conic-gradient(from_0deg,rgb(255_255_255/0.14),transparent_22%)] [mask-image:radial-gradient(closest-side,black_98%,transparent)]" />
      <span className="absolute left-[62%] top-[30%] size-1.5 rounded-full bg-white shadow-[0_0_10px_white]" />
      <span className="absolute left-[34%] top-[64%] size-1 rounded-full bg-white/70" />
    </div>
  )
}
