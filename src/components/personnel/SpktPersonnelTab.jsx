import React, { useState, useEffect, useCallback } from 'react';
import {
  UserPlus,
  Edit3,
  Trash2,
  Check,
  X,
  Radio,
  BadgeCheck,
  Shield,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { supabase } from '../../supabaseClient.js';

const DEFAULT_SPKT_DATA = [
  {
    kode_jabatan: 'PAMAPTA_I',
    unit: 'PAMAPTA I',
    jabatan: 'PAMAPTA I',
    nama: 'NAMA PERWIRA I, S.Tr.K.',
    pangkat_nrp: 'IPDA NRP XXXXXXXX',
    is_active: true
  },
  {
    kode_jabatan: 'PAMAPTA_II',
    unit: 'PAMAPTA II',
    jabatan: 'PAMAPTA II',
    nama: 'NAMA PERWIRA II, S.H.',
    pangkat_nrp: 'IPDA NRP YYYYYYYY',
    is_active: true
  },
  {
    kode_jabatan: 'PAMAPTA_III',
    unit: 'PAMAPTA III',
    jabatan: 'PAMAPTA III',
    nama: 'ARMAN, S.H.',
    pangkat_nrp: 'IPDA NRP 87020875',
    is_active: true
  },
  {
    kode_jabatan: 'KA_SPKT',
    unit: 'KA SPKT',
    jabatan: 'KA SPKT',
    nama: 'IPDA PERWIRA KA SPKT, S.H.',
    pangkat_nrp: 'IPDA NRP 80010001',
    is_active: true
  }
];

const PRESET_JABATAN = ['PAMAPTA I', 'PAMAPTA II', 'PAMAPTA III', 'KA SPKT', 'BAMIN SPKT'];

export default function SpktPersonnelTab({ userRole = 'super_admin', onShowToast }) {
  const [pejabatList, setPejabatList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Add Form state
  const [addForm, setAddForm] = useState({
    jabatan: 'PAMAPTA I',
    customJabatan: '',
    kode_jabatan: 'PAMAPTA_I',
    nama: '',
    pangkat_nrp: '',
    is_active: true
  });

  // Edit Form state
  const [editForm, setEditForm] = useState({
    id: '',
    jabatan: '',
    customJabatan: '',
    kode_jabatan: '',
    nama: '',
    pangkat_nrp: '',
    is_active: true
  });

  const isSuperAdmin = userRole === 'super_admin';

  // Helper auto kode_jabatan
  const toKodeJabatan = (str) => {
    return String(str || '')
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_')
      .replace(/[^A-Z0-9_]/g, '');
  };

  // Toast feedback
  const triggerToast = useCallback((msg, type = 'success') => {
    if (onShowToast) onShowToast(msg);
    setToast({ msg, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  }, [onShowToast]);

  // Fetch data
  const fetchPejabat = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pejabat_spkt')
        .select('*')
        .order('kode_jabatan', { ascending: true });

      if (error) {
        console.warn('Gagal memuat pejabat_spkt dari Supabase:', error.message);
        // Fallback default
        setPejabatList(DEFAULT_SPKT_DATA.map((d, i) => ({
          ...d,
          id: `mock-${i + 1}`,
          unit: d.unit || d.jabatan || 'PAMAPTA',
          jabatan: d.jabatan || d.unit || 'PAMAPTA'
        })));
      } else if (!data || data.length === 0) {
        setPejabatList([]);
      } else {
        const normalized = data.map((item, idx) => ({
          ...item,
          id: item.id || `spkt-${idx + 1}`,
          unit: item.unit || item.jabatan || 'PAMAPTA',
          jabatan: item.jabatan || item.unit || 'PAMAPTA',
          kode_jabatan: item.kode_jabatan || `PAMAPTA_${idx + 1}`,
          nama: item.nama || item.nama_lengkap || '',
          pangkat_nrp: item.pangkat_nrp || (item.pangkat && item.nrp ? `${item.pangkat} NRP ${item.nrp}` : ''),
          is_active: item.is_active !== false
        }));
        setPejabatList(normalized);
      }
    } catch (err) {
      console.warn('Error fetching pejabat_spkt:', err);
      setPejabatList(DEFAULT_SPKT_DATA.map((d, i) => ({
        ...d,
        id: `mock-${i + 1}`,
        unit: d.unit || d.jabatan || 'PAMAPTA',
        jabatan: d.jabatan || d.unit || 'PAMAPTA'
      })));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPejabat();

    // Setup Supabase Realtime Listener
    const channel = supabase
      .channel('pejabat_spkt_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pejabat_spkt' },
        () => {
          fetchPejabat();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPejabat]);

  // Inisialisasi data bawaan jika tabel masih kosong
  const handleSeedDefault = async () => {
    if (!confirm('Inisialisasi data pejabat SPKT default (PAMAPTA I, II, III & KA SPKT) ke database?')) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('pejabat_spkt')
        .insert(DEFAULT_SPKT_DATA);

      if (error) throw error;
      triggerToast('Data default Pejabat SPKT berhasil diinisialisasi ke Supabase!');
      fetchPejabat();
    } catch (err) {
      alert(`Gagal inisialisasi: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Add
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const finalJabatan = addForm.jabatan === 'CUSTOM' ? addForm.customJabatan.trim() : addForm.jabatan;
    if (!finalJabatan) {
      alert('Jabatan dinas wajib diisi!');
      return;
    }
    if (!addForm.nama.trim()) {
      alert('Nama pejabat lengkap wajib diisi!');
      return;
    }
    if (!addForm.pangkat_nrp.trim()) {
      alert('Pangkat & NRP pejabat wajib diisi!');
      return;
    }

    const payload = {
      kode_jabatan: addForm.kode_jabatan || toKodeJabatan(finalJabatan),
      unit: finalJabatan,
      jabatan: finalJabatan,
      nama: addForm.nama.trim(),
      pangkat_nrp: addForm.pangkat_nrp.trim(),
      is_active: Boolean(addForm.is_active)
    };

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('pejabat_spkt').insert([payload]);
      if (error) throw error;

      triggerToast(`Pejabat SPKT ${payload.jabatan || payload.unit} (${payload.nama}) berhasil ditambahkan!`);
      setIsAddModalOpen(false);
      setAddForm({
        jabatan: 'PAMAPTA I',
        customJabatan: '',
        kode_jabatan: 'PAMAPTA_I',
        nama: '',
        pangkat_nrp: '',
        is_active: true
      });
      fetchPejabat();
    } catch (err) {
      alert(`Gagal menyimpan personel SPKT: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingItem?.id) return;

    const finalJabatan = editForm.jabatan === 'CUSTOM' ? editForm.customJabatan.trim() : editForm.jabatan;
    if (!finalJabatan) {
      alert('Jabatan dinas wajib diisi!');
      return;
    }
    if (!editForm.nama.trim()) {
      alert('Nama pejabat lengkap wajib diisi!');
      return;
    }
    if (!editForm.pangkat_nrp.trim()) {
      alert('Pangkat & NRP pejabat wajib diisi!');
      return;
    }

    const payload = {
      kode_jabatan: editForm.kode_jabatan || toKodeJabatan(finalJabatan),
      unit: finalJabatan,
      jabatan: finalJabatan,
      nama: editForm.nama.trim(),
      pangkat_nrp: editForm.pangkat_nrp.trim(),
      is_active: Boolean(editForm.is_active)
    };

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('pejabat_spkt')
        .update(payload)
        .eq('id', editingItem.id);

      if (error) throw error;

      triggerToast(`Data ${payload.jabatan || payload.unit} (${payload.nama}) berhasil diperbarui!`);
      setEditingItem(null);
      fetchPejabat();
    } catch (err) {
      alert(`Gagal memperbarui personel SPKT: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Aktif
  const handleToggleActive = async (item) => {
    if (!item?.id) return;
    const newStatus = !item.is_active;
    try {
      // Optimistic update
      setPejabatList(prev => prev.map(p => p.id === item.id ? { ...p, is_active: newStatus } : p));
      const { error } = await supabase
        .from('pejabat_spkt')
        .update({ is_active: newStatus })
        .eq('id', item.id);

      if (error) throw error;
      triggerToast(`Status ${item.jabatan || item.unit || 'PAMAPTA'} diubah menjadi ${newStatus ? 'SIAGA / AKTIF' : 'NON-AKTIF'}`);
    } catch (err) {
      console.error('Gagal update status:', err);
      fetchPejabat();
    }
  };

  // Delete
  const handleDeleteConfirm = async () => {
    if (!itemToDelete?.id) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('pejabat_spkt')
        .delete()
        .eq('id', itemToDelete.id);

      if (error) throw error;

      triggerToast(`Personel ${itemToDelete.jabatan || itemToDelete.unit || 'PAMAPTA'} berhasil dihapus.`);
      setItemToDelete(null);
      fetchPejabat();
    } catch (err) {
      alert(`Gagal menghapus: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (item) => {
    const rawJabatan = item.jabatan || item.unit || 'PAMAPTA';
    const isStandard = PRESET_JABATAN.includes(rawJabatan);
    setEditingItem(item);
    setEditForm({
      id: item.id,
      jabatan: isStandard ? rawJabatan : 'CUSTOM',
      customJabatan: isStandard ? '' : rawJabatan,
      kode_jabatan: item.kode_jabatan || '',
      nama: item.nama || '',
      pangkat_nrp: item.pangkat_nrp || '',
      is_active: item.is_active !== false
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toast Notification Banner */}
      {toast && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '8px',
            backgroundColor: toast.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(52, 211, 153, 0.15)',
            border: `1px solid ${toast.type === 'error' ? '#EF4444' : '#34D399'}`,
            color: toast.type === 'error' ? '#FCA5A5' : '#6EE7B7',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <CheckCircle2 size={16} />
          <span style={{ fontWeight: 600 }}>{toast.msg}</span>
        </div>
      )}

      {/* Title & Action */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Radio size={22} color="#34D399" />
            <span>Direktori Personel SPKT (Sentra Pelayanan Kepolisian Terpadu)</span>
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Pengelolaan pejabat PAMAPTA I, II, III dan perwira piket SPKT penandatangan Surat Tanda Penerimaan Laporan (STTLP).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={fetchPejabat}
            disabled={isLoading}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Muat ulang dari Supabase"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {isSuperAdmin && pejabatList.length === 0 && (
            <button
              type="button"
              onClick={handleSeedDefault}
              disabled={isSubmitting}
              className="btn btn-secondary btn-sm"
              style={{ borderColor: '#38BDF8', color: '#38BDF8' }}
            >
              <span>+ Inisialisasi Data PAMAPTA</span>
            </button>
          )}

          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#059669',
                borderColor: '#10B981'
              }}
            >
              <UserPlus size={16} />
              <span>+ Tambah Personel SPKT</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of SPKT Personnel Cards */}
      {isLoading && pejabatList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
          <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#34D399' }} />
          <p style={{ margin: 0, fontSize: '14px' }}>Memuat direktori Pejabat SPKT dari Supabase...</p>
        </div>
      ) : pejabatList.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            backgroundColor: '#121721',
            borderRadius: '12px',
            border: '1px dashed #334155',
            color: '#94A3B8'
          }}
        >
          <Radio size={32} style={{ margin: '0 auto 10px', color: '#64748B' }} />
          <h4 style={{ color: '#F1F5F9', margin: '0 0 6px 0', fontSize: '15px' }}>Belum Ada Data Pejabat SPKT</h4>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px' }}>
            Klik tombol di bawah untuk membuat data default PAMAPTA I, II, III dan KA SPKT.
          </p>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={handleSeedDefault}
              disabled={isSubmitting}
              className="btn btn-primary btn-sm"
              style={{ backgroundColor: '#059669', borderColor: '#10B981' }}
            >
              Inisialisasi Data Default PAMAPTA
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px'
          }}
        >
          {pejabatList.map((officer) => {
            const isPamapta = (officer.kode_jabatan || '').startsWith('PAMAPTA');
            const isActive = officer.is_active !== false;

            return (
              <div
                key={officer.id || officer.kode_jabatan}
                className="glass glass-hover"
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  position: 'relative',
                  overflow: 'hidden',
                  backgroundColor: '#121721',
                  border: isActive ? '1px solid #334155' : '1px solid #1e293b',
                  opacity: isActive ? 1 : 0.65
                }}
              >
                {/* Badge Jabatan Atas */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: isPamapta
                      ? 'linear-gradient(135deg, #065f46, #10b981)'
                      : 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
                    color: '#ffffff',
                    fontSize: '9px',
                    fontWeight: 800,
                    padding: '3px 14px',
                    borderBottomLeftRadius: '8px',
                    letterSpacing: '0.05em'
                  }}
                >
                  {officer.kode_jabatan || 'SPKT'}
                </div>

                {/* Info Utama */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: '#1b2230',
                      border: '1px solid rgba(52, 211, 153, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#34D399',
                      fontWeight: 700,
                      fontSize: '13px'
                    }}
                  >
                    <BadgeCheck size={22} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: '#FFFFFF',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontFamily: 'Inter, sans-serif'
                      }}
                      title={officer.nama}
                    >
                      {officer.nama}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#38BDF8',
                        fontWeight: 600,
                        marginTop: '2px',
                        fontFamily: 'JetBrains Mono, monospace'
                      }}
                    >
                      {officer.jabatan || officer.unit || 'PAMAPTA'}
                    </div>
                  </div>
                </div>

                {/* Detail Baris Pangkat & NRP */}
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#0d1118',
                    border: '1px solid #1e293b',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Pangkat &amp; NRP
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        color: '#F1F5F9',
                        fontWeight: 600,
                        fontFamily: 'JetBrains Mono, monospace'
                      }}
                    >
                      {officer.pangkat_nrp || '-'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                    <span style={{ fontSize: '10px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Status Piket
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: isActive ? 'rgba(52, 211, 153, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                        color: isActive ? '#34D399' : '#94A3B8'
                      }}
                    >
                      {isActive ? 'SIAGA / AKTIF' : 'NON-AKTIF'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                {isSuperAdmin && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid #1e293b',
                      paddingTop: '10px',
                      marginTop: '2px'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleActive(officer)}
                      className="btn btn-secondary btn-sm"
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        color: isActive ? '#34D399' : '#94A3B8'
                      }}
                      title={isActive ? 'Non-aktifkan dari jadwal piket' : 'Aktifkan untuk jadwal piket'}
                    >
                      {isActive ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                      <span>{isActive ? 'Aktif' : 'Non-Aktif'}</span>
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => openEditModal(officer)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Edit Data Personel SPKT"
                      >
                        <Edit3 size={13} />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setItemToDelete(officer)}
                        className="btn btn-secondary btn-sm"
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          color: '#EF4444',
                          borderColor: 'rgba(239, 68, 68, 0.3)'
                        }}
                        title="Hapus Personel SPKT"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL TAMBAH PERSONEL SPKT */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '480px', backgroundColor: '#121721', border: '1px solid #334155' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ borderBottom: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Shield size={18} color="#34D399" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#FFF' }}>
                  Tambah Pejabat / Personel SPKT
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="btn-icon"
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Jabatan Preset */}
                <div className="form-group">
                  <label className="form-label">Jabatan Dinas SPKT</label>
                  <select
                    value={addForm.jabatan}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAddForm(prev => ({
                        ...prev,
                        jabatan: val,
                        kode_jabatan: val === 'CUSTOM' ? prev.kode_jabatan : toKodeJabatan(val)
                      }));
                    }}
                    className="form-select"
                  >
                    {PRESET_JABATAN.map(j => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                    <option value="CUSTOM">-- Jabatan Lainnya (Kustom) --</option>
                  </select>
                </div>

                {addForm.jabatan === 'CUSTOM' && (
                  <div className="form-group">
                    <label className="form-label">Nama Jabatan Kustom</label>
                    <input
                      type="text"
                      value={addForm.customJabatan}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAddForm(prev => ({
                          ...prev,
                          customJabatan: val,
                          kode_jabatan: toKodeJabatan(val)
                        }));
                      }}
                      placeholder="Misal: PAMAPTA IV / PAURMIN"
                      className="form-input"
                      required
                    />
                  </div>
                )}

                {/* Kode Jabatan */}
                <div className="form-group">
                  <label className="form-label">
                    Kode Jabatan (Auto Uppercase)
                  </label>
                  <input
                    type="text"
                    value={addForm.kode_jabatan}
                    onChange={(e) => setAddForm(prev => ({ ...prev, kode_jabatan: toKodeJabatan(e.target.value) }))}
                    placeholder="PAMAPTA_I"
                    className="form-input mono"
                    required
                  />
                  <span style={{ fontSize: '10px', color: '#64748B', marginTop: '2px', display: 'block' }}>
                    Digunakan untuk identifikasi unik jabatan pada generator cetak STTLP.
                  </span>
                </div>

                {/* Nama Pejabat */}
                <div className="form-group">
                  <label className="form-label">Nama Pejabat (Lengkap dengan Gelar)</label>
                  <input
                    type="text"
                    value={addForm.nama}
                    onChange={(e) => setAddForm(prev => ({ ...prev, nama: e.target.value }))}
                    placeholder="Contoh: ARMAN, S.H."
                    className="form-input"
                    required
                  />
                </div>

                {/* Pangkat & NRP */}
                <div className="form-group">
                  <label className="form-label">Pangkat &amp; NRP</label>
                  <input
                    type="text"
                    value={addForm.pangkat_nrp}
                    onChange={(e) => setAddForm(prev => ({ ...prev, pangkat_nrp: e.target.value }))}
                    placeholder="Contoh: IPDA NRP 87020875"
                    className="form-input mono"
                    required
                  />
                </div>

                {/* Status Aktif */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Status Siaga / Piket</label>
                  <select
                    value={addForm.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setAddForm(prev => ({ ...prev, is_active: e.target.value === 'active' }))}
                    className="form-select"
                  >
                    <option value="active">SIAGA / AKTIF</option>
                    <option value="inactive">NON-AKTIF</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #1e293b' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary btn-sm"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#059669',
                    borderColor: '#10B981'
                  }}
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan ke Supabase'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL EDIT PERSONEL SPKT */}
      {/* ========================================================================= */}
      {editingItem && (
        <div className="modal-backdrop" onClick={() => setEditingItem(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '480px', backgroundColor: '#121721', border: '1px solid #334155' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ borderBottom: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit3 size={18} color="#38BDF8" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#FFF' }}>
                  Edit Pejabat SPKT: {editingItem.jabatan || editingItem.unit || 'PAMAPTA'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="btn-icon"
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Jabatan */}
                <div className="form-group">
                  <label className="form-label">Jabatan Dinas</label>
                  <select
                    value={editForm.jabatan}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditForm(prev => ({
                        ...prev,
                        jabatan: val,
                        kode_jabatan: val === 'CUSTOM' ? prev.kode_jabatan : toKodeJabatan(val)
                      }));
                    }}
                    className="form-select"
                  >
                    {PRESET_JABATAN.map(j => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                    <option value="CUSTOM">-- Jabatan Lainnya (Kustom) --</option>
                  </select>
                </div>

                {editForm.jabatan === 'CUSTOM' && (
                  <div className="form-group">
                    <label className="form-label">Nama Jabatan Kustom</label>
                    <input
                      type="text"
                      value={editForm.customJabatan}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditForm(prev => ({
                          ...prev,
                          customJabatan: val,
                          kode_jabatan: toKodeJabatan(val)
                        }));
                      }}
                      className="form-input"
                      required
                    />
                  </div>
                )}

                {/* Kode Jabatan */}
                <div className="form-group">
                  <label className="form-label">Kode Jabatan</label>
                  <input
                    type="text"
                    value={editForm.kode_jabatan}
                    onChange={(e) => setEditForm(prev => ({ ...prev, kode_jabatan: toKodeJabatan(e.target.value) }))}
                    className="form-input mono"
                    required
                  />
                </div>

                {/* Nama Pejabat */}
                <div className="form-group">
                  <label className="form-label">Nama Pejabat (Lengkap dengan Gelar)</label>
                  <input
                    type="text"
                    value={editForm.nama}
                    onChange={(e) => setEditForm(prev => ({ ...prev, nama: e.target.value }))}
                    className="form-input"
                    required
                  />
                </div>

                {/* Pangkat & NRP */}
                <div className="form-group">
                  <label className="form-label">Pangkat &amp; NRP</label>
                  <input
                    type="text"
                    value={editForm.pangkat_nrp}
                    onChange={(e) => setEditForm(prev => ({ ...prev, pangkat_nrp: e.target.value }))}
                    className="form-input mono"
                    required
                  />
                </div>

                {/* Status Aktif */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Status Siaga / Piket</label>
                  <select
                    value={editForm.is_active ? 'active' : 'inactive'}
                    onChange={(e) => setEditForm(prev => ({ ...prev, is_active: e.target.value === 'active' }))}
                    className="form-select"
                  >
                    <option value="active">SIAGA / AKTIF</option>
                    <option value="inactive">NON-AKTIF</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #1e293b' }}>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL HAPUS PERSONEL SPKT */}
      {/* ========================================================================= */}
      {itemToDelete && (
        <div className="modal-backdrop" onClick={() => setItemToDelete(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '420px', borderColor: '#EF4444', backgroundColor: '#121721' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={18} color="#EF4444" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#EF4444' }}>
                  Hapus Personel SPKT
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="btn-icon"
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#E2E8F0' }}>
                Apakah Anda yakin ingin menghapus data pejabat berikut dari direktori SPKT?
              </p>
              <div
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: '#0d1118',
                  border: '1px solid #1e293b'
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>
                  {itemToDelete.nama}
                </div>
                <div style={{ fontSize: '11px', color: '#38BDF8', marginTop: '2px' }}>
                  {itemToDelete.jabatan || itemToDelete.unit || 'PAMAPTA'} ({itemToDelete.pangkat_nrp})
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #1e293b' }}>
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="btn btn-secondary btn-sm"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="btn btn-sm"
                style={{
                  backgroundColor: '#DC2626',
                  borderColor: '#EF4444',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                <span>{isSubmitting ? 'Menghapus...' : 'Ya, Hapus'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
