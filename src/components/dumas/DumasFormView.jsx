import React, { useState, useCallback } from 'react';
import { ArrowLeft, Shield, RotateCcw } from 'lucide-react';
import BuktiDigitalSection from './sections/BuktiDigitalSection';
import EvidenceQrSyncModal from './EvidenceQrSyncModal';
import {
  getStoredEvidence,
  appendEvidenceSafely,
  removeEvidenceSafely,
  resetEvidenceStore
} from '../../utils/dumasEvidenceStore';

export default function DumasFormView({
  mode = 'create',
  initialOcrFile: _initialOcrFile,
  initialOcrFiles: _initialOcrFiles,
  initialOcrData: _initialOcrData,
  currentUserProfile: _currentUserProfile,
  nomorRegisterResmi = null,
  perkaraId: _perkaraId,
  onBack,
  onSubmitDumas: _onSubmitDumas
}) {
  // Single Source of Truth untuk Bukti Digital Dumas
  const [daftarBukti, setDaftarBukti] = useState(() => getStoredEvidence());
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [syncToken, setSyncToken] = useState(
    () => `dumas_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`
  );

  // Handler penambahan bukti baru dengan filter anti-duplikasi URL dari store
  const handleAddEvidence = useCallback((newItem) => {
    if (!newItem) return;
    setDaftarBukti((prev) => appendEvidenceSafely(prev, newItem));
  }, []);

  // Handler penghapusan bukti dengan key aman
  const handleRemoveEvidence = useCallback((targetKey) => {
    if (!targetKey) return;
    setDaftarBukti((prev) => removeEvidenceSafely(prev, targetKey));
  }, []);

  // Handler reset bukti
  const handleResetBukti = useCallback(() => {
    const confirmReset = window.confirm('Kosongkan semua daftar berkas bukti yang tersimpan?');
    if (!confirmReset) return;
    resetEvidenceStore();
    setDaftarBukti([]);
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto py-6 px-4 space-y-6 text-zinc-100">
      {/* Header Navigasi & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111622] border border-[#1E293B] rounded-xl p-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-lg bg-[#1B1F2C] border border-[#292F42] hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
              title="Kembali ke Daftar Dumas"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-red-500" />
              <h2 className="text-lg font-bold tracking-tight text-white">
                FORMULIR PENGADUAN MASYARAKAT (DUMAS)
              </h2>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 font-bold">
                {mode === 'edit' ? 'MODE EDIT' : 'MODE BARU'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Modul formulir terpadu SAT RESKRIM POLRES KOLAKA TIMUR
            </p>
          </div>
        </div>

        {/* Quick Action Reset */}
        {daftarBukti.length > 0 && (
          <button
            type="button"
            onClick={handleResetBukti}
            className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
            title="Kosongkan Berkas Bukti"
          >
            <RotateCcw size={13} />
            Kosongkan Bukti
          </button>
        )}
      </div>

      {/* Bagian 05: Bukti Digital (Modular Section) */}
      <BuktiDigitalSection
        daftarBukti={daftarBukti}
        onAddEvidence={handleAddEvidence}
        onRemoveEvidence={handleRemoveEvidence}
        onOpenQrModal={() => setIsQrModalOpen(true)}
      />

      {/* Modal Sinkronisasi QR Code HP */}
      <EvidenceQrSyncModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onEvidenceReceived={handleAddEvidence}
        activeToken={syncToken}
        syncToken={syncToken}
        onTokenChange={setSyncToken}
        _dumasNo={nomorRegisterResmi || 'DUMAS-BARU'}
      />
    </div>
  );
}

export { DumasFormView };
