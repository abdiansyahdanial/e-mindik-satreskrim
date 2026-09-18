import React from 'react';
import { FileText, MapPin, Calendar, AlertCircle } from 'lucide-react';

export default function UraianPerkaraSection({ caseInfo = {}, onChange }) {
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
      {/* Header Bagian 04 */}
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
            04
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
              PERISTIWA &amp; DUGAAN PASAL PIDANA
            </h3>
            <p style={{ fontSize: '0.6875rem', color: '#64748B', margin: '0.125rem 0 0 0' }}>
              Rincian dugaan peristiwa tindak pidana, tempus, locus, dan kronologis
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
          Kronologi Perkara
        </span>
      </div>

      {/* Grid Input Perkara */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Baris 1: Dugaan Tindak Pidana & Dugaan Pasal */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div>
            <label htmlFor="dumas_tindak_pidana" style={labelStyle}>
              DUGAAN TINDAK PIDANA <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              id="dumas_tindak_pidana"
              name="tindak_pidana"
              type="text"
              value={caseInfo.tindak_pidana || caseInfo.dugaan_tindak_pidana || ''}
              onChange={(e) => handleChange('tindak_pidana', e.target.value)}
              placeholder="Contoh: Penggelapan Dana Kas / Penipuan"
              style={{ ...inputStyle, fontWeight: 600 }}
            />
          </div>

          <div>
            <label htmlFor="dumas_pasal" style={labelStyle}>
              DUGAAN PASAL YANG DISANGKAKAN
            </label>
            <input
              id="dumas_pasal"
              name="pasal"
              type="text"
              value={caseInfo.pasal || caseInfo.pasal_disangkakan || ''}
              onChange={(e) => handleChange('pasal', e.target.value)}
              placeholder="Contoh: Pasal 372 KUHP dan/atau Pasal 378 KUHP"
              style={{ ...inputStyle, fontWeight: 600 }}
            />
          </div>
        </div>

        {/* Baris 2: Waktu Kejadian & TKP */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div>
            <label htmlFor="dumas_waktu_kejadian" style={labelStyle}>
              WAKTU KEJADIAN (TEMPUS DELICTI)
            </label>
            <input
              id="dumas_waktu_kejadian"
              name="waktu_kejadian"
              type="text"
              value={caseInfo.waktu_kejadian || caseInfo.waktu || ''}
              onChange={(e) => handleChange('waktu_kejadian', e.target.value)}
              placeholder="Contoh: Senin, 14 September 2026 - Pukul 10.30 WITA"
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="dumas_tkp" style={labelStyle}>
              TEMPAT KEJADIAN (LOCUS DELICTI)
            </label>
            <input
              id="dumas_tkp"
              name="tkp"
              type="text"
              value={caseInfo.tkp || caseInfo.locus_delicti || ''}
              onChange={(e) => handleChange('tkp', e.target.value)}
              placeholder="Contoh: Kantor Bumdes Tirawuta, Kec. Tirawuta, Kab. Kolaka Timur"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Baris 3: Uraian Singkat Kronologi Kejadian */}
        <div>
          <label htmlFor="dumas_uraian" style={labelStyle}>
            RINGKASAN POSISI KASUS / URAIAN KRONOLOGIS KEJADIAN <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <textarea
            id="dumas_uraian"
            name="uraian"
            rows={5}
            value={caseInfo.uraian || caseInfo.uraian_kejadian || ''}
            onChange={(e) => handleChange('uraian', e.target.value)}
            placeholder="Jelaskan secara kronologis duduk perkara aduan masyarakat, fakta-fakta yang terjadi, serta kerugian yang dialami..."
            style={{ ...inputStyle, resize: 'vertical', minHeight: '120px', lineHeight: '1.5' }}
          />
        </div>
      </div>
    </div>
  );
}
