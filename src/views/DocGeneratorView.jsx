import React, { useState, useEffect, useRef } from 'react';
import { 
  FileSignature, 
  ChevronRight, 
  Cloud, 
  Download, 
  RefreshCw, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit3,
  Trash2,
  X,
  FileText,
  AlertTriangle,
  Upload,
  Shield,
  Clock,
  Calendar,
  MapPin,
  Lock,
  Layers,
  Check
} from 'lucide-react';
import { mockPersonnel } from '../data/mockPersonnel';
import { supabase } from '../supabaseClient';
import { 
  deleteTemplateFromSupabase, 
  getDeletedTemplateCodes, 
  INDIVIDUAL_TSK_DOCS, 
  isIndividualSuspectDoc,
  PARENT_CASE_DOCS,
  getParentDocConfig
} from '../utils/templateHelper';
import OfficialDocPreview from '../components/OfficialDocPreview';
import { 
  generateAndDownloadDocx, 
  formatTanggalIndonesia, 
  getPenyidikPenangan, 
  formatPangkatLengkap,
  parseDateParts,
  hitungTanggalAkhirPenahanan,
  formatWaktuJam,
  terbilangTahun,
  getNamaHariIndonesia
} from '../services/mindikGenerator';
import { 
  MINDIK_PRESETS, 
  getMindikPreset, 
  getPresetTitle 
} from '../constants/mindikPresets';

// --- DAFTAR KLASTER BAKU SIDIK (A s.d. G) ---
export const SIDIK_CLUSTERS = [
  { id: 'A', name: 'A. SP.SIDIK', fullName: 'SURAT PERINTAH PENYIDIKAN' },
  { id: 'B', name: 'B. SPDP', fullName: 'PEMBERITAHUAN DIMULAINYA PENYIDIKAN (SPDP)' },
  { id: 'C', name: 'C. TERSANGKA', fullName: 'TINDAKAN TERHADAP TERSANGKA (TAP, GIL, KAP, DPO)' },
  { id: 'D', name: 'D. SITA/GELEDAH', fullName: 'PENYITAAN & PENGGELEDAHAN' },
  { id: 'E', name: 'E. SAKSI/KORBAN', fullName: 'KORBAN DAN SAKSI' },
  { id: 'F', name: 'F. PENAHANAN', fullName: 'PENAHANAN (BERJENJANG)' },
  { id: 'G', name: 'G. BERKAS PERKARA', fullName: 'BERKAS PERKARA (TAHAP I & TAHAP II)' },
];

// --- MASTER URUTAN BAKU MINDIK SIDIK (RIGID & TIDAK BOLEH DILANGKAHI) ---
export const MASTER_MINDIK_SIDIK = [
  // A. SURAT PERINTAH PENYIDIKAN
  {
    cluster: 'A',
    itemNumber: 1,
    code: 'SPRIN_SIDIK',
    title: 'SURAT PERINTAH PENYIDIKAN (SP.SIDIK)',
    type: 'Wajib 1 - Gerbang Utama',
    isMandatory: true,
    aliases: ['SP_SIDIK', 'SPRIN_SIDIK_MORE_5'],
    keywords: ['PERINTAH PENYIDIKAN'],
  },
  {
    cluster: 'A',
    itemNumber: 2,
    code: 'SPGAS_SIDIK',
    title: 'SURAT PERINTAH TUGAS PENYIDIKAN (SP.GAS.SIDIK)',
    type: 'Wajib 2 - Syarat: SP.SIDIK sudah terbit',
    isMandatory: true,
    aliases: ['SPRIN_GAS_SIDIK', 'SP_GAS_SIDIK', 'SPGAS_SIDIK_MORE_5', 'SPRIN_TUGAS_PENYIDIKAN'],
    keywords: ['TUGAS PENYIDIKAN'],
  },
  {
    cluster: 'A',
    itemNumber: 3,
    code: 'SPRIN_SIDIK_TAMBAHAN',
    title: 'SURAT PERINTAH PENYIDIKAN TAMBAHAN',
    type: 'Opsional - Syarat: SP.GAS.SIDIK sudah ada',
    isMandatory: false,
    aliases: ['SP_SIDIK_TAMBAHAN'],
    keywords: ['PENYIDIKAN TAMBAHAN'],
  },
  {
    cluster: 'A',
    itemNumber: 4,
    code: 'SPGAS_SIDIK_TAMBAHAN',
    title: 'SURAT PERINTAH TUGAS PENYIDIKAN TAMBAHAN',
    type: 'Opsional - Syarat: SP.GAS.SIDIK sudah ada',
    isMandatory: false,
    aliases: ['SPRIN_GAS_SIDIK_TAMBAHAN', 'SP_GAS_SIDIK_TAMBAHAN'],
    keywords: ['TUGAS PENYIDIKAN TAMBAHAN'],
  },
  {
    cluster: 'A',
    itemNumber: 5,
    code: 'SPRIN_SIDIK_LANJUTAN',
    title: 'SURAT PERINTAH PENYIDIKAN LANJUTAN',
    type: 'Opsional - Syarat: SP.GAS.SIDIK sudah ada',
    isMandatory: false,
    aliases: ['SP_SIDIK_LANJUTAN'],
    keywords: ['PENYIDIKAN LANJUTAN'],
  },
  {
    cluster: 'A',
    itemNumber: 6,
    code: 'SPGAS_SIDIK_LANJUTAN',
    title: 'SURAT PERINTAH TUGAS PENYIDIKAN LANJUTAN',
    type: 'Opsional - Syarat: SP.GAS.SIDIK sudah ada',
    isMandatory: false,
    aliases: ['SPRIN_GAS_SIDIK_LANJUTAN', 'SP_GAS_SIDIK_LANJUTAN'],
    keywords: ['TUGAS PENYIDIKAN LANJUTAN'],
  },

  // B. PEMBERITAHUAN DIMULAINYA PENYIDIKAN (SPDP)
  {
    cluster: 'B',
    itemNumber: 1,
    code: 'SPDP_TERLAPOR',
    title: 'SURAT PEMBERITAHUAN DIMULAINYA PENYIDIKAN DENGAN TERLAPOR (SPDP TERLAPOR)',
    type: 'Wajib 3 - Syarat: SP.GAS.SIDIK sudah ada',
    isMandatory: true,
    aliases: ['SPDP', 'SPDP_DENGAN_TERLAPOR'],
    keywords: ['SPDP DENGAN TERLAPOR', 'SPDP TERLAPOR'],
  },
  {
    cluster: 'B',
    itemNumber: 2,
    code: 'SPDP_MORE_1_TERLAPOR',
    title: 'SURAT PEMBERITAHUAN DIMULAINYA PENYIDIKAN LEBIH DARI 1 TERLAPOR (SPDP LEBIH DARI 1 TERLAPOR)',
    type: 'Wajib 3 - Syarat: SP.GAS.SIDIK sudah ada',
    isMandatory: true,
    aliases: ['SPDP_LEBIH_1_TERLAPOR', 'SPDP_MORE_1_TERLAPOR'],
    keywords: ['LEBIH DARI 1 TERLAPOR', 'LEBIH 1 TERLAPOR'],
  },
  {
    cluster: 'B',
    itemNumber: 3,
    code: 'SPDP_TANPA_NAMA',
    title: 'SURAT PEMBERITAHUAN DIMULAINYA PENYIDIKAN TANPA NAMA (SPDP TANPA NAMA)',
    type: 'Wajib 3 - Syarat: SP.GAS.SIDIK sudah ada',
    isMandatory: true,
    aliases: ['SPDP_NO_NAME'],
    keywords: ['SPDP TANPA NAMA', 'TANPA NAMA'],
  },
  {
    cluster: 'B',
    itemNumber: 4,
    code: 'SPDP_TSK',
    title: 'SURAT PEMBERITAHUAN DIMULAINYA PENYIDIKAN DENGAN TERSANGKA (SPDP TERSANGKA)',
    type: 'Wajib 5 - Syarat: S.TAP.TSK Wajib 4 sudah ada!',
    isMandatory: true,
    aliases: ['SPDP_TERSANGKA'],
    keywords: ['DENGAN TERSANGKA', 'SPDP TERSANGKA'],
  },
  {
    cluster: 'B',
    itemNumber: 5,
    code: 'SPDP_MORE_1_TSK',
    title: 'SURAT PEMBERITAHUAN DIMULAINYA PENYIDIKAN LEBIH DARI 1 TERSANGKA (SPDP LEBIH DARI 1 TERSANGKA)',
    type: 'Wajib 5 - Syarat: S.TAP.TSK Wajib 4 sudah ada!',
    isMandatory: true,
    aliases: ['SPDP_MORE_1_TERSANGKA', 'SPDP_LEBIH_1_TSK'],
    keywords: ['LEBIH DARI 1 TERSANGKA', 'LEBIH 1 TERSANGKA'],
  },

  // C. TINDAKAN TERHADAP TERSANGKA (TAP, GIL, KAP, DPO)
  {
    cluster: 'C',
    itemNumber: 1,
    code: 'SP_TAP_TSK',
    title: 'SURAT KETETAPAN PENETAPAN TERSANGKA (S.TAP.TSK)',
    type: 'Wajib 4 - Syarat: SP.SIDIK & SP.GAS.SIDIK sudah ada',
    isMandatory: true,
    aliases: ['TAP_TSK', 'S_TAP_TSK'],
    keywords: ['PENETAPAN TERSANGKA', 'S.TAP.TSK', 'SP.TAP'],
  },
  {
    cluster: 'C',
    itemNumber: 2,
    code: 'SPGL_TSK_1',
    title: 'SURAT PANGGILAN TERSANGKA KE-1',
    type: 'Wajib 6 - Syarat: S.TAP.TSK Wajib 4 sudah terbit',
    isMandatory: true,
    aliases: ['PANGGILAN_TSK_1', 'SPGL_1_TSK'],
    keywords: ['PANGGILAN TERSANGKA KE-1', 'PANGGILAN TERSANGKA 1'],
  },
  {
    cluster: 'C',
    itemNumber: 3,
    code: 'SPGL_TSK_2',
    title: 'SURAT PANGGILAN TERSANGKA KE-2',
    type: 'Wajib 6 - Syarat: Surat Panggilan Ke-1 sudah ada',
    isMandatory: true,
    aliases: ['PANGGILAN_TSK_2', 'SPGL_2_TSK'],
    keywords: ['PANGGILAN TERSANGKA KE-2', 'PANGGILAN TERSANGKA 2'],
  },
  {
    cluster: 'C',
    itemNumber: 4,
    code: 'SPRIN_BAWA_TSK',
    title: 'SURAT PERINTAH MEMBAWA TERSANGKA',
    type: 'Wajib 6 - Syarat: Surat Panggilan Ke-2 sudah ada',
    isMandatory: true,
    aliases: ['SPRIN_BAWA_TSK_DAN_BA', 'SP_BAWA_TSK', 'BAWA_TSK'],
    keywords: ['MEMBAWA TERSANGKA'],
  },
  {
    cluster: 'C',
    itemNumber: 5,
    code: 'SPRIN_KAP',
    title: 'SURAT PERINTAH PENANGKAPAN (SP.KAP)',
    type: 'Wajib 6 - Syarat: S.TAP.TSK Wajib 4 sudah terbit',
    isMandatory: true,
    aliases: ['SPRIN_KAP_DAN_BA', 'SP_KAP', 'BA_KAP'],
    keywords: ['PERINTAH PENANGKAPAN', 'SP.KAP'],
  },
  {
    cluster: 'C',
    itemNumber: 6,
    code: 'DPO',
    title: 'DAFTAR PENCARIAN ORANG (DPO)',
    type: 'Opsional - Syarat: S.TAP.TSK sudah terbit',
    isMandatory: false,
    aliases: ['SURAT_DPO'],
    keywords: ['PENCARIAN ORANG', 'DPO'],
  },

  // D. PENYITAAN & PENGGELEDAHAN
  {
    cluster: 'D',
    itemNumber: 1,
    code: 'SPRIN_SITA_UMUM',
    title: 'SURAT PERINTAH PENYITAAN UMUM (SP.SITA UMUM)',
    type: 'Opsional - Syarat: SP.SIDIK & SP.GAS.SIDIK',
    isMandatory: false,
    aliases: ['SP_SITA_UMUM', 'SPRIN_SITA'],
    keywords: ['PENYITAAN UMUM', 'PERINTAH PENYITAAN'],
  },
  {
    cluster: 'D',
    itemNumber: 2,
    code: 'BA_SITA',
    title: 'BERITA ACARA PENYITAAN (BA SITA)',
    type: 'Opsional - Syarat: SP.SIDIK & SP.GAS.SIDIK',
    isMandatory: false,
    aliases: ['BERITA_ACARA_SITA'],
    keywords: ['BERITA ACARA PENYITAAN', 'BA SITA'],
  },
  {
    cluster: 'D',
    itemNumber: 3,
    code: 'TANDA_TERIMA_SITA',
    title: 'SURAT TANDA PENERIMAAN / TANDA TERIMA PENYITAAN',
    type: 'Opsional - Syarat: SP.SIDIK & SP.GAS.SIDIK',
    isMandatory: false,
    aliases: ['SURAT_TANDA_PENERIMAAN_SITA', 'STP_SITA'],
    keywords: ['TANDA PENERIMAAN', 'TANDA TERIMA PENYITAAN'],
  },
  {
    cluster: 'D',
    itemNumber: 4,
    code: 'MINTA_SETUJU_SITA_PN',
    title: 'SURAT PERMINTAAN PERSETUJUAN PENYITAAN KE PENGADILAN NEGERI',
    type: 'Opsional - Syarat: SP.SIDIK & SP.GAS.SIDIK',
    isMandatory: false,
    aliases: ['SURAT_MINTA_PERSETUJUAN_SITA_PN'],
    keywords: ['PERSETUJUAN PENYITAAN KE PENGADILAN NEGERI', 'PERSETUJUAN PENYITAAN'],
  },
  {
    cluster: 'D',
    itemNumber: 5,
    code: 'MOHON_IZIN_SITA_PN',
    title: 'SURAT PERMOHONAN IZIN PENYITAAN KE PENGADILAN NEGERI',
    type: 'Opsional - Syarat: SP.SIDIK & SP.GAS.SIDIK',
    isMandatory: false,
    aliases: ['SURAT_PERMOHONAN_IZIN_SITA_PN'],
    keywords: ['IZIN PENYITAAN KE PENGADILAN NEGERI', 'PERMOHONAN IZIN PENYITAAN'],
  },
  {
    cluster: 'D',
    itemNumber: 6,
    code: 'SPRIN_SITA_IZIN_KPN',
    title: 'SURAT PERINTAH PENYITAAN SETELAH IZIN KETUA PENGADILAN NEGERI',
    type: 'Opsional - Syarat: SP.SIDIK & SP.GAS.SIDIK',
    isMandatory: false,
    aliases: ['SP_SITA_IZIN_KPN'],
    keywords: ['PENYITAAN SETELAH IZIN', 'IZIN KETUA PENGADILAN NEGERI'],
  },
  {
    cluster: 'D',
    itemNumber: 7,
    code: 'SPRIN_GELEDAH_RUMAH',
    title: 'SURAT PERINTAH PENGGELEDAHAN RUMAH',
    type: 'Opsional - Syarat: SP.SIDIK & SP.GAS.SIDIK',
    isMandatory: false,
    aliases: ['SP_GELEDAH_RUMAH'],
    keywords: ['PENGGELEDAHAN RUMAH'],
  },
  {
    cluster: 'D',
    itemNumber: 8,
    code: 'SPRIN_GELEDAH_BADAN',
    title: 'SURAT PERINTAH PENGGELEDAHAN BADAN',
    type: 'Opsional - Syarat: SP.SIDIK & SP.GAS.SIDIK',
    isMandatory: false,
    aliases: ['SP_GELEDAH_BADAN'],
    keywords: ['PENGGELEDAHAN BADAN'],
  },
  {
    cluster: 'D',
    itemNumber: 9,
    code: 'MINTA_SETUJU_GELEDAH_PN',
    title: 'SURAT PERMINTAAN PERSETUJUAN PENGGELEDAHAN KE PENGADILAN NEGERI',
    type: 'Opsional - Syarat: SP.SIDIK & SP.GAS.SIDIK',
    isMandatory: false,
    aliases: ['SURAT_MINTA_PERSETUJUAN_GELEDAH_PN'],
    keywords: ['PERSETUJUAN PENGGELEDAHAN KE PENGADILAN NEGERI', 'PERSETUJUAN PENGGELEDAHAN'],
  },
  {
    cluster: 'D',
    itemNumber: 10,
    code: 'MOHON_IZIN_GELEDAH_PN',
    title: 'SURAT PERMOHONAN IZIN PENGGELEDAHAN RUMAH KE PENGADILAN NEGERI',
    type: 'Opsional - Syarat: SP.SIDIK & SP.GAS.SIDIK',
    isMandatory: false,
    aliases: ['SURAT_PERMOHONAN_IZIN_GELEDAH_PN'],
    keywords: ['IZIN PENGGELEDAHAN RUMAH KE PENGADILAN NEGERI', 'IZIN PENGGELEDAHAN'],
  },
  {
    cluster: 'D',
    itemNumber: 11,
    code: 'DPB',
    title: 'DAFTAR PENCARIAN BARANG (DPB)',
    type: 'Opsional - Syarat: SP.SIDIK & SP.GAS.SIDIK',
    isMandatory: false,
    aliases: ['DAFTAR_PENCARIAN_BARANG'],
    keywords: ['PENCARIAN BARANG', 'DPB'],
  },

  // E. KORBAN DAN SAKSI
  {
    cluster: 'E',
    itemNumber: 1,
    code: 'SPGL_SAKSI_1',
    title: 'SURAT PANGGILAN SAKSI KE-1',
    type: 'Opsional - Syarat: SP.SIDIK & SP.GAS.SIDIK',
    isMandatory: false,
    aliases: ['PANGGILAN_SAKSI_1'],
    keywords: ['PANGGILAN SAKSI KE-1', 'PANGGILAN SAKSI 1'],
  },
  {
    cluster: 'E',
    itemNumber: 2,
    code: 'SPGL_SAKSI_2',
    title: 'SURAT PANGGILAN SAKSI KE-2',
    type: 'Opsional - Syarat: SP.SIDIK & SP.GAS.SIDIK',
    isMandatory: false,
    aliases: ['PANGGILAN_SAKSI_2'],
    keywords: ['PANGGILAN SAKSI KE-2', 'PANGGILAN SAKSI 2'],
  },
  {
    cluster: 'E',
    itemNumber: 3,
    code: 'BA_HAK_KORBAN',
    title: 'BERITA ACARA PENYAMPAIAN HAK-HAK KORBAN',
    type: 'Opsional - Syarat: SP.SIDIK & SP.GAS.SIDIK',
    isMandatory: false,
    aliases: ['HAK_KORBAN'],
    keywords: ['HAK-HAK KORBAN', 'HAK KORBAN'],
  },
  {
    cluster: 'E',
    itemNumber: 4,
    code: 'BA_HAK_SAKSI',
    title: 'BERITA ACARA PENYAMPAIAN HAK-HAK SAKSI',
    type: 'Opsional - Syarat: SP.SIDIK & SP.GAS.SIDIK',
    isMandatory: false,
    aliases: ['HAK_SAKSI'],
    keywords: ['HAK-HAK SAKSI', 'HAK SAKSI'],
  },
  {
    cluster: 'E',
    itemNumber: 5,
    code: 'BA_HAK_PEREMPUAN',
    title: 'BERITA ACARA PENYAMPAIAN HAK-HAK PEREMPUAN',
    type: 'Opsional - Syarat: SP.SIDIK & SP.GAS.SIDIK',
    isMandatory: false,
    aliases: ['HAK_PEREMPUAN'],
    keywords: ['HAK-HAK PEREMPUAN', 'HAK PEREMPUAN'],
  },
  {
    cluster: 'E',
    itemNumber: 6,
    code: 'BA_HAK_LANSIA',
    title: 'BERITA ACARA PENYAMPAIAN HAK-HAK LANSIA',
    type: 'Opsional - Syarat: SP.SIDIK & SP.GAS.SIDIK',
    isMandatory: false,
    aliases: ['HAK_LANSIA'],
    keywords: ['HAK-HAK LANSIA', 'HAK LANSIA'],
  },
  {
    cluster: 'E',
    itemNumber: 7,
    code: 'SPRIN_BAWA_SAKSI',
    title: 'SURAT PERINTAH MEMBAWA SAKSI',
    type: 'Opsional - Syarat: SP.SIDIK & SP.GAS.SIDIK',
    isMandatory: false,
    aliases: ['SP_BAWA_SAKSI'],
    keywords: ['MEMBAWA SAKSI'],
  },

  // F. PENAHANAN (BERJENJANG)
  {
    cluster: 'F',
    itemNumber: 1,
    code: 'SPRIN_HAN',
    title: 'SURAT PERINTAH PENAHANAN (SP.HAN)',
    type: 'Wajib 7 - Syarat MUTLAK: Minimal salah satu dari Wajib 6',
    isMandatory: true,
    aliases: ['SP_HAN', 'SPRIN_HAN_DAN_BA', 'BA_HAN'],
    keywords: ['PERINTAH PENAHANAN', 'SP.HAN'],
  },
  {
    cluster: 'F',
    itemNumber: 2,
    code: 'MINTA_PANJANG_HAN_40_KN',
    title: 'SURAT PERMINTAAN PERPANJANGAN PENAHANAN 40 HARI KE KEPALA KEJAKSAAN NEGERI',
    type: 'Wajib 8 - Syarat: SP.HAN sudah ada',
    isMandatory: true,
    aliases: ['SURAT_MINTA_PERPANJANG_HAN_40_HARI_KN'],
    keywords: ['PERMINTAAN PERPANJANGAN PENAHANAN 40 HARI'],
  },
  {
    cluster: 'F',
    itemNumber: 3,
    code: 'SPRIN_PANJANG_HAN_40_KN',
    title: 'SURAT PERINTAH PERPANJANGAN PENAHANAN 40 HARI KEPALA KEJAKSAAN NEGERI',
    type: 'Wajib 9 - Syarat: Permintaan 40 Hari sudah ada',
    isMandatory: true,
    aliases: ['SPRIN_PERPANJANG_HAN_40_HARI_KN_DAN_BA', 'SP_PANJANG_HAN_KN'],
    keywords: ['PERPANJANGAN PENAHANAN 40 HARI KEPALA KEJAKSAAN NEGERI'],
  },
  {
    cluster: 'F',
    itemNumber: 4,
    code: 'MINTA_PANJANG_HAN_30_PN_1',
    title: 'SURAT PERMINTAAN PERPANJANGAN PENAHANAN 30 HARI TAHAP I KE KETUA PENGADILAN NEGERI',
    type: 'Wajib 10 - Syarat: Sprin Panjang KN sudah ada',
    isMandatory: true,
    aliases: ['SURAT_MINTA_PERPANJANG_HAN_30_HARI_1_KPN'],
    keywords: ['PERMINTAAN PERPANJANGAN PENAHANAN 30 HARI TAHAP I'],
  },
  {
    cluster: 'F',
    itemNumber: 5,
    code: 'SPRIN_PANJANG_HAN_30_PN_1',
    title: 'SURAT PERINTAH PERPANJANGAN PENAHANAN 30 HARI TAHAP I KETUA PENGADILAN NEGERI',
    type: 'Wajib 11 - Syarat: Permintaan 30 Hari KPN 1 sudah ada',
    isMandatory: true,
    aliases: ['SPRIN_PERPANJANG_HAN_30_HARI_1_KPN_DAN_BA'],
    keywords: ['PERPANJANGAN PENAHANAN 30 HARI TAHAP I KETUA PENGADILAN NEGERI'],
  },
  {
    cluster: 'F',
    itemNumber: 6,
    code: 'MINTA_PANJANG_HAN_30_PN_2',
    title: 'SURAT PERMINTAAN PERPANJANGAN PENAHANAN 30 HARI TAHAP II KE KETUA PENGADILAN NEGERI',
    type: 'Wajib 12 - Syarat: Sprin Panjang KPN 1 sudah ada',
    isMandatory: true,
    aliases: ['SURAT_MINTA_PERPANJANG_HAN_30_HARI_2_KPN'],
    keywords: ['PERMINTAAN PERPANJANGAN PENAHANAN 30 HARI TAHAP II'],
  },
  {
    cluster: 'F',
    itemNumber: 7,
    code: 'SPRIN_PANJANG_HAN_30_PN_2',
    title: 'SURAT PERINTAH PERPANJANGAN PENAHANAN 30 HARI TAHAP II KETUA PENGADILAN NEGERI',
    type: 'Wajib 13 - Syarat: Permintaan 30 Hari KPN 2 sudah ada',
    isMandatory: true,
    aliases: ['SPRIN_PERPANJANG_HAN_30_HARI_2_KPN'],
    keywords: ['PERPANJANGAN PENAHANAN 30 HARI TAHAP II KETUA PENGADILAN NEGERI'],
  },
  {
    cluster: 'F',
    itemNumber: 8,
    code: 'SPRIN_KELUAR_HAN',
    title: 'SURAT PERINTAH PENGELUARAN TAHANAN',
    type: 'Opsional - Syarat: SP.HAN sudah ada',
    isMandatory: false,
    aliases: ['SP_KELUAR_HAN', 'PENGELUARAN_TAHANAN'],
    keywords: ['PENGELUARAN TAHANAN'],
  },

  // G. BERKAS PERKARA (TAHAP I & TAHAP II)
  {
    cluster: 'G',
    itemNumber: 1,
    code: 'BP_RESKRIM',
    title: 'BERKAS PERKARA (SAMPUL & DAFTAR ISI)',
    type: 'Opsional - Syarat: SP.SIDIK, SP.GAS & S.TAP.TSK',
    isMandatory: false,
    aliases: ['BERKAS_PERKARA'],
    keywords: ['BERKAS PERKARA'],
  },
  {
    cluster: 'G',
    itemNumber: 2,
    code: 'SURAT_PENGANTAR_BP_TAHAP_1',
    title: 'SURAT PENGANTAR BERKAS PERKARA TAHAP I KE KEJAKSAAN NEGERI',
    type: 'Opsional - Syarat: SP.SIDIK, SP.GAS & S.TAP.TSK',
    isMandatory: false,
    aliases: ['PENGANTAR_TAHAP_1'],
    keywords: ['PENGANTAR BERKAS PERKARA TAHAP I', 'BERKAS PERKARA TAHAP I'],
  },
  {
    cluster: 'G',
    itemNumber: 3,
    code: 'SURAT_PENYERAHAN_TAHAP_2',
    title: 'SURAT PENYERAHAN TANGGUNG JAWAB TERSANGKA DAN BARANG BUKTI (TAHAP II)',
    type: 'Opsional - Syarat: SP.SIDIK, SP.GAS & S.TAP.TSK',
    isMandatory: false,
    aliases: ['TAHAP_2', 'PENYERAHAN_TAHAP_2'],
    keywords: ['PENYERAHAN TANGGUNG JAWAB TERSANGKA', 'TAHAP II'],
  },
  {
    cluster: 'G',
    itemNumber: 4,
    code: 'BA_PENYERAHAN_TAHAP_2',
    title: 'BERITA ACARA PENYERAHAN TERSANGKA DAN BARANG BUKTI (TAHAP II)',
    type: 'Opsional - Syarat: SP.SIDIK, SP.GAS & S.TAP.TSK',
    isMandatory: false,
    aliases: ['BA_TAHAP_2'],
    keywords: ['BERITA ACARA PENYERAHAN TERSANGKA', 'BA PENYERAHAN'],
  },
  {
    cluster: 'G',
    itemNumber: 5,
    code: 'RESUME_BP',
    title: 'RESUME BERKAS PERKARA',
    type: 'Opsional - Syarat: SP.SIDIK, SP.GAS & S.TAP.TSK',
    isMandatory: false,
    aliases: ['RESUME'],
    keywords: ['RESUME BERKAS PERKARA', 'RESUME'],
  }
];

// Helper: Mencari file template Supabase yang diunggah di Template Studio
export const findUploadedTemplate = (masterItem, allTemplates = []) => {
  if (!masterItem || !Array.isArray(allTemplates)) return null;

  const mCode = (masterItem.code || '').toUpperCase().trim();
  const aliases = (masterItem.aliases || []).map(a => a.toUpperCase().trim());
  const keywords = (masterItem.keywords || []).map(k => k.toUpperCase().trim());

  // 1. Cocokkan berdasarkan kesamaan kode unik atau aliases
  const codeMatch = allTemplates.find(t => {
    const tCode = (t.code || '').toUpperCase().trim();
    return tCode === mCode || aliases.includes(tCode);
  });
  if (codeMatch) return codeMatch;

  // 2. Cocokkan berdasarkan kesamaan kata kunci judul resmi
  const titleMatch = allTemplates.find(t => {
    const tTitle = (t.title || t.name || '').toUpperCase().trim();
    return keywords.some(k => tTitle.includes(k));
  });
  if (titleMatch) return titleMatch;

  return null;
};

// Helper 1: Klasifikasi Tahapan Dokumen (LIDIK vs SIDIK)
export const getTemplateStage = (tpl) => {
  if (!tpl) return 'SIDIK';
  const cat = (tpl.category || '').toUpperCase();
  const code = (tpl.code || '').toUpperCase();
  const title = (tpl.title || tpl.name || '').toUpperCase();

  if (cat.includes('LIDIK') || cat.includes('PENYELIDIKAN')) return 'LIDIK';
  if (cat.includes('SIDIK') || cat.includes('PENYIDIKAN')) return 'SIDIK';

  // Cek kata kunci penyelidikan
  if (
    code.includes('LIDIK') ||
    title.includes('PENYELIDIKAN') ||
    title.includes('LIDIK') ||
    code.includes('VER') ||
    code.includes('VEP') ||
    title.includes('VISUM') ||
    title.includes('VER') ||
    title.includes('PSIKIATRIKUM') ||
    code.includes('SP2HP_LIDIK') ||
    code.includes('LHP') ||
    title.includes('HASIL PENYELIDIKAN') ||
    code.includes('GELAR') ||
    title.includes('GELAR PERKARA')
  ) {
    return 'LIDIK';
  }

  return 'SIDIK';
};

// Helper 2: Klasifikasi Klaster Dropdown SIDIK (A s.d. G)
export const getSidikCluster = (tpl) => {
  if (!tpl) return 'A';
  const code = (tpl.code || '').toUpperCase().trim();
  const title = (tpl.title || tpl.name || '').toUpperCase().trim();

  // A. SURAT PERINTAH PENYIDIKAN
  if (
    code === 'SPRIN_SIDIK' || 
    code === 'SP_SIDIK' || 
    code === 'SPRIN_GAS_SIDIK' || 
    code === 'SPGAS_SIDIK' ||
    code === 'SP_GAS_SIDIK' ||
    code.includes('SIDIK_TAMBAHAN') ||
    code.includes('GAS_SIDIK_TAMBAHAN') ||
    code.includes('SIDIK_LANJUTAN') ||
    code.includes('GAS_SIDIK_LANJUTAN') ||
    (title.includes('PERINTAH PENYIDIKAN') && !title.includes('PENGELUARAN') && !title.includes('PENAHANAN')) ||
    (title.includes('TUGAS PENYIDIKAN') && !title.includes('PENYELIDIKAN'))
  ) {
    return 'A';
  }

  // B. PEMBERITAHUAN DIMULAINYA PENYIDIKAN (SPDP)
  if (code.includes('SPDP') || title.includes('DIMULAINYA PENYIDIKAN') || title.includes('SPDP')) {
    return 'B';
  }

  // C. TINDAKAN TERHADAP TERSANGKA (TAP, GIL, KAP, DPO)
  if (
    code.includes('TAP_TSK') ||
    title.includes('PENETAPAN TERSANGKA') ||
    title.includes('PANGGILAN TERSANGKA') || 
    code.includes('SPGL_TSK') ||
    title.includes('MEMBAWA TERSANGKA') || 
    code.includes('SPRIN_BAWA_TSK') ||
    ((code.includes('KAP') || title.includes('PENANGKAPAN')) && !code.includes('LEPAS') && !title.includes('PELEPASAN')) ||
    code.includes('DPO') || 
    title.includes('PENCARIAN ORANG')
  ) {
    return 'C';
  }

  // F. PENAHANAN (BERJENJANG) - diprioritaskan sebelum klaster lain untuk kata kunci HAN
  if (
    code.includes('HAN') || 
    title.includes('PENAHANAN') || 
    title.includes('TAHANAN') ||
    code.includes('KELUAR_HAN') ||
    title.includes('PENGELUARAN TAHANAN')
  ) {
    return 'F';
  }

  // D. PENYITAAN & PENGGELEDAHAN
  if (
    code.includes('SITA') || 
    title.includes('PENYITAAN') ||
    code.includes('GELEDAH') || 
    title.includes('PENGGELEDAHAN') ||
    code.includes('DPB') || 
    title.includes('PENCARIAN BARANG')
  ) {
    return 'D';
  }

  // E. KORBAN DAN SAKSI
  if (
    code.includes('SAKSI') || 
    code.includes('KORBAN') || 
    title.includes('SAKSI') || 
    title.includes('KORBAN') ||
    title.includes('HAK-HAK') ||
    title.includes('PEREMPUAN') ||
    title.includes('LANSIA') ||
    code.includes('HAK_')
  ) {
    return 'E';
  }

  // G. BERKAS PERKARA (TAHAP I & TAHAP II)
  if (
    code.includes('BP_') || 
    code.includes('TAHAP_1') || 
    code.includes('TAHAP_2') || 
    code.includes('TAHAP_I') || 
    code.includes('TAHAP_II') || 
    title.includes('BERKAS PERKARA') || 
    title.includes('P-19') || 
    title.includes('P19') ||
    title.includes('TAHAP I') ||
    title.includes('TAHAP II') ||
    title.includes('TANGGUNG JAWAB TERSANGKA DAN BARANG BUKTI')
  ) {
    return 'G';
  }

  return 'A';
};

// Helper 3: Penegakan Urutan Wajib Mindik Sidik (Sequential Prerequisite Guard)
export const checkPrerequisite = (tpl, targetCase, caseDocs = [], suspects = [], activeSuspect = null) => {
  if (!tpl) return { allowed: false, unlocked: false, reason: 'Pilih format template terlebih dahulu.' };
  
  // Dokumen pada Tahap Penyelidikan (LIDIK) selalu terbuka
  if (getTemplateStage(tpl) === 'LIDIK') {
    return { allowed: true, unlocked: true, reason: '' };
  }

  const generatedDocs = caseDocs || [];
  const currentCase = targetCase;

  // Cek riwayat dokumen perkara (dari case_generated_documents atau data case)
  const hasSpSidik = generatedDocs.some(d => {
    const c = (d.template_code || d.code || '').toUpperCase();
    const t = (d.document_title || d.doc_title || d.title || '').toUpperCase();
    return (
      c.includes('SP_SIDIK') || 
      c.includes('SPRIN_SIDIK') || 
      (t.includes('PERINTAH PENYIDIKAN') && !t.includes('TUGAS') && !t.includes('TAMBAHAN') && !t.includes('LANJUTAN'))
    );
  }) || Boolean(currentCase?.no_sprin_sidik || currentCase?.references?.no_sprin_sidik);

  const hasSpGasSidik = generatedDocs.some(d => {
    const c = (d.template_code || d.code || '').toUpperCase();
    const t = (d.document_title || d.doc_title || d.title || '').toUpperCase();
    return (
      c.includes('SP_GAS') || 
      c.includes('SPGAS') || 
      c.includes('SPRIN_GAS') || 
      t.includes('TUGAS PENYIDIKAN')
    );
  }) || Boolean(currentCase?.no_sprin_gas_sidik || currentCase?.references?.no_sprin_gas_sidik);

  const isValidDocNumber = (val) => {
    if (!val || typeof val !== 'string') return false;
    const clean = val.trim().toLowerCase();
    if (!clean || clean === '-' || clean === '--' || clean.startsWith('...') || clean.includes('belum') || clean === 'null' || clean === 'undefined') {
      return false;
    }
    return true;
  };

  const hasTapTsk = generatedDocs.some(d => {
    const c = (d.template_code || d.code || '').toUpperCase();
    const t = (d.document_title || d.doc_title || d.title || '').toUpperCase();
    return c.includes('TAP_TSK') || c.includes('S_TAP_TSK') || t.includes('PENETAPAN TERSANGKA');
  }) || isValidDocNumber(currentCase?.no_sp_tap_tsk);

  const hasPanggilan1 = generatedDocs.some(d => {
    const c = (d.template_code || d.code || '').toUpperCase();
    const t = (d.document_title || d.doc_title || d.title || '').toUpperCase();
    return (
      c.includes('PANGGILAN_TSK_1') || 
      c.includes('SPGL_TSK_1') || 
      c.includes('SPGL_1_TSK') || 
      t.includes('PANGGILAN TERSANGKA KE-1') || 
      t.includes('PANGGILAN TERSANGKA 1')
    );
  });

  const hasPanggilan2 = generatedDocs.some(d => {
    const c = (d.template_code || d.code || '').toUpperCase();
    const t = (d.document_title || d.doc_title || d.title || '').toUpperCase();
    return (
      c.includes('PANGGILAN_TSK_2') || 
      c.includes('SPGL_TSK_2') || 
      c.includes('SPGL_2_TSK') || 
      t.includes('PANGGILAN TERSANGKA KE-2') || 
      t.includes('PANGGILAN TERSANGKA 2')
    );
  });

  const hasBawaTsk = generatedDocs.some(d => {
    const c = (d.template_code || d.code || '').toUpperCase();
    const t = (d.document_title || d.doc_title || d.title || '').toUpperCase();
    return (
      c.includes('BAWA_TSK') || 
      c.includes('SPRIN_BAWA_TSK') || 
      t.includes('MEMBAWA TERSANGKA')
    );
  });

  const hasSpKap = generatedDocs.some(d => {
    const c = (d.template_code || d.code || '').toUpperCase();
    const t = (d.document_title || d.doc_title || d.title || '').toUpperCase();
    return (
      (c.includes('KAP') || t.includes('PENANGKAPAN')) && 
      !c.includes('LEPAS') && 
      !t.includes('PELEPASAN')
    );
  }) || Boolean(
    activeSuspect?.no_sprin_kap ||
    currentCase?.no_sprin_kap ||
    currentCase?.references?.no_sprin_kap ||
    (Array.isArray(suspects) && suspects.some(s => s.no_sprin_kap))
  );

  const hasUpayaHadir = hasPanggilan1 || hasPanggilan2 || hasBawaTsk || hasSpKap;

  const hasHan = generatedDocs.some(d => {
    const c = (d.template_code || d.code || '').toUpperCase();
    const t = (d.document_title || d.doc_title || d.title || '').toUpperCase();
    return (
      c.includes('SP_HAN') || 
      c.includes('SPRIN_HAN') || 
      (t.includes('PERINTAH PENAHANAN') && !t.includes('PERPANJANGAN') && !t.includes('PENGELUARAN'))
    );
  }) || Boolean(
    activeSuspect?.no_sprin_han ||
    currentCase?.no_sprin_han ||
    currentCase?.references?.no_sprin_han ||
    (Array.isArray(suspects) && suspects.some(s => s.no_sprin_han))
  );

  const docCode = (tpl.code || '').toUpperCase().trim();
  const docTitle = (tpl.title || tpl.name || '').toUpperCase().trim();

  // A. SP.SIDIK (Gerbang Utama Penyidikan Selalu Terbuka)
  if (
    docCode === 'SP_SIDIK' || 
    docCode === 'SPRIN_SIDIK' || 
    (docTitle.includes('PERINTAH PENYIDIKAN') && !docTitle.includes('TUGAS') && !docTitle.includes('TAMBAHAN') && !docTitle.includes('LANJUTAN'))
  ) {
    return { unlocked: true, allowed: true, reason: '' };
  }

  // A. SP.GAS.SIDIK
  if (
    docCode === 'SP_GAS_SIDIK' || 
    docCode === 'SPRIN_GAS_SIDIK' || 
    docCode === 'SPGAS_SIDIK' || 
    (docTitle.includes('TUGAS PENYIDIKAN') && !docTitle.includes('TAMBAHAN') && !docTitle.includes('LANJUTAN'))
  ) {
    return { 
      unlocked: hasSpSidik, 
      allowed: hasSpSidik, 
      reason: hasSpSidik ? '' : 'Wajib membuat SP.SIDIK terlebih dahulu.' 
    };
  }

  // A. SP.SIDIK / SP.GAS TAMBAHAN & LANJUTAN
  if (
    docCode.includes('TAMBAHAN') || 
    docCode.includes('LANJUTAN') || 
    docTitle.includes('TAMBAHAN') || 
    docTitle.includes('LANJUTAN')
  ) {
    if (getSidikCluster(tpl) === 'A') {
      return { 
        unlocked: hasSpGasSidik, 
        allowed: hasSpGasSidik, 
        reason: hasSpGasSidik ? '' : 'Wajib membuat SP.SIDIK & SP.GAS.SIDIK terlebih dahulu.' 
      };
    }
  }

  // 1. S.TAP.TSK (SURAT KETETAPAN PENETAPAN TERSANGKA)
  // Cukup syarat dasar SP.SIDIK & SP.GAS.SIDIK terpenuhi! Tidak boleh bergantung pada SPDP Tersangka!
  if (
    docCode === 'SP_TAP_TSK' ||
    docCode === 'TAP_TSK' ||
    docCode === 'S_TAP_TSK' ||
    docTitle.includes('PENETAPAN TERSANGKA') ||
    docTitle.includes('S.TAP.TSK')
  ) {
    return {
      unlocked: Boolean(hasSpGasSidik),
      allowed: Boolean(hasSpGasSidik),
      reason: hasSpGasSidik ? '' : 'Wajib membuat SP.SIDIK & SP.GAS.SIDIK terlebih dahulu.'
    };
  }

  // 2. SPDP TERSANGKA (Wajib 5)
  // MUTLAK WAJIB ADA S.TAP.TSK TERLEBIH DAHULU!
  if (
    docCode === 'SPDP_TSK' ||
    docCode === 'SPDP_TERSANGKA' ||
    docCode === 'SPDP_LEBIH_1_TSK' ||
    docCode === 'SPDP_MORE_1_TSK' ||
    docTitle.includes('SPDP DENGAN TERSANGKA') ||
    docTitle.includes('SPDP TERSANGKA') ||
    docTitle.includes('LEBIH DARI 1 TERSANGKA')
  ) {
    return {
      unlocked: Boolean(hasTapTsk),
      allowed: Boolean(hasTapTsk),
      reason: hasTapTsk ? '' : 'Wajib menerbitkan SURAT KETETAPAN PENETAPAN TERSANGKA (S.TAP.TSK) terlebih dahulu.'
    };
  }

  // 3. SPDP TERLAPOR / TANPA NAMA (Wajib 3)
  if (
    docCode === 'SPDP_TERLAPOR' ||
    docCode === 'SPDP_LEBIH_1_TERLAPOR' ||
    docCode === 'SPDP_TANPA_NAMA' ||
    docCode.startsWith('SPDP') ||
    docTitle.includes('DIMULAINYA PENYIDIKAN')
  ) {
    return {
      unlocked: Boolean(hasSpGasSidik),
      allowed: Boolean(hasSpGasSidik),
      reason: hasSpGasSidik ? '' : 'Wajib membuat SP.SIDIK & SP.GAS.SIDIK terlebih dahulu.'
    };
  }

  // C. TINDAKAN TERHADAP TERSANGKA (Wajib 6)
  if (
    docCode === 'PANGGILAN_TSK_1' || 
    docCode === 'SPGL_TSK_1' || 
    docCode === 'SP_KAP' || 
    docCode === 'SPRIN_KAP' || 
    (docTitle.includes('PENANGKAPAN') && !docTitle.includes('PELEPASAN')) || 
    docTitle.includes('PANGGILAN TERSANGKA KE-1') || 
    docTitle.includes('PANGGILAN TERSANGKA 1')
  ) {
    return { 
      unlocked: hasTapTsk, 
      allowed: hasTapTsk, 
      reason: hasTapTsk ? '' : 'Wajib menerbitkan Penetapan Tersangka (S.TAP.TSK) terlebih dahulu.' 
    };
  }

  if (
    docCode === 'PANGGILAN_TSK_2' || 
    docCode === 'SPGL_TSK_2' || 
    docTitle.includes('PANGGILAN TERSANGKA KE-2') || 
    docTitle.includes('PANGGILAN TERSANGKA 2')
  ) {
    return { 
      unlocked: hasPanggilan1, 
      allowed: hasPanggilan1, 
      reason: hasPanggilan1 ? '' : 'Wajib menerbitkan Surat Panggilan Tersangka Ke-1 terlebih dahulu.' 
    };
  }

  if (
    docCode === 'SP_BAWA_TSK' || 
    docCode === 'SPRIN_BAWA_TSK' || 
    docCode === 'BAWA_TSK' || 
    docTitle.includes('MEMBAWA TERSANGKA')
  ) {
    return { 
      unlocked: hasPanggilan2, 
      allowed: hasPanggilan2, 
      reason: hasPanggilan2 ? '' : 'Wajib menerbitkan Surat Panggilan Tersangka Ke-2 terlebih dahulu.' 
    };
  }

  if (docCode.includes('DPO') || docTitle.includes('PENCARIAN ORANG')) {
    return { 
      unlocked: hasTapTsk, 
      allowed: hasTapTsk, 
      reason: hasTapTsk ? '' : 'Wajib menerbitkan Penetapan Tersangka (S.TAP.TSK) terlebih dahulu.' 
    };
  }

  // F. PENAHANAN (BERJENJANG)
  if (
    docCode === 'SP_HAN' || 
    docCode === 'SPRIN_HAN' || 
    (docTitle.includes('PERINTAH PENAHANAN') && !docTitle.includes('PERPANJANGAN') && !docTitle.includes('PENGELUARAN'))
  ) {
    return { 
      unlocked: hasUpayaHadir, 
      allowed: hasUpayaHadir, 
      reason: hasUpayaHadir ? '' : 'Wajib ada Surat Panggilan / Surat Perintah Membawa / Surat Perintah Penangkapan terlebih dahulu.' 
    };
  }

  if (docCode.includes('MINTA_PANJANG_HAN_40') || docTitle.includes('PERMINTAAN PERPANJANGAN PENAHANAN 40 HARI')) {
    return { 
      unlocked: hasHan, 
      allowed: hasHan, 
      reason: hasHan ? '' : 'Wajib menerbitkan SURAT PERINTAH PENAHANAN (SP.HAN) terlebih dahulu.' 
    };
  }

  if (docCode.includes('SPRIN_PANJANG_HAN_40') || docTitle.includes('PERPANJANGAN PENAHANAN 40 HARI KEPALA KEJAKSAAN NEGERI')) {
    const hasMintaKn = generatedDocs.some(d => (d.template_code || '').includes('MINTA_PANJANG_HAN_40') || (d.title || d.document_title || '').includes('PERMINTAAN PERPANJANGAN PENAHANAN 40 HARI'));
    return { 
      unlocked: hasMintaKn, 
      allowed: hasMintaKn, 
      reason: hasMintaKn ? '' : 'Wajib mengajukan SURAT PERMINTAAN PERPANJANGAN PENAHANAN 40 HARI KE KN terlebih dahulu.' 
    };
  }

  if (docCode.includes('MINTA_PANJANG_HAN_30_PN_1') || docTitle.includes('PERMINTAAN PERPANJANGAN PENAHANAN 30 HARI TAHAP I')) {
    const hasPanjangKn = Boolean(currentCase?.no_panjang_han_kn || currentCase?.references?.no_panjang_han_kn || generatedDocs.some(d => (d.template_code || '').includes('SPRIN_PANJANG_HAN_40') || (d.title || d.document_title || '').includes('PERPANJANGAN PENAHANAN 40 HARI KEPALA KEJAKSAAN NEGERI')));
    return { 
      unlocked: hasPanjangKn, 
      allowed: hasPanjangKn, 
      reason: hasPanjangKn ? '' : 'Wajib menyelesaikan perpanjangan penahanan 40 hari Kejari terlebih dahulu.' 
    };
  }

  if (docCode.includes('SPRIN_PANJANG_HAN_30_PN_1') || docTitle.includes('PERPANJANGAN PENAHANAN 30 HARI TAHAP I KETUA PENGADILAN NEGERI')) {
    const hasMintaPn1 = generatedDocs.some(d => (d.template_code || '').includes('MINTA_PANJANG_HAN_30_PN_1') || (d.title || d.document_title || '').includes('PERMINTAAN PERPANJANGAN PENAHANAN 30 HARI TAHAP I'));
    return { 
      unlocked: hasMintaPn1, 
      allowed: hasMintaPn1, 
      reason: hasMintaPn1 ? '' : 'Wajib mengajukan SURAT PERMINTAAN PERPANJANGAN PENAHANAN 30 HARI TAHAP I KE KPN terlebih dahulu.' 
    };
  }

  if (docCode.includes('MINTA_PANJANG_HAN_30_PN_2') || docTitle.includes('PERMINTAAN PERPANJANGAN PENAHANAN 30 HARI TAHAP II')) {
    const hasPanjangPn1 = Boolean(currentCase?.no_tap_han_pn_1 || currentCase?.references?.no_tap_han_pn1 || generatedDocs.some(d => (d.template_code || '').includes('SPRIN_PANJANG_HAN_30_PN_1') || (d.title || d.document_title || '').includes('PERPANJANGAN PENAHANAN 30 HARI TAHAP I KETUA PENGADILAN NEGERI')));
    return { 
      unlocked: hasPanjangPn1, 
      allowed: hasPanjangPn1, 
      reason: hasPanjangPn1 ? '' : 'Wajib menyelesaikan perpanjangan penahanan 30 hari Tahap I PN terlebih dahulu.' 
    };
  }

  if (docCode.includes('SPRIN_PANJANG_HAN_30_PN_2') || docTitle.includes('PERPANJANGAN PENAHANAN 30 HARI TAHAP II KETUA PENGADILAN NEGERI')) {
    const hasMintaPn2 = generatedDocs.some(d => (d.template_code || '').includes('MINTA_PANJANG_HAN_30_PN_2') || (d.title || d.document_title || '').includes('PERMINTAAN PERPANJANGAN PENAHANAN 30 HARI TAHAP II'));
    return { 
      unlocked: hasMintaPn2, 
      allowed: hasMintaPn2, 
      reason: hasMintaPn2 ? '' : 'Wajib mengajukan SURAT PERMINTAAN PERPANJANGAN PENAHANAN 30 HARI TAHAP II KE KPN terlebih dahulu.' 
    };
  }

  if (docCode.includes('KELUAR_HAN') || docTitle.includes('PENGELUARAN TAHANAN')) {
    return { 
      unlocked: hasHan, 
      allowed: hasHan, 
      reason: hasHan ? '' : 'Wajib ada SURAT PERINTAH PENAHANAN (SP.HAN) terlebih dahulu.' 
    };
  }

  // G. BERKAS PERKARA (TAHAP I & II)
  if (getSidikCluster(tpl) === 'G') {
    if (!hasSpGasSidik) {
      return { 
        unlocked: false, 
        allowed: false, 
        reason: 'Wajib membuat SP.SIDIK & SP.GAS.SIDIK terlebih dahulu.' 
      };
    }
    if (!hasTapTsk) {
      return { 
        unlocked: false, 
        allowed: false, 
        reason: 'Wajib menerbitkan SURAT KETETAPAN PENETAPAN TERSANGKA (S.TAP.TSK) terlebih dahulu.' 
      };
    }
    return { unlocked: true, allowed: true, reason: '' };
  }

  // D & E. SITA, GELEDAH, SAKSI (OPSIONAL)
  return { 
    unlocked: hasSpGasSidik, 
    allowed: hasSpGasSidik, 
    reason: hasSpGasSidik ? '' : 'Wajib membuat SP.SIDIK & SP.GAS.SIDIK terlebih dahulu.' 
  };
};

export default function DocGeneratorView({ 
  cases = [], 
  personnel = [],
  initialCase = null, 
  initialTemplate = null,
  initialSuspectId = null,
  onSaveDocument,
  onOpenTemplateStudio,
  userRole = 'anggota'
}) {
  const isSuperAdmin = userRole === 'super_admin';

  // 1. Inisialisasi HANYA dari Template Studio (tanpa mock fallback)
  const [allTemplates, setAllTemplates] = useState([]);
  
  // 2. Sistem Pemilihan Tahapan: 'LIDIK' vs 'SIDIK'
  const [tahapMindik, setTahapMindik] = useState(() => {
    if (initialTemplate) {
      return getTemplateStage(initialTemplate);
    }
    return 'SIDIK';
  });
  const [showTahapModal, setShowTahapModal] = useState(false);

  // Riwayat dokumen yang diterbitkan pada perkara aktif
  const [caseDocuments, setCaseDocuments] = useState([]);

  const [selectedCaseId, setSelectedCaseId] = useState(initialCase ? initialCase.id : (cases[0]?.id || ''));
  const [selectedTemplateCode, setSelectedTemplateCode] = useState(
    initialTemplate ? initialTemplate.code : null
  );
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [selectedClusterTab, setSelectedClusterTab] = useState('A');
  const [formValues, setFormValues] = useState({});
  const [isSaved, setIsSaved] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatorNotice, setGeneratorNotice] = useState(null);

  // Multi-Tersangka & Penetapan Tersangka States
  const [caseSuspects, setCaseSuspects] = useState([]);
  const [selectedSuspectId, setSelectedSuspectId] = useState(initialSuspectId || '');
  const [urutanTersangka, setUrutanTersangka] = useState(1);

  // Helper konversi angka ke Romawi untuk label status tersangka (I, II, III, IV, dst.)
  const getRomanUrutan = (num) => {
    const n = parseInt(num, 10) || 1;
    const map = [
      { v: 10, s: 'X' },
      { v: 9, s: 'IX' },
      { v: 5, s: 'V' },
      { v: 4, s: 'IV' },
      { v: 1, s: 'I' }
    ];
    let res = '';
    let rem = n;
    for (const item of map) {
      while (rem >= item.v) {
        res += item.s;
        rem -= item.v;
      }
    }
    return res || 'I';
  };

  // Sync selectedSuspectId if initialSuspectId changes from props
  useEffect(() => {
    if (initialSuspectId) {
      setSelectedSuspectId(initialSuspectId);
    }
  }, [initialSuspectId]);

  // Sync initialTemplate if props change
  useEffect(() => {
    if (initialTemplate) {
      const stage = getTemplateStage(initialTemplate);
      setTahapMindik(stage);
      setSelectedTemplateCode(initialTemplate.code);
    }
  }, [initialTemplate]);

  // Multi-Korban States
  const [selectedVictimId, setSelectedVictimId] = useState('');

  // Template Management Modal States (Khusus Super Admin)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState(null);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [isProcessingTemplate, setIsProcessingTemplate] = useState(false);

  // Add Template Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newCategory, setNewCategory] = useState('SURAT PERINTAH');
  const [newDescription, setNewDescription] = useState('');
  const [newDocxFile, setNewDocxFile] = useState(null);

  // Edit Template Form State
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('SURAT PERINTAH');
  const [editDescription, setEditDescription] = useState('');

  const activePersonnel = personnel.length > 0 ? personnel : mockPersonnel;
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  const currentCase = cases.find(c => c.id === selectedCaseId) || cases[0];

  // 1. Fetch templates real-time HANYA dari Supabase Template Studio (Tanpa Mock)
  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Could not fetch supabase templates:', error);
        setAllTemplates([]);
        return;
      }

      const supabaseData = data || [];
      const deleted = getDeletedTemplateCodes();

      // HANYA template yang memiliki file_path atau file_url valid (berasal dari Template Studio)
      const validTemplates = supabaseData
        .filter(t => {
          const hasValidFile = Boolean(
            (t.file_path && String(t.file_path).trim()) || 
            (t.file_url && String(t.file_url).trim())
          );
          const isNotDeleted = !deleted.includes(t.code) && !deleted.includes(String(t.id));
          return hasValidFile && isNotDeleted;
        })
        .map(t => ({
          ...t,
          title: (t.title || t.name || t.code || '').toUpperCase(),
        }));

      setAllTemplates(validTemplates);

      // Helper: urutkan template sesuai susunan master baku KUHAP (SP.SIDIK -> SP.GAS.SIDIK -> dst)
      const sortTemplatesByMasterOrder = (tplList = []) => {
        return [...tplList].sort((a, b) => {
          const aCode = (a.code || '').toUpperCase().trim();
          const bCode = (b.code || '').toUpperCase().trim();
          const idxA = MASTER_MINDIK_SIDIK.findIndex(m => m.code === aCode || (m.aliases || []).includes(aCode));
          const idxB = MASTER_MINDIK_SIDIK.findIndex(m => m.code === bCode || (m.aliases || []).includes(bCode));
          const rankA = idxA !== -1 ? idxA : 999;
          const rankB = idxB !== -1 ? idxB : 999;
          return rankA - rankB;
        });
      };

      // Nilai awal (initial state) selectedTemplateCode:
      // Prioritaskan memilih template pertama yang SUDAH diunggah di Template Studio dan UNLOCKED.
      setSelectedTemplateCode(prev => {
        if (validTemplates.length === 0) return null;
        if (prev) {
          const existing = validTemplates.find(t => t.code === prev);
          if (existing && Boolean((existing.file_path && String(existing.file_path).trim()) || (existing.file_url && String(existing.file_url).trim()))) {
            const p = checkPrerequisite(existing, currentCase, caseDocuments, caseSuspects, null);
            if (p.unlocked || p.allowed) return prev;
          }
        }
        const availableInStage = validTemplates.filter(t => 
          getTemplateStage(t) === tahapMindik && 
          Boolean((t.file_path && String(t.file_path).trim()) || (t.file_url && String(t.file_url).trim()))
        );
        const pool = availableInStage.length > 0 ? availableInStage : validTemplates.filter(t => 
          Boolean((t.file_path && String(t.file_path).trim()) || (t.file_url && String(t.file_url).trim()))
        );
        const orderedPool = sortTemplatesByMasterOrder(pool);
        const firstUnlocked = orderedPool.find(t => {
          const p = checkPrerequisite(t, currentCase, caseDocuments, caseSuspects, null);
          return p.unlocked || p.allowed;
        });
        return firstUnlocked ? firstUnlocked.code : null;
      });
    } catch (err) {
      console.warn('Could not fetch supabase templates:', err);
      setAllTemplates([]);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Muat arsip dokumen dari Supabase untuk validasi prasyarat perkara aktif
  useEffect(() => {
    if (!currentCase?.id) {
      setCaseDocuments([]);
      return;
    }

    const validCaseId = (currentCase?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentCase.id))
      ? currentCase.id 
      : null;

    const loadCaseDocs = async () => {
      try {
        let queryGen = supabase.from('case_generated_documents').select('*');
        let queryArsip = supabase.from('arsip_dokumen').select('*');
        let queryDocs = supabase.from('documents').select('*');

        if (validCaseId) {
          queryGen = queryGen.eq('case_id', validCaseId);
          queryArsip = queryArsip.eq('case_id', validCaseId);
          queryDocs = queryDocs.eq('case_id', validCaseId);
        }

        const [resGen, resArsip, resDocs] = await Promise.allSettled([
          queryGen.order('created_at', { ascending: false }),
          queryArsip.order('created_at', { ascending: false }),
          queryDocs.order('created_at', { ascending: false })
        ]);

        const listGen = (resGen.status === 'fulfilled' && resGen.value.data) ? resGen.value.data : [];
        const listArsip = (resArsip.status === 'fulfilled' && resArsip.value.data) ? resArsip.value.data : [];
        const listDocs = (resDocs.status === 'fulfilled' && resDocs.value.data) ? resDocs.value.data : [];

        const map = new Map();
        [...listGen, ...listArsip, ...listDocs].forEach(d => {
          if (d && d.id) map.set(d.id, d);
        });

        setCaseDocuments(Array.from(map.values()));
      } catch (err) {
        console.error('Error load case documents:', err);
      }
    };
    loadCaseDocs();
  }, [currentCase?.id]);

  // Otomatis tentukan template awal jika belum terpilih dan ada template yang terbuka
  useEffect(() => {
    if (allTemplates.length === 0) return;
    if (!selectedTemplateCode) {
      const availableTemplates = allTemplates.filter(t => 
        Boolean((t.file_path && String(t.file_path).trim()) || (t.file_url && String(t.file_url).trim()))
      );
      const inStage = availableTemplates.filter(t => getTemplateStage(t) === tahapMindik);
      const pool = inStage.length > 0 ? inStage : availableTemplates;
      const sortTemplatesByMasterOrder = (tplList = []) => {
        return [...tplList].sort((a, b) => {
          const aCode = (a.code || '').toUpperCase().trim();
          const bCode = (b.code || '').toUpperCase().trim();
          const idxA = MASTER_MINDIK_SIDIK.findIndex(m => m.code === aCode || (m.aliases || []).includes(aCode));
          const idxB = MASTER_MINDIK_SIDIK.findIndex(m => m.code === bCode || (m.aliases || []).includes(bCode));
          const rankA = idxA !== -1 ? idxA : 999;
          const rankB = idxB !== -1 ? idxB : 999;
          return rankA - rankB;
        });
      };
      const orderedPool = sortTemplatesByMasterOrder(pool);
      const firstUnlocked = orderedPool.find(t => {
        const p = checkPrerequisite(t, currentCase, caseDocuments, caseSuspects, null);
        return p.unlocked || p.allowed;
      });
      if (firstUnlocked) {
        setSelectedTemplateCode(firstUnlocked.code);
      }
    }
  }, [allTemplates, tahapMindik, caseDocuments.length, currentCase?.id]);

  // Daftar template yang masuk ke tahapan aktif (LIDIK vs SIDIK)
  const currentStageTemplates = (allTemplates || []).filter(t => getTemplateStage(t) === tahapMindik);

  // Strictly bind currentTemplate to selectedTemplateCode (null if none selected)
  const currentTemplate = selectedTemplateCode 
    ? (allTemplates.find(t => t.code === selectedTemplateCode) || null)
    : null;

  // Cek ketersediaan file fisik template dari Template Studio
  const isTemplateAvailableInStudio = Boolean(
    (currentTemplate?.file_path && String(currentTemplate.file_path).trim()) || 
    (currentTemplate?.file_url && String(currentTemplate.file_url).trim())
  );

  // Data Korban dari perkara (mendukung array victims di root perkara atau references.victims)
  const registeredVictims = (() => {
    if (!currentCase) return [];
    if (Array.isArray(currentCase.victims) && currentCase.victims.length > 0) return currentCase.victims;
    if (Array.isArray(currentCase.references?.victims) && currentCase.references.victims.length > 0) return currentCase.references.victims;
    return [];
  })();

  const selectedVictim = registeredVictims.find(v => (v.id || v.nama) === selectedVictimId) || registeredVictims[0] || null;

  // Helper identifikasi dokumen perorangan (1 surat untuk 1 tersangka) dari whitelist 24 dokumen resmi
  const isIndividualDoc = isIndividualSuspectDoc(currentTemplate);

  // Helper identifikasi dokumen Penetapan Tersangka (SP.Tap TSK)
  const isSpTapDoc = (() => {
    const c = (currentTemplate?.code || '').toUpperCase().trim();
    const t = (currentTemplate?.title || currentTemplate?.name || '').toUpperCase();
    return c === 'SP_TAP_TSK' || c.includes('TAP_TSK') || t.includes('PENETAPAN TERSANGKA') || t.includes('SP.TAP');
  })();

  // Helper sinkronisasi nilai profil tersangka ke variabel tunggal template mindik
  const syncSuspectValues = (suspect, isSpTap = false) => {
    if (!suspect) return {};
    const spTapNum = suspect.nomor_sp_tap || suspect.no_sp_tap_tsk || '';
    const spTapDate = suspect.tanggal_sp_tap || suspect.tgl_sp_tap_tsk || '';
    const rawTglLahir = suspect.tgl_lahir || suspect.tanggal_lahir || '';
    const formattedTglLahir = formatTanggalIndonesia(rawTglLahir);
    const tempatLahir = suspect.tempat_lahir || '';
    const ttl = (tempatLahir && formattedTglLahir)
      ? `${tempatLahir}, ${formattedTglLahir}`
      : (suspect.ttl || suspect.pob_dob || tempatLahir || '');

    const rawUmur = suspect.umur || '';
    const umur = rawUmur
      ? (String(rawUmur).includes('Tahun') ? String(rawUmur) : `${rawUmur} Tahun`)
      : '';

    const rawUrutan = suspect.urutan_tersangka || urutanTersangka || 1;
    const roman = getRomanUrutan(rawUrutan);
    const labelTsk = suspect.status_tersangka_label || `Tersangka ${roman}`;

    const values = {
      NAMA_TERSANGKA: suspect.nama || '',
      nama_tersangka: suspect.nama || '',
      NIK: suspect.nik || '-',
      nik: suspect.nik || '-',
      TEMPAT_LAHIR: tempatLahir,
      tempat_lahir: tempatLahir,
      TGL_LAHIR: formattedTglLahir,
      tgl_lahir: formattedTglLahir,
      TTL: ttl,
      ttl: ttl,
      UMUR: umur,
      umur: umur,
      JENIS_KELAMIN: suspect.jenis_kelamin || 'Laki-laki',
      jenis_kelamin: suspect.jenis_kelamin || 'Laki-laki',
      AGAMA: suspect.agama || '',
      agama: suspect.agama || '',
      PEKERJAAN: suspect.pekerjaan || '',
      pekerjaan: suspect.pekerjaan || '',
      KEWARGANEGARAAN: suspect.kewarganegaraan || 'Indonesia',
      kewarganegaraan: suspect.kewarganegaraan || 'Indonesia',
      PENDIDIKAN: suspect.pendidikan || '',
      pendidikan: suspect.pendidikan || '',
      STATUS_KAWIN: suspect.status_pernikahan || suspect.status_kawin || suspect.marital_status || '',
      status_kawin: suspect.status_pernikahan || suspect.status_kawin || suspect.marital_status || '',
      ALAMAT: suspect.alamat || '',
      alamat: suspect.alamat || '',
      KONTAK: suspect.kontak || suspect.phone || suspect.no_hp || '',
      kontak: suspect.kontak || suspect.phone || suspect.no_hp || '',
      KONTAK_TERSANGKA: suspect.kontak || suspect.phone || suspect.no_hp || '',
      kontak_tersangka: suspect.kontak || suspect.phone || suspect.no_hp || '',

      // Status & Urutan Administrasi Tersangka
      URUTAN_TERSANGKA: rawUrutan,
      urutan_tersangka: rawUrutan,
      STATUS_TERSANGKA_LABEL: labelTsk,
      status_tersangka_label: labelTsk,

      // Rujukan tingkat tersangka
      NO_SP_TAP_TSK: spTapNum,
      no_sp_tap_tsk: spTapNum,
      TGL_SP_TAP_TSK: spTapDate,
      tgl_sp_tap_tsk: spTapDate,
      NO_SPRIN_KAP: suspect.no_sprin_kap || '',
      no_sprin_kap: suspect.no_sprin_kap || '',
      NO_SPRIN_HAN: suspect.no_sprin_han || '',
      no_sprin_han: suspect.no_sprin_han || '',
      NO_PANJANG_HAN_KN: suspect.no_panjang_han_kn || '',
      no_panjang_han_kn: suspect.no_panjang_han_kn || '',
    };

    // Khusus SP_TAP_TSK, sinkronkan tanggal dan nomor rujukan penetapan tersangka dari selectedSuspect
    if (isSpTap) {
      const defaultSpTap = spTapNum || '';
      const defaultSpTapDate = spTapDate || '';
      if (defaultSpTap) {
        values.nomor_sp_tap = defaultSpTap;
        values.no_sp_tap_tsk = defaultSpTap;
        values.nomor_sp_tap_tsk = defaultSpTap;
        values.NOMOR_SP_TAP = defaultSpTap;
        values.NO_SP_TAP_TSK = defaultSpTap;
        values.NOMOR_SP_TAP_TSK = defaultSpTap;
      }
      values.TANGGAL_SURAT = defaultSpTapDate;
      values.tanggal_surat = defaultSpTapDate;
      values.DOC_DATE = defaultSpTapDate;
      values.doc_date = defaultSpTapDate;
      values.tanggal_sp_tap = defaultSpTapDate;
      values.tgl_sp_tap_tsk = defaultSpTapDate;
      values.TANGGAL_SP_TAP = defaultSpTapDate;
      values.TGL_SP_TAP_TSK = defaultSpTapDate;
    }

    return values;
  };

  // Helper sinkronisasi nilai profil korban ke variabel template mindik
  const syncVictimValues = (victim) => {
    const defaultNama = currentCase?.nama_pelapor || currentCase?.pelapor_name || '';
    const vNama = victim?.nama || defaultNama;
    const vNik = victim?.nik || '';
    const vJk = victim?.jenis_kelamin || (victim ? 'Laki-laki' : '');
    const vTtl = victim?.ttl || '';
    const rawUmur = victim?.umur || '';
    const vUmur = rawUmur
      ? (String(rawUmur).includes('Tahun') ? String(rawUmur) : `${rawUmur} Tahun`)
      : '';
    const vKerja = victim?.pekerjaan || '';
    const vWarga = victim?.kewarganegaraan || (vNama ? 'Indonesia' : '');
    const vDidik = victim?.pendidikan || '';
    const vAgama = victim?.agama || '';
    const vAlamat = victim?.alamat || (victim ? '' : (currentCase?.locus || ''));

    return {
      KORBAN_NAMA: vNama,
      korban_nama: vNama,
      KORBAN_NIK: vNik,
      korban_nik: vNik,
      KORBAN_JK: vJk,
      korban_jk: vJk,
      KORBAN_JENIS_KELAMIN: vJk,
      korban_jenis_kelamin: vJk,
      KORBAN_TTL: vTtl,
      korban_ttl: vTtl,
      KORBAN_UMUR: vUmur,
      korban_umur: vUmur,
      KORBAN_KERJA: vKerja,
      korban_kerja: vKerja,
      KORBAN_PEKERJAAN: vKerja,
      korban_pekerjaan: vKerja,
      KORBAN_WARGA: vWarga,
      korban_warga: vWarga,
      KORBAN_KEWARGANEGARAAN: vWarga,
      korban_kewarganegaraan: vWarga,
      KORBAN_DIDIK: vDidik,
      korban_didik: vDidik,
      KORBAN_PENDIDIKAN: vDidik,
      korban_pendidikan: vDidik,
      KORBAN_AGAMA: vAgama,
      korban_agama: vAgama,
      KORBAN_ALAMAT: vAlamat,
      korban_alamat: vAlamat,
    };
  };

  // Helper identifikasi apakah template membutuhkan identitas korban
  const isVictimDoc = (() => {
    const c = (currentTemplate?.code || '').toUpperCase().trim();
    const t = (currentTemplate?.title || currentTemplate?.name || '').toUpperCase();
    return c.includes('VER') || 
           c.includes('KORBAN') || 
           c.includes('HAK_KORBAN') || 
           t.includes('KORBAN') || 
           t.includes('VISUM') ||
           (Array.isArray(currentTemplate?.dynamic_fields) && currentTemplate.dynamic_fields.some(f => (f.field_key || f.key || '').toUpperCase().includes('KORBAN')));
  })();

  // Helper identifikasi dokumen Surat Perintah Tugas Penyidikan (SP.Gas.Sidik)
  const isSprinGasSidik = (() => {
    const c = (currentTemplate?.code || '').toUpperCase().trim();
    const t = (currentTemplate?.title || currentTemplate?.name || '').toUpperCase();
    return c === 'SPRIN_GAS_SIDIK' || 
           c === 'SPRIN_TUGAS_PENYIDIKAN' || 
           c.includes('GAS_SIDIK') || 
           t.includes('TUGAS PENYIDIKAN');
  })();

  // Helper identifikasi dokumen SP.Sidik Induk
  const isSprinSidik = (() => {
    const c = (currentTemplate?.code || '').toUpperCase().trim();
    const t = (currentTemplate?.title || currentTemplate?.name || '').toUpperCase();
    if (isSprinGasSidik) return false;
    return c === 'SPRIN_SIDIK' || c === 'SP_SIDIK' || 
           (c.includes('SIDIK') && !c.includes('GAS')) || 
           (t.includes('PENYIDIKAN') && !t.includes('TUGAS'));
  })();

  const isSidikDoc = isSprinSidik;

  // Helper identifikasi dokumen BA Penangkapan (BA_KAP / SPRIN_KAP_DAN_BA)
  const isBaKapDoc = (() => {
    const c = (currentTemplate?.code || '').toUpperCase().trim();
    const t = (currentTemplate?.title || currentTemplate?.name || '').toUpperCase();
    if (c === 'BA_KAP' || c === 'SPRIN_KAP_DAN_BA' || c === 'SPRIN_KAP') return true;
    if (c.includes('BA_KAP')) return true;
    if (t.includes('PENANGKAPAN') && (t.includes('BERITA ACARA') || t.includes('DAN BA') || t.includes('SURAT PERINTAH'))) return true;
    return false;
  })();

  // Helper identifikasi dokumen Sprin & BA Penahanan (SPRIN_HAN / BA_HAN / SPRIN_HAN_DAN_BA)
  const isHanDoc = (() => {
    const c = (currentTemplate?.code || '').toUpperCase().trim();
    const t = (currentTemplate?.title || currentTemplate?.name || '').toUpperCase();
    if (c === 'SPRIN_HAN' || c === 'BA_HAN' || c === 'SPRIN_HAN_DAN_BA') return true;
    if (c.includes('SPRIN_HAN') || c.includes('BA_HAN')) return true;
    if (t.includes('PENAHANAN') && !t.includes('PERPANJANGAN') && !t.includes('PENGELUARAN') && !t.includes('PENGALIHAN')) return true;
    return false;
  })();

  // Evaluasi Konfigurasi Dokumen Induk (Universal Auto-Sync)
  const activeParentConfig = getParentDocConfig(currentTemplate);
  const isCurrentParentDoc = Boolean(activeParentConfig);

  // 2. Fetch Suspects for currentCase from Supabase (BAGIAN 3 & 4)
  const [isLoadingSuspects, setIsLoadingSuspects] = useState(false);

  useEffect(() => {
    if (!currentCase?.id) return;
    const loadSuspects = async () => {
      setIsLoadingSuspects(true);
      try {
        const { data, error } = await supabase
          .from('case_suspects')
          .select('*')
          .eq('case_id', currentCase.id)
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          setCaseSuspects(data);
          setSelectedSuspectId(prev => {
            if (initialSuspectId && data.some(s => s.id === initialSuspectId)) return initialSuspectId;
            if (prev && data.some(s => s.id === prev)) return prev;
            return data[0].id;
          });
        } else {
          // Fallback ke daftar terlapor_list di currentCase atau person legacy
          let fallbacks = [];
          if (Array.isArray(currentCase?.terlapor_list) && currentCase.terlapor_list.length > 0) {
            fallbacks = currentCase.terlapor_list.map((t, idx) => ({
              id: t.id || `terlapor-${idx}`,
              case_id: currentCase?.id,
              nama: t.nama,
              nik: t.nik || '-',
              jenis_kelamin: t.jenis_kelamin || 'Laki-laki',
              tempat_lahir: t.tempat_lahir || '',
              tgl_lahir: t.tgl_lahir || '',
              umur: t.umur || '',
              agama: t.agama || '',
              pekerjaan: t.pekerjaan || '',
              kewarganegaraan: t.kewarganegaraan || 'Indonesia',
              pendidikan: t.pendidikan || '',
              status_pernikahan: t.status_pernikahan || '',
              alamat: t.alamat || '',
              kontak: t.kontak || '',
              status: t.status || 'terlapor',
              no_sp_tap_tsk: t.no_sp_tap_tsk || '',
              nomor_sp_tap: t.no_sp_tap_tsk || '',
              tanggal_sp_tap: t.tgl_sp_tap_tsk || '',
              tgl_sp_tap_tsk: t.tgl_sp_tap_tsk || '',
              urutan_tersangka: t.urutan_tersangka || (idx + 1),
              status_tersangka_label: t.status_tersangka_label || ''
            }));
          } else if (currentCase?.person?.nama && currentCase?.person?.nama !== 'Dalam Penyelidikan') {
            const fallback = {
              id: 'legacy-suspect-1',
              case_id: currentCase?.id,
              nama: currentCase?.person?.nama,
              nik: currentCase?.person?.nik || '-',
              jenis_kelamin: currentCase?.person?.gender || 'Laki-laki',
              tempat_lahir: (currentCase?.person?.pob_dob || '').split(',')[0] || 'Kolaka Timur',
              tgl_lahir: (currentCase?.person?.pob_dob || '').split(',')[1]?.trim() || '',
              umur: currentCase?.person?.umur || '30',
              agama: currentCase?.person?.agama || 'Islam',
              pekerjaan: currentCase?.person?.pekerjaan || 'Swasta',
              kewarganegaraan: currentCase?.person?.kewarganegaraan || 'Indonesia',
              pendidikan: currentCase?.person?.pendidikan || 'SMA',
              status_pernikahan: currentCase?.person?.marital_status || 'Kawin',
              alamat: currentCase?.person?.alamat || currentCase?.locus || '',
              kontak: currentCase?.person?.kontak || '',
              status: currentCase?.references?.no_sp_tap_tsk ? 'tersangka' : 'terlapor',
              no_sp_tap_tsk: currentCase?.references?.no_sp_tap_tsk || '',
              nomor_sp_tap: currentCase?.references?.no_sp_tap_tsk || '',
              tanggal_sp_tap: currentCase?.references?.tgl_sp_tap_tsk || '',
              tgl_sp_tap_tsk: currentCase?.references?.tgl_sp_tap_tsk || '',
              no_sprin_kap: currentCase?.references?.no_sprin_kap || '',
              no_sprin_han: currentCase?.references?.no_sprin_han || '',
            };
            fallbacks = [fallback];
          }

          setCaseSuspects(fallbacks);
          setSelectedSuspectId(prev => {
            if (initialSuspectId && fallbacks.some(s => s.id === initialSuspectId)) return initialSuspectId;
            return fallbacks[0]?.id || '';
          });
        }
      } catch (e) {
        console.warn('Error loading case suspects:', e);
      } finally {
        setIsLoadingSuspects(false);
      }
    };

    loadSuspects();
  }, [currentCase?.id, initialSuspectId]);

  const suspectList = caseSuspects || [];
  const selectedSuspect = suspectList.find(s => s.id === selectedSuspectId) || suspectList[0] || null;
  const selectedTemplate = currentTemplate;
  const activeCase = currentCase;
  const prevTemplateIdRef = useRef(currentTemplate?.id || selectedTemplateCode);

  const currentPrereq = currentTemplate
    ? (tahapMindik === 'SIDIK'
        ? checkPrerequisite(currentTemplate, currentCase, caseDocuments, caseSuspects, selectedSuspect)
        : { allowed: true, reason: '' })
    : { allowed: false, reason: 'Belum ada format dokumen Mindik yang dipilih.' };

  const handleSelectTahap = (stage) => {
    setTahapMindik(stage);
    setShowTahapModal(false);

    const stageTpls = allTemplates.filter(t => getTemplateStage(t) === stage);
    if (stageTpls.length > 0) {
      if (!stageTpls.some(t => t.code === selectedTemplateCode)) {
        // Cari template pertama yang memenuhi prasyarat di tahapan ini
        const firstAllowed = stageTpls.find(t => {
          const p = checkPrerequisite(t, currentCase, caseDocuments, caseSuspects, selectedSuspect);
          return p.allowed;
        }) || stageTpls[0];
        setSelectedTemplateCode(firstAllowed.code);
      }
    } else {
      setSelectedTemplateCode('');
    }
  };

  const setNomorSurat = (val) => {
    setFormValues(prev => ({
      ...prev,
      NOMOR_SURAT: val,
      nomor_surat: val,
      NO_SURAT: val,
      no_surat: val,
      DOC_NO: val,
      doc_no: val,
      nomor_sp_tap: val,
      no_sp_tap_tsk: val,
      nomor_sp_tap_tsk: val,
      NOMOR_SP_TAP: val,
      NO_SP_TAP_TSK: val,
      NOMOR_SP_TAP_TSK: val,
    }));
  };

  const setDocNumber = (val) => {
    setNomorSurat(val);
  };

  const setTanggalSurat = (val) => {
    setFormValues(prev => ({
      ...prev,
      TANGGAL_SURAT: val,
      tanggal_surat: val,
      DOC_DATE: val,
      doc_date: val,
      tanggal_sp_tap: val,
      tgl_sp_tap_tsk: val,
      TANGGAL_SP_TAP: val,
      TGL_SP_TAP_TSK: val,
    }));
  };

  // Handler perubahan input penomoran SP.Tap TSK (Two-way binding ke preview & variabel template)
  const handleNomorSpTapChange = (val) => {
    setFormValues((prev) => ({
      ...prev,
      NOMOR_SURAT: val,
      nomor_surat: val,
      DOC_NO: val,
      doc_no: val,
      nomor_sp_tap: val,
      no_sp_tap_tsk: val,
      nomor_sp_tap_tsk: val,
      NOMOR_SP_TAP: val,
      NO_SP_TAP_TSK: val,
      NOMOR_SP_TAP_TSK: val,
    }));
    setIsSaved(false);
  };

  // Handler perubahan input tanggal penetapan tersangka
  const handleTanggalSpTapChange = (val) => {
    setFormValues((prev) => ({
      ...prev,
      TANGGAL_SURAT: val,
      tanggal_surat: val,
      DOC_DATE: val,
      doc_date: val,
      tanggal_sp_tap: val,
      tgl_sp_tap_tsk: val,
      TANGGAL_SP_TAP: val,
      TGL_SP_TAP_TSK: val,
    }));
    setIsSaved(false);
  };

  // Pastikan jika dokumen perorangan aktif dan belum ada tersangka terpilih, tetapkan tersangka pertama (suspects[0])
  useEffect(() => {
    if (isIndividualDoc && caseSuspects.length > 0) {
      if (!selectedSuspectId || !caseSuspects.some(s => s.id === selectedSuspectId)) {
        setSelectedSuspectId(caseSuspects[0].id);
      }
    }
  }, [isIndividualDoc, caseSuspects, selectedSuspectId]);

  // 1. Reset / Muat Ulang Format Nomor Sesuai Template Aktif:
  useEffect(() => {
    if (!currentTemplate) return;

    // Ambil format mentah dari Template Studio
    const templateFormatNomor = currentTemplate?.format_nomor 
      || currentTemplate?.default_doc_number 
      || currentTemplate?.nomor_format
      || currentTemplate?.meta_values?.NOMOR_SURAT
      || '';

    // Terapkan ke state form input
    setFormValues(prev => ({
      ...prev,
      NOMOR_SURAT: templateFormatNomor,
      NO_SURAT: templateFormatNomor
    }));

    setDocNumber(templateFormatNomor);
  }, [currentTemplate?.id, currentTemplate?.code]);

  // Sinkronisasi Profil Tersangka saat Tersangka Berubah
  useEffect(() => {
    if (!selectedSuspect) return;

    if (selectedSuspect.urutan_tersangka) {
      setUrutanTersangka(Number(selectedSuspect.urutan_tersangka) || 1);
    } else if (isSpTapDoc) {
      const establishedCount = caseSuspects.filter(s => s.status === 'tersangka' || s.no_sp_tap_tsk).length;
      setUrutanTersangka(establishedCount + 1);
    }

    if (isIndividualDoc || isSpTapDoc) {
      const suspectFields = syncSuspectValues(selectedSuspect, isSpTapDoc);
      setFormValues(prev => ({
        ...prev,
        ...suspectFields,
        ALAMAT: selectedSuspect.alamat || prev.ALAMAT || prev.alamat || '',
        alamat: selectedSuspect.alamat || prev.ALAMAT || prev.alamat || '',
        NAMA_TERLAPOR: currentCase?.nama_terlapor || currentCase?.terlapor_name || currentCase?.terlapor || prev.NAMA_TERLAPOR || '',
        nama_terlapor: currentCase?.nama_terlapor || currentCase?.terlapor_name || currentCase?.terlapor || prev.nama_terlapor || '',
      }));
    }
  }, [selectedSuspect, isIndividualDoc, isSpTapDoc]);

  // Handler ganti tersangka pilihan
  const handleSuspectChange = (suspectId) => {
    setSelectedSuspectId(suspectId);
    const found = caseSuspects.find(s => s.id === suspectId);
    if (found) {
      let nextUrutan = found.urutan_tersangka;
      if (!nextUrutan) {
        if (isSpTapDoc) {
          const establishedCount = caseSuspects.filter(s => (s.status === 'tersangka' || s.no_sp_tap_tsk) && s.id !== suspectId).length;
          nextUrutan = establishedCount + 1;
        } else {
          nextUrutan = 1;
        }
      }
      const numUrutan = Number(nextUrutan) || 1;
      setUrutanTersangka(numUrutan);

      const suspectFields = syncSuspectValues(found, isSpTapDoc);

      setFormValues(prev => {
        const next = {
          ...prev,
          ...suspectFields,
          URUTAN_TERSANGKA: numUrutan,
          urutan_tersangka: numUrutan,
          STATUS_TERSANGKA_LABEL: `Tersangka ${getRomanUrutan(numUrutan)}`,
          status_tersangka_label: `Tersangka ${getRomanUrutan(numUrutan)}`,
          ALAMAT: found.alamat || prev.ALAMAT || prev.alamat || '',
          alamat: found.alamat || prev.ALAMAT || prev.alamat || '',
          // NAMA_TERLAPOR tetap murni dari data Laporan Polisi (LP) awal
          NAMA_TERLAPOR: currentCase?.nama_terlapor || currentCase?.terlapor_name || currentCase?.terlapor || prev.NAMA_TERLAPOR || '',
          nama_terlapor: currentCase?.nama_terlapor || currentCase?.terlapor_name || currentCase?.terlapor || prev.nama_terlapor || '',
        };

        if (isSpTapDoc) {
          const sNo = found.nomor_sp_tap || found.no_sp_tap_tsk || '';
          const sDate = found.tanggal_sp_tap || found.tgl_sp_tap_tsk || new Date().toISOString().split('T')[0];
          if (sNo) {
            next.nomor_sp_tap = sNo;
            next.no_sp_tap_tsk = sNo;
            next.nomor_sp_tap_tsk = sNo;
            next.NOMOR_SP_TAP = sNo;
            next.NO_SP_TAP_TSK = sNo;
            next.NOMOR_SP_TAP_TSK = sNo;
          }
          next.TANGGAL_SURAT = sDate;
          next.tanggal_surat = sDate;
          next.DOC_DATE = sDate;
          next.doc_date = sDate;
          next.tanggal_sp_tap = sDate;
          next.tgl_sp_tap_tsk = sDate;
          next.TANGGAL_SP_TAP = sDate;
          next.TGL_SP_TAP_TSK = sDate;
        }

        return next;
      });
    }
  };

  // Sinkronisasi Profil Korban Terpilih
  useEffect(() => {
    if (registeredVictims.length > 0) {
      if (!selectedVictimId || !registeredVictims.some(v => (v.id || v.nama) === selectedVictimId)) {
        setSelectedVictimId(registeredVictims[0].id || registeredVictims[0].nama || 'vic-0');
      }
    } else {
      setSelectedVictimId('');
    }
  }, [currentCase?.id, registeredVictims.length]);

  // Handler ganti korban pilihan
  const handleVictimChange = (victimId) => {
    setSelectedVictimId(victimId);
    const found = registeredVictims.find(v => (v.id || v.nama) === victimId) || registeredVictims[0];
    const victimFields = syncVictimValues(found);
    setFormValues(prev => ({
      ...prev,
      ...victimFields
    }));
  };

  // 3. Initialize or re-fill form defaults when case or template changes
  useEffect(() => {
    if (!currentTemplate || !currentCase) return;

    const initial = {};
    const todayStr = new Date().toISOString().split('T')[0];
    const isTapTskDoc = (currentTemplate?.code || '').toUpperCase().includes('TAP_TSK') || (currentTemplate?.title || '').toUpperCase().includes('PENETAPAN TERSANGKA');

    // Inisialisasi Default Nilai Korban (VER, HAK_KORBAN, dll.)
    const victimFields = syncVictimValues(selectedVictim);
    Object.keys(victimFields).forEach(vk => {
      initial[vk] = victimFields[vk];
    });

    // Rantai Rujukan Baku dari Perkara (Chain of Reference)
    initial['NOMOR_LP'] = currentCase?.nomor_lp || currentCase?.no_lp || '';
    initial['TANGGAL_LP'] = currentCase?.tanggal_lp || currentCase?.sprin_date || '';
    initial['TGL_LP'] = initial['TANGGAL_LP'];

    initial['NO_SPRIN_SIDIK'] = currentCase?.no_sprin_sidik || '';
    initial['TGL_SPRIN_SIDIK'] = currentCase?.tgl_sprin_sidik || currentCase?.sprin_date || (isSprinSidik ? todayStr : '');
    initial['TANGGAL_SPRIN_SIDIK'] = initial['TGL_SPRIN_SIDIK'];

    initial['NO_SPRIN_GAS_SIDIK'] = currentCase?.no_sprin_gas_sidik || '';
    initial['TGL_SPRIN_GAS_SIDIK'] = currentCase?.tgl_sprin_gas_sidik || (isSprinGasSidik ? todayStr : '');
    initial['TANGGAL_SPRIN_GAS_SIDIK'] = initial['TGL_SPRIN_GAS_SIDIK'];

    // Universal Auto-Sync Dokumen Induk (Parent Case Document)
    if (isCurrentParentDoc && activeParentConfig) {
      const parentDate = currentCase?.[activeParentConfig.targetTglCol] || todayStr;
      (activeParentConfig.tglTags || []).forEach(tag => {
        initial[tag] = parentDate;
        initial[tag.toLowerCase()] = parentDate;
      });
      const parentNo = currentCase?.[activeParentConfig.targetNoCol] || '';
      (activeParentConfig.noTags || []).forEach(tag => {
        initial[tag] = parentNo;
        initial[tag.toLowerCase()] = parentNo;
      });
    }

    initial['NO_SPDP'] = currentCase?.no_spdp || '';
    initial['TGL_SPDP'] = currentCase?.tgl_spdp || '';
    initial['TANGGAL_SPDP'] = initial['TGL_SPDP'];

    if (selectedSuspect) {
      const suspectFields = syncSuspectValues(selectedSuspect, isTapTskDoc);
      Object.assign(initial, suspectFields);
    }

    // Otomatisasi Penandatangan Mindik dari Data Perkara Aktif
    initial['ATASAN_NAMA'] = currentCase?.kasat_nama || '';
    initial['ATASAN_PANGKAT'] = formatPangkatLengkap(currentCase?.kasat_pangkat || '');
    initial['ATASAN_NRP'] = currentCase?.kasat_nrp || '';
    initial['ATASAN_JABATAN'] = currentCase?.kasat_jabatan || 'Kasat Reskrim';

    initial['PENYIDIK_NAMA'] = currentCase?.penyidik_1_nama || '';
    initial['PENYIDIK_PANGKAT'] = formatPangkatLengkap(currentCase?.penyidik_1_pangkat || '');
    initial['PENYIDIK_NRP'] = currentCase?.penyidik_1_nrp || '';
    initial['PENYIDIK_JABATAN'] = currentCase?.penyidik_1_jabatan || '';

    // Data Penyidik Penangan Perkara
    const penanganDocCase = getPenyidikPenangan(currentCase);
    initial['PENYIDIK_PENANGAN_NAMA'] = penanganDocCase?.nama || currentCase?.penyidik_1_nama || '';
    initial['PENYIDIK_PENANGAN_PANGKAT'] = formatPangkatLengkap(penanganDocCase?.pangkat || currentCase?.penyidik_1_pangkat || '');
    initial['PENYIDIK_PENANGAN_NRP'] = penanganDocCase?.nrp || currentCase?.penyidik_1_nrp || '';
    initial['PENYIDIK_PENANGAN_JABATAN'] = penanganDocCase?.jabatan || currentCase?.penyidik_1_jabatan || '';

    for (let i = 1; i <= 5; i++) {
      initial[`PENYIDIK_${i}_NAMA`] = currentCase?.[`penyidik_${i}_nama`] || '';
      initial[`PENYIDIK_${i}_PANGKAT`] = currentCase?.[`penyidik_${i}_pangkat`] || '';
      initial[`PENYIDIK_${i}_NRP`] = currentCase?.[`penyidik_${i}_nrp`] || '';
      initial[`PENYIDIK_${i}_JABATAN`] = currentCase?.[`penyidik_${i}_jabatan`] || '';
    }

    // Inisialisasi Default Nilai Penangkapan (BA_KAP / SPRIN_KAP_DAN_BA)
    if (isBaKapDoc) {
      const tglKap = selectedSuspect?.tgl_sprin_kap || todayStr;
      const tempatKap = 'Kab. Kolaka Timur';
      initial['TANGGAL_KAP'] = tglKap;
      initial['JAM_KAP'] = '10.00 WITA';
      initial['TEMPAT_KAP'] = tempatKap;
      // Auto-mirror ke tanggal surat & lokasi dokumen naskah dinas
      initial['TANGGAL_SURAT'] = tglKap;
      initial['DOC_DATE'] = tglKap;
      initial['TEMPAT_SURAT'] = tempatKap;
      initial['DOC_LOCATION'] = tempatKap;
    }

    // Inisialisasi Default Nilai Penahanan (SPRIN_HAN / BA_HAN / SPRIN_HAN_DAN_BA)
    if (isHanDoc) {
      const tglMulai = selectedSuspect?.tgl_sprin_han || todayStr;
      const tempatHan = 'Rumah Tahanan Negara (Rutan) Polres Kolaka Timur';
      initial['TANGGAL_MULAI_HAN'] = tglMulai;
      initial['TANGGAL_AKHIR_HAN'] = hitungTanggalAkhirPenahanan(tglMulai, 20);
      initial['TEMPAT_HAN'] = tempatHan;
      initial['TANGGAL_HAN'] = tglMulai;
      initial['JAM_HAN'] = '10.00 WITA';
      // Auto-mirror ke tanggal surat & lokasi dokumen naskah dinas
      initial['TANGGAL_SURAT'] = tglMulai;
      initial['DOC_DATE'] = tglMulai;
      initial['TEMPAT_SURAT'] = tempatHan;
      initial['DOC_LOCATION'] = tempatHan;
    }

    const defaultDocFields = [
      { 
        field_key: 'NOMOR_SURAT', 
        field_label: 'Nomor Surat', 
        field_type: 'text', 
        default_value: isSprinGasSidik ? 'SP.Gas.Sidik/___/I/RES.0.0./2026/Satreskrim/Polres Koltim/Polda Sultra' : '', 
        is_required: true 
      },
      { field_key: 'TANGGAL_SURAT', field_label: 'Tanggal Surat', field_type: 'date', default_value: todayStr, is_required: true },
      ...(isSprinSidik ? [
        { field_key: 'TGL_SPRIN_SIDIK', field_label: 'Tanggal Penetapan SP.Sidik', field_type: 'date', default_value: currentCase?.tgl_sprin_sidik || currentCase?.sprin_date || todayStr, is_required: true }
      ] : []),
      { field_key: 'TEMPAT_SURAT', field_label: 'Tempat Surat', field_type: 'text', default_value: 'Tirawuta', is_required: false },
      { field_key: 'TUJUAN_SURAT', field_label: 'Tujuan Surat', field_type: 'text', default_value: 'Kepala Kejaksaan Negeri Kolaka', is_required: false },
      { field_key: 'ALAMAT_TUJUAN', field_label: 'Alamat Tujuan', field_type: 'text', default_value: 'Jl. Dr. Sutomo No. 5, Kolaka', is_required: false },
      { field_key: 'MASA_BERLAKU', field_label: 'Masa Berlaku', field_type: 'text', default_value: '30 (tiga puluh) hari', is_required: false }
    ];

    const presetForTemplate = getMindikPreset(currentTemplate?.code);

    let fields = Array.isArray(currentTemplate?.dynamic_fields) && currentTemplate?.dynamic_fields.length > 0 
      ? [...currentTemplate.dynamic_fields] 
      : (presetForTemplate && presetForTemplate.length > 0
          ? presetForTemplate.map(p => ({
              field_key: p.tag,
              field_label: p.label,
              field_type: p.type,
              default_value: p.default,
              is_required: p.required
            }))
          : defaultDocFields);

    // Hapus referensi ATASAN_JABATAN karena jabatan Kasat tercetak permanen di template
    fields = fields.filter(f => (f.field_key || f.key || '').replace(/[{}]/g, '').trim().toUpperCase() !== 'ATASAN_JABATAN');

    // Hapus input manual rujukan dokumen induk jika dokumen yang dibuka adalah dokumen induk itu sendiri
    if (isCurrentParentDoc && activeParentConfig) {
      const redundantKeys = [
        ...(activeParentConfig.noTags || []),
        ...(activeParentConfig.tglTags || []),
        activeParentConfig.targetNoCol?.toUpperCase(),
        activeParentConfig.targetTglCol?.toUpperCase()
      ].filter(Boolean);

      fields = fields.filter(f => {
        const k = (f.field_key || f.key || '').replace(/[{}]/g, '').trim().toUpperCase();
        return !redundantKeys.includes(k);
      });
    }

    fields.forEach((field) => {
      const rawKey = field.field_key || field.key || '';
      const cleanKey = rawKey.replace(/[{}]/g, '').trim();
      if (!cleanKey) return;

      const upperKey = cleanKey.toUpperCase();
      const presetFieldMatch = presetForTemplate?.find(p => (p.tag || '').toUpperCase() === upperKey);
      const defVal = (field.default_value !== undefined && field.default_value !== '')
        ? field.default_value
        : (presetFieldMatch?.default !== undefined
            ? presetFieldMatch.default
            : (field.placeholder || ''));

      // Tentukan nilai default sesuai kamus standar (tanpa string fallback bentrok)
      if (upperKey === 'TANGGAL_SURAT' || upperKey === 'DOC_DATE') {
        if (isTapTskDoc && (selectedSuspect?.tanggal_sp_tap || selectedSuspect?.tgl_sp_tap_tsk)) {
          initial[cleanKey] = selectedSuspect?.tanggal_sp_tap || selectedSuspect?.tgl_sp_tap_tsk;
        } else if (isCurrentParentDoc && activeParentConfig && currentCase?.[activeParentConfig.targetTglCol]) {
          initial[cleanKey] = currentCase[activeParentConfig.targetTglCol];
        } else {
          initial[cleanKey] = defVal || todayStr;
        }
      } else if (upperKey === 'NOMOR_SURAT' || upperKey === 'DOC_NO' || upperKey === 'NO_SURAT') {
        const templateFormatNomor = currentTemplate?.format_nomor 
          || currentTemplate?.default_doc_number 
          || currentTemplate?.nomor_format
          || currentTemplate?.meta_values?.NOMOR_SURAT
          || defVal
          || '';
        initial[cleanKey] = templateFormatNomor;
      } else if (upperKey === 'TGL_SPRIN_SIDIK' || upperKey === 'TANGGAL_SPRIN_SIDIK') {
        initial[cleanKey] = currentCase?.tgl_sprin_sidik || currentCase?.sprin_date || (isSprinSidik ? todayStr : '');
      } else if (upperKey === 'NO_SPRIN_GAS_SIDIK') {
        initial[cleanKey] = currentCase?.no_sprin_gas_sidik || '';
      } else if (upperKey === 'TGL_SPRIN_GAS_SIDIK' || upperKey === 'TANGGAL_SPRIN_GAS_SIDIK') {
        initial[cleanKey] = currentCase?.tgl_sprin_gas_sidik || (isSprinGasSidik ? todayStr : '');
      } else if (upperKey === 'NO_SPRIN_SIDIK') {
        initial[cleanKey] = currentCase?.no_sprin_sidik || '';
      } else if (upperKey === 'NOMOR_LP' || upperKey === 'NO_LP') {
        initial[cleanKey] = currentCase?.nomor_lp || currentCase?.no_lp || '';
      } else if (upperKey === 'TANGGAL_LP' || upperKey === 'TGL_LP') {
        initial[cleanKey] = currentCase?.tanggal_lp || currentCase?.sprin_date || '';
      } else if (upperKey === 'NO_SPDP') {
        initial[cleanKey] = currentCase?.no_spdp || '';
      } else if (upperKey === 'TGL_SPDP' || upperKey === 'TANGGAL_SPDP') {
        initial[cleanKey] = currentCase?.tgl_spdp || '';
      } else if (upperKey === 'TEMPAT_SURAT' || upperKey === 'DOC_LOCATION') {
        initial[cleanKey] = defVal || 'Tirawuta';
      } else if (upperKey === 'MASA_BERLAKU' || upperKey === 'DOC_VALIDITY') {
        initial[cleanKey] = defVal || '30 (tiga puluh) hari';
      } else if (upperKey === 'TUJUAN_SURAT' || upperKey === 'DOC_TARGET') {
        initial[cleanKey] = defVal || 'Kepala Kejaksaan Negeri Kolaka';
      } else if (upperKey === 'ALAMAT_TUJUAN' || upperKey === 'DOC_TARGET_ADDR') {
        initial[cleanKey] = defVal || 'Jl. Dr. Sutomo No. 5, Kolaka';
      } else if (upperKey === 'PENYIDIK_NAMA') {
        initial[cleanKey] = currentCase?.penyidik_1_nama || defVal || '';
      } else if (upperKey === 'PENYIDIK_PANGKAT') {
        initial[cleanKey] = formatPangkatLengkap(currentCase?.penyidik_1_pangkat || defVal || '');
      } else if (upperKey === 'PENYIDIK_NRP') {
        initial[cleanKey] = currentCase?.penyidik_1_nrp || defVal || '';
      } else if (upperKey === 'PENYIDIK_JABATAN') {
        initial[cleanKey] = currentCase?.penyidik_1_jabatan || defVal || '';
      } else if (upperKey === 'ATASAN_NAMA') {
        initial[cleanKey] = currentCase?.kasat_nama || defVal || '';
      } else if (upperKey === 'ATASAN_PANGKAT') {
        initial[cleanKey] = formatPangkatLengkap(currentCase?.kasat_pangkat || defVal || '');
      } else if (upperKey === 'ATASAN_NRP') {
        initial[cleanKey] = currentCase?.kasat_nrp || defVal || '';
      } else if (upperKey.startsWith('PENYIDIK_')) {
        // Otomatis sinkronkan slot PENYIDIK_1..5
        const slotMatch = upperKey.match(/^PENYIDIK_([1-5])_(NAMA|PANGKAT|NRP|JABATAN)$/);
        if (slotMatch) {
          const sNum = slotMatch[1];
          const sProp = slotMatch[2].toLowerCase();
          initial[cleanKey] = currentCase?.[`penyidik_${sNum}_${sProp}`] || defVal || '';
        } else {
          initial[cleanKey] = defVal || '';
        }
      } else if (upperKey === 'NO_SP_TAP_TSK' && selectedSuspect) {
        initial[cleanKey] = selectedSuspect.no_sp_tap_tsk || '';
      } else if (upperKey === 'TGL_SP_TAP_TSK' && selectedSuspect) {
        initial[cleanKey] = selectedSuspect.tgl_sp_tap_tsk || '';
      } else if (upperKey === 'NO_SPRIN_KAP' && selectedSuspect) {
        initial[cleanKey] = selectedSuspect.no_sprin_kap || '';
      } else if (upperKey === 'NO_SPRIN_HAN' && selectedSuspect) {
        initial[cleanKey] = selectedSuspect.no_sprin_han || '';
      } else if (upperKey === 'TGL_SPRIN_HAN' && selectedSuspect) {
        initial[cleanKey] = selectedSuspect.tgl_sprin_han || '';
      } else if (upperKey.startsWith('KORBAN_') || upperKey.startsWith('korban_')) {
        initial[cleanKey] = victimFields[upperKey] !== undefined ? victimFields[upperKey] : (defVal || '');
      } else if (field.field_type === 'select_personnel' || field.type === 'select_personnel') {
        const filter = field.role_filter;
        const matched = activePersonnel.find(p => !filter || p.role === filter);
        initial[cleanKey] = matched ? matched.id : '';
      } else {
        initial[cleanKey] = defVal || '';
      }
    });

    setFormValues(prev => {
      const isTemplateChanged = prevTemplateIdRef.current !== (currentTemplate?.id || selectedTemplateCode);
      prevTemplateIdRef.current = currentTemplate?.id || selectedTemplateCode;

      // Pertahankan input pengguna yang sudah diketik
      const merged = { ...initial };
      Object.keys(prev || {}).forEach(k => {
        const cleanK = k.replace(/[{}]/g, '').trim();
        const upperK = cleanK.toUpperCase();
        const isDocNumberOrDateField = ['NOMOR_SURAT', 'NO_SURAT', 'DOC_NO', 'TANGGAL_SURAT', 'DOC_DATE'].includes(upperK);

        // Jika template berganti, jangan biarkan nomor surat atau tanggal surat dari template sebelumnya terbawa!
        if (isTemplateChanged && isDocNumberOrDateField) {
          return;
        }

        if (prev[k] !== undefined && prev[k] !== '') {
          merged[cleanK] = prev[k];
        }
      });

      // Jika template berganti, pastikan NOMOR_SURAT selalu mengambil format mentah template
      if (isTemplateChanged) {
        const templateFormatNomor = currentTemplate?.format_nomor 
          || currentTemplate?.default_doc_number 
          || currentTemplate?.nomor_format
          || currentTemplate?.meta_values?.NOMOR_SURAT
          || '';
        merged['NOMOR_SURAT'] = templateFormatNomor;
        merged['NO_SURAT'] = templateFormatNomor;
        merged['nomor_surat'] = templateFormatNomor;
        merged['no_surat'] = templateFormatNomor;
        merged['DOC_NO'] = templateFormatNomor;
        merged['doc_no'] = templateFormatNomor;
      }

      // Jika dokumen adalah SP TAP TSK dan tersangka memiliki nomor/tanggal SP TAP, sinkronkan rujukan tersangka
      if (isTapTskDoc && selectedSuspect) {
        const spTapNum = selectedSuspect.nomor_sp_tap || selectedSuspect.no_sp_tap_tsk;
        const spTapDate = selectedSuspect.tanggal_sp_tap || selectedSuspect.tgl_sp_tap_tsk;
        if (spTapNum) {
          merged['nomor_sp_tap'] = spTapNum;
          merged['no_sp_tap_tsk'] = spTapNum;
          merged['nomor_sp_tap_tsk'] = spTapNum;
          merged['NOMOR_SP_TAP'] = spTapNum;
          merged['NO_SP_TAP_TSK'] = spTapNum;
          merged['NOMOR_SP_TAP_TSK'] = spTapNum;
        }
        if (spTapDate) {
          merged['TANGGAL_SURAT'] = spTapDate;
          merged['tanggal_surat'] = spTapDate;
          merged['DOC_DATE'] = spTapDate;
          merged['doc_date'] = spTapDate;
          merged['tanggal_sp_tap'] = spTapDate;
          merged['tgl_sp_tap_tsk'] = spTapDate;
          merged['TANGGAL_SP_TAP'] = spTapDate;
          merged['TGL_SP_TAP_TSK'] = spTapDate;
        }
      }
      return merged;
    });
    setIsSaved(false);
  }, [selectedCaseId, selectedTemplateCode, currentTemplate, selectedSuspectId, selectedSuspect, isSidikDoc]);

  const handleInputChange = (key, value) => {
    setFormValues(prev => {
      const next = { ...prev, [key]: value };

      // Auto-Sync khusus nomor dan tanggal surat jika dokumen SP.Tap TSK aktif
      if (isSpTapDoc) {
        const upperKey = (key || '').replace(/[{}]/g, '').trim().toUpperCase();
        if (['NOMOR_SURAT', 'DOC_NO', 'NOMOR_SP_TAP', 'NO_SP_TAP_TSK', 'NOMOR_SP_TAP_TSK'].includes(upperKey)) {
          next.NOMOR_SURAT = value;
          next.nomor_surat = value;
          next.DOC_NO = value;
          next.doc_no = value;
          next.nomor_sp_tap = value;
          next.no_sp_tap_tsk = value;
          next.nomor_sp_tap_tsk = value;
          next.NOMOR_SP_TAP = value;
          next.NO_SP_TAP_TSK = value;
          next.NOMOR_SP_TAP_TSK = value;
        }
        if (['TANGGAL_SURAT', 'DOC_DATE', 'TANGGAL_SP_TAP', 'TGL_SP_TAP_TSK'].includes(upperKey)) {
          next.TANGGAL_SURAT = value;
          next.tanggal_surat = value;
          next.DOC_DATE = value;
          next.doc_date = value;
          next.tanggal_sp_tap = value;
          next.tgl_sp_tap_tsk = value;
          next.TANGGAL_SP_TAP = value;
          next.TGL_SP_TAP_TSK = value;
        }
      }
      
      // Universal Auto-Sync Dokumen Induk (Scalable & Modular)
      if (isCurrentParentDoc && activeParentConfig) {
        if (key === 'NOMOR_SURAT' || key === 'nomor_surat' || key === 'DOC_NO' || key === 'doc_no') {
          (activeParentConfig.noTags || []).forEach(tag => {
            next[tag] = value;
            next[tag.toLowerCase()] = value;
          });
          if (activeParentConfig.targetNoCol && currentCase) {
            currentCase[activeParentConfig.targetNoCol] = value;
          }
        }
        if (key === 'TANGGAL_SURAT' || key === 'tanggal_surat' || key === 'DOC_DATE' || key === 'doc_date') {
          (activeParentConfig.tglTags || []).forEach(tag => {
            next[tag] = value;
            next[tag.toLowerCase()] = value;
          });
          if (activeParentConfig.targetTglCol && currentCase) {
            currentCase[activeParentConfig.targetTglCol] = value;
            if (activeParentConfig.targetTglCol === 'tgl_sprin_sidik') {
              currentCase.sprin_date = value;
            }
          }
        }
      }

      // Auto-Mirroring Tanggal & Tempat Penangkapan ke Tag Dokumen Surat
      if (key === 'TANGGAL_KAP' || key === 'tanggal_kap') {
        next.TANGGAL_SURAT = value;
        next.tanggal_surat = value;
        next.DOC_DATE = value;
        next.doc_date = value;
      }

      if (key === 'TEMPAT_KAP' || key === 'tempat_kap') {
        next.TEMPAT_SURAT = value;
        next.tempat_surat = value;
        next.DOC_LOCATION = value;
        next.doc_location = value;
      }

      // Auto-Kalkulasi Tanggal Akhir Penahanan (+19 hari / KUHAP 20 hari) & Auto-Mirroring
      if (key === 'TANGGAL_MULAI_HAN' || key === 'tanggal_mulai_han') {
        const calculatedAkhir = hitungTanggalAkhirPenahanan(value, 20);
        next.TANGGAL_AKHIR_HAN = calculatedAkhir;
        next.tanggal_akhir_han = calculatedAkhir;
        next.TANGGAL_SURAT = value;
        next.tanggal_surat = value;
        next.DOC_DATE = value;
        next.doc_date = value;
        if (!prev.TANGGAL_HAN || prev.TANGGAL_HAN === prev.TANGGAL_MULAI_HAN) {
          next.TANGGAL_HAN = value;
          next.tanggal_han = value;
        }
      }

      if (key === 'TEMPAT_HAN' || key === 'tempat_han') {
        next.TEMPAT_SURAT = value;
        next.tempat_surat = value;
        next.DOC_LOCATION = value;
        next.doc_location = value;
      }

      return next;
    });
    setIsSaved(false);
  };

  // Jalankan sinkronisasi update ke Supabase saat dokumen SP.Tap TSK digenerate
  const syncPenetapanTersangka = async ({
    suspectId,
    nomorSpTap,
    tanggalSpTap,
    urutanTersangka: uTsk,
    statusLabel
  }) => {
    if (!currentCase) return null;
    const sId = suspectId || selectedSuspect?.id;
    const targetUrutan = uTsk || urutanTersangka || 1;
    const targetLabel = statusLabel || `Tersangka ${getRomanUrutan(targetUrutan)}`;
    const targetName = selectedSuspect?.nama || '';
    const cleanNo = nomorSpTap?.trim() || '';
    const cleanDate = tanggalSpTap?.trim() || new Date().toISOString().split('T')[0];

    const isUuid = typeof sId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sId);

    // Payload update ke tabel case_suspects
    let updatePayload = {
      nomor_sp_tap: cleanNo,
      no_sp_tap_tsk: cleanNo,
      tanggal_sp_tap: cleanDate,
      tgl_sp_tap_tsk: cleanDate,
      status: 'tersangka',
      status_subjek: 'Tersangka',
      urutan_tersangka: targetUrutan,
      status_label: targetLabel,
      status_tersangka_label: targetLabel,
      updated_at: new Date().toISOString()
    };

    const runUpdate = async (filterCol, filterVal) => {
      let payloadToTry = { ...updatePayload };
      let res = await supabase
        .from('case_suspects')
        .update(payloadToTry)
        .eq(filterCol, filterVal)
        .select();

      // Retry adaptif jika ada kolom yang tidak dikenali di skema
      while (res.error && res.error.message && res.error.message.includes("Could not find the '")) {
        const match = res.error.message.match(/Could not find the '([^']+)' column/);
        if (match && match[1]) {
          console.warn(`[syncPenetapanTersangka] Kolom '${match[1]}' tidak ada di skema, mencoba ulang tanpa kolom tersebut...`);
          delete payloadToTry[match[1]];
          res = await supabase
            .from('case_suspects')
            .update(payloadToTry)
            .eq(filterCol, filterVal)
            .select();
        } else {
          break;
        }
      }

      // Jika check constraint status gagal
      if (res.error && res.error.message && res.error.message.includes("status_check")) {
        payloadToTry.status = 'tersangka';
        res = await supabase
          .from('case_suspects')
          .update(payloadToTry)
          .eq(filterCol, filterVal)
          .select();
      }

      return res;
    };

    let resultData = null;

    if (isUuid) {
      const res = await runUpdate('id', sId);
      if (res.data && res.data.length > 0) {
        resultData = res.data;
      }
    }

    // Jika ID bukan UUID atau belum ada baris terupdate di DB, cari berdasarkan case_id & nama
    if ((!resultData || resultData.length === 0) && currentCase?.id && targetName) {
      const byName = await supabase
        .from('case_suspects')
        .update({
          nomor_sp_tap: cleanNo,
          no_sp_tap_tsk: cleanNo,
          tanggal_sp_tap: cleanDate,
          tgl_sp_tap_tsk: cleanDate,
          status: 'tersangka',
          urutan_tersangka: targetUrutan
        })
        .eq('case_id', currentCase.id)
        .ilike('nama', targetName)
        .select();

      if (byName.data && byName.data.length > 0) {
        resultData = byName.data;
      }
    }

    // Jika tetap belum ada di case_suspects, lakukan insert baru
    if ((!resultData || resultData.length === 0) && currentCase?.id && targetName) {
      const insertObj = {
        case_id: currentCase.id,
        nama: targetName,
        nik: selectedSuspect?.nik || '-',
        jenis_kelamin: selectedSuspect?.jenis_kelamin || 'Laki-laki',
        tempat_lahir: selectedSuspect?.tempat_lahir || null,
        tgl_lahir: selectedSuspect?.tgl_lahir || null,
        umur: selectedSuspect?.umur ? String(selectedSuspect.umur) : null,
        agama: selectedSuspect?.agama || 'Islam',
        pekerjaan: selectedSuspect?.pekerjaan || 'Swasta',
        kewarganegaraan: selectedSuspect?.kewarganegaraan || 'Indonesia',
        pendidikan: selectedSuspect?.pendidikan || 'SMA',
        status_pernikahan: selectedSuspect?.status_pernikahan || 'Kawin',
        alamat: selectedSuspect?.alamat || currentCase.locus || null,
        nomor_sp_tap: cleanNo,
        no_sp_tap_tsk: cleanNo,
        tanggal_sp_tap: cleanDate,
        tgl_sp_tap_tsk: cleanDate,
        status: 'tersangka',
        urutan_tersangka: targetUrutan,
        created_at: new Date().toISOString()
      };
      const insRes = await supabase.from('case_suspects').insert([insertObj]).select();
      if (insRes.data && insRes.data.length > 0) {
        resultData = insRes.data;
      }
    }

    // Update state caseSuspects & selectedSuspect
    const mergedUpdates = {
      nomor_sp_tap: cleanNo,
      no_sp_tap_tsk: cleanNo,
      tanggal_sp_tap: cleanDate,
      tgl_sp_tap_tsk: cleanDate,
      status: 'tersangka',
      urutan_tersangka: targetUrutan,
      status_label: targetLabel,
      status_tersangka_label: targetLabel
    };

    setCaseSuspects(prev => prev.map(s => {
      const match = (isUuid && s.id === sId) || (s.nama && s.nama.toLowerCase() === targetName.toLowerCase());
      return match ? { ...s, ...mergedUpdates } : s;
    }));

    if (selectedSuspect) {
      Object.assign(selectedSuspect, mergedUpdates);
    }

    // Sinkronisasi ke tabel cases (references & terlapor_list)
    if (currentCase?.id) {
      const updatedRef = {
        ...(currentCase.references || {}),
        no_sp_tap_tsk: cleanNo,
        nomor_sp_tap: cleanNo,
        tgl_sp_tap_tsk: cleanDate,
        tanggal_sp_tap: cleanDate
      };
      currentCase.references = updatedRef;

      let updatedTerlaporList = null;
      if (Array.isArray(currentCase.terlapor_list)) {
        updatedTerlaporList = currentCase.terlapor_list.map(t => {
          const match = (isUuid && t.id === sId) || (t.nama && t.nama.toLowerCase() === targetName.toLowerCase());
          if (match) {
            return {
              ...t,
              ...mergedUpdates
            };
          }
          return t;
        });
        currentCase.terlapor_list = updatedTerlaporList;
      }

      try {
        const caseUpdates = { references: updatedRef };
        if (updatedTerlaporList) caseUpdates.terlapor_list = updatedTerlaporList;
        await supabase.from('cases').update(caseUpdates).eq('id', currentCase.id);
      } catch (cErr) {
        console.warn('Sync cases notice:', cErr);
      }
    }

    return resultData;
  };

  // BAGIAN 4.2: Penyimpanan Balik Nomor Otomatis & Rantai Rujukan Tanggal
  const saveReferenceNumbers = async (enteredNo, enteredDate) => {
    if (!currentCase) return;
    const tplCode = (currentTemplate?.code || '').toUpperCase();
    const docDate = enteredDate || formValues.TANGGAL_SURAT || formValues.DOC_DATE;

    // 1. Dokumen Induk Perkara (Universal Auto-Sync ke Supabase cases)
    if (isCurrentParentDoc && activeParentConfig) {
      const updateObj = {};
      if (enteredNo && activeParentConfig.targetNoCol) {
        currentCase[activeParentConfig.targetNoCol] = enteredNo;
        updateObj[activeParentConfig.targetNoCol] = enteredNo;
      }
      if (docDate && activeParentConfig.targetTglCol) {
        currentCase[activeParentConfig.targetTglCol] = docDate;
        updateObj[activeParentConfig.targetTglCol] = docDate;
        if (activeParentConfig.targetTglCol === 'tgl_sprin_sidik') {
          currentCase.sprin_date = docDate;
          updateObj.sprin_date = docDate;
        }
      }

      if (Object.keys(updateObj).length > 0) {
        try {
          await supabase.from('cases').update(updateObj).eq('id', currentCase.id);
        } catch (e) {
          console.warn(`Auto-save ${activeParentConfig.label} reference error:`, e);
        }
      }
    } else if (tplCode.includes('SPDP')) {
      const spdpDate = formValues.TGL_SPDP || formValues.TANGGAL_SURAT || formValues.DOC_DATE;
      if (enteredNo) currentCase.no_spdp = enteredNo;
      if (spdpDate) currentCase.tgl_spdp = spdpDate;
      try {
        const updateObj = {};
        if (enteredNo) updateObj.no_spdp = enteredNo;
        if (spdpDate) updateObj.tgl_spdp = spdpDate;
        await supabase.from('cases').update(updateObj).eq('id', currentCase.id);
      } catch (e) {
        console.warn('Auto-save no_spdp error:', e);
      }
    } else if (tplCode.includes('P21')) {
      if (enteredNo) currentCase.no_p21_kn = enteredNo;
      try {
        await supabase.from('cases').update({ no_p21_kn: enteredNo }).eq('id', currentCase.id);
      } catch (e) {
        console.warn('Auto-save no_p21_kn error:', e);
      }
    }

    // 2. Dokumen Tingkat Perorangan (Tersangka Terpilih)
    if (selectedSuspect?.id) {
      let targetColNo = null;
      let targetColDate = null;
      const isSpTapTskTpl = tplCode.includes('TAP_TSK') || tplCode.includes('PENETAPAN TERSANGKA') || (currentTemplate?.title || '').toUpperCase().includes('PENETAPAN TERSANGKA');

      if (isSpTapTskTpl) {
        await syncPenetapanTersangka({
          suspectId: selectedSuspect.id,
          nomorSpTap: enteredNo,
          tanggalSpTap: docDate,
          urutanTersangka,
          statusLabel: `Tersangka ${getRomanUrutan(urutanTersangka)}`
        });
        return;
      } else if (tplCode.includes('KAP')) {
        targetColNo = 'no_sprin_kap';
        targetColDate = 'tgl_sprin_kap';
      } else if (tplCode.includes('HAN') && !tplCode.includes('PANJANG') && !tplCode.includes('KN') && !tplCode.includes('PN')) {
        targetColNo = 'no_sprin_han';
        targetColDate = 'tgl_sprin_han';
      } else if (tplCode.includes('PANJANG_HAN_KN') || (tplCode.includes('PANJANG') && tplCode.includes('KN'))) {
        targetColNo = 'no_panjang_han_kn';
      } else if (tplCode.includes('SPRIN_HAN_KN')) {
        targetColNo = 'no_sprin_han_kn';
      } else if (tplCode.includes('TAP_HAN_PN_1')) {
        targetColNo = 'no_tap_han_pn_1';
      } else if (tplCode.includes('SPRIN_HAN_PN_1')) {
        targetColNo = 'no_sprin_han_pn_1';
      }

      const suspectUpdates = {};

      if (targetColNo && enteredNo) {
        selectedSuspect[targetColNo] = enteredNo;
        suspectUpdates[targetColNo] = enteredNo;
      }
      if (targetColDate && docDate) {
        selectedSuspect[targetColDate] = docDate;
        suspectUpdates[targetColDate] = docDate;
      }

      if (Object.keys(suspectUpdates).length > 0) {
        setCaseSuspects(prev => prev.map(s => s.id === selectedSuspect.id ? { ...s, ...suspectUpdates } : s));
        try {
          await supabase.from('case_suspects').update(suspectUpdates).eq('id', selectedSuspect.id);
        } catch (e) {
          console.warn(`Auto-save case_suspects error:`, e);
        }
      }
    }
  };

  // Main Generator action (Pizzip + Docxtemplater + Supabase Storage)
  const handleTriggerGenerate = async () => {
    if (!currentCase || !currentTemplate) return;
    if (!currentPrereq.allowed) {
      setGeneratorNotice({
        type: 'warning',
        message: `Tidak dapat men-generate dokumen: ${currentPrereq.reason}`
      });
      return;
    }

    setIsGenerating(true);
    setGeneratorNotice(null);

    const isTapTsk = (currentTemplate?.code || '').toUpperCase().includes('TAP_TSK') 
      || (currentTemplate?.title || '').toUpperCase().includes('PENETAPAN TERSANGKA');

    const docNumber = formValues.NOMOR_SURAT 
      || formValues.nomor_surat 
      || formValues.DOC_NO 
      || formValues.doc_no 
      || formValues.NO_SP_TAP_TSK 
      || formValues.no_sp_tap_tsk 
      || formValues.NOMOR_SP_TAP 
      || formValues.nomor_sp_tap 
      || selectedSuspect?.no_sp_tap_tsk 
      || selectedSuspect?.nomor_sp_tap 
      || '';

    const docDate = formValues.TANGGAL_SURAT 
      || formValues.tanggal_surat 
      || formValues.DOC_DATE 
      || formValues.doc_date 
      || formValues.TGL_SP_TAP_TSK 
      || formValues.tgl_sp_tap_tsk 
      || formValues.TANGGAL_SP_TAP 
      || formValues.tanggal_sp_tap 
      || formValues.TGL_SPRIN_SIDIK 
      || selectedSuspect?.tanggal_sp_tap 
      || selectedSuspect?.tgl_sp_tap_tsk 
      || '';

    const romanLabel = `Tersangka ${getRomanUrutan(urutanTersangka)}`;

    // Sinkronisasi otomatis nomor SP.Tap TSK ke database case_suspects & cases
    if (isTapTsk && selectedSuspect) {
      try {
        await syncPenetapanTersangka({
          suspectId: selectedSuspect.id,
          nomorSpTap: docNumber,
          tanggalSpTap: docDate,
          urutanTersangka,
          statusLabel: romanLabel
        });
      } catch (syncErr) {
        console.warn('Gagal sinkronisasi penetapan tersangka:', syncErr);
      }
    } else if (docNumber || docDate) {
      await saveReferenceNumbers(docNumber, docDate);
    }

    try {
      const formattedDocDate = formatTanggalIndonesia(docDate) || docDate;

      const enrichedFormValues = {
        ...formValues,
        URUTAN_TERSANGKA: urutanTersangka,
        urutan_tersangka: urutanTersangka,
        STATUS_LABEL: romanLabel,
        status_label: romanLabel,
        STATUS_TERSANGKA_LABEL: romanLabel,
        status_tersangka_label: romanLabel,
        NOMOR_SP_TAP_TSK: docNumber,
        nomor_sp_tap_tsk: docNumber,
        NO_SP_TAP_TSK: docNumber,
        no_sp_tap_tsk: docNumber,
        NOMOR_SP_TAP: docNumber,
        nomor_sp_tap: docNumber,
        TGL_SP_TAP_TSK: formattedDocDate,
        tgl_sp_tap_tsk: formattedDocDate,
        TANGGAL_SP_TAP: formattedDocDate,
        tanggal_sp_tap: formattedDocDate,
        NAMA_TERSANGKA: selectedSuspect?.nama || '',
        nama_tersangka: selectedSuspect?.nama || '',
      };

      const res = await generateAndDownloadDocx({
        template: currentTemplate,
        caseData: currentCase,
        activeCase: currentCase,
        activeSuspect: selectedSuspect ? {
          ...selectedSuspect,
          nama: selectedSuspect.nama,
          nama_tersangka: selectedSuspect.nama,
          urutan_tersangka: urutanTersangka,
          status_label: romanLabel,
          status_tersangka_label: romanLabel,
          no_sp_tap_tsk: docNumber || selectedSuspect.no_sp_tap_tsk,
          nomor_sp_tap: docNumber || selectedSuspect.nomor_sp_tap,
          tanggal_sp_tap: docDate || selectedSuspect.tanggal_sp_tap,
          tgl_sp_tap_tsk: docDate || selectedSuspect.tgl_sp_tap_tsk,
        } : null,
        suspectsList: caseSuspects,
        activeVictim: selectedVictim,
        victimsList: registeredVictims,
        formValues: enrichedFormValues,
        personnelList: activePersonnel
      });

      // Save record in archive
      handleSave();

      setGeneratorNotice({
        type: 'success',
        message: `File '${res.filename}' berhasil di-render dari Supabase Storage dan diunduh ke komputer Anda!`
      });
    } catch (err) {
      console.error('Generation error:', err);
      setGeneratorNotice({
        type: 'error',
        message: err.message || 'Terjadi kesalahan saat memproses file dari Supabase.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!currentCase || !currentTemplate) return;

    const isTapTsk = (currentTemplate?.code || '').toUpperCase().includes('TAP_TSK') 
      || (currentTemplate?.title || '').toUpperCase().includes('PENETAPAN TERSANGKA');

    const docNumber = formValues.NOMOR_SURAT 
      || formValues.nomor_surat 
      || formValues.DOC_NO 
      || formValues.doc_no 
      || formValues.NO_SP_TAP_TSK 
      || formValues.no_sp_tap_tsk 
      || formValues.NOMOR_SP_TAP 
      || formValues.nomor_sp_tap 
      || selectedSuspect?.no_sp_tap_tsk 
      || selectedSuspect?.nomor_sp_tap 
      || '';

    const docDate = formValues.TANGGAL_SURAT 
      || formValues.tanggal_surat 
      || formValues.DOC_DATE 
      || formValues.doc_date 
      || formValues.TGL_SP_TAP_TSK 
      || formValues.tgl_sp_tap_tsk 
      || formValues.TANGGAL_SP_TAP 
      || formValues.tanggal_sp_tap 
      || formValues.TGL_SPRIN_SIDIK 
      || selectedSuspect?.tanggal_sp_tap 
      || selectedSuspect?.tgl_sp_tap_tsk 
      || '';

    const romanLabel = `Tersangka ${getRomanUrutan(urutanTersangka)}`;

    if (isTapTsk && selectedSuspect) {
      try {
        await syncPenetapanTersangka({
          suspectId: selectedSuspect.id,
          nomorSpTap: docNumber,
          tanggalSpTap: docDate,
          urutanTersangka,
          statusLabel: romanLabel
        });
      } catch (syncErr) {
        console.warn('Sync penetapan on save notice:', syncErr);
      }
    } else if (docNumber || docDate) {
      await saveReferenceNumbers(docNumber, docDate);
    }

    const lpNumber = currentCase?.nomor_lp 
      || currentCase?.no_lp 
      || currentCase?.nomor_kasus 
      || formValues.NOMOR_LP 
      || formValues.nomor_lp 
      || '-';

    // Ekstraksi tanggal surat dari input form
    const inputDate = formValues.TANGGAL_SURAT 
      || formValues.tanggal_surat 
      || formValues.TGL_SURAT 
      || formValues.tgl_surat 
      || formValues.DOC_DATE 
      || formValues.doc_date 
      || formValues.TANGGAL_DOKUMEN 
      || formValues.tanggal_dokumen 
      || formValues.TGL_DIKELUARKAN
      || formValues.tanggal_dikeluarkan
      || docDate;

    // Format tanggal ISO yang valid untuk database
    let finalDocDate = new Date().toISOString();
    if (inputDate) {
      try {
        const parsed = new Date(inputDate);
        if (!isNaN(parsed.getTime())) {
          finalDocDate = parsed.toISOString();
        } else {
          // Jika format teks string tanggal biasa, simpan apa adanya
          finalDocDate = inputDate;
        }
      } catch (e) {
        finalDocDate = inputDate;
      }
    }

    const newDoc = {
      id: crypto.randomUUID(),
      case_id: currentCase?.id ? String(currentCase.id) : null,
      nomor_lp: lpNumber,
      no_lp: lpNumber,
      doc_title: currentTemplate?.title || 'Dokumen Mindik',
      title: currentTemplate?.title || 'Dokumen Mindik',
      nama_dokumen: currentTemplate?.title || 'Dokumen Mindik',
      doc_number: docNumber || '-',
      nomor_surat: docNumber || '-',
      template_code: currentTemplate?.code || 'MINDIK',
      meta_values: { ...formValues },
      metadata: { ...formValues },
      created_at: finalDocDate,
      tgl_surat: inputDate || finalDocDate,
      tanggal_surat: inputDate || finalDocDate
    };

    if (onSaveDocument) {
      onSaveDocument(newDoc);
    }
    setCaseDocuments(prev => [newDoc, ...prev]);
    setIsSaved(true);

    try {
      const { error: errGen } = await supabase.from('case_generated_documents').insert([newDoc]);
      if (errGen) console.warn('[Supabase] Gagal simpan ke case_generated_documents:', errGen.message);

      const { error: errArsip } = await supabase.from('arsip_dokumen').insert([newDoc]);
      if (errArsip) console.warn('[Supabase] Gagal simpan ke arsip_dokumen:', errArsip.message);

      const { error: errDoc } = await supabase.from('documents').insert([newDoc]);
      if (errDoc) console.warn('[Supabase] Gagal simpan ke documents:', errDoc.message);
    } catch (saveErr) {
      console.error('[Supabase Save Error]:', saveErr);
    }
  };

  // --- TEMPLATE MANAGEMENT ACTIONS (KHUSUS SUPER ADMIN) ---

  // 1. Tambah Format Template Baru
  const handleAddTemplate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCode.trim()) {
      alert('Judul dan Kode Template wajib diisi!');
      return;
    }
    if (!newDocxFile) {
      alert('Silakan pilih file fisik .docx untuk template ini!');
      return;
    }

    setIsProcessingTemplate(true);
    try {
      const templateCode = (newCode || 'TEMPLATE').trim().replace(/[^a-zA-Z0-9_-]/g, '_').toUpperCase();
      const cleanFileName = `${templateCode}_${Date.now()}.docx`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('templates')
        .upload(cleanFileName, newDocxFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: newDocxFile.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

      if (uploadError) {
        console.error('Detail Error Upload Supabase:', uploadError);
        throw new Error(uploadError.message || 'Gagal mengunggah file ke Storage');
      }

      const { data: publicUrlData } = supabase.storage
        .from('templates')
        .getPublicUrl(cleanFileName);

      const fileUrl = publicUrlData?.publicUrl;
      const finalFilePath = uploadData?.path || cleanFileName;

      // Default dynamic fields (Standard Indonesian)
      const defaultFields = [
        { id: 1, field_key: 'NOMOR_SURAT', field_label: 'Nomor Surat', field_type: 'text', default_value: '', is_required: true },
        { id: 2, field_key: 'TANGGAL_SURAT', field_label: 'Tanggal Surat', field_type: 'date', default_value: '', is_required: true },
        { id: 3, field_key: 'TEMPAT_SURAT', field_label: 'Tempat Surat', field_type: 'text', default_value: 'Tirawuta', is_required: false },
        { id: 4, field_key: 'TUJUAN_SURAT', field_label: 'Tujuan Surat', field_type: 'text', default_value: 'Kepala Kejaksaan Negeri Kolaka', is_required: false },
        { id: 5, field_key: 'ALAMAT_TUJUAN', field_label: 'Alamat Tujuan', field_type: 'text', default_value: 'Jl. Dr. Sutomo No. 5, Kolaka', is_required: false },
        { id: 6, field_key: 'MASA_BERLAKU', field_label: 'Masa Berlaku', field_type: 'text', default_value: '30 (tiga puluh) hari', is_required: false }
      ];

      // Save metadata to document_templates with UPSERT to prevent unique constraint conflicts
      const payload = {
        title: newTitle.trim(),
        code: newCode.trim().toUpperCase(),
        category: newCategory,
        description: newDescription.trim(),
        file_path: finalFilePath,
        file_url: fileUrl || '',
        dynamic_fields: defaultFields,
        created_at: new Date().toISOString()
      };

      let { data: dbData, error: dbErr } = await supabase
        .from('document_templates')
        .upsert([payload], { onConflict: 'code' })
        .select();

      if (dbErr && dbErr.message && dbErr.message.includes('file_url')) {
        console.warn('Kolom file_url belum ada di Supabase, menyimpan tanpa file_url...');
        delete payload.file_url;
        const resRetry = await supabase
          .from('document_templates')
          .upsert([payload], { onConflict: 'code' })
          .select();
        dbData = resRetry.data;
        dbErr = resRetry.error;
      }

      if (dbErr) throw dbErr;

      setGeneratorNotice({
        type: 'success',
        message: `Format template '${newTitle}' berhasil ditambahkan ke Supabase!`
      });

      // Reset form
      setNewTitle('');
      setNewCode('');
      setNewDescription('');
      setNewDocxFile(null);
      setIsAddModalOpen(false);

      // Refresh list & select newly created template
      await fetchTemplates();
      setSelectedTemplateCode(payload.code);
    } catch (err) {
      console.error('Add template error:', err);
      let errorMsg = err?.message || 'Terjadi kesalahan saat menyimpan ke Supabase.';
      if (errorMsg === 'Failed to fetch' || err?.name === 'TypeError') {
        errorMsg = 'Koneksi ke Supabase Storage gagal (Failed to fetch). Pastikan jaringan internet stabil, bucket "templates" sudah dibuat di Supabase Storage dan memiliki izin upload.';
      }
      alert(`Gagal menambah template format: ${errorMsg}`);
    } finally {
      setIsProcessingTemplate(false);
    }
  };

  // 2. Edit/Perubahan Format Template
  const handleOpenEdit = (t, e) => {
    e.stopPropagation();
    setTemplateToEdit(t);
    setEditTitle(t.title);
    setEditCategory(t.category || 'SURAT PERINTAH');
    setEditDescription(t.description || '');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!templateToEdit || !editTitle.trim()) return;

    setIsProcessingTemplate(true);
    try {
      if (templateToEdit.id) {
        const { error } = await supabase
          .from('document_templates')
          .update({
            title: editTitle.trim(),
            category: editCategory,
            description: editDescription.trim(),
          })
          .eq('id', templateToEdit.id);

        if (error) throw error;
      }

      // Update in local state
      setAllTemplates(prev => prev.map(t => {
        if (t.code === templateToEdit.code) {
          return {
            ...t,
            title: editTitle.trim(),
            category: editCategory,
            description: editDescription.trim()
          };
        }
        return t;
      }));

      setGeneratorNotice({
        type: 'success',
        message: `Format template '${editTitle}' berhasil diperbarui!`
      });

      setTemplateToEdit(null);
      await fetchTemplates();
    } catch (err) {
      console.error('Edit template error:', err);
      alert(`Gagal memperbarui template: ${err.message}`);
    } finally {
      setIsProcessingTemplate(false);
    }
  };

  // 3. Hapus Format Template
  const handleOpenDelete = (t, e) => {
    e.stopPropagation();
    setTemplateToDelete(t);
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;

    setIsProcessingTemplate(true);
    try {
      await deleteTemplateFromSupabase(templateToDelete);

      setAllTemplates(prev => prev.filter(t => t.code !== templateToDelete.code && t.id !== templateToDelete.id));

      setGeneratorNotice({
        type: 'success',
        message: `Format template '${templateToDelete.title}' berhasil dihapus secara permanen!`
      });

      // If the deleted template was selected, fallback to first available
      if (selectedTemplateCode === templateToDelete.code) {
        const remaining = allTemplates.filter(t => t.code !== templateToDelete.code && t.id !== templateToDelete.id);
        if (remaining.length > 0) {
          setSelectedTemplateCode(remaining[0].code);
        }
      }

      setTemplateToDelete(null);
      await fetchTemplates();
    } catch (err) {
      console.error('Delete template error:', err);
      alert(`Gagal menghapus format template: ${err.message}`);
    } finally {
      setIsProcessingTemplate(false);
    }
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSignature size={22} color="#ff352d" />
            <span>Studio Generator Administrasi Penyidikan (E-Mindik)</span>
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Render dokumen otomatis dari master fisik Microsoft Word (.docx) di Supabase Storage dengan injeksi data perkara presisi.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={fetchTemplates}
            className="btn btn-secondary btn-sm"
            title="Muat ulang template dari Supabase"
          >
            <RefreshCw size={13} />
            <span>Refresh Template</span>
          </button>
        </div>
      </div>

      {/* Generator Notice */}
      {generatorNotice && (
        <div style={{
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          background: generatorNotice.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${generatorNotice.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#FFFFFF',
          fontSize: '13px',
          animation: 'slideInRight 200ms ease-out',
        }}>
          {generatorNotice.type === 'success' ? (
            <CheckCircle2 size={18} color="var(--accent-green)" />
          ) : (
            <AlertCircle size={18} color="var(--accent-red)" />
          )}
          <span>{generatorNotice.message}</span>
        </div>
      )}

      {/* Split Screen Studio: Form Editor (Left) & Live Preview (Right) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(350px, 440px) 1fr',
        gap: '24px',
        alignItems: 'start',
      }}>
        {/* Left: Configuration Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Step 1: Select Case */}
          <div className="glass" style={{ padding: '16px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ffffff' }}>
              <span className="badge" style={{ background: '#2a343f', border: '1px solid rgba(255, 53, 45, 0.4)', color: '#ffffff', fontSize: '10px', padding: '1px 5px' }}>1</span>
              <span style={{ color: '#ffffff', fontWeight: 700 }}>PILIH BERKAS PERKARA (LP)</span>
            </label>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="form-select"
              style={{ marginTop: '8px' }}
            >
              {(cases || []).map((c) => (
                <option key={c?.id} value={c?.id}>
                  {c?.no_lp || '-'} — {c?.tindak_pidana || '-'} ({c?.person?.nama || c?.terlapor_name || '-'})
                </option>
              ))}
            </select>

            {currentCase && (
              <div style={{
                marginTop: '12px',
                padding: '10px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}>
                <div><strong>Pasal:</strong> {currentCase?.pasal_uu || '-'}</div>
                <div><strong>Pelapor:</strong> {currentCase?.nama_pelapor || currentCase?.pelapor_name || '-'}</div>
                <div><strong>Terlapor:</strong> {currentCase?.person?.nama || currentCase?.terlapor_name || '-'}</div>
                <div><strong>Locus:</strong> {currentCase?.locus || '-'}</div>
              </div>
            )}
          </div>

          {/* Step 2: Select Template & Format Management (Khusus Super Admin) */}
          <div className="glass" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0, color: '#ffffff' }}>
                <span className="badge" style={{ background: '#2a343f', border: '1px solid rgba(255, 53, 45, 0.4)', color: '#ffffff', fontSize: '10px', padding: '1px 5px' }}>2</span>
                <span style={{ color: '#ffffff', fontWeight: 700 }}>PILIH FORMAT DOKUMEN MINDIK</span>
              </label>

              {/* KHUSUS SUPER ADMIN: Tombol Tambah, Edit & Hapus Format */}
              {isSuperAdmin && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {currentTemplate && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => handleOpenEdit(currentTemplate, e)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 6px', fontSize: '11px' }}
                        title="Edit judul, kategori, atau deskripsi format template"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleOpenDelete(currentTemplate, e)}
                        className="btn btn-danger btn-sm"
                        style={{ padding: '4px 6px', fontSize: '11px' }}
                        title="Hapus format template ini dari Supabase"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '11px', padding: '4px 8px', gap: '4px' }}
                    title="Tambah format template baru ke Supabase Storage (Khusus Super Admin)"
                  >
                    <Plus size={13} />
                    <span>Tambah Format</span>
                  </button>
                </div>
              )}
            </div>

            {/* BADGE PENANDA FASE / TAHAPAN MINDIK AKTIF DENGAN TOMBOL UBAH */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              backgroundColor: tahapMindik === 'SIDIK' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
              border: tahapMindik === 'SIDIK' ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '8px',
              marginBottom: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {tahapMindik === 'SIDIK' ? (
                  <Shield size={16} color="var(--accent-red)" />
                ) : (
                  <Clock size={16} color="var(--accent-amber)" />
                )}
                <div>
                  <div style={{
                    fontSize: '11.5px',
                    fontWeight: 800,
                    letterSpacing: '0.4px',
                    color: tahapMindik === 'SIDIK' ? '#FCA5A5' : '#FDE68A'
                  }}>
                    {tahapMindik === 'SIDIK' ? '[ TAHAP PENYIDIKAN (SIDIK) ]' : '[ TAHAP PENYELIDIKAN (LIDIK) ]'}
                  </div>
                  <div style={{ fontSize: '9.5px', color: '#94A3B8' }}>
                    {tahapMindik === 'SIDIK' ? 'Fase Pro-Justitia (Penegakan Urutan Klaster A s.d. G)' : 'Fase Klarifikasi & Pengumpulan Bukti Awal'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowTahapModal(true)}
                className="btn btn-secondary btn-sm"
                style={{
                  fontSize: '10.5px',
                  padding: '4px 8px',
                  gap: '4px',
                  borderColor: tahapMindik === 'SIDIK' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'
                }}
                title="Ganti Tahapan Mindik (Penyelidikan vs Penyidikan)"
              >
                <Layers size={12} />
                <span>Ubah Tahapan</span>
              </button>
            </div>

            {/* CARD PEMILIH DOKUMEN RINGKAS (PENGGANTI DROPDOWN PANJANG) */}
            <div style={{
              marginTop: '8px',
              marginBottom: '16px',
              padding: '14px 16px',
              backgroundColor: '#111827',
              border: currentTemplate ? '1px solid rgba(255, 53, 45, 0.35)' : '1px dashed rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
            }}>
              {currentTemplate ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.6px',
                        color: 'var(--accent-red)',
                        fontWeight: 800
                      }}>
                        {tahapMindik === 'SIDIK' ? (
                          (() => {
                            const cId = getSidikCluster(currentTemplate);
                            const cl = SIDIK_CLUSTERS.find(c => c.id === cId);
                            return cl ? `${cl.name} — ${cl.fullName}` : 'FORMAT MINDIK SIDIK';
                          })()
                        ) : 'DOKUMEN TAHAP PENYELIDIKAN (LIDIK)'}
                      </span>
                      <h4 style={{
                        fontSize: '14px',
                        fontWeight: 800,
                        color: '#FFFFFF',
                        margin: 0,
                        textTransform: 'uppercase',
                        lineHeight: 1.4,
                        letterSpacing: '0.3px'
                      }}>
                        {(currentTemplate.title || currentTemplate.name || currentTemplate.code || '').toUpperCase()}
                      </h4>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                      <span className="badge badge-green" style={{ fontSize: '9px', padding: '3px 7px', fontWeight: 700 }}>
                        TERSEDIA DI STUDIO
                      </span>
                      {currentPrereq.allowed ? (
                        <span style={{ fontSize: '10px', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Check size={11} />
                          <span>Terbuka</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: '10px', color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Lock size={11} />
                          <span>Terkunci</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '10px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    marginTop: '2px',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="mono" style={{ fontSize: '11px', color: '#94A3B8' }}>
                        Kode: <strong style={{ color: '#E2E8F0' }}>{currentTemplate.code}</strong>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const cId = getSidikCluster(currentTemplate);
                        setSelectedClusterTab(cId || 'A');
                        setIsDocModalOpen(true);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{
                        fontSize: '11px',
                        padding: '6px 14px',
                        fontWeight: 700,
                        borderColor: 'rgba(255, 53, 45, 0.5)',
                        color: '#ffffff',
                        background: 'rgba(255, 53, 45, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <FileText size={13} color="var(--accent-red)" />
                      <span>GANTI DOKUMEN MINDIK</span>
                    </button>
                  </div>

                  {/* BANNER PERINGATAN KETIKA FORMAT TERPILIH BELUM MEMENUHI PRASYARAT */}
                  {!currentPrereq.allowed && (
                    <div style={{
                      marginTop: '6px',
                      padding: '10px 12px',
                      backgroundColor: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      color: '#FCA5A5',
                      fontSize: '11.5px',
                      lineHeight: '1.45'
                    }}>
                      <AlertTriangle size={16} color="var(--accent-red)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <strong style={{ color: '#EF4444', display: 'block', marginBottom: '2px' }}>
                          PRASYARAT FORMIL BELUM TERPENUHI:
                        </strong>
                        <span>{currentPrereq.reason}</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{
                  padding: '20px 12px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={28} color="#94A3B8" />
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#E2E8F0' }}>
                    BELUM ADA DOKUMEN MINDIK DIPILIH
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#94A3B8', maxWidth: '320px', lineHeight: 1.4 }}>
                    Silakan pilih format dokumen Mindik yang tersedia di Template Studio dan terbuka untuk perkara ini.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClusterTab('A');
                      setIsDocModalOpen(true);
                    }}
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: '6px', fontSize: '11px', padding: '6px 16px', fontWeight: 700 }}
                  >
                    <Plus size={13} />
                    <span>PILIH DOKUMEN MINDIK</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Dynamic Variables Form */}
          <div className="glass" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0, color: '#ffffff' }}>
                <span className="badge" style={{ background: '#2a343f', border: '1px solid rgba(255, 53, 45, 0.4)', color: '#ffffff', fontSize: '10px', padding: '1px 5px' }}>3</span>
                <span style={{ color: '#ffffff', fontWeight: 700 }}>PARAMETER & VARIABEL DOKUMEN</span>
              </label>
              {currentTemplate ? (
                isIndividualDoc ? (
                  <span className="badge badge-red" style={{ fontSize: '9px' }}>DOKUMEN PERORANGAN</span>
                ) : (
                  <span className="badge" style={{ background: '#2d3748', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#ffffff', fontSize: '9px' }}>DOKUMEN KOLEKTIF</span>
                )
              ) : null}
            </div>

            {!currentTemplate ? (
              <div style={{
                padding: '36px 20px',
                textAlign: 'center',
                background: 'rgba(15, 23, 42, 0.4)',
                borderRadius: '8px',
                border: '1px dashed rgba(255, 255, 255, 0.15)',
                color: '#94A3B8',
                fontSize: '12px'
              }}>
                <FileSignature size={28} color="#64748B" style={{ marginBottom: '8px', display: 'inline-block' }} />
                <p style={{ margin: 0, fontWeight: 600 }}>Silakan pilih format dokumen Mindik terlebih dahulu untuk mengisi parameter & variabel dokumen.</p>
              </div>
            ) : (
              <>
                {/* PANEL KHUSUS SP.TAP TSK: PENETAPAN TERSANGKA RESMI */}
            {isSpTapDoc && (
              <div style={{
                padding: '14px',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(239, 68, 68, 0.08) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={16} color="var(--accent-amber)" />
                    <span style={{ color: 'var(--accent-amber)', fontWeight: 800, fontSize: '12px', letterSpacing: '0.4px' }}>
                      PENETAPAN TERSANGKA (SP.TAP TSK)
                    </span>
                  </div>
                  <span className="badge badge-amber" style={{ fontSize: '9.5px', padding: '2px 8px' }}>
                    ALUR FORMIL PENYIDIKAN
                  </span>
                </div>

                {/* Dropdown: Pilih Terlapor yang Ditetapkan */}
                <div style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '11px', color: '#fff', marginBottom: '4px', fontWeight: 600 }}>
                    Pilih Terlapor yang Ditetapkan (dataPerkara.terlapor_list) <span style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  {caseSuspects.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#FCA5A5', padding: '6px 0' }}>
                      Belum ada terlapor terdaftar pada perkara ini. Tambahkan data Terlapor di Detail Perkara.
                    </div>
                  ) : (
                    <select
                      value={selectedSuspectId}
                      onChange={(e) => handleSuspectChange(e.target.value)}
                      className="form-select"
                      style={{ borderColor: 'var(--accent-amber)', fontWeight: 600 }}
                    >
                      {(caseSuspects || []).map((s, idx) => {
                        const isEst = s.status === 'tersangka' || s.no_sp_tap_tsk;
                        return (
                          <option key={s.id || idx} value={s.id}>
                            {idx + 1}. {s.nama} (NIK: {s.nik || '-'}) — {isEst ? `[Sudah Ditetapkan Tersangka - No: ${s.no_sp_tap_tsk || s.nomor_sp_tap || '-'}]` : '[Status: Terlapor (Belum Ditetapkan)]'}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>

                {/* Selector Urutan Administrasi Tersangka */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '11px', color: '#fff', marginBottom: '4px', fontWeight: 600 }}>
                      Urutan Administrasi Tersangka <span style={{ color: 'var(--accent-red)' }}>*</span>
                    </label>
                    <select
                      value={urutanTersangka}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 1;
                        setUrutanTersangka(val);
                        const roman = getRomanUrutan(val);
                        const lbl = `Tersangka ${roman}`;
                        setFormValues(prev => ({
                          ...prev,
                          URUTAN_TERSANGKA: val,
                          urutan_tersangka: val,
                          STATUS_TERSANGKA_LABEL: lbl,
                          status_tersangka_label: lbl
                        }));
                      }}
                      className="form-select"
                      style={{ borderColor: 'rgba(245, 158, 11, 0.5)', fontWeight: 600 }}
                    >
                      <option value="1">Tersangka I (Pertama)</option>
                      <option value="2">Tersangka II (Kedua)</option>
                      <option value="3">Tersangka III (Ketiga)</option>
                      <option value="4">Tersangka IV (Keempat)</option>
                      <option value="5">Tersangka V (Kelima)</option>
                      <option value="6">Tersangka VI (Keenam)</option>
                      <option value="7">Tersangka VII (Ketujuh)</option>
                      <option value="8">Tersangka VIII (Kedelapan)</option>
                    </select>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                      Mengisi tag <code>{'{status_tersangka_label}'}</code> & <code>{'{urutan_tersangka}'}</code>
                    </span>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '11px', color: '#fff', marginBottom: '4px', fontWeight: 600 }}>
                      Status Formil Terkini
                    </label>
                    <div style={{
                      padding: '8px 10px',
                      background: 'rgba(0, 0, 0, 0.25)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      fontSize: '11.5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      minHeight: '38px'
                    }}>
                      {selectedSuspect?.status === 'tersangka' || selectedSuspect?.no_sp_tap_tsk ? (
                        <span style={{ color: 'var(--accent-red)', fontWeight: 700 }}>
                          ● {selectedSuspect.status_tersangka_label || `Tersangka ${getRomanUrutan(urutanTersangka)}`} (Ditetapkan)
                        </span>
                      ) : (
                        <span style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>
                          ● Terlapor (Siap Ditetapkan)
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                      Label Dokumen: <strong style={{ color: '#fff' }}>Tersangka {getRomanUrutan(urutanTersangka)}</strong>
                    </span>
                  </div>
                </div>

                {/* Profil Terlapor Terpilih */}
                {selectedSuspect && (
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    background: 'rgba(0, 0, 0, 0.25)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    borderLeft: '3px solid var(--accent-amber)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                      <span>Nama: <strong style={{ color: '#fff' }}>{selectedSuspect.nama}</strong></span>
                      <span>NIK: <strong style={{ color: '#fff' }}>{selectedSuspect.nik || '-'}</strong></span>
                      <span>JK: <strong style={{ color: '#fff' }}>{selectedSuspect.jenis_kelamin || 'Laki-laki'}</strong></span>
                    </div>
                    <div>TTL / Umur: <strong style={{ color: '#fff' }}>{selectedSuspect.tempat_lahir || '-'}, {selectedSuspect.tgl_lahir || '-'} ({selectedSuspect.umur ? `${selectedSuspect.umur} Thn` : '-'})</strong></div>
                    <div>Pekerjaan: <strong style={{ color: '#fff' }}>{selectedSuspect.pekerjaan || '-'}</strong> | Agama: <strong style={{ color: '#fff' }}>{selectedSuspect.agama || '-'}</strong></div>
                    <div>Alamat: <strong style={{ color: '#fff' }}>{selectedSuspect.alamat || '-'}</strong></div>
                    {selectedSuspect.no_sp_tap_tsk && (
                      <div style={{ color: 'var(--accent-amber)', marginTop: '2px', fontWeight: 600 }}>
                        Nomor SP.Tap saat ini: {selectedSuspect.no_sp_tap_tsk} ({selectedSuspect.tgl_sp_tap_tsk || selectedSuspect.tanggal_sp_tap || '-'})
                      </div>
                    )}
                  </div>
                )}

                {/* Input Langsung Format Baku Nomor SP.Tap TSK & Tanggal Penetapan (Two-Way Binding) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginTop: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px', color: '#fff', marginBottom: '4px', fontWeight: 600 }}>
                      NOMOR SP.TAP TSK <span style={{ color: 'var(--accent-red)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.NOMOR_SURAT !== undefined ? formValues.NOMOR_SURAT : (formValues.nomor_surat || formValues.no_sp_tap_tsk || formValues.nomor_sp_tap || '')}
                      onChange={(e) => handleNomorSpTapChange(e.target.value)}
                      className="form-input mono"
                      placeholder="S.Tap.Tsk/..../I/RES.0.0/2026/Satreskrim/Polres Koltim/Polda Sultra"
                      style={{
                        backgroundColor: '#0f172a',
                        borderColor: 'var(--accent-amber)',
                        color: '#f8fafc',
                        fontWeight: 600,
                        fontSize: '12px'
                      }}
                      required
                    />
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                      Format baku penomoran surat (terikat dua arah ke preview judul & database multi-tersangka)
                    </span>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px', color: '#fff', marginBottom: '4px', fontWeight: 600 }}>
                      TANGGAL PENETAPAN TERSANGKA <span style={{ color: 'var(--accent-red)' }}>*</span>
                    </label>
                    <input
                      type={(/^\d{4}-\d{2}-\d{2}$/.test(formValues.TANGGAL_SURAT || formValues.tanggal_surat) || !(formValues.TANGGAL_SURAT || formValues.tanggal_surat)) ? "date" : "text"}
                      value={formValues.TANGGAL_SURAT !== undefined ? formValues.TANGGAL_SURAT : (formValues.tanggal_surat || formValues.tanggal_sp_tap || formValues.DOC_DATE || '')}
                      onChange={(e) => handleTanggalSpTapChange(e.target.value)}
                      className="form-input mono"
                      style={{
                        backgroundColor: '#0f172a',
                        borderColor: 'rgba(245, 158, 11, 0.5)',
                        color: '#f8fafc'
                      }}
                      required
                    />
                  </div>
                </div>

                <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
                  ℹ️ <em>Saat tombol <strong>Render & Download Naskah</strong> atau <strong>Simpan Pembaruan Rujukan</strong> ditekan, Terlapor ini otomatis berstatus <strong>Tersangka</strong> dengan nomor SP.Tap yang ter-mirroring ke seluruh dokumen turunan.</em>
                </div>

                <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!selectedSuspect) {
                        alert('Pilih terlapor terlebih dahulu');
                        return;
                      }
                      const docNo = (formValues.NOMOR_SURAT || formValues.nomor_surat || formValues.DOC_NO || formValues.NO_SP_TAP_TSK || formValues.no_sp_tap_tsk || selectedSuspect?.no_sp_tap_tsk || '').trim();
                      const docDt = formValues.TANGGAL_SURAT || formValues.tanggal_surat || formValues.DOC_DATE || formValues.TGL_SP_TAP_TSK || formValues.tgl_sp_tap_tsk || selectedSuspect?.tanggal_sp_tap || '';
                      const roman = `Tersangka ${getRomanUrutan(urutanTersangka)}`;
                      await syncPenetapanTersangka({
                        suspectId: selectedSuspect?.id,
                        nomorSpTap: docNo,
                        tanggalSpTap: docDt,
                        urutanTersangka,
                        statusLabel: roman
                      });
                      setGeneratorNotice({
                        type: 'success',
                        message: `Berhasil! Nomor SP.Tap TSK '${docNo || '-'}' untuk ${selectedSuspect?.nama} (${roman}) berhasil disinkronkan ke database.`
                      });
                    }}
                    className="btn btn-secondary btn-xs"
                    style={{
                      borderColor: 'var(--accent-amber)',
                      color: 'var(--accent-amber)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '11px',
                      padding: '5px 10px'
                    }}
                  >
                    <CheckCircle2 size={13} />
                    <span>Simpan Pembaruan Rujukan</span>
                  </button>
                </div>
              </div>
            )}

            {/* Selector Tersangka untuk Dokumen Turunan Perorangan (Surat Panggilan, SPDP, Penahanan, dll) */}
            {isIndividualDoc && !isSpTapDoc && (
              <div style={{
                padding: '12px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0, color: 'var(--accent-red)', fontWeight: 700, fontSize: '11.5px' }}>
                    PILIH TERSANGKA (WAJIB) <span style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    1 Surat untuk 1 Tersangka
                  </span>
                </div>

                {/* Banner Peringatan jika belum ada tersangka yang ditetapkan */}
                {!caseSuspects.some(s => s.status === 'tersangka' || s.no_sp_tap_tsk || s.nomor_sp_tap) && (
                  <div style={{
                    padding: '8px 10px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '8px',
                    fontSize: '11px',
                    color: '#FDE68A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}>
                    <span>⚠️ Perhatian: Belum ada Tersangka yang ditetapkan dengan SP.Tap TSK pada perkara ini. Disarankan menerbitkan SP.Tap TSK terlebih dahulu.</span>
                    <button
                      type="button"
                      onClick={() => setSelectedTemplateCode('SP_TAP_TSK')}
                      className="btn btn-sm"
                      style={{ background: 'var(--accent-amber)', color: '#000', fontWeight: 700, whiteSpace: 'nowrap', fontSize: '10px', padding: '3px 8px' }}
                    >
                      Buat SP.Tap TSK
                    </button>
                  </div>
                )}

                {caseSuspects.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#FCA5A5', padding: '6px 0' }}>
                    Belum ada subjek tersangka terdaftar pada perkara ini.
                  </div>
                ) : (
                  <select
                    value={selectedSuspectId}
                    onChange={(e) => handleSuspectChange(e.target.value)}
                    className="form-select"
                    style={{ borderColor: 'var(--accent-red)', fontWeight: 600 }}
                  >
                    {(caseSuspects || []).map((s) => {
                      const isEst = s.status === 'tersangka' || s.no_sp_tap_tsk;
                      return (
                        <option key={s.id} value={s.id}>
                          {s.nama} ({s.status_tersangka_label || (isEst ? 'Tersangka' : 'Terlapor')} {s.no_sp_tap_tsk ? `• SP.Tap: ${s.no_sp_tap_tsk}` : '• Belum ada SP.Tap'})
                        </option>
                      );
                    })}
                  </select>
                )}

                {selectedSuspect && (
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    marginTop: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    borderTop: '1px dashed rgba(239, 68, 68, 0.2)',
                    paddingTop: '6px'
                  }}>
                    <div>Nama: <strong style={{ color: '#FFF' }}>{selectedSuspect.nama}</strong> | NIK: <strong style={{ color: '#FFF' }}>{selectedSuspect.nik || '-'}</strong> | Status: <strong style={{ color: selectedSuspect.no_sp_tap_tsk ? 'var(--accent-red)' : 'var(--accent-amber)' }}>{selectedSuspect.status_tersangka_label || (selectedSuspect.no_sp_tap_tsk ? 'Tersangka' : 'Terlapor')}</strong></div>
                    <div>TTL: <strong style={{ color: '#FFF' }}>{selectedSuspect.tempat_lahir || '-'}, {selectedSuspect.tgl_lahir || '-'}</strong></div>
                    {selectedSuspect.no_sp_tap_tsk ? (
                      <div style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>
                        Rujukan SP.TAP.TSK: <strong>{selectedSuspect.no_sp_tap_tsk}</strong> (Otomatis mengisi tag)
                      </div>
                    ) : (
                      <div style={{ color: 'var(--accent-amber)', fontSize: '10.5px' }}>
                        ⚠️ Belum memiliki rujukan SP.Tap TSK resmi.
                      </div>
                    )}
                    {selectedSuspect.no_sprin_kap && (
                      <div style={{ color: 'var(--accent-amber)' }}>
                        Rujukan SP.KAP: <strong>{selectedSuspect.no_sprin_kap}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Selector Korban / Saksi Korban */}
            {isVictimDoc && (
              <div style={{
                padding: '12px',
                background: 'rgba(168, 85, 247, 0.08)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0, color: '#C084FC', fontWeight: 700, fontSize: '11.5px' }}>
                    SUBJEK KORBAN / SAKSI KORBAN
                  </label>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    {registeredVictims.length > 0 ? `${registeredVictims.length} Korban Terdaftar` : 'Default: Pelapor'}
                  </span>
                </div>

                {registeredVictims.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '4px 0' }}>
                    Belum ada korban spesifik; otomatis merujuk ke data Pelapor (<strong>{currentCase?.nama_pelapor || currentCase?.pelapor_name || '-'}</strong>). Tambahkan rincian 10 data identitas korban di menu Berkas Perkara jika diperlukan.
                  </div>
                ) : (
                  <select
                    value={selectedVictimId}
                    onChange={(e) => handleVictimChange(e.target.value)}
                    className="form-select"
                    style={{ borderColor: '#C084FC', fontWeight: 600 }}
                  >
                    {(registeredVictims || []).map((v, vIdx) => (
                      <option key={v.id || vIdx} value={v.id || v.nama || `vic-${vIdx}`}>
                        {vIdx + 1}. {v.nama || 'Tanpa Nama'} {v.nik ? `(NIK: ${v.nik})` : ''} - {v.jenis_kelamin || 'Laki-laki'} {vIdx === 0 ? '(Utama)' : ''}
                      </option>
                    ))}
                  </select>
                )}

                {selectedVictim && (
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    marginTop: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    borderTop: '1px dashed rgba(168, 85, 247, 0.25)',
                    paddingTop: '6px'
                  }}>
                    <div>Nama: <strong style={{ color: '#FFF' }}>{selectedVictim.nama}</strong> | NIK: <strong style={{ color: '#FFF' }}>{selectedVictim.nik || '-'}</strong> | JK: <strong style={{ color: '#FFF' }}>{selectedVictim.jenis_kelamin || 'Laki-laki'}</strong></div>
                    <div>TTL/Umur: <strong style={{ color: '#FFF' }}>{selectedVictim.ttl || '-'} ({selectedVictim.umur ? `${selectedVictim.umur} Thn` : '-'})</strong></div>
                    {selectedVictim.pekerjaan && <div>Pekerjaan: <strong style={{ color: '#FFF' }}>{selectedVictim.pekerjaan}</strong> | Agama: <strong style={{ color: '#FFF' }}>{selectedVictim.agama || '-'}</strong></div>}
                  </div>
                )}
              </div>
            )}

            {/* Info Dokumen Kolektif */}
            {!isIndividualDoc && caseSuspects.length > 0 && (
              <div style={{
                padding: '10px 12px',
                background: 'rgba(0, 212, 255, 0.05)',
                border: '1px solid rgba(0, 212, 255, 0.2)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '14px',
                fontSize: '11px',
                color: 'var(--text-secondary)'
              }}>
                <div style={{ color: '#ffffff', fontWeight: 600, marginBottom: '2px' }}>
                  Multi-Tersangka Terhubung ({caseSuspects.length} orang):
                </div>
                <div>
                  Format Word dapat merender loop tabel otomatis dengan <code className="mono">{'{#tersangka_list}...{/tersangka_list}'}</code> serta tag tunggal <code className="mono">{'{NAMA_TERLAPOR}'}</code>.
                </div>
              </div>
            )}

            {/* Tim Penyidik Otomatis untuk Dokumen Penugasan / Kolektif Perkara (SPRIN SIDIK / SPRIN GAS SIDIK) */}
            {false && (isSprinSidik || isSprinGasSidik) && currentCase && (
              <div style={{
                padding: '12px',
                background: '#1e262e',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '14px',
                fontSize: '11px',
                lineHeight: '1.5'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Shield size={13} color="#ff352d" />
                    <span style={{ color: '#ffffff', fontWeight: 700, letterSpacing: '0.3px' }}>
                      TIM PENYIDIK OTOMATIS (PENUGASAN TIM)
                    </span>
                  </div>
                  <span className="badge" style={{ background: '#2d3748', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#ffffff', fontSize: '9px' }}>
                    Kasat, Kanit, P1 s.d. P5
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '6px', color: 'var(--text-secondary)' }}>
                  {/* Kasat */}
                  <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ color: '#e2e8f0', fontSize: '10px', fontWeight: 600 }}>Pemberi Perintah (Kasat Reskrim):</div>
                    <div style={{ color: '#F1F5F9', fontWeight: 600 }}>
                      {currentCase?.kasat_nama || formValues.ATASAN_NAMA || '(Belum diset)'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94A3B8' }}>
                      {currentCase?.kasat_pangkat || formValues.ATASAN_PANGKAT || '-'} {currentCase?.kasat_nrp ? `NRP ${currentCase.kasat_nrp}` : ''}
                    </div>
                  </div>

                  {/* Kanit / P1 */}
                  <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ color: '#e2e8f0', fontSize: '10px', fontWeight: 600 }}>Kanit / Penyidik 1 (P1):</div>
                    <div style={{ color: '#F1F5F9', fontWeight: 600 }}>
                      {currentCase?.penyidik_1_nama || formValues.PENYIDIK_1_NAMA || '(Belum diset)'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94A3B8' }}>
                      {formatPangkatLengkap(currentCase?.penyidik_1_pangkat || formValues.PENYIDIK_1_PANGKAT || '') || '-'} {currentCase?.penyidik_1_nrp ? `NRP ${currentCase.penyidik_1_nrp}` : ''} • {currentCase?.penyidik_1_jabatan || formValues.PENYIDIK_1_JABATAN || 'Kanit'}
                    </div>
                  </div>

                  {/* Penyidik Penangan */}
                  <div style={{ background: 'rgba(255, 53, 45, 0.06)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(255, 53, 45, 0.3)' }}>
                    <div style={{ color: '#ff352d', fontSize: '10px', fontWeight: 700 }}>Penyidik Penangan Perkara:</div>
                    <div style={{ color: '#F1F5F9', fontWeight: 600 }}>
                      {getPenyidikPenangan(currentCase)?.nama || currentCase?.penyidik_penangan_nama || formValues.PENYIDIK_PENANGAN_NAMA || currentCase?.penyidik_1_nama || '(Belum diset)'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#cbd5e1' }}>
                      {formatPangkatLengkap(getPenyidikPenangan(currentCase)?.pangkat || currentCase?.penyidik_penangan_pangkat || formValues.PENYIDIK_PENANGAN_PANGKAT || currentCase?.penyidik_1_pangkat || '')} {getPenyidikPenangan(currentCase)?.nrp || currentCase?.penyidik_penangan_nrp || currentCase?.penyidik_1_nrp ? `NRP ${getPenyidikPenangan(currentCase)?.nrp || currentCase?.penyidik_penangan_nrp || currentCase?.penyidik_1_nrp}` : ''}
                    </div>
                  </div>
                </div>

                {/* Anggota Tim Penyidik 2 s.d. 5 */}
                <div style={{ 
                  marginTop: '8px', 
                  padding: '6px 8px', 
                  background: 'rgba(15, 23, 42, 0.4)', 
                  borderRadius: '4px', 
                  border: '1px dashed rgba(255,255,255,0.08)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '6px'
                }}>
                  {[2, 3, 4, 5].map((idx) => {
                    const pNama = currentCase?.[`penyidik_${idx}_nama`] || formValues[`PENYIDIK_${idx}_NAMA`];
                    const pPangkat = currentCase?.[`penyidik_${idx}_pangkat`] || formValues[`PENYIDIK_${idx}_PANGKAT`];
                    const pNrp = currentCase?.[`penyidik_${idx}_nrp`] || formValues[`PENYIDIK_${idx}_NRP`];
                    return (
                      <div key={idx} style={{ fontSize: '10.5px' }}>
                        <div style={{ color: '#94A3B8', fontSize: '9.5px' }}>Penyidik {idx}:</div>
                        <div style={{ color: pNama ? '#F1F5F9' : '#64748B', fontWeight: pNama ? 600 : 400 }}>
                          {pNama || '-'}
                        </div>
                        {pNama && (
                          <div style={{ fontSize: '9.5px', color: '#94A3B8' }}>
                            {pPangkat} {pNrp ? `(${pNrp})` : ''}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '6px' }}>
                  Tag otomatis: <code className="mono">{'{ATASAN_NAMA}'}</code>, <code className="mono">{'{PENYIDIK_1_NAMA}'}</code> s.d. <code className="mono">{'{PENYIDIK_5_NAMA}'}</code> beserta Pangkat, NRP, dan Jabatan.
                </div>
              </div>
            )}

            {/* Rantai Rujukan Perkara (Chain of Reference) */}
            {false && currentCase && (
              <div style={{
                padding: '10px 12px',
                background: '#1e262e',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '14px',
                fontSize: '11px',
                lineHeight: '1.5'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ color: '#ff352d', fontWeight: 700, letterSpacing: '0.3px' }}>
                    RANTAI RUJUKAN PERKARA (CHAIN OF REFERENCE)
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    Tag Terisolasi Mandiri
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', color: 'var(--text-secondary)' }}>
                  <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '6px 8px', borderRadius: '4px' }}>
                    <div style={{ color: '#94A3B8', fontSize: '10px' }}>Rujukan LP (Tag: <span style={{ color: '#ff352d' }}>{'{NOMOR_LP}'}</span>):</div>
                    <div style={{ color: '#F1F5F9', fontWeight: 600 }}>{currentCase?.nomor_lp || currentCase?.no_lp || '-'}</div>
                    <div style={{ fontSize: '10px', color: '#cbd5e1' }}>
                      Tgl (<span style={{ color: '#ff352d' }}>{'{TANGGAL_LP}'}</span>): {formatTanggalIndonesia(currentCase?.tanggal_lp || currentCase?.sprin_date) || '-'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '6px 8px', borderRadius: '4px' }}>
                    <div style={{ color: '#94A3B8', fontSize: '10px' }}>Rujukan SP.Sidik (Tag: <span style={{ color: '#ff352d' }}>{'{NO_SPRIN_SIDIK}'}</span>):</div>
                    <div style={{ color: '#F1F5F9', fontWeight: 600 }}>{currentCase?.no_sprin_sidik || (isSprinSidik ? '(Sedang dibuat)' : '-')}</div>
                    <div style={{ fontSize: '10px', color: '#cbd5e1' }}>
                      Tgl (<span style={{ color: '#ff352d' }}>{'{TGL_SPRIN_SIDIK}'}</span>): {formatTanggalIndonesia(formValues.TGL_SPRIN_SIDIK || currentCase?.tgl_sprin_sidik || currentCase?.sprin_date) || '-'}
                    </div>
                  </div>
                  {(currentCase?.no_sprin_gas_sidik || isSprinGasSidik) && (
                    <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '6px 8px', borderRadius: '4px' }}>
                      <div style={{ color: '#94A3B8', fontSize: '10px' }}>Rujukan SP.Gas.Sidik (Tag: <span style={{ color: '#ff352d' }}>{'{NO_SPRIN_GAS_SIDIK}'}</span>):</div>
                      <div style={{ color: '#F1F5F9', fontWeight: 600 }}>{currentCase?.no_sprin_gas_sidik || (isSprinGasSidik ? '(Sedang dibuat)' : '-')}</div>
                      <div style={{ fontSize: '10px', color: '#cbd5e1' }}>
                        Tgl (<span style={{ color: '#ff352d' }}>{'{TGL_SPRIN_GAS_SIDIK}'}</span>): {formatTanggalIndonesia(formValues.TGL_SPRIN_GAS_SIDIK || currentCase?.tgl_sprin_gas_sidik) || '-'}
                      </div>
                    </div>
                  )}
                  {currentCase?.no_spdp && (
                    <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '6px 8px', borderRadius: '4px' }}>
                      <div style={{ color: '#94A3B8', fontSize: '10px' }}>Rujukan SPDP (Tag: <span style={{ color: '#ff352d' }}>{'{NO_SPDP}'}</span>):</div>
                      <div style={{ color: '#F1F5F9', fontWeight: 600 }}>{currentCase?.no_spdp}</div>
                      <div style={{ fontSize: '10px', color: '#cbd5e1' }}>
                        Tgl (<span style={{ color: '#ff352d' }}>{'{TGL_SPDP}'}</span>): {formatTanggalIndonesia(currentCase?.tgl_spdp) || '-'}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '10.5px', color: '#94A3B8', marginTop: '6px', borderTop: '1px dashed rgba(255, 255, 255, 0.1)', paddingTop: '4px' }}>
                  {isCurrentParentDoc && activeParentConfig ? (
                    <span>Dokumen ini adalah <strong>{activeParentConfig.label}</strong> (Dokumen Induk). Input <strong>Nomor Surat</strong> dan <strong>Tanggal Surat</strong> di form di bawah otomatis disinkronkan ke rujukan perkara tanpa perlu input ganda.</span>
                  ) : isSprinGasSidik ? (
                    <span>Dokumen ini adalah <strong>Surat Perintah Tugas Penyidikan (SP.Gas.Sidik)</strong>. Otomatis merujuk ke SP.Sidik induk (<code>{'{NO_SPRIN_SIDIK}'}</code>) dan menugaskan Tim Penyidik tanpa menimpa nomor induk perkara.</span>
                  ) : (
                    <span>Dokumen turunan ini otomatis membaca nomor & tanggal SP.Sidik dari perkara tanpa menimpa <code>{'{TANGGAL_SURAT}'}</code> aktif.</span>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* BAGIAN KHUSUS 1: PARAMETER BA PENANGKAPAN (BA_KAP / SPRIN_KAP_DAN_BA) */}
              {isBaKapDoc && (
                <div style={{
                  padding: '14px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={15} color="var(--accent-amber)" />
                      <span style={{ color: 'var(--accent-amber)', fontWeight: 700, fontSize: '11.5px', letterSpacing: '0.3px' }}>
                        PARAMETER KHUSUS PENANGKAPAN (BA KAP)
                      </span>
                    </div>
                    <span className="badge badge-amber" style={{ fontSize: '9px' }}>
                      Injeksi Tag Berita Acara
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                        Tanggal Penangkapan <span style={{ color: 'var(--accent-red)' }}>*</span>
                      </label>
                      <input
                        type="date"
                        value={formValues.TANGGAL_KAP || ''}
                        onChange={(e) => handleInputChange('TANGGAL_KAP', e.target.value)}
                        className="form-input mono"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                        Waktu / Jam Penangkapan
                      </label>
                      <input
                        type="text"
                        value={formValues.JAM_KAP || ''}
                        onChange={(e) => handleInputChange('JAM_KAP', e.target.value)}
                        className="form-input mono"
                        placeholder="Contoh: 14.00 WITA"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                      Tempat Penangkapan <span style={{ color: 'var(--accent-red)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.TEMPAT_KAP !== undefined ? formValues.TEMPAT_KAP : 'Kab. Kolaka Timur'}
                      onChange={(e) => handleInputChange('TEMPAT_KAP', e.target.value)}
                      className="form-input"
                      placeholder="Kab. Kolaka Timur"
                    />
                  </div>

                  {/* Live Preview Tag Penangkapan */}
                  {(() => {
                    const parsed = parseDateParts(formValues.TANGGAL_KAP || formValues.TANGGAL_SURAT);
                    return (
                      <div style={{
                        padding: '8px 10px',
                        background: 'rgba(15, 23, 42, 0.6)',
                        borderRadius: '4px',
                        fontSize: '10px',
                        lineHeight: '1.5',
                        color: '#CBD5E1',
                        border: '1px dashed rgba(245, 158, 11, 0.25)'
                      }}>
                        <div style={{ color: 'var(--accent-amber)', fontWeight: 600, marginBottom: '2px' }}>
                          Preview Injeksi Tag Word (docxtemplater):
                        </div>
                        <div>• <code>{'{HARI_KAP}'}</code>: <strong>{parsed.hari || '-'}</strong> | <code>{'{TANGGAL_KAP}'}</code>: <strong>{parsed.tanggal || '-'}</strong> | <code>{'{BULAN_KAP}'}</code>: <strong>{parsed.bulan || '-'}</strong> | <code>{'{TAHUN_KAP}'}</code>: <strong>{parsed.tahun || '-'}</strong></div>
                        <div>• <code>{'{TERBILANG_TAHUN_KAP}'}</code>: <em>"{parsed.terbilangTahun || '-'}"</em></div>
                        <div>• <code>{'{JAM_KAP}'}</code>: <strong>{formValues.JAM_KAP || '-'}</strong> | <code>{'{TEMPAT_KAP}'}</code>: <strong>{formValues.TEMPAT_KAP || 'Kab. Kolaka Timur'}</strong></div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* BAGIAN KHUSUS 2: PARAMETER SPRIN & BA PENAHANAN (SPRIN_HAN / BA_HAN / SPRIN_HAN_DAN_BA) */}
              {isHanDoc && (
                <div style={{
                  padding: '14px',
                  background: '#1e262e',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Shield size={15} color="#ff352d" />
                      <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '11.5px', letterSpacing: '0.3px' }}>
                        PARAMETER KHUSUS PENAHANAN (SPRIN & BA HAN)
                      </span>
                    </div>
                    <span className="badge" style={{ background: '#2d3748', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#ffffff', fontSize: '9px' }}>
                      KUHAP 20 Hari & BA Han
                    </span>
                  </div>

                  {/* Tanggal Mulai & Tanggal Akhir Penahanan */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                        Tanggal Mulai Penahanan <span style={{ color: 'var(--accent-red)' }}>*</span>
                      </label>
                      <input
                        type="date"
                        value={formValues.TANGGAL_MULAI_HAN || ''}
                        onChange={(e) => handleInputChange('TANGGAL_MULAI_HAN', e.target.value)}
                        className="form-input mono"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label className="form-label" style={{ fontSize: '11px', marginBottom: 0 }}>
                          Tanggal Akhir (+19 Hari) <span style={{ color: 'var(--accent-red)' }}>*</span>
                        </label>
                        <span style={{ fontSize: '9px', color: '#cbd5e1' }}>Auto-fill 20 hari</span>
                      </div>
                      <input
                        type="date"
                        value={formValues.TANGGAL_AKHIR_HAN || ''}
                        onChange={(e) => handleInputChange('TANGGAL_AKHIR_HAN', e.target.value)}
                        className="form-input mono"
                        required
                      />
                    </div>
                  </div>

                  {/* Tempat / Rutan Penahanan */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                      Tempat / Rutan Penahanan <span style={{ color: 'var(--accent-red)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formValues.TEMPAT_HAN !== undefined ? formValues.TEMPAT_HAN : 'Rumah Tahanan Negara (Rutan) Polres Kolaka Timur'}
                      onChange={(e) => handleInputChange('TEMPAT_HAN', e.target.value)}
                      className="form-input"
                      placeholder="Rumah Tahanan Negara (Rutan) Polres Kolaka Timur"
                    />
                  </div>

                  {/* Tanggal & Waktu Pembuatan BA Penahanan */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                        Tanggal BA Penahanan <span style={{ color: 'var(--accent-red)' }}>*</span>
                      </label>
                      <input
                        type="date"
                        value={formValues.TANGGAL_HAN || ''}
                        onChange={(e) => handleInputChange('TANGGAL_HAN', e.target.value)}
                        className="form-input mono"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                        Waktu / Jam BA Penahanan
                      </label>
                      <input
                        type="text"
                        value={formValues.JAM_HAN || ''}
                        onChange={(e) => handleInputChange('JAM_HAN', e.target.value)}
                        className="form-input mono"
                        placeholder="Contoh: 10.00 WITA"
                      />
                    </div>
                  </div>

                  {/* Live Preview Tag Penahanan */}
                  {(() => {
                    const parsedHan = parseDateParts(formValues.TANGGAL_HAN || formValues.TANGGAL_MULAI_HAN || formValues.TANGGAL_SURAT);
                    return (
                      <div style={{
                        padding: '8px 10px',
                        background: 'rgba(15, 23, 42, 0.6)',
                        borderRadius: '4px',
                        fontSize: '10px',
                        lineHeight: '1.5',
                        color: '#CBD5E1',
                        border: '1px dashed rgba(59, 130, 246, 0.25)'
                      }}>
                        <div style={{ color: 'var(--accent-cyan)', fontWeight: 600, marginBottom: '2px' }}>
                          Preview Injeksi Tag Word (docxtemplater):
                        </div>
                        <div>• Sprin Han: <code>{'{TANGGAL_MULAI_HAN}'}</code>: <strong>{formatTanggalIndonesia(formValues.TANGGAL_MULAI_HAN) || '-'}</strong> s.d. <code>{'{TANGGAL_AKHIR_HAN}'}</code>: <strong>{formatTanggalIndonesia(formValues.TANGGAL_AKHIR_HAN) || '-'}</strong></div>
                        <div>• Rutan: <code>{'{TEMPAT_HAN}'}</code>: <strong>{formValues.TEMPAT_HAN || 'Rumah Tahanan Negara (Rutan) Polres Kolaka Timur'}</strong></div>
                        <div>• BA Han: <code>{'{HARI_HAN}'}</code>: <strong>{parsedHan.hari || '-'}</strong>, <code>{'{TANGGAL_HAN}'}</code>: <strong>{parsedHan.tanggal || '-'}</strong>, <code>{'{BULAN_HAN}'}</code>: <strong>{parsedHan.bulan || '-'}</strong>, <code>{'{TAHUN_HAN}'}</code>: <strong>{parsedHan.tahun || '-'}</strong> (<code>{'{TERBILANG_TAHUN_HAN}'}</code>: <em>"{parsedHan.terbilangTahun || '-'}"</em>) pukul <code>{'{JAM_HAN}'}</code>: <strong>{formValues.JAM_HAN || '-'}</strong></div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {(() => {
                const presetForDoc = getMindikPreset(currentTemplate?.code);
                let dynamicList = Array.isArray(currentTemplate?.dynamic_fields) && currentTemplate.dynamic_fields.length > 0 
                  ? [...currentTemplate.dynamic_fields] 
                  : (presetForDoc && presetForDoc.length > 0
                      ? presetForDoc.map(p => ({
                          field_key: p.tag,
                          field_label: p.label,
                          field_type: p.type,
                          default_value: p.default,
                          is_required: p.required
                        }))
                      : [
                        { 
                          field_key: 'NOMOR_SURAT', 
                          field_label: 'Nomor Surat', 
                          field_type: 'text', 
                          default_value: isSprinGasSidik ? 'SP.Gas.Sidik/..../I/RES.0.0/2026/Satreskrim/Polres Koltim/Polda Sultra' : '', 
                          is_required: true 
                        },
                        { field_key: 'TANGGAL_SURAT', field_label: 'Tanggal Surat', field_type: 'date', default_value: '', is_required: true },
                        { field_key: 'TEMPAT_SURAT', field_label: 'Tempat Surat', field_type: 'text', default_value: 'Tirawuta', is_required: false },
                        { field_key: 'TUJUAN_SURAT', field_label: 'Tujuan Surat', field_type: 'text', default_value: 'Kepala Kejaksaan Negeri Kolaka', is_required: false },
                        { field_key: 'ALAMAT_TUJUAN', field_label: 'Alamat Tujuan', field_type: 'text', default_value: 'Jl. Dr. Sutomo No. 5, Kolaka', is_required: false },
                        { field_key: 'MASA_BERLAKU', field_label: 'Masa Berlaku', field_type: 'text', default_value: '30 (tiga puluh) hari', is_required: false },
                      ]);

                // Universal Auto-Sync: Sembunyikan input manual rujukan dokumen induk pada dokumen induk itu sendiri
                if (isCurrentParentDoc && activeParentConfig) {
                  const redundantKeys = [
                    ...(activeParentConfig.noTags || []),
                    ...(activeParentConfig.tglTags || []),
                    activeParentConfig.targetNoCol?.toUpperCase(),
                    activeParentConfig.targetTglCol?.toUpperCase()
                  ].filter(Boolean);

                  dynamicList = dynamicList.filter(f => {
                    const k = (f.field_key || f.key || '').replace(/[{}]/g, '').trim().toUpperCase();
                    return !redundantKeys.includes(k);
                  });
                }
                dynamicList = dynamicList.filter(f => (f.field_key || f.key || '').replace(/[{}]/g, '').trim().toUpperCase() !== 'ATASAN_JABATAN');

                // Saring field agar form ringkas dan bebas dobel input saat Penangkapan atau Penahanan aktif
                if (isBaKapDoc) {
                  const redundantKapKeys = [
                    'TANGGAL_KAP', 'JAM_KAP', 'TEMPAT_KAP',
                    'TANGGAL_SURAT', 'DOC_DATE',
                    'TEMPAT_SURAT', 'DOC_LOCATION',
                    'TUJUAN_SURAT', 'DOC_TARGET',
                    'ALAMAT_TUJUAN', 'DOC_TARGET_ADDR',
                    'MASA_BERLAKU', 'DOC_VALIDITY'
                  ];
                  dynamicList = dynamicList.filter(f => {
                    const k = (f.field_key || f.key || '').replace(/[{}]/g, '').trim().toUpperCase();
                    return !redundantKapKeys.includes(k);
                  });
                } else if (isHanDoc) {
                  const redundantHanKeys = [
                    'TANGGAL_MULAI_HAN', 'TANGGAL_AKHIR_HAN', 'TEMPAT_HAN',
                    'TANGGAL_HAN', 'JAM_HAN',
                    'TANGGAL_SURAT', 'DOC_DATE',
                    'TEMPAT_SURAT', 'DOC_LOCATION',
                    'TUJUAN_SURAT', 'DOC_TARGET',
                    'ALAMAT_TUJUAN', 'DOC_TARGET_ADDR',
                    'MASA_BERLAKU', 'DOC_VALIDITY'
                  ];
                  dynamicList = dynamicList.filter(f => {
                    const k = (f.field_key || f.key || '').replace(/[{}]/g, '').trim().toUpperCase();
                    return !redundantHanKeys.includes(k);
                  });
                } else if (isSpTapDoc) {
                  const redundantSpTapKeys = [
                    'NOMOR_SURAT', 'DOC_NO', 'TANGGAL_SURAT', 'DOC_DATE',
                    'NOMOR_SP_TAP', 'NO_SP_TAP_TSK', 'NOMOR_SP_TAP_TSK',
                    'URUTAN_TERSANGKA', 'STATUS_TERSANGKA_LABEL'
                  ];
                  dynamicList = dynamicList.filter(f => {
                    const k = (f.field_key || f.key || '').replace(/[{}]/g, '').trim().toUpperCase();
                    return !redundantSpTapKeys.includes(k);
                  });
                }

                if (!Array.isArray(dynamicList) || dynamicList.length === 0) {
                  return null;
                }

                return (dynamicList || []).map((field, idx) => {
                  if (!field) return null;
                  const fieldKey = (field.field_key || field.key || `FIELD_${idx}`).replace(/[{}]/g, '').trim();
                  const upperFieldKey = fieldKey.toUpperCase();
                  let fieldLabel = field.field_label || field.label || fieldKey;
                  let placeholder = field.default_value !== undefined ? field.default_value : (field.placeholder || '');
                  const fieldType = field.field_type || field.type || 'text';
                  const isRequired = field.is_required !== undefined 
                    ? Boolean(field.is_required) 
                    : (field.isRequired !== undefined ? Boolean(field.isRequired) : Boolean(field.required));

                  if (isSpTapDoc) {
                    if (upperFieldKey === 'NOMOR_SURAT' || upperFieldKey === 'DOC_NO') {
                      fieldLabel = 'Nomor SP.Tap TSK';
                      placeholder = `SP.Tap/  /  /${new Date().getFullYear()}/Reskrim`;
                    } else if (upperFieldKey === 'TANGGAL_SURAT' || upperFieldKey === 'DOC_DATE') {
                      fieldLabel = 'Tanggal Penetapan Tersangka';
                    }
                  }
                  const currentVal = formValues[fieldKey] !== undefined 
                    ? formValues[fieldKey] 
                    : (formValues[fieldKey.toUpperCase()] !== undefined 
                        ? formValues[fieldKey.toUpperCase()] 
                        : (formValues[fieldKey.toLowerCase()] || ''));

                  return (
                    <div key={field.id || fieldKey || idx} className="form-group" style={{ marginBottom: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label className="form-label" style={{ fontSize: '11px', marginBottom: 0 }}>
                          {fieldLabel} {isRequired && <span style={{ color: 'var(--accent-red)' }}>*</span>}
                        </label>
                        <span className="mono" style={{ fontSize: '10px', color: '#cbd5e1' }}>
                          {`{${fieldKey}}`}
                        </span>
                      </div>

                      {fieldType === 'select_personnel' ? (
                        <select
                          value={currentVal}
                          required={Boolean(isRequired)}
                          onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                          className="form-select"
                        >
                          <option value="">-- Pilih Personel --</option>
                          {(activePersonnel || [])
                            .filter(p => p && (!field.role_filter || p.role === field.role_filter))
                            .map((p) => (
                              <option key={p?.id || p?.nrp || p?.nama} value={p?.nama || p?.id}>
                                {p?.pangkat} {p?.nama} ({p?.jabatan || p?.role || '-'})
                              </option>
                            ))}
                        </select>
                      ) : fieldType === 'select' && Array.isArray(field.options) ? (
                        <select
                          value={currentVal}
                          required={Boolean(isRequired)}
                          onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                          className="form-select"
                        >
                          <option value="">-- Pilih Pilihan --</option>
                          {(field.options || []).map((opt, oIdx) => (
                            <option key={oIdx} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : fieldType === 'date' ? (
                        <input
                          type={(/^\d{4}-\d{2}-\d{2}$/.test(currentVal) || !currentVal) ? "date" : "text"}
                          value={currentVal}
                          required={Boolean(isRequired)}
                          onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                          className="form-input mono"
                          placeholder={placeholder || '... Januari 2026'}
                        />
                      ) : fieldType === 'textarea' ? (
                        <textarea
                          value={currentVal}
                          required={Boolean(isRequired)}
                          onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                          className="form-textarea"
                          placeholder={placeholder}
                        />
                      ) : (
                        <input
                          type="text"
                          value={currentVal}
                          required={Boolean(isRequired)}
                          onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                          className="form-input mono"
                          placeholder={placeholder}
                        />
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Primary Action Button to Generate Real .docx */}
            <button
              type="button"
              disabled={isGenerating || !currentPrereq.allowed || !currentTemplate || !isTemplateAvailableInStudio}
              onClick={handleTriggerGenerate}
              className="btn btn-primary"
              style={{
                marginTop: '16px',
                width: '100%',
                padding: '12px',
                fontSize: '13px',
                fontWeight: 700,
                boxShadow: (!currentPrereq.allowed || !currentTemplate || !isTemplateAvailableInStudio) ? 'none' : '0 4px 16px rgba(255, 53, 45, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: (!currentPrereq.allowed || !currentTemplate || !isTemplateAvailableInStudio) ? 0.6 : 1,
                cursor: (!currentPrereq.allowed || !currentTemplate || !isTemplateAvailableInStudio) ? 'not-allowed' : 'pointer',
              }}
              title={!currentPrereq.allowed ? `Prasyarat belum terpenuhi: ${currentPrereq.reason}` : (!currentTemplate ? 'Pilih template terlebih dahulu' : (!isTemplateAvailableInStudio ? 'Master dokumen .docx belum diunggah di Template Studio' : 'Generate Dokumen Resmi (.docx) dari Supabase'))}
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={16} className="animate-pulse" />
                  <span>Mengambil Template & Merender File .docx...</span>
                </>
              ) : !currentPrereq.allowed ? (
                <>
                  <Lock size={16} />
                  <span>DOKUMEN TERKUNCI (SELESAIKAN PRASYARAT FORMIL)</span>
                </>
              ) : !isTemplateAvailableInStudio ? (
                <>
                  <FileText size={16} />
                  <span>TEMPLATE BELUM TERSEDIA DI STUDIO</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Generate Dokumen Resmi (.docx) dari Supabase</span>
                </>
              )}
            </button>
              </>
            )}
          </div>
        </div>

        {/* Right: Live Interactive Document Sheet */}
        <div>
          {!currentTemplate ? (
            <div className="glass" style={{
              padding: '60px 24px',
              textAlign: 'center',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '520px',
              gap: '14px'
            }}>
              <FileSignature size={48} color="#94A3B8" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F1F5F9', margin: 0 }}>
                Belum Ada Format Dokumen Mindik Terpilih
              </h3>
              <p style={{ color: '#94A3B8', fontSize: '13px', maxWidth: '420px', margin: 0, lineHeight: 1.5 }}>
                Pilih format dokumen Mindik dari panel sebelah kiri atau buka katalog dokumen untuk memuat naskah dinas resmi.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedClusterTab('A');
                  setIsDocModalOpen(true);
                }}
                className="btn btn-primary btn-sm"
                style={{ marginTop: '8px', fontWeight: 700 }}
              >
                PILIH DOKUMEN MINDIK
              </button>
            </div>
          ) : !isTemplateAvailableInStudio ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '550px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '2px dashed rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              color: '#94a3b8',
              textAlign: 'center',
              padding: '40px'
            }}>
              <FileText size={48} style={{ opacity: 0.4, marginBottom: '16px' }} />
              <h3 style={{ color: '#ffffff', marginBottom: '8px', fontSize: '18px' }}>Template Belum Tersedia di Template Studio</h3>
              <p style={{ maxWidth: '420px', fontSize: '13px', lineHeight: '1.6' }}>
                Master dokumen resmi Microsoft Word (.docx) untuk <strong>{currentTemplate?.title || currentTemplate?.name}</strong> belum diunggah ke Supabase Storage.
              </p>
              <span style={{ fontSize: '12px', color: '#64748b', marginTop: '12px' }}>
                Silakan unggah master template di menu <strong>Template Studio</strong> untuk mulai mengenerate dokumen ini.
              </span>
            </div>
          ) : (
            <OfficialDocPreview
              selectedCase={currentCase}
              template={currentTemplate}
              formValues={formValues}
              personnel={activePersonnel}
              activeSuspect={selectedSuspect}
              suspectsList={caseSuspects}
              activeVictim={selectedVictim}
              victimsList={registeredVictims}
              onSaveArchive={handleSave}
              isSaved={isSaved}
            />
          )}
        </div>
      </div>

      {/* --- MODAL POP-UP PEMILIHAN DOKUMEN MINDIK (KATALOG MINDIK) --- */}
      {isDocModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsDocModalOpen(false)} style={{ zIndex: 1100 }}>
          <div 
            className="modal-content" 
            style={{
              maxWidth: '960px',
              width: '95%',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#0c111d',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '14px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Header */}
            <div className="modal-header" style={{
              padding: '16px 20px',
              backgroundColor: '#101726',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(255, 53, 45, 0.15)',
                  border: '1px solid rgba(255, 53, 45, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FileSignature size={20} color="#ff352d" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#FFFFFF', letterSpacing: '0.4px' }}>
                    KATALOG ADMINISTRASI PENYIDIKAN (MINDIK)
                  </h3>
                  <div style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '2px' }}>
                    Pilih format dokumen resmi sesuai hierarki dan prasyarat formil KUHAP
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Stage Indicator / Switcher */}
                <div style={{
                  display: 'flex',
                  background: '#090d16',
                  borderRadius: '8px',
                  padding: '3px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setTahapMindik('SIDIK');
                      setSelectedClusterTab('A');
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: tahapMindik === 'SIDIK' ? 'rgba(239, 68, 68, 0.25)' : 'transparent',
                      color: tahapMindik === 'SIDIK' ? '#FCA5A5' : '#94A3B8'
                    }}
                  >
                    SIDIK
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTahapMindik('LIDIK');
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: tahapMindik === 'LIDIK' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                      color: tahapMindik === 'LIDIK' ? '#FDE68A' : '#94A3B8'
                    }}
                  >
                    LIDIK
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Tutup Katalog"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Cluster Navigation Tabs */}
            {tahapMindik === 'SIDIK' && (
              <div style={{
                backgroundColor: '#090d16',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '8px 16px 0',
                overflowX: 'auto',
                display: 'flex',
                gap: '4px',
                scrollbarWidth: 'thin'
              }}>
                {SIDIK_CLUSTERS.map(cluster => {
                  const isActive = selectedClusterTab === cluster.id;
                  return (
                    <button
                      key={cluster.id}
                      type="button"
                      onClick={() => setSelectedClusterTab(cluster.id)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px 8px 0 0',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        letterSpacing: '0.3px',
                        border: 'none',
                        borderBottom: isActive ? '3px solid #ff352d' : '3px solid transparent',
                        background: isActive ? '#141d2e' : 'transparent',
                        color: isActive ? '#FFFFFF' : '#94A3B8',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 150ms ease'
                      }}
                    >
                      {cluster.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Modal Body: List/Grid Kartu Dokumen */}
            <div style={{
              padding: '20px',
              overflowY: 'auto',
              flex: 1,
              backgroundColor: '#0c111d'
            }}>
              {tahapMindik === 'SIDIK' ? (() => {
                const clusterMasterItems = MASTER_MINDIK_SIDIK.filter(item => item.cluster === selectedClusterTab);
                
                // Cari template yang cocok di allTemplates
                const clusterWithUploads = clusterMasterItems.map(item => {
                  const uploadedTpl = findUploadedTemplate(item, allTemplates);
                  return { item, uploadedTpl };
                });

                // Cek apakah ada satupun template yang diunggah di studio untuk klaster ini
                const uploadedCount = clusterWithUploads.filter(c => Boolean(c.uploadedTpl)).length;

                // Tambahkan template kustom jika ada yang terunggah di klaster ini tapi tidak ada di master list
                const customUploaded = allTemplates.filter(t => 
                  getSidikCluster(t) === selectedClusterTab &&
                  !clusterWithUploads.some(c => c.uploadedTpl?.code === t.code)
                );
                const totalUploaded = uploadedCount + customUploaded.length;

                if (totalUploaded === 0) {
                  return (
                    <div style={{
                      padding: '50px 20px',
                      textAlign: 'center',
                      background: 'rgba(15, 23, 42, 0.4)',
                      borderRadius: '12px',
                      border: '1px dashed rgba(255, 255, 255, 0.15)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px',
                      margin: '10px 0'
                    }}>
                      <AlertCircle size={44} color="#94A3B8" />
                      <h4 style={{ color: '#F1F5F9', fontSize: '15px', fontWeight: 700, margin: 0 }}>
                        Template belum tersedia di Template Studio.
                      </h4>
                      <p style={{ color: '#94A3B8', fontSize: '12.5px', maxWidth: '440px', margin: 0, lineHeight: 1.5 }}>
                        Silakan unggah format template terlebih dahulu melalui Template Studio agar dapat digunakan dalam perkara ini.
                      </p>
                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsDocModalOpen(false);
                            if (onOpenTemplateStudio) onOpenTemplateStudio();
                          }}
                          className="btn btn-primary btn-sm"
                          style={{ marginTop: '8px', fontWeight: 700 }}
                        >
                          Buka Template Studio
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '4px',
                      padding: '0 4px'
                    }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8' }}>
                        DAFTAR DOKUMEN DALAM KLASTER INI ({clusterWithUploads.length + customUploaded.length} Format)
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {uploadedCount + customUploaded.length} Tersedia di Studio
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                      {clusterWithUploads.map(({ item, uploadedTpl }) => {
                        const isUploaded = Boolean(uploadedTpl);
                        const prereq = isUploaded 
                          ? checkPrerequisite(uploadedTpl, currentCase, caseDocuments, caseSuspects, selectedSuspect)
                          : { allowed: false, reason: 'Template belum diunggah di Template Studio.' };
                        const isUnlocked = isUploaded && prereq.allowed;
                        const isSelected = isUploaded && selectedTemplateCode === uploadedTpl.code;

                        return (
                          <div
                            key={item.code}
                            onClick={() => {
                              if (isUnlocked) {
                                setSelectedTemplateCode(uploadedTpl.code);
                                setIsDocModalOpen(false);
                              }
                            }}
                            style={{
                              padding: '12px 16px',
                              borderRadius: '10px',
                              backgroundColor: isSelected
                                ? 'rgba(255, 53, 45, 0.15)'
                                : isUnlocked
                                  ? '#111827'
                                  : 'rgba(17, 24, 39, 0.6)',
                              border: isSelected
                                ? '1.5px solid #ff352d'
                                : isUnlocked
                                  ? '1px solid rgba(255, 255, 255, 0.12)'
                                  : '1px solid rgba(255, 255, 255, 0.05)',
                              cursor: isUnlocked ? 'pointer' : 'not-allowed',
                              opacity: isUnlocked ? 1 : 0.65,
                              transition: 'all 150ms ease',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              boxShadow: isSelected ? '0 0 12px rgba(255, 53, 45, 0.3)' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  color: '#64748B',
                                  minWidth: '22px'
                                }}>
                                  #{item.itemNumber}
                                </span>
                                <span style={{
                                  fontSize: '13px',
                                  fontWeight: 800,
                                  color: isUnlocked ? '#FFFFFF' : '#94A3B8',
                                  textTransform: 'uppercase'
                                }}>
                                  {item.title}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                <span className="badge" style={{
                                  fontSize: '9px',
                                  padding: '2px 6px',
                                  background: item.type.includes('Wajib') ? 'rgba(56, 189, 248, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                                  color: item.type.includes('Wajib') ? '#38BDF8' : '#94A3B8',
                                  border: `1px solid ${item.type.includes('Wajib') ? 'rgba(56, 189, 248, 0.3)' : 'rgba(148, 163, 184, 0.2)'}`
                                }}>
                                  {item.type}
                                </span>

                                {!isUploaded ? (
                                  <span className="badge" style={{
                                    fontSize: '9px',
                                    padding: '2px 6px',
                                    background: 'rgba(100, 116, 139, 0.2)',
                                    color: '#94A3B8',
                                    border: '1px solid rgba(100, 116, 139, 0.3)'
                                  }}>
                                    Template Belum Diunggah di Studio
                                  </span>
                                ) : isUnlocked ? (
                                  <span className="badge badge-green" style={{ fontSize: '9px', padding: '2px 7px', fontWeight: 700 }}>
                                    TERSEDIA
                                  </span>
                                ) : (
                                  <span className="badge badge-red" style={{ fontSize: '9px', padding: '2px 7px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <Lock size={10} />
                                    <span>TERKUNCI</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Warning Tooltip Baris jika Terkunci */}
                            {isUploaded && !prereq.allowed && (
                              <div style={{
                                fontSize: '11px',
                                color: '#FCA5A5',
                                background: 'rgba(239, 68, 68, 0.1)',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                borderLeft: '3px solid var(--accent-red)',
                                marginTop: '2px'
                              }}>
                                🔒 Wajib membuat {prereq.reason}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Custom Uploaded Templates if any */}
                      {customUploaded.map(customTpl => {
                        const prereq = checkPrerequisite(customTpl, currentCase, caseDocuments, caseSuspects, selectedSuspect);
                        const isUnlocked = prereq.allowed;
                        const isSelected = selectedTemplateCode === customTpl.code;

                        return (
                          <div
                            key={customTpl.id || customTpl.code}
                            onClick={() => {
                              if (isUnlocked) {
                                setSelectedTemplateCode(customTpl.code);
                                setIsDocModalOpen(false);
                              }
                            }}
                            style={{
                              padding: '12px 16px',
                              borderRadius: '10px',
                              backgroundColor: isSelected
                                ? 'rgba(255, 53, 45, 0.15)'
                                : isUnlocked
                                  ? '#111827'
                                  : 'rgba(17, 24, 39, 0.6)',
                              border: isSelected
                                ? '1.5px solid #ff352d'
                                : isUnlocked
                                  ? '1px solid rgba(255, 255, 255, 0.12)'
                                  : '1px solid rgba(255, 255, 255, 0.05)',
                              cursor: isUnlocked ? 'pointer' : 'not-allowed',
                              opacity: isUnlocked ? 1 : 0.65,
                              transition: 'all 150ms ease',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 800, color: isUnlocked ? '#FFFFFF' : '#94A3B8', textTransform: 'uppercase' }}>
                                {(customTpl.title || customTpl.name || customTpl.code).toUpperCase()}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span className="badge badge-green" style={{ fontSize: '9px', padding: '2px 7px', fontWeight: 700 }}>
                                  TERSEDIA
                                </span>
                                {!isUnlocked && (
                                  <span className="badge badge-red" style={{ fontSize: '9px', padding: '2px 7px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <Lock size={10} />
                                    <span>TERKUNCI</span>
                                  </span>
                                )}
                              </div>
                            </div>
                            {!prereq.allowed && (
                              <div style={{
                                fontSize: '11px',
                                color: '#FCA5A5',
                                background: 'rgba(239, 68, 68, 0.1)',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                borderLeft: '3px solid var(--accent-red)',
                                marginTop: '2px'
                              }}>
                                🔒 Wajib membuat {prereq.reason}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })() : (() => {
                const lidikTemplates = allTemplates.filter(t => getTemplateStage(t) === 'LIDIK');
                if (lidikTemplates.length === 0) {
                  return (
                    <div style={{
                      padding: '50px 20px',
                      textAlign: 'center',
                      background: 'rgba(15, 23, 42, 0.4)',
                      borderRadius: '12px',
                      border: '1px dashed rgba(255, 255, 255, 0.15)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <AlertCircle size={44} color="#94A3B8" />
                      <h4 style={{ color: '#F1F5F9', fontSize: '15px', fontWeight: 700, margin: 0 }}>
                        Template belum tersedia di Template Studio.
                      </h4>
                      <p style={{ color: '#94A3B8', fontSize: '12.5px', maxWidth: '440px', margin: 0, lineHeight: 1.5 }}>
                        Silakan unggah format template penyelidikan (LIDIK) terlebih dahulu di Template Studio.
                      </p>
                    </div>
                  );
                }
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                    {lidikTemplates.map(t => {
                      const isSelected = selectedTemplateCode === t.code;
                      return (
                        <div
                          key={t.id || t.code}
                          onClick={() => {
                            setSelectedTemplateCode(t.code);
                            setIsDocModalOpen(false);
                          }}
                          style={{
                            padding: '12px 16px',
                            borderRadius: '10px',
                            backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.15)' : '#111827',
                            border: isSelected ? '1.5px solid var(--accent-amber)' : '1px solid rgba(255, 255, 255, 0.12)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 150ms ease'
                          }}
                        >
                          <span style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', textTransform: 'uppercase' }}>
                            {(t.title || t.name || t.code).toUpperCase()}
                          </span>
                          <span className="badge badge-amber" style={{ fontSize: '9px', padding: '2px 7px', fontWeight: 700 }}>
                            TERSEDIA
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="modal-footer" style={{
              padding: '12px 20px',
              backgroundColor: '#101726',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                Hanya format dokumen yang telah diunggah filenya di <strong>Template Studio</strong> yang dapat dipilih.
              </div>
              <button
                type="button"
                onClick={() => setIsDocModalOpen(false)}
                className="btn btn-secondary btn-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL PEMILIHAN TAHAPAN MINDIK: LIDIK VS SIDIK --- */}
      {showTahapModal && (
        <div className="modal-backdrop" onClick={() => setShowTahapModal(false)}>
          <div 
            className="modal-content" 
            style={{ maxWidth: '820px', width: '94%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Layers size={20} color="var(--accent-red)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, letterSpacing: '0.4px', color: '#fff' }}>
                    PILIH TAHAPAN ADMINISTRASI PENYIDIKAN (MINDIK)
                  </h3>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    Pilih fase penanganan perkara aktif untuk klasifikasi format dokumen Mindik dan aturan validasi formil.
                  </div>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setShowTahapModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '16px'
              }}>
                {/* KARTU 1: TAHAP PENYELIDIKAN (LIDIK) */}
                <div
                  onClick={() => handleSelectTahap('LIDIK')}
                  style={{
                    padding: '18px',
                    backgroundColor: tahapMindik === 'LIDIK' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    border: tahapMindik === 'LIDIK' ? '2px solid var(--accent-amber)' : '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span className="badge badge-amber" style={{ fontSize: '10px', padding: '3px 8px' }}>
                        FASE 1: PENYELIDIKAN (LIDIK)
                      </span>
                      {tahapMindik === 'LIDIK' && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-amber)', fontSize: '11px', fontWeight: 800 }}>
                          <Check size={14} /> AKTIF
                        </span>
                      )}
                    </div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 800, color: '#fff' }}>
                      TAHAP PENYELIDIKAN (LIDIK)
                    </h4>
                    <p style={{ fontSize: '11.5px', color: '#94A3B8', margin: '0 0 12px 0', lineHeight: 1.45 }}>
                      Rangkaian kegiatan penyelidik untuk mencari dan menemukan suatu peristiwa pidana guna menentukan dapat atau tidaknya dilakukan penyidikan.
                    </p>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#E2E8F0', marginBottom: '6px' }}>
                      Klasifikasi Dokumen LIDIK:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', color: '#CBD5E1', lineHeight: 1.6 }}>
                      <li>SURAT PERINTAH PENYELIDIKAN</li>
                      <li>SURAT PERINTAH TUGAS PENYELIDIKAN</li>
                      <li>SURAT PERMINTAAN VISUM ET REPERTUM (VER)</li>
                      <li>SURAT PERMINTAAN VISUM ET PSIKIATRIKUM (VER)</li>
                      <li>SURAT PEMBERITAHUAN PERKEMBANGAN HASIL PENYELIDIKAN</li>
                      <li>LAPORAN HASIL PENYELIDIKAN</li>
                      <li>NOTA DINAS UNDANGAN GELAR PERKARA</li>
                      <li>LAPORAN HASIL GELAR PERKARA</li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    className={`btn ${tahapMindik === 'LIDIK' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    style={{
                      marginTop: '16px',
                      width: '100%',
                      justifyContent: 'center',
                      fontWeight: 700,
                      backgroundColor: tahapMindik === 'LIDIK' ? 'var(--accent-amber)' : undefined,
                      borderColor: tahapMindik === 'LIDIK' ? 'var(--accent-amber)' : undefined,
                      color: tahapMindik === 'LIDIK' ? '#000' : undefined
                    }}
                  >
                    {tahapMindik === 'LIDIK' ? 'Tahapan Sedang Aktif' : 'PILIH TAHAP PENYELIDIKAN'}
                  </button>
                </div>

                {/* KARTU 2: TAHAP PENYIDIKAN (SIDIK) */}
                <div
                  onClick={() => handleSelectTahap('SIDIK')}
                  style={{
                    padding: '18px',
                    backgroundColor: tahapMindik === 'SIDIK' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    border: tahapMindik === 'SIDIK' ? '2px solid var(--accent-red)' : '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span className="badge badge-red" style={{ fontSize: '10px', padding: '3px 8px' }}>
                        FASE 2: PENYIDIKAN (SIDIK)
                      </span>
                      {tahapMindik === 'SIDIK' && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-red)', fontSize: '11px', fontWeight: 800 }}>
                          <Check size={14} /> AKTIF
                        </span>
                      )}
                    </div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 800, color: '#fff' }}>
                      TAHAP PENYIDIKAN (SIDIK)
                    </h4>
                    <p style={{ fontSize: '11.5px', color: '#94A3B8', margin: '0 0 12px 0', lineHeight: 1.45 }}>
                      Rangkaian tindakan penyidik menurut KUHAP untuk mengumpulkan bukti dan menemukan tersangkanya dengan validasi berjenjang (Klaster A s.d. G).
                    </p>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#E2E8F0', marginBottom: '6px' }}>
                      Klaster Dokumen Berjenjang:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', color: '#CBD5E1', lineHeight: 1.6 }}>
                      <li><strong>A. SURAT PERINTAH PENYIDIKAN</strong> (SP.Sidik & SP.Gas.Sidik)</li>
                      <li><strong>B. PEMBERITAHUAN DIMULAINYA PENYIDIKAN (SPDP)</strong></li>
                      <li><strong>C. TINDAKAN TERHADAP TERSANGKA</strong> (Tap, Gil, Kap, DPO)</li>
                      <li><strong>D. PENYITAAN & PENGGELEDAHAN</strong></li>
                      <li><strong>E. KORBAN DAN SAKSI</strong></li>
                      <li><strong>F. PENAHANAN</strong> (Berjenjang 40H & 30H)</li>
                      <li><strong>G. BERKAS PERKARA</strong> (Tahap I & Tahap II)</li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    className={`btn ${tahapMindik === 'SIDIK' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    style={{
                      marginTop: '16px',
                      width: '100%',
                      justifyContent: 'center',
                      fontWeight: 700
                    }}
                  >
                    {tahapMindik === 'SIDIK' ? 'Tahapan Sedang Aktif' : 'PILIH TAHAP PENYIDIKAN'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 1: TAMBAH FORMAT TEMPLATE (.DOCX) (KHUSUS SUPER ADMIN) --- */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div 
            className="modal-content" 
            style={{ maxWidth: '520px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(255, 53, 45, 0.12)',
                  border: '1px solid rgba(255, 53, 45, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Upload size={18} color="#ff352d" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', margin: 0 }}>Tambah Format Template .docx</h3>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Upload file template fisik ke Supabase Storage (bucket templates)
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddTemplate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Judul Format */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Judul Format Dokumen <span style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Contoh: Surat Perintah Penyitaan"
                    className="form-input"
                    required
                  />
                </div>

                {/* Kode Template & Kategori */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">
                      Kode Unik <span style={{ color: 'var(--accent-red)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                      placeholder="Contoh: SPRIN_SITA"
                      className="form-input mono"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Kategori</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="form-select"
                    >
                      <option value="SURAT PERINTAH">SURAT PERINTAH</option>
                      <option value="SURAT">SURAT</option>
                      <option value="BERITA ACARA">BERITA ACARA</option>
                      <option value="PENETAPAN">PENETAPAN</option>
                      <option value="LAINNYA">LAINNYA</option>
                    </select>
                  </div>
                </div>

                {/* Deskripsi */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Deskripsi Template</label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Deskripsi singkat peruntukan format dokumen..."
                    className="form-textarea"
                    style={{ minHeight: '60px' }}
                  />
                </div>

                {/* File Upload Area */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Pilih File Master Word (.docx) <span style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  <div 
                    style={{
                      border: '2px dashed var(--border-glass-hover)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '16px',
                      textAlign: 'center',
                      background: newDocxFile ? 'rgba(255, 53, 45, 0.08)' : 'rgba(13, 21, 38, 0.4)',
                      cursor: 'pointer',
                    }}
                    onClick={() => document.getElementById('new-docx-input').click()}
                  >
                    <input
                      id="new-docx-input"
                      type="file"
                      accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setNewDocxFile(e.target.files[0]);
                        }
                      }}
                    />

                    <FileText size={28} color={newDocxFile ? '#ff352d' : 'var(--text-secondary)'} style={{ margin: '0 auto 6px' }} />
                    {newDocxFile ? (
                      <div>
                        <div style={{ fontWeight: 600, color: '#FFF', fontSize: '12.5px' }}>{newDocxFile.name}</div>
                        <div style={{ fontSize: '11px', color: '#ff352d' }}>{(newDocxFile.size / 1024).toFixed(1)} KB</div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Klik di sini untuk memilih file .docx dari komputer Anda
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)} 
                  className="btn btn-secondary btn-sm"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isProcessingTemplate}
                  className="btn btn-primary btn-sm"
                >
                  <Upload size={14} />
                  <span>{isProcessingTemplate ? 'Mengunggah...' : 'Unggah & Simpan Format'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: EDIT FORMAT TEMPLATE (KHUSUS SUPER ADMIN) --- */}
      {templateToEdit && (
        <div className="modal-backdrop" onClick={() => setTemplateToEdit(null)}>
          <div 
            className="modal-content" 
            style={{ maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit3 size={18} color="#ff352d" />
                <h3 style={{ fontSize: '16px', margin: 0 }}>Edit Format Template</h3>
              </div>
              <button 
                onClick={() => setTemplateToEdit(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Kode Template (Permanen)</label>
                  <input
                    type="text"
                    value={templateToEdit.code}
                    disabled
                    className="form-input mono"
                    style={{ opacity: 0.7 }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Judul Format</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Kategori</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="form-select"
                  >
                    <option value="SURAT PERINTAH">SURAT PERINTAH</option>
                    <option value="SURAT">SURAT</option>
                    <option value="BERITA ACARA">BERITA ACARA</option>
                    <option value="PENETAPAN">PENETAPAN</option>
                    <option value="LAINNYA">LAINNYA</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Deskripsi</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="form-textarea"
                    style={{ minHeight: '60px' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  onClick={() => setTemplateToEdit(null)} 
                  className="btn btn-secondary btn-sm"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isProcessingTemplate}
                  className="btn btn-primary btn-sm"
                >
                  <span>{isProcessingTemplate ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: KONFIRMASI HAPUS FORMAT (KHUSUS SUPER ADMIN) --- */}
      {templateToDelete && (
        <div className="modal-backdrop" onClick={() => setTemplateToDelete(null)}>
          <div 
            className="modal-content" 
            style={{ maxWidth: '440px', borderColor: 'var(--accent-red)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ borderBottomColor: 'rgba(239, 68, 68, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={18} color="var(--accent-red)" />
                <h3 style={{ fontSize: '16px', margin: 0, color: 'var(--accent-red)' }}>
                  Hapus Format Template
                </h3>
              </div>
              <button 
                onClick={() => setTemplateToDelete(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ fontSize: '13px', lineHeight: 1.5 }}>
              <p style={{ margin: 0 }}>
                Apakah Anda yakin ingin menghapus format template ini dari Supabase Storage dan database?
              </p>
              <div style={{
                marginTop: '12px',
                padding: '10px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div style={{ fontWeight: 700, color: '#FFF' }}>{templateToDelete.title}</div>
                <div className="mono" style={{ fontSize: '11px', color: '#e2e8f0', marginTop: '2px' }}>
                  Kode: {templateToDelete.code} • Kategori: {templateToDelete.category}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                onClick={() => setTemplateToDelete(null)} 
                className="btn btn-secondary btn-sm"
              >
                Batal
              </button>
              <button 
                type="button" 
                disabled={isProcessingTemplate}
                onClick={handleConfirmDelete}
                className="btn btn-danger btn-sm"
              >
                <Trash2 size={14} />
                <span>{isProcessingTemplate ? 'Menghapus...' : 'Ya, Hapus Format'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
