import React from 'react';

export default function PelaporSection({ data = {}, onChange }) {
  const handleChange = (field, value) => {
    if (typeof onChange === 'function') {
      onChange(field, value);
    }
  };

  const inputStyle = {
    width: '100%',
    backgroundColor: '#141C2B',
    border: '1px solid #263347',
    borderRadius: '0.5rem',
    padding: '0.625rem 0.875rem',
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
    marginBottom: '0.375rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  };

  return (
    <div
      style={{
        backgroundColor: '#111622',
        border: '1px solid #1E293B',
        borderRadius: '0.75rem',
        padding: '1.25rem',
        color: '#F1F5F9'
      }}
    >
      {/* Header Bagian 01 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #1E293B',
          paddingBottom: '0.875rem',
          marginBottom: '1.25rem'
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
            01
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
              IDENTITAS PELAPOR / KORBAN
            </h3>
            <p style={{ fontSize: '0.6875rem', color: '#64748B', margin: '0.125rem 0 0 0' }}>
              Data diri lengkap pihak yang mengadukan atau melapor perkara
            </p>
          </div>
        </div>
        <span
          style={{
            fontSize: '0.625rem',
            fontFamily: 'monospace',
            color: '#94A3B8',
            backgroundColor: '#0B0D13',
            padding: '0.2rem 0.5rem',
            borderRadius: '0.25rem',
            border: '1px solid #263347'
          }}
        >
          Pihak Pelapor
        </span>
      </div>

      {/* Grid Formulir Pelapor */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Baris 1: NIK & Nama Lengkap */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div>
            <label htmlFor="pelapor_nik" style={labelStyle}>
              NIK (NOMOR INDUK KEPENDUDUKAN) <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              id="pelapor_nik"
              name="pelapor_nik"
              type="text"
              maxLength={16}
              value={data.nik || ''}
              onChange={(e) => handleChange('nik', e.target.value)}
              placeholder="74**************"
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="pelapor_nama" style={labelStyle}>
              NAMA LENGKAP <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              id="pelapor_nama"
              name="pelapor_nama"
              type="text"
              value={data.nama || ''}
              onChange={(e) => handleChange('nama', e.target.value)}
              placeholder="Nama lengkap beserta gelar (jika ada)"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Baris 2: Tempat & Tanggal Lahir (Single Text Input) */}
        <div>
          <label htmlFor="pelapor_tempat_tanggal_lahir" style={labelStyle}>
            TEMPAT, TGL LAHIR
          </label>
          <input
            id="pelapor_tempat_tanggal_lahir"
            name="pelapor_tempat_tanggal_lahir"
            type="text"
            value={data.tempat_tanggal_lahir || data.ttl || (data.tempat_lahir ? `${data.tempat_lahir}${data.tanggal_lahir ? `, ${data.tanggal_lahir}` : ''}` : (data.tanggal_lahir || ''))}
            onChange={(e) => {
              handleChange('tempat_tanggal_lahir', e.target.value);
              handleChange('ttl', e.target.value);
            }}
            placeholder="Contoh: Kolaka, 12 Mei 1990"
            style={inputStyle}
          />
        </div>

        {/* Baris 3: Jenis Kelamin, Agama, Kewarganegaraan */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div>
            <label htmlFor="pelapor_jenis_kelamin" style={labelStyle}>
              JENIS KELAMIN
            </label>
            <select
              id="pelapor_jenis_kelamin"
              name="pelapor_jenis_kelamin"
              value={data.jenis_kelamin || 'Laki-laki'}
              onChange={(e) => handleChange('jenis_kelamin', e.target.value)}
              style={inputStyle}
            >
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>
          </div>

          <div>
            <label htmlFor="pelapor_agama" style={labelStyle}>
              AGAMA
            </label>
            <select
              id="pelapor_agama"
              name="pelapor_agama"
              value={data.agama || 'Islam'}
              onChange={(e) => handleChange('agama', e.target.value)}
              style={inputStyle}
            >
              <option value="Islam">Islam</option>
              <option value="Kristen Protestan">Kristen Protestan</option>
              <option value="Katolik">Katolik</option>
              <option value="Hindu">Hindu</option>
              <option value="Buddha">Buddha</option>
              <option value="Konghucu">Konghucu</option>
            </select>
          </div>

          <div>
            <label htmlFor="pelapor_kewarganegaraan" style={labelStyle}>
              KEWARGANEGARAAN
            </label>
            <select
              id="pelapor_kewarganegaraan"
              name="pelapor_kewarganegaraan"
              value={data.kewarganegaraan || 'WNI'}
              onChange={(e) => handleChange('kewarganegaraan', e.target.value)}
              style={inputStyle}
            >
              <option value="WNI">WNI (Indonesia)</option>
              <option value="WNA">WNA (Asing)</option>
            </select>
          </div>
        </div>

        {/* Baris 4: Pekerjaan & No Telepon */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div>
            <label htmlFor="pelapor_pekerjaan" style={labelStyle}>
              PEKERJAAN
            </label>
            <input
              id="pelapor_pekerjaan"
              name="pelapor_pekerjaan"
              type="text"
              value={data.pekerjaan || ''}
              onChange={(e) => handleChange('pekerjaan', e.target.value)}
              placeholder="Contoh: Wiraswasta, PNS, Petani, Karyawan"
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="pelapor_telepon" style={labelStyle}>
              NO. TELEPON / WHATSAPP <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              id="pelapor_telepon"
              name="pelapor_telepon"
              type="tel"
              value={data.telepon || data.kontak || ''}
              onChange={(e) => handleChange('telepon', e.target.value)}
              placeholder="08************"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Baris 5: Alamat Lengkap Domisili KTP */}
        <div>
          <label htmlFor="pelapor_alamat" style={labelStyle}>
            ALAMAT DOMISILI KTP
          </label>
          <textarea
            id="pelapor_alamat"
            name="pelapor_alamat"
            rows={3}
            value={data.alamat || ''}
            onChange={(e) => handleChange('alamat', e.target.value)}
            placeholder="Alamat lengkap tempat tinggal / domisili sesuai KTP"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
      </div>
    </div>
  );
}
