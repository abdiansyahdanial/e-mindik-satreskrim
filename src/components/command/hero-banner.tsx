import { Plus, Zap } from 'lucide-react'
import { BracketTag, HudCard, TacticalButton } from './hud'

export function HeroBanner({ onNewCase, onOpenGenerator }: { onNewCase?: () => void, onOpenGenerator?: () => void }) {
  return (
    <HudCard
      as="section"
      aria-labelledby="hero-title"
      className="overflow-hidden !rounded-[20px] !border-[#FBDBAF]/20 !bg-[linear-gradient(135deg,rgba(196,90,24,0.28)_0%,rgba(22,19,16,0.92)_48%,rgba(14,12,10,0.96)_100%)] shadow-[0_20px_50px_rgba(0,0,0,0.65)]"
      contentClassName="px-6 py-8 md:px-10 md:py-12"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-y-12 -inset-x-10 hud-grid [mask-image:radial-gradient(ellipse_at_70%_50%,black,transparent_70%)]"
      />
      <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-24 h-80 w-[36rem] max-w-full">
        <span className="absolute inset-0 rounded-full bg-[#E07020]/15 blur-3xl" />
        <span className="absolute left-1/4 top-1/3 h-2/3 w-2/3 rounded-full bg-[#FF5A1F]/12 blur-3xl" />
      </div>
      <RadarScope />

      <div className="relative flex max-w-3xl flex-col gap-5">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <BracketTag pulse className="!bg-white !text-[#0E0C0A] !border-white font-bold">Database Reserse Digital</BracketTag>
          <span className="text-sm text-[#FBDBAF]/80">Satreskrim Polres Kolaka Timur</span>
        </p>

        <h1 id="hero-title" className="heading-font text-balance text-3xl font-bold leading-[1.08] tracking-[0.04em] text-white md:text-5xl">
          Pusat Operasional Database & Administrasi Reserse Kriminal
        </h1>

        <div className="mt-2 flex flex-wrap gap-3">
          <TacticalButton
            label="+ Registrasi LP Baru"
            icon={Plus}
            onClick={onNewCase}
            variant="ghost"
            className="!border-[#FBDBAF]/35 !bg-transparent !text-[#FBDBAF] hover:!border-white hover:!bg-white/10 hover:!text-white"
          />
          <TacticalButton
            label="Mulai Buat Dokumen"
            icon={Zap}
            onClick={() => onOpenGenerator?.()}
            variant="primary"
            className="!bg-white !border-white !text-[#0E0C0A] hover:!bg-[#E07020] hover:!border-[#E07020] hover:!text-white"
          />
        </div>

        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-[#FBDBAF]/15 pt-4 font-mono text-[10px] uppercase tracking-[0.2em]">
          <div className="flex gap-2">
            <dt className="text-[#FBDBAF]/55">Status</dt>
            <dd className="text-white font-semibold">Operasional</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-[#FBDBAF]/55">Satuan</dt>
            <dd className="text-white font-semibold">Sat Reskrim</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-[#FBDBAF]/55">Zona</dt>
            <dd className="text-[#FF5A1F] font-semibold">WITA / UTC+8</dd>
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
      <div className="absolute inset-0 rounded-full border border-[#FBDBAF]/10" />
      <div className="absolute inset-[16%] rounded-full border border-[#FBDBAF]/12" />
      <div className="absolute inset-[32%] rounded-full border border-[#E07020]/20" />
      <div className="absolute inset-[46%] rounded-full border border-[#FF5A1F]/30" />
      <div className="absolute inset-x-0 top-1/2 h-px bg-[#FBDBAF]/10" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-[#FBDBAF]/10" />
      <div className="absolute inset-0 animate-sweep rounded-full bg-[conic-gradient(from_0deg,rgba(255,90,31,0.22),transparent_24%)] [mask-image:radial-gradient(closest-side,black_98%,transparent)]" />
      <span className="absolute left-[62%] top-[30%] size-1.5 rounded-full bg-[#FF5A1F] shadow-[0_0_12px_#FF5A1F]" />
      <span className="absolute left-[34%] top-[64%] size-1 rounded-full bg-[#FBDBAF]/80" />
    </div>
  )
}
