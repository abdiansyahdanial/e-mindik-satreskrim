import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldAlert, 
  User, 
  MapPin, 
  Calendar, 
  Users, 
  FileSignature,
  UserPlus,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Briefcase,
  Home,
  Edit3
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getPersonnelById } from '../data/mockPersonnel';
import CaseEditModal from './CaseEditModal';

export default function CaseDetail({ 
  caseItem, 
  onClose, 
  onGenerateDocForCase, 
  onUpdateCase,
  caseDocuments = [],
  personnel = []
}) {
  const [suspects, setSuspects] = useState([]);
  const [isLoadingSuspects, setIsLoadingSuspects] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [submittingSuspect, setSubmittingSuspect] = useState(false);
  const [notice, setNotice] = useState(null);

  // Form penetapan tersangka baru
  const [suspectForm, setSuspectForm] = useState({
    nama: caseItem?.nama_terlapor || caseItem?.terlapor_name || '',
    nik: '',
    jenis_kelamin: 'Laki-laki',
    tempat_lahir: 'Kolaka Timur',
    tgl_lahir: '1990-01-01',
    umur: '36',
    agama: 'Islam',
    pekerjaan: 'Swasta',
    kewarganegaraan: 'Indonesia',
    pendidikan: 'SMA',
    status_pernikahan: 'Kawin',
    alamat: caseItem?.locus || '',
    no_sp_tap_tsk: `S.Tap/${Math.floor(Math.random() * 50 + 10)}/IX/2026/Reskrim`
  });

  // Fetch suspects from Supabase
  const fetchSuspects = async () => {
    if (!caseItem?.id) return;
    setIsLoadingSuspects(true);
    try {
      const { data, error } = await supabase
        .from('case_suspects')
        .select('*')
        .eq('case_id', caseItem.id)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        setSuspects(data);
      } else {
        // Fallback jika belum ada di database, gunakan data person di caseItem jika ada
        if (caseItem.person && caseItem.person.nama && caseItem.person.nama !== 'Dalam Penyelidikan') {
          const fallbackSuspect = {
            id: 'legacy-suspect-1',
            case_id: caseItem.id,
            nama: caseItem.person.nama,
            nik: caseItem.person.nik || '-',
            jenis_kelamin: caseItem.person.gender || 'Laki-laki',
            tempat_lahir: (caseItem.person.pob_dob || '').split(',')[0] || 'Kolaka Timur',
            tgl_lahir: (caseItem.person.pob_dob || '').split(',')[1]?.trim() || '',
            umur: caseItem.person.umur || '30',
            agama: caseItem.person.agama || 'Islam',
            pekerjaan: caseItem.person.pekerjaan || 'Swasta',
            kewarganegaraan: caseItem.person.kewarganegaraan || 'Indonesia',
            pendidikan: caseItem.person.pendidikan || 'SMA',
            status_pernikahan: caseItem.person.marital_status || 'Kawin',
            alamat: caseItem.person.alamat || caseItem.locus,
            status: 'tersangka',
            no_sp_tap_tsk: caseItem.references?.no_sp_tap_tsk || '',
            no_sprin_kap: caseItem.references?.no_sprin_kap || '',
            no_sprin_han: caseItem.references?.no_sprin_han || '',
          };
          setSuspects([fallbackSuspect]);
        } else {
          setSuspects([]);
        }
      }
    } catch (err) {
      console.warn('Error loading suspects:', err);
    } finally {
      setIsLoadingSuspects(false);
    }
  };

  useEffect(() => {
    fetchSuspects();
  }, [caseItem?.id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSuspectForm((prev) => {
      const updated = { ...prev, [name]: value };
      // Hitung umur otomatis jika tgl_lahir diubah
      if (name === 'tgl_lahir' && value) {
        const birthYear = new Date(value).getFullYear();
        if (!isNaN(birthYear)) {
          const currentYear = new Date().getFullYear();
          updated.umur = String(Math.max(1, currentYear - birthYear));
        }
      }
      return updated;
    });
  };

  const handleAddSuspect = async (e) => {
    e.preventDefault();
    if (!suspectForm.nama.trim()) {
      alert('Nama Tersangka wajib diisi.');
      return;
    }

    setSubmittingSuspect(true);
    setNotice(null);

    const payload = {
      case_id: caseItem.id,
      nama: suspectForm.nama.trim(),
      nik: suspectForm.nik.trim() || '-',
      jenis_kelamin: suspectForm.jenis_kelamin,
      tempat_lahir: suspectForm.tempat_lahir.trim(),
      tgl_lahir: suspectForm.tgl_lahir,
      umur: suspectForm.umur ? `${suspectForm.umur}` : '-',
      agama: suspectForm.agama,
      pekerjaan: suspectForm.pekerjaan.trim(),
      kewarganegaraan: suspectForm.kewarganegaraan.trim(),
      pendidikan: suspectForm.pendidikan,
      status_pernikahan: suspectForm.status_pernikahan,
      alamat: suspectForm.alamat.trim(),
      status: 'tersangka',
      no_sp_tap_tsk: suspectForm.no_sp_tap_tsk.trim(),
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('case_suspects')
        .insert([payload])
        .select();

      if (error) {
        console.warn('Gagal menyimpan ke tabel case_suspects Supabase:', error.message);
        // Simpan ke local state jika tabel belum dimigrasi di remote
        const localSuspect = { ...payload, id: `suspect-${Date.now()}` };
        setSuspects((prev) => [...prev, localSuspect]);
        setNotice({
          type: 'success',
          message: `Tersangka '${payload.nama}' berhasil ditetapkan (Tersimpan di sesi aktif)!`
        });
      } else {
        const savedSuspect = data?.[0] || payload;
        setSuspects((prev) => [...prev, savedSuspect]);
        setNotice({
          type: 'success',
          message: `Berhasil! Tersangka '${payload.nama}' resmi ditetapkan dengan Surat Nomor: ${payload.no_sp_tap_tsk}`
        });
      }

      setIsModalOpen(false);
      // Reset form
      setSuspectForm({
        nama: '',
        nik: '',
        jenis_kelamin: 'Laki-laki',
        tempat_lahir: 'Kolaka Timur',
        tgl_lahir: '1990-01-01',
        umur: '36',
        agama: 'Islam',
        pekerjaan: 'Swasta',
        kewarganegaraan: 'Indonesia',
        pendidikan: 'SMA',
        status_pernikahan: 'Kawin',
        alamat: caseItem?.locus || '',
        no_sp_tap_tsk: `S.Tap/${Math.floor(Math.random() * 50 + 10)}/IX/2026/Reskrim`
      });
    } catch (err) {
      alert(`Terjadi kesalahan: ${err.message}`);
    } finally {
      setSubmittingSuspect(false);
    }
  };

  if (!caseItem) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '920px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(0, 212, 255, 0.1)',
              border: '1px solid var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ShieldAlert size={22} color="var(--accent-cyan)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-cyan">{caseItem.status?.toUpperCase() || 'ACTIVE'}</span>
                <span className="mono" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {caseItem.nomor_lp || caseItem.no_lp}
                </span>
              </div>
              <h3 style={{ margin: '4px 0 0', fontSize: '17px', fontWeight: 700 }}>
                {caseItem.tindak_pidana} ({caseItem.dasar_pasal_uu || caseItem.pasal_uu})
              </h3>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="btn btn-secondary btn-sm"
              style={{ gap: '6px', fontSize: '12px', padding: '6px 12px' }}
              title="Edit Data Berkas Perkara"
            >
              <Edit3 size={14} color="var(--accent-cyan)" />
              <span>Edit Perkara</span>
            </button>

            <button 
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '6px',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: '76vh', overflowY: 'auto' }}>
          {notice && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: notice.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${notice.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'}`,
              color: '#FFF',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={16} color={notice.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'} />
              <span>{notice.message}</span>
            </div>
          )}

          {/* Locus & Tempus Info Box */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px',
            padding: '14px',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-glass)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <MapPin size={16} color="var(--accent-cyan)" style={{ marginTop: '3px' }} />
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Tempat Kejadian (Locus Delicti)
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
                  {caseItem.locus}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <Calendar size={16} color="var(--accent-cyan)" style={{ marginTop: '3px' }} />
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Waktu Kejadian (Tempus Delicti)
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
                  {caseItem.tempus}
                </div>
              </div>
            </div>
          </div>

          {/* Pelapor Info */}
          <div style={{
            padding: '14px 16px',
            background: 'rgba(19, 29, 53, 0.4)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <User size={18} color="#60A5FA" />
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase' }}>
                  Pelapor / Saksi Korban
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>
                  {caseItem.nama_pelapor || caseItem.pelapor_name}
                </div>
              </div>
            </div>

            <div>
              <span className="badge badge-blue" style={{ fontSize: '11px' }}>
                Terlapor Terdaftar: {caseItem.nama_terlapor || caseItem.terlapor_name || '-'}
              </span>
            </div>
          </div>

          {/* SECTION TERSANGKA (BAGIAN 3: RELASI DATA TERSANGKA BERJENJANG) */}
          <div style={{
            padding: '16px',
            background: 'rgba(239, 68, 68, 0.03)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} color="var(--accent-red)" />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-red)', textTransform: 'uppercase' }}>
                    Daftar Tersangka Resmi ({suspects.length})
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Identitas yuridis sah berdasarkan Gelar Perkara & Surat Penetapan Tersangka (SP.TAP.TSK)
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="btn btn-primary btn-sm"
                style={{
                  background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
                  boxShadow: '0 2px 10px rgba(239, 68, 68, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <UserPlus size={14} />
                <span>+ Tetapkan Tersangka</span>
              </button>
            </div>

            {suspects.length === 0 ? (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                background: 'rgba(15, 23, 42, 0.6)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed rgba(239, 68, 68, 0.25)',
                color: 'var(--text-secondary)',
                fontSize: '12.5px'
              }}>
                <ShieldAlert size={28} color="var(--accent-red)" style={{ margin: '0 auto 8px', opacity: 0.6 }} />
                <div>Belum ada pihak yang ditetapkan sebagai tersangka pada perkara ini.</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Klik tombol <strong>"+ Tetapkan Tersangka"</strong> setelah pelaksanaan gelar penetapan tersangka.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {suspects.map((s, idx) => (
                  <div 
                    key={s.id || idx}
                    style={{
                      padding: '14px',
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="badge badge-red" style={{ fontSize: '11px' }}>
                          TERSANGKA {idx + 1}
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#FFF' }}>
                          {s.nama}
                        </span>
                        <span className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          (NIK: {s.nik || '-'})
                        </span>
                      </div>

                      {s.no_sp_tap_tsk && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>SP.TAP.TSK:</span>
                          <span className="badge badge-purple mono" style={{ fontSize: '11px' }}>
                            {s.no_sp_tap_tsk}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Detail Yuridis */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '6px 16px',
                      fontSize: '11.5px',
                      color: 'var(--text-secondary)',
                      background: 'rgba(0, 0, 0, 0.2)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)'
                    }}>
                      <div>TTL: <strong style={{ color: '#FFF' }}>{s.tempat_lahir || '-'}, {s.tgl_lahir || '-'}</strong> ({s.umur ? (String(s.umur).includes('Tahun') ? s.umur : `${s.umur} Thn`) : '-'})</div>
                      <div>Jenis Kelamin: <strong style={{ color: '#FFF' }}>{s.jenis_kelamin || 'Laki-laki'}</strong></div>
                      <div>Agama: <strong style={{ color: '#FFF' }}>{s.agama || 'Islam'}</strong></div>
                      <div>Pekerjaan: <strong style={{ color: '#FFF' }}>{s.pekerjaan || '-'}</strong></div>
                      <div>Pendidikan: <strong style={{ color: '#FFF' }}>{s.pendidikan || 'SMA'}</strong></div>
                      <div>Status Kawin: <strong style={{ color: '#FFF' }}>{s.status_pernikahan || '-'}</strong></div>
                      <div style={{ gridColumn: '1 / -1' }}>Alamat: <strong style={{ color: '#FFF' }}>{s.alamat || '-'}</strong></div>
                    </div>

                    {/* Riwayat Surat Perorangan */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '11px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Rantai Surat Perorangan:</span>
                      {s.no_sprin_kap && (
                        <span className="badge badge-amber mono" title="Nomor SP.KAP">
                          SP.KAP: {s.no_sprin_kap}
                        </span>
                      )}
                      {s.no_sprin_han && (
                        <span className="badge badge-red mono" title="Nomor SP.HAN">
                          SP.HAN: {s.no_sprin_han}
                        </span>
                      )}
                      {s.no_panjang_han_kn && (
                        <span className="badge badge-blue mono" title="Perpanjangan Tahanan Kejaksaan">
                          PANJANG.HAN: {s.no_panjang_han_kn}
                        </span>
                      )}
                      {!s.no_sprin_kap && !s.no_sprin_han && (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Belum diterbitkan penangkapan/penahanan
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pejabat & Tim Penyidik Penanggung Jawab */}
          <div style={{
            padding: '14px 16px',
            background: 'rgba(19, 29, 53, 0.4)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} color="var(--accent-cyan)" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
                Pejabat & Tim Penyidik Penanggung Jawab
              </span>
            </div>

            {/* Kasat Reskrim */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                background: 'rgba(0, 212, 255, 0.08)',
                border: '1px solid rgba(0, 212, 255, 0.3)',
                borderRadius: 'var(--radius-md)',
              }}>
                <span className="badge badge-blue" style={{ fontSize: '10px' }}>
                  KASAT RESKRIM
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#FFF' }}>
                  {caseItem.kasat_nama || 'Belum diisi'}
                </span>
                {caseItem.kasat_pangkat && (
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--accent-cyan)' }}>
                    ({caseItem.kasat_pangkat} / NRP: {caseItem.kasat_nrp || '-'})
                  </span>
                )}
              </div>
            </div>

            {/* Tim Penyidik 1 s.d. 5 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {[1, 2, 3, 4, 5].map((slot) => {
                const nama = caseItem[`penyidik_${slot}_nama`] || caseItem.investigators?.[slot - 1]?.nama;
                const pangkat = caseItem[`penyidik_${slot}_pangkat`] || caseItem.investigators?.[slot - 1]?.pangkat;
                const nrp = caseItem[`penyidik_${slot}_nrp`] || caseItem.investigators?.[slot - 1]?.nrp;
                const jabatan = caseItem[`penyidik_${slot}_jabatan`] || caseItem.investigators?.[slot - 1]?.jabatan;

                if (!nama) return null;

                return (
                  <div key={slot} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    background: slot === 1 ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-elevated)',
                    border: slot === 1 ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-md)',
                  }}>
                    <span className={slot === 1 ? 'badge badge-green' : 'badge badge-gray'} style={{ fontSize: '10px' }}>
                      {slot === 1 ? 'Kanit / P1' : `Penyidik ${slot}`}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>
                      {nama}
                    </span>
                    <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      ({pangkat || '-'} {nrp ? `NRP: ${nrp}` : ''})
                    </span>
                    {jabatan && (
                      <span style={{ fontSize: '10px', color: 'var(--accent-cyan)' }}>
                        [{jabatan}]
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Riwayat Dokumen Mindik Terkait */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                Dokumen Administrasi Penyidikan ({caseDocuments.length})
              </div>
              <button
                onClick={() => {
                  onClose();
                  onGenerateDocForCase(caseItem);
                }}
                className="btn btn-primary btn-sm"
              >
                <FileSignature size={14} />
                <span>+ Buat Dokumen untuk Perkara Ini</span>
              </button>
            </div>

            {caseDocuments.length === 0 ? (
              <div style={{
                padding: '20px',
                textAlign: 'center',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-secondary)',
                fontSize: '13px',
              }}>
                Belum ada dokumen yang digenerate untuk perkara ini.
              </div>
            ) : (
              <div className="table-container">
                <table className="tactical-table">
                  <thead>
                    <tr>
                      <th>Kode</th>
                      <th>Nama Dokumen</th>
                      <th>Nomor Surat</th>
                      <th>Tanggal Dikeluarkan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caseDocuments.map((doc) => (
                      <tr key={doc.id}>
                        <td>
                          <span className="badge badge-cyan mono">{doc.template_code}</span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{doc.doc_title}</td>
                        <td className="mono">{doc.doc_number || '-'}</td>
                        <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                          {doc.created_at}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            Tutup
          </button>
          <button 
            onClick={() => {
              onClose();
              onGenerateDocForCase(caseItem);
            }} 
            className="btn btn-primary btn-sm"
          >
            <FileSignature size={14} />
            <span>Generate Mindik Sekarang</span>
          </button>
        </div>
      </div>

      {/* MODAL INPUT PENETAPAN TERSANGKA BARU */}
      {isModalOpen && (
        <div 
          className="modal-backdrop" 
          style={{ zIndex: 1100 }}
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="modal-content" 
            style={{ maxWidth: '680px', border: '1px solid var(--accent-red)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid var(--accent-red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <UserPlus size={18} color="var(--accent-red)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', margin: 0, fontWeight: 700 }}>Penetapan Tersangka Baru (SP.TAP.TSK)</h3>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Input identitas yuridis lengkap tersangka untuk perkara {caseItem.nomor_lp || caseItem.no_lp}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSuspect}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '68vh', overflowY: 'auto' }}>
                {/* Nomor Surat Penetapan Tersangka */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: 'var(--accent-red)', fontWeight: 700 }}>
                    Nomor Surat Penetapan Tersangka (SP.TAP.TSK) <span style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="no_sp_tap_tsk"
                    value={suspectForm.no_sp_tap_tsk}
                    onChange={handleInputChange}
                    placeholder="Contoh: S.Tap/12/VIII/2026/Reskrim"
                    className="form-input mono"
                    required
                  />
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                    Nomor ini otomatis menjadi rantai rujukan ({'{NO_SP_TAP_TSK}'}) saat membuat SP.KAP dan SP.HAN berikutnya.
                  </span>
                </div>

                {/* Nama Lengkap & NIK */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">
                      Nama Lengkap Tersangka <span style={{ color: 'var(--accent-red)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="nama"
                      value={suspectForm.nama}
                      onChange={handleInputChange}
                      placeholder="Nama lengkap sesuai KTP..."
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">
                      NIK (Nomor Induk Kependudukan)
                    </label>
                    <input
                      type="text"
                      name="nik"
                      value={suspectForm.nik}
                      onChange={handleInputChange}
                      placeholder="16 digit NIK..."
                      className="form-input mono"
                    />
                  </div>
                </div>

                {/* TTL, Umur, Jenis Kelamin */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Tempat Lahir</label>
                    <input
                      type="text"
                      name="tempat_lahir"
                      value={suspectForm.tempat_lahir}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Tanggal Lahir</label>
                    <input
                      type="date"
                      name="tgl_lahir"
                      value={suspectForm.tgl_lahir}
                      onChange={handleInputChange}
                      className="form-input mono"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Umur (Thn)</label>
                    <input
                      type="text"
                      name="umur"
                      value={suspectForm.umur}
                      onChange={handleInputChange}
                      placeholder="35"
                      className="form-input mono"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Jenis Kelamin</label>
                    <select
                      name="jenis_kelamin"
                      value={suspectForm.jenis_kelamin}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>
                </div>

                {/* Agama, Pekerjaan, Kewarganegaraan */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Agama</label>
                    <select
                      name="agama"
                      value={suspectForm.agama}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      <option value="Islam">Islam</option>
                      <option value="Kristen">Kristen</option>
                      <option value="Katolik">Katolik</option>
                      <option value="Hindu">Hindu</option>
                      <option value="Buddha">Buddha</option>
                      <option value="Konghucu">Konghucu</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Pekerjaan</label>
                    <input
                      type="text"
                      name="pekerjaan"
                      value={suspectForm.pekerjaan}
                      onChange={handleInputChange}
                      placeholder="Petani / Swasta..."
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Kewarganegaraan</label>
                    <input
                      type="text"
                      name="kewarganegaraan"
                      value={suspectForm.kewarganegaraan}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Pendidikan & Status Perkawinan */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Pendidikan Terakhir</label>
                    <select
                      name="pendidikan"
                      value={suspectForm.pendidikan}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      <option value="SD">SD</option>
                      <option value="SMP">SMP</option>
                      <option value="SMA">SMA / Sederajat</option>
                      <option value="D3">Diploma (D3)</option>
                      <option value="S1">Sarjana (S1)</option>
                      <option value="S2">Magister (S2)</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Status Pernikahan</label>
                    <select
                      name="status_pernikahan"
                      value={suspectForm.status_pernikahan}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      <option value="Belum Kawin">Belum Kawin</option>
                      <option value="Kawin">Kawin</option>
                      <option value="Cerai Hidup">Cerai Hidup</option>
                      <option value="Cerai Mati">Cerai Mati</option>
                    </select>
                  </div>
                </div>

                {/* Alamat Lengkap */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Alamat Tempat Tinggal Lengkap</label>
                  <textarea
                    name="alamat"
                    value={suspectForm.alamat}
                    onChange={handleInputChange}
                    placeholder="Alamat domisili tersangka..."
                    className="form-textarea"
                    style={{ minHeight: '60px' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary btn-sm">
                  Batal
                </button>
                <button type="submit" disabled={submittingSuspect} className="btn btn-primary btn-sm" style={{ background: 'var(--accent-red)' }}>
                  <FileCheck2 size={14} />
                  <span>{submittingSuspect ? 'Menyimpan...' : 'Simpan & Tetapkan Tersangka'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Edit Berkas Perkara */}
      {isEditModalOpen && (
        <CaseEditModal
          isOpen={isEditModalOpen}
          caseItem={caseItem}
          personnel={personnel}
          onClose={() => setIsEditModalOpen(false)}
          onSaveSuccess={(updated) => {
            if (onUpdateCase) onUpdateCase(updated);
            setIsEditModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
