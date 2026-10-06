import { ChevronRight, FileStack, FileText, Plus, ScanLine } from 'lucide-react'
import { HudCard, SectionHeader, TacticalButton } from './hud'

export function DocumentPanel({ documents = [], onViewDoc, onOpenGenerator }: { documents?: any[], onViewDoc?: (doc: any) => void, onOpenGenerator?: () => void }) {
  const recentDocs = documents.slice(0, 4);
  const count = documents.length;

  return (
    <HudCard as="section" aria-labelledby="document-panel-title" contentClassName="flex h-full flex-col gap-5 p-5 md:p-6">
      <SectionHeader
        id="document-panel-title"
        code="OPS-02 // Penerbitan"
        title="Penerbitan Dokumen"
        icon={FileStack}
        meta={
          <span className="shrink-0 rounded-[2px] border border-white/15 px-2 py-1 font-mono text-[10px] tracking-[0.2em] text-slate-300">
            {count.toString().padStart(2, '0')} BERKAS
          </span>
        }
      />

      {recentDocs.length === 0 ? (
        <div className="relative flex min-h-48 flex-1 flex-col items-center justify-center gap-3 overflow-hidden rounded-[4px] border border-dashed border-white/20 bg-white/[0.015] px-6 py-10 text-center hud-scanlines">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-6 h-px animate-scan bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_14px_2px_rgb(255_255_255/0.5)]"
          />
          <span className="relative grid size-14 place-items-center rounded-[3px] border border-white/20 bg-obsidian/60 text-white">
            <ScanLine className="size-6" aria-hidden="true" />
          </span>
          <p className="relative font-mono text-xs uppercase tracking-[0.3em] text-white">Sistem Standby</p>
          <p className="relative text-sm text-slate-400">Belum Ada Dokumen Terbit</p>
        </div>
      ) : (
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500">Dokumen Mindik Terakhir</p>
          <ul role="list" className="flex flex-col gap-2">
            {recentDocs.map((doc) => (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => onViewDoc?.(doc)}
                  className="group flex w-full items-center gap-3 rounded-[3px] border border-white/10 bg-white/[0.02] px-3 py-2.5 text-left transition-colors hover:border-white/35 hover:bg-white/[0.05] focus-visible:outline-2 focus-visible:outline-white"
                >
                  <FileText className="size-4 shrink-0 text-slate-300 group-hover:text-white" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">{doc.doc_title}</span>
                    <span className="block truncate font-mono text-[10px] tracking-wider text-slate-500">
                      {doc.template_code} • {doc.doc_number || 'Tanpa Nomor'}
                    </span>
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-white"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <TacticalButton label="Akses Generator Template" icon={Plus} variant="primary" size="sm" className="self-start mt-auto" onClick={() => onOpenGenerator?.()} />
    </HudCard>
  )
}
