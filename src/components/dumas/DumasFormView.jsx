import React, { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Shield, RotateCcw, Save, Loader2, Hash, FileText, Printer } from 'lucide-react';
import PelaporSection from './sections/PelaporSection';
import TerlaporSection from './sections/TerlaporSection';
import UraianPerkaraSection from './sections/UraianPerkaraSection';
import BuktiDigitalSection from './sections/BuktiDigitalSection';
import EvidenceQrSyncModal from './EvidenceQrSyncModal';
import { supabase } from '../../supabaseClient.js';
import { deleteR2File } from '../../lib/r2Client.js';
import { generateNomorDumasResmi, isUUID } from '../../services/dumasService.js';
import { printSuratPengaduan, printTandaTerimaDumas } from '../../utils/dumasPrintGenerator.js';
import ModalSelectPamapta from './ModalSelectPamapta';
import { HudCard, HudCorners } from '../command/hud';

const EVID_STORAGE_KEY = 'emindik_dumas_evidence_v2';

export default function DumasFormView({
  mode = 'create',
  initialData = null,
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
  const [isPamaptaModalOpen, setIsPamaptaModalOpen] = useState(false);
  const [tempFormDataForPrint, setTempFormDataForPrint] = useState(null);

  // Ambil nomor surat hasil scan OCR jika tersedia
  const ocrNomorSurat = (
    initialOcrData?.nomor_surat ||
    initialOcrData?.no_surat ||
    initialOcrData?.caseInfo?.nomor_surat ||
    initialOcrData?.caseInfo?.no_surat ||
    ''
  ).trim();

  // State 00: Nomor Registrasi Dinas Dumas
  const [nomorDumas, setNomorDumas] = useState(
    nomorRegisterResmi ||
    initialData?.nomor_lp ||
    initialData?.nomor_register ||
    ocrNomorSurat ||
    ''
  );

  // Inisialisasi nomor registrasi dumas otomatis saat formulir dibuka pertama kali
  useEffect(() => {
    let isMounted = true;
    async function initNomor() {
      // 1. Jika nomor register resmi atau data awal sudah ada (mode edit), utamakan itu
      if (nomorRegisterResmi || initialData?.nomor_lp || initialData?.nomor_register) {
        setNomorDumas(nomorRegisterResmi || initialData?.nomor_lp || initialData?.nomor_register);
        return;
      }

      // 2. Jika ada nomor surat dari hasil scan OCR, dahulukan
      if (ocrNomorSurat) {
        setNomorDumas(ocrNomorSurat);
        return;
      }

      // 3. Jika belum ada nomor sama sekali dan bukan mode edit, buatkan nomor resmi otomatis
      if (!nomorDumas && mode !== 'edit') {
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
  }, [nomorRegisterResmi, initialData, ocrNomorSurat, mode]);

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

  // State 01: Identitas Pelapor (Populate dari initialData atau initialOcrData)
  const [pelapor, setPelapor] = useState(() => {
    if (initialData) {
      const p = initialData.pelapor || {};
      const ttlCombined = initialData.pelapor_ttl || p.tempat_tanggal_lahir || p.ttl || [initialData.pelapor_tempat_lahir || p.tempat_lahir, initialData.pelapor_tanggal_lahir || p.tanggal_lahir].filter(Boolean).join(', ') || '';
      return {
        nik: initialData.pelapor_nik || p.nik || initialData.nik_pelapor || '',
        nama: initialData.pelapor_nama || p.nama || initialData.nama_pelapor || p.nama_lengkap || '',
        tempat_tanggal_lahir: ttlCombined,
        ttl: ttlCombined,
        tempat_lahir: initialData.pelapor_tempat_lahir || p.tempat_lahir || (ttlCombined ? ttlCombined.split(',')[0]?.trim() : ''),
        tanggal_lahir: initialData.pelapor_tanggal_lahir || p.tanggal_lahir || (ttlCombined && ttlCombined.includes(',') ? ttlCombined.split(',')[1]?.trim() : ''),
        jenis_kelamin: initialData.pelapor_jenis_kelamin || p.jenis_kelamin || p.jk || initialData.jenis_kelamin || 'Laki-laki',
        agama: initialData.pelapor_agama || p.agama || initialData.agama || 'Islam',
        pekerjaan: initialData.pelapor_pekerjaan || p.pekerjaan || initialData.pekerjaan || '',
        kewarganegaraan: initialData.pelapor_kewarganegaraan || p.kewarganegaraan || 'WNI',
        telepon: initialData.pelapor_kontak || p.telepon || p.kontak || initialData.kontak || initialData.no_hp || '',
        alamat: initialData.pelapor_alamat || p.alamat || initialData.alamat || ''
      };
    }
    return {
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
    };
  });
  const handlePelaporChange = useCallback((field, value) => setPelapor((prev) => ({ ...prev, [field]: value })), []);

  // State 02 & 03: Saksi & Terlapor
  const [saksiList, setSaksiList] = useState(() => {
    if (Array.isArray(initialData?.saksi_list) && initialData.saksi_list.length > 0) {
      return initialData.saksi_list;
    }
    if (Array.isArray(initialData?.saksi) && initialData.saksi.length > 0) {
      return initialData.saksi;
    }
    if (Array.isArray(initialOcrData?.saksiList) && initialOcrData.saksiList.length > 0) {
      return initialOcrData.saksiList;
    }
    return [{ id: 'saksi-1', nama: '', nik: '', ttl: '', pekerjaan: '', agama: 'Islam', alamat: '', kontak: '', role_label: 'Saksi Fakta' }];
  });

  const [terlaporList, setTerlaporList] = useState(() => {
    if (Array.isArray(initialData?.terlapor_list) && initialData.terlapor_list.length > 0) {
      return initialData.terlapor_list;
    }
    if (Array.isArray(initialData?.terlapor) && initialData.terlapor.length > 0) {
      return initialData.terlapor;
    }
    if (initialData?.terlapor_nama) {
      return [{
        id: 'terlapor-1',
        nama: initialData.terlapor_nama,
        nik: initialData.terlapor_nik || '',
        ttl: initialData.terlapor_ttl || '',
        pekerjaan: initialData.terlapor_pekerjaan || '',
        agama: initialData.terlapor_agama || 'Islam',
        alamat: initialData.terlapor_domisili || '',
        kontak: initialData.terlapor_kontak || '',
        role_label: initialData.terlapor_status || 'Terlapor Utama'
      }];
    }
    if (Array.isArray(initialOcrData?.terlaporList) && initialOcrData.terlaporList.length > 0) {
      return initialOcrData.terlaporList;
    }
    return [{ id: 'terlapor-1', nama: '', nik: '', ttl: '', pekerjaan: '', agama: 'Islam', alamat: '', kontak: '', role_label: 'Terlapor Utama' }];
  });

  const handleAddSaksi = useCallback(() => setSaksiList((p) => [...p, { id: `s_${Date.now()}`, nama: '', nik: '', ttl: '', pekerjaan: '', agama: 'Islam', alamat: '', kontak: '', role_label: `Saksi ${p.length + 1}` }]), []);
  const handleUpdateSaksi = useCallback((i, f, v) => setSaksiList((p) => { const c = [...p]; if (c[i]) c[i] = { ...c[i], [f]: v }; return c; }), []);
  const handleRemoveSaksi = useCallback((i) => setSaksiList((p) => p.filter((_, idx) => idx !== i)), []);

  const handleAddTerlapor = useCallback(() => setTerlaporList((p) => [...p, { id: `t_${Date.now()}`, nama: '', nik: '', ttl: '', pekerjaan: '', agama: 'Islam', alamat: '', kontak: '', role_label: `Terlapor ${p.length + 1}` }]), []);
  const handleUpdateTerlapor = useCallback((i, f, v) => setTerlaporList((p) => { const c = [...p]; if (c[i]) c[i] = { ...c[i], [f]: v }; return c; }), []);
  const handleRemoveTerlapor = useCallback((i) => setTerlaporList((p) => p.filter((_, idx) => idx !== i)), []);

  // State 04: Peristiwa & Uraian Kejadian (Kronologi Lengkap Verbatim)
  const [caseInfo, setCaseInfo] = useState(() => ({
    waktu_kejadian: initialData?.tempus_delicti || initialData?.waktu_kejadian || initialOcrData?.caseInfo?.waktu_kejadian || initialOcrData?.waktu_kejadian || initialOcrData?.waktu || '',
    tkp: initialData?.locus_delicti || initialData?.tkp || initialOcrData?.caseInfo?.tkp || initialOcrData?.tkp || initialOcrData?.locus_delicti || '',
    tindak_pidana: initialData?.tindak_pidana || initialData?.dugaan_tindak_pidana || initialOcrData?.caseInfo?.tindak_pidana || initialOcrData?.tindak_pidana || initialOcrData?.dugaan_tindak_pidana || '',
    pasal: initialData?.pasal_disangkakan || initialData?.pasal || initialOcrData?.caseInfo?.pasal || initialOcrData?.pasal || initialOcrData?.pasal_disangkakan || '',
    uraian: initialData?.uraian_kejadian || initialData?.uraian_singkat || initialData?.uraian || initialOcrData?.caseInfo?.uraian || initialOcrData?.uraian || initialOcrData?.uraian_kejadian || initialOcrData?.ringkasan_posisi_kasus || initialOcrData?.kronologis || ''
  }));
  const handleCaseInfoChange = useCallback((field, value) => setCaseInfo((prev) => ({ ...prev, [field]: value })), []);

  // State 05: Bukti Digital Dumas (Dukungan Refresh & Deduplikasi)
  const [daftarBukti, setDaftarBukti] = useState(() => {
    if (Array.isArray(initialData?.lampiran_barang_bukti) && initialData.lampiran_barang_bukti.length > 0) {
      return initialData.lampiran_barang_bukti;
    }
    if (Array.isArray(initialData?.barang_bukti) && initialData.barang_bukti.length > 0) {
      return initialData.barang_bukti;
    }
    if (mode !== 'edit') {
      try {
        const saved = localStorage.getItem(EVID_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.warn('Gagal membaca cache bukti:', e);
      }
    }
    return initialOcrData?.barang_bukti || [];
  });

  // Simpan otomatis ke localStorage setiap kali ada berkas baru masuk/dihapus (hanya pada mode create)
  useEffect(() => {
    if (mode === 'edit') return;
    try {
      localStorage.setItem(EVID_STORAGE_KEY, JSON.stringify(daftarBukti));
    } catch (e) {
      console.warn('Gagal menyimpan cache bukti:', e);
    }
  }, [daftarBukti, mode]);

  // Sinkronkan daftarBukti & field form saat initialData berganti/dimuat ulang
  useEffect(() => {
    if (initialData) {
      if (initialData.nomor_lp || initialData.nomor_register) {
        setNomorDumas(initialData.nomor_lp || initialData.nomor_register);
      }

      const p = initialData.pelapor || {};
      const ttlCombined = initialData.pelapor_ttl || p.tempat_tanggal_lahir || p.ttl || [initialData.pelapor_tempat_lahir || p.tempat_lahir, initialData.pelapor_tanggal_lahir || p.tanggal_lahir].filter(Boolean).join(', ') || '';
      setPelapor({
        nik: initialData.pelapor_nik || p.nik || initialData.nik_pelapor || '',
        nama: initialData.pelapor_nama || p.nama || initialData.nama_pelapor || p.nama_lengkap || '',
        tempat_tanggal_lahir: ttlCombined,
        ttl: ttlCombined,
        tempat_lahir: initialData.pelapor_tempat_lahir || p.tempat_lahir || (ttlCombined ? ttlCombined.split(',')[0]?.trim() : ''),
        tanggal_lahir: initialData.pelapor_tanggal_lahir || p.tanggal_lahir || (ttlCombined && ttlCombined.includes(',') ? ttlCombined.split(',')[1]?.trim() : ''),
        jenis_kelamin: initialData.pelapor_jenis_kelamin || p.jenis_kelamin || p.jk || initialData.jenis_kelamin || 'Laki-laki',
        agama: initialData.pelapor_agama || p.agama || initialData.agama || 'Islam',
        pekerjaan: initialData.pelapor_pekerjaan || p.pekerjaan || initialData.pekerjaan || '',
        kewarganegaraan: initialData.pelapor_kewarganegaraan || p.kewarganegaraan || 'WNI',
        telepon: initialData.pelapor_kontak || p.telepon || p.kontak || initialData.kontak || initialData.no_hp || '',
        alamat: initialData.pelapor_alamat || p.alamat || initialData.alamat || ''
      });

      if (Array.isArray(initialData.saksi_list) && initialData.saksi_list.length > 0) {
        setSaksiList(initialData.saksi_list);
      } else if (Array.isArray(initialData.saksi) && initialData.saksi.length > 0) {
        setSaksiList(initialData.saksi);
      }

      if (Array.isArray(initialData.terlapor_list) && initialData.terlapor_list.length > 0) {
        setTerlaporList(initialData.terlapor_list);
      } else if (Array.isArray(initialData.terlapor) && initialData.terlapor.length > 0) {
        setTerlaporList(initialData.terlapor);
      } else if (initialData.terlapor_nama) {
        setTerlaporList([{
          id: 'terlapor-1',
          nama: initialData.terlapor_nama,
          nik: initialData.terlapor_nik || '',
          ttl: initialData.terlapor_ttl || '',
          pekerjaan: initialData.terlapor_pekerjaan || '',
          agama: initialData.terlapor_agama || 'Islam',
          alamat: initialData.terlapor_domisili || '',
          kontak: initialData.terlapor_kontak || '',
          role_label: initialData.terlapor_status || 'Terlapor Utama'
        }]);
      }

      setCaseInfo({
        waktu_kejadian: initialData.tempus_delicti || initialData.waktu_kejadian || '',
        tkp: initialData.locus_delicti || initialData.tkp || '',
        tindak_pidana: initialData.tindak_pidana || initialData.dugaan_tindak_pidana || '',
        pasal: initialData.pasal_disangkakan || initialData.pasal || '',
        uraian: initialData.uraian_kejadian || initialData.uraian_singkat || initialData.uraian || ''
      });

      const existingEvidence = 
        (Array.isArray(initialData.lampiran_barang_bukti) && initialData.lampiran_barang_bukti.length > 0)
          ? initialData.lampiran_barang_bukti
          : (Array.isArray(initialData.barang_bukti) && initialData.barang_bukti.length > 0)
            ? initialData.barang_bukti
            : [];
      
      if (existingEvidence.length > 0) {
        setDaftarBukti(existingEvidence);
      } else if (initialData.nomor_lp || (initialData.id && isUUID(initialData.id))) {
        // Fallback fetch dari Supabase barang_bukti jika object belum memuat relasi bukti
        const loadBuktiFromDb = async () => {
          try {
            let query = supabase.from('barang_bukti').select('*');
            if (initialData.nomor_lp) {
              query = query.eq('nomor_register', initialData.nomor_lp);
            } else {
              query = query.eq('id_perkara', initialData.id);
            }
            const { data: bbRows } = await query.order('created_at', { ascending: true });
            if (bbRows && bbRows.length > 0) {
              const formatted = bbRows.map(row => ({
                id: row.id,
                nama_file: row.nama_berkas || row.nama_file || 'Berkas Bukti',
                file_url: row.file_url || row.url,
                url: row.file_url || row.url,
                kategori_bukti: row.tipe_berkas?.includes('pdf') ? 'DOKUMEN_PDF' : 'OBJEK_FISIK_JPG',
                mime_type: row.tipe_berkas,
                file_size_bytes: row.ukuran_berkas,
                keterangan: row.keterangan,
                hash_sha256: row.hash_sha256,
                created_at: row.created_at
              }));
              setDaftarBukti(formatted);
            }
          } catch (e) {
            console.warn('Gagal memuat barang bukti untuk form edit:', e);
          }
        };
        loadBuktiFromDb();
      }
    }
  }, [initialData]);

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
      ...(initialData || {}),
      id: initialData?.id || _perkaraId || undefined,
      nomor_lp: generatedNo,
      nomor_register: generatedNo,
      tanggal_lapor: initialData?.tanggal_lapor || new Date().toISOString(),
      penyidik_id: initialData?.penyidik_id || currentUserProfile?.id || 'penyidik-spkt',
      penyidik_nama: initialData?.penyidik_nama || currentUserProfile?.nama || 'Penyidik Penerima SPKT',
      penyidik_nrp: initialData?.penyidik_nrp || currentUserProfile?.nrp || '-',
      status_berkas: initialData?.status_berkas || 'Tahap Penyelidikan (Sp.Lidik)',
      status_tahap: initialData?.status_tahap || undefined,
      is_locked_spkt: initialData?.is_locked_spkt || false,

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
      daftar_bukti: daftarBukti,
      lampiran_barang_bukti: daftarBukti,
      _isEdit: mode === 'edit'
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
      <div className="relative group/card bg-[#05070a]/70 backdrop-blur-xl border border-white/10 rounded-xl p-4 sm:p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_0_rgba(0,0,0,0.37)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <HudCorners size="md" />
        <div className="flex items-center gap-3.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 cursor-pointer shrink-0 transition-all font-mono"
              title="Kembali ke Daftar Dumas"
            >
              <ArrowLeft size={16} />
            </button>
          )}

          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-950/40 border border-red-500/30 shrink-0">
                {isSubmitting ? (
                  <Loader2 size={18} className="text-red-500 animate-spin" />
                ) : (
                  <Shield size={18} className="text-red-500" />
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold font-mono tracking-tight text-white m-0">
                  FORMULIR PENGADUAN MASYARAKAT (DUMAS)
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-red-950/40 border border-red-500/30 text-red-400 font-bold">
                  {mode === 'edit' ? 'MODE EDIT' : 'MODE BARU'}
                </span>
              </div>
            </div>
            <p className="text-xs text-zinc-400 mt-1 pl-[48px]">
              Modul formulir terpadu SAT RESKRIM POLRES KOLAKA TIMUR
            </p>
          </div>
        </div>

        {daftarBukti.length > 0 && (
          <button
            type="button"
            onClick={handleClearEvidence}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 border border-rose-500/30 cursor-pointer transition-all"
            title="Kosongkan Berkas Bukti"
          >
            <RotateCcw size={12} />
            <span>Kosongkan Bukti</span>
          </button>
        )}
      </div>

      {/* Bagian Informasi Registrasi & Nomor Dumas */}
      <div className="relative group/card bg-[#05070a]/70 backdrop-blur-xl border border-white/10 rounded-xl p-4 sm:p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_0_rgba(0,0,0,0.37)] mb-6">
        <HudCorners size="md" />
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-red-400" />
            <span className="text-xs font-semibold font-mono tracking-wider uppercase text-zinc-200">
              Nomor Registrasi Dumas
            </span>
            <span className="text-red-500">*</span>
            <span className="text-[10px] font-mono bg-red-950/30 text-red-400 border border-red-500/30 rounded px-2 py-0.5">
              Otomatis Sistem / Bisa Diedit Manual
            </span>
          </div>

          {ocrNomorSurat && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-zinc-400">Scan OCR:</span>
              <button
                type="button"
                onClick={() => setNomorDumas(ocrNomorSurat)}
                className={`text-[11px] font-mono px-2 py-0.5 rounded cursor-pointer transition-all ${
                  nomorDumas === ocrNomorSurat
                    ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/40 font-bold'
                    : 'bg-white/5 text-zinc-300 border border-white/10 hover:bg-white/10'
                }`}
                title="Gunakan nomor surat hasil scan dokumen OCR"
              >
                Gunakan No. OCR
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-500">
              <Hash size={15} />
            </div>
            <input
              type="text"
              value={nomorDumas}
              onChange={(e) => setNomorDumas(e.target.value)}
              placeholder="B/DUMAS/01/IX/2026/SPKT/Polres Koltim/Polda Sultra"
              className="w-full bg-black/40 backdrop-blur-sm border border-white/10 text-white placeholder-zinc-500 rounded-lg pl-9 pr-3.5 py-2.5 text-xs font-mono focus:border-red-500/80 focus:ring-1 focus:ring-red-500/50 outline-none transition-all"
            />
          </div>
          
          <button
            type="button"
            onClick={handleResetNomorOtomatis}
            disabled={isGeneratingNo}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-mono font-medium bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
            title="Kembalikan ke nomor registrasi rekomendasi sistem dinas"
          >
            {isGeneratingNo ? (
              <Loader2 size={13} className="animate-spin text-red-400" />
            ) : (
              <RotateCcw size={13} className="text-zinc-400" />
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
      <div className="sticky bottom-0 z-30 p-3.5 md:px-5 relative group/card bg-[#05070a]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_-8px_25px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.06)] flex items-center justify-between gap-3">
        <HudCorners size="md" />
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-mono font-medium bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 transition-all cursor-pointer"
        >
          <ArrowLeft size={14} />
          Batal
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const currentFormData = {
                nomor_lp: nomorDumas,
                nomor_dumas: nomorDumas,
                nomor_sttlp: nomorDumas,
                pelapor,
                pelapor_nama: pelapor.nama,
                nama_pelapor: pelapor.nama,
                nik: pelapor.nik,
                nik_pelapor: pelapor.nik,
                kewarganegaraan: pelapor.kewarganegaraan,
                jenis_kelamin: pelapor.jenis_kelamin || pelapor.jk,
                tempat_lahir: pelapor.tempat_lahir,
                tanggal_lahir: pelapor.tanggal_lahir,
                pelapor_ttl: pelapor.tempat_tanggal_lahir || pelapor.ttl || [pelapor.tempat_lahir, pelapor.tanggal_lahir].filter(Boolean).join(', '),
                pelapor_pekerjaan: pelapor.pekerjaan,
                pekerjaan: pelapor.pekerjaan,
                pelapor_agama: pelapor.agama,
                agama: pelapor.agama,
                pelapor_alamat: pelapor.alamat,
                alamat: pelapor.alamat,
                pelapor_kontak: pelapor.telepon,
                no_hp: pelapor.telepon,
                kontak: pelapor.telepon,
                terlapor_list: terlaporList,
                saksi_list: saksiList,
                tindak_pidana: caseInfo.tindak_pidana,
                pasal_disangkakan: caseInfo.pasal,
                locus_delicti: caseInfo.tkp,
                locus: caseInfo.tkp,
                tempus_delicti: caseInfo.waktu_kejadian,
                tempus: caseInfo.waktu_kejadian,
                uraian_kejadian: caseInfo.uraian
              };
              printSuratPengaduan(currentFormData);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-semibold text-sky-400 bg-sky-950/30 hover:bg-sky-900/50 border border-sky-500/30 transition-all cursor-pointer"
            title="Cetak Surat Laporan Pengaduan (Dumas)"
          >
            <Printer size={14} />
            <span>Cetak Dumas</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const currentFormData = {
                nomor_lp: nomorDumas,
                nomor_dumas: nomorDumas,
                nomor_sttlp: nomorDumas,
                pelapor,
                pelapor_nama: pelapor.nama,
                nama_pelapor: pelapor.nama,
                nik: pelapor.nik,
                nik_pelapor: pelapor.nik,
                kewarganegaraan: pelapor.kewarganegaraan,
                jenis_kelamin: pelapor.jenis_kelamin || pelapor.jk,
                tempat_lahir: pelapor.tempat_lahir,
                tanggal_lahir: pelapor.tanggal_lahir,
                pelapor_ttl: pelapor.tempat_tanggal_lahir || pelapor.ttl || [pelapor.tempat_lahir, pelapor.tanggal_lahir].filter(Boolean).join(', '),
                pelapor_pekerjaan: pelapor.pekerjaan,
                pekerjaan: pelapor.pekerjaan,
                pelapor_agama: pelapor.agama,
                agama: pelapor.agama,
                pelapor_alamat: pelapor.alamat,
                alamat: pelapor.alamat,
                pelapor_kontak: pelapor.telepon,
                no_hp: pelapor.telepon,
                kontak: pelapor.telepon,
                terlapor_list: terlaporList,
                saksi_list: saksiList,
                tindak_pidana: caseInfo.tindak_pidana,
                pasal_disangkakan: caseInfo.pasal,
                locus_delicti: caseInfo.tkp,
                locus: caseInfo.tkp,
                tempus_delicti: caseInfo.waktu_kejadian,
                tempus: caseInfo.waktu_kejadian,
                uraian_kejadian: caseInfo.uraian
              };
              setTempFormDataForPrint(currentFormData);
              setIsPamaptaModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/30 hover:bg-emerald-900/50 border border-emerald-500/30 transition-all cursor-pointer"
            title="Cetak Surat Tanda Penerimaan Laporan (STTLP)"
          >
            <FileText size={14} />
            <span>Cetak Tanda Terima</span>
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold font-mono bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-[0_0_15px_-3px_rgba(239,68,68,0.3)] border border-red-500/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isSubmitting
              ? 'Menyimpan Dumas...'
              : mode === 'edit'
              ? 'Simpan Perubahan Dumas'
              : 'Simpan Laporan Dumas'}
          </button>
        </div>
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

      {/* Modal Pilihan Pejabat PAMAPTA untuk Cetak STTL */}
      {isPamaptaModalOpen && (
        <ModalSelectPamapta
          isOpen={isPamaptaModalOpen}
          onClose={() => setIsPamaptaModalOpen(false)}
          onConfirmPrint={(officer) => {
            setIsPamaptaModalOpen(false);
            if (tempFormDataForPrint) {
              printTandaTerimaDumas(tempFormDataForPrint, officer);
            }
          }}
        />
      )}
    </div>
  );
}

export { DumasFormView };
