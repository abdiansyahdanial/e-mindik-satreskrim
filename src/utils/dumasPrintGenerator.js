import logoTribrata from '../assets/LOGO TRIBRATA HITAM 2026.png';

/**
 * Helper Pencetakan Dokumen Surat Laporan Pengaduan (Dumas) dan Surat Tanda Terima Laporan (STTL).
 * Standar format resmi dinas kepolisian Satreskrim / SPKT Polres Kolaka Timur.
 */

function formatIndoDate(dateStr) {
  if (!dateStr) {
    return new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function renderPersonTable(person, prefix = '') {
  const nama = person?.nama || person?.nama_lengkap || '-';
  const isDalamLidik = /dalam\s*lidik/i.test(nama);

  if (isDalamLidik) {
    return `
      <table style="width: 100%; border-collapse: collapse; margin-top: 2px; margin-bottom: 4px; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">
        <tbody>
          <tr>
            <td style="width: 190px; vertical-align: top; padding: 2px 0;">${prefix}Nama</td>
            <td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>
            <td style="vertical-align: top; padding: 2px 0; font-weight: bold;">DALAM LIDIK</td>
          </tr>
        </tbody>
      </table>
    `;
  }

  const ttl = person?.tempat_tanggal_lahir || person?.ttl || [person?.tempat_lahir, person?.tanggal_lahir].filter(Boolean).join(', ') || '-';
  const pekerjaan = person?.pekerjaan || '-';
  const agama = person?.agama || 'Islam';
  const alamat = person?.alamat || person?.domisili || person?.alamat_domisili || '-';
  const noHp = person?.kontak || person?.hp || person?.telepon || person?.no_hp || '-';

  return `
    <table style="width: 100%; border-collapse: collapse; margin-top: 2px; margin-bottom: 4px; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">
      <tbody>
        <tr>
          <td style="width: 190px; vertical-align: top; padding: 2px 0;">${prefix}Nama</td>
          <td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>
          <td style="vertical-align: top; padding: 2px 0; font-weight: bold;">${nama}</td>
        </tr>
        <tr>
          <td style="width: 190px; vertical-align: top; padding: 2px 0;">${prefix}Tempat tanggal Lahir</td>
          <td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>
          <td style="vertical-align: top; padding: 2px 0;">${ttl}</td>
        </tr>
        <tr>
          <td style="width: 190px; vertical-align: top; padding: 2px 0;">${prefix}Pekerjaan</td>
          <td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>
          <td style="vertical-align: top; padding: 2px 0;">${pekerjaan}</td>
        </tr>
        <tr>
          <td style="width: 190px; vertical-align: top; padding: 2px 0;">${prefix}Agama</td>
          <td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>
          <td style="vertical-align: top; padding: 2px 0;">${agama}</td>
        </tr>
        <tr>
          <td style="width: 190px; vertical-align: top; padding: 2px 0;">${prefix}Alamat</td>
          <td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>
          <td style="vertical-align: top; padding: 2px 0;">${alamat}</td>
        </tr>
        <tr>
          <td style="width: 190px; vertical-align: top; padding: 2px 0;">${prefix}Nomor Hp</td>
          <td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>
          <td style="vertical-align: top; padding: 2px 0;">${noHp}</td>
        </tr>
      </tbody>
    </table>
  `;
}

/**
 * Membuat dokumen HTML Surat Pengaduan Dumas (surat aduan masyarakat kepada Kapolres)
 */
export function generateSuratPengaduanHtml(data = {}) {
  const tempatSurat = data.sprin_loc || data.tempat_surat || 'Tirawuta';
  const tanggalSurat = formatIndoDate(data.tanggal_surat || data.tanggal_lapor || data.created_at);

  // 1. Sanitasi Teks Berulang (Anti-Duplikasi Prefix)
  const rawPidana = (data.tindak_pidana || data.perkara || data.dugaan_tindak_pidana || data.pidana || data.perkara?.tindak_pidana || '').toString().trim();
  const cleanPidana = rawPidana
    .replace(/^(dugaan\s+tindak\s+pidana|tindak\s+pidana|dugaan\s+tp\.?)\s*/gi, '')
    .trim();

  const rawPasal = (data.pasal || data.pasal_yang_disangkakan || data.pasal_disangkakan || data.dugaan_pasal || data.perkara?.pasal || '').toString().trim();
  const cleanPasal = rawPasal.replace(/^pasal\s*/gi, '').trim();

  const tkp = data.locus || data.tempat_kejadian || data.tkp || data.locus_delicti || data.perkara?.tkp || '-';
  const waktu = data.tempus || data.waktu_kejadian || data.waktu || data.tempus_delicti || data.perkara?.waktu || '-';

  // Identitas Pelapor
  const pelaporData = {
    nama: data.pelapor_nama || data.pelapor?.nama || data.pelapor?.nama_lengkap || data.pelapor_name || data.nama_pelapor || data.nama || '-',
    ttl: data.pelapor_ttl || data.pelapor?.tempat_tanggal_lahir || data.pelapor?.ttl || [data.pelapor?.tempat_lahir, data.pelapor?.tanggal_lahir].filter(Boolean).join(', ') || '-',
    pekerjaan: data.pelapor_pekerjaan || data.pelapor?.pekerjaan || '-',
    agama: data.pelapor_agama || data.pelapor?.agama || 'Islam',
    alamat: data.pelapor_alamat || data.pelapor?.alamat || '-',
    kontak: data.pelapor_kontak || data.pelapor_hp || data.pelapor?.hp || data.pelapor?.telepon || data.pelapor?.kontak || '-'
  };

  // Saksi-Saksi
  const rawSaksi = Array.isArray(data.saksi_list)
    ? data.saksi_list
    : (Array.isArray(data.saksiList)
      ? data.saksiList
      : (Array.isArray(data.saksi) ? data.saksi : (data.saksi ? [data.saksi] : [])));
  const validSaksi = rawSaksi.filter(s => s && (s.nama || s.nama_lengkap || s.nik));

  // Terlapor
  let rawTerlapor = Array.isArray(data.terlapor_list)
    ? data.terlapor_list
    : (Array.isArray(data.terlaporList)
      ? data.terlaporList
      : (Array.isArray(data.terlapor) ? data.terlapor : []));
  if (rawTerlapor.length === 0 && (data.terlapor_nama || data.terlapor?.nama)) {
    rawTerlapor = [{
      nama: data.terlapor_nama || data.terlapor?.nama,
      ttl: data.terlapor_ttl || data.terlapor?.ttl || [data.terlapor?.tempat_lahir, data.terlapor?.tanggal_lahir].filter(Boolean).join(', '),
      pekerjaan: data.terlapor_pekerjaan || data.terlapor?.pekerjaan,
      agama: data.terlapor_agama || data.terlapor?.agama,
      alamat: data.terlapor_domisili || data.terlapor_alamat || data.terlapor?.alamat,
      kontak: data.terlapor_kontak || data.terlapor?.kontak || data.terlapor?.hp
    }];
  }
  const validTerlapor = rawTerlapor.filter(t => t && (t.nama || t.nama_lengkap));
  const isTerlaporDalamLidik = validTerlapor.length === 0 || validTerlapor.every(t => /dalam\s*lidik/i.test(t.nama || t.nama_lengkap || ''));
  const namaTerlaporStr = !isTerlaporDalamLidik
    ? validTerlapor.map(t => t.nama || t.nama_lengkap).join(', ')
    : 'DALAM LIDIK';

  // 2 & 3. Hilangkan Duplikasi Pembuka dan Penutup Kronologi
  let rawKronologi = (data.ringkasan_kronologi_kasus || data.uraian_kejadian || data.kronologis || data.uraian || data.ringkasan_posisi_kasus || data.perkara?.uraian || '').trim();

  // Hapus paragraf pembuka redundan jika isi teks sudah mengulang kalimat "Bahwa telah terjadi..."
  const duplicateIntroPattern = /^Bahwa\s+telah\s+terjadi[\s\S]*?(?:dilakukan\s+oleh\s+Terlapor[^.:]*|dengan\s+kronologis\s+kejadian)\s*[:.]?\s*/i;
  let cleanKronologi = rawKronologi.replace(duplicateIntroPattern, '').trim();

  // Hapus kalimat penutup redundan dari variabel kronologi sebelum dirender
  cleanKronologi = cleanKronologi.replace(/sehingga\s+melaporkan\s+kejadian\s+tersebut\s+ke\s+kantor\s+Polres[\s\S]*$/gi, '').trim();
  cleanKronologi = cleanKronologi.replace(/Demikian\s+laporan\s+pengaduan\s+ini\s+saya\s+buat[\s\S]*$/gi, '').trim();
  cleanKronologi = cleanKronologi.replace(/[\s.,]+$/, '').trim();

  // HTML Render Blok Saksi Dinamis
  let renderSaksiHtml = '';
  if (validSaksi.length === 0) {
    renderSaksiHtml = `<p style="margin: 2px 0 6px 0;">dengan mengajukan saksi sebagai berikut: - (Nihil)</p>`;
  } else if (validSaksi.length === 1) {
    renderSaksiHtml = `
      <p style="margin: 2px 0 2px 0;">dengan mengajukan saksi sebagai berikut:</p>
      ${renderPersonTable(validSaksi[0])}
    `;
  } else {
    renderSaksiHtml = `
      <p style="margin: 2px 0 2px 0;">dengan mengajukan saksi sebagai berikut:</p>
      ${validSaksi.map((s, idx) => `
        <div style="margin-top: 4px; margin-bottom: 4px;">
          <div style="font-weight: bold; margin-bottom: 1px;">${idx + 1}. Saksi ${idx + 1} :</div>
          ${renderPersonTable(s, '&nbsp;&nbsp;&nbsp;&nbsp;')}
        </div>
      `).join('')}
    `;
  }

  // HTML Render Blok Terlapor Dinamis
  let renderTerlaporHtml = '';
  if (isTerlaporDalamLidik) {
    renderTerlaporHtml = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 2px; margin-bottom: 4px; font-family: 'Times New Roman', Times, serif; font-size: 12pt;">
        <tbody>
          <tr>
            <td style="width: 190px; vertical-align: top; padding: 2px 0;">Nama</td>
            <td style="width: 15px; vertical-align: top; padding: 2px 0;">:</td>
            <td style="vertical-align: top; padding: 2px 0; font-weight: bold;">DALAM LIDIK</td>
          </tr>
        </tbody>
      </table>
    `;
  } else if (validTerlapor.length === 1) {
    renderTerlaporHtml = renderPersonTable(validTerlapor[0]);
  } else {
    renderTerlaporHtml = validTerlapor.map((t, idx) => `
      <div style="margin-top: 4px; margin-bottom: 4px;">
        <div style="font-weight: bold; margin-bottom: 1px;">${idx + 1}. Terlapor ${idx + 1} :</div>
        ${renderPersonTable(t, '&nbsp;&nbsp;&nbsp;&nbsp;')}
      </div>
    `).join('');
  }

  const signerName = (pelaporData.nama && pelaporData.nama !== '-' ? pelaporData.nama : (data.nama_pelapor || data.nama || 'NATSIR')).toUpperCase();

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Surat Laporan Pengaduan - ${signerName}</title>
  <style>
    @page {
      size: 8.5in 13in portrait;
      margin-top: 15mm;
      margin-bottom: 15mm;
      margin-left: 25mm;
      margin-right: 20mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.35;
      color: #000;
      background: #fff;
    }

    /* Hilangkan margin default elemen pertama agar langsung menempel pada batas margin atas kertas */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 0 !important;
      margin-bottom: 12px;
      padding-top: 0 !important;
    }

    .header-table td {
      padding: 0 !important;
      vertical-align: top;
    }

    p {
      margin: 0 0 4px 0;
    }

    table {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
    }
  </style>
</head>
<body>
  <table class="header-table" style="width: 100%; border-collapse: collapse; margin-top: 0; padding-top: 0;">
    <tr>
      <td style="width: 52%; vertical-align: top; padding: 0;">
        <table style="border-collapse: collapse;">
          <tr>
            <td style="width: 75px; vertical-align: top; padding: 0;">Perihal</td>
            <td style="width: 15px; vertical-align: top; padding: 0;">:</td>
            <td style="vertical-align: top; font-weight: bold; padding: 0;">Laporan Pengaduan Dugaan Tindak Pidana ${cleanPidana}</td>
          </tr>
        </table>
      </td>
      <td style="width: 48%; vertical-align: top; padding-left: 20px; padding-top: 0;">
        ${tempatSurat}, ${tanggalSurat}<br/><br/>
        Kepada<br/>
        Yth. <b>BAPAK KAPOLRES KOLAKA TIMUR</b><br/>
        di -<br/>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Tempat
      </td>
    </tr>
  </table>

  <!-- Pembuka & Identitas Pelapor -->
  <p style="margin-bottom: 3px;">Saya yang bertanda tangan dibawah ini:</p>
  ${renderPersonTable(pelaporData)}
  <p style="margin-top: 2px; margin-bottom: 10px;">Selanjutnya disebut sebagai pelapor/korban.</p>

  <!-- Saksi Dinamis -->
  <div style="margin-bottom: 10px;">
    ${renderSaksiHtml}
  </div>

  <!-- Pernyataan Pengaduan & Terlapor Dinamis -->
  <p style="text-align: justify; margin-bottom: 4px;">
    Dengan ini mengajukan pengaduan tentang Dugaan Tindak Pidana <b>${cleanPidana}</b> sebagaimana dimaksud dalam Pasal <b>${cleanPasal}</b> yang terjadi di <b>${tkp}</b> pada <b>${waktu}</b> yang diduga dilakukan oleh Terlapor:
  </p>
  
  <div style="margin-bottom: 10px;">
    ${renderTerlaporHtml}
  </div>

  <!-- Kronologis Kejadian -->
  <p style="text-align: justify; margin-top: 6px; margin-bottom: 6px;">
    Dengan kronologis kejadian sebagai berikut :<br/>
    Bahwa telah terjadi dugaan Tindak Pidana <b>${cleanPidana}</b> dimaksud dalam Pasal <b>${cleanPasal}</b> yang terjadi di <b>${tkp}</b> pada <b>${waktu}</b> yang diduga dilakukan oleh Terlapor <b>${namaTerlaporStr}</b>, dengan kronologis kejadian:
  </p>

  <p style="text-align: justify; text-indent: 35px; margin-top: 6px; margin-bottom: 6px;">
    ${cleanKronologi} sehingga melaporkan kejadian tersebut ke kantor Polres Kolaka Timur untuk dilakukan proses hukum lebih lanjut.
  </p>

  <p style="text-align: justify; text-indent: 35px; margin-top: 6px; margin-bottom: 12px;">
    Demikian laporan pengaduan ini saya buat dengan yang sebenar - benarnya dan memohon kepada bapak Kapolres Kolaka Timur untuk ditindak lanjuti. Atas terpenuhinya laporan / pengaduan ini saya ucapkan terima kasih.
  </p>

  <!-- Ruangan Tanda Tangan Pelapor di Sebelah Kanan Bawah -->
  <div style="float: right; text-align: center; width: 260px; margin-top: 20px;">
    Yang melapor / mengadukan,
    <br/><br/><br/><br/>
    ( <b>${signerName}</b> )
  </div>
  <div style="clear: both;"></div>
</body>
</html>`;
}

/**
 * Membuat dokumen HTML Surat Tanda Terima Laporan (STTL / Tanda Terima Dumas).
 * Format dinas resmi SPKT Polres Kolaka Timur ukuran Folio / F4 dengan font standar, logo presisi & tanda tangan sejajar sempurna.
 */
export function generateTandaTerimaDumasHtml(data = {}, petugasPiket = null) {
  const tanggalHariIni = formatIndoDate(new Date());
  const tanggalSurat = formatIndoDate(data.tanggal_surat || data.tanggal_lapor || data.created_at) || tanggalHariIni;
  const tanggalDumas = formatIndoDate(data.tanggal_dumas || data.tanggal_surat || data.tanggal_lapor || data.created_at) || tanggalHariIni;

  const nomorSttl = data.nomor_dumas || data.nomor_sttl || data.nomor_sttlp || data.nomor_lp || '-';

  // Sanitasi Tindak Pidana & Pasal
  const rawPidana = (data.tindak_pidana || data.perkara || data.dugaan_tindak_pidana || data.pidana || data.perkara?.tindak_pidana || '').toString().trim();
  const cleanPidana = rawPidana
    .replace(/^(dugaan\s+tindak\s+pidana|tindak\s+pidana|dugaan\s+tp\.?)\s*/gi, '')
    .trim() || '-';

  const rawPasal = (data.pasal || data.pasal_yang_disangkakan || data.pasal_disangkakan || data.dugaan_pasal || data.perkara?.pasal || '').toString().trim();
  const cleanPasal = rawPasal ? (rawPasal.toLowerCase().startsWith('pasal') ? rawPasal : `Pasal ${rawPasal.replace(/^pasal\s*/gi, '').trim()}`) : '-';

  const tkp = data.locus || data.tempat_kejadian || data.tkp || data.locus_delicti || data.perkara?.tkp || '-';
  const waktu = data.tempus || data.waktu_kejadian || data.waktu || data.tempus_delicti || data.perkara?.waktu || '-';

  // Identitas Pelapor
  const namaPelapor = (data.nama_pelapor || data.pelapor_nama || data.pelapor?.nama || data.pelapor?.nama_lengkap || data.nama || 'NATSIR').toUpperCase();
  const nikPelapor = data.nik || data.nik_pelapor || data.pelapor_nik || data.pelapor?.nik || '-';
  const kewarganegaraan = (data.kewarganegaraan || data.pelapor?.kewarganegaraan || 'INDONESIA').toUpperCase();
  const jenisKelamin = (data.jenis_kelamin || data.jk || data.pelapor_jk || data.pelapor?.jenis_kelamin || data.pelapor?.jk || '-').toUpperCase();

  let ttlPelapor = '-';
  if (data.tempat_lahir || data.tanggal_lahir) {
    ttlPelapor = `${data.tempat_lahir || '-'}, ${data.tanggal_lahir ? formatIndoDate(data.tanggal_lahir) : '-'}`;
  } else if (data.pelapor?.tempat_lahir || data.pelapor?.tanggal_lahir) {
    ttlPelapor = `${data.pelapor.tempat_lahir || '-'}, ${data.pelapor.tanggal_lahir ? formatIndoDate(data.pelapor.tanggal_lahir) : '-'}`;
  } else if (data.tempat_tanggal_lahir || data.ttl || data.pelapor_ttl || data.pelapor?.ttl || data.pelapor?.tempat_tanggal_lahir) {
    ttlPelapor = data.tempat_tanggal_lahir || data.ttl || data.pelapor_ttl || data.pelapor?.ttl || data.pelapor?.tempat_tanggal_lahir;
  }

  const rawUmur = data.umur || data.pelapor_umur || data.pelapor?.umur;
  const umurPelapor = rawUmur ? `${rawUmur} TAHUN`.replace(/\s+TAHUN\s+TAHUN/i, ' TAHUN') : '-';
  const pekerjaanPelapor = data.pekerjaan || data.pelapor_pekerjaan || data.pelapor?.pekerjaan || '-';
  const agamaPelapor = data.agama || data.pelapor_agama || data.pelapor?.agama || 'Islam';
  const alamatPelapor = data.alamat || data.pelapor_alamat || data.pelapor?.alamat || data.pelapor?.domisili || '-';
  const kontakPelapor = data.no_hp || data.kontak || data.pelapor_kontak || data.pelapor_hp || data.pelapor?.kontak || data.pelapor?.telepon || data.pelapor?.hp || '-';

  // Terlapor
  let rawTerlapor = Array.isArray(data.terlapor_list)
    ? data.terlapor_list
    : (Array.isArray(data.terlaporList)
      ? data.terlaporList
      : (Array.isArray(data.terlapor) ? data.terlapor : []));
  if (rawTerlapor.length === 0 && (data.terlapor_nama || data.terlapor?.nama)) {
    rawTerlapor = [{ nama: data.terlapor_nama || data.terlapor?.nama }];
  }
  const validTerlapor = rawTerlapor.filter(t => t && (t.nama || t.nama_lengkap));
  const isTerlaporDalamLidik = validTerlapor.length === 0 || validTerlapor.every(t => /dalam\s*lidik/i.test(t.nama || t.nama_lengkap || ''));
  const namaTerlapor = !isTerlaporDalamLidik
    ? validTerlapor.map(t => t.nama || t.nama_lengkap).join(', ')
    : 'DALAM LIDIK';

  // Bersihkan Teks Kronologi
  let rawKronologi = (data.ringkasan_kronologi_kasus || data.uraian_kejadian || data.kronologis || data.uraian || data.ringkasan_posisi_kasus || data.perkara?.uraian || '').trim();
  const duplicateIntroPattern = /^Bahwa\s+telah\s+terjadi[\s\S]*?(?:dilakukan\s+oleh\s+Terlapor[^.:]*|dengan\s+kronologis\s+kejadian)\s*[:.]?\s*/i;
  let cleanKronologi = rawKronologi.replace(duplicateIntroPattern, '').trim();
  cleanKronologi = cleanKronologi.replace(/sehingga\s+melaporkan\s+kejadian\s+tersebut\s+ke\s+kantor\s+Polres[\s\S]*$/gi, '').trim();
  cleanKronologi = cleanKronologi.replace(/Demikian\s+laporan\s+pengaduan\s+ini\s+saya\s+buat[\s\S]*$/gi, '').trim();
  cleanKronologi = cleanKronologi.replace(/[\s.,]+$/, '').trim();

  // Objek Petugas Piket Fallback
  const piket = {
    unit: petugasPiket?.unit || data.petugas_piket?.unit || 'PAMAPTA III',
    nama: petugasPiket?.nama || data.petugas_piket?.nama || 'ARMAN, S.H.',
    pangkat_nrp: petugasPiket?.pangkat_nrp || data.petugas_piket?.pangkat_nrp || 'IPDA NRP 87020875'
  };

  const docTitle = `${data.nomor_dumas || data.nomor_lp || 'DUMAS'} - ${data.nama_pelapor || data.nama || namaPelapor || 'STTL'}`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${docTitle}</title>
  <style>
    @page {
      size: 8.5in 13in portrait;
      margin-top: 12mm;
      margin-bottom: 12mm;
      margin-left: 20mm;
      margin-right: 18mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      line-height: 1.35;
      color: #000;
      background: #fff;
    }

    table {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
    }

    p {
      margin: 0 0 5px 0;
    }
  </style>
</head>
<body>
  <!-- Kop Surat Dinas Kiri -->
  <div style="width: 290px; text-align: center; font-family: 'Times New Roman', Times, serif; font-size: 9.5pt; line-height: 1.25; margin-bottom: 4px;">
    <div style="font-weight: bold;">KEPOLISIAN NEGARA REPUBLIK INDONESIA</div>
    <div style="font-weight: bold;">DAERAH SULAWESI TENGGARA</div>
    <div style="font-weight: bold;">RESOR KOLAKA TIMUR</div>
    <div style="border-bottom: 2px solid #000; margin-top: 3px; width: 100%;"></div>
  </div>

  <!-- 3. Ukuran Logo Tribrata Presisi (2,13 cm x 2,22 cm) -->
  <div style="text-align: center; margin-bottom: 4px;">
    <img 
      src="${logoTribrata}" 
      alt="Tribrata" 
      style="width: 2.13cm !important; height: 2.22cm !important; object-fit: contain; display: inline-block;" 
    />
  </div>

  <!-- 1. Judul & Nomor Registrasi STTL (Tanpa Kata STTL & Tanpa Garis Bawah Nomor) -->
  <div style="text-align: center; margin: 6px 0 12px 0;">
    <b style="font-size: 11.5pt; text-decoration: underline;">SURAT TANDA TERIMA LAPORAN</b><br/>
    <span style="font-size: 10.5pt;">Nomor: ${nomorSttl}</span>
  </div>

  <!-- Kalimat Pengantar -->
  <p style="text-align: justify; margin-bottom: 6px; line-height: 1.35;">
    Berdasarkan Laporan Pengaduan Nomor: ${data.nomor_dumas || data.nomor_lp || '-'} tanggal ${data.tanggal_dumas || data.tanggal_surat || tanggalHariIni}, bertempat di kantor kepolisian tersebut di atas, pada hari, tanggal ditandatanganinya Surat Tanda Terima Laporan, dengan ini diterangkan bahwa:
  </p>

  <!-- Tabel Identitas Pelapor Rapat -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px; font-family: 'Times New Roman', Times, serif; font-size: 11pt;">
    <tbody>
      <tr>
        <td style="width: 180px; vertical-align: top; padding: 1.5px 0;">1. nama</td>
        <td style="width: 15px; vertical-align: top; padding: 1.5px 0;">:</td>
        <td style="vertical-align: top; padding: 1.5px 0; font-weight: bold;">${namaPelapor}</td>
      </tr>
      <tr>
        <td style="width: 180px; vertical-align: top; padding: 1.5px 0;">2. nomor identitas</td>
        <td style="width: 15px; vertical-align: top; padding: 1.5px 0;">:</td>
        <td style="vertical-align: top; padding: 1.5px 0;">${nikPelapor}</td>
      </tr>
      <tr>
        <td style="width: 180px; vertical-align: top; padding: 1.5px 0;">3. kewarganegaraan</td>
        <td style="width: 15px; vertical-align: top; padding: 1.5px 0;">:</td>
        <td style="vertical-align: top; padding: 1.5px 0;">${kewarganegaraan}</td>
      </tr>
      <tr>
        <td style="width: 180px; vertical-align: top; padding: 1.5px 0;">4. jenis kelamin</td>
        <td style="width: 15px; vertical-align: top; padding: 1.5px 0;">:</td>
        <td style="vertical-align: top; padding: 1.5px 0;">${jenisKelamin}</td>
      </tr>
      <tr>
        <td style="width: 180px; vertical-align: top; padding: 1.5px 0;">5. tempat/tanggal lahir</td>
        <td style="width: 15px; vertical-align: top; padding: 1.5px 0;">:</td>
        <td style="vertical-align: top; padding: 1.5px 0;">${ttlPelapor}</td>
      </tr>
      <tr>
        <td style="width: 180px; vertical-align: top; padding: 1.5px 0;">6. umur</td>
        <td style="width: 15px; vertical-align: top; padding: 1.5px 0;">:</td>
        <td style="vertical-align: top; padding: 1.5px 0;">${umurPelapor}</td>
      </tr>
      <tr>
        <td style="width: 180px; vertical-align: top; padding: 1.5px 0;">7. pekerjaan</td>
        <td style="width: 15px; vertical-align: top; padding: 1.5px 0;">:</td>
        <td style="vertical-align: top; padding: 1.5px 0;">${pekerjaanPelapor}</td>
      </tr>
      <tr>
        <td style="width: 180px; vertical-align: top; padding: 1.5px 0;">8. agama</td>
        <td style="width: 15px; vertical-align: top; padding: 1.5px 0;">:</td>
        <td style="vertical-align: top; padding: 1.5px 0;">${agamaPelapor}</td>
      </tr>
      <tr>
        <td style="width: 180px; vertical-align: top; padding: 1.5px 0;">9. alamat</td>
        <td style="width: 15px; vertical-align: top; padding: 1.5px 0;">:</td>
        <td style="vertical-align: top; padding: 1.5px 0;">${alamatPelapor}</td>
      </tr>
      <tr>
        <td style="width: 180px; vertical-align: top; padding: 1.5px 0;">10. nomor HP / kontak</td>
        <td style="width: 15px; vertical-align: top; padding: 1.5px 0;">:</td>
        <td style="vertical-align: top; padding: 1.5px 0;">${kontakPelapor}</td>
      </tr>
    </tbody>
  </table>

  <!-- Isi Aduan, Terlapor & Kronologis -->
  <p style="text-align: justify; margin-bottom: 5px; line-height: 1.35;">
    Telah melaporkan dugaan Tindak Pidana <b>${cleanPidana}</b> sebagaimana dimaksud dalam <b>${cleanPasal}</b>, yang terjadi di <b>${tkp}</b>, pada <b>${waktu}</b>, dengan Terlapor atas nama <b>${namaTerlapor}</b>.
  </p>

  <div style="text-align: justify; text-indent: 30px; margin: 6px 0; line-height: 1.35;">
    <b>Uraian Kejadian:</b> ${cleanKronologi}
  </div>

  <p style="text-align: justify; margin-top: 6px; margin-bottom: 12px; line-height: 1.35;">
    Demikian Surat Tanda Terima dibuat dengan sebenarnya.
  </p>

  <!-- Struktur Kolom Tanda Tangan (Sejajar Sempurna & Spasi TTD 70px) -->
  <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
    <tr>
      <!-- Kolom Kiri: Pelapor -->
      <td style="width: 50%; vertical-align: bottom; text-align: center; padding: 0;">
        Pelapor,
        <!-- Jarak 4 spasi tanda tangan -->
        <div style="height: 70px;"></div>
        ( <b>${data.nama_pelapor || data.nama || namaPelapor || '-'}</b> )
        <!-- Elemen pengimbang tinggi baris pangkat/NRP agar sejajar lurus -->
        <div style="visibility: hidden; font-size: 10pt; line-height: 1.2;">PANGKAT / NRP</div>
      </td>

      <!-- Kolom Kanan: Petugas SPKT -->
      <td style="width: 50%; vertical-align: top; text-align: center; padding: 0;">
        Tirawuta, ${data.tanggal_surat || tanggalHariIni}<br/>
        MENGETAHUI<br/>
        a.n. KEPALA KEPOLISIAN RESOR KOLAKA TIMUR<br/>
        KA SPKT<br/>
        u.b.<br/>
        ${piket?.unit || 'PAMAPTA III'}
        <!-- Jarak 4 spasi tanda tangan -->
        <div style="height: 70px;"></div>
        <b>${piket?.nama || 'ARMAN, S.H.'}</b><br/>
        <span style="font-size: 10pt;">${piket?.pangkat_nrp || 'IPDA NRP 87020875'}</span>
      </td>
    </tr>
  </table>

  <!-- Catatan Kaki (8.5pt Italic) -->
  <div style="margin-top: 15px; border-top: 1px dashed #666; padding-top: 4px; font-size: 8.5pt; font-style: italic; color: #333;">
    Catatan: Perkembangan penanganan perkara dapat berkoordinasi dengan penyidik Satreskrim Polres Kolaka Timur.
  </div>
</body>
</html>`;
}

/**
 * Memicu jendela cetak browser bersih atau fallback iframe untuk konten HTML
 */
function triggerPrint(htmlContent, docTitle = '') {
  // 1. Buka jendela cetak bersih via window.open
  try {
    const printWindow = window.open('', '_blank', 'width=850,height=950');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      if (docTitle) {
        printWindow.document.title = docTitle;
      }
      printWindow.document.close();
      if (docTitle) {
        printWindow.document.title = docTitle;
      }
      printWindow.focus();

      setTimeout(() => {
        try {
          if (docTitle) {
            printWindow.document.title = docTitle;
          }
          printWindow.print();
        } catch (e) {
          console.warn('Gagal memanggil printWindow.print:', e);
        }
      }, 450);
      return;
    }
  } catch (err) {
    console.warn('Popup print diblokir browser, beralih ke iframe fallback:', err);
  }

  // 2. Fallback via hidden iframe jika popup diblokir oleh browser
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    if (docTitle) {
      doc.title = docTitle;
    }
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }, 450);
  } catch (fallbackErr) {
    console.error('Gagal mencetak dokumen:', fallbackErr);
    alert('Gagal memicu dialog cetak printer.');
  }
}

/**
 * Memicu pencetakan instan dokumen Surat Laporan Pengaduan ke jendela popup cetak / dialog print browser.
 * @param {Object} data - Objek data laporan dumas
 */
export function printSuratPengaduan(data) {
  if (!data) {
    alert('Data laporan pengaduan tidak ditemukan atau belum lengkap.');
    return;
  }
  const docTitle = `Surat Pengaduan - ${data.nama_pelapor || data.nama || 'Dumas'}`;
  const htmlContent = generateSuratPengaduanHtml(data);
  triggerPrint(htmlContent, docTitle);
}

/**
 * Memicu pencetakan instan dokumen Surat Tanda Terima Laporan (STTL / Tanda Terima) ke printer.
 * @param {Object} data - Objek data laporan dumas
 * @param {Object} [petugasPiket] - Data opsional petugas piket SPKT / Pamapta
 */
export function printTandaTerimaDumas(data, petugasPiket = null) {
  if (!data) {
    alert('Data laporan pengaduan tidak ditemukan atau belum lengkap.');
    return;
  }
  const docTitle = `${data.nomor_dumas || data.nomor_lp || 'DUMAS'} - ${data.nama_pelapor || data.nama || 'STTL'}`;
  const htmlContent = generateTandaTerimaDumasHtml(data, petugasPiket);
  triggerPrint(htmlContent, docTitle);
}
