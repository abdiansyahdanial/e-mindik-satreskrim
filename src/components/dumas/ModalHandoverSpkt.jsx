import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Lock,
  AlertTriangle,
  Loader2,
  FileText
} from 'lucide-react';
import { submitHandoverSpktToReskrim } from '../../services/dumasService.js';

export default function ModalHandoverSpkt({
  isOpen = false,
  onClose,
  dumasItem,
  onSuccess
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Keyboard shortcut ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose && onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!dumasItem?.id) {
      setErrorMsg('ID berkas laporan tidak valid.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const updated = await submitHandoverSpktToReskrim({
        laporanId: dumasItem.id,
        nomorLp: dumasItem.nomor_lp || dumasItem.nomor_register || 'DUMAS-KOLTIM'
      });

      if (typeof onSuccess === 'function') {
        onSuccess(updated);
      }
      if (typeof onClose === 'function') {
        onClose();
      }
    } catch (err) {
      console.error('Gagal serah terima Dumas:', err);
      setErrorMsg(`Gagal memproses serah terima: ${err.message || 'Kesalahan sistem'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(6px)',
        animation: 'fadeIn 0.15s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose && onClose();
      }}
    >
      <div
        className="w-full max-w-lg bg-[#121721] border border-[#292F42] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#121721',
          border: '1px solid #292F42',
          borderRadius: '14px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 35px rgba(245, 158, 11, 0.15)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#0d1118',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F59E0B'
              }}
            >
              <Lock size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '9px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    color: '#FCD34D',
                    letterSpacing: '0.05em'
                  }}
                >
                  CHAIN OF CUSTODY
                </span>
                <span style={{ fontSize: '10px', color: '#64748B', fontFamily: 'JetBrains Mono, monospace' }}>
                  SPKT ➔ SATRESKRIM
                </span>
              </div>
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  margin: '3px 0 0 0',
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '0.02em'
                }}
              >
                Konfirmasi Penyerahan Berkas ke Satreskrim
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
            title="Tutup (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #EF4444',
                color: '#FCA5A5',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Nomor Register Badge */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: '#0d1118',
              border: '1px solid #1e293b',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: '#64748B', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Nomor Register Dumas
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700,
                  color: '#FCD34D',
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(245, 158, 11, 0.35)'
                }}
              >
                {dumasItem?.nomor_lp || dumasItem?.nomor_register || 'DUMAS-KOLTIM'}
              </span>
            </div>

            <div style={{ fontSize: '12px', color: '#CBD5E1', display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '4px' }}>
              <span>Pelapor: <strong style={{ color: '#FFF' }}>{dumasItem?.pelapor_nama || dumasItem?.nama_pelapor || '-'}</strong></span>
              <span style={{ color: '#94A3B8' }}>Perkara: <span style={{ color: '#38BDF8' }}>{dumasItem?.tindak_pidana || '-'}</span></span>
            </div>
          </div>

          {/* Keterangan & Peringatan Status Locking */}
          <div
            style={{
              padding: '14px',
              borderRadius: '10px',
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start'
            }}
          >
            <AlertTriangle size={20} color="#F59E0B" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '12px', color: '#F1F5F9', lineHeight: 1.6 }}>
              <p style={{ margin: 0 }}>
                Apakah Anda yakin ingin menyerahkan berkas laporan ini ke Satreskrim?
              </p>
              <p style={{ margin: '6px 0 0 0', color: '#FCD34D', fontSize: '11px', fontWeight: 500 }}>
                Setelah diserahkan, data administrasi berkas akan <strong>DIKUNCI secara permanen (read-only)</strong> demi menjaga keaslian <em>chain of custody</em>.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            padding: '14px 20px',
            backgroundColor: '#0d1118',
            borderTop: '1px solid #1e293b'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'JetBrains Mono, monospace',
              color: '#94A3B8',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            style={{
              padding: '9px 20px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: 'JetBrains Mono, monospace',
              color: '#0F172A',
              backgroundColor: '#F59E0B',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 0 16px rgba(245, 158, 11, 0.4)',
              transition: 'all 0.15s ease'
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Menyerahkan Berkas...</span>
              </>
            ) : (
              <>
                <Send size={15} />
                <span>Ya, Serahkan Berkas</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
