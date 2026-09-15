import React, { useState } from 'react';
import { 
  FilePlus, 
  Search, 
  FolderOpen, 
  FileSignature, 
  FileText, 
  Trash2,
  Clock
} from 'lucide-react';

export default function DumasListView({
  dumasList = [],
  onOpenModeSelect,
  hasDraft = false,
  onOpenDraft,
  onSelectDumas,
  onDeleteDumas,
  onOpenGeneratorForDumas
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Filter Data
  const filteredList = dumasList.filter(item => {
    const term = searchTerm.toLowerCase();
    const matchSearch = 
      (item.nomor_lp || '').toLowerCase().includes(term) ||
      (item.pelapor_nama || '').toLowerCase().includes(term) ||
      (item.terlapor_nama || '').toLowerCase().includes(term) ||
      (item.tindak_pidana || '').toLowerCase().includes(term) ||
      (item.pasal_disangkakan || '').toLowerCase().includes(term);

    if (!matchSearch) return false;
    if (statusFilter === 'ALL') return true;
    return (item.status_berkas || '').toLowerCase().includes(statusFilter.toLowerCase());
  });

  return (
    <div className="dumas-container" style={{ padding: '24px 32px' }}>
      <div style={{ maxWidth: '1280px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ======================================================= */}
        {/* HEADER & QUICK TITLE */}
        {/* ======================================================= */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(229, 46, 46, 0.1)',
              border: '1px solid rgba(229, 46, 46, 0.3)',
              color: '#FF352D',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 600,
              letterSpacing: '0.08em',
              marginBottom: '8px'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#FF352D' }}></span>
              SISTEM INFORMASI REGISTRASI DUMAS PRESISI
            </div>
            <h1 style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#FFFFFF',
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              fontFamily: 'JetBrains Mono, monospace',
              margin: 0
            }}>
              DAFTAR PENGADUAN MASYARAKAT (DUMAS)
            </h1>
            <p style={{ color: '#94A3B8', fontSize: '13px', margin: '4px 0 0 0', fontFamily: 'Inter, sans-serif' }}>
              Satreskrim Polres Kolaka Timur • Arsip Pengaduan, Berkas LP Awal, &amp; Map Kedinasan
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {hasDraft && onOpenDraft && (
              <button
                type="button"
                onClick={onOpenDraft}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#34D399',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                title="Buka kembali draf formulir yang tersimpan di browser"
              >
                <Clock size={15} />
                <span>Lanjutkan Draf Tersimpan</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenModeSelect}
              className="dumas-btn-new"
              title="Registrasi Dumas Baru"
            >
              <FilePlus size={16} />
              <span>+ Input Dumas Baru</span>
            </button>
          </div>
        </div>

        {/* ======================================================= */}
        {/* KONTEN UTAMA: SURFACE CARD ELEGAN (TEMA DARK CHARCOAL) */}
        {/* ======================================================= */}
        <div className="dumas-surface-card">
          
          {/* TOOLBAR ATAS (SEARCH & FILTER DROPDOWN) */}
          <div className="dumas-toolbar">
            <div className="dumas-search-wrap">
              <Search size={15} className="dumas-search-icon" />
              <input 
                id="dumas_search_term"
                name="dumas_search_term"
                type="text"
                autoComplete="off"
                aria-label="Cari No. Dumas, Pelapor, Terlapor, atau Pasal"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari No. Dumas, Pelapor, Terlapor, atau Pasal..."
                className="dumas-search-input"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}>
              <label htmlFor="dumas_status_filter" style={{ color: '#94A3B8' }}>Status:</label>
              <select
                id="dumas_status_filter"
                name="dumas_status_filter"
                aria-label="Filter Status Laporan Dumas"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="dumas-select"
              >
                <option value="ALL">Semua Status</option>
                <option value="Penyelidikan">Tahap Penyelidikan</option>
                <option value="Penyidikan">Tahap Penyidikan</option>
              </select>
            </div>
          </div>

          {/* TABEL DATA DUMAS PRESISI */}
          <div className="dumas-table-container">
            <table className="dumas-table">
              <thead>
                <tr>
                  <th style={{ width: '260px' }}>NO. DUMAS / TANGGAL</th>
                  <th>PELAPOR / KORBAN</th>
                  <th>PIHAK TERLAPOR</th>
                  <th>DUGAAN TINDAK PIDANA &amp; PASAL</th>
                  <th style={{ width: '190px' }}>STATUS BERKAS</th>
                  <th style={{ textAlign: 'center', width: '80px' }}>BUKTI</th>
                  <th style={{ textAlign: 'right', width: '140px' }}>AKSI KEDINASAN</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.length > 0 ? (
                  filteredList.map((item) => {
                    const bbCount = (item.lampiran_barang_bukti || []).length;
                    return (
                      <tr 
                        key={item.id}
                        onClick={() => onSelectDumas && onSelectDumas(item)}
                      >
                        {/* No. Dumas & Tanggal */}
                        <td>
                          <div className="dumas-cell-no">
                            <span className="dumas-no-text">
                              {item.nomor_lp}
                            </span>
                            <span className="dumas-cell-date">
                              {item.tanggal_lapor ? new Date(item.tanggal_lapor).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '14 Sep 2026'}
                            </span>
                          </div>
                        </td>

                        {/* Pelapor */}
                        <td>
                          <div style={{ fontWeight: 600, color: '#FFFFFF', fontSize: '12px' }}>
                            {item.pelapor_nama || '-'}
                          </div>
                          <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px' }}>
                            NIK: {item.pelapor_nik || '-'}
                          </div>
                        </td>

                        {/* Terlapor */}
                        <td>
                          <div style={{ fontWeight: 600, color: '#F87171', fontSize: '12px' }}>
                            {item.terlapor_nama || '-'}
                          </div>
                          <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px' }}>
                            {item.terlapor_status || 'Terlapor Utama'}
                          </div>
                        </td>

                        {/* Delik & Dugaan Pasal */}
                        <td style={{ maxWidth: '280px' }}>
                          <div style={{ color: '#E2E8F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'Inter, sans-serif' }} title={item.tindak_pidana}>
                            {item.tindak_pidana || '-'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#FBBF24', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.pasal_disangkakan}>
                            {item.pasal_disangkakan || '-'}
                          </div>
                        </td>

                        {/* Status Berkas */}
                        <td>
                          <span className="dumas-badge-status">
                            <span className="dumas-badge-status-dot"></span>
                            <span>{item.status_berkas || 'Tahap Penyelidikan'}</span>
                          </span>
                        </td>

                        {/* Bukti Digital Count */}
                        <td style={{ textAlign: 'center' }}>
                          <span className="dumas-badge-evidence">
                            <FileText size={12} color="#E52E2E" />
                            <span>{bbCount}</span>
                          </span>
                        </td>

                        {/* Aksi Kedinasan */}
                        <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => onSelectDumas && onSelectDumas(item)}
                              className="dumas-action-btn btn-red"
                              title="Buka Map Berkas Kedinasan"
                            >
                              <FolderOpen size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => onOpenGeneratorForDumas && onOpenGeneratorForDumas(item)}
                              className="dumas-action-btn"
                              title="Lanjut Buat Sprin (Generator Mindik)"
                            >
                              <FileSignature size={14} />
                            </button>

                            {onDeleteDumas && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Yakin ingin menghapus berkas pengaduan ${item.nomor_lp}?`)) {
                                    onDeleteDumas(item.id);
                                  }
                                }}
                                className="dumas-action-btn"
                                style={{ color: '#EF4444' }}
                                title="Hapus Berkas"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '48px 16px', color: '#64748B' }}>
                      {searchTerm ? 'Tidak ada laporan pengaduan yang cocok dengan kata kunci pencarian.' : 'Belum ada data pengaduan masyarakat. Klik tombol "+ Input Dumas Baru" untuk registrasi.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>
    </div>
  );
}
