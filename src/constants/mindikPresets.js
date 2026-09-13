/**
 * Master Data Preset Dokumen Mindik Satreskrim
 * Berisi konfigurasi default fields, tipe data, status wajib, dan placeholder resmi.
 */

export const MINDIK_PRESETS = {
  SPRIN_SIDIK: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "SP.Sidik/..../I/RES.0.0/2026/Satreskrim/Polres Koltim/Polda Sultra", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "MASA_BERLAKU", label: "Masa Berlaku Surat", type: "text", default: "… Januari 2026", required: true }
  ],
  SPRIN_SIDIK_MORE_5: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "SP.Sidik/..../I/RES.0.0/2026/Satreskrim/Polres Koltim/Polda Sultra", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "MASA_BERLAKU", label: "Masa Berlaku Surat", type: "text", default: "… Januari 2026", required: true }
  ],
  SPGAS_SIDIK: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "SP.Gas.Sidik/..../I/RES.0.0/2026/Satreskrim/Polres Koltim/Polda Sultra", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "MASA_BERLAKU", label: "Masa Berlaku Surat", type: "text", default: "… Januari 2026", required: true }
  ],
  SPGAS_SIDIK_MORE_5: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "SP.Gas.Sidik/..../I/RES.0.0/2026/Satreskrim/Polres Koltim/Polda Sultra", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "MASA_BERLAKU", label: "Masa Berlaku Surat", type: "text", default: "… Januari 2026", required: true }
  ],
  SPRIN_SIDIK_TAMBAHAN: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "SP.Sidik.Tambahan/.... .a/I/RES.0.0/2026/Satreskrim/Polres Koltim/Polda Sultra", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "MASA_BERLAKU", label: "Masa Berlaku Surat", type: "text", default: "… Januari 2026", required: true }
  ],
  SPGAS_SIDIK_TAMBAHAN: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "SP.Gas.Sidik.Tambahan/.... .a/I/RES.0.0/2026/Satreskrim/Polres Koltim/Polda Sultra", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "MASA_BERLAKU", label: "Masa Berlaku Surat", type: "text", default: "… Januari 2026", required: true }
  ],
  SPRIN_SIDIK_LANJUTAN: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "SP.Sidik.Lanjutan/.... .a/I/RES.0.0/2026/Satreskrim/Polres Koltim/Polda Sultra", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "MASA_BERLAKU", label: "Masa Berlaku Surat", type: "text", default: "… Januari 2026", required: true }
  ],
  SPGAS_SIDIK_LANJUTAN: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "SP.Gas.Sidik.Lanjutan/.... .a/I/RES.0.0/2026/Satreskrim/Polres Koltim/Polda Sultra", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "MASA_BERLAKU", label: "Masa Berlaku Surat", type: "text", default: "… Januari 2026", required: true }
  ],
  SPGL_SAKSI_1: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "S.Pgl/Saksi.1/..../I/RES.0.0./2026/Satreskrim/Polres Koltim/Polda Sultra", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "NAMA_SAKSI", label: "Nama Saksi", type: "text", default: "…....", required: true },
    { tag: "KERJA_SAKSI", label: "Pekerjaan Saksi", type: "text", default: "…....", required: true },
    { tag: "ALAMAT_SAKSI", label: "Alamat Saksi", type: "text", default: "…....", required: true },
    { tag: "TANGGAL_PANGGILAN", label: "Tanggal Panggilan", type: "date", default: "... Januari 2026", required: true },
    { tag: "HARI_PANGGILAN", label: "Hari Panggilan", type: "text", default: "Senin", required: true },
    { tag: "JAM_PANGGILAN", label: "Jam Panggilan", type: "text", default: "09.00 WITA", required: true },
    { tag: "TEMPAT_PANGGILAN", label: "Tempat Menghadap", type: "text", default: "ruangan Unit I Pidum Satreskrim Polres Kolaka Timur Jln. Muh. Nur Latamoro No. 115, Kelurahan Rate-Rate Kecamatan Tirawuta Kabupaten Kolaka Timur", required: true },
    { tag: "MENEMUI_SIAPA", label: "Menghadap Kepada", type: "text", default: "BRIPKA MUH. ABDIANSYAH DANIAL, S.H.", required: true }
  ],
  SPGL_TSK_1: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "S.Pgl/Tsk.1/..../I/RES.0.0./2026/Satreskrim/Polres Koltim/Polda Sultra", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "NAMA_TSK", label: "Nama Tersangka", type: "text", default: "…....", required: true },
    { tag: "KERJA_TSK", label: "Pekerjaan Tersangka", type: "text", default: "…....", required: true },
    { tag: "ALAMAT_TSK", label: "Alamat Tersangka", type: "text", default: "…....", required: true },
    { tag: "TANGGAL_PANGGILAN", label: "Tanggal Panggilan", type: "date", default: "... Januari 2026", required: true },
    { tag: "HARI_PANGGILAN", label: "Hari Panggilan", type: "text", default: "Senin", required: true },
    { tag: "JAM_PANGGILAN", label: "Jam Panggilan", type: "text", default: "09.00 WITA", required: true },
    { tag: "TEMPAT_PANGGILAN", label: "Tempat Menghadap", type: "text", default: "ruangan Unit I Pidum Satreskrim Polres Kolaka Timur Jln. Muh. Nur Latamoro No. 115, Kelurahan Rate-Rate Kecamatan Tirawuta Kabupaten Kolaka Timur", required: true },
    { tag: "MENEMUI_SIAPA", label: "Menghadap Kepada", type: "text", default: "BRIPKA MUH. ABDIANSYAH DANIAL, S.H.", required: true }
  ],
  SPGL_SAKSI_2: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "S.Pgl/Saksi.2/..../I/RES.0.0./2026/Satreskrim/Polres Koltim/Polda Sultra", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "NAMA_SAKSI", label: "Nama Saksi", type: "text", default: "…....", required: true },
    { tag: "KERJA_SAKSI", label: "Pekerjaan Saksi", type: "text", default: "…....", required: true },
    { tag: "ALAMAT_SAKSI", label: "Alamat Saksi", type: "text", default: "…....", required: true },
    { tag: "TANGGAL_PANGGILAN", label: "Tanggal Panggilan", type: "date", default: "... Januari 2026", required: true },
    { tag: "HARI_PANGGILAN", label: "Hari Panggilan", type: "text", default: "Senin", required: true },
    { tag: "JAM_PANGGILAN", label: "Jam Panggilan", type: "text", default: "09.00 WITA", required: true },
    { tag: "TEMPAT_PANGGILAN", label: "Tempat Menghadap", type: "text", default: "ruangan Unit I Pidum Satreskrim Polres Kolaka Timur Jln. Muh. Nur Latamoro No. 115, Kelurahan Rate-Rate Kecamatan Tirawuta Kabupaten Kolaka Timur", required: true },
    { tag: "MENEMUI_SIAPA", label: "Menghadap Kepada", type: "text", default: "BRIPKA MUH. ABDIANSYAH DANIAL, S.H.", required: true }
  ],
  SPGL_TSK_2: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "S.Pgl/Tsk.2/..../I/RES.0.0./2026/Satreskrim/Polres Koltim/Polda Sultra", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "NAMA_TSK", label: "Nama Tersangka", type: "text", default: "…....", required: true },
    { tag: "KERJA_TSK", label: "Pekerjaan Tersangka", type: "text", default: "…....", required: true },
    { tag: "ALAMAT_TSK", label: "Alamat Tersangka", type: "text", default: "…....", required: true },
    { tag: "TANGGAL_PANGGILAN", label: "Tanggal Panggilan", type: "date", default: "... Januari 2026", required: true },
    { tag: "HARI_PANGGILAN", label: "Hari Panggilan", type: "text", default: "Senin", required: true },
    { tag: "JAM_PANGGILAN", label: "Jam Panggilan", type: "text", default: "09.00 WITA", required: true },
    { tag: "TEMPAT_PANGGILAN", label: "Tempat Menghadap", type: "text", default: "ruangan Unit I Pidum Satreskrim Polres Kolaka Timur Jln. Muh. Nur Latamoro No. 115, Kelurahan Rate-Rate Kecamatan Tirawuta Kabupaten Kolaka Timur", required: true },
    { tag: "MENEMUI_SIAPA", label: "Menghadap Kepada", type: "text", default: "BRIPKA MUH. ABDIANSYAH DANIAL, S.H.", required: true }
  ],
  HAK_KORBAN: [
    { tag: "HARI_BA", label: "Hari Berita Acara", type: "text", default: "…......", required: true },
    { tag: "TANGGAL_BA", label: "Tanggal Berita Acara", type: "text", default: "…......", required: true },
    { tag: "BULAN_BA", label: "Bulan Berita Acara", type: "text", default: "…......", required: true },
    { tag: "TAHUN_BA", label: "Tahun Berita Acara", type: "text", default: "2026", required: true },
    { tag: "JAM_BA", label: "Jam Berita Acara", type: "text", default: "…......", required: true },
    { tag: "NAMA_SAKSI_1_BA", label: "Saksi 1 - Nama", type: "text", default: "…......", required: true },
    { tag: "ALAMAT_SAKSI_1_BA", label: "Saksi 1 - Alamat", type: "text", default: "…......", required: true },
    { tag: "KERJA_SAKSI_1_BA", label: "Saksi 1 - Pekerjaan", type: "text", default: "…......", required: true },
    { tag: "NAMA_SAKSI_2_BA", label: "Saksi 2 - Nama", type: "text", default: "…......", required: true },
    { tag: "ALAMAT_SAKSI_2_BA", label: "Saksi 2 - Alamat", type: "text", default: "Aspolres Kolaka Timur", required: true },
    { tag: "KERJA_SAKSI_2_BA", label: "Saksi 2 - Pekerjaan", type: "text", default: "Polri", required: true }
  ],
  HAK_PEREMPUAN: [
    { tag: "HARI_BA", label: "Hari Berita Acara", type: "text", default: "…......", required: true },
    { tag: "TANGGAL_BA", label: "Tanggal Berita Acara", type: "text", default: "…......", required: true },
    { tag: "BULAN_BA", label: "Bulan Berita Acara", type: "text", default: "…......", required: true },
    { tag: "TAHUN_BA", label: "Tahun Berita Acara", type: "text", default: "2026", required: true },
    { tag: "JAM_BA", label: "Jam Berita Acara", type: "text", default: "…......", required: true },
    { tag: "NAMA_SAKSI_1_BA", label: "Saksi 1 - Nama", type: "text", default: "…......", required: true },
    { tag: "ALAMAT_SAKSI_1_BA", label: "Saksi 1 - Alamat", type: "text", default: "…......", required: true },
    { tag: "KERJA_SAKSI_1_BA", label: "Saksi 1 - Pekerjaan", type: "text", default: "…......", required: true },
    { tag: "NAMA_SAKSI_2_BA", label: "Saksi 2 - Nama", type: "text", default: "…......", required: true },
    { tag: "ALAMAT_SAKSI_2_BA", label: "Saksi 2 - Alamat", type: "text", default: "Aspolres Kolaka Timur", required: true },
    { tag: "KERJA_SAKSI_2_BA", label: "Saksi 2 - Pekerjaan", type: "text", default: "Polri", required: true }
  ],
  HAK_SAKSI: [
    { tag: "HARI_BA", label: "Hari Berita Acara", type: "text", default: "…......", required: true },
    { tag: "TANGGAL_BA", label: "Tanggal Berita Acara", type: "text", default: "…......", required: true },
    { tag: "BULAN_BA", label: "Bulan Berita Acara", type: "text", default: "…......", required: true },
    { tag: "TAHUN_BA", label: "Tahun Berita Acara", type: "text", default: "2026", required: true },
    { tag: "JAM_BA", label: "Jam Berita Acara", type: "text", default: "…......", required: true },
    { tag: "NAMA_SAKSI_1_BA", label: "Saksi 1 - Nama", type: "text", default: "…......", required: true },
    { tag: "ALAMAT_SAKSI_1_BA", label: "Saksi 1 - Alamat", type: "text", default: "…......", required: true },
    { tag: "KERJA_SAKSI_1_BA", label: "Saksi 1 - Pekerjaan", type: "text", default: "…......", required: true },
    { tag: "NAMA_SAKSI_2_BA", label: "Saksi 2 - Nama", type: "text", default: "…......", required: true },
    { tag: "ALAMAT_SAKSI_2_BA", label: "Saksi 2 - Alamat", type: "text", default: "Aspolres Kolaka Timur", required: true },
    { tag: "KERJA_SAKSI_2_BA", label: "Saksi 2 - Pekerjaan", type: "text", default: "Polri", required: true }
  ],
  SPRIN_BAWA_SAKSI_DAN_BA: [
    { tag: "NOMOR_SURAT", label: "Sprin - Nomor Surat", type: "text", default: "SP.Bawa.Saksi/......../I/RES.0.0./2026/Satreskrim/Polres Koltim/Polda Sultra", required: true },
    { tag: "TANGGAL_SURAT", label: "Sprin - Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Sprin - Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "MASA_BERLAKU", label: "Sprin - Masa Berlaku Surat", type: "text", default: "… Januari 2026", required: true },
    { tag: "HARI_BA_BAWA", label: "BA - Hari Berita Acara", type: "text", default: "…......", required: true },
    { tag: "TANGGAL_BA_BAWA", label: "BA - Tanggal Berita Acara", type: "text", default: "…......", required: true },
    { tag: "BULAN_BA_BAWA", label: "BA - Bulan Berita Acara", type: "text", default: "…......", required: true },
    { tag: "TAHUN_BA_BAWA", label: "BA - Tahun Berita Acara", type: "text", default: "2026", required: true },
    { tag: "JAM_BA_BAWA", label: "BA - Jam Berita Acara", type: "text", default: "…......", required: true }
  ],
  BA_CARI_SAKSI: [
    { tag: "HARI_BA", label: "Hari Berita Acara", type: "text", default: "…......", required: true },
    { tag: "TANGGAL_BA", label: "Tanggal Berita Acara", type: "text", default: "…......", required: true },
    { tag: "BULAN_BA", label: "Bulan Berita Acara", type: "text", default: "…......", required: true },
    { tag: "TAHUN_BA", label: "Tahun Berita Acara", type: "text", default: "2026", required: true },
    { tag: "JAM_BA", label: "Jam Berita Acara", type: "text", default: "…......", required: true }
  ],
  SPRIN_BAWA_TSK_DAN_BA: [
    { tag: "NOMOR_SURAT", label: "Sprin - Nomor Surat", type: "text", default: "SP.Bawa.Tsk/......../I/RES.0.0./2026/Satreskrim/Polres Koltim/Polda Sultra", required: true },
    { tag: "TANGGAL_SURAT", label: "Sprin - Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Sprin - Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "MASA_BERLAKU", label: "Sprin - Masa Berlaku Surat", type: "text", default: "… Januari 2026", required: true },
    { tag: "HARI_BA_BAWA", label: "BA - Hari Berita Acara", type: "text", default: "…......", required: true },
    { tag: "TANGGAL_BA_BAWA", label: "BA - Tanggal Berita Acara", type: "text", default: "…......", required: true },
    { tag: "BULAN_BA_BAWA", label: "BA - Bulan Berita Acara", type: "text", default: "…......", required: true },
    { tag: "TAHUN_BA_BAWA", label: "BA - Tahun Berita Acara", type: "text", default: "2026", required: true },
    { tag: "JAM_BA_BAWA", label: "BA - Jam Berita Acara", type: "text", default: "…......", required: true }
  ],
  SPRIN_SITA_UMUM: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "SP.Sita/...../I/RES.0.0/2026/Satreskrim/Polres Koltim/Polda Sultra", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "MASA_BERLAKU", label: "Masa Berlaku Surat", type: "text", default: "… Januari 2026", required: true }
  ],
  SPRIN_BUNGKUS_SEGEL: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "SP.Sita/Bungkus.Segel/        /I/RES.0.0./2026/Satreskrim/Polres Koltim/Polda Sultra", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "MASA_BERLAKU", label: "Masa Berlaku Surat", type: "text", default: "… Januari 2026", required: true }
  ],
  IZIN_SITA_PN_LEBIH_1: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "B/….../I/RES.0.0./2026/Satreskrim", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "TUJUAN_SURAT", label: "Tujuan Surat", type: "text", default: "KETUA PENGADILAN NEGERI KOLAKA", required: true },
    { tag: "ALAMAT_TUJUAN", label: "Alamat Surat", type: "text", default: "Kolaka", required: true }
  ],
  IZIN_SITA_PN: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "B/….../I/RES.0.0./2026/Satreskrim", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "TUJUAN_SURAT", label: "Tujuan Surat", type: "text", default: "KETUA PENGADILAN NEGERI KOLAKA", required: true },
    { tag: "ALAMAT_TUJUAN", label: "Alamat Surat", type: "text", default: "Kolaka", required: true }
  ],
  MOHON_TITIP_RAWAT_BB: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "B/….../I/RES.0.0./2026/Satreskrim", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "TUJUAN_SURAT", label: "Tujuan Surat", type: "text", default: "KEPALA KEJAKSAAN NEGERI KOLAKA", required: true },
    { tag: "ALAMAT_TUJUAN", label: "Alamat Surat", type: "text", default: "Kolaka", required: true }
  ],
  SPRIN_TITIP_RAWAT_BB: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "SP.Sita/Titip.Rawat/...... .a/I/RES.0.0./2026/Satreskrim/Polres Koltim/Polda Sultra", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "MASA_BERLAKU", label: "Masa Berlaku Surat", type: "text", default: "... Januari 2026", required: true }
  ],
  TAP_TSK: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "S.Tap.Tsk/..../I/RES.0.0/2026/Satreskrim/Polres Koltim/Polda Sultra", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Penetapan", type: "text", default: "Tirawuta", required: true },
    { tag: "TGL_RESUME", label: "Tanggal Resume", type: "date", default: "... Januari 2026", required: true },
    { tag: "TANGGAL_GELAR_PERKARA", label: "Tanggal Gelar Perkara", type: "date", default: "... Januari 2026", required: true }
  ],
  PEMBERITAHUAN_TAP_TSK: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "B/….../I/RES.0.0./2026/Satreskrim", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "TUJUAN_SURAT", label: "Tujuan Surat", type: "text", default: "….... (SELAKU TERSANGKA)", required: true },
    { tag: "ALAMAT_TUJUAN", label: "Alamat Surat", type: "text", default: "Tempat", required: true }
  ],
  PEMBERITAHUAN_TAP_TSK_JPU: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "B/….../I/RES.0.0./2026/Satreskrim", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "TUJUAN_SURAT", label: "Tujuan Surat", type: "text", default: "KEPALA KEJAKSAAN NEGERI KOLAKA", required: true },
    { tag: "ALAMAT_TUJUAN", label: "Alamat Surat", type: "text", default: "Kolaka", required: true }
  ],
  SPDP_TSK: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "B/SPDP/….../I/RES.0.0./2026/Satreskrim", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "TUJUAN_SURAT", label: "Tujuan Surat", type: "text", default: "KEPALA KEJAKSAAN NEGERI KOLAKA", required: true },
    { tag: "ALAMAT_TUJUAN", label: "Alamat Surat", type: "text", default: "Kolaka", required: true }
  ],
  SPDP_MORE_1_TSK: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "B/SPDP/….../I/RES.0.0./2026/Satreskrim", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "TUJUAN_SURAT", label: "Tujuan Surat", type: "text", default: "KEPALA KEJAKSAAN NEGERI KOLAKA", required: true },
    { tag: "ALAMAT_TUJUAN", label: "Alamat Surat", type: "text", default: "Kolaka", required: true }
  ],
  SPDP_TERLAPOR: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "B/SPDP/….../I/RES.0.0./2026/Satreskrim", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "TUJUAN_SURAT", label: "Tujuan Surat", type: "text", default: "KEPALA KEJAKSAAN NEGERI KOLAKA", required: true },
    { tag: "ALAMAT_TUJUAN", label: "Alamat Surat", type: "text", default: "Kolaka", required: true }
  ],
  SPDP_LIDIK_ANON: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "B/SPDP/….../I/RES.0.0./2026/Satreskrim", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "TUJUAN_SURAT", label: "Tujuan Surat", type: "text", default: "KEPALA KEJAKSAAN NEGERI KOLAKA", required: true },
    { tag: "ALAMAT_TUJUAN", label: "Alamat Surat", type: "text", default: "Kolaka", required: true }
  ],
  SPDP_KORPORASI: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "B/SPDP/….../I/RES.0.0./2026/Satreskrim", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "TUJUAN_SURAT", label: "Tujuan Surat", type: "text", default: "KEPALA KEJAKSAAN NEGERI KOLAKA", required: true },
    { tag: "ALAMAT_TUJUAN", label: "Alamat Surat", type: "text", default: "Kolaka", required: true }
  ],
  PENGIRIMAN_KEMBALI_SPDP_P20: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "B/SPDP/….../I/RES.0.0./2026/Satreskrim", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "TUJUAN_SURAT", label: "Tujuan Surat", type: "text", default: "KEPALA KEJAKSAAN NEGERI KOLAKA", required: true },
    { tag: "ALAMAT_TUJUAN", label: "Alamat Surat", type: "text", default: "Kolaka", required: true }
  ],
  SPRIN_KAP_DAN_BA: [
    { tag: "NOMOR_SURAT", label: "Sprin - Nomor Surat", type: "text", default: "SP.Kap/......./I/RES.0.0/2026/Satreskrim/Polres Koltim/Polda Sultra", required: true },
    { tag: "TANGGAL_SURAT", label: "Sprin - Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Sprin - Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "MASA_BERLAKU", label: "Sprin - Masa Berlaku Kap", type: "text", default: "... Januari 2026", required: true },
    { tag: "HARI_KAP", label: "BA - Hari BA KAP", type: "text", default: "…......", required: true },
    { tag: "TANGGAL_KAP", label: "BA - Tanggal BA KAP", type: "text", default: "…......", required: true },
    { tag: "BULAN_KAP", label: "BA - Bulan BA KAP", type: "text", default: "…......", required: true },
    { tag: "TAHUN_KAP", label: "BA - Tahun BA KAP", type: "text", default: "2026", required: true },
    { tag: "JAM_KAP", label: "BA - Jam BA KAP", type: "text", default: "…......", required: true },
    { tag: "TEMPAT_KAP", label: "BA - Tempat Penangkapan", type: "text", default: "…......", required: true },
    { tag: "WAKTU_KAP", label: "BA - Waktu Penangkapan", type: "text", default: "Hari ........ tanggal ........., sekitar Pukul ........ WITA", required: true }
  ],
  SPGAS_KAP: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "SP.Gas.Kap/......./I/RES.0.0/2026/Satreskrim/Polres Koltim/Polda Sultra", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "MASA_BERLAKU", label: "Masa Berlaku Kap", type: "text", default: "… Januari 2026", required: true }
  ],
  SPRIN_BAWA_LEWAT_KAP: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "SP.Bawa.Hadap/......./I/RES.0.0/2026/Satreskrim/Polres Koltim/Polda Sultra", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "MASA_BERLAKU", label: "Masa Berlaku Surat", type: "text", default: "… Januari 2026", required: true }
  ],
  BA_HAK_TSK: [
    { tag: "HARI_BA", label: "Hari Berita Acara", type: "text", default: "…......", required: true },
    { tag: "TANGGAL_BA", label: "Tanggal Berita Acara", type: "text", default: "…......", required: true },
    { tag: "BULAN_BA", label: "Bulan Berita Acara", type: "text", default: "…......", required: true },
    { tag: "TAHUN_BA", label: "Tahun Berita Acara", type: "text", default: "2026", required: true },
    { tag: "JAM_BA", label: "Jam Berita Acara", type: "text", default: "…......", required: true },
    { tag: "NAMA_SAKSI_1_BA", label: "Saksi 1 - Nama", type: "text", default: "…......", required: true },
    { tag: "ALAMAT_SAKSI_1_BA", label: "Saksi 1 - Alamat", type: "text", default: "…......", required: true },
    { tag: "KERJA_SAKSI_1_BA", label: "Saksi 1 - Pekerjaan", type: "text", default: "…......", required: true },
    { tag: "NAMA_SAKSI_2_BA", label: "Saksi 2 - Nama", type: "text", default: "…......", required: true },
    { tag: "ALAMAT_SAKSI_2_BA", label: "Saksi 2 - Alamat", type: "text", default: "Aspolres Kolaka Timur", required: true },
    { tag: "KERJA_SAKSI_2_BA", label: "Saksi 2 - Pekerjaan", type: "text", default: "Polri", required: true }
  ],
  SPRIN_LEPAS_KAP_DAN_BA: [
    { tag: "NOMOR_SURAT", label: "Sprin - Nomor Surat", type: "text", default: "SP.Kap.Lepas/......./I/RES.0.0/2026/Satreskrim/Polres Koltim/Polda Sultra", required: true },
    { tag: "TANGGAL_SURAT", label: "Sprin - Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Sprin - Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "SAAT_PENANGKAPAN", label: "Sprin - Waktu Ditangkap", type: "text", default: "... Januari 2026, Pukul …. WITA", required: true },
    { tag: "HARI_BA", label: "BA - Hari Berita Acara", type: "text", default: "…......", required: true },
    { tag: "TANGGAL_BA", label: "BA - Tanggal Berita Acara", type: "text", default: "…......", required: true },
    { tag: "BULAN_BA", label: "BA - Bulan Berita Acara", type: "text", default: "…......", required: true },
    { tag: "TAHUN_BA", label: "BA - Tahun Berita Acara", type: "text", default: "2026", required: true },
    { tag: "JAM_BA", label: "BA - Jam Berita Acara", type: "text", default: "…......", required: true }
  ],
  VER_LUKA: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "B/VER/      /I/RES.0.0./2026/Satreskrim", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "TUJUAN_SURAT", label: "Tujuan Surat", type: "text", default: "KEPALA PUSKESMAS .....", required: true },
    { tag: "ALAMAT_TUJUAN", label: "Alamat Surat", type: "text", default: "Tempat", required: true },
    { tag: "WAKTU_LAPOR", label: "Waktu Laporan", type: "text", default: "Hari ...... tanggal ...... 2026, Pukul ...... WITA", required: true },
    { tag: "KONDISI_KORBAN", label: "Kondisi yang Dialami", type: "text", default: "[pada bagian/berupa*] ……… akibat tindakan ……… yang ia alami pada tanggal ……. bertempat di …… yang diduga dilakukan oleh terlapor …….", required: true },
    { tag: "PETUGAS_PENERIMA", label: "Nama Petugas Penerima", type: "text", default: "….....................", required: true }
  ],
  VER_PSIKIATRI: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "B/VER/      /I/RES.0.0./2026/Satreskrim", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "TUJUAN_SURAT", label: "Tujuan Surat", type: "text", default: "DIREKTUR RUMAH SAKIT JIWA PROVINSI SULAWESI TENGGARA", required: true },
    { tag: "ALAMAT_TUJUAN", label: "Alamat Surat", type: "text", default: "Tempat", required: true },
    { tag: "WAKTU_LAPOR", label: "Waktu Laporan", type: "text", default: "Hari ...... tanggal ...... 2026, Pukul ...... WITA", required: true },
    { tag: "KONDISI_KORBAN", label: "Kondisi yang Dialami", type: "text", default: "tindakan ……… yang ia alami pada tanggal ……. bertempat di …… yang diduga dilakukan oleh terlapor …….", required: true },
    { tag: "PETUGAS_PENERIMA", label: "Nama Petugas Penerima", type: "text", default: "….....................", required: true }
  ],
  SPRIN_HAN_DAN_BA: [
    { tag: "NOMOR_SURAT", label: "Sprin - Nomor Surat", type: "text", default: "SP.Han/......./I/RES.0.0/2026/Satreskrim/Polres Koltim/Polda Sultra", required: true },
    { tag: "TANGGAL_SURAT", label: "Sprin - Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Sprin - Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "TEMPAT_HAN", label: "Sprin - Tempat Penahanan", type: "text", default: "rumah tahanan Negara ..... cabang ..... (Satker)", required: true },
    { tag: "TGL_MULAI_HAN", label: "Sprin - Mulai Ditahan", type: "date", default: "... Januari 2026", required: true },
    { tag: "TGL_AKHIR_HAN", label: "Sprin - Akhir Ditahan", type: "date", default: "... Januari 2026", required: true },
    { tag: "HARI_HAN", label: "BA - Hari BA HAN", type: "text", default: "…......", required: true },
    { tag: "TANGGAL_HAN", label: "BA - Tanggal BA HAN", type: "text", default: "…......", required: true },
    { tag: "BULAN_HAN", label: "BA - Bulan BA HAN", type: "text", default: "…......", required: true },
    { tag: "TAHUN_HAN", label: "BA - Tahun BA HAN", type: "text", default: "2026", required: true },
    { tag: "JAM_HAN", label: "BA - Jam BA HAN", type: "text", default: "…......", required: true },
    { tag: "WAKTU_HAN", label: "BA - Waktu Penahanan", type: "text", default: "hari ……. tanggal ………., sekitar Pukul ……. WITA", required: true }
  ],
  MINTA_PANJANG_HAN_40_KN: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "B/PU/      /I/RES.0.0./2026/Satreskrim", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "TUJUAN_SURAT", label: "Tujuan Surat", type: "text", default: "KEPALA KEJAKSAAN NEGERI KOLAKA", required: true },
    { tag: "ALAMAT_TUJUAN", label: "Alamat Surat", type: "text", default: "Kolaka", required: true },
    { tag: "TGL_AKHIR_HAN_PENYIDIK", label: "Tgl Akhir Penahanan Penyidik", type: "date", default: "… Januari 2026", required: true },
    { tag: "TEMPAT_HAN", label: "Tempat Penahanan", type: "text", default: "rumah tahanan Negara ..... cabang ..... (Satker)", required: true },
    { tag: "TGL_MULAI_JANG_HAN_PU", label: "Mulai Panjang PU", type: "date", default: "... Januari 2026", required: true },
    { tag: "TGL_AKHIR_HAN_PU", label: "Akhir Panjang PU", type: "date", default: "... Januari 2026", required: true }
  ],
  SPRIN_PANJANG_HAN_40_KN_DAN_BA: [
    { tag: "NOMOR_SURAT", label: "Sprin - Nomor Surat", type: "text", default: "SP.Panjang.Han/PU/......./I/RES.0.0/2026/Satreskrim/Polres Koltim/Polda Sultra", required: true },
    { tag: "TANGGAL_SURAT", label: "Sprin - Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "PANJANG_HAN_KN", label: "Sprin - Surat Panjang KN", type: "text", default: "B-…./P.3.12/Eoh.1/…./2026, tanggal …. Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Sprin - Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "TEMPAT_HAN", label: "Sprin - Tempat Penahanan", type: "text", default: "rumah tahanan Negara ..... cabang ..... (Satker)", required: true },
    { tag: "TGL_MULAI_JANG_HAN_PU", label: "Sprin - Mulai Panjang PU", type: "date", default: "... Januari 2026", required: true },
    { tag: "TGL_AKHIR_HAN_PU", label: "Sprin - Akhir Panjang PU", type: "date", default: "... Januari 2026", required: true },
    { tag: "HARI_HAN", label: "BA - Hari BA HAN", type: "text", default: "…......", required: true },
    { tag: "TANGGAL_HAN", label: "BA - Tanggal BA HAN", type: "text", default: "…......", required: true },
    { tag: "BULAN_HAN", label: "BA - Bulan BA HAN", type: "text", default: "…......", required: true },
    { tag: "TAHUN_HAN", label: "BA - Tahun BA HAN", type: "text", default: "2026", required: true },
    { tag: "JAM_HAN", label: "BA - Jam BA HAN", type: "text", default: "…......", required: true }
  ],
  MINTA_PANJANG_HAN_30_KPN1: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "B/PN.1/      /I/RES.0.0./2026/Satreskrim", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "TUJUAN_SURAT", label: "Tujuan Surat", type: "text", default: "KETUA PENGADILAN NEGERI KOLAKA", required: true },
    { tag: "ALAMAT_TUJUAN", label: "Alamat Surat", type: "text", default: "Kolaka", required: true },
    { tag: "TGL_AKHIR_HAN_PU", label: "Tgl Akhir Penahanan PU", type: "date", default: "… Januari 2026", required: true },
    { tag: "TEMPAT_HAN", label: "Tempat Penahanan", type: "text", default: "rumah tahanan Negara ..... cabang ..... (Satker)", required: true },
    { tag: "TGL_MULAI_JANG_HAN_PN1", label: "Mulai Panjang PN1", type: "date", default: "... Januari 2026", required: true },
    { tag: "TGL_AKHIR_HAN_PN1", label: "Akhir Panjang PN1", type: "date", default: "... Januari 2026", required: true }
  ],
  SPRIN_PANJANG_HAN_30_KPN1_DAN_BA: [
    { tag: "NOMOR_SURAT", label: "Sprin - Nomor Surat", type: "text", default: "SP.Panjang.Han/PN.1/.../I/RES.0.0/2026/Satreskrim/Polres Koltim/Polda Sultra", required: true },
    { tag: "TANGGAL_SURAT", label: "Sprin - Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "PANJANG_HAN_KN", label: "Sprin - Surat Panjang KN", type: "text", default: "B-…./P.3.12/Eoh.1/…./2026, tanggal …. Januari 2026", required: true },
    { tag: "TAP_HAN_PN_1", label: "Sprin - Surat Ketetapan PN1", type: "text", default: "…./PenPid.B-HAN/2026/PN Kka, tanggal …. Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Sprin - Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "TEMPAT_HAN", label: "Sprin - Tempat Penahanan", type: "text", default: "rumah tahanan Negara ..... cabang ..... (Satker)", required: true },
    { tag: "TGL_MULAI_JANG_HAN_PN1", label: "Sprin - Mulai Panjang PN1", type: "date", default: "... Januari 2026", required: true },
    { tag: "TGL_AKHIR_HAN_PN1", label: "Sprin - Akhir Panjang PN1", type: "date", default: "... Januari 2026", required: true },
    { tag: "HARI_HAN", label: "BA - Hari BA HAN", type: "text", default: "…......", required: true },
    { tag: "TANGGAL_HAN", label: "BA - Tanggal BA HAN", type: "text", default: "…......", required: true },
    { tag: "BULAN_HAN", label: "BA - Bulan BA HAN", type: "text", default: "…......", required: true },
    { tag: "TAHUN_HAN", label: "BA - Tahun BA HAN", type: "text", default: "2026", required: true },
    { tag: "JAM_HAN", label: "BA - Jam BA HAN", type: "text", default: "…......", required: true }
  ],
  MINTA_PANJANG_HAN_30_KPN2: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "B/PN.2/      /I/RES.0.0./2026/Satreskrim", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "TUJUAN_SURAT", label: "Tujuan Surat", type: "text", default: "KETUA PENGADILAN NEGERI KOLAKA", required: true },
    { tag: "ALAMAT_TUJUAN", label: "Alamat Surat", type: "text", default: "Kolaka", required: true },
    { tag: "TGL_AKHIR_HAN_PN1", label: "Tgl Akhir Penahanan PN1", type: "date", default: "… Januari 2026", required: true },
    { tag: "TEMPAT_HAN", label: "Tempat Penahanan", type: "text", default: "rumah tahanan Negara ..... cabang ..... (Satker)", required: true },
    { tag: "TGL_MULAI_JANG_HAN_PN2", label: "Mulai Panjang PN2", type: "date", default: "... Januari 2026", required: true },
    { tag: "TGL_AKHIR_HAN_PN2", label: "Akhir Panjang PN2", type: "date", default: "... Januari 2026", required: true }
  ],
  SPRIN_PANJANG_HAN_30_KPN2_DAN_BA: [
    { tag: "NOMOR_SURAT", label: "Sprin - Nomor Surat", type: "text", default: "SP.Panjang.Han/PN.2/.../I/RES.0.0/2026/Satreskrim/Polres Koltim/Polda Sultra", required: true },
    { tag: "TANGGAL_SURAT", label: "Sprin - Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "PANJANG_HAN_KN", label: "Sprin - Surat Panjang KN", type: "text", default: "B-…./P.3.12/Eoh.1/…./2026, tanggal …. Januari 2026", required: true },
    { tag: "TAP_HAN_PN_1", label: "Sprin - Surat Panjang PN1", type: "text", default: "…./PenPid.B-HAN/2026/PN Kka, tanggal …. Januari 2026", required: true },
    { tag: "TAP_HAN_PN_2", label: "Sprin - Surat Panjang PN2", type: "text", default: "…./PenPid.B-HAN/2026/PN Kka, tanggal …. Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Sprin - Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "TEMPAT_HAN", label: "Sprin - Tempat Penahanan", type: "text", default: "rumah tahanan Negara ..... cabang ..... (Satker)", required: true },
    { tag: "TGL_MULAI_JANG_HAN_PN2", label: "Sprin - Mulai Panjang PN2", type: "date", default: "... Januari 2026", required: true },
    { tag: "TGL_AKHIR_HAN_PN2", label: "Sprin - Akhir Panjang PN2", type: "date", default: "... Januari 2026", required: true },
    { tag: "HARI_HAN", label: "BA - Hari BA HAN", type: "text", default: "…......", required: true },
    { tag: "TANGGAL_HAN", label: "BA - Tanggal BA HAN", type: "text", default: "…......", required: true },
    { tag: "BULAN_HAN", label: "BA - Bulan BA HAN", type: "text", default: "…......", required: true },
    { tag: "TAHUN_HAN", label: "BA - Tahun BA HAN", type: "text", default: "2026", required: true },
    { tag: "JAM_HAN", label: "BA - Jam BA HAN", type: "text", default: "…......", required: true }
  ],
  SAMPUL_BERKAS_PERKARA: [
    { tag: "NOMOR_SURAT", label: "Nomor Berkas Perkara", type: "text", default: "BP/..../I/RES.0.0./2026/Satreskrim/Polres Koltim/Polda Sultra", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Pembuatan", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "URAIAN_PERKARA", label: "Uraian Singkat Perkara", type: "text", default: "Telah terjadi dugaan Tindak Pidana …........", required: true }
  ],
  PENGANTAR_BP_TAHAP1: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "B/      /I/RES.0.0./2026/Satreskrim", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "TUJUAN_SURAT", label: "Tujuan Surat", type: "text", default: "KEPALA KEJAKSAAN NEGERI KOLAKA", required: true },
    { tag: "ALAMAT_TUJUAN", label: "Alamat Surat", type: "text", default: "Kolaka", required: true },
    { tag: "TEMPAT_HAN", label: "Tempat Penahanan", type: "text", default: "rumah tahanan Negara ..... cabang ..... (Satker)", required: true }
  ],
  TANDA_TERIMA_TAHAP1: [
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Kolaka", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "… Januari 2026", required: true }
  ],
  PENGANTAR_BP_KEMBALI_P19: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "B/      .a/I/RES.0.0./2026/Satreskrim", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "TUJUAN_SURAT", label: "Tujuan Surat", type: "text", default: "KEPALA KEJAKSAAN NEGERI KOLAKA", required: true },
    { tag: "ALAMAT_TUJUAN", label: "Alamat Surat", type: "text", default: "Kolaka", required: true },
    { tag: "TEMPAT_HAN", label: "Tempat Penahanan", type: "text", default: "rumah tahanan Negara ..... cabang ..... (Satker)", required: true },
    { tag: "SURAT_P19", label: "Nomor P19 KN", type: "text", default: "B-......../P.3.12/Ft.1/01/2026, tanggal …. Januari 2026", required: true }
  ],
  TANDA_TERIMA_KEMBALI_P19: [
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Kolaka", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "… Januari 2026", required: true }
  ],
  PENGANTAR_TAHAP2: [
    { tag: "NOMOR_SURAT", label: "Nomor Surat", type: "text", default: "B/      .b/I/RES.0.0./2026/Satreskrim", required: true },
    { tag: "TANGGAL_SURAT", label: "Tanggal Surat", type: "date", default: "... Januari 2026", required: true },
    { tag: "TEMPAT_SURAT", label: "Tempat Dikeluarkan", type: "text", default: "Tirawuta", required: true },
    { tag: "TUJUAN_SURAT", label: "Tujuan Surat", type: "text", default: "KEPALA KEJAKSAAN NEGERI KOLAKA", required: true },
    { tag: "ALAMAT_TUJUAN", label: "Alamat Surat", type: "text", default: "Kolaka", required: true },
    { tag: "TEMPAT_HAN", label: "Tempat Penahanan", type: "text", default: "rumah tahanan Negara ..... cabang ..... (Satker)", required: true },
    { tag: "NO_P21_KN", label: "Nomor P21 KN", type: "text", default: "B-......../P.3.12/Ft.1/01/2026, tanggal …. Januari 2026", required: true }
  ]
};

/**
 * Daftar Judul Otomatis untuk Setiap Kode Preset Mindik
 */
export const MINDIK_PRESET_TITLES = {
  SPRIN_SIDIK: "Surat Perintah Penyidikan (Sprin.Sidik)",
  SPRIN_SIDIK_MORE_5: "Surat Perintah Penyidikan (Lebih dari 5 Penyidik)",
  SPGAS_SIDIK: "Surat Perintah Tugas Penyidikan (SP.Gas.Sidik)",
  SPGAS_SIDIK_MORE_5: "Surat Perintah Tugas Penyidikan (Lebih dari 5 Penyidik)",
  SPRIN_SIDIK_TAMBAHAN: "Surat Perintah Penyidikan Tambahan",
  SPGAS_SIDIK_TAMBAHAN: "Surat Perintah Tugas Penyidikan Tambahan",
  SPRIN_SIDIK_LANJUTAN: "Surat Perintah Penyidikan Lanjutan",
  SPGAS_SIDIK_LANJUTAN: "Surat Perintah Tugas Penyidikan Lanjutan",
  SPGL_SAKSI_1: "Surat Panggilan Saksi Ke-1",
  SPGL_TSK_1: "Surat Panggilan Tersangka Ke-1",
  SPGL_SAKSI_2: "Surat Panggilan Saksi Ke-2",
  SPGL_TSK_2: "Surat Panggilan Tersangka Ke-2",
  HAK_KORBAN: "Berita Acara Pemberitahuan Hak Korban",
  HAK_PEREMPUAN: "Berita Acara Pemberitahuan Hak Perempuan",
  HAK_SAKSI: "Berita Acara Pemberitahuan Hak Saksi",
  SPRIN_BAWA_SAKSI_DAN_BA: "Surat Perintah Membawa Saksi dan Berita Acara",
  BA_CARI_SAKSI: "Berita Acara Pencarian Saksi",
  SPRIN_BAWA_TSK_DAN_BA: "Surat Perintah Membawa Tersangka dan Berita Acara",
  SPRIN_SITA_UMUM: "Surat Perintah Penyitaan Umum",
  SPRIN_BUNGKUS_SEGEL: "Surat Perintah Pembungkusan & Penyegelan Barang Bukti",
  IZIN_SITA_PN_LEBIH_1: "Permohonan Izin Sita ke Pengadilan Negeri (> 1 Tersangka)",
  IZIN_SITA_PN: "Permohonan Izin Sita ke Pengadilan Negeri",
  MOHON_TITIP_RAWAT_BB: "Permohonan Penitipan / Perawatan Barang Bukti",
  SPRIN_TITIP_RAWAT_BB: "Surat Perintah Penitipan Rawat Barang Bukti",
  TAP_TSK: "Surat Ketetapan Penetapan Tersangka",
  PEMBERITAHUAN_TAP_TSK: "Pemberitahuan Penetapan Tersangka kepada Tersangka",
  PEMBERITAHUAN_TAP_TSK_JPU: "Pemberitahuan Penetapan Tersangka kepada Penuntut Umum",
  SPDP_TSK: "Surat Pemberitahuan Dimulainya Penyidikan (Tersangka Tunggal)",
  SPDP_MORE_1_TSK: "Surat Pemberitahuan Dimulainya Penyidikan (> 1 Tersangka)",
  SPDP_TERLAPOR: "Surat Pemberitahuan Dimulainya Penyidikan (Terlapor)",
  SPDP_LIDIK_ANON: "Surat Pemberitahuan Dimulainya Penyidikan (Dalam Lidik / Anon)",
  SPDP_KORPORASI: "Surat Pemberitahuan Dimulainya Penyidikan (Korporasi)",
  PENGIRIMAN_KEMBALI_SPDP_P20: "Surat Pengiriman Kembali SPDP (Susulan P-20)",
  SPRIN_KAP_DAN_BA: "Surat Perintah Penangkapan & Berita Acara Penangkapan",
  SPGAS_KAP: "Surat Perintah Tugas Penangkapan",
  SPRIN_BAWA_LEWAT_KAP: "Surat Perintah Membawa Setelah Penangkapan",
  BA_HAK_TSK: "Berita Acara Pemberitahuan Hak Tersangka",
  SPRIN_LEPAS_KAP_DAN_BA: "Surat Perintah Pelepasan Penangkapan & Berita Acara",
  VER_LUKA: "Surat Permintaan Visum et Repertum (Luka / Medis)",
  VER_PSIKIATRI: "Surat Permintaan Visum et Repertum (Psikiatri / Kejiwaan)",
  SPRIN_HAN_DAN_BA: "Surat Perintah Penahanan & Berita Acara Penahanan",
  MINTA_PANJANG_HAN_40_KN: "Permohonan Perpanjangan Penahanan 40 Hari ke Kejari",
  SPRIN_PANJANG_HAN_40_KN_DAN_BA: "Surat Perintah Perpanjangan Penahanan 40 Hari Kejari & BA",
  MINTA_PANJANG_HAN_30_KPN1: "Permohonan Perpanjangan Penahanan 30 Hari KPN Ke-1",
  SPRIN_PANJANG_HAN_30_KPN1_DAN_BA: "Surat Perintah Perpanjangan Penahanan 30 Hari KPN 1 & BA",
  MINTA_PANJANG_HAN_30_KPN2: "Permohonan Perpanjangan Penahanan 30 Hari KPN Ke-2",
  SPRIN_PANJANG_HAN_30_KPN2_DAN_BA: "Surat Perintah Perpanjangan Penahanan 30 Hari KPN 2 & BA",
  SAMPUL_BERKAS_PERKARA: "Sampul Berkas Perkara (BP)",
  PENGANTAR_BP_TAHAP1: "Surat Pengantar Pengiriman Berkas Perkara (Tahap I)",
  TANDA_TERIMA_TAHAP1: "Tanda Terima Berkas Perkara Tahap I",
  PENGANTAR_BP_KEMBALI_P19: "Surat Pengantar Pengembalian Berkas Perkara (P-19)",
  TANDA_TERIMA_KEMBALI_P19: "Tanda Terima Pengembalian Berkas Perkara (P-19)",
  PENGANTAR_TAHAP2: "Surat Pengantar Penyerahan Tersangka & Barang Bukti (Tahap II)"
};

/**
 * Normalisasi kode preset (case-insensitive & pemetaan alias populer)
 */
export function normalizePresetCode(code) {
  if (!code || typeof code !== 'string') return '';
  const clean = code.trim().replace(/[{}]/g, '').replace(/\s+/g, '_').toUpperCase();

  // Dukungan alias pemetaan
  const ALIASES = {
    'SP_SIDIK': 'SPRIN_SIDIK',
    'SPRIN_GAS_SIDIK': 'SPGAS_SIDIK',
    'SP_GAS_SIDIK': 'SPGAS_SIDIK',
    'SPRIN_TUGAS_PENYIDIKAN': 'SPGAS_SIDIK',
    'SP_TAP_TSK': 'TAP_TSK',
    'SPDP': 'SPDP_TSK',
    'BA_KAP': 'SPRIN_KAP_DAN_BA',
    'SPRIN_KAP': 'SPRIN_KAP_DAN_BA',
    'BA_HAN': 'SPRIN_HAN_DAN_BA',
    'SPRIN_HAN': 'SPRIN_HAN_DAN_BA',
    'SAMPUL_BP': 'SAMPUL_BERKAS_PERKARA',
    'PENGANTAR_TAHAP_1': 'PENGANTAR_BP_TAHAP1',
    'PENGANTAR_TAHAP1': 'PENGANTAR_BP_TAHAP1',
    'PENGANTAR_P19': 'PENGANTAR_BP_KEMBALI_P19',
    'PENGANTAR_TAHAP_2': 'PENGANTAR_TAHAP2',
  };

  return ALIASES[clean] || clean;
}

/**
 * Mendapatkan array field preset berdasarkan kode template
 */
export function getMindikPreset(code) {
  const norm = normalizePresetCode(code);
  return MINDIK_PRESETS[norm] || null;
}

/**
 * Mendapatkan judul template resmi dari kode preset
 */
export function getPresetTitle(code) {
  const norm = normalizePresetCode(code);
  return MINDIK_PRESET_TITLES[norm] || '';
}

/**
 * Mengubah array preset menjadi format dynamic_fields yang siap dimasukkan ke form state TemplateStudio
 */
export function convertPresetToDynamicFields(presetItems, baseTimestamp = Date.now()) {
  if (!Array.isArray(presetItems)) return [];
  return presetItems.map((item, idx) => ({
    id: baseTimestamp + idx,
    field_key: (item.tag || item.key || '').replace(/[{}]/g, '').replace(/\s+/g, '_').toUpperCase(),
    field_label: item.label || item.tag || '',
    field_type: item.type || 'text',
    default_value: item.default !== undefined ? item.default : (item.default_value || ''),
    is_required: Boolean(item.required !== undefined ? item.required : item.is_required)
  }));
}
