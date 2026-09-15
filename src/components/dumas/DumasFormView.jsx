import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  FileText, 
  ArrowLeft, 
  Sparkles, 
  Image as ImageIcon,
  Save,
  AlertCircle
} from 'lucide-react';
import { generateDumasNumber } from '../../services/dumasService';

export default function DumasFormView({
  mode = 'manual', // 'manual' | 'ocr'
  initialOcrFile = null,
  initialOcrFiles = null,
  initialOcrData = null,
  onBack,
  onSubmitDumas,
  currentUserProfile
}) {
  // State 01: Identitas Pelapor (Diisi dari initialOcrData jika ada)
  const [pelapor, setPelapor] = useState({
    nama: initialOcrData?.pelapor?.nama || initialOcrData?.pelapor_nama || initialOcrData?.pelapor?.nama_lengkap || (mode === 'ocr' ? 'AHMAD SUBARI' : ''),
    nik: initialOcrData?.pelapor?.nik || initialOcrData?.pelapor_nik || (mode === 'ocr' ? '7411081905890001' : ''),
    ttl: initialOcrData?.pelapor?.ttl || initialOcrData?.pelapor_ttl || (mode === 'ocr' ? 'Kolaka, 19 Mei 1989' : ''),
    pekerjaan: initialOcrData?.pelapor?.pekerjaan || initialOcrData?.pelapor_pekerjaan || (mode === 'ocr' ? 'Wiraswasta / Pengawas BUMDes' : ''),
    agama: initialOcrData?.pelapor?.agama || initialOcrData?.pelapor_agama || (mode === 'ocr' ? 'Islam' : ''),
    alamat: initialOcrData?.pelapor?.alamat || initialOcrData?.pelapor_alamat || (mode === 'ocr' ? 'Desa Loea, Kec. Loea, Kab. Kolaka Timur' : ''),
    kontak: initialOcrData?.pelapor?.kontak || initialOcrData?.pelapor_kontak || initialOcrData?.pelapor?.no_hp || (mode === 'ocr' ? '081244556677' : ''),
  });

  // State 02: Array Saksi-Saksi Dinamis (Mendukung Multi-Saksi dari OCR)
  const [saksiList, setSaksiList] = useState(() => {
    if (initialOcrData?.saksiList && initialOcrData.saksiList.length > 0) {
      return initialOcrData.saksiList;
    }
    if (initialOcrData?.saksi_list && initialOcrData.saksi_list.length > 0) {
      return initialOcrData.saksi_list.map((s, idx) => ({
        id: `saksi-ocr-${idx + 1}-${Date.now()}`,
        nama: s.nama || '',
        nik: s.nik || '',
        ttl: s.ttl || '',
        pekerjaan: s.pekerjaan || '',
        agama: s.agama || 'Islam',
        alamat: s.alamat || '',
        kontak: s.kontak || s.no_hp || '',
        role_label: idx === 0 ? 'Saksi Fakta' : idx === 1 ? 'Saksi Terkait' : `Saksi ${idx + 1}`,
      }));
    }
    if (mode === 'ocr') {
      return [
        {
          id: 'saksi-1',
          nama: 'HARIS MUNANDAR, S.P.',
          nik: '7411081503850002',
          ttl: 'Tirawuta, 15 Maret 1985',
          pekerjaan: 'Perangkat Desa / Bendahara BUMDes',
          agama: 'Islam',
          alamat: 'Kel. Tirawuta, Kec. Tirawuta, Kab. Kolaka Timur',
          kontak: '082198765432',
          role_label: 'Saksi Fakta',
        },
        {
          id: 'saksi-2',
          nama: 'NURHAYATI',
          nik: '7411084209900003',
          ttl: 'Kolaka, 22 September 1990',
          pekerjaan: 'Staf Administrasi',
          agama: 'Islam',
          alamat: 'Desa Loea, Kec. Loea, Kab. Kolaka Timur',
          kontak: '085211223344',
          role_label: 'Saksi Terkait',
        }
      ];
    }
    return [
      {
        id: 'saksi-1',
        nama: '',
        nik: '',
        ttl: '',
        pekerjaan: '',
        agama: 'Islam',
        alamat: '',
        kontak: '',
        role_label: 'Saksi Fakta',
      }
    ];
  });

  // State 03: Array Terlapor Dinamis (Mendukung Multi-Terlapor dari OCR)
  const [terlaporList, setTerlaporList] = useState(() => {
    if (initialOcrData?.terlaporList && initialOcrData.terlaporList.length > 0) {
      return initialOcrData.terlaporList;
    }
    if (initialOcrData?.terlapor_list && initialOcrData.terlapor_list.length > 0) {
      return initialOcrData.terlapor_list.map((t, idx) => ({
        id: `terlapor-ocr-${idx + 1}-${Date.now()}`,
        nama: t.nama || '',
        nik: t.nik || '',
        ttl: t.ttl || '',
        pekerjaan: t.pekerjaan || '',
        agama: t.agama || 'Islam',
        alamat: t.alamat || '',
        kontak: t.kontak || t.no_hp || '',
        role_label: idx === 0 ? 'Terlapor Utama' : `Terlapor Tambahan ${idx}`,
      }));
    }
    if (mode === 'ocr') {
      return [
        {
          id: 'terlapor-1',
          nama: 'SAMSUL BAHRI',
          nik: '7411080407880004',
          ttl: 'Rate-Rate, 4 Juli 1988',
          pekerjaan: 'Wiraswasta / Mantan Direktur BUMDes',
          agama: 'Islam',
          alamat: 'Kelurahan Tirawuta, Kec. Tirawuta, Kab. Kolaka Timur',
          kontak: '085298987711',
          role_label: 'Terlapor Utama',
        }
      ];
    }
    return [
      {
        id: 'terlapor-1',
        nama: '',
        nik: '',
        ttl: '',
        pekerjaan: '',
        agama: 'Islam',
        alamat: '',
        kontak: '',
        role_label: 'Terlapor Utama',
      }
    ];
  });

  // State 04: Peristiwa, Delik, & Dugaan Pasal
  const [caseInfo, setCaseInfo] = useState({
    tindak_pidana: initialOcrData?.caseInfo?.tindak_pidana || initialOcrData?.tindak_pidana || (mode === 'ocr' ? 'Penipuan & Penggelapan Dana Anggaran' : ''),
    pasal_disangkakan: initialOcrData?.caseInfo?.pasal_disangkakan || initialOcrData?.pasal_disangkakan || (mode === 'ocr' ? 'Pasal 378 KUHP dan/atau Pasal 372 KUHP' : ''),
    tempus_delicti: initialOcrData?.caseInfo?.tempus_delicti || initialOcrData?.tempus_delicti || (mode === 'ocr' ? 'Senin, 14 September 2026 - Pukul 10.30 WITA' : ''),
    locus_delicti: initialOcrData?.caseInfo?.locus_delicti || initialOcrData?.locus_delicti || (mode === 'ocr' ? 'Kantor Bumdes Tirawuta, Kec. Tirawuta, Kab. Kolaka Timur' : ''),
    uraian_kejadian: initialOcrData?.caseInfo?.uraian_kejadian || initialOcrData?.uraian_kejadian || (mode === 'ocr' 
      ? 'Bahwa pada hari Senin tanggal 14 September 2026 sekitar pukul 10.30 WITA, Terlapor Sdr. SAMSUL BAHRI diduga tanpa hak atau izin telah menggelapkan dana kas Bumdes sebesar Rp 45.000.000,- (Empat Puluh Lima Juta Rupiah).'
      : ''),
  });

  // State 05: Lampiran Bukti (Otomatis sertakan seluruh berkas fisik hasil OCR jika ada)
  const [evidenceFiles, setEvidenceFiles] = useState(() => {
    const rawFiles = initialOcrFiles && initialOcrFiles.length > 0
      ? initialOcrFiles
      : (initialOcrFile ? [initialOcrFile] : []);

    if (!rawFiles || rawFiles.length === 0) return [];

    return rawFiles.map((file, idx) => {
      const isPdf = file.type?.includes('pdf') || file.name?.endsWith('.pdf');
      const category = isPdf ? 'DOKUMEN_PDF' : 'OBJEK_FISIK_JPG';
      const mime = isPdf ? 'application/pdf' : 'image/jpeg';
      return {
        id: `ocr-file-${Date.now()}-${idx}`,
        name: file.name,
        nama_file: file.name,
        size: file.size,
        type: mime,
        mime_type: mime,
        kategori_bukti: category,
        file_size_formatted: `${(file.size / 1024).toFixed(0)} KB`,
        previewUrl: typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(file) : '',
        keterangan: `Lembar ke-${idx + 1} surat pengaduan hasil pindai Google Gemini AI`,
        hash_sha256: Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map(b => b.toString(16).padStart(2, '0')).join('') + '...'
      };
    });
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Handlers Saksi
  const handleAddSaksi = () => {
    const nextNum = saksiList.length + 1;
    const role = nextNum === 1 ? 'Saksi Fakta' : nextNum === 2 ? 'Saksi Terkait' : `Saksi ${nextNum}`;
    setSaksiList([
      ...saksiList,
      {
        id: `saksi-${Date.now()}`,
        nama: '',
        nik: '',
        ttl: '',
        pekerjaan: '',
        agama: '',
        alamat: '',
        kontak: '',
        role_label: role,
      }
    ]);
  };

  const handleRemoveSaksi = (indexToRemove) => {
    if (saksiList.length <= 1) {
      alert('Minimal terdapat 1 baris saksi.');
      return;
    }
    const updated = saksiList.filter((_, idx) => idx !== indexToRemove).map((s, idx) => ({
      ...s,
      role_label: idx === 0 ? 'Saksi Fakta' : idx === 1 ? 'Saksi Terkait' : `Saksi ${idx + 1}`
    }));
    setSaksiList(updated);
  };

  const handleSaksiChange = (index, field, value) => {
    const updated = [...saksiList];
    updated[index][field] = value;
    setSaksiList(updated);
  };

  // Handlers Terlapor
  const handleAddTerlapor = () => {
    const nextNum = terlaporList.length + 1;
    setTerlaporList([
      ...terlaporList,
      {
        id: `terlapor-${Date.now()}`,
        nama: '',
        nik: '',
        ttl: '',
        pekerjaan: '',
        agama: '',
        alamat: '',
        kontak: '',
        role_label: nextNum === 1 ? 'Terlapor Utama' : `Terlapor Tambahan ${nextNum - 1}`,
      }
    ]);
  };

  const handleRemoveTerlapor = (indexToRemove) => {
    if (terlaporList.length <= 1) {
      alert('Minimal terdapat 1 pihak terlapor.');
      return;
    }
    const updated = terlaporList.filter((_, idx) => idx !== indexToRemove).map((t, idx) => ({
      ...t,
      role_label: idx === 0 ? 'Terlapor Utama' : `Terlapor Tambahan ${idx}`
    }));
    setTerlaporList(updated);
  };

  const handleTerlaporChange = (index, field, value) => {
    const updated = [...terlaporList];
    updated[index][field] = value;
    setTerlaporList(updated);
  };

  // Handlers Upload Bukti
  const handleFileUpload = (e, forcedType = null) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newEvidence = files.map(file => {
      const isPdf = file.type.includes('pdf') || file.name.endsWith('.pdf');
      const category = forcedType || (isPdf ? 'DOKUMEN_PDF' : 'OBJEK_FISIK_JPG');
      const mime = isPdf ? 'application/pdf' : 'image/jpeg';
      
      return {
        id: `bb-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: file.name,
        nama_file: file.name,
        size: file.size,
        type: mime,
        mime_type: mime,
        kategori_bukti: category,
        file_size_formatted: `${(file.size / 1024).toFixed(0)} KB`,
        previewUrl: URL.createObjectURL(file),
        keterangan: isPdf ? 'Dokumen surat pengaduan / bukti tertulis' : 'Dokumentasi barang bukti fisik perkara',
        hash_sha256: Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map(b => b.toString(16).padStart(2, '0')).join('') + '...'
      };
    });

    setEvidenceFiles(prev => [...prev, ...newEvidence]);
  };

  const handleRemoveEvidence = (idToRemove) => {
    setEvidenceFiles(prev => prev.filter(f => f.id !== idToRemove));
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!pelapor.nama?.trim()) {
      setFormError('Nama lengkap pelapor wajib diisi.');
      return;
    }
    if (!pelapor.nik?.trim()) {
      setFormError('NIK pelapor wajib diisi.');
      return;
    }
    if (!terlaporList[0]?.nama?.trim()) {
      setFormError('Nama pihak terlapor utama wajib diisi.');
      return;
    }
    if (!caseInfo.tindak_pidana?.trim()) {
      setFormError('Dugaan tindak pidana wajib diisi.');
      return;
    }

    setIsSubmitting(true);

    try {
      const primaryTerlapor = terlaporList[0] || {};
      const generatedNo = generateDumasNumber(Date.now().toString().slice(-2));

      const newDumasData = {
        nomor_lp: generatedNo,
        tanggal_lapor: new Date().toISOString(),
        penyidik_id: currentUserProfile?.id || 'penyidik-spkt',
        penyidik_nama: currentUserProfile?.nama || 'Penyidik Penerima SPKT',
        penyidik_nrp: currentUserProfile?.nrp || '-',
        status_berkas: 'Tahap Penyelidikan (Sp.Lidik)',
        
        pelapor_nama: pelapor.nama,
        pelapor_nik: pelapor.nik,
        pelapor_ttl: pelapor.ttl,
        pelapor_pekerjaan: pelapor.pekerjaan,
        pelapor_agama: pelapor.agama,
        pelapor_kontak: pelapor.kontak,
        pelapor_alamat: pelapor.alamat,
        
        saksi_list: saksiList,
        terlapor_list: terlaporList,

        terlapor_nama: primaryTerlapor.nama,
        terlapor_nik: primaryTerlapor.nik,
        terlapor_ttl: primaryTerlapor.ttl,
        terlapor_pekerjaan: primaryTerlapor.pekerjaan,
        terlapor_agama: primaryTerlapor.agama,
        terlapor_domisili: primaryTerlapor.alamat,
        terlapor_kontak: primaryTerlapor.kontak,
        terlapor_status: primaryTerlapor.role_label || 'Terlapor Utama',

        tindak_pidana: caseInfo.tindak_pidana,
        pasal_disangkakan: caseInfo.pasal_disangkakan,
        tempus_delicti: caseInfo.tempus_delicti,
        locus_delicti: caseInfo.locus_delicti,
        uraian_kejadian: caseInfo.uraian_kejadian,
      };

      await onSubmitDumas(newDumasData, evidenceFiles);
    } catch (err) {
      console.error('Error saat menyimpan dumas:', err);
      setFormError('Terjadi kesalahan sistem saat menyimpan data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dumas-container" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#080B10' }}>
      
      {/* ======================================================= */}
      {/* FORM HEADER RIBBON */}
      {/* ======================================================= */}
      <div style={{
        height: '48px',
        padding: '0 24px',
        backgroundColor: '#121721',
        borderBottom: '1px solid #292F42',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#E52E2E' }}></span>
          <span style={{ fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            FORMULIR STRUKTUR DATA PERKARA ADUAN MASYARAKAT (DUMAS)
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {mode === 'ocr' ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              color: '#FF352D',
              backgroundColor: 'rgba(229, 46, 46, 0.1)',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(229, 46, 46, 0.3)',
              fontWeight: 600
            }}>
              <Sparkles size={12} />
              AI OCR Hasil Pindai Berkas
            </span>
          ) : (
            <span style={{
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              color: '#94A3B8',
              backgroundColor: '#1B1F2C',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid #292F42',
              fontWeight: 600
            }}>
              Mode Input Manual Terstruktur (3 Kolom)
            </span>
          )}
        </div>
      </div>

      {/* ======================================================= */}
      {/* FORM BODY CONTAINER */}
      {/* ======================================================= */}
      <form onSubmit={handleSubmit} style={{ padding: '24px 32px', maxWidth: '1440px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {formError && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(127, 29, 29, 0.8)',
            border: '1px solid #991B1B',
            borderRadius: '8px',
            color: '#FEE2E2',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontFamily: 'JetBrains Mono, monospace'
          }}>
            <AlertCircle size={16} color="#F87171" style={{ flexShrink: 0 }} />
            <span>{formError}</span>
          </div>
        )}

        {/* Banner Konfirmasi Smart Scan Gemini OCR */}
        {(initialOcrData || mode === 'ocr') && (
          <div style={{
            padding: '14px 20px',
            backgroundColor: 'rgba(229, 46, 46, 0.08)',
            border: '1px solid rgba(229, 46, 46, 0.3)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '12px',
            color: '#CBD5E1'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={18} color="#FF352D" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#FF352D' }}>
                  HASIL SMART SCAN GEMINI VISION AKTIF
                  {initialOcrFiles && initialOcrFiles.length > 1 ? ` (${initialOcrFiles.length} LEMBAR BERKAS): ` : ': '}
                </strong>
                <span>Entitas Pelapor, Saksi, Terlapor, &amp; Perkara telah diekstrak secara otomatis. Harap verifikasi keakuratan data dengan berkas fisik sebelum menyimpan.</span>
              </div>
            </div>
            <span style={{
              fontSize: '10px',
              color: '#FF6B6B',
              backgroundColor: '#151822',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(229, 46, 46, 0.4)',
              whiteSpace: 'nowrap',
              fontWeight: 700
            }}>
              TEREKSTRAKSI AI
            </span>
          </div>
        )}

        {/* ======================================================= */}
        {/* ROW 1: 3-COLUMN GRID (PELAPOR, SAKSI, TERLAPOR) */}
        {/* ======================================================= */}
        <div className="dumas-form-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          alignItems: 'start'
        }}>
          
          {/* ---------------------------------------------------- */}
          {/* KOLOM 01: IDENTITAS PELAPOR / KORBAN */}
          {/* ---------------------------------------------------- */}
          <div className="dumas-col-card" style={{
            backgroundColor: '#151822',
            border: '1px solid #292F42',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
          }}>
            <div>
              <div className="dumas-col-header" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                marginBottom: '14px',
                borderBottom: '1px solid rgba(41, 47, 66, 0.8)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="dumas-badge-col" style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(229, 46, 46, 0.15)',
                    color: '#FF352D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                    fontSize: '11px'
                  }}>
                    01
                  </div>
                  <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'JetBrains Mono, monospace', margin: 0 }}>
                    IDENTITAS PELAPOR / KORBAN
                  </h3>
                </div>
                <span style={{ fontSize: '10px', fontFamily: 'JetBrains Mono, monospace', color: '#94A3B8', backgroundColor: '#0B0D13', padding: '2px 8px', borderRadius: '4px', border: '1px solid #292F42' }}>
                  Pihak Pelapor
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="dumas-form-label">
                    NAMA LENGKAP <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    value={pelapor.nama}
                    onChange={(e) => setPelapor({ ...pelapor, nama: e.target.value })}
                    placeholder="Nama lengkap beserta gelar"
                    className="dumas-form-input"
                  />
                </div>

                <div>
                  <label className="dumas-form-label">
                    NIK (NOMOR INDUK KEPENDUDUKAN) <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    maxLength={16}
                    value={pelapor.nik}
                    onChange={(e) => setPelapor({ ...pelapor, nik: e.target.value })}
                    placeholder="74**************"
                    className="dumas-form-input"
                  />
                </div>

                <div>
                  <label className="dumas-form-label">
                    TEMPAT, TANGGAL LAHIR
                  </label>
                  <input 
                    type="text"
                    value={pelapor.ttl}
                    onChange={(e) => setPelapor({ ...pelapor, ttl: e.target.value })}
                    placeholder="Contoh: Kolaka, 19 Mei 1989"
                    className="dumas-form-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="dumas-form-label">
                      PEKERJAAN
                    </label>
                    <input 
                      type="text"
                      value={pelapor.pekerjaan}
                      onChange={(e) => setPelapor({ ...pelapor, pekerjaan: e.target.value })}
                      placeholder="Wiraswasta / PNS"
                      className="dumas-form-input"
                    />
                  </div>
                  <div>
                    <label className="dumas-form-label">
                      AGAMA
                    </label>
                    <select
                      value={pelapor.agama}
                      onChange={(e) => setPelapor({ ...pelapor, agama: e.target.value })}
                      className="dumas-form-select"
                    >
                      <option value="">Pilih Agama</option>
                      <option value="Islam">Islam</option>
                      <option value="Kristen Protestan">Kristen</option>
                      <option value="Katolik">Katolik</option>
                      <option value="Hindu">Hindu</option>
                      <option value="Buddha">Buddha</option>
                      <option value="Konghucu">Konghucu</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="dumas-form-label">
                    ALAMAT DOMISILI KTP
                  </label>
                  <input 
                    type="text"
                    value={pelapor.alamat}
                    onChange={(e) => setPelapor({ ...pelapor, alamat: e.target.value })}
                    placeholder="Alamat lengkap domisili KTP"
                    className="dumas-form-input"
                  />
                </div>

                <div>
                  <label className="dumas-form-label">
                    NOMOR HP / WHATSAPP
                  </label>
                  <input 
                    type="text"
                    value={pelapor.kontak}
                    onChange={(e) => setPelapor({ ...pelapor, kontak: e.target.value })}
                    placeholder="08************"
                    className="dumas-form-input"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* KOLOM 02: DATA SAKSI-SAKSI (ARRAY DINAMIS) */}
          {/* ---------------------------------------------------- */}
          <div className="dumas-col-card" style={{
            backgroundColor: '#151822',
            border: '1px solid #292F42',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
          }}>
            <div>
              <div className="dumas-col-header" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                marginBottom: '14px',
                borderBottom: '1px solid rgba(41, 47, 66, 0.8)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="dumas-badge-col" style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(229, 46, 46, 0.15)',
                    color: '#FF352D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                    fontSize: '11px'
                  }}>
                    02
                  </div>
                  <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'JetBrains Mono, monospace', margin: 0 }}>
                    DATA SAKSI-SAKSI
                  </h3>
                </div>
                <button 
                  type="button"
                  onClick={handleAddSaksi}
                  className="dumas-btn-add"
                >
                  <Plus size={12} />
                  <span>Tambah Saksi</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '580px', overflowY: 'auto', paddingRight: '4px' }}>
                {saksiList.map((saksi, idx) => (
                  <div key={saksi.id || idx} className="dumas-subcard">
                    <div className="dumas-subcard-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#FF352D' }}></span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#FFFFFF', fontSize: '10px', textTransform: 'uppercase' }}>
                          SAKSI {idx + 1}
                        </span>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontFamily: 'JetBrains Mono, monospace', backgroundColor: '#0B0D13', color: '#94A3B8', border: '1px solid #292F42' }}>
                          {saksi.role_label}
                        </span>
                      </div>
                      {saksiList.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => handleRemoveSaksi(idx)}
                          className="dumas-btn-delete-sub"
                          title="Hapus Saksi"
                        >
                          <Trash2 size={11} />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div>
                        <label className="dumas-form-label">NAMA LENGKAP</label>
                        <input 
                          type="text"
                          value={saksi.nama}
                          onChange={(e) => handleSaksiChange(idx, 'nama', e.target.value)}
                          placeholder="Nama lengkap saksi"
                          className="dumas-form-input"
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label className="dumas-form-label">NIK</label>
                          <input 
                            type="text"
                            maxLength={16}
                            value={saksi.nik}
                            onChange={(e) => handleSaksiChange(idx, 'nik', e.target.value)}
                            placeholder="74********"
                            className="dumas-form-input"
                          />
                        </div>
                        <div>
                          <label className="dumas-form-label">TTL</label>
                          <input 
                            type="text"
                            value={saksi.ttl}
                            onChange={(e) => handleSaksiChange(idx, 'ttl', e.target.value)}
                            placeholder="Tempat, Tgl Lahir"
                            className="dumas-form-input"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label className="dumas-form-label">PEKERJAAN</label>
                          <input 
                            type="text"
                            value={saksi.pekerjaan}
                            onChange={(e) => handleSaksiChange(idx, 'pekerjaan', e.target.value)}
                            placeholder="Pekerjaan"
                            className="dumas-form-input"
                          />
                        </div>
                        <div>
                          <label className="dumas-form-label">AGAMA</label>
                          <input 
                            type="text"
                            value={saksi.agama}
                            onChange={(e) => handleSaksiChange(idx, 'agama', e.target.value)}
                            placeholder="Agama"
                            className="dumas-form-input"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="dumas-form-label">ALAMAT DOMISILI</label>
                        <input 
                          type="text"
                          value={saksi.alamat}
                          onChange={(e) => handleSaksiChange(idx, 'alamat', e.target.value)}
                          placeholder="Alamat domisili KTP"
                          className="dumas-form-input"
                        />
                      </div>

                      <div>
                        <label className="dumas-form-label">NOMOR HP / WA</label>
                        <input 
                          type="text"
                          value={saksi.kontak}
                          onChange={(e) => handleSaksiChange(idx, 'kontak', e.target.value)}
                          placeholder="08********"
                          className="dumas-form-input"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* KOLOM 03: PIHAK TERLAPOR (ARRAY DINAMIS) */}
          {/* ---------------------------------------------------- */}
          <div className="dumas-col-card card-terlapor" style={{
            backgroundColor: '#151822',
            border: '1px solid rgba(229, 46, 46, 0.4)',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
          }}>
            <div>
              <div className="dumas-col-header" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                marginBottom: '14px',
                borderBottom: '1px solid rgba(41, 47, 66, 0.8)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="dumas-badge-col" style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(229, 46, 46, 0.2)',
                    color: '#FF352D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                    fontSize: '11px'
                  }}>
                    03
                  </div>
                  <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'JetBrains Mono, monospace', margin: 0 }}>
                    PIHAK TERLAPOR
                  </h3>
                </div>
                <button 
                  type="button"
                  onClick={handleAddTerlapor}
                  className="dumas-btn-add"
                >
                  <Plus size={12} />
                  <span>Tambah Terlapor</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '580px', overflowY: 'auto', paddingRight: '4px' }}>
                {terlaporList.map((terlapor, idx) => (
                  <div key={terlapor.id || idx} className="dumas-subcard subcard-terlapor">
                    <div className="dumas-subcard-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#E52E2E' }}></span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#FFFFFF', fontSize: '10px', textTransform: 'uppercase' }}>
                          TERLAPOR {idx + 1}
                        </span>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontFamily: 'JetBrains Mono, monospace', backgroundColor: 'rgba(229, 46, 46, 0.2)', color: '#FF352D', border: '1px solid rgba(229, 46, 46, 0.4)', fontWeight: 600 }}>
                          {terlapor.role_label}
                        </span>
                      </div>
                      {terlaporList.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => handleRemoveTerlapor(idx)}
                          className="dumas-btn-delete-sub"
                          title="Hapus Terlapor"
                        >
                          <Trash2 size={11} />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div>
                        <label className="dumas-form-label">
                          NAMA LENGKAP <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <input 
                          type="text"
                          required
                          value={terlapor.nama}
                          onChange={(e) => handleTerlaporChange(idx, 'nama', e.target.value)}
                          placeholder="Nama lengkap pihak terlapor"
                          className="dumas-form-input"
                          style={{ borderColor: 'rgba(229, 46, 46, 0.5)', fontWeight: 600 }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label className="dumas-form-label">NIK</label>
                          <input 
                            type="text"
                            maxLength={16}
                            value={terlapor.nik}
                            onChange={(e) => handleTerlaporChange(idx, 'nik', e.target.value)}
                            placeholder="74********"
                            className="dumas-form-input"
                          />
                        </div>
                        <div>
                          <label className="dumas-form-label">TTL</label>
                          <input 
                            type="text"
                            value={terlapor.ttl}
                            onChange={(e) => handleTerlaporChange(idx, 'ttl', e.target.value)}
                            placeholder="Tempat, Tgl Lahir"
                            className="dumas-form-input"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label className="dumas-form-label">PEKERJAAN</label>
                          <input 
                            type="text"
                            value={terlapor.pekerjaan}
                            onChange={(e) => handleTerlaporChange(idx, 'pekerjaan', e.target.value)}
                            placeholder="Pekerjaan"
                            className="dumas-form-input"
                          />
                        </div>
                        <div>
                          <label className="dumas-form-label">AGAMA</label>
                          <input 
                            type="text"
                            value={terlapor.agama}
                            onChange={(e) => handleTerlaporChange(idx, 'agama', e.target.value)}
                            placeholder="Agama"
                            className="dumas-form-input"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="dumas-form-label">ALAMAT DOMISILI</label>
                        <input 
                          type="text"
                          value={terlapor.alamat}
                          onChange={(e) => handleTerlaporChange(idx, 'alamat', e.target.value)}
                          placeholder="Alamat domisili terlapor"
                          className="dumas-form-input"
                        />
                      </div>

                      <div>
                        <label className="dumas-form-label">NOMOR HP / WA</label>
                        <input 
                          type="text"
                          value={terlapor.kontak}
                          onChange={(e) => handleTerlaporChange(idx, 'kontak', e.target.value)}
                          placeholder="08********"
                          className="dumas-form-input"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* ======================================================= */}
        {/* ROW 2: PERISTIWA & DUGAAN PASAL PIDANA (CARD 04) */}
        {/* ======================================================= */}
        <div style={{
          backgroundColor: '#151822',
          border: '1px solid #292F42',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            paddingBottom: '12px',
            borderBottom: '1px solid #292F42'
          }}>
            <div className="dumas-badge-col" style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              backgroundColor: 'rgba(229, 46, 46, 0.15)',
              color: '#FF352D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 700,
              fontSize: '11px'
            }}>
              04
            </div>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'JetBrains Mono, monospace', margin: 0 }}>
              PERISTIWA &amp; DUGAAN PASAL PIDANA
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div>
              <label className="dumas-form-label">
                DUGAAN TINDAK PIDANA <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input 
                type="text"
                required
                value={caseInfo.tindak_pidana}
                onChange={(e) => setCaseInfo({ ...caseInfo, tindak_pidana: e.target.value })}
                placeholder="Contoh: Penggelapan Dana Kas / Penipuan"
                className="dumas-form-input"
                style={{ fontWeight: 600 }}
              />
            </div>

            <div>
              <label className="dumas-form-label">
                DUGAAN PASAL YANG DISANGKAKAN
              </label>
              <input 
                type="text"
                value={caseInfo.pasal_disangkakan}
                onChange={(e) => setCaseInfo({ ...caseInfo, pasal_disangkakan: e.target.value })}
                placeholder="Contoh: Pasal 372 KUHP dan/atau Pasal 378 KUHP"
                className="dumas-form-input"
                style={{ fontWeight: 600 }}
              />
            </div>

            <div>
              <label className="dumas-form-label">
                WAKTU KEJADIAN (TEMPUS DELICTI)
              </label>
              <input 
                type="text"
                value={caseInfo.tempus_delicti}
                onChange={(e) => setCaseInfo({ ...caseInfo, tempus_delicti: e.target.value })}
                placeholder="Contoh: Senin, 14 September 2026 - Pukul 10.30 WITA"
                className="dumas-form-input"
              />
            </div>

            <div>
              <label className="dumas-form-label">
                TEMPAT KEJADIAN (LOCUS DELICTI)
              </label>
              <input 
                type="text"
                value={caseInfo.locus_delicti}
                onChange={(e) => setCaseInfo({ ...caseInfo, locus_delicti: e.target.value })}
                placeholder="Contoh: Kantor Bumdes Tirawuta, Kec. Tirawuta, Kab. Kolaka Timur"
                className="dumas-form-input"
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label className="dumas-form-label">
                RINGKASAN POSISI KASUS / URAIAN SINGKAT KEJADIAN
              </label>
              <textarea 
                rows={4}
                value={caseInfo.uraian_kejadian}
                onChange={(e) => setCaseInfo({ ...caseInfo, uraian_kejadian: e.target.value })}
                placeholder="Jelaskan secara kronologis duduk perkara aduan masyarakat..."
                className="dumas-form-textarea"
              />
            </div>
          </div>
        </div>

        {/* ======================================================= */}
        {/* ROW 3: UNGGAH DOKUMEN & BUKTI DIGITAL (CARD 05) */}
        {/* ======================================================= */}
        <div style={{
          backgroundColor: '#151822',
          border: '1px solid #292F42',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '12px',
            borderBottom: '1px solid #292F42'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="dumas-badge-col" style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                backgroundColor: 'rgba(229, 46, 46, 0.15)',
                color: '#FF352D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                fontSize: '11px'
              }}>
                05
              </div>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'JetBrains Mono, monospace', margin: 0 }}>
                DOKUMEN &amp; BARANG BUKTI DIGITAL (PDF &amp; JPG)
              </h3>
            </div>
            <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: '#94A3B8' }}>
              {evidenceFiles.length} Berkas Terpilih
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {/* Upload PDF */}
            <label style={{
              border: '1px dashed #292F42',
              backgroundColor: '#0B0D13',
              padding: '16px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
              <input 
                type="file" 
                accept="application/pdf"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => handleFileUpload(e, 'DOKUMEN_PDF')}
              />
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: 'rgba(127, 29, 29, 0.5)',
                border: '1px solid #991B1B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F87171'
              }}>
                <FileText size={20} />
              </div>
              <div>
                <div style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase' }}>
                  + Unggah Dokumen Surat (PDF)
                </div>
                <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px' }}>
                  Surat pengaduan, kuitansi bermeterai (.pdf)
                </div>
              </div>
            </label>

            {/* Upload JPG */}
            <label style={{
              border: '1px dashed #292F42',
              backgroundColor: '#0B0D13',
              padding: '16px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
              <input 
                type="file" 
                accept="image/jpeg,image/png"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => handleFileUpload(e, 'OBJEK_FISIK_JPG')}
              />
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: 'rgba(127, 29, 29, 0.5)',
                border: '1px solid #991B1B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F87171'
              }}>
                <ImageIcon size={20} />
              </div>
              <div>
                <div style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase' }}>
                  + Unggah Foto Objek Fisik (JPG)
                </div>
                <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px' }}>
                  Foto dokumentasi fisik barang bukti (.jpg, .png)
                </div>
              </div>
            </label>
          </div>

          {/* Evidence List Previews */}
          {evidenceFiles.length > 0 && (
            <div style={{
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #292F42',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '10px'
            }}>
              {evidenceFiles.map((file) => (
                <div 
                  key={file.id} 
                  style={{
                    backgroundColor: '#0B0D13',
                    border: '1px solid #292F42',
                    borderRadius: '8px',
                    padding: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span style={{ padding: '6px', borderRadius: '4px', backgroundColor: 'rgba(127, 29, 29, 0.4)', color: '#F87171', flexShrink: 0 }}>
                      {file.kategori_bukti === 'DOKUMEN_PDF' ? <FileText size={14} /> : <ImageIcon size={14} />}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: '#FFFFFF', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={file.name}>
                        {file.name}
                      </p>
                      <span style={{ fontSize: '9px', fontFamily: 'JetBrains Mono, monospace', color: '#64748B' }}>
                        {file.kategori_bukti} • {file.file_size_formatted}
                      </span>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleRemoveEvidence(file.id)}
                    style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
                    title="Hapus Bukti"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ======================================================= */}
        {/* STICKY ACTION FOOTER BAR */}
        {/* ======================================================= */}
        <div className="dumas-sticky-footer" style={{
          position: 'sticky',
          bottom: 0,
          background: 'rgba(14, 17, 24, 0.96)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid #292F42',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 30,
          boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.4)',
          borderRadius: '12px',
          marginTop: '16px'
        }}>
          <button 
            type="button"
            onClick={onBack}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: 'JetBrains Mono, monospace',
              color: '#CBD5E1',
              backgroundColor: '#1B1F2C',
              border: '1px solid #292F42',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={14} />
            <span>Kembali ke Pilihan Mode</span>
          </button>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="dumas-btn-submit"
          >
            {isSubmitting ? (
              <>
                <div style={{ width: '14px', height: '14px', border: '2px solid #FFFFFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <span>Menerbitkan Nomor Dumas...</span>
              </>
            ) : (
              <>
                <Save size={15} />
                <span>Simpan &amp; Lanjutkan Ambil Register</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
