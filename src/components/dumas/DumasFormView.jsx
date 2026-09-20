import React, { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Shield, RotateCcw, Save, Loader2, Hash, FileText } from 'lucide-react';
import PelaporSection from './sections/PelaporSection';
import TerlaporSection from './sections/TerlaporSection';
import UraianPerkaraSection from './sections/UraianPerkaraSection';
import BuktiDigitalSection from './sections/BuktiDigitalSection';
import EvidenceQrSyncModal from './EvidenceQrSyncModal';
import { supabase } from '../../supabaseClient.js';
import { deleteR2File } from '../../lib/r2Client.js';
import { generateNomorDumasResmi } from '../../services/dumasService.js';

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
  const [isGeneratingNo, setIsGeneratingNo] = useState(false);

  // Ambil nomor surat hasil scan OCR jika tersedia
  const ocrNomorSurat = (
    initialOcrData?.nomor_surat ||
    initialOcrData?.no_surat ||
    initialOcrData?.caseInfo?.nomor_surat ||
    initialOcrData?.caseInfo?.no_surat ||
    ''
  ).trim();

  // State 00: Nomor Registrasi Dinas Dumas
  const [nomorDumas, setNomorDumas] = useState(nomorRegisterResmi || ocrNomorSurat || '');

  // Inisialisasi nomor registrasi dumas otomatis saat formulir dibuka pertama kali
  useEffect(() => {
    let isMounted = true;
    async function initNomor() {
      // 1. Jika nomor register resmi sudah diteruskan dari props (mode edit), utamakan itu
      if (nomorRegisterResmi) {
        setNomorDumas(nomorRegisterResmi);
        return;
      }

      // 2. Jika ada nomor surat dari hasil scan OCR, dahulukan
      if (ocrNomorSurat) {
        setNomorDumas(ocrNomorSurat);
        return;
      }

      // 3. Jika belum ada nomor sama sekali, buatkan nomor resmi otomatis
      if (!nomorDumas) {
        setIsGeneratingNo(true);
        try {
          const autoNo = await generateNomorDumasResmi();
          if (isMounted) setNomorDumas(autoNo);
        } catch (err) {
          console.warn('Gagal generate nomor dumas:', err);
        } finally {
          if (isMounted) setIsGeneratingNo(false);
        }
      }
    }

    initNomor();
    return () => {
      isMounted = false;
    };
  }, [nomorRegisterResmi, ocrNomorSurat]);

  const handleResetNomorOtomatis = async () => {
    setIsGeneratingNo(true);
    try {
      const autoNo = await generateNomorDumasResmi();
      setNomorDumas(autoNo);
    } catch (err) {
      console.warn('Gagal reset nomor dumas:', err);
    } finally {
      setIsGeneratingNo(false);
    }
  };

  // State 01: Identitas Pelapor
  const [pelapor, setPelapor] = useState(() => ({
    nik: initialOcrData?.pelapor?.nik || initialOcrData?.pelapor_nik || '',
    nama: initialOcrData?.pelapor?.nama || initialOcrData?.pelapor_nama || initialOcrData?.pelapor?.nama_lengkap || '',
    tempat_tanggal_lahir: initialOcrData?.pelapor?.tempat_tanggal_lahir || initialOcrData?.pelapor?.ttl || initialOcrData?.pelapor_ttl || initialOcrData?.pelapor_tempat_tanggal_lahir || [initialOcrData?.pelapor?.tempat_lahir || initialOcrData?.pelapor_tempat_lahir, initialOcrData?.pelapor?.tanggal_lahir || initialOcrData?.pelapor_tanggal_lahir].filter(Boolean).join(', ') || '',
    ttl: initialOcrData?.pelapor?.ttl || initialOcrData?.pelapor?.tempat_tanggal_lahir || initialOcrData?.pelapor_ttl || '',
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

  // State 04: Peristiwa & Uraian Kejadian (Kronologi Lengkap Verbatim)
  const [caseInfo, setCaseInfo] = useState(() => ({
    waktu_kejadian: initialOcrData?.caseInfo?.waktu_kejadian || initialOcrData?.waktu_kejadian || initialOcrData?.waktu || '',
    tkp: initialOcrData?.caseInfo?.tkp || initialOcrData?.tkp || initialOcrData?.locus_delicti || '',
    tindak_pidana: initialOcrData?.caseInfo?.tindak_pidana || initialOcrData?.tindak_pidana || initialOcrData?.dugaan_tindak_pidana || '',
    pasal: initialOcrData?.caseInfo?.pasal || initialOcrData?.pasal || initialOcrData?.pasal_disangkakan || '',
    uraian: initialOcrData?.caseInfo?.uraian || initialOcrData?.uraian || initialOcrData?.uraian_kejadian || initialOcrData?.ringkasan_posisi_kasus || initialOcrData?.kronologis || ''
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

  // Cegah duplikasi berkas: hanya tolak jika URL Cloudflare R2 sama persis, dan beri nomor urut otomatis jika nama berbenturan
  const handleAddEvidence = useCallback((newItem) => {
    if (!newItem) return;
    setDaftarBukti((prev) => {
      const itemUrl = (newItem.url || newItem.fileUrl || newItem.file_url || '').trim();
      
      // 1. Hanya tolak jika URL Cloudflare R2 persis sama (benar-benar file fisik yang sama)
      if (itemUrl) {
        const urlExists = prev.some((b) => {
          const prevUrl = (b.url || b.fileUrl || b.file_url || '').trim();
          return prevUrl === itemUrl;
        });
        if (urlExists) return prev;
      }

      // 2. Beri nama unik jika nama default kamera berbenturan
      let finalName = newItem.nama_berkas || newItem.nama_file || newItem.name || 'Bukti_Digital.jpg';
      const sameNameCount = prev.filter(b => (b.nama_berkas || b.nama_file || b.name || '').startsWith(finalName.replace(/\.[^/.]+$/, ''))).length;
      if (sameNameCount > 0) {
        const ext = finalName.includes('.') ? finalName.substring(finalName.lastIndexOf('.')) : '';
        const base = finalName.replace(/\.[^/.]+$/, '');
        finalName = `${base}_(${sameNameCount + 1})${ext}`;
      }

      const cleanItem = {
        ...newItem,
        id: newItem.id || `bb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        nama_berkas: finalName,
        nama_file: finalName,
        name: finalName
      };

      return [...prev, cleanItem];
    });
  }, []);

  const handleRemoveEvidence = useCallback(async (evidenceItem) => {
    if (!evidenceItem) return;

    const targetId = typeof evidenceItem === 'object' ? evidenceItem.id : evidenceItem;
    const targetUrl = typeof evidenceItem === 'object' ? (evidenceItem.file_url || evidenceItem.url || evidenceItem.previewUrl) : evidenceItem;

    // 1. Dapatkan path R2
    let pathToDelete = null;
    if (typeof evidenceItem === 'object') {
      pathToDelete = evidenceItem.file_path || evidenceItem.filePath || evidenceItem.key;
      if (!pathToDelete && targetUrl && !targetUrl.startsWith('blob:')) {
        try {
          const u = new URL(targetUrl);
          pathToDelete = u.pathname.replace(/^\/+/, '');
        } catch {}
      }
    }

    // 2. Hapus berkas fisik langsung dari Cloudflare R2
    if (pathToDelete) {
      try {
        const cleanKey = pathToDelete.replace(/^emindik-storage\//, '').replace(/^\/+/, '');
        await deleteR2File(cleanKey);
        console.log('[R2 Realtime Cleanup] Berkas bukti berhasil dihapus dari R2:', cleanKey);
      } catch (r2Err) {
        console.warn('[R2 Realtime Cleanup] Gagal menghapus berkas bukti dari R2:', r2Err);
      }
    }

    // 3. Jika bukti sudah tercatat di Supabase barang_bukti (UUID valid), hapus barisnya
    const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(str));
    if (targetId && isUUID(targetId)) {
      try {
        await supabase.from('barang_bukti').delete().eq('id', targetId);
      } catch (dbErr) {
        console.warn('Gagal menghapus baris barang_bukti di Supabase:', dbErr);
      }
    }

    // 4. Perbarui state UI & local storage
    setDaftarBukti((prev) => {
      const updated = prev.filter((b) => {
        if (targetId && b.id === targetId) return false;
        if (targetUrl && (b.url === targetUrl || b.file_url === targetUrl || b.fileUrl === targetUrl)) return false;
        return true;
      });
      try {
        localStorage.setItem(EVID_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
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
    const generatedNo = nomorDumas?.trim() || nomorRegisterResmi || (await generateNomorDumasResmi());

    // Gabungkan TTL pelapor jika terpisah (utamakan single input tempat_tanggal_lahir / ttl)
    const pelaporTtl = pelapor.tempat_tanggal_lahir || pelapor.ttl || [pelapor.tempat_lahir, pelapor.tanggal_lahir].filter(Boolean).join(', ');
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
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border rounded-xl p-4 sm:p-5"
        style={{ backgroundColor: '#111622', borderColor: '#1E293B' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '0.5rem',
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                color: '#cbd5e1',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background-color 0.2s ease'
              }}
              title="Kembali ke Daftar Dumas"
            >
              <ArrowLeft size={18} color="#cbd5e1" />
            </button>
          )}


          <div>
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap'
              }}
            >
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  flexShrink: 0
                }}
              >
                {isSubmitting ? (
                  <Loader2 size={20} className="text-red-500 animate-spin" />
                ) : (
                  <Shield size={20} className="text-red-500" />
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    letterSpacing: '-0.025em',
                    color: '#FFFFFF',
                    margin: 0,
                    lineHeight: 1.3
                  }}
                >
                  FORMULIR PENGADUAN MASYARAKAT (DUMAS)
                </h2>
                <span 
                  style={{
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#F87171',
                    fontWeight: 700
                  }}
                >
                  {mode === 'edit' ? 'MODE EDIT' : 'MODE BARU'}
                </span>
              </div>
            </div>
            <p className="text-xs text-zinc-400 mt-1 pl-[50px]">
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

      {/* Bagian Informasi Registrasi & Nomor Dumas */}
      <div 
        style={{
          backgroundColor: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '0.75rem',
          padding: '1rem',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={15} style={{ color: '#60a5fa' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#e2e8f0' }}>
              Nomor Registrasi Dumas
            </span>
            <span style={{ color: '#f87171' }}>*</span>
            <span 
              style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '0.25rem',
                padding: '0.125rem 0.5rem'
              }}
            >
              Otomatis Sistem / Bisa Diedit Manual
            </span>
          </div>

          {ocrNomorSurat && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Scan OCR:</span>
              <button
                type="button"
                onClick={() => setNomorDumas(ocrNomorSurat)}
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  padding: '0.125rem 0.5rem',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  backgroundColor: nomorDumas === ocrNomorSurat ? 'rgba(6, 78, 59, 0.6)' : '#1e293b',
                  color: nomorDumas === ocrNomorSurat ? '#6ee7b7' : '#38bdf8',
                  border: nomorDumas === ocrNomorSurat ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid #334155'
                }}
                title="Gunakan nomor surat hasil scan dokumen OCR"
              >
                Gunakan No. OCR
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '0.75rem', display: 'flex', alignItems: 'center', pointerEvents: 'none', color: '#64748b' }}>
              <Hash size={15} />
            </div>
            <input
              type="text"
              value={nomorDumas}
              onChange={(e) => setNomorDumas(e.target.value)}
              placeholder="B/DUMAS/01/IX/2026/SPKT/Polres Koltim/Polda Sultra"
              style={{
                width: '100%',
                backgroundColor: '#030712',
                border: '1px solid #374151',
                borderRadius: '0.5rem',
                padding: '0.5rem 1rem 0.5rem 2.25rem',
                fontSize: '0.875rem',
                fontFamily: 'monospace',
                color: '#34d399',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          <button
            type="button"
            onClick={handleResetNomorOtomatis}
            disabled={isGeneratingNo}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 0.875rem',
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: '#e2e8f0',
              cursor: isGeneratingNo ? 'not-allowed' : 'pointer',
              opacity: isGeneratingNo ? 0.5 : 1,
              whiteSpace: 'nowrap'
            }}
            title="Kembalikan ke nomor registrasi rekomendasi sistem dinas"
          >
            {isGeneratingNo ? (
              <Loader2 size={13} className="animate-spin" style={{ color: '#60a5fa' }} />
            ) : (
              <RotateCcw size={13} style={{ color: '#cbd5e1' }} />
            )}
            <span>Reset Nomor Otomatis</span>
          </button>
        </div>
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

      {/* Modal Sinkronisasi QR Code HP (Hanya di-mount saat modal dibuka) */}
      {isQrModalOpen && (
        <EvidenceQrSyncModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          onEvidenceReceived={handleAddEvidence}
          activeToken={syncToken}
          syncToken={syncToken}
          onTokenChange={setSyncToken}
          _dumasNo={nomorDumas?.trim() || nomorRegisterResmi || 'DUMAS-BARU'}
        />
      )}
    </div>
  );
}

export { DumasFormView };
