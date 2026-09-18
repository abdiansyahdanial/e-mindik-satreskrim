/**
 * dumasEvidenceStore.js
 * =====================================================================
 * Single Source of Truth — Manajemen Barang Bukti Digital Dumas
 *
 * Modul ini adalah satu-satunya tempat logika baca/tulis daftar
 * barang bukti ke localStorage. Zero React dependency — murni
 * fungsi utilitas yang dapat dipanggil dari mana saja.
 *
 * Pola penggunaan di DumasFormView:
 *   const [daftarBukti, setDaftarBukti] = useState(() => getStoredEvidence());
 *   setDaftarBukti(prev => appendEvidenceSafely(prev, newItem));
 *   setDaftarBukti(prev => removeEvidenceSafely(prev, targetKey));
 *   resetEvidenceStore(); setDaftarBukti([]);
 */

const DUMAS_STORE_KEY = 'emindik_dumas_evidence_single_store_v1';

// 1. Baca data dari storage lokal secara aman
export const getStoredEvidence = () => {
  try {
    const raw = localStorage.getItem(DUMAS_STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[STORE] Gagal membaca storage:', err);
    return [];
  }
};

// 2. Simpan array utuh ke storage lokal
export const persistEvidence = (list) => {
  try {
    localStorage.setItem(DUMAS_STORE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('[STORE] Gagal menyimpan storage:', err);
  }
};

// 3. Tambah bukti dengan proteksi ketat anti-duplikasi berbasis URL
export const appendEvidenceSafely = (currentList, newItem) => {
  if (!newItem) return currentList;

  const targetUrl = (newItem.url || newItem.fileUrl || newItem.file_url || '').trim();
  if (!targetUrl || typeof targetUrl !== 'string') return currentList;

  const isDuplicate = currentList.some(
    (item) => (item.url || item.fileUrl || '').trim() === targetUrl
  );
  if (isDuplicate) {
    console.warn('[STORE DEDUP] Berkas diabaikan karena URL sudah ada:', targetUrl);
    return currentList;
  }

  const sanitizedItem = {
    id: newItem.id || `bb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    nama_berkas: String(
      newItem.nama_berkas || newItem.nama || newItem.name || newItem.nama_file || 'Barang Bukti Terlampir'
    ),
    url: targetUrl,
    fileUrl: targetUrl,
    tipe: String(
      newItem.tipe || newItem.type || newItem.mime_type ||
      (targetUrl.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
    ),
    ukuran: Number(newItem.ukuran || newItem.size || newItem.file_size_bytes || 0),
    keterangan: String(newItem.keterangan || 'Foto barang bukti fisik via Cloudflare R2'),
    created_at: String(newItem.created_at || newItem.uploaded_at || new Date().toISOString()),
    ...(newItem.hash_sha256 ? { hash_sha256: newItem.hash_sha256 } : {}),
    ...(newItem.storage_provider ? { storage_provider: newItem.storage_provider } : {}),
    ...(newItem.kategori_bukti ? { kategori_bukti: newItem.kategori_bukti } : {}),
  };

  const updated = [...currentList, sanitizedItem];
  persistEvidence(updated);
  console.log('[STORE] Bukti ditambahkan:', sanitizedItem.nama_berkas, '→', targetUrl);
  return updated;
};

// 4. Hapus bukti berdasarkan ID atau URL
export const removeEvidenceSafely = (currentList, targetKey) => {
  if (!targetKey) return currentList;
  const updated = currentList.filter(
    (item) =>
      item.id !== targetKey &&
      item.url !== targetKey &&
      item.fileUrl !== targetKey
  );
  persistEvidence(updated);
  console.log('[STORE] Bukti dihapus dengan key:', targetKey);
  return updated;
};

// 5. Kosongkan draft total
export const resetEvidenceStore = () => {
  try {
    localStorage.removeItem(DUMAS_STORE_KEY);
    console.log('[STORE] Evidence store direset, key dihapus:', DUMAS_STORE_KEY);
  } catch (err) {
    console.error('[STORE] Gagal mereset store:', err);
  }
};
