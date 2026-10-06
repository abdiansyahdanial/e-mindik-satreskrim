import { FileText, Folder, ShieldCheck, Users, type LucideIcon } from 'lucide-react'
import { BracketTag, HudCard } from './hud'

type Telemetry = {
  code: string
  label: string
  icon: LucideIcon
  value: string
  tag: string
  caption: string
  pulse?: boolean
  progress: number
}

const TELEMETRY: Telemetry[] = [
  { code: 'TLM-01', label: 'Perkara Aktif', icon: Folder, value: '01', tag: '+1 Baru', caption: 'minggu ini', pulse: true, progress: 25 },
  { code: 'TLM-02', label: 'Dokumen Terbit', icon: FileText, value: '00', tag: 'DOCX & PDF', caption: 'Format standar', progress: 3 },
  { code: 'TLM-03', label: 'Tahanan Rutan', icon: ShieldCheck, value: '02', tag: 'Sprin Han', caption: 'Rutan Polres', progress: 40 },
  { code: 'TLM-04', label: 'Personel Siaga', icon: Users, value: '12', tag: 'Online', caption: 'Siaga tugas', pulse: true, progress: 80 },
]

export function TelemetryCards() {
  return (
    <section aria-label="Telemetri status" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {TELEMETRY.map((item) => (
        <HudCard key={item.code} contentClassName="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] tracking-[0.3em] text-slate-500">{item.code}</p>
              <h3 className="mt-1 font-mono text-xs font-medium uppercase tracking-[0.2em] text-slate-300">{item.label}</h3>
            </div>
            <span className="grid size-10 place-items-center rounded-[3px] border border-white/12 bg-white/[0.03] text-white transition-colors group-hover/card:border-white/40">
              <item.icon className="size-[18px]" aria-hidden="true" />
            </span>
          </div>

          <p className="font-mono text-5xl font-bold tabular-nums leading-none tracking-tight text-white [text-shadow:0_0_24px_rgb(255_255_255/0.25)]">
            {item.value}
          </p>

          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <BracketTag pulse={item.pulse}>{item.tag}</BracketTag>
            <span className="text-xs text-slate-400">{item.caption}</span>
          </p>

          <div className="flex items-center gap-3">
            <div
              className="relative h-px flex-1 bg-white/10"
              role="progressbar"
              aria-label={`Indikator ${item.label}`}
              aria-valuenow={item.progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span
                className="absolute inset-y-0 left-0 bg-white shadow-[0_0_8px_rgb(255_255_255/0.9)]"
                style={{ width: `${Math.max(item.progress, 2)}%` }}
              />
            </div>
            <span className="font-mono text-[10px] tabular-nums text-slate-500">{String(item.progress).padStart(2, '0')}%</span>
          </div>
        </HudCard>
      ))}
    </section>
  )
}
