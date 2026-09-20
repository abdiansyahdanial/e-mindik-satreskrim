export const CRIME_CATEGORIES = [
  {
    group: 'Kejahatan Terhadap Hak Milik / Harta Benda',
    categories: [
      { name: 'Pencurian', items: ['Pencurian Biasa', 'Pencurian dengan Pemberatan', 'Pencurian dengan Kekerasan / Begal', 'Pencurian Kendaraan Bermotor', 'Pencurian Hewan Ternak', 'Pencurian Hasil Bumi / Tanaman', 'Pencurian Ringan', 'Pencurian dalam Keluarga'] },
      { name: 'Penggelapan', items: ['Penggelapan Biasa', 'Penggelapan dalam Jabatan / Pekerjaan', 'Penggelapan Hak Atas Benda Tidak Bergerak / Penyerobotan Tanah'] },
      { name: 'Penipuan', items: ['Penipuan Konvensional', 'Penipuan Online', 'Penipuan Modus Investasi / Arisan Bodong', 'Penipuan Berkedok Jual Beli / Properti'] },
      { name: 'Pemerasan dan Pengancaman', items: ['Pemerasan', 'Pengancaman'] },
      { name: 'Perusakan Barang', items: ['Perusakan Barang / Properti', 'Pembakaran dengan Sengaja'] },
      { name: 'Penadahan', items: ['Penadahan Barang Hasil Kejahatan'] }
    ]
  },
  {
    group: 'Kejahatan Terhadap Tubuh dan Nyawa',
    categories: [
      { name: 'Penganiayaan', items: ['Penganiayaan Biasa', 'Penganiayaan Ringan', 'Penganiayaan Berencana', 'Penganiayaan Berat (Anirat)', 'Penganiayaan Berat Berencana', 'Pengeroyokan / Kekerasan Bersama-sama'] },
      { name: 'Pembunuhan', items: ['Pembunuhan Biasa', 'Pembunuhan Berencana', 'Pembunuhan Anak Sendiri (Infantisid)'] },
      { name: 'Kelalaian', items: ['Kealpaan Mengakibatkan Luka / Kematian'] }
    ]
  },
  {
    group: 'Kejahatan Kesusilaan, Perempuan, dan Anak (PPA)',
    categories: [
      { name: 'Tindak Pidana Seksual & Asusila', items: ['Pemerkosaan', 'Perbuatan Cabul', 'Persetubuhan Terhadap Anak di Bawah Umur', 'Perbuatan Cabul Terhadap Anak', 'Tindak Pidana Kekerasan Seksual (TPKS)', 'Pornografi / Penyebaran Konten Porno', 'Perzinahan'] },
      { name: 'Kekerasan Dalam Rumah Tangga (KDRT)', items: ['Kekerasan Fisik Dalam Rumah Tangga', 'Kekerasan Psikis Dalam Rumah Tangga', 'Penelantaran Rumah Tangga', 'Kekerasan Seksual Dalam Rumah Tangga'] },
      { name: 'Perdagangan Orang', items: ['Tindak Pidana Perdagangan Orang (TPPO / Human Trafficking)'] }
    ]
  },
  {
    group: 'Kejahatan Terhadap Kehormatan & Kemerdekaan Orang',
    categories: [
      { name: 'Penghinaan dan Pencemaran Nama Baik', items: ['Pencemaran Nama Baik', 'Fitnah', 'Penghinaan Ringan'] },
      { name: 'Penculikan & Perampasan Kemerdekaan', items: ['Merampas Kemerdekaan Orang / Penyekapan', 'Penculikan / Membawa Lari Anak'] },
      { name: 'Pelanggaran Wilayah Privat', items: ['Memasuki Pekarangan Tanpa Izin'] }
    ]
  },
  {
    group: 'Kejahatan Siber (Cybercrime)',
    categories: [
      { name: 'Tindak Pidana ITE', items: ['Penipuan Siber / Manipulasi Data Dokumen Elektronik', 'Akses Ilegal (Hacking)', 'Intersepsi / Penyadapan Ilegal', 'Perusakan Sistem Informasi (Defacing)', 'Pencemaran Nama Baik di Media Elektronik', 'Penyebaran Konten Asusila di Media Elektronik', 'Pengancaman / Pemerasan Siber', 'Penyebaran Berita Bohong (Hoaks) yang Menimbulkan Keonaran'] }
    ]
  },
  {
    group: 'Kejahatan Ekonomi, Khusus, dan Korporasi',
    categories: [
      { name: 'Jaminan Fidusia', items: ['Pengalihan Objek Jaminan Fidusia / Kendaraan Leasing Tanpa Persetujuan'] },
      { name: 'Perbankan & Pencucian Uang', items: ['Tindak Pidana Pencucian Uang (TPPU)', 'Tindak Pidana Perbankan'] },
      { name: 'Korupsi (Tipidkor)', items: ['Kerugian Keuangan Negara', 'Suap Menyuap', 'Gratifikasi', 'Pemerasan dalam Jabatan', 'Penggelapan dalam Jabatan'] },
      { name: 'Perlindungan Konsumen & Perdagangan', items: ['Pelanggaran Hak Konsumen / Peredaran Barang Ilegal', 'Penimbunan Bahan Pokok / Pelanggaran Izin Niaga'] },
      { name: 'Kekayaan Intelektual (HAKI)', items: ['Pelanggaran Hak Cipta', 'Pemalsuan Merek Terdaftar'] }
    ]
  },
  {
    group: 'Kejahatan Sumber Daya Alam & Lingkungan Hidup',
    categories: [
      { name: 'Pertambangan', items: ['Pertambangan Tanpa Izin (PETI)'] },
      { name: 'Kehutanan & Perkebunan', items: ['Pembalakan Liar (Illegal Logging)', 'Perambahan Kawasan Hutan Tanpa Izin', 'Pembakaran Lahan / Hutan'] },
      { name: 'Lingkungan Hidup', items: ['Pencemaran Limbah B3 / Perusakan Lingkungan'] }
    ]
  },
  {
    group: 'Kejahatan Ketertiban Umum & Surat Palsu',
    categories: [
      { name: 'Pemalsuan', items: ['Pemalsuan Surat / Dokumen Resmi', 'Keterangan Palsu ke Dalam Akta Otentik', 'Pemalsuan Uang Rupiah', 'Sumpah Palsu / Keterangan Palsu di Atas Sumpah'] },
      { name: 'Ketertiban Umum', items: ['Membawa Senjata Tajam / Senjata Api Tanpa Izin', 'Perjudian Konvensional / Togel', 'Perjudian Online', 'Laporan Palsu / Pengaduan Palsu ke Kepolisian'] }
    ]
  }
];
