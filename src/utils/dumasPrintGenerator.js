/**
 * Helper Pencetakan Dokumen Surat Laporan Pengaduan (Dumas) Masyarakat Siap Cetak / PDF.
 * Standar format resmi surat aduan masyarakat langsung kepada Bapak Kapolres Kolaka Timur.
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
 * Memicu pencetakan instan dokumen Surat Laporan Pengaduan ke jendela popup cetak / dialog print browser.
 * @param {Object} data - Objek data laporan dumas
 */
export function printSuratPengaduan(data) {
  if (!data) {
    alert('Data laporan pengaduan tidak ditemukan atau belum lengkap.');
    return;
  }

  const htmlContent = generateSuratPengaduanHtml(data);

  // 1. Coba buka jendela cetak bersih via window.open
  try {
    const printWindow = window.open('', '_blank', 'width=850,height=950');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();

      // Berikan waktu bagi browser untuk merender halaman sebelum memanggil dialog print
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (e) {
          console.warn('Gagal memanggil printWindow.print:', e);
        }
      }, 450);
      return;
    }
  } catch (err) {
    console.warn('Popup print diblokir browser, menggunakan iframe fallback:', err);
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
    console.error('Gagal mencetak dokumen pengaduan:', fallbackErr);
    alert('Gagal memicu dialog cetak printer.');
  }
}
