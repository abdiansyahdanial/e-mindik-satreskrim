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
  Edit3,
  Trash2,
  UserCheck
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getPersonnelById } from '../data/mockPersonnel';
import CaseEditModal from './CaseEditModal';
import { formatTanggalIndonesia } from '../utils/mindikGenerator';

export default function CaseDetail({ 
  caseItem, 
  onClose, 
  onGenerateDocForCase, 
  onUpdateCase,
  caseDocuments = [],
  personnel = [],
  fetchCaseDetail,
  loadData
}) {
  const [suspects, setSuspects] = useState([]);
  const [isLoadingSuspects, setIsLoadingSuspects] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSuspect, setEditingSuspect] = useState(null);
  const [formData, setFormData] = useState({
    nama: '',
    nik: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    tgl_lahir: '',
    umur: '',
    jenis_kelamin: 'Laki-laki',
    pekerjaan: '',
    kewarganegaraan: 'Indonesia',
    pendidikan: 'SMA',
    agama: 'Islam',
    status_pernikahan: 'Kawin',
    alamat: '',
    status: 'tersangka',
    nomor_sp_tap: '',
    tanggal_sp_tap: ''
  });
  const [subjekTab, setSubjekTab] = useState('all'); // 'all' | 'tersangka' | 'terlapor'
  const [submittingSuspect, setSubmittingSuspect] = useState(false);
  const [notice, setNotice] = useState(null);

  // Form penetapan tersangka / penambahan subjek baru
  const defaultSuspectForm = {
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
    status: 'tersangka', // 'tersangka' | 'terlapor'
    nomor_sp_tap: `S.Tap/${Math.floor(Math.random() * 50 + 10)}/IX/2026/Reskrim`,
    tanggal_sp_tap: new Date().toISOString().split('T')[0],
    no_sp_tap_tsk: `S.Tap/${Math.floor(Math.random() * 50 + 10)}/IX/2026/Reskrim`,
    tgl_sp_tap_tsk: new Date().toISOString().split('T')[0]
  };

  const [suspectForm, setSuspectForm] = useState(defaultSuspectForm);

  const resetSuspectForm = (targetStatus = 'tersangka') => {
    setSuspectForm({
      ...defaultSuspectForm,
      nama: '',
      status: targetStatus,
      nomor_sp_tap: targetStatus === 'tersangka' ? `S.Tap/${Math.floor(Math.random() * 50 + 10)}/IX/2026/Reskrim` : '',
      tanggal_sp_tap: targetStatus === 'tersangka' ? new Date().toISOString().split('T')[0] : '',
      no_sp_tap_tsk: targetStatus === 'tersangka' ? `S.Tap/${Math.floor(Math.random() * 50 + 10)}/IX/2026/Reskrim` : '',
      tgl_sp_tap_tsk: targetStatus === 'tersangka' ? new Date().toISOString().split('T')[0] : ''
    });
  };

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
            nomor_sp_tap: caseItem.references?.no_sp_tap_tsk || '',
            tanggal_sp_tap: caseItem.references?.tgl_sp_tap_tsk || '',
            no_sp_tap_tsk: caseItem.references?.no_sp_tap_tsk || '',
            tgl_sp_tap_tsk: caseItem.references?.tgl_sp_tap_tsk || '',
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
      // Sinkronisasi alias no_sp_tap_tsk <-> nomor_sp_tap
      if (name === 'nomor_sp_tap') updated.no_sp_tap_tsk = value;
      if (name === 'no_sp_tap_tsk') updated.nomor_sp_tap = value;
      if (name === 'tanggal_sp_tap') updated.tgl_sp_tap_tsk = value;
      if (name === 'tgl_sp_tap_tsk') updated.tanggal_sp_tap = value;

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
      alert('Nama subjek wajib diisi.');
      return;
    }

    setSubmittingSuspect(true);
    setNotice(null);

    const isTsk = (suspectForm.status || 'tersangka') === 'tersangka';
    const nomorSpTap = (suspectForm.nomor_sp_tap || suspectForm.no_sp_tap_tsk || '').trim();
    const tanggalSpTap = (suspectForm.tanggal_sp_tap || suspectForm.tgl_sp_tap_tsk || '');

    const payload = {
      case_id: caseItem.id,
      nama: suspectForm.nama.trim(),
      nik: suspectForm.nik.trim() || '-',
      jenis_kelamin: suspectForm.jenis_kelamin,
      tempat_lahir: suspectForm.tempat_lahir.trim(),
      tgl_lahir: suspectForm.tgl_lahir ? suspectForm.tgl_lahir : null,
      umur: suspectForm.umur ? `${suspectForm.umur}` : null,
      agama: suspectForm.agama,
      pekerjaan: suspectForm.pekerjaan.trim(),
      kewarganegaraan: suspectForm.kewarganegaraan.trim(),
      pendidikan: suspectForm.pendidikan,
      status_pernikahan: suspectForm.status_pernikahan,
      alamat: suspectForm.alamat.trim(),
      status: suspectForm.status || 'tersangka',
      status_subjek: suspectForm.status || 'tersangka',
      nomor_sp_tap: isTsk && nomorSpTap ? nomorSpTap : null,
      no_sp_tap_tsk: isTsk && nomorSpTap ? nomorSpTap : null,
      tanggal_sp_tap: isTsk && tanggalSpTap ? tanggalSpTap : null,
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('case_suspects')
        .insert([payload])
        .select();

      if (error) {
        console.warn('Gagal menyimpan ke tabel case_suspects Supabase:', error.message);
        const localSuspect = { ...payload, id: `suspect-${Date.now()}` };
        setSuspects((prev) => [...prev, localSuspect]);
        setNotice({
          type: 'success',
          message: `${isTsk ? 'Tersangka' : 'Terlapor'} '${payload.nama}' berhasil ditambahkan (Sesi aktif)!`
        });
      } else {
        const savedSuspect = data?.[0] || payload;
        setSuspects((prev) => [...prev, savedSuspect]);
        setNotice({
          type: 'success',
          message: `Berhasil! ${isTsk ? 'Tersangka' : 'Terlapor'} '${payload.nama}' berhasil disimpan.`
        });
      }

      await fetchSuspects();
      setIsModalOpen(false);
      resetSuspectForm();
    } catch (err) {
      console.error('Error adding suspect:', err);
      alert(`Gagal menambahkan: ${err.message}`);
    } finally {
      setSubmittingSuspect(false);
    }
  };

  const handleOpenEditSuspect = (suspect) => {
    setEditingSuspect(suspect);
    setFormData({
      nama: suspect.nama || '',
      nik: suspect.nik || '',
      tempat_lahir: suspect.tempat_lahir || '',
      tanggal_lahir: suspect.tanggal_lahir || suspect.tgl_lahir || '',
      tgl_lahir: suspect.tanggal_lahir || suspect.tgl_lahir || '',
      umur: suspect.umur || '',
      jenis_kelamin: suspect.jenis_kelamin || 'Laki-laki',
      pekerjaan: suspect.pekerjaan || '',
      kewarganegaraan: suspect.kewarganegaraan || 'Indonesia',
      pendidikan: suspect.pendidikan || 'SMA',
      agama: suspect.agama || 'Islam',
      status_pernikahan: suspect.status_pernikahan || 'Kawin',
      alamat: suspect.alamat || '',
      status: suspect.status || 'tersangka',
      nomor_sp_tap: suspect.nomor_sp_tap || suspect.no_sp_tap_tsk || '',
      tanggal_sp_tap: suspect.tanggal_sp_tap || suspect.tgl_sp_tap_tsk || ''
    });
  };

  const handlePromoteToSuspect = (subject) => {
    setEditingSuspect(subject);
    setFormData({
      nama: subject.nama || '',
      nik: subject.nik || '',
      tempat_lahir: subject.tempat_lahir || '',
      tanggal_lahir: subject.tanggal_lahir || subject.tgl_lahir || '',
      tgl_lahir: subject.tanggal_lahir || subject.tgl_lahir || '',
      umur: subject.umur || '',
      jenis_kelamin: subject.jenis_kelamin || 'Laki-laki',
      pekerjaan: subject.pekerjaan || '',
      kewarganegaraan: subject.kewarganegaraan || 'Indonesia',
      pendidikan: subject.pendidikan || 'SMA',
      agama: subject.agama || 'Islam',
      status_pernikahan: subject.status_pernikahan || 'Kawin',
      alamat: subject.alamat || '',
      status: 'tersangka',
      nomor_sp_tap: subject.nomor_sp_tap || subject.no_sp_tap_tsk || `S.Tap/${Math.floor(Math.random() * 50 + 10)}/IX/2026/Reskrim`,
      tanggal_sp_tap: subject.tanggal_sp_tap || subject.tgl_sp_tap_tsk || new Date().toISOString().split('T')[0]
    });
  };

  const handleUpdateSuspect = async (suspectId) => {
    try {
      if (!formData.nama?.trim()) {
        alert('Nama subjek wajib diisi.');
        return;
      }

      setSubmittingSuspect(true);
      const isTsk = (formData.status || 'tersangka') === 'tersangka';
      const birthDate = formData.tanggal_lahir || formData.tgl_lahir || null;

      const payload = {
        nama: formData.nama.trim(),
        nik: formData.nik?.trim() || '-',
        tempat_lahir: formData.tempat_lahir?.trim() || '',
        tgl_lahir: birthDate ? birthDate : null,
        umur: formData.umur ? String(formData.umur).trim() : null,
        jenis_kelamin: formData.jenis_kelamin || 'Laki-laki',
        pekerjaan: formData.pekerjaan?.trim() || '',
        kewarganegaraan: formData.kewarganegaraan?.trim() || 'Indonesia',
        pendidikan: formData.pendidikan || 'SMA',
        agama: formData.agama || 'Islam',
        status_pernikahan: formData.status_pernikahan || 'Kawin',
        alamat: formData.alamat?.trim() || '',
        status: formData.status || 'tersangka',
        status_subjek: formData.status || 'tersangka',
        nomor_sp_tap: isTsk && formData.nomor_sp_tap ? formData.nomor_sp_tap.trim() : null,
        no_sp_tap_tsk: isTsk && formData.nomor_sp_tap ? formData.nomor_sp_tap.trim() : null,
        tanggal_sp_tap: isTsk && formData.tanggal_sp_tap ? formData.tanggal_sp_tap : null
      };

      const isRealId = suspectId && !String(suspectId).startsWith('legacy-') && !String(suspectId).startsWith('suspect-');

      if (isRealId) {
        let updatePayload = { ...payload };
        let { error } = await supabase
          .from('case_suspects')
          .update(updatePayload)
          .eq('id', suspectId);

        // Fallback jika ada kolom yang tidak ditemukan di schema cache
        if (error && error.message && error.message.includes("Could not find the '")) {
          const match = error.message.match(/Could not find the '([^']+)' column/);
          if (match && match[1]) {
            delete updatePayload[match[1]];
            const retry = await supabase
              .from('case_suspects')
              .update(updatePayload)
              .eq('id', suspectId);
            error = retry.error;
          }
        }

        if (error) throw error;
      } else {
        const insertPayload = {
          ...payload,
          case_id: caseItem.id,
          created_at: new Date().toISOString()
        };
        const { error } = await supabase
          .from('case_suspects')
          .insert([insertPayload]);
        
        if (error) throw error;
      }

      // Muat ulang data tersangka dan perkara agar UI langsung ter-update
      await fetchSuspects();

      if (typeof fetchCaseDetail === 'function') {
        await fetchCaseDetail();
      } else if (typeof loadData === 'function') {
        await loadData();
      }

      if (onUpdateCase && caseItem) {
        const updatedRef = {
          ...(caseItem.references || {}),
          no_sp_tap_tsk: payload.no_sp_tap_tsk,
          tgl_sp_tap_tsk: payload.tanggal_sp_tap
        };
        onUpdateCase({
          ...caseItem,
          references: updatedRef
        });
      }

      setNotice({
        type: 'success',
        message: `Data ${isTsk ? 'Tersangka' : 'Terlapor'} '${payload.nama}' berhasil diperbarui!`
      });

      setEditingSuspect(null);
    } catch (err) {
      console.error("Gagal update data tersangka:", err);
      alert(`Gagal menyimpan perubahan: ${err.message}`);
    } finally {
      setSubmittingSuspect(false);
    }
  };

  const handleSaveEditSuspect = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (editingSuspect) {
      await handleUpdateSuspect(editingSuspect.id);
    }
  };

  const handleDeleteSuspect = async (subject) => {
    const isTsk = subject.status === 'tersangka';
    if (!window.confirm(`Apakah Anda yakin ingin menghapus data ${isTsk ? 'Tersangka' : 'Terlapor'} '${subject.nama}' dari berkas perkara ini?`)) return;

    try {
      const isRealId = subject.id && !String(subject.id).startsWith('legacy-') && !String(subject.id).startsWith('suspect-');
      if (isRealId) {
        await supabase.from('case_suspects').delete().eq('id', subject.id);
      }
      setSuspects((prev) => prev.filter((s) => s.id !== subject.id));
      setNotice({
        type: 'success',
        message: `Data '${subject.nama}' berhasil dihapus dari berkas perkara!`
      });
    } catch (err) {
      console.error('Error deleting subject:', err);
      alert(`Gagal menghapus: ${err.message}`);
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

          {/* SECTION IDENTITAS KORBAN / SAKSI KORBAN */}
          {(() => {
            const registeredVictims = Array.isArray(caseItem.victims)
              ? caseItem.victims
              : (Array.isArray(caseItem.references?.victims) ? caseItem.references.victims : []);

            return (
              <div style={{
                padding: '14px 16px',
                background: 'rgba(168, 85, 247, 0.05)',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserCheck size={18} color="#C084FC" />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#C084FC', textTransform: 'uppercase' }}>
                        Daftar Identitas Korban ({registeredVictims.length > 0 ? registeredVictims.length : '1 Default'})
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {registeredVictims.length > 0
                          ? 'Data korban tersimpan lengkap untuk dokumen VER & Perlindungan Hak Korban'
                          : 'Belum ada korban spesifik; generator otomatis merujuk ke data Pelapor'}
                      </div>
                    </div>
                  </div>
                  {registeredVictims.length > 0 && (
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: 'rgba(168, 85, 247, 0.15)',
                      color: '#E9D5FF',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                    }}>
                      {registeredVictims.length} Korban Terdaftar
                    </span>
                  )}
                </div>

                {registeredVictims.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px', marginTop: '4px' }}>
                    {registeredVictims.map((vic, vIdx) => (
                      <div
                        key={vic.id || vIdx}
                        style={{
                          padding: '10px 12px',
                          background: 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid rgba(168, 85, 247, 0.2)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: '#F3E8FF' }}>
                            {vIdx + 1}. {vic.nama || 'Tanpa Nama'}
                          </span>
                          {vIdx === 0 && (
                            <span style={{ fontSize: '10px', color: '#86EFAC', background: 'rgba(34, 197, 94, 0.15)', padding: '1px 5px', borderRadius: '4px' }}>
                              Utama
                            </span>
                          )}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                          NIK: <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{vic.nik || '-'}</span> | {vic.jenis_kelamin || 'Laki-laki'} | {vic.umur ? `${vic.umur} Thn` : '-'}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                          Pekerjaan: {vic.pekerjaan || '-'} | Agama: {vic.agama || '-'}
                        </div>
                        {vic.alamat && (
                          <div style={{ color: 'var(--text-muted)', fontSize: '10.5px', marginTop: '2px' }}>
                            Alamat: {vic.alamat}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '4px 0' }}>
                    Korban otomatis disinkronkan ke Pelapor: <strong>{caseItem.nama_pelapor || caseItem.pelapor_name}</strong>. Untuk menambah atau mengubah 10 data identitas korban, klik tombol "Edit Perkara".
                  </div>
                )}
              </div>
            );
          })()}

          {/* SECTION MANAJEMEN SUBJEK PERKARA (TERLAPOR & TERSANGKA) */}
          {(() => {
            const tersangkaCount = suspects.filter(s => (s.status === 'tersangka' || !s.status)).length;
            const terlaporCount = suspects.filter(s => s.status === 'terlapor').length;
            const filteredSubjects = suspects.filter(s => {
              if (subjekTab === 'tersangka') return s.status === 'tersangka' || !s.status;
              if (subjekTab === 'terlapor') return s.status === 'terlapor';
              return true;
            });

            return (
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
                        Manajemen Subjek Perkara ({suspects.length})
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Identitas yuridis Terlapor (calon tersangka) dan Tersangka Resmi (SP.TAP.TSK)
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        resetSuspectForm('terlapor');
                        setIsModalOpen(true);
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{
                        borderColor: 'rgba(245, 158, 11, 0.4)',
                        color: '#F59E0B',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <UserPlus size={14} />
                      <span>+ Tambah Terlapor</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        resetSuspectForm('tersangka');
                        setIsModalOpen(true);
                      }}
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
                </div>

                {/* Filter Tabs Subjek */}
                <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setSubjekTab('all')}
                    className={`btn btn-xs ${subjekTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '11px', borderRadius: '20px', padding: '3px 10px' }}
                  >
                    Semua Subjek ({suspects.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubjekTab('tersangka')}
                    className={`btn btn-xs ${subjekTab === 'tersangka' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ 
                      fontSize: '11px', 
                      borderRadius: '20px', 
                      padding: '3px 10px',
                      background: subjekTab === 'tersangka' ? 'var(--accent-red)' : undefined
                    }}
                  >
                    Tersangka Resmi ({tersangkaCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubjekTab('terlapor')}
                    className={`btn btn-xs ${subjekTab === 'terlapor' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ 
                      fontSize: '11px', 
                      borderRadius: '20px', 
                      padding: '3px 10px',
                      borderColor: subjekTab === 'terlapor' ? '#F59E0B' : undefined,
                      color: subjekTab === 'terlapor' ? '#FFF' : undefined,
                      background: subjekTab === 'terlapor' ? '#D97706' : undefined
                    }}
                  >
                    Terlapor ({terlaporCount})
                  </button>
                </div>

                {filteredSubjects.length === 0 ? (
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
                    <div>
                      {subjekTab === 'tersangka' 
                        ? 'Belum ada pihak yang ditetapkan sebagai tersangka pada perkara ini.'
                        : subjekTab === 'terlapor'
                        ? 'Belum ada data Terlapor yang tercatat.'
                        : 'Belum ada subjek perkara (terlapor maupun tersangka) yang tercatat.'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Gunakan tombol <strong>"+ Tambah Terlapor"</strong> atau <strong>"+ Tetapkan Tersangka"</strong> di atas.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredSubjects.map((s, idx) => {
                      const isTsk = (s.status === 'tersangka' || !s.status);
                      const spTapNum = s.nomor_sp_tap || s.no_sp_tap_tsk;
                      const spTapDate = s.tanggal_sp_tap || s.tgl_sp_tap_tsk;

                      return (
                        <div 
                          key={s.id || idx}
                          style={{
                            padding: '14px',
                            background: 'rgba(15, 23, 42, 0.7)',
                            border: isTsk ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              <span 
                                className={`badge ${isTsk ? 'badge-red' : 'badge-amber'}`} 
                                style={{ fontSize: '11px', fontWeight: 700 }}
                              >
                                {isTsk ? `TERSANGKA ${idx + 1}` : `TERLAPOR ${idx + 1}`}
                              </span>
                              <span style={{ fontSize: '14px', fontWeight: 700, color: '#FFF' }}>
                                {s.nama}
                              </span>
                              <span className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                (NIK: {s.nik || '-'})
                              </span>
                            </div>

                            {/* Tombol aksi promote / edit / delete */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {!isTsk && (
                                <button
                                  type="button"
                                  onClick={() => handlePromoteToSuspect(s)}
                                  className="btn btn-xs"
                                  style={{
                                    background: 'rgba(16, 185, 129, 0.15)',
                                    border: '1px solid rgba(16, 185, 129, 0.4)',
                                    color: '#10B981',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '3px 8px',
                                    fontSize: '11px'
                                  }}
                                  title="Tetapkan Terlapor ini Menjadi Tersangka Resmi"
                                >
                                  <UserCheck size={13} />
                                  <span>Tetapkan Sebagai Tersangka</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenEditSuspect(s)}
                                className="btn btn-secondary btn-xs"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  fontSize: '11px'
                                }}
                                title="Edit Identitas & Data SP.TAP"
                              >
                                <Edit3 size={13} />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteSuspect(s)}
                                className="btn btn-secondary btn-xs"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  fontSize: '11px',
                                  color: 'var(--accent-red)',
                                  borderColor: 'rgba(239, 68, 68, 0.3)'
                                }}
                                title="Hapus Data Subjek"
                              >
                                <Trash2 size={13} />
                                <span>Hapus</span>
                              </button>
                            </div>
                          </div>

                          {/* Info SP.TAP untuk Tersangka */}
                          {isTsk && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              background: 'rgba(239, 68, 68, 0.08)',
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid rgba(239, 68, 68, 0.15)',
                              fontSize: '11px'
                            }}>
                              <span style={{ color: 'var(--accent-red)', fontWeight: 700 }}>SP.TAP.TSK:</span>
                              <span className="mono badge badge-purple" style={{ fontSize: '11px' }}>
                                {spTapNum || 'Belum diisi'}
                              </span>
                              {spTapDate && (
                                <span className="mono" style={{ color: 'var(--text-secondary)' }}>
                                  Tgl: {spTapDate}
                                </span>
                              )}
                            </div>
                          )}

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

                          {/* Riwayat Rantai Surat Perorangan jika Tersangka */}
                          {isTsk && (
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
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

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
              {(() => {
                const invList = Array.isArray(caseItem.investigators) ? caseItem.investigators : [];
                let activePenanganSlot = 1;
                if (caseItem.penyidik_penangan_index) {
                  activePenanganSlot = Number(caseItem.penyidik_penangan_index);
                } else if (caseItem.references?.penyidik_penangan_index) {
                  activePenanganSlot = Number(caseItem.references.penyidik_penangan_index);
                } else if (caseItem.references?.penyidik_penangan?.index) {
                  activePenanganSlot = Number(caseItem.references.penyidik_penangan.index);
                } else if (caseItem.penyidik_penangan?.index) {
                  activePenanganSlot = Number(caseItem.penyidik_penangan.index);
                } else if (invList.length > 0) {
                  const found = invList.find((i) => i.is_penangan === true || i.is_penangan === 'true' || i.is_penangan === 1);
                  if (found) activePenanganSlot = Number(found.role_order) || (invList.indexOf(found) + 1);
                }

                return [1, 2, 3, 4, 5].map((slot) => {
                  const invItem = invList.find((i) => Number(i.role_order) === slot);
                  const nama = caseItem[`penyidik_${slot}_nama`] || invItem?.nama;
                  const pangkat = caseItem[`penyidik_${slot}_pangkat`] || invItem?.pangkat;
                  const nrp = caseItem[`penyidik_${slot}_nrp`] || invItem?.nrp;
                  const jabatan = caseItem[`penyidik_${slot}_jabatan`] || invItem?.jabatan;

                  const isPenangan = slot === activePenanganSlot;

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
                    {isPenangan && (
                      <span className="badge badge-cyan" style={{ fontSize: '9.5px', background: 'rgba(0, 212, 255, 0.2)', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)' }}>
                        Penyidik Penangan
                      </span>
                    )}
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
              });
            })()}
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

      {/* MODAL INPUT SUBJEK BARU (TERLAPOR ATAU TERSANGKA) */}
      {isModalOpen && (
        <div 
          className="modal-backdrop" 
          style={{ zIndex: 1100 }}
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="modal-content" 
            style={{ 
              maxWidth: '680px', 
              border: suspectForm.status === 'terlapor' ? '1px solid #F59E0B' : '1px solid var(--accent-red)' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: suspectForm.status === 'terlapor' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: suspectForm.status === 'terlapor' ? '1px solid #F59E0B' : '1px solid var(--accent-red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {suspectForm.status === 'terlapor' ? <User size={18} color="#F59E0B" /> : <UserPlus size={18} color="var(--accent-red)" />}
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', margin: 0, fontWeight: 700 }}>
                    {suspectForm.status === 'terlapor' ? 'Tambah Data Terlapor' : 'Penetapan Tersangka Baru (SP.TAP.TSK)'}
                  </h3>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Input identitas yuridis untuk perkara {caseItem.nomor_lp || caseItem.no_lp}
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
                {/* Status Subjek Switcher */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Status Yuridis Subjek <span style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <label style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: suspectForm.status === 'terlapor' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-elevated)',
                      border: suspectForm.status === 'terlapor' ? '1px solid #F59E0B' : '1px solid var(--border-glass)',
                      cursor: 'pointer'
                    }}>
                      <input 
                        type="radio" 
                        name="status" 
                        value="terlapor" 
                        checked={suspectForm.status === 'terlapor'} 
                        onChange={handleInputChange} 
                      />
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: suspectForm.status === 'terlapor' ? '#F59E0B' : 'inherit' }}>
                          Terlapor
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Calon tersangka / pihak terlapor dalam LP</div>
                      </div>
                    </label>

                    <label style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: suspectForm.status === 'tersangka' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-elevated)',
                      border: suspectForm.status === 'tersangka' ? '1px solid var(--accent-red)' : '1px solid var(--border-glass)',
                      cursor: 'pointer'
                    }}>
                      <input 
                        type="radio" 
                        name="status" 
                        value="tersangka" 
                        checked={suspectForm.status === 'tersangka'} 
                        onChange={handleInputChange} 
                      />
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: suspectForm.status === 'tersangka' ? 'var(--accent-red)' : 'inherit' }}>
                          Tersangka Resmi
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Telah terbit Surat Penetapan Tersangka</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Nomor & Tanggal Surat Penetapan Tersangka (Hanya jika status Tersangka) */}
                {suspectForm.status === 'tersangka' && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1.4fr 1fr',
                    gap: '12px',
                    padding: '10px 12px',
                    background: 'rgba(239, 68, 68, 0.06)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                  }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ color: 'var(--accent-red)', fontWeight: 700 }}>
                        Nomor SP.TAP.TSK <span style={{ color: 'var(--accent-red)' }}>*</span>
                      </label>
                      <input
                        type="text"
                        name="nomor_sp_tap"
                        value={suspectForm.nomor_sp_tap}
                        onChange={handleInputChange}
                        placeholder="Contoh: S.Tap/12/VIII/2026/Reskrim"
                        className="form-input mono"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ color: 'var(--accent-red)', fontWeight: 700 }}>
                        Tanggal SP.TAP.TSK <span style={{ color: 'var(--accent-red)' }}>*</span>
                      </label>
                      <input
                        type="date"
                        name="tanggal_sp_tap"
                        value={suspectForm.tanggal_sp_tap}
                        onChange={handleInputChange}
                        className="form-input mono"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Nama Lengkap & NIK */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">
                      Nama Lengkap <span style={{ color: 'var(--accent-red)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="nama"
                      value={suspectForm.nama}
                      onChange={handleInputChange}
                      placeholder="Nama lengkap sesuai identitas..."
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
                    placeholder="Alamat domisili lengkap..."
                    className="form-textarea"
                    style={{ minHeight: '60px' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary btn-sm">
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={submittingSuspect} 
                  className="btn btn-primary btn-sm" 
                  style={{ background: suspectForm.status === 'terlapor' ? '#D97706' : 'var(--accent-red)' }}
                >
                  <FileCheck2 size={14} />
                  <span>
                    {submittingSuspect 
                      ? 'Menyimpan...' 
                      : suspectForm.status === 'terlapor' 
                      ? 'Simpan Data Terlapor' 
                      : 'Simpan & Tetapkan Tersangka'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT DATA SUBJEK (TERLAPOR ATAU TERSANGKA) */}
      {editingSuspect && (
        <div 
          className="modal-backdrop" 
          style={{ zIndex: 1100 }}
          onClick={() => setEditingSuspect(null)}
        >
          <div 
            className="modal-content" 
            style={{ 
              maxWidth: '680px', 
              border: formData.status === 'terlapor' ? '1px solid #F59E0B' : '1px solid var(--accent-red)' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: formData.status === 'terlapor' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: formData.status === 'terlapor' ? '1px solid #F59E0B' : '1px solid var(--accent-red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Edit3 size={18} color={formData.status === 'terlapor' ? '#F59E0B' : 'var(--accent-red)'} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', margin: 0, fontWeight: 700 }}>
                    {formData.status === 'terlapor' ? 'Edit Data Terlapor' : 'Edit Data Tersangka (SP.TAP.TSK)'}
                  </h3>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Perbarui identitas yuridis subjek perkara
                  </div>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setEditingSuspect(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditSuspect}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '68vh', overflowY: 'auto' }}>
                {/* Status Switcher */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Status Yuridis Subjek <span style={{ color: 'var(--accent-red)' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <label style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: formData.status === 'terlapor' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-elevated)',
                      border: formData.status === 'terlapor' ? '1px solid #F59E0B' : '1px solid var(--border-glass)',
                      cursor: 'pointer'
                    }}>
                      <input 
                        type="radio" 
                        name="edit_status" 
                        value="terlapor" 
                        checked={formData.status === 'terlapor'} 
                        onChange={() => setFormData(prev => ({ ...prev, status: 'terlapor' }))} 
                      />
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: formData.status === 'terlapor' ? '#F59E0B' : 'inherit' }}>
                          Terlapor
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Calon tersangka / pihak terlapor</div>
                      </div>
                    </label>

                    <label style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: formData.status === 'tersangka' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-elevated)',
                      border: formData.status === 'tersangka' ? '1px solid var(--accent-red)' : '1px solid var(--border-glass)',
                      cursor: 'pointer'
                    }}>
                      <input 
                        type="radio" 
                        name="edit_status" 
                        value="tersangka" 
                        checked={formData.status === 'tersangka'} 
                        onChange={() => setFormData(prev => ({ 
                          ...prev, 
                          status: 'tersangka',
                          nomor_sp_tap: prev.nomor_sp_tap || `S.Tap/${Math.floor(Math.random() * 50 + 10)}/IX/2026/Reskrim`,
                          tanggal_sp_tap: prev.tanggal_sp_tap || new Date().toISOString().split('T')[0]
                        }))} 
                      />
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: formData.status === 'tersangka' ? 'var(--accent-red)' : 'inherit' }}>
                          Tersangka Resmi
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Telah terbit Surat Penetapan Tersangka</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Nomor & Tanggal SP.TAP.TSK */}
                {formData.status === 'tersangka' && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1.4fr 1fr',
                    gap: '12px',
                    padding: '10px 12px',
                    background: 'rgba(239, 68, 68, 0.06)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                  }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ color: 'var(--accent-red)', fontWeight: 700 }}>
                        Nomor Surat Penetapan Tersangka (SP.TAP.TSK) <span style={{ color: 'var(--accent-red)' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.nomor_sp_tap}
                        onChange={(e) => setFormData(prev => ({ ...prev, nomor_sp_tap: e.target.value }))}
                        placeholder="Contoh: S.Tap.Tsk/123/IX/RES.1.2./2026/Satreskrim"
                        className="form-input mono"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ color: 'var(--accent-red)', fontWeight: 700 }}>
                        Tanggal Surat Penetapan Tersangka <span style={{ color: 'var(--accent-red)' }}>*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.tanggal_sp_tap}
                        onChange={(e) => setFormData(prev => ({ ...prev, tanggal_sp_tap: e.target.value }))}
                        className="form-input mono"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Nama & NIK */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">
                      Nama Lengkap <span style={{ color: 'var(--accent-red)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.nama}
                      onChange={(e) => setFormData(prev => ({ ...prev, nama: e.target.value }))}
                      placeholder="Nama lengkap sesuai identitas..."
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">NIK (Nomor Induk Kependudukan)</label>
                    <input
                      type="text"
                      value={formData.nik}
                      onChange={(e) => setFormData(prev => ({ ...prev, nik: e.target.value }))}
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
                      value={formData.tempat_lahir}
                      onChange={(e) => setFormData(prev => ({ ...prev, tempat_lahir: e.target.value }))}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Tanggal Lahir</label>
                    <input
                      type="date"
                      value={formData.tanggal_lahir || formData.tgl_lahir || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const birthYear = new Date(val).getFullYear();
                        const currentYear = new Date().getFullYear();
                        const calculatedAge = !isNaN(birthYear) ? String(Math.max(1, currentYear - birthYear)) : formData.umur;
                        setFormData(prev => ({ ...prev, tanggal_lahir: val, tgl_lahir: val, umur: calculatedAge }));
                      }}
                      className="form-input mono"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Umur (Thn)</label>
                    <input
                      type="text"
                      value={formData.umur}
                      onChange={(e) => setFormData(prev => ({ ...prev, umur: e.target.value }))}
                      className="form-input mono"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Jenis Kelamin</label>
                    <select
                      value={formData.jenis_kelamin || 'Laki-laki'}
                      onChange={(e) => setFormData(prev => ({ ...prev, jenis_kelamin: e.target.value }))}
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
                      value={formData.agama || 'Islam'}
                      onChange={(e) => setFormData(prev => ({ ...prev, agama: e.target.value }))}
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
                      value={formData.pekerjaan}
                      onChange={(e) => setFormData(prev => ({ ...prev, pekerjaan: e.target.value }))}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Kewarganegaraan</label>
                    <input
                      type="text"
                      value={formData.kewarganegaraan || 'Indonesia'}
                      onChange={(e) => setFormData(prev => ({ ...prev, kewarganegaraan: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Pendidikan & Status Nikah */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Pendidikan Terakhir</label>
                    <select
                      value={formData.pendidikan || 'SMA'}
                      onChange={(e) => setFormData(prev => ({ ...prev, pendidikan: e.target.value }))}
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
                      value={formData.status_pernikahan || 'Kawin'}
                      onChange={(e) => setFormData(prev => ({ ...prev, status_pernikahan: e.target.value }))}
                      className="form-select"
                    >
                      <option value="Belum Kawin">Belum Kawin</option>
                      <option value="Kawin">Kawin</option>
                      <option value="Cerai Hidup">Cerai Hidup</option>
                      <option value="Cerai Mati">Cerai Mati</option>
                    </select>
                  </div>
                </div>

                {/* Alamat */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Alamat Tempat Tinggal Lengkap</label>
                  <textarea
                    value={formData.alamat}
                    onChange={(e) => setFormData(prev => ({ ...prev, alamat: e.target.value }))}
                    className="form-textarea"
                    style={{ minHeight: '60px' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setEditingSuspect(null)} className="btn btn-secondary btn-sm">
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={submittingSuspect} 
                  className="btn btn-primary btn-sm" 
                  style={{ background: formData.status === 'terlapor' ? '#D97706' : 'var(--accent-red)' }}
                >
                  <FileCheck2 size={14} />
                  <span>{submittingSuspect ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
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
