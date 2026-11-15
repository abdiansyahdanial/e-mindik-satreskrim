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
import { printSuratPengaduan, printTandaTerimaDumas } from '../../utils/dumasPrintGenerator.js';
import ModalSelectPamapta from './ModalSelectPamapta';
import { HudCard, HudCorners } from '../command/hud';

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
  const [isPamaptaModalOpen, setIsPamaptaModalOpen] = useState(false);
  const [selectedDumasForPrint, setSelectedDumasForPrint] = useState(null);

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
        <span
          className="badge-delta badge-lidik"
          style={{ background: '#FFFFFF', border: '1px solid #FFFFFF', color: '#0E0C0A', fontWeight: 700, borderRadius: '9999px' }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF5A1F' }}></span>
          Tahap Lidik
        </span>
      );
    }
    if (s.includes('sidik') || s.includes('penyidikan')) {
      return (
        <span
          className="badge-delta badge-sidik"
          style={{ background: '#FFFFFF', border: '1px solid #FFFFFF', color: '#0E0C0A', fontWeight: 700, borderRadius: '9999px' }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF5A1F' }}></span>
          Tahap Sidik
        </span>
      );
    }
    if (s.includes('p21') || s.includes('p-21') || s.includes('selesai')) {
      return (
        <span
          className="badge-delta badge-p21"
          style={{ background: '#FFFFFF', border: '1px solid #FFFFFF', color: '#0E0C0A', fontWeight: 700, borderRadius: '9999px' }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#E07020' }}></span>
          P-21 Selesai
        </span>
      );
    }
    if (s.includes('sp3') || s.includes('henti')) {
      return (
        <span
          className="badge-delta badge-sp3"
          style={{ background: 'rgba(251, 219, 175, 0.12)', border: '1px solid rgba(251, 219, 175, 0.28)', color: '#FBDBAF', borderRadius: '9999px' }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#E07020' }}></span>
          SP3
        </span>
      );
    }
    return (
      <span
        className="badge-delta badge-lidik"
        style={{ background: '#FFFFFF', border: '1px solid #FFFFFF', color: '#0E0C0A', fontWeight: 700, borderRadius: '9999px' }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF5A1F' }}></span>
        {status || 'Tahap Penyelidikan'}
      </span>
    );
  };

  return (
    <div className="dumas-container p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl w-full mx-auto flex flex-col gap-5">

        {/* ======================================================= */}
        {/* HEADER & QUICK TITLE */}
        {/* ======================================================= */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFFFFF] text-[#0E0C0A] text-[11px] font-mono font-bold tracking-wider mb-2.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F]"></span>
              SISTEM INFORMASI REGISTRASI DUMAS PRESISI
            </div>
            <h1 className="heading-font text-xl md:text-2xl font-bold text-white uppercase tracking-[0.04em] m-0">
              DAFTAR PENGADUAN MASYARAKAT (DUMAS)
            </h1>
            <p className="text-xs text-[#FBDBAF]/70 mt-1 mb-0">
              Satreskrim Polres Kolaka Timur • Arsip Pengaduan, Berkas LP Awal, &amp; Map Kedinasan
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {hasDraft && onOpenDraft && (
              <button
                type="button"
                onClick={onOpenDraft}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-transparent border border-[#FBDBAF]/30 text-[#FBDBAF] rounded-full text-xs font-mono font-semibold cursor-pointer hover:bg-white/10 hover:border-white hover:text-white transition-all"
                title="Buka kembali draf formulir yang tersimpan di browser"
              >
                <Clock size={14} className="text-[#E07020]" />
                <span>Lanjutkan Draf Tersimpan</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenModeSelect}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold font-mono bg-[#E07020] hover:bg-white text-white hover:text-[#0E0C0A] border border-[#FF5A1F] hover:border-white shadow-[0_0_20px_-3px_rgba(224,112,32,0.45)] transition-all cursor-pointer tracking-wide"
              title="Registrasi Dumas Baru"
            >
              <FilePlus size={15} />
              <span>+ Input Dumas Baru</span>
            </button>
          </div>
        </div>

        {/* ======================================================= */}
        {/* KONTEN UTAMA: OBSIDIAN GLASS CONTAINER (CYBER RONIN) */}
        {/* ======================================================= */}
        <div className="cyber-card relative group/card bg-[rgba(18,14,11,0.68)] backdrop-blur-[18px] border border-[#FBDBAF]/15 rounded-[18px] p-4 sm:p-5 shadow-[0_14px_38px_rgba(0,0,0,0.5)] flex flex-col gap-4">
          <HudCorners size="md" />
          
          {/* TOOLBAR ATAS (SEARCH & FILTER DROPDOWN) */}
          <div className="flex items-center justify-between flex-wrap gap-3.5">
            <div className="flex items-center gap-2.5 flex-1 min-w-[280px] flex-wrap">
              <div className="relative flex-1 min-w-[220px]">
                <Search size={15} className="absolute left-3.5 top-3 text-[#FBDBAF]/60 pointer-events-none" />
                <input 
                  id="dumas_search_term"
                  name="dumas_search_term"
                  type="text"
                  autoComplete="off"
                  aria-label="Cari No. Dumas, Pelapor, Terlapor, atau Pasal"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari No. Dumas, Pelapor, Terlapor, atau Pasal..."
                  className="w-full bg-[#181411] border border-[#FBDBAF]/20 text-white placeholder-[#FBDBAF]/45 rounded-full pl-9 pr-4 py-2 text-xs font-mono focus:border-[#FF5A1F] outline-none transition-all"
                />
              </div>

              {/* DROPDOWN FILTER KATEGORI TINDAK PIDANA */}
              <div className="flex items-center gap-1.5">
                <select
                  id="dumas_crime_category_filter"
                  name="dumas_crime_category_filter"
                  aria-label="Filter Kategori Tindak Pidana"
                  value={selectedCrimeCategory}
                  onChange={(e) => setSelectedCrimeCategory(e.target.value)}
                  className="bg-[#181411] border border-[#FBDBAF]/20 text-[#FBDBAF] rounded-full px-4 py-2 text-xs font-mono focus:border-[#FF5A1F] outline-none cursor-pointer max-w-[240px]"
                  title="Filter Berdasarkan Kategori Kejahatan"
                >
                  <option value="" className="bg-[#161310] text-white">Semua Kategori Pidana</option>
                  {CRIME_CATEGORIES.map((group) => (
                    <optgroup key={group.group} label={group.group} className="bg-[#161310] text-[#E07020]">
                      {group.categories.map((cat) => (
                        <React.Fragment key={cat.name}>
                          <option value={cat.name} className="bg-[#161310] text-white font-bold">
                            ── Semua {cat.name} ──
                          </option>
                          {cat.items.map((subItem) => (
                            <option key={subItem} value={subItem} className="bg-[#161310] text-[#FBDBAF]">
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
                    className="bg-transparent border-none text-[#FF5A1F] text-xs font-mono cursor-pointer px-2 py-1 whitespace-nowrap hover:text-white"
                    title="Hapus filter kategori pidana"
                  >
                    ✕ Reset
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <label htmlFor="dumas_status_filter" className="text-[#FBDBAF]/70">Status:</label>
              <select
                id="dumas_status_filter"
                name="dumas_status_filter"
                aria-label="Filter Status Laporan Dumas"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#181411] border border-[#FBDBAF]/20 text-white rounded-full px-4 py-2 text-xs font-mono focus:border-[#FF5A1F] outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-[#161310] text-white">Semua Status</option>
                <option value="Penyelidikan" className="bg-[#161310] text-white">Tahap Penyelidikan</option>
                <option value="Penyidikan" className="bg-[#161310] text-white">Tahap Penyidikan</option>
              </select>
            </div>
          </div>

          {/* TABEL DATA DUMAS PRESISI */}
          <div className="relative group/card bg-[rgba(14,12,10,0.72)] border border-[#FBDBAF]/14 rounded-[16px] shadow-[inset_0_1px_1px_rgba(251,219,175,0.05)] overflow-x-auto">
            <HudCorners size="sm" />
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#181411] text-[#FBDBAF]/60 font-mono text-[11px] uppercase border-b border-[#FBDBAF]/14">
                  <th className="p-3.5 font-semibold tracking-wider w-64">NO. DUMAS / TANGGAL</th>
                  <th className="p-3.5 font-semibold tracking-wider">PELAPOR / KORBAN</th>
                  <th className="p-3.5 font-semibold tracking-wider">PIHAK TERLAPOR</th>
                  <th className="p-3.5 font-semibold tracking-wider">DUGAAN TINDAK PIDANA &amp; PASAL</th>
                  <th className="p-3.5 font-semibold tracking-wider w-44">STATUS BERKAS</th>
                  <th className="p-3.5 font-semibold tracking-wider text-center w-20">BUKTI</th>
                  <th className="p-3.5 font-semibold tracking-wider text-right w-44">AKSI KEDINASAN</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.length > 0 ? (
                  filteredList.map((item) => {
                    const bbCount = (item.lampiran_barang_bukti || []).length;
                    return (
                      <tr 
                        key={item.id}
                        className="hover:bg-[#221C17]/80 border-b border-[#FBDBAF]/10 text-white transition-colors cursor-pointer"
                        onClick={() => onSelectDumas && onSelectDumas(item)}
                      >
                        {/* No. Dumas & Tanggal */}
                        <td className="p-3.5 align-middle">
                          <div className="pl-2.5 border-l-2 border-[#FF5A1F]">
                            <div className="font-mono text-xs font-semibold text-[#FF7A33] tracking-wide">
                              {item.nomor_lp}
                            </div>
                            <div className="font-mono text-[11px] text-[#FBDBAF]/60 mt-0.5">
                              {item.tanggal_lapor ? new Date(item.tanggal_lapor).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '14 Sep 2026'}
                            </div>
                          </div>
                        </td>

                        {/* Pelapor */}
                        <td className="p-3.5 align-middle">
                          <div className="font-semibold text-white">
                            {item.pelapor_nama || '-'}
                          </div>
                          <div className="font-mono text-[10px] text-[#FBDBAF]/50 mt-0.5">
                            NIK: {item.pelapor_nik || '-'}
                          </div>
                        </td>

                        {/* Terlapor */}
                        <td className="p-3.5 align-middle">
                          <div className="font-semibold text-[#FBDBAF]">
                            {item.terlapor_nama || '-'}
                          </div>
                          <div className="text-[10px] text-[#FBDBAF]/55 mt-0.5">
                            {item.terlapor_status || 'Terlapor Utama'}
                          </div>
                        </td>

                        {/* Delik & Dugaan Pasal */}
                        <td className="p-3.5 align-middle max-w-xs">
                          <div className="text-white truncate font-sans font-medium" title={item.tindak_pidana}>
                            {item.tindak_pidana || '-'}
                          </div>
                          <div className="text-[11px] text-[#E07020] font-medium mt-0.5 truncate font-mono" title={item.pasal_disangkakan}>
                            {item.pasal_disangkakan || '-'}
                          </div>
                        </td>

                        {/* Status Berkas */}
                        <td className="p-3.5 align-middle">
                          {renderDumasStatusBadge(item.status_berkas)}
                        </td>

                        {/* Bukti Digital Count */}
                        <td className="p-3.5 align-middle text-center">
                          <span className="inline-flex items-center gap-1.5 bg-[#181411] border border-[#FBDBAF]/25 text-[#FBDBAF] font-mono text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                            <FileText size={12} className="text-[#E07020]" />
                            <span>{bbCount}</span>
                          </span>
                        </td>

                        {/* Aksi Kedinasan */}
                        <td className="p-3.5 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onSelectDumas && onSelectDumas(item)}
                              className="inline-flex items-center justify-center w-[34px] h-[34px] rounded-full bg-[#181411] hover:bg-white text-[#FBDBAF] hover:text-[#0E0C0A] border border-[#FBDBAF]/25 hover:border-white transition-all cursor-pointer"
                              title="Buka Map Berkas Kedinasan"
                            >
                              <FolderOpen size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => printSuratPengaduan(item)}
                              className="inline-flex items-center justify-center w-[34px] h-[34px] rounded-full bg-[#181411] hover:bg-white text-[#FBDBAF] hover:text-[#0E0C0A] border border-[#FBDBAF]/25 hover:border-white transition-all cursor-pointer"
                              title="Cetak Surat Laporan Pengaduan (Dumas)"
                            >
                              <Printer size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDumasForPrint(item);
                                setIsPamaptaModalOpen(true);
                              }}
                              className="inline-flex items-center justify-center w-[34px] h-[34px] rounded-full bg-[#181411] hover:bg-white text-[#FBDBAF] hover:text-[#0E0C0A] border border-[#FBDBAF]/25 hover:border-white transition-all cursor-pointer"
                              title="Cetak Tanda Terima Laporan (STTLP)"
                            >
                              <FileText size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => onOpenGeneratorForDumas && onOpenGeneratorForDumas(item)}
                              className="inline-flex items-center justify-center w-[34px] h-[34px] rounded-full bg-[#181411] hover:bg-white text-[#FBDBAF] hover:text-[#0E0C0A] border border-[#FBDBAF]/25 hover:border-white transition-all cursor-pointer"
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
                                className="inline-flex items-center justify-center w-[34px] h-[34px] rounded-full bg-[#181411] hover:bg-[#E07020] text-[#FF5A1F] hover:text-white border border-[#E07020]/45 hover:border-[#E07020] transition-all cursor-pointer"
                                title="Hapus Berkas"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-12 px-4 text-[#FBDBAF]/60 font-mono">
                      {searchTerm ? 'Tidak ada laporan pengaduan yang cocok dengan kata kunci pencarian.' : 'Belum ada data pengaduan masyarakat. Klik tombol "+ Input Dumas Baru" untuk registrasi.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

      {/* Modal Pilihan Pejabat PAMAPTA untuk Cetak STTL */}
      {isPamaptaModalOpen && (
        <ModalSelectPamapta
          isOpen={isPamaptaModalOpen}
          onClose={() => {
            setIsPamaptaModalOpen(false);
            setSelectedDumasForPrint(null);
          }}
          onConfirmPrint={(officer) => {
            setIsPamaptaModalOpen(false);
            if (selectedDumasForPrint) {
              printTandaTerimaDumas(selectedDumasForPrint, officer);
            }
          }}
        />
      )}
    </div>
  );
}
