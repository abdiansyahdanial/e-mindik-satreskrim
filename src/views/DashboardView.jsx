import React from 'react';
import { HeroBanner } from '../components/command/hero-banner';
import { TelemetryCards } from '../components/command/telemetry-cards';
import { CaseFilePanel } from '../components/command/case-file-panel';
import { DocumentPanel } from '../components/command/document-panel';

export default function DashboardView({ 
  cases = [], 
  documents = [],
  personnel = [], 
  onSelectCase, 
  onNewCase, 
  onOpenGenerator, 
  onViewDoc 
}) {
  const activeCasesCount = cases.filter(c => c.status === 'active').length;
  const detainedCount = cases.filter(c => c.references?.no_sprin_han).length || 0;
  const docsCount = documents.length;
  const personnelCount = personnel.length || 0;

  return (
    <div className="page-enter flex flex-col gap-6">
      <HeroBanner onNewCase={onNewCase} onOpenGenerator={() => onOpenGenerator(null)} />
      
      <TelemetryCards 
        activeCasesCount={activeCasesCount}
        docsCount={docsCount}
        detainedCount={detainedCount}
        personnelCount={personnelCount}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        <CaseFilePanel cases={cases} onSelectCase={onSelectCase} />
        <DocumentPanel documents={documents} onViewDoc={onViewDoc} onOpenGenerator={() => onOpenGenerator(null)} />
      </div>
    </div>
  );
}



