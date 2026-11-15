import { Plus, Zap } from 'lucide-react'
import { BracketTag, HudCard, TacticalButton } from './hud'

export function HeroBanner({ onNewCase, onOpenGenerator }: { onNewCase?: () => void, onOpenGenerator?: () => void }) {
  return (
    <HudCard
      as="section"
      aria-labelledby="hero-title"
      className="overflow-hidden !rounded-[18px] !border-[rgba(255,42,42,0.28)] !bg-[linear-gradient(125deg,rgba(17,22,31,0.95)_0%,rgba(22,28,40,0.90)_55%,rgba(185,28,28,0.28)_100%)] shadow-[0_20px_50px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]"
      contentClassName="px-6 py-8 md:px-10 md:py-12"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-y-12 -inset-x-10 hud-grid [mask-image:radial-gradient(ellipse_at_70%_50%,black,transparent_70%)]"
      />
      <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-24 h-80 w-[36rem] max-w-full">
        <span className="absolute inset-0 rounded-full bg-[#FF2A2A]/16 blur-3xl" />
        <span className="absolute left-1/4 top-1/3 h-2/3 w-2/3 rounded-full bg-[#DC2626]/12 blur-3xl" />
      </div>
      <RadarScope />

      <div className="relative flex max-w-3xl flex-col gap-5">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <BracketTag pulse className="!bg-white !text-[#0B0E14] !border-white font-extrabold">Database Reserse Digital</BracketTag>
          <span className="text-sm text-[#CBD5E1]/85">Satreskrim Polres Kolaka Timur</span>
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
            className="!border-[rgba(203,213,225,0.38)] !bg-[rgba(11,14,20,0.65)] !text-[#E2E8F0] hover:!border-[#FF2A2A] hover:!bg-[rgba(255,42,42,0.12)] hover:!text-white hover:-translate-y-px"
          />
          <TacticalButton
            label="Mulai Buat Dokumen"
            icon={Zap}
            onClick={() => onOpenGenerator?.()}
            variant="primary"
            className="!bg-white !border-white !text-[#0B0E14] font-bold shadow-[0_0_28px_rgba(255,42,42,0.35)] hover:!bg-[#FF2A2A] hover:!border-[#FF2A2A] hover:!text-white hover:shadow-[0_0_32px_rgba(255,42,42,0.65)] hover:-translate-y-px"
          />
        </div>

        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-[rgba(148,163,184,0.16)] pt-4 font-mono text-[10px] uppercase tracking-[0.2em]">
          <div className="flex gap-2">
            <dt className="text-[#64748B]">Status</dt>
            <dd className="text-white font-semibold">Operasional</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-[#64748B]">Satuan</dt>
            <dd className="text-white font-semibold">Sat Reskrim</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-[#64748B]">Zona</dt>
            <dd className="text-[#FF2A2A] font-semibold">WITA / UTC+8</dd>
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
      <div className="absolute inset-0 rounded-full border border-[rgba(148,163,184,0.12)]" />
      <div className="absolute inset-[16%] rounded-full border border-[rgba(148,163,184,0.14)]" />
      <div className="absolute inset-[32%] rounded-full border border-[rgba(255,42,42,0.22)]" />
      <div className="absolute inset-[46%] rounded-full border border-[rgba(255,42,42,0.35)]" />
      <div className="absolute inset-x-0 top-1/2 h-px bg-[rgba(148,163,184,0.12)]" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-[rgba(148,163,184,0.12)]" />
      <div className="absolute inset-0 animate-sweep rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,42,42,0.38)_60deg,transparent_90deg)] [mask-image:radial-gradient(closest-side,black_98%,transparent)]" />
      <span className="absolute left-[62%] top-[30%] size-1.5 rounded-full bg-[#FF2A2A] shadow-[0_0_12px_#FF2A2A]" />
      <span className="absolute left-[34%] top-[64%] size-1 rounded-full bg-[#CBD5E1]/85" />
    </div>
  )
}
