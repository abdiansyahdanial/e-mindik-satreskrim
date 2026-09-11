// Template dokumen administrasi penyidikan
// dynamic_fields: field DOC_* yang perlu diinput saat generate
export const mockTemplates = [
  {
    id: 'tpl-001',
    code: 'SPRIN_SIDIK',
    title: 'Surat Perintah Penyidikan',
    category: 'SURAT PERINTAH',
    description: 'Surat perintah untuk melaksanakan penyidikan terhadap suatu perkara tindak pidana.',
    dynamic_fields: [
      { key: 'DOC_NO', label: 'Nomor Surat Perintah', type: 'text', placeholder: 'Sp.Sidik/___/___/2026/Reskrim', required: true },
      { key: 'DOC_VALIDITY', label: 'Masa Berlaku', type: 'text', placeholder: 'Contoh: 30 hari', required: true },
      { key: 'DOC_DATE', label: 'Tanggal Surat', type: 'date', required: true },
      { key: 'DOC_SIGNER_ATASAN_NAME', label: 'Nama Atasan Penandatangan', type: 'select_personnel', role_filter: 'Kasat', required: true },
      { key: 'DOC_SIGNER_KANIT_NAME', label: 'Nama Kanit Penandatangan', type: 'select_personnel', role_filter: 'Kanit', required: true },
    ],
  },
  {
    id: 'tpl-001b',
    code: 'SPRIN_GAS_SIDIK',
    title: 'Surat Perintah Tugas Penyidikan',
    category: 'SURAT PERINTAH',
    description: 'Surat perintah tugas untuk melaksanakan penyidikan perkara tindak pidana oleh tim penyidik.',
    default_number_format: 'SP.Gas.Sidik/___/I/RES.0.0./2026/Satreskrim/Polres Koltim/Polda Sultra',
    dynamic_fields: [
      { key: 'DOC_NO', label: 'Nomor Surat Perintah Tugas', type: 'text', placeholder: 'SP.Gas.Sidik/___/I/RES.0.0./2026/Satreskrim/Polres Koltim/Polda Sultra', default_value: 'SP.Gas.Sidik/___/I/RES.0.0./2026/Satreskrim/Polres Koltim/Polda Sultra', required: true },
      { key: 'DOC_DATE', label: 'Tanggal Surat', type: 'date', required: true },
      { key: 'DOC_VALIDITY', label: 'Masa Berlaku', type: 'text', placeholder: 'Contoh: 30 (tiga puluh) hari', default_value: '30 (tiga puluh) hari', required: false },
      { key: 'DOC_SIGNER_ATASAN_NAME', label: 'Nama Atasan Penandatangan', type: 'select_personnel', role_filter: 'Kasat', required: true },
      { key: 'DOC_SIGNER_KANIT_NAME', label: 'Nama Kanit Penandatangan', type: 'select_personnel', role_filter: 'Kanit', required: true },
    ],
  },
  {
    id: 'tpl-002',
    code: 'SPDP',
    title: 'Surat Pemberitahuan Dimulainya Penyidikan',
    category: 'SURAT',
    description: 'Surat pemberitahuan kepada Kejaksaan bahwa penyidikan terhadap perkara telah dimulai.',
    dynamic_fields: [
      { key: 'DOC_NO', label: 'Nomor SPDP', type: 'text', placeholder: 'B/___/___/2026/Reskrim', required: true },
      { key: 'DOC_DATE', label: 'Tanggal SPDP', type: 'date', required: true },
      { key: 'DOC_LOCATION', label: 'Tempat Dikeluarkan', type: 'text', placeholder: 'Kolaka Timur', required: true },
      { key: 'DOC_TARGET', label: 'Tujuan Surat', type: 'text', placeholder: 'Kepala Kejaksaan Negeri ...', required: true },
      { key: 'DOC_TARGET_ADDR', label: 'Alamat Tujuan', type: 'textarea', placeholder: 'Alamat lengkap tujuan surat', required: true },
      { key: 'DOC_PJ_NAME', label: 'Penyidik Penanggung Jawab', type: 'select_personnel', role_filter: null, required: true },
      { key: 'DOC_PJ_PHONE', label: 'No HP Penyidik PJ', type: 'text', placeholder: '08xxxxxxxxxx', required: true },
      { key: 'DOC_SIGNER_ATASAN_NAME', label: 'Atasan Penandatangan', type: 'select_personnel', role_filter: 'Kasat', required: true },
    ],
  },
  {
    id: 'tpl-003',
    code: 'SPRIN_KAP',
    title: 'Surat Perintah Penangkapan',
    category: 'SURAT PERINTAH',
    description: 'Surat perintah untuk melakukan penangkapan terhadap tersangka.',
    dynamic_fields: [
      { key: 'DOC_NO', label: 'Nomor Surat Perintah', type: 'text', placeholder: 'Sp.Kap/___/___/2026/Reskrim', required: true },
      { key: 'DOC_DATE', label: 'Tanggal Surat', type: 'date', required: true },
      { key: 'DOC_SIGNER_ATASAN_NAME', label: 'Atasan Penandatangan', type: 'select_personnel', role_filter: 'Kasat', required: true },
    ],
  },
  {
    id: 'tpl-004',
    code: 'SPRIN_HAN',
    title: 'Surat Perintah Penahanan',
    category: 'SURAT PERINTAH',
    description: 'Surat perintah untuk melakukan penahanan terhadap tersangka.',
    dynamic_fields: [
      { key: 'DOC_NO', label: 'Nomor Surat Perintah', type: 'text', placeholder: 'Sp.Han/___/___/2026/Reskrim', required: true },
      { key: 'DOC_DATE', label: 'Tanggal Surat', type: 'date', required: true },
      { key: 'DOC_VALIDITY', label: 'Lama Penahanan', type: 'text', placeholder: 'Contoh: 20 hari', required: true },
      { key: 'DOC_LOCATION', label: 'Tempat Penahanan', type: 'text', placeholder: 'Rutan Polres Kolaka Timur', required: true },
      { key: 'DOC_SIGNER_ATASAN_NAME', label: 'Atasan Penandatangan', type: 'select_personnel', role_filter: 'Kasat', required: true },
    ],
  },
  {
    id: 'tpl-005',
    code: 'BAP_SAKSI',
    title: 'Berita Acara Pemeriksaan Saksi',
    category: 'BERITA ACARA',
    description: 'Berita acara pemeriksaan terhadap saksi dalam perkara pidana.',
    dynamic_fields: [
      { key: 'DOC_NO', label: 'Nomor BAP', type: 'text', placeholder: 'BAP/___/___/2026/Reskrim', required: true },
      { key: 'DOC_DATE', label: 'Tanggal Pemeriksaan', type: 'date', required: true },
      { key: 'DOC_LOCATION', label: 'Tempat Pemeriksaan', type: 'text', placeholder: 'Ruang Penyidik Satreskrim', required: true },
      { key: 'DOC_PJ_NAME', label: 'Penyidik Pemeriksa', type: 'select_personnel', role_filter: null, required: true },
    ],
  },
  {
    id: 'tpl-006',
    code: 'BAP_TSK',
    title: 'Berita Acara Pemeriksaan Tersangka',
    category: 'BERITA ACARA',
    description: 'Berita acara pemeriksaan terhadap tersangka dalam perkara pidana.',
    dynamic_fields: [
      { key: 'DOC_NO', label: 'Nomor BAP', type: 'text', placeholder: 'BAP/___/___/2026/Reskrim', required: true },
      { key: 'DOC_DATE', label: 'Tanggal Pemeriksaan', type: 'date', required: true },
      { key: 'DOC_LOCATION', label: 'Tempat Pemeriksaan', type: 'text', placeholder: 'Ruang Penyidik Satreskrim', required: true },
      { key: 'DOC_PJ_NAME', label: 'Penyidik Pemeriksa', type: 'select_personnel', role_filter: null, required: true },
    ],
  },
  {
    id: 'tpl-007',
    code: 'SP_TAP_TSK',
    title: 'Surat Penetapan Tersangka',
    category: 'SURAT',
    description: 'Surat penetapan status tersangka berdasarkan minimal dua alat bukti.',
    dynamic_fields: [
      { key: 'DOC_NO', label: 'Nomor Surat', type: 'text', placeholder: 'S.TAP/___/___/2026/Reskrim', required: true },
      { key: 'DOC_DATE', label: 'Tanggal Surat', type: 'date', required: true },
      { key: 'DOC_SIGNER_ATASAN_NAME', label: 'Atasan Penandatangan', type: 'select_personnel', role_filter: 'Kasat', required: true },
    ],
  },
  {
    id: 'tpl-008',
    code: 'BA_SITA',
    title: 'Berita Acara Penyitaan',
    category: 'BERITA ACARA',
    description: 'Berita acara penyitaan barang bukti dalam perkara pidana.',
    dynamic_fields: [
      { key: 'DOC_NO', label: 'Nomor BA', type: 'text', placeholder: 'BA.Sita/___/___/2026/Reskrim', required: true },
      { key: 'DOC_DATE', label: 'Tanggal Penyitaan', type: 'date', required: true },
      { key: 'DOC_LOCATION', label: 'Tempat Penyitaan', type: 'text', required: true },
      { key: 'DOC_PJ_NAME', label: 'Penyidik Pelaksana', type: 'select_personnel', role_filter: null, required: true },
    ],
  },
];

// Helper: get templates by category
export function getTemplatesByCategory(category) {
  return mockTemplates.filter((t) => t.category === category);
}

// Helper: get template by code
export function getTemplateByCode(code) {
  return mockTemplates.find((t) => t.code === code) || null;
}

// All available categories
export const templateCategories = [
  { key: 'SURAT PERINTAH', label: 'Surat Perintah', icon: 'Shield', color: 'var(--accent-red)' },
  { key: 'SURAT', label: 'Surat', icon: 'FileText', color: 'var(--accent-blue)' },
  { key: 'BERITA ACARA', label: 'Berita Acara', icon: 'ClipboardList', color: 'var(--accent-green)' },
];
