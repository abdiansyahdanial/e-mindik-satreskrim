import React, { useState, useEffect } from 'react';
import DumasListView from '../components/dumas/DumasListView';
import DumasFormView from '../components/dumas/DumasFormView';
import DumasDetailView from '../components/dumas/DumasDetailView';
import DumasModeSelectModal from '../components/dumas/DumasModeSelectModal';
import DumasErrorBoundary from '../components/dumas/DumasErrorBoundary';
import { 
  saveDumasRecord, 
  deleteDumasRecord, 
  convertDumasToCase,
  hasDumasDraft,
  safeGetLocalStorage,
  sanitizeEvidenceList
} from '../services/dumasService';
import '../styles/dumas.css';

export default function DumasView({
  dumasList = [],
  setDumasList,
  currentUserProfile,
  onHandoverToGenerator,
  onShowToast
}) {
  // Sub-view: 'list' | 'form' | 'detail' (Rehidrasi otomatis dari sessionStorage / draft agar tidak mental ke list saat refresh)
  const [subView, setSubView] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedSubView = sessionStorage.getItem('emindik_dumas_subview');
        if (savedSubView && ['list', 'form'].includes(savedSubView)) {
          return savedSubView;
        }
        if (savedSubView === 'detail') {
          sessionStorage.setItem('emindik_dumas_subview', 'list');
          return 'list';
        }
        // Jika ada draft form aktif di localStorage dengan data riil yang valid, buka form
        const draftForm = safeGetLocalStorage('emindik_draft_form_perkara_v1', null);
        if (draftForm && typeof draftForm === 'object' && Object.keys(draftForm).length > 0) {
          return 'form';
        }
      }
    } catch {}
    return 'list';
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('emindik_dumas_subview', subView);
      }
    } catch {}
  }, [subView]);
  const [formMode, setFormMode] = useState('manual');
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);
  const [initialOcrFile, setInitialOcrFile] = useState(null);
  const [initialOcrFiles, setInitialOcrFiles] = useState([]);
  const [initialOcrData, setInitialOcrData] = useState(null);
  const [selectedDumas, setSelectedDumas] = useState(null);
  const [formMountKey, setFormMountKey] = useState(() => `form-${Date.now()}`);

  // 1. Handlers Modal Pemilihan Mode
  const handleOpenModeSelect = () => {
    setIsModeModalOpen(true);
  };

  const handleSelectMode = (mode, files = null, ocrData = null) => {
    // Isolasi State: bersihkan draft bukti global lama agar tidak bocor ke laporan baru
    try {
      localStorage.removeItem('emindik_dumas_evidence_v2');
      localStorage.removeItem('emindik_draft_daftar_bb_v1');
      localStorage.removeItem('emindik_temp_draft_bb');
      sessionStorage.removeItem('emindik_current_draft_session_id');
      sessionStorage.removeItem('temp_dumas_token');
    } catch {}

    setSelectedDumas(null);
    setFormMountKey(`form-new-${Date.now()}`);
    setFormMode(mode);
    const normalizedFiles = files 
      ? (Array.isArray(files) ? files : [files]) 
      : [];
    setInitialOcrFiles(normalizedFiles);
    setInitialOcrFile(normalizedFiles[0] || null);
    setInitialOcrData(ocrData);
    setIsModeModalOpen(false);
    setSubView('form');

    if (mode === 'ocr' && ocrData && onShowToast) {
      const pageCount = normalizedFiles.length;
      onShowToast(`Smart Scan AI Sukses! ${pageCount > 1 ? `${pageCount} lembar berkas` : 'Berkas'} berhasil diekstrak ke formulir.`);
    }
  };

  // Handler Buka Draf Tersimpan
  const handleOpenDraft = () => {
    setFormMode('manual');
    setInitialOcrFile(null);
    setInitialOcrFiles([]);
    setInitialOcrData(null);
    setSubView('form');
  };

  // 2. Handler Submit Form Dumas
  const handleSubmitDumas = async (newRecord, evidenceFiles = []) => {
    try {
      const result = await saveDumasRecord(newRecord, evidenceFiles);
      if (result.success && result.record) {
        setDumasList(prev => [result.record, ...prev.filter(d => d.id !== result.record.id)]);
        setSelectedDumas(result.record);
        setSubView('detail');
        if (onShowToast) {
          onShowToast(`Laporan Dumas ${result.record.nomor_lp} berhasil teregistrasi!`);
        }
      }
      return result;
    } catch (err) {
      console.error('Gagal submit dumas:', err);
      alert('Terjadi kendala saat menyimpan berkas.');
      return { success: false, error: err };
    }
  };

  // 3. Handler Hapus Dumas
  const handleDeleteDumas = async (id) => {
    try {
      await deleteDumasRecord(id);
      setDumasList(prev => prev.filter(d => d.id !== id));
      if (selectedDumas?.id === id) {
        setSelectedDumas(null);
        setSubView('list');
      }
      if (onShowToast) {
        onShowToast('Berkas aduan masyarakat berhasil dihapus.');
      }
    } catch (err) {
      console.error('Gagal hapus dumas:', err);
    }
  };

  // 4. Handler Handover ke DocGeneratorView (Sprin Lidik/Sidik)
  const handleHandoverSprin = (dumasItem) => {
    const mappedCase = convertDumasToCase(dumasItem);
    if (onHandoverToGenerator) {
      onHandoverToGenerator(mappedCase);
    }
  };

  return (
    <div className="dumas-container h-full flex flex-col">
      {/* Modal Pemilihan Mode Input (Tahap 1) */}
      <DumasModeSelectModal
        isOpen={isModeModalOpen}
        onClose={() => setIsModeModalOpen(false)}
        onSelectMode={handleSelectMode}
      />

      {/* Tampilan 1: Tabel Daftar Dumas (Juga bertindak sebagai fallback mutlak jika kondisi subView lain tidak terpenuhi) */}
      {(subView === 'list' || (subView === 'detail' && !selectedDumas) || (subView !== 'form' && subView !== 'detail')) && (
        <DumasListView
          dumasList={dumasList}
          onOpenModeSelect={handleOpenModeSelect}
          hasDraft={hasDumasDraft(currentUserProfile?.id)}
          onOpenDraft={handleOpenDraft}
          onSelectDumas={(item) => {
            setSelectedDumas(item);
            setSubView('detail');
          }}
          onDeleteDumas={handleDeleteDumas}
          onOpenGeneratorForDumas={handleHandoverSprin}
        />
      )}

      {/* Tampilan 2: Formulir Data Struktur (Tahap 2) dengan Error Boundary Proteksi Crash & Check Keberadaan Komponen */}
      {subView === 'form' && (
        <DumasErrorBoundary onResetView={() => setSubView('list')}>
          {DumasFormView ? (
            <DumasFormView
              key={initialOcrData ? 'form-ocr-active' : (selectedDumas?.id || formMountKey)}
              mode={formMode}
              initialOcrFile={initialOcrFile}
              initialOcrFiles={initialOcrFiles}
              initialOcrData={initialOcrData}
              currentUserProfile={currentUserProfile}
              nomorRegisterResmi={selectedDumas?.nomor_lp || initialOcrData?.nomor_lp || initialOcrData?.nomor_register || null}
              perkaraId={selectedDumas?.id || initialOcrData?.id || null}
              onBack={() => setSubView('list')}
              onSubmitDumas={handleSubmitDumas}
            />
          ) : (
            <div className="p-6 text-white">
              <div className="p-4 bg-red-900/50 border border-red-500 rounded text-red-200 font-mono text-sm">
                Komponen DumasFormView tidak terdefinisi (undefined component). Periksa file import di DumasView.jsx.
              </div>
            </div>
          )}
        </DumasErrorBoundary>
      )}

      {/* Tampilan 3: Map Berkas Kedinasan & Detail (Tahap 4) */}
      {subView === 'detail' && selectedDumas && (
        <DumasDetailView
          dumasItem={selectedDumas}
          onBack={() => setSubView('list')}
          onOpenGeneratorForDumas={handleHandoverSprin}
          onUpdateDumas={(updatedRecord) => {
            setSelectedDumas(updatedRecord);
            setDumasList(prev => prev.map(d => d.id === updatedRecord.id ? updatedRecord : d));
          }}
        />
      )}
    </div>
  );
}

export { DumasView };

