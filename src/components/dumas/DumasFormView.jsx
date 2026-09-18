import React, { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Shield, RotateCcw, Save, Loader2 } from 'lucide-react';
import PelaporSection from './sections/PelaporSection';
import TerlaporSection from './sections/TerlaporSection';
import UraianPerkaraSection from './sections/UraianPerkaraSection';
import BuktiDigitalSection from './sections/BuktiDigitalSection';
import EvidenceQrSyncModal from './EvidenceQrSyncModal';

const EVID_STORAGE_KEY = 'emindik_dumas_evidence_v2';

export default function DumasFormView({
  mode = 'create',
  initialOcrFile: _initialOcrFile,
  initialOcrFiles: _initialOcrFiles,
  initialOcrData,
  currentUserProfile,
  nomorRegisterResmi = null,
  perkaraId: _perkaraId,
  onBack,
  onSubmitDumas
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State 01: Identitas Pelapor
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
  const handlePelaporChange = useCallback((field, value) => setPelapor((prev) => ({ ...prev, [field]: value })), []);

  // State 02 & 03: Saksi & Terlapor
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

  const handleAddSaksi = useCallback(() => setSaksiList((p) => [...p, { id: `s_${Date.now()}`, nama: '', nik: '', ttl: '', pekerjaan: '', agama: 'Islam', alamat: '', kontak: '', role_label: `Saksi ${p.length + 1}` }]), []);
  const handleUpdateSaksi = useCallback((i, f, v) => setSaksiList((p) => { const c = [...p]; if (c[i]) c[i] = { ...c[i], [f]: v }; return c; }), []);
  const handleRemoveSaksi = useCallback((i) => setSaksiList((p) => p.filter((_, idx) => idx !== i)), []);

  const handleAddTerlapor = useCallback(() => setTerlaporList((p) => [...p, { id: `t_${Date.now()}`, nama: '', nik: '', ttl: '', pekerjaan: '', agama: 'Islam', alamat: '', kontak: '', role_label: `Terlapor ${p.length + 1}` }]), []);
  const handleUpdateTerlapor = useCallback((i, f, v) => setTerlaporList((p) => { const c = [...p]; if (c[i]) c[i] = { ...c[i], [f]: v }; return c; }), []);
  const handleRemoveTerlapor = useCallback((i) => setTerlaporList((p) => p.filter((_, idx) => idx !== i)), []);

  // State 04: Peristiwa & Uraian Kejadian (Kronologi)
  const [caseInfo, setCaseInfo] = useState(() => ({
    waktu_kejadian: initialOcrData?.caseInfo?.waktu_kejadian || initialOcrData?.waktu_kejadian || '',
    tkp: initialOcrData?.caseInfo?.tkp || initialOcrData?.tkp || '',
    tindak_pidana: initialOcrData?.caseInfo?.tindak_pidana || initialOcrData?.tindak_pidana || '',
    pasal: initialOcrData?.caseInfo?.pasal || initialOcrData?.pasal || '',
    uraian: initialOcrData?.caseInfo?.uraian || initialOcrData?.uraian || ''
  }));
  const handleCaseInfoChange = useCallback((field, value) => setCaseInfo((prev) => ({ ...prev, [field]: value })), []);

  // State 05: Bukti Digital Dumas (Dukungan Refresh & Deduplikasi)
  const [daftarBukti, setDaftarBukti] = useState(() => {
    try {
      const saved = localStorage.getItem(EVID_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Gagal membaca cache bukti:', e);
    }
    return initialOcrData?.barang_bukti || [];
  });

  // Simpan otomatis ke localStorage setiap kali ada berkas baru masuk/dihapus
  useEffect(() => {
    try {
      localStorage.setItem(EVID_STORAGE_KEY, JSON.stringify(daftarBukti));
    } catch (e) {
      console.warn('Gagal menyimpan cache bukti:', e);
    }
  }, [daftarBukti]);

  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [syncToken, setSyncToken] = useState(() => `dumas_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`);

  // Cegah duplikasi berkas secara ketat berdasarkan URL atau nama berkas
  const handleAddEvidence = useCallback((newItem) => {
    if (!newItem) return;
    setDaftarBukti((prev) => {
      const itemUrl = newItem.url || newItem.fileUrl || newItem.file_url;
      const itemName = newItem.nama_berkas || newItem.name || newItem.nama_file;

      const isDuplicate = prev.some((b) => {
        const prevUrl = b.url || b.fileUrl || b.file_url;
        const prevName = b.nama_berkas || b.name || b.nama_file;
        return (itemUrl && prevUrl === itemUrl) || (itemName && prevName === itemName);
      });

      if (isDuplicate) return prev;
      return [...prev, newItem];
    });
  }, []);

  const handleRemoveEvidence = useCallback((key) => {
    if (!key) return;
    setDaftarBukti((prev) => prev.filter((b) => b.id !== key && b.url !== key && b.fileUrl !== key));
  }, []);

  const handleClearEvidence = useCallback(() => {
    setDaftarBukti([]);
    try {
      localStorage.removeItem(EVID_STORAGE_KEY);
    } catch {}
  }, []);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!pelapor.nama?.trim()) {
      alert('Nama lengkap pelapor wajib diisi.');
      return;
    }
    if (!pelapor.nik?.trim()) {
      alert('NIK pelapor wajib diisi.');
      return;
    }

    const primaryTerlapor = terlaporList[0] || {};
    const generatedNo = nomorRegisterResmi || `DUMAS/${Date.now().toString().slice(-4)}/SPKT/RES-KOLTIM`;

    // Gabungkan TTL pelapor jika terpisah
    const pelaporTtl = pelapor.ttl || [pelapor.tempat_lahir, pelapor.tanggal_lahir].filter(Boolean).join(', ');
    const terlaporTtl = primaryTerlapor.ttl || [primaryTerlapor.tempat_lahir, primaryTerlapor.tanggal_lahir].filter(Boolean).join(', ');

    const newDumasData = {
      nomor_lp: generatedNo,
      nomor_register: generatedNo,
      tanggal_lapor: new Date().toISOString(),
      penyidik_id: currentUserProfile?.id || 'penyidik-spkt',
      penyidik_nama: currentUserProfile?.nama || 'Penyidik Penerima SPKT',
      penyidik_nrp: currentUserProfile?.nrp || '-',
      status_berkas: 'Tahap Penyelidikan (Sp.Lidik)',

      // Identitas Pelapor (Flat Fields)
      pelapor_nama: pelapor.nama,
      pelapor_nik: pelapor.nik,
      pelapor_ttl: pelaporTtl,
      pelapor_pekerjaan: pelapor.pekerjaan,
      pelapor_agama: pelapor.agama,
      pelapor_kontak: pelapor.telepon || pelapor.kontak,
      pelapor_alamat: pelapor.alamat,

      // Relasi List
      saksi_list: saksiList,
      saksi: saksiList,
      terlapor_list: terlaporList,
      terlapor: terlaporList,

      // Terlapor Utama (Flat Fields)
      terlapor_nama: primaryTerlapor.nama || '',
      terlapor_nik: primaryTerlapor.nik || '',
      terlapor_ttl: terlaporTtl,
      terlapor_pekerjaan: primaryTerlapor.pekerjaan || '',
      terlapor_agama: primaryTerlapor.agama || 'Islam',
      terlapor_domisili: primaryTerlapor.alamat || '',
      terlapor_kontak: primaryTerlapor.telepon || primaryTerlapor.kontak || '',
      terlapor_status: primaryTerlapor.role_label || 'Terlapor Utama',

      // Kronologi & Delik Perkara
      tindak_pidana: caseInfo.tindak_pidana || caseInfo.dugaan_tindak_pidana || '',
      dugaan_tindak_pidana: caseInfo.tindak_pidana || caseInfo.dugaan_tindak_pidana || '',
      pasal_disangkakan: caseInfo.pasal || caseInfo.pasal_disangkakan || caseInfo.dugaan_pasal || '',
      pasal: caseInfo.pasal || caseInfo.pasal_disangkakan || caseInfo.dugaan_pasal || '',
      tempus_delicti: caseInfo.waktu_kejadian || caseInfo.tempus_delicti || '',
      locus_delicti: caseInfo.tkp || caseInfo.locus_delicti || '',
      uraian_singkat: caseInfo.uraian || caseInfo.uraian_kejadian || '',
      uraian_kejadian: caseInfo.uraian || caseInfo.uraian_kejadian || '',

      // Raw/Structured Object untuk kelengkapan
      pelapor,
      barang_bukti: daftarBukti,
      daftar_bukti: daftarBukti
    };

    if (typeof onSubmitDumas === 'function') {
      setIsSubmitting(true);
      try {
        // Panggil dengan 2 argumen: newDumasData dan daftarBukti
        await onSubmitDumas(newDumasData, daftarBukti);
        // Hapus cache storage bukti setelah submit selesai dan berhasil
        try {
          localStorage.removeItem(EVID_STORAGE_KEY);
        } catch {}
      } finally {
        setIsSubmitting(false);
      }
    }
  };

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

        {daftarBukti.length > 0 && (
          <button
            type="button"
            onClick={handleClearEvidence}
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

      {/* Bagian 01: Identitas Pelapor */}
      <PelaporSection data={pelapor} onChange={handlePelaporChange} />

      {/* Bagian 02 & 03: Saksi & Terlapor */}
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

      {/* Bagian 04: Peristiwa & Kronologi Kasus */}
      <UraianPerkaraSection caseInfo={caseInfo} onChange={handleCaseInfoChange} />

      {/* Bagian 05: Bukti Digital */}
      <BuktiDigitalSection
        daftarBukti={daftarBukti}
        onAddEvidence={handleAddEvidence}
        onRemoveEvidence={handleRemoveEvidence}
        onOpenQrModal={() => setIsQrModalOpen(true)}
      />

      {/* Sticky Bottom Action Bar */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          backgroundColor: 'rgba(17, 22, 34, 0.95)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #1E293B',
          borderRadius: '0.75rem',
          padding: '0.875rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 30,
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.4)'
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            color: '#CBD5E1',
            backgroundColor: '#1E2638',
            border: '1px solid #292F42',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem'
          }}
        >
          <ArrowLeft size={14} />
          Batal
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '0.5rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#FFFFFF',
            backgroundColor: isSubmitting ? '#991B1B' : '#DC2626',
            border: '1px solid #EF4444',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 0 12px rgba(220, 38, 38, 0.3)'
          }}
        >
          {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {isSubmitting ? 'Menyimpan Dumas...' : 'Simpan Laporan Dumas'}
        </button>
      </div>

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
