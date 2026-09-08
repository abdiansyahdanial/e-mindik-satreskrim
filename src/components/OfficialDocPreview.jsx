import React, { useState } from 'react';
import { 
  Printer, 
  CheckCircle2, 
  Download, 
  RefreshCw, 
  FileText, 
  Table, 
  Sparkles
} from 'lucide-react';
import { getPersonnelById } from '../data/mockPersonnel';
import { generateAndDownloadDocx, buildDocxDataMap } from '../services/mindikGenerator';

export default function OfficialDocPreview({ 
  selectedCase, 
  template, 
  formValues = {}, 
  personnel = [],
  onSaveArchive,
  isSaved = false 
}) {
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [downloadSuccessNotice, setDownloadSuccessNotice] = useState(null);
  const [showVariableMap, setShowVariableMap] = useState(false);

  if (!selectedCase || !template) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        background: 'var(--bg-glass)',
        borderRadius: 'var(--radius-lg)',
        border: '1px dashed var(--border-glass)',
        color: 'var(--text-secondary)'
      }}>
        Pilih Perkara dan Template Dokumen untuk menampilkan pratinjau resmi.
      </div>
    );
  }

  // Resolve personnel helper
  const findPerson = (id) => personnel.find(p => p.id === id || p.nrp === id) || getPersonnelById(id);

  const signerKasat = formValues.DOC_SIGNER_ATASAN_NAME 
    ? findPerson(formValues.DOC_SIGNER_ATASAN_NAME) 
    : findPerson('usr-001');

  const pjOfficer = formValues.DOC_PJ_NAME 
    ? findPerson(formValues.DOC_PJ_NAME) 
    : (selectedCase.investigators?.[0] ? findPerson(selectedCase.investigators[0].user_id) : null);

  const docNo = formValues.DOC_NO || formValues['DOC_NO 1'] || '[NOMOR SURAT BELUM DIISI]';
  const docDate = formValues.DOC_DATE 
    ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(formValues.DOC_DATE))
    : new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  const validity = formValues.DOC_VALIDITY || selectedCase.sprin_val_date || '30 (tiga puluh) hari';
  const docLocation = formValues.DOC_LOCATION || 'Tirawuta';

  // Trigger real Docx generation from Supabase Storage
  const handleGenerateDocx = async () => {
    setIsGeneratingDocx(true);
    setDownloadSuccessNotice(null);
    try {
      const res = await generateAndDownloadDocx({
        template,
        caseData: selectedCase,
        formValues,
        personnelList: personnel
      });

      setDownloadSuccessNotice(`Berhasil generate file '${res.filename}' dari Supabase Storage!`);
      setTimeout(() => setDownloadSuccessNotice(null), 5000);
    } catch (err) {
      console.error('Docx generation error:', err);
      alert(`Gagal membuat file .docx: ${err.message}`);
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  const currentDataMap = buildDocxDataMap({ caseData: selectedCase, formValues, personnelList: personnel });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Action Toolbar */}
      <div className="no-print" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 18px',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-glass)',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-green">LIVE PREVIEW</span>
          {template.file_path && (
            <span className="badge badge-purple" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={10} />
              <span>SUPABASE STORAGE DOCX</span>
            </span>
          )}
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Standar Jukminu & Perkap Polri
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Toggle Variable Map */}
          <button
            type="button"
            onClick={() => setShowVariableMap(!showVariableMap)}
            className="btn btn-secondary btn-sm"
            title="Lihat pemetaan variabel {CASE_*} dan {DOC_*}"
          >
            <Table size={14} />
            <span>{showVariableMap ? 'Tutup Variabel' : 'Cek Variabel'}</span>
          </button>

          {/* Download Real .docx from Supabase */}
          <button 
            type="button"
            disabled={isGeneratingDocx}
            onClick={handleGenerateDocx}
            className="btn btn-primary btn-sm"
            style={{
              boxShadow: 'var(--glow-cyan)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Generate dan download file Microsoft Word (.docx) murni dari template Supabase Storage"
          >
            {isGeneratingDocx ? (
              <>
                <RefreshCw size={14} className="animate-pulse" />
                <span>Menurunkan dari Supabase...</span>
              </>
            ) : (
              <>
                <Download size={14} />
                <span>Generate & Unduh .docx</span>
              </>
            )}
          </button>

          {onSaveArchive && (
            <button 
              type="button"
              onClick={onSaveArchive}
              className={`btn ${isSaved ? 'btn-secondary' : 'btn-secondary'} btn-sm`}
            >
              <CheckCircle2 size={14} color={isSaved ? 'var(--accent-green)' : 'currentColor'} />
              <span>{isSaved ? 'Tersimpan' : 'Simpan Arsip'}</span>
            </button>
          )}

          <button 
            type="button"
            onClick={() => window.print()}
            className="btn btn-secondary btn-sm"
            title="Cetak langsung atau simpan sebagai PDF"
          >
            <Printer size={14} />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* Success Notice */}
      {downloadSuccessNotice && (
        <div className="no-print" style={{
          padding: '10px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(34, 197, 94, 0.15)',
          border: '1px solid var(--accent-green)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#FFFFFF',
          fontSize: '12.5px',
          animation: 'slideInRight 200ms ease-out',
        }}>
          <CheckCircle2 size={16} color="var(--accent-green)" />
          <span>{downloadSuccessNotice}</span>
        </div>
      )}

      {/* Variable Map Inspector Modal / Drawer */}
      {showVariableMap && (
        <div className="no-print glass" style={{
          padding: '16px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--accent-cyan)',
          maxHeight: '260px',
          overflowY: 'auto',
          fontSize: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
              DAFTAR VARIABEL TERPETAKAN KE TEMPLATE DOCX (TOTAL: {Object.keys(currentDataMap).length})
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Otomatis diinject ke file .docx via Pizzip & Docxtemplater
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '6px' }}>
            {Object.entries(currentDataMap).map(([key, val]) => (
              <div key={key} style={{
                padding: '6px 10px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                gap: '8px',
              }}>
                <span className="mono" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{`{${key}}`}:</span>
                <span style={{ color: 'var(--text-primary)', textAlign: 'right', wordBreak: 'break-word' }}>
                  {val ? String(val).slice(0, 32) : <span style={{ color: 'var(--text-muted)' }}>[kosong]</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Official Police Sheet Document */}
      <div className="police-doc-paper" id="printable-police-document">
        {/* KOP SURAT POLRI */}
        <div className="kop-surat-header">
          <div className="kop-surat-instansi">KEPOLISIAN NEGARA REPUBLIK INDONESIA</div>
          <div className="kop-surat-sub">DAERAH SULAWESI TENGGARA</div>
          <div className="kop-surat-sub">RESOR KOLAKA TIMUR</div>
          <div className="kop-surat-sub" style={{ textDecoration: 'underline' }}>SATUAN RESERSE KRIMINAL</div>
          <div className="kop-surat-address">Jl. Poros Kolaka - Kendari Km. 50, Tirawuta, Kolaka Timur 93572</div>
        </div>

        {/* PRO JUSTITIA */}
        <div className="doc-pro-justitia">"PRO JUSTITIA"</div>

        {/* JUDUL DOKUMEN */}
        <div className="doc-main-title">{template.title}</div>
        <div className="doc-main-number">Nomor : {docNo}</div>

        {/* KONTEN BERDASARKAN JENIS DOKUMEN */}
        {template.code.startsWith('SPRIN') && (
          <div>
            <table style={{ width: '100%', marginBottom: '16px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ verticalAlign: 'top' }}>
                  <td style={{ width: '140px', fontWeight: 600 }}>Pertimbangan :</td>
                  <td style={{ textAlign: 'justify' }}>
                    Bahwa untuk kepentingan penyidikan tindak pidana, dipandang perlu untuk mengeluarkan Surat Perintah ini demi terwujudnya kepastian hukum yang berkeadilan.
                  </td>
                </tr>
                <tr style={{ verticalAlign: 'top' }}>
                  <td style={{ fontWeight: 600, paddingTop: '8px' }}>Dasar :</td>
                  <td style={{ textAlign: 'justify', paddingTop: '8px' }}>
                    <ol style={{ paddingLeft: '20px', margin: 0 }}>
                      <li>Pasal 1 angka 2, Pasal 5, Pasal 7, Pasal 106, 108, 109 KUHAP;</li>
                      <li>Undang-Undang Republik Indonesia Nomor 2 Tahun 2002 tentang Kepolisian Negara Republik Indonesia;</li>
                      <li>Laporan Polisi Nomor : <strong>{selectedCase.no_lp}</strong>;</li>
                      {selectedCase.references?.no_sprin_sidik && template.code !== 'SPRIN_SIDIK' && (
                        <li>Surat Perintah Penyidikan Nomor : <strong>{selectedCase.references.no_sprin_sidik}</strong>;</li>
                      )}
                    </ol>
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ textAlign: 'center', fontWeight: 700, margin: '14px 0', letterSpacing: '0.1em' }}>
              DIPERINTAHKAN
            </div>

            <table style={{ width: '100%', marginBottom: '16px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr style={{ verticalAlign: 'top' }}>
                  <td style={{ width: '100px', fontWeight: 600 }}>Kepada :</td>
                  <td>
                    <ol style={{ paddingLeft: '20px', margin: 0 }}>
                      {selectedCase.investigators?.map((inv, idx) => {
                        const p = findPerson(inv.user_id || inv.nrp) || inv;
                        return (
                          <li key={idx} style={{ marginBottom: '4px' }}>
                            <strong>{p ? p.nama : 'Penyidik'}</strong> / Pangkat: {p ? p.pangkat : '-'} / NRP: {p ? p.nrp : '-'} / Jabatan: {p ? p.jabatan : '-'}
                          </li>
                        );
                      })}
                    </ol>
                  </td>
                </tr>
                <tr style={{ verticalAlign: 'top' }}>
                  <td style={{ fontWeight: 600, paddingTop: '10px' }}>Untuk :</td>
                  <td style={{ textAlign: 'justify', paddingTop: '10px' }}>
                    <ol style={{ paddingLeft: '20px', margin: 0 }}>
                      <li>
                        Melaksanakan {template.title.toLowerCase()} terkait dugaan tindak pidana <strong>{selectedCase.tindak_pidana}</strong> sebagaimana dimaksud dalam <strong>{selectedCase.pasal_uu}</strong>, yang terjadi di {selectedCase.locus} pada {selectedCase.tempus}.
                      </li>
                      <li>
                        Atas nama Terlapor / Tersangka : <strong>{selectedCase.person?.nama || selectedCase.terlapor_name}</strong>.
                      </li>
                      <li>
                        Surat Perintah ini berlaku selama <strong>{validity}</strong> terhitung sejak tanggal dikeluarkan.
                      </li>
                      <li>
                        Melaporkan hasil pelaksanaan tugas kepada atasan penyidik secara berkala.
                      </li>
                    </ol>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* JIKA SPDP */}
        {template.code.startsWith('SPDP') && (
          <div>
            <table style={{ width: '100%', marginBottom: '18px', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ width: '80px' }}>Klasifikasi</td>
                  <td style={{ width: '10px' }}>:</td>
                  <td><strong>BIASA</strong></td>
                  <td style={{ textAlign: 'right' }}>{docLocation}, {docDate}</td>
                </tr>
                <tr>
                  <td>Lampiran</td>
                  <td>:</td>
                  <td>-</td>
                  <td></td>
                </tr>
                <tr style={{ verticalAlign: 'top' }}>
                  <td>Perihal</td>
                  <td>:</td>
                  <td>
                    <strong><u>Pemberitahuan Dimulainya Penyidikan</u></strong>
                  </td>
                  <td style={{ textAlign: 'right', verticalAlign: 'top' }}>
                    Kepada Yth.<br />
                    <strong>{formValues.DOC_TARGET || 'KEPALA KEJAKSAAN NEGERI KOLAKA'}</strong><br />
                    di -<br />
                    <u>{formValues.DOC_TARGET_ADDR || 'Tempat'}</u>
                  </td>
                </tr>
              </tbody>
            </table>

            <p style={{ textAlign: 'justify', textIndent: '30px', margin: '12px 0' }}>
              Dengan ini diberitahukan bahwa pada hari ini telah dimulai penyidikan perkara tindak pidana <strong>{selectedCase.tindak_pidana}</strong> sebagaimana dimaksud dalam <strong>{selectedCase.pasal_uu}</strong>, berdasarkan Laporan Polisi Nomor : <strong>{selectedCase.no_lp}</strong>.
            </p>

            <div style={{ margin: '14px 0 8px', fontWeight: 600 }}>Identitas Tersangka / Terlapor :</div>
            <table style={{ width: '100%', marginLeft: '20px', borderCollapse: 'collapse', fontSize: '13px' }}>
              <tbody>
                <tr><td style={{ width: '140px' }}>Nama Lengkap</td><td>: <strong>{selectedCase.person?.nama || selectedCase.terlapor_name}</strong></td></tr>
                <tr><td>Tempat / Tgl Lahir</td><td>: {selectedCase.person?.pob_dob} ({selectedCase.person?.umur})</td></tr>
                <tr><td>Jenis Kelamin</td><td>: {selectedCase.person?.gender}</td></tr>
                <tr><td>Agama / Pekerjaan</td><td>: {selectedCase.person?.agama} / {selectedCase.person?.pekerjaan}</td></tr>
                <tr><td>Alamat Tempat Tinggal</td><td>: {selectedCase.person?.alamat || selectedCase.locus}</td></tr>
              </tbody>
            </table>
          </div>
        )}

        {/* JIKA BAP ATAU BERITA ACARA */}
        {(template.code.startsWith('BAP') || template.category === 'BERITA ACARA') && !template.code.startsWith('SPDP') && !template.code.startsWith('SPRIN') && (
          <div>
            <p style={{ textAlign: 'justify', textIndent: '30px', margin: '12px 0' }}>
              Pada hari ini, tanggal <strong>{docDate}</strong>, pukul 10.00 WITA, saya :
            </p>

            <table style={{ width: '100%', marginLeft: '20px', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '14px' }}>
              <tbody>
                <tr>
                  <td style={{ width: '140px' }}>Nama</td>
                  <td>: <strong>{pjOfficer ? pjOfficer.nama : 'Penyidik Satreskrim'}</strong></td>
                </tr>
                <tr>
                  <td>Pangkat / NRP</td>
                  <td>: {pjOfficer ? `${pjOfficer.pangkat} / ${pjOfficer.nrp}` : '-'}</td>
                </tr>
                <tr>
                  <td>Jabatan</td>
                  <td>: {pjOfficer ? pjOfficer.jabatan : 'Penyidik'} pada Satreskrim Polres Kolaka Timur</td>
                </tr>
              </tbody>
            </table>

            <p style={{ textAlign: 'justify', textIndent: '30px', margin: '12px 0' }}>
              Telah melakukan pemeriksaan terhadap seorang yang mengaku bernama :
            </p>

            <table style={{ width: '100%', marginLeft: '20px', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '14px' }}>
              <tbody>
                <tr><td style={{ width: '140px' }}>Nama Lengkap</td><td>: <strong>{template.code === 'BAP_TSK' ? (selectedCase.person?.nama || selectedCase.terlapor_name) : selectedCase.pelapor_name}</strong></td></tr>
                <tr><td>NIK</td><td>: {template.code === 'BAP_TSK' ? selectedCase.person?.nik : '7405021204850002'}</td></tr>
                <tr><td>Tempat/Tgl Lahir</td><td>: {template.code === 'BAP_TSK' ? selectedCase.person?.pob_dob : 'Kolaka, 12-04-1985'}</td></tr>
                <tr><td>Alamat</td><td>: {template.code === 'BAP_TSK' ? (selectedCase.person?.alamat || selectedCase.locus) : 'Kec. Tirawuta, Kab. Kolaka Timur'}</td></tr>
              </tbody>
            </table>

            <p style={{ textAlign: 'justify', textIndent: '30px', margin: '12px 0' }}>
              Ia diperiksa dan didengar keterangannya sehubungan dengan peristiwa dugaan tindak pidana <strong>{selectedCase.tindak_pidana}</strong> sesuai Laporan Polisi No : <strong>{selectedCase.no_lp}</strong>.
            </p>
          </div>
        )}

        {/* TANDA TANGAN RESMI */}
        <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'flex-end' }}>
          <div className="doc-signature-block">
            <div style={{ fontSize: '12px' }}>Dikeluarkan di : {docLocation}</div>
            <div style={{ fontSize: '12px', marginBottom: '8px' }}>Pada tanggal : {docDate}</div>
            <div style={{ fontWeight: 700, fontSize: '12.5px', textTransform: 'uppercase' }}>
              KEPALA SATUAN RESERSE KRIMINAL<br />SELAKU PENYIDIK
            </div>
            
            {/* Space for signature */}
            <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '10px', color: '#9CA3AF', fontStyle: 'italic' }}>
                [Tanda Tangan & Cap Dinas]
              </span>
            </div>

            <div style={{ fontWeight: 700, textDecoration: 'underline', fontSize: '13px' }}>
              {signerKasat ? signerKasat.nama : 'AKP AHMAD FATONI, S.H.'}
            </div>
            <div style={{ fontSize: '12px' }}>
              {signerKasat ? signerKasat.pangkat : 'AKP'} NRP {signerKasat ? signerKasat.nrp : '78120567'}
            </div>
          </div>
        </div>

        {/* TEMBUSAN */}
        <div style={{ marginTop: '50px', clear: 'both', fontSize: '11px' }}>
          <div style={{ fontWeight: 600 }}><u>Tembusan :</u></div>
          <ol style={{ paddingLeft: '18px', margin: '4px 0' }}>
            <li>Kapolres Kolaka Timur (sebagai laporan)</li>
            <li>Wakapolres Kolaka Timur</li>
            <li>Kasi Propam Polres Kolaka Timur</li>
            <li>Arsip Satreskrim</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
