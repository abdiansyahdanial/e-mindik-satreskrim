import React, { useState, useCallback } from 'react';
import { ArrowLeft, Shield, RotateCcw } from 'lucide-react';
import PelaporSection from './sections/PelaporSection';
import TerlaporSection from './sections/TerlaporSection';
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
  initialOcrData,
  currentUserProfile: _currentUserProfile,
  nomorRegisterResmi = null,
  perkaraId: _perkaraId,
  onBack,
  onSubmitDumas: _onSubmitDumas
}) {
  // State 01: Identitas Pelapor (Mendukung hidrasi OCR data / default)
  const [pelapor, setPelapor] = useState(() => ({
    nik: initialOcrData?.pelapor?.nik || initialOcrData?.pelapor_nik || '',
    nama: initialOcrData?.pelapor?.nama || initialOcrData?.pelapor_nama || initialOcrData?.pelapor?.nama_lengkap || '',
    tempat_lahir: initialOcrData?.pelapor?.tempat_lahir || initialOcrData?.pelapor_tempat_lahir || '',
    tanggal_lahir: initialOcrData?.pelapor?.tanggal_lahir || initialOcrData?.pelapor_tanggal_lahir || '',
    jenis_kelamin: initialOcrData?.pelapor?.jenis_kelamin || 'Laki-laki',
    agama: initialOcrData?.pelapor?.agama || 'Islam',
    pekerjaan: initialOcrData?.pelapor?.pekerjaan || initialOcrData?.pelapor_pekerjaan || '',
    kewarganegaraan: initialOcrData?.pelapor?.kewarganegaraan || 'WNI',
    telepon: initialOcrData?.pelapor?.telepon || initialOcrData?.pelapor?.kontak || initialOcrData?.pelapor_kontak || '',
    alamat: initialOcrData?.pelapor?.alamat || initialOcrData?.pelapor_alamat || ''
  }));

  const handlePelaporChange = useCallback((field, value) => {
    setPelapor((prev) => ({ ...prev, [field]: value }));
  }, []);

  // State 02 & 03: Saksi-Saksi & Pihak Terlapor
  const [saksiList, setSaksiList] = useState(() =>
    Array.isArray(initialOcrData?.saksiList) && initialOcrData.saksiList.length > 0
      ? initialOcrData.saksiList
      : [{ id: 'saksi-1', nama: '', nik: '', ttl: '', pekerjaan: '', agama: 'Islam', alamat: '', kontak: '', role_label: 'Saksi Fakta' }]
  );

  const [terlaporList, setTerlaporList] = useState(() =>
    Array.isArray(initialOcrData?.terlaporList) && initialOcrData.terlaporList.length > 0
      ? initialOcrData.terlaporList
      : [{ id: 'terlapor-1', nama: '', nik: '', ttl: '', pekerjaan: '', agama: 'Islam', alamat: '', kontak: '', role_label: 'Terlapor Utama' }]
  );

  const handleAddSaksi = useCallback(() => {
    setSaksiList((prev) => [
      ...prev,
      { id: `saksi_${Date.now()}`, nama: '', nik: '', ttl: '', pekerjaan: '', agama: 'Islam', alamat: '', kontak: '', role_label: `Saksi ${prev.length + 1}` }
    ]);
  }, []);

  const handleUpdateSaksi = useCallback((idx, field, value) => {
    setSaksiList((prev) => {
      const copy = [...prev];
      if (copy[idx]) copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  }, []);

  const handleRemoveSaksi = useCallback((idx) => {
    setSaksiList((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleAddTerlapor = useCallback(() => {
    setTerlaporList((prev) => [
      ...prev,
      { id: `terlapor_${Date.now()}`, nama: '', nik: '', ttl: '', pekerjaan: '', agama: 'Islam', alamat: '', kontak: '', role_label: `Terlapor ${prev.length + 1}` }
    ]);
  }, []);

  const handleUpdateTerlapor = useCallback((idx, field, value) => {
    setTerlaporList((prev) => {
      const copy = [...prev];
      if (copy[idx]) copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  }, []);

  const handleRemoveTerlapor = useCallback((idx) => {
    setTerlaporList((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // Single Source of Truth untuk Bukti Digital Dumas
  const [daftarBukti, setDaftarBukti] = useState(() => getStoredEvidence());
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [syncToken, setSyncToken] = useState(
    () => `dumas_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`
  );

  const handleAddEvidence = useCallback((newItem) => {
    if (!newItem) return;
    setDaftarBukti((prev) => appendEvidenceSafely(prev, newItem));
  }, []);

  const handleRemoveEvidence = useCallback((targetKey) => {
    if (!targetKey) return;
    setDaftarBukti((prev) => removeEvidenceSafely(prev, targetKey));
  }, []);

  const handleResetBukti = useCallback(() => {
    const confirmReset = window.confirm('Kosongkan semua daftar berkas bukti yang tersimpan?');
    if (!confirmReset) return;
    resetEvidenceStore();
    setDaftarBukti([]);
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto py-6 px-4 space-y-6 text-zinc-100">
      {/* Header Navigasi & Status */}
      <div 
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border rounded-xl p-4"
        style={{ backgroundColor: '#111622', borderColor: '#1E293B' }}
      >
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
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

        {/* Quick Action Reset Bukti (Pure Inline Style Anti-Balok Putih) */}
        {daftarBukti.length > 0 && (
          <button
            type="button"
            onClick={handleResetBukti}
            style={{
              backgroundColor: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#fb7185',
              padding: '0.375rem 0.75rem',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              cursor: 'pointer'
            }}
            title="Kosongkan Berkas Bukti"
          >
            <RotateCcw size={13} />
            Kosongkan Bukti
          </button>
        )}
      </div>

      {/* Bagian 01: Identitas Pelapor (Modular Section) */}
      <PelaporSection 
        data={pelapor} 
        onChange={handlePelaporChange} 
      />

      {/* Bagian 02 & 03: Saksi & Terlapor (Modular Section) */}
      <TerlaporSection
        terlaporList={terlaporList}
        onAddTerlapor={handleAddTerlapor}
        onUpdateTerlapor={handleUpdateTerlapor}
        onRemoveTerlapor={handleRemoveTerlapor}
        saksiList={saksiList}
        onAddSaksi={handleAddSaksi}
        onUpdateSaksi={handleUpdateSaksi}
        onRemoveSaksi={handleRemoveSaksi}
      />

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
