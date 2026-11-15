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

export function TelemetryCards({
  activeCasesCount = 0,
  docsCount = 0,
  detainedCount = 0,
  personnelCount = 0
}: {
  activeCasesCount?: number;
  docsCount?: number;
  detainedCount?: number;
  personnelCount?: number;
}) {
  const TELEMETRY: Telemetry[] = [
    { code: 'TLM-01', label: 'Perkara Aktif', icon: Folder, value: activeCasesCount.toString().padStart(2, '0'), tag: '+1 Baru', caption: 'minggu ini', pulse: true, progress: Math.min(activeCasesCount * 5, 100) },
    { code: 'TLM-02', label: 'Dokumen Terbit', icon: FileText, value: docsCount.toString().padStart(2, '0'), tag: 'DOCX & PDF', caption: 'Format standar', progress: Math.min(docsCount * 2, 100) },
    { code: 'TLM-03', label: 'Tahanan Rutan', icon: ShieldCheck, value: detainedCount.toString().padStart(2, '0'), tag: 'Sprin Han', caption: 'Rutan Polres', progress: Math.min(detainedCount * 10, 100) },
    { code: 'TLM-04', label: 'Personel Siaga', icon: Users, value: personnelCount.toString().padStart(2, '0'), tag: 'Online', caption: 'Siaga tugas', pulse: true, progress: 80 },
  ]

  return (
    <section aria-label="Telemetri status" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {TELEMETRY.map((item) => (
        <HudCard
          key={item.code}
          className="!bg-[rgba(18,14,11,0.68)] !border-[#FBDBAF]/15 hover:!bg-[#221C17]/90 hover:!border-[#E07020]/50 backdrop-blur-[18px] transition-all duration-300"
          contentClassName="flex flex-col gap-4 p-5"
        >
          <div className="flex items-start justify-between gap-3 border-b border-[#FBDBAF]/12 pb-3">
            <div>
              <p className="font-mono text-[10px] tracking-[0.3em] text-[#E07020]">{item.code}</p>
              <h3 className="mt-1 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#FBDBAF]/85">{item.label}</h3>
            </div>
            <span className="grid size-[38px] place-items-center rounded-full border border-[#FBDBAF]/25 bg-[#181411] text-[#FBDBAF] transition-all duration-200 group-hover/card:border-white group-hover/card:bg-white group-hover/card:text-[#0E0C0A]">
              <item.icon className="size-[17px]" aria-hidden="true" />
            </span>
          </div>

          <p className="heading-font text-[2.5rem] font-bold tabular-nums leading-none tracking-[0.04em] text-white">
            {item.value}
          </p>

          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <BracketTag pulse={item.pulse}>{item.tag}</BracketTag>
            <span className="text-xs text-[#FBDBAF]/65">{item.caption}</span>
          </p>

          <div className="flex items-center gap-3 border-t border-[#FBDBAF]/12 pt-3">
            <div
              className="relative h-1 flex-1 overflow-hidden rounded-full bg-[#221C17]"
              role="progressbar"
              aria-label={`Indikator ${item.label}`}
              aria-valuenow={item.progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#C45A18] to-[#FF5A1F]"
                style={{ width: `${Math.max(item.progress, 2)}%` }}
              />
            </div>
            <span className="font-mono text-[10px] font-semibold tabular-nums text-[#E07020]">{String(item.progress).padStart(2, '0')}%</span>
          </div>
        </HudCard>
      ))}
    </section>
  )
}

