import { DashboardShell } from '@/components/command/dashboard-shell'
import { HeroBanner } from '@/components/command/hero-banner'
import { TelemetryCards } from '@/components/command/telemetry-cards'
import { CaseFilePanel } from '@/components/command/case-file-panel'
import { DocumentPanel } from '@/components/command/document-panel'

export default function Page() {
  return (
    <DashboardShell>
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <HeroBanner />
        <TelemetryCards />
        <div className="grid gap-6 xl:grid-cols-2">
          <CaseFilePanel />
          <DocumentPanel />
        </div>
      </div>
    </DashboardShell>
  )
}
