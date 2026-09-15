import React, { useState } from 'react';
import DumasListView from '../components/dumas/DumasListView';
import DumasFormView from '../components/dumas/DumasFormView';
import DumasDetailView from '../components/dumas/DumasDetailView';
import DumasModeSelectModal from '../components/dumas/DumasModeSelectModal';
import { 
  saveDumasRecord, 
  deleteDumasRecord, 
  convertDumasToCase,
  hasDumasDraft
} from '../services/dumasService';
import '../styles/dumas.css';

export default function DumasView({
  dumasList = [],
  setDumasList,
  currentUserProfile,
  onHandoverToGenerator,
  onShowToast
}) {
  // Sub-view: 'list' | 'form' | 'detail'
  const [subView, setSubView] = useState('list');
  const [formMode, setFormMode] = useState('manual');
  const [isModeModalOpen, setIsModeModalOpen] = useState(false);
  const [initialOcrFile, setInitialOcrFile] = useState(null);
  const [initialOcrFiles, setInitialOcrFiles] = useState([]);
  const [initialOcrData, setInitialOcrData] = useState(null);
  const [selectedDumas, setSelectedDumas] = useState(null);

  // 1. Handlers Modal Pemilihan Mode
  const handleOpenModeSelect = () => {
    setIsModeModalOpen(true);
  };

  const handleSelectMode = (mode, files = null, ocrData = null) => {
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

      {/* Tampilan 1: Tabel Daftar Dumas */}
      {subView === 'list' && (
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

      {/* Tampilan 2: Formulir Data Struktur (Tahap 2) */}
      {subView === 'form' && (
        <DumasFormView
          key={initialOcrData ? 'form-ocr-active' : 'form-manual'}
          mode={formMode}
          initialOcrFile={initialOcrFile}
          initialOcrFiles={initialOcrFiles}
          initialOcrData={initialOcrData}
          currentUserProfile={currentUserProfile}
          onBack={() => setSubView('list')}
          onSubmitDumas={handleSubmitDumas}
        />
      )}

      {/* Tampilan 3: Map Berkas Kedinasan & Detail (Tahap 4) */}
      {subView === 'detail' && selectedDumas && (
        <DumasDetailView
          dumasItem={selectedDumas}
          onBack={() => setSubView('list')}
          onOpenGeneratorForDumas={handleHandoverSprin}
        />
      )}
    </div>
  );
}
