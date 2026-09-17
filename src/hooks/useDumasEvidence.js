/**
 * useDumasEvidence — Custom Hook Terpusat Manajemen Barang Bukti Digital
 * =========================================================================
 * Satu-satunya pengendali state, persistensi, dan deduplikasi bukti Dumas.
 * Menggantikan seluruh useState(daftarBukti) dan useEffect localStorage yang
 * bertumpuk di DumasFormView.jsx.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_PREFIX = 'emindik_dumas_evidence_session_';

/**
 * Normalisasi dan sanitasi satu item bukti ke struktur standar.
 * Return null jika item tidak valid (tidak punya URL).
 */
function normalizeEvidenceItem(item) {
  if (!item || typeof item !== 'object') return null;

  const rawUrl = item.fileUrl || item.url || item.file_url || item.previewUrl || '';
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) return null;

  const fileUrl = rawUrl.trim();
  const nama = String(
    item.nama_berkas || item.nama || item.name || item.nama_file || 'Dokumen Bukti'
  );
  const isPdf =
    nama.toLowerCase().endsWith('.pdf') ||
    (item.tipe || item.type || '').includes('pdf');

  return {
    id: String(item.id || `bb_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`),
    nama_berkas: nama,
    url: fileUrl,
    fileUrl: fileUrl,
    tipe: String(
      item.tipe || item.type || item.mime_type || (isPdf ? 'application/pdf' : 'image/jpeg')
    ),
    ukuran: Number(item.ukuran || item.size || item.ukuran_berkas || item.file_size_bytes || 0),
    keterangan: String(item.keterangan || 'Foto barang bukti fisik via Cloudflare R2'),
    created_at: String(item.created_at || item.uploaded_at || new Date().toISOString()),
    ...(item.hash_sha256 ? { hash_sha256: item.hash_sha256 } : {}),
    ...(item.storage_provider ? { storage_provider: item.storage_provider } : {}),
    ...(item.kategori_bukti ? { kategori_bukti: item.kategori_bukti } : {}),
  };
}

/**
 * useDumasEvidence(sessionId)
 *
 * @param {string} sessionId - ID unik sesi draft (nomorRegister atau draftSessionId).
 *   Digunakan sebagai suffix key localStorage. Jika null/undefined, pakai 'default'.
 *
 * @returns {{
 *   evidenceList: Array,
 *   addEvidence: function,
 *   removeEvidence: function,
 *   clearEvidence: function,
 *   totalEvidence: number,
 *   evidenceListRef: React.MutableRefObject
 * }}
 */
export function useDumasEvidence(sessionId) {
  const storageKey = `${STORAGE_PREFIX}${sessionId || 'default'}`;

  // ───────────────────────────────────────────────────────────────────────────
  // 1. STATE: Lazy initializer — baca langsung dari localStorage saat mount.
  //    Jaminan Zero Loss on Reload: state tidak pernah dimulai dari [] jika ada data.
  // ───────────────────────────────────────────────────────────────────────────
  const [evidenceList, setEvidenceList] = useState(() => {
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.map(normalizeEvidenceItem).filter(Boolean);
          if (cleaned.length > 0) {
            console.log(
              `[useDumasEvidence] Dipulihkan dari localStorage (${storageKey}):`,
              cleaned.length,
              'berkas'
            );
            return cleaned;
          }
        }
      }
    } catch (err) {
      console.error('[useDumasEvidence] Gagal load cache dari localStorage:', err);
    }
    return [];
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. REF: Sinkronkan ke ref agar handler async/realtime tidak stale closure.
  // ───────────────────────────────────────────────────────────────────────────
  const listRef = useRef(evidenceList);

  // ───────────────────────────────────────────────────────────────────────────
  // 3. AUTO-SAVE: Tulis ke localStorage setiap kali evidenceList berubah.
  //    Tidak menggunakan debounce agar tidak ada jeda antara state & storage.
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    listRef.current = evidenceList;
    try {
      localStorage.setItem(storageKey, JSON.stringify(evidenceList));
    } catch (err) {
      console.error('[useDumasEvidence] Gagal auto-save ke localStorage:', err);
    }
  }, [evidenceList, storageKey]);

  // ───────────────────────────────────────────────────────────────────────────
  // 4. addEvidence: Tambah bukti dengan strict deduplication via URL + ID.
  //    Return early (tanpa re-render) jika duplikat ditemukan.
  // ───────────────────────────────────────────────────────────────────────────
  const addEvidence = useCallback((newItem) => {
    if (!newItem) return;

    const fileUrl = (newItem.url || newItem.fileUrl || newItem.file_url || '').trim();
    if (!fileUrl) {
      console.warn('[useDumasEvidence] Item diabaikan: tidak ada URL valid.', newItem);
      return;
    }

    const formatted = normalizeEvidenceItem(newItem);
    if (!formatted) return;

    setEvidenceList((prevList) => {
      const isDuplicate = prevList.some((item) => {
        const existingUrl = (item.url || item.fileUrl || '').trim();
        const sameUrl = existingUrl === fileUrl;
        const sameId = !!(item.id && formatted.id && item.id === formatted.id);
        return sameUrl || sameId;
      });

      if (isDuplicate) {
        console.warn('[useDumasEvidence] Duplikat diabaikan:', fileUrl);
        return prevList; // Referensi sama → React skip re-render
      }

      console.log(
        '[useDumasEvidence] Bukti baru ditambahkan:',
        formatted.nama_berkas,
        '→',
        fileUrl
      );
      return [...prevList, formatted];
    });
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // 5. removeEvidence: Hapus berdasarkan id, url, atau fileUrl.
  // ───────────────────────────────────────────────────────────────────────────
  const removeEvidence = useCallback((targetIdOrUrl) => {
    if (!targetIdOrUrl) return;
    setEvidenceList((prev) =>
      prev.filter(
        (item) =>
          item.id !== targetIdOrUrl &&
          item.url !== targetIdOrUrl &&
          item.fileUrl !== targetIdOrUrl
      )
    );
    console.log('[useDumasEvidence] Bukti dihapus:', targetIdOrUrl);
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // 6. clearEvidence: Reset total state + hapus dari localStorage.
  //    HANYA dipanggil saat: submit laporan resmi berhasil, atau klik "Buat Form Baru".
  //    JANGAN dipanggil dari useEffect cleanup / unmount component.
  // ───────────────────────────────────────────────────────────────────────────
  const clearEvidence = useCallback(() => {
    setEvidenceList([]);
    try {
      localStorage.removeItem(storageKey);
      console.log(
        '[useDumasEvidence] Evidence cleared & localStorage key dihapus:',
        storageKey
      );
    } catch (err) {
      console.error('[useDumasEvidence] Gagal hapus localStorage:', err);
    }
  }, [storageKey]);

  return {
    evidenceList,
    addEvidence,
    removeEvidence,
    clearEvidence,
    totalEvidence: evidenceList.length,
    evidenceListRef: listRef,
  };
}
