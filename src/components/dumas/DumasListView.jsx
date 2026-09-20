import React, { useState, useMemo } from 'react';
import { 
  FilePlus, 
  Search, 
  FolderOpen, 
  FileSignature, 
  FileText, 
  Trash2,
  Clock,
  Filter,
  Printer
} from 'lucide-react';
import { CRIME_CATEGORIES } from '../../constants/crimeCategories.js';
import { printSuratPengaduan } from '../../utils/dumasPrintGenerator.js';

// Kamus kata kunci / alias tindak pidana untuk pencocokan pintar (fuzzy keyword matching)
const CRIME_KEYWORD_ALIASES = {
  // Pencurian
  'pencurian': ['pencurian', 'curi', 'curat', 'curas', 'curanmor', '362', '363', '365', '364', '367', 'begal'],
  'pencurian biasa': ['pencurian biasa', '362'],
  'pencurian dengan pemberatan': ['pemberatan', 'curat', '363'],
  'pencurian dengan kekerasan / begal': ['kekerasan', 'curas', 'begal', '365'],
  'pencurian kendaraan bermotor': ['curanmor', 'kendaraan', 'motor', 'mobil'],
  'pencurian hewan ternak': ['hewan', 'ternak', 'sapi', 'kambing'],
  'pencurian hasil bumi / tanaman': ['hasil bumi', 'tanaman', 'sawit', 'cengkeh', 'lada', 'kakao'],
  'pencurian ringan': ['curiringan', 'ringan', '364'],
  'pencurian dalam keluarga': ['keluarga', '367'],

  // Penggelapan
  'penggelapan': ['penggelapan', 'gelap', '372', '374', '385', 'penyerobotan'],
  'penggelapan biasa': ['penggelapan biasa', '372'],
  'penggelapan dalam jabatan / pekerjaan': ['jabatan', 'pekerjaan', '374'],
  'penggelapan hak atas benda tidak bergerak / penyerobotan tanah': ['penyerobotan', 'tanah', 'tidak bergerak', '385'],

  // Penipuan
  'penipuan': ['penipuan', 'tipu', '378', 'arisan bodong', 'investasi bodong', 'online'],
  'penipuan konvensional': ['penipuan konvensional', '378'],
  'penipuan online': ['penipuan online', 'online', 'transfer', 'apk'],
  'penipuan modus investasi / arisan bodong': ['investasi', 'arisan', 'bodong'],
  'penipuan berkedok jual beli / properti': ['jual beli', 'properti', 'kavling'],

  // Pemerasan dan Pengancaman
  'pemerasan dan pengancaman': ['pemerasan', 'pengancaman', 'peras', 'ancam', '368', '369'],
  'pemerasan': ['pemerasan', 'peras', '368'],
  'pengancaman': ['pengancaman', 'ancam', '369'],

  // Perusakan Barang
  'perusakan barang': ['perusakan', 'rusak', '406', 'pembakaran', '187'],
  'perusakan barang / properti': ['perusakan', 'rusak', 'properti', '406'],
  'pembakaran dengan sengaja': ['pembakaran', 'bakar', '187'],

  // Penadahan
  'penadahan': ['penadahan', 'tadah', 'tadah barang', '480'],
  'penadahan barang hasil kejahatan': ['penadahan', 'tadah', '480'],

  // Penganiayaan
  'penganiayaan': ['penganiayaan', 'aniaya', 'anirat', '351', '352', '353', '354', '355', '170', 'pengeroyokan'],
  'penganiayaan biasa': ['penganiayaan biasa', '351'],
  'penganiayaan ringan': ['penganiayaan ringan', '352'],
  'penganiayaan berencana': ['berencana', '353'],
  'penganiayaan berat (anirat)': ['anirat', 'berat', '354'],
  'penganiayaan berat berencana': ['berat berencana', '355'],
  'pengeroyokan / kekerasan bersama-sama': ['pengeroyokan', 'bersama-sama', '170'],

  // Pembunuhan
  'pembunuhan': ['pembunuhan', 'bunuh', '338', '340', '341', '342'],
  'pembunuhan biasa': ['pembunuhan biasa', '338'],
  'pembunuhan berencana': ['berencana', '340'],
  'pembunuhan anak sendiri (infantisid)': ['infantisid', 'anak sendiri', '341'],

  // Kelalaian
  'kelalaian': ['kelalaian', 'kealpaan', 'lalai', '359', '360'],
  'kealpaan mengakibatkan luka / kematian': ['kealpaan', 'luka', 'kematian', '359', '360'],

  // Kesusilaan, Perempuan, dan Anak (PPA)
  'tindak pidana seksual & asusila': ['seksual', 'asusila', 'pemerkosaan', 'cabul', 'persetubuhan', 'tpks', 'pornografi', 'zina', '284', '285', '289', 'perlindungan anak'],
  'pemerkosaan': ['pemerkosaan', 'perkosa', '285'],
  'perbuatan cabul': ['cabul', '289'],
  'persetubuhan terhadap anak di bawah umur': ['persetubuhan', 'anak di bawah umur', '81'],
  'perbuatan cabul terhadap anak': ['cabul terhadap anak', '82'],
  'tindak pidana kekerasan seksual (tpks)': ['tpks', 'kekerasan seksual', 'uu tpks', 'uu 12 tahun 2022'],
  'pornografi / penyebaran konten porno': ['pornografi', 'porno', 'uu pornografi'],
  'perzinahan': ['perzinahan', 'zina', '284'],

  // KDRT
  'kekerasan dalam rumah tangga (kdrt)': ['kdrt', 'kekerasan dalam rumah tangga', 'uu pkdrt', 'uu 23 tahun 2004'],
  'kekerasan fisik dalam rumah tangga': ['fisik', 'kdrt'],
  'kekerasan psikis dalam rumah tangga': ['psikis', 'kdrt'],
  'penelantaran rumah tangga': ['penelantaran', 'kdrt'],
  'kekerasan seksual dalam rumah tangga': ['seksual', 'kdrt'],

  // Perdagangan Orang
  'perdagangan orang': ['tppo', 'perdagangan orang', 'human trafficking', 'uu 21 tahun 2007'],
  'tindak pidana perdagangan orang (tppo / human trafficking)': ['tppo', 'perdagangan orang', 'human trafficking', 'uu 21 tahun 2007'],

  // Kehormatan & Kemerdekaan
  'penghinaan dan pencemaran nama baik': ['penghinaan', 'pencemaran nama baik', 'fitnah', '310', '311', 'hina'],
  'pencemaran nama baik': ['pencemaran nama baik', '310'],
  'fitnah': ['fitnah', '311'],
  'penghinaan ringan': ['penghinaan ringan', '315'],
  'penculikan & perampasan kemerdekaan': ['penculikan', 'culik', 'perampasan kemerdekaan', 'penyekapan', 'sekap', '328', '333'],
  'merampas kemerdekaan orang / penyekapan': ['merampas kemerdekaan', 'penyekapan', 'sekap', '333'],
  'penculikan / membawa lari anak': ['penculikan', 'membawa lari anak', '328', '330', '332'],
  'pelanggaran wilayah privat': ['pekarangan', 'tanpa izin', '167'],
  'memasuki pekarangan tanpa izin': ['pekarangan', 'tanpa izin', '167'],

  // Siber / ITE
  'tindak pidana ite': ['ite', 'siber', 'cyber', 'elektronik', 'hacking', 'penyadapan', 'defacing', 'hoaks', 'hoax', '27', '28'],
  'penipuan siber / manipulasi data dokumen elektronik': ['penipuan siber', 'manipulasi data', 'dokumen elektronik', '35'],
  'akses ilegal (hacking)': ['akses ilegal', 'hacking', 'hack', '30'],
  'intersepsi / penyadapan ilegal': ['intersepsi', 'penyadapan', '31'],
  'perusakan sistem informasi (defacing)': ['perusakan sistem', 'defacing', '32'],
  'pencemaran nama baik di media elektronik': ['pencemaran', 'media elektronik', '27 ayat (3)'],
  'penyebaran konten asusila di media elektronik': ['konten asusila', 'media elektronik', '27 ayat (1)'],
  'pengancaman / pemerasan siber': ['pengancaman siber', 'pemerasan siber', '27 ayat (4)'],
  'penyebaran berita bohong (hoaks) yang menimbulkan keonaran': ['berita bohong', 'hoaks', 'hoax', '28 ayat (1)'],

  // Fidusia
  'jaminan fidusia': ['fidusia', 'leasing', 'uu 42 tahun 1999', '36'],
  'pengalihan objek jaminan fidusia / kendaraan leasing tanpa persetujuan': ['pengalihan', 'fidusia', 'leasing', '36'],

  // Perbankan & TPPU
  'perbankan & pencucian uang': ['tppu', 'pencucian uang', 'perbankan'],
  'tindak pidana pencucian uang (tppu)': ['tppu', 'pencucian uang', 'uu 8 tahun 2010'],
  'tindak pidana perbankan': ['perbankan', 'bank'],

  // Tipidkor
  'korupsi (tipidkor)': ['korupsi', 'tipidkor', 'suap', 'gratifikasi', 'kerugian negara', 'tipikor'],
  'kerugian keuangan negara': ['kerugian keuangan negara', 'keuangan negara', 'pasal 2', 'pasal 3'],
  'suap menyuap': ['suap', 'suap menyuap', 'menyuap'],
  'gratifikasi': ['gratifikasi'],
  'pemerasan dalam jabatan': ['pemerasan dalam jabatan', 'pasal 12'],
  'penggelapan dalam jabatan': ['penggelapan dalam jabatan', 'pasal 8'],

  // Perlindungan Konsumen
  'perlindungan konsumen & perdagangan': ['konsumen', 'perlindungan konsumen', 'izin niaga', 'penimbunan'],
  'pelanggaran hak konsumen / peredaran barang ilegal': ['hak konsumen', 'barang ilegal'],
  'penimbunan bahan pokok / pelanggaran izin niaga': ['penimbunan', 'bahan pokok', 'izin niaga'],

  // HAKI
  'kekayaan intelektual (haki)': ['haki', 'hak cipta', 'merek'],
  'pelanggaran hak cipta': ['hak cipta'],
  'pemalsuan merek terdaftar': ['merek terdaftar', 'merek'],

  // Sumber Daya Alam
  'pertambangan': ['peti', 'pertambangan', 'tambang', 'minerba'],
  'pertambangan tanpa izin (peti)': ['peti', 'pertambangan tanpa izin', 'tambang ilegal'],
  'kehutanan & perkebunan': ['kehutanan', 'perkebunan', 'illegal logging', 'pembalakan', 'perambahan', 'lahan', 'hutan'],
  'pembalakan liar (illegal logging)': ['pembalakan liar', 'illegal logging'],
  'perambahan kawasan hutan tanpa izin': ['perambahan', 'kawasan hutan'],
  'pembakaran lahan / hutan': ['pembakaran lahan', 'karhutla'],
  'lingkungan hidup': ['lingkungan hidup', 'limbah b3', 'pencemaran limbah', 'lingkungan'],
  'pencemaran limbah b3 / perusakan lingkungan': ['pencemaran limbah', 'limbah b3', 'perusakan lingkungan'],

  // Ketertiban & Surat Palsu
  'pemalsuan': ['pemalsuan', 'palsu', '263', '264', '266', 'uang palsu', 'sumpah palsu', '242'],
  'pemalsuan surat / dokumen resmi': ['pemalsuan surat', 'dokumen resmi', '263', '264'],
  'keterangan palsu ke dalam akta otentik': ['akta otentik', '266'],
  'pemalsuan uang rupiah': ['uang rupiah', 'uang palsu', 'upal'],
  'sumpah palsu / keterangan palsu di atas sumpah': ['sumpah palsu', '242'],
  'ketertiban umum': ['ketertiban umum', 'senjata tajam', 'sajam', 'senjata api', 'senpi', 'judi', 'perjudian', 'togel', 'laporan palsu'],
  'membawa senjata tajam / senjata api tanpa izin': ['senjata tajam', 'sajam', 'senjata api', 'senpi', 'darurat'],
  'perjudian konvensional / togel': ['perjudian konvensional', 'togel', 'kupon putih', '303'],
  'perjudian online': ['perjudian online', 'judi online', 'judol', 'slot'],
  'laporan palsu / pengaduan palsu ke kepolisian': ['laporan palsu', 'pengaduan palsu', '220']
};

/**
 * Helper pencocokan cerdas kategori kejahatan terhadap data laporan dumas.
 * Memeriksa kesesuaian nilai kategori, sub-item, dan kata kunci alias (misal: "Pencurian" -> "Curat", "363").
 */
function matchCrimeCategory(item, selectedCategory) {
  if (!selectedCategory) return true;

  const targetText = [
    item.tindak_pidana,
    item.dugaan_tindak_pidana,
    item.perkara,
    item.pasal,
    item.pasal_disangkakan
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const cleanSelected = selectedCategory.trim().toLowerCase();

  // 1. Cek langsung kecocokan substring nama kategori / item
  if (targetText.includes(cleanSelected)) {
    return true;
  }

  // 2. Cek keyword aliases dari kamus
  const aliases = CRIME_KEYWORD_ALIASES[cleanSelected];
  if (Array.isArray(aliases)) {
    for (const kw of aliases) {
      if (targetText.includes(kw.toLowerCase())) {
        return true;
      }
    }
  }

  // 3. Jika kategori induk dipilih, periksa semua sub-items di dalamnya
  for (const group of CRIME_CATEGORIES) {
    for (const cat of group.categories) {
      if (cat.name.toLowerCase() === cleanSelected) {
        for (const subItem of cat.items) {
          if (targetText.includes(subItem.toLowerCase())) return true;
          const subAliases = CRIME_KEYWORD_ALIASES[subItem.toLowerCase()];
          if (Array.isArray(subAliases)) {
            for (const kw of subAliases) {
              if (targetText.includes(kw.toLowerCase())) return true;
            }
          }
        }
      }
    }
  }

  // 4. Token match kata utama
  const words = cleanSelected.split(/[\s/(),-]+/).filter((w) => w.length >= 4);
  if (words.length > 0 && words.some((w) => targetText.includes(w))) {
    return true;
  }

  return false;
}

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
  const [selectedCrimeCategory, setSelectedCrimeCategory] = useState('');

  // Filter Data (Pencarian teks, kategori tindak pidana cerdas, dan status berkas)
  const filteredList = dumasList.filter(item => {
    const term = searchTerm.toLowerCase();
    const matchSearch = 
      (item.nomor_lp || '').toLowerCase().includes(term) ||
      (item.pelapor_nama || '').toLowerCase().includes(term) ||
      (item.terlapor_nama || '').toLowerCase().includes(term) ||
      (item.tindak_pidana || '').toLowerCase().includes(term) ||
      (item.pasal_disangkakan || '').toLowerCase().includes(term);

    if (!matchSearch) return false;

    // Filter Kategori Kejahatan (READ-ONLY FILTERING)
    if (selectedCrimeCategory && !matchCrimeCategory(item, selectedCrimeCategory)) {
      return false;
    }

    if (statusFilter === 'ALL') return true;
    return (item.status_berkas || '').toLowerCase().includes(statusFilter.toLowerCase());
  });

  const renderDumasStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('lidik') || s.includes('penyelidikan')) {
      return (
        <span className="badge-delta badge-lidik">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
          Tahap Lidik
        </span>
      );
    }
    if (s.includes('sidik') || s.includes('penyidikan')) {
      return (
        <span className="badge-delta badge-sidik">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          Tahap Sidik
        </span>
      );
    }
    if (s.includes('p21') || s.includes('p-21') || s.includes('selesai')) {
      return (
        <span className="badge-delta badge-p21">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          P-21 Selesai
        </span>
      );
    }
    if (s.includes('sp3') || s.includes('henti')) {
      return (
        <span className="badge-delta badge-sp3">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
          SP3
        </span>
      );
    }
    return (
      <span className="badge-delta badge-lidik">
        {status || 'Tahap Penyelidikan'}
      </span>
    );
  };

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '300px', flexWrap: 'wrap' }}>
              <div className="dumas-search-wrap" style={{ flex: 1, minWidth: '220px' }}>
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

              {/* DROPDOWN FILTER KATEGORI TINDAK PIDANA */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <select
                  id="dumas_crime_category_filter"
                  name="dumas_crime_category_filter"
                  aria-label="Filter Kategori Tindak Pidana"
                  value={selectedCrimeCategory}
                  onChange={(e) => setSelectedCrimeCategory(e.target.value)}
                  style={{
                    backgroundColor: '#111622',
                    border: '1px solid #1E293B',
                    color: '#cbd5e1',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontFamily: 'JetBrains Mono, monospace',
                    outline: 'none',
                    cursor: 'pointer',
                    maxWidth: '280px',
                    boxSizing: 'border-box'
                  }}
                  title="Filter Berdasarkan Kategori Kejahatan"
                >
                  <option value="">Semua Kategori Pidana</option>
                  {CRIME_CATEGORIES.map((group) => (
                    <optgroup key={group.group} label={group.group}>
                      {group.categories.map((cat) => (
                        <React.Fragment key={cat.name}>
                          <option value={cat.name} style={{ fontWeight: 700, color: '#60a5fa' }}>
                            ── Semua {cat.name} ──
                          </option>
                          {cat.items.map((subItem) => (
                            <option key={subItem} value={subItem}>
                              &nbsp;&nbsp;• {subItem}
                            </option>
                          ))}
                        </React.Fragment>
                      ))}
                    </optgroup>
                  ))}
                </select>

                {selectedCrimeCategory && (
                  <button
                    type="button"
                    onClick={() => setSelectedCrimeCategory('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#f87171',
                      fontSize: '11px',
                      cursor: 'pointer',
                      padding: '4px',
                      fontFamily: 'monospace',
                      whiteSpace: 'nowrap'
                    }}
                    title="Hapus filter kategori pidana"
                  >
                    ✕ Reset
                  </button>
                )}
              </div>
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
                        className="table-row-hover"
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
                          {renderDumasStatusBadge(item.status_berkas)}
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
                              onClick={() => printSuratPengaduan(item)}
                              className="dumas-action-btn"
                              style={{ color: '#38BDF8' }}
                              title="Cetak Surat Laporan Pengaduan (Dumas)"
                            >
                              <Printer size={14} />
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
