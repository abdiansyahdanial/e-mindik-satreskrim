import { AlertTriangle, ArrowRight, Check, FolderLock, UserPlus } from 'lucide-react'
import { cn } from './hud'
import { BracketTag, HudCard, PulseDot, SectionHeader, TacticalButton } from './hud'
import { getPersonnelById } from '../../data/mockPersonnel'

const MILESTONES = ['Laporan', 'Sprin Sidik', 'SPDP', 'Tahap 1'] as const

export function CaseFilePanel({ cases = [], onSelectCase }: { cases?: any[], onSelectCase?: (c: any) => void }) {
  const activeCases = cases.filter(c => c.status === 'active');
  const displayCase = activeCases[0] || cases[0];
  const count = cases.length;

  return (
    <HudCard as="section" aria-labelledby="case-panel-title" contentClassName="flex h-full flex-col gap-5 p-5 md:p-6">
      <SectionHeader
        id="case-panel-title"
        code="OPS-01 // Berkas"
        title="Berkas Perkara Berjalan"
        icon={FolderLock}
        meta={
          <span className="shrink-0 rounded-[2px] border border-white/15 px-2 py-1 font-mono text-[10px] tracking-[0.2em] text-white">
            {count.toString().padStart(2, '0')} PERKARA
          </span>
        }
      />

      {displayCase ? (
        <CaseArticle caseData={displayCase} onSelectCase={onSelectCase} />
      ) : (
        <div className="p-4 text-center text-slate-400 font-mono text-sm">Tidak ada perkara berjalan</div>
      )}
    </HudCard>
  )
}

function CaseArticle({ caseData, onSelectCase }: { caseData: any, onSelectCase?: (c: any) => void }) {
  const leadInv = caseData.investigators?.[0] ? getPersonnelById(caseData.investigators[0].user_id) : null;
  const invName = leadInv ? `${leadInv.pangkat} ${leadInv.nama}` : 'Belum Ditunjuk';
  
  const s = (caseData.status || '').toLowerCase();
  let currentStep = 0;
  if (s.includes('sidik')) currentStep = 1;
  if (s.includes('spdp')) currentStep = 2;
  if (s.includes('tahap 1') || s.includes('p21') || s.includes('selesai')) currentStep = 3;

  return (
    <article className="flex flex-col gap-5 rounded-[4px] border border-white/10 bg-white/[0.02] p-4 md:p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-mono text-base font-semibold tracking-wide text-white md:text-lg">{caseData.no_lp}</h3>
        <span className="inline-flex items-center gap-2 rounded-[2px] border border-crimson/50 bg-crimson/10 px-2 py-1 font-mono text-[10px] tracking-[0.18em] text-red-100 shadow-[0_0_16px_-6px_rgb(239_68_68/0.7)]">
          {caseData.status === 'active' && <PulseDot />}
          {(caseData.status || 'ACTIVE').toUpperCase()}
        </span>
      </header>

      <dl className="grid gap-4 sm:grid-cols-3">
        <Detail label="Perkara" value={caseData.tindak_pidana || '-'} />
        <Detail label="Terlapor" value={caseData.person?.nama || caseData.terlapor_name || '-'} mono />
        <Detail label="Pelapor" value={caseData.pelapor_name || '-'} mono />
      </dl>

      <div className="flex items-center gap-3 rounded-[3px] border border-dashed border-white/20 bg-white/[0.025] px-3 py-2.5">
        <AlertTriangle className="size-4 shrink-0 text-white" aria-hidden="true" />
        <p className="text-sm text-slate-300">
          <span className="font-semibold text-white">Penyidik:</span> {invName}
        </p>
        {!leadInv && <BracketTag className="ml-auto hidden sm:inline-flex">Perlu Tindakan</BracketTag>}
      </div>

      <Milestones currentStep={currentStep} />

      <div className="flex flex-wrap gap-3">
        {!leadInv && <TacticalButton label="Tunjuk Penyidik" icon={UserPlus} size="sm" onClick={() => onSelectCase?.(caseData)} />}
        <TacticalButton label="Buka Berkas" trailingIcon={ArrowRight} variant="primary" size="sm" onClick={() => onSelectCase?.(caseData)} />
      </div>
    </article>
  )
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">{label}</dt>
      <dd className={cn('mt-1 truncate text-sm font-medium text-white', mono && 'font-mono tracking-wide')}>{value}</dd>
    </div>
  )
}

function Milestones({ currentStep }: { currentStep: number }) {
  return (
    <div>
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">Progres Penyidikan</p>
      <ol className="grid grid-cols-4" aria-label="Tahapan penyidikan">
        {MILESTONES.map((step, index) => {
          const done = index < currentStep
          const current = index === currentStep
          return (
            <li
              key={step}
              aria-current={current ? 'step' : undefined}
              className="relative flex flex-col items-start gap-2"
            >
              {index < MILESTONES.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute left-5 right-0 top-[9px] h-px',
                    done ? 'bg-white shadow-[0_0_6px_white]' : 'bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.2)_0_4px,transparent_4px_8px)]',
                  )}
                />
              )}
              <span
                className={cn(
                  'relative grid size-5 place-items-center rounded-full border',
                  done && 'border-white bg-white text-obsidian',
                  current && 'border-white bg-obsidian shadow-[0_0_14px_rgb(255_255_255/0.6)]',
                  !done && !current && 'border-white/20 bg-obsidian',
                )}
              >
                {done && <Check className="size-3" strokeWidth={3} aria-hidden="true" />}
                {current && <span className="absolute inset-0 animate-radar rounded-full border border-white" aria-hidden="true" />}
                {current && <span className="size-1.5 rounded-full bg-white" aria-hidden="true" />}
              </span>
              <span
                className={cn(
                  'font-mono text-[10px] uppercase tracking-[0.12em] md:text-[11px]',
                  done || current ? 'text-white' : 'text-slate-500',
                )}
              >
                {step}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
