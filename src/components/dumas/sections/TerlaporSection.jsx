import React from 'react';
import { Plus, Trash2, Users, UserX } from 'lucide-react';

export default function TerlaporSection({
  terlaporList = [],
  onAddTerlapor,
  onUpdateTerlapor,
  onRemoveTerlapor,
  saksiList = [],
  onAddSaksi,
  onUpdateSaksi,
  onRemoveSaksi
}) {
  const inputStyle = {
    width: '100%',
    backgroundColor: '#141C2B',
    border: '1px solid #263347',
    borderRadius: '0.5rem',
    padding: '0.5rem 0.75rem',
    color: '#F1F5F9',
    fontSize: '0.8125rem',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.6875rem',
    fontFamily: 'monospace',
    fontWeight: 700,
    color: '#94A3B8',
    marginBottom: '0.25rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  };

  const btnAddStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.35rem 0.75rem',
    borderRadius: '0.375rem',
    fontSize: '0.6875rem',
    fontFamily: 'monospace',
    fontWeight: 700,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#EF4444',
    cursor: 'pointer',
    transition: 'all 0.15s'
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1.25rem'
      }}
    >
      {/* ============================================================ */}
      {/* KOLOM 02: DATA SAKSI-SAKSI */}
      {/* ============================================================ */}
      <div
        style={{
          backgroundColor: '#111622',
          border: '1px solid #1E293B',
          borderRadius: '0.75rem',
          padding: '1.25rem',
          color: '#F1F5F9',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >
        {/* Header Bagian Saksi */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1E293B',
            paddingBottom: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div
              style={{
                width: '1.5rem',
                height: '1.5rem',
                borderRadius: '0.375rem',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: '#38BDF8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'monospace',
                fontWeight: 700,
                fontSize: '0.75rem'
              }}
            >
              02
            </div>
            <div>
              <h3
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontFamily: 'monospace',
                  margin: 0
                }}
              >
                DATA SAKSI-SAKSI
              </h3>
              <p style={{ fontSize: '0.6875rem', color: '#64748B', margin: '0.125rem 0 0 0' }}>
                Keterangan saksi fakta atau pendukung ({saksiList.length})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onAddSaksi}
            style={{
              ...btnAddStyle,
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              borderColor: 'rgba(56, 189, 248, 0.3)',
              color: '#38BDF8'
            }}
          >
            <Plus size={12} />
            <span>Tambah Saksi</span>
          </button>
        </div>

        {/* Daftar Saksi */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '650px', overflowY: 'auto' }}>
          {saksiList.map((saksi, idx) => (
            <div
              key={saksi.id || idx}
              style={{
                backgroundColor: '#141C2B',
                border: '1px solid #263347',
                borderRadius: '0.625rem',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}
            >
              {/* Header Subcard */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E293B', paddingBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', backgroundColor: '#38BDF8', display: 'inline-block' }} />
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#FFFFFF', fontSize: '0.6875rem', textTransform: 'uppercase' }}>
                    SAKSI {idx + 1}
                  </span>
                  <span style={{ padding: '0.125rem 0.375rem', borderRadius: '0.25rem', fontSize: '0.625rem', fontFamily: 'monospace', backgroundColor: '#0B0F17', color: '#94A3B8', border: '1px solid #263347' }}>
                    {saksi.role_label || 'Saksi Fakta'}
                  </span>
                </div>

                {saksiList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveSaksi(idx)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#F87171',
                      fontSize: '0.6875rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.2rem 0.4rem',
                      borderRadius: '0.25rem'
                    }}
                    title="Hapus Saksi"
                  >
                    <Trash2 size={12} /> Hapus
                  </button>
                )}
              </div>

              {/* Form Input Saksi */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <div>
                  <label htmlFor={`saksi_nama_${idx}`} style={labelStyle}>NAMA LENGKAP</label>
                  <input
                    id={`saksi_nama_${idx}`}
                    type="text"
                    value={saksi.nama || ''}
                    onChange={(e) => onUpdateSaksi(idx, 'nama', e.target.value)}
                    placeholder="Nama lengkap saksi"
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label htmlFor={`saksi_nik_${idx}`} style={labelStyle}>NIK</label>
                    <input
                      id={`saksi_nik_${idx}`}
                      type="text"
                      maxLength={16}
                      value={saksi.nik || ''}
                      onChange={(e) => onUpdateSaksi(idx, 'nik', e.target.value)}
                      placeholder="74********"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label htmlFor={`saksi_ttl_${idx}`} style={labelStyle}>TEMPAT, TGL LAHIR</label>
                    <input
                      id={`saksi_ttl_${idx}`}
                      type="text"
                      value={saksi.ttl || ''}
                      onChange={(e) => onUpdateSaksi(idx, 'ttl', e.target.value)}
                      placeholder="Tempat, Tgl Lahir"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label htmlFor={`saksi_pekerjaan_${idx}`} style={labelStyle}>PEKERJAAN</label>
                    <input
                      id={`saksi_pekerjaan_${idx}`}
                      type="text"
                      value={saksi.pekerjaan || ''}
                      onChange={(e) => onUpdateSaksi(idx, 'pekerjaan', e.target.value)}
                      placeholder="Pekerjaan"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label htmlFor={`saksi_agama_${idx}`} style={labelStyle}>AGAMA</label>
                    <select
                      id={`saksi_agama_${idx}`}
                      value={saksi.agama || 'Islam'}
                      onChange={(e) => onUpdateSaksi(idx, 'agama', e.target.value)}
                      style={inputStyle}
                    >
                      <option value="Islam">Islam</option>
                      <option value="Kristen Protestan">Kristen</option>
                      <option value="Katolik">Katolik</option>
                      <option value="Hindu">Hindu</option>
                      <option value="Buddha">Buddha</option>
                      <option value="Konghucu">Konghucu</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor={`saksi_alamat_${idx}`} style={labelStyle}>ALAMAT DOMISILI</label>
                  <input
                    id={`saksi_alamat_${idx}`}
                    type="text"
                    value={saksi.alamat || ''}
                    onChange={(e) => onUpdateSaksi(idx, 'alamat', e.target.value)}
                    placeholder="Alamat domisili lengkap KTP"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label htmlFor={`saksi_kontak_${idx}`} style={labelStyle}>NOMOR HP / WHATSAPP</label>
                  <input
                    id={`saksi_kontak_${idx}`}
                    type="tel"
                    value={saksi.kontak || ''}
                    onChange={(e) => onUpdateSaksi(idx, 'kontak', e.target.value)}
                    placeholder="08************"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* KOLOM 03: PIHAK TERLAPOR */}
      {/* ============================================================ */}
      <div
        style={{
          backgroundColor: '#111622',
          border: '1px solid #1E293B',
          borderRadius: '0.75rem',
          padding: '1.25rem',
          color: '#F1F5F9',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >
        {/* Header Bagian Terlapor */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1E293B',
            paddingBottom: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div
              style={{
                width: '1.5rem',
                height: '1.5rem',
                borderRadius: '0.375rem',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'monospace',
                fontWeight: 700,
                fontSize: '0.75rem'
              }}
            >
              03
            </div>
            <div>
              <h3
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontFamily: 'monospace',
                  margin: 0
                }}
              >
                PIHAK TERLAPOR
              </h3>
              <p style={{ fontSize: '0.6875rem', color: '#64748B', margin: '0.125rem 0 0 0' }}>
                Pihak yang dilaporkan / terlapor ({terlaporList.length})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onAddTerlapor}
            style={btnAddStyle}
          >
            <Plus size={12} />
            <span>Tambah Terlapor</span>
          </button>
        </div>

        {/* Daftar Terlapor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '650px', overflowY: 'auto' }}>
          {terlaporList.map((terlapor, idx) => (
            <div
              key={terlapor.id || idx}
              style={{
                backgroundColor: '#141C2B',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '0.625rem',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}
            >
              {/* Header Subcard Terlapor */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E293B', paddingBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', backgroundColor: '#EF4444', display: 'inline-block' }} />
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#FFFFFF', fontSize: '0.6875rem', textTransform: 'uppercase' }}>
                    TERLAPOR {idx + 1}
                  </span>
                  <span style={{ padding: '0.125rem 0.375rem', borderRadius: '0.25rem', fontSize: '0.625rem', fontFamily: 'monospace', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    {terlapor.role_label || 'Terlapor Utama'}
                  </span>
                </div>

                {terlaporList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveTerlapor(idx)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#F87171',
                      fontSize: '0.6875rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.2rem 0.4rem',
                      borderRadius: '0.25rem'
                    }}
                    title="Hapus Terlapor"
                  >
                    <Trash2 size={12} /> Hapus
                  </button>
                )}
              </div>

              {/* Form Input Terlapor */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <div>
                  <label htmlFor={`terlapor_nama_${idx}`} style={labelStyle}>
                    NAMA LENGKAP <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    id={`terlapor_nama_${idx}`}
                    type="text"
                    value={terlapor.nama || ''}
                    onChange={(e) => onUpdateTerlapor(idx, 'nama', e.target.value)}
                    placeholder="Nama lengkap pihak terlapor"
                    style={{ ...inputStyle, borderColor: 'rgba(239, 68, 68, 0.4)' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label htmlFor={`terlapor_nik_${idx}`} style={labelStyle}>NIK</label>
                    <input
                      id={`terlapor_nik_${idx}`}
                      type="text"
                      maxLength={16}
                      value={terlapor.nik || ''}
                      onChange={(e) => onUpdateTerlapor(idx, 'nik', e.target.value)}
                      placeholder="74********"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label htmlFor={`terlapor_ttl_${idx}`} style={labelStyle}>TEMPAT, TGL LAHIR</label>
                    <input
                      id={`terlapor_ttl_${idx}`}
                      type="text"
                      value={terlapor.ttl || ''}
                      onChange={(e) => onUpdateTerlapor(idx, 'ttl', e.target.value)}
                      placeholder="Tempat, Tgl Lahir"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label htmlFor={`terlapor_pekerjaan_${idx}`} style={labelStyle}>PEKERJAAN</label>
                    <input
                      id={`terlapor_pekerjaan_${idx}`}
                      type="text"
                      value={terlapor.pekerjaan || ''}
                      onChange={(e) => onUpdateTerlapor(idx, 'pekerjaan', e.target.value)}
                      placeholder="Pekerjaan"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label htmlFor={`terlapor_agama_${idx}`} style={labelStyle}>AGAMA</label>
                    <select
                      id={`terlapor_agama_${idx}`}
                      value={terlapor.agama || 'Islam'}
                      onChange={(e) => onUpdateTerlapor(idx, 'agama', e.target.value)}
                      style={inputStyle}
                    >
                      <option value="Islam">Islam</option>
                      <option value="Kristen Protestan">Kristen</option>
                      <option value="Katolik">Katolik</option>
                      <option value="Hindu">Hindu</option>
                      <option value="Buddha">Buddha</option>
                      <option value="Konghucu">Konghucu</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor={`terlapor_alamat_${idx}`} style={labelStyle}>ALAMAT DOMISILI</label>
                  <input
                    id={`terlapor_alamat_${idx}`}
                    type="text"
                    value={terlapor.alamat || ''}
                    onChange={(e) => onUpdateTerlapor(idx, 'alamat', e.target.value)}
                    placeholder="Alamat tempat tinggal terlapor"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label htmlFor={`terlapor_kontak_${idx}`} style={labelStyle}>NOMOR HP / KONTAK</label>
                  <input
                    id={`terlapor_kontak_${idx}`}
                    type="tel"
                    value={terlapor.kontak || ''}
                    onChange={(e) => onUpdateTerlapor(idx, 'kontak', e.target.value)}
                    placeholder="08************"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
