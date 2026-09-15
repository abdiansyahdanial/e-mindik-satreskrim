import React, { useState } from 'react';
import { 
  Camera, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Shield, 
  X, 
  ScanLine 
} from 'lucide-react';

export default function DumasModeSelectModal({
  isOpen = true,
  onClose,
  onSelectMode
}) {
  const [isSimulatingOcr, setIsSimulatingOcr] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  if (!isOpen) return null;

  const handleStartScan = (file = null) => {
    setIsSimulatingOcr(true);
    setTimeout(() => {
      setIsSimulatingOcr(false);
      onSelectMode('ocr', file);
    }, 1200);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleStartScan(e.dataTransfer.files[0]);
    }
  };

  return (
    <div 
      className="dumas-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div 
        className="dumas-modal-container"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '880px',
          backgroundColor: '#0E1118',
          border: '1px solid #292F42',
          borderRadius: '16px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.95)',
          overflow: 'hidden',
          animation: 'dumasFadeIn 0.2s ease-out',
        }}
      >
        {/* Top Header Decorator Bar */}
        <div style={{ height: '4px', width: '100%', background: 'linear-gradient(90deg, #E52E2E 0%, #FF352D 50%, #C82323 100%)' }}></div>

        {/* Modal Close Button */}
        {onClose && (
          <button 
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              padding: '6px',
              borderRadius: '8px',
              color: '#94A3B8',
              backgroundColor: '#151822',
              border: '1px solid #292F42',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            title="Tutup Modal"
          >
            <X size={18} />
          </button>
        )}

        <div style={{ padding: '32px' }}>
          {/* Header Section */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(229, 46, 46, 0.1)',
              border: '1px solid rgba(229, 46, 46, 0.3)',
              color: '#FF352D',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 600,
              letterSpacing: '0.08em',
              marginBottom: '12px'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#FF352D' }}></span>
              STANDAR ADMINISTRASI PENYIDIKAN PRESISI
            </div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#FFFFFF',
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              fontFamily: 'JetBrains Mono, monospace',
              margin: 0
            }}>
              REGISTRASI LAPORAN BARU
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '13px', marginTop: '8px', maxWidth: '640px', marginLeft: 'auto', marginRight: 'auto', fontFamily: 'Inter, sans-serif' }}>
              Pilih metode input administrasi sesuai ketersediaan berkas fisik perkara tindak pidana untuk mempercepat pembuatan Sprin Lidik/Sidik dan mindik terintegrasi Satreskrim Polres Kolaka Timur.
            </p>
          </div>

          {/* 2-Column Action Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', alignItems: 'stretch' }}>
            
            {/* OPSI A: SMART SCAN BERKAS FISIK (AI OCR) */}
            <div 
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              style={{
                position: 'relative',
                borderRadius: '16px',
                background: dragActive ? '#1E1820' : 'linear-gradient(180deg, #151822 0%, #10141D 100%)',
                border: dragActive ? '1px solid #FF352D' : '1px solid rgba(229, 46, 46, 0.4)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 0 24px -6px rgba(229, 46, 46, 0.25)',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {/* Recommendation Badge */}
              <div style={{ position: 'absolute', top: '-14px', left: '20px' }}>
                <span style={{
                  background: 'linear-gradient(90deg, #E52E2E 0%, #B81D18 100%)',
                  color: '#FFFFFF',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '10px',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 10px rgba(0, 0, 0, 0.4)'
                }}>
                  <Sparkles size={11} color="#FDE047" />
                  REKOMENDASI BERKAS FISIK • CEPAT &amp; OTOMATIS
                </span>
              </div>

              <div>
                {/* Header Card Opsi A */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', marginBottom: '16px' }}>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(127, 29, 29, 0.4)',
                    border: '1px solid rgba(229, 46, 46, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FF352D'
                  }}>
                    <ScanLine size={26} />
                  </div>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#F87171',
                    backgroundColor: 'rgba(127, 29, 29, 0.5)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(153, 27, 27, 0.6)'
                  }}>
                    AI OCR ENGINE v4.2
                  </span>
                </div>

                {/* Title & Description */}
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', fontFamily: 'JetBrains Mono, monospace', margin: '0 0 8px 0' }}>
                  OPSI A: SMART SCAN BERKAS FISIK
                </h3>
                <p style={{ color: '#CBD5E1', fontSize: '12px', lineHeight: 1.5, margin: 0, fontFamily: 'Inter, sans-serif' }}>
                  Pindai lembar aduan / LP bermeterai menggunakan AI OCR Presisi. Field formulir identitas pelapor, saksi, dan pasal akan diekstrak secara otomatis ke formulir digital.
                </p>

                {/* Feature Bullet Points */}
                <div style={{
                  marginTop: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  backgroundColor: '#0B0D13',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #292F42'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#CBD5E1', fontFamily: 'JetBrains Mono, monospace' }}>
                    <CheckCircle2 size={13} color="#FF352D" />
                    <span>Auto-ekstraksi NIK &amp; Nama Pelapor/Terlapor</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#CBD5E1', fontFamily: 'JetBrains Mono, monospace' }}>
                    <CheckCircle2 size={13} color="#FF352D" />
                    <span>Deteksi Locus &amp; Tempus Delicti otomatis</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#CBD5E1', fontFamily: 'JetBrains Mono, monospace' }}>
                    <CheckCircle2 size={13} color="#FF352D" />
                    <span>Visualisasi bounding box &amp; verifikasi data</span>
                  </div>
                </div>
              </div>

              {/* Action Button OPSI A */}
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #292F42' }}>
                <label style={{ display: 'block', width: '100%', cursor: 'pointer' }}>
                  <input 
                    type="file" 
                    accept="application/pdf,image/*" 
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleStartScan(e.target.files[0]);
                      }
                    }}
                  />
                  <button 
                    type="button"
                    disabled={isSimulatingOcr}
                    onClick={() => handleStartScan()}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #E52E2E 0%, #B81D18 100%)',
                      color: '#FFFFFF',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 700,
                      fontSize: '12px',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 0 16px rgba(229, 46, 46, 0.4)',
                      cursor: 'pointer'
                    }}
                  >
                    {isSimulatingOcr ? (
                      <>
                        <div style={{ width: '14px', height: '14px', border: '2px solid #FFFFFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        <span>Menganalisis Dokumen AI OCR...</span>
                      </>
                    ) : (
                      <>
                        <Camera size={15} />
                        <span>[ Mulai Pindai Berkas Fisik ]</span>
                      </>
                    )}
                  </button>
                </label>
              </div>
            </div>

            {/* OPSI B: INPUT MANUAL LANGSUNG */}
            <div 
              style={{
                position: 'relative',
                borderRadius: '16px',
                background: 'linear-gradient(180deg, #151822 0%, #10141D 100%)',
                border: '1px solid #292F42',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {/* Category Badge */}
              <div style={{ position: 'absolute', top: '-14px', left: '20px' }}>
                <span style={{
                  background: '#1F2633',
                  color: '#CBD5E1',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '10px',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  border: '1px solid #475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#94A3B8' }}></span>
                  FORMULIR TERSTRUKTUR • BERKAS BARU
                </span>
              </div>

              <div>
                {/* Header Card Opsi B */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', marginBottom: '16px' }}>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '12px',
                    backgroundColor: '#1B212E',
                    border: '1px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#CBD5E1'
                  }}>
                    <FileText size={26} />
                  </div>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#CBD5E1',
                    backgroundColor: '#151B27',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: '1px solid #334155'
                  }}>
                    3 KOLOM LENGKAP
                  </span>
                </div>

                {/* Title & Description */}
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', fontFamily: 'JetBrains Mono, monospace', margin: '0 0 8px 0' }}>
                  OPSI B: INPUT MANUAL LANGSUNG
                </h3>
                <p style={{ color: '#CBD5E1', fontSize: '12px', lineHeight: 1.5, margin: 0, fontFamily: 'Inter, sans-serif' }}>
                  Ketik data perkara dari awal secara terstruktur langsung pada formulir digital web (3 Kolom: Data Pelapor/Korban, Saksi-Saksi, &amp; Terlapor/Tersangka).
                </p>

                {/* Feature Bullet Points */}
                <div style={{
                  marginTop: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  backgroundColor: '#0B0D13',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #292F42'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#CBD5E1', fontFamily: 'JetBrains Mono, monospace' }}>
                    <CheckCircle2 size={13} color="#94A3B8" />
                    <span>Formulir 3 kolom tervalidasi seketika</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#CBD5E1', fontFamily: 'JetBrains Mono, monospace' }}>
                    <CheckCircle2 size={13} color="#94A3B8" />
                    <span>Dukungan input multi saksi &amp; multi terlapor</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#CBD5E1', fontFamily: 'JetBrains Mono, monospace' }}>
                    <CheckCircle2 size={13} color="#94A3B8" />
                    <span>Langsung cetak tanda terima &amp; draft Sprin</span>
                  </div>
                </div>
              </div>

              {/* Action Button OPSI B */}
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #292F42' }}>
                <button 
                  type="button"
                  onClick={() => onSelectMode('manual')}
                  style={{
                    width: '100%',
                    backgroundColor: '#1B212E',
                    border: '1px solid #334155',
                    color: '#F1F5F9',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                    fontSize: '12px',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <ArrowRight size={15} />
                  <span>[ Buka Formulir Kosong ]</span>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Footer SOP Helper Note */}
        <div style={{
          padding: '12px 24px',
          backgroundColor: '#0B0D13',
          borderTop: '1px solid #292F42',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          fontFamily: 'JetBrains Mono, monospace',
          color: '#64748B'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={13} color="#FF352D" />
            <span>SOP Penanganan Dumas Satreskrim Polres Kolaka Timur No. Dokumen: SOP/RESKRIM/01/2026</span>
          </div>
          <span>Kerahasiaan &amp; Integritas Data Terjamin</span>
        </div>
      </div>
    </div>
  );
}
