import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Printer, CheckCircle2, Loader2, UserCheck } from 'lucide-react';
import { supabase } from '../../supabaseClient.js';

const FALLBACK_PAMAPTA = [
  { id: '1', kode_jabatan: 'PAMAPTA_I', unit: 'PAMAPTA I', nama: 'NAMA PERWIRA I, S.Tr.K.', pangkat_nrp: 'IPDA NRP XXXXXXXX' },
  { id: '2', kode_jabatan: 'PAMAPTA_II', unit: 'PAMAPTA II', nama: 'NAMA PERWIRA II, S.H.', pangkat_nrp: 'IPDA NRP YYYYYYYY' },
  { id: '3', kode_jabatan: 'PAMAPTA_III', unit: 'PAMAPTA III', nama: 'ARMAN, S.H.', pangkat_nrp: 'IPDA NRP 87020875' }
];

export default function ModalSelectPamapta({
  isOpen = false,
  onClose,
  onConfirmPrint
}) {
  const [pamaptaList, setPamaptaList] = useState(FALLBACK_PAMAPTA);
  const [selectedPamapta, setSelectedPamapta] = useState(() => {
    return FALLBACK_PAMAPTA.find(p => p.kode_jabatan === 'PAMAPTA_III') || FALLBACK_PAMAPTA[2] || FALLBACK_PAMAPTA[0];
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchPejabatSpkt() {
      if (!isOpen) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('pejabat_spkt')
          .select('*')
          .order('kode_jabatan', { ascending: true });

        if (!isMounted) return;

        if (error || !data || data.length === 0) {
          setPamaptaList(FALLBACK_PAMAPTA);
          setSelectedPamapta(prev => {
            const found = FALLBACK_PAMAPTA.find(p => p.kode_jabatan === (prev?.kode_jabatan || 'PAMAPTA_III'));
            return found || FALLBACK_PAMAPTA[2] || FALLBACK_PAMAPTA[0];
          });
        } else {
          // Normalize data
          const normalized = data.map((item, idx) => ({
            id: item.id || String(idx + 1),
            kode_jabatan: item.kode_jabatan || `PAMAPTA_${idx + 1}`,
            unit: item.unit || item.jabatan || `PAMAPTA ${idx + 1}`,
            nama: item.nama || item.nama_lengkap || 'PERWIRA SPKT',
            pangkat_nrp: item.pangkat_nrp || (item.pangkat && item.nrp ? `${item.pangkat} NRP ${item.nrp}` : 'IPDA NRP -')
          }));
          setPamaptaList(normalized);
          setSelectedPamapta(prev => {
            const found = normalized.find(p => p.kode_jabatan === (prev?.kode_jabatan || 'PAMAPTA_III'));
            return found || normalized[normalized.length - 1] || normalized[0];
          });
        }
      } catch (err) {
        console.warn('Gagal memuat pejabat_spkt dari Supabase, menggunakan fallback:', err);
        if (isMounted) {
          setPamaptaList(FALLBACK_PAMAPTA);
          setSelectedPamapta(prev => {
            const found = FALLBACK_PAMAPTA.find(p => p.kode_jabatan === (prev?.kode_jabatan || 'PAMAPTA_III'));
            return found || FALLBACK_PAMAPTA[2] || FALLBACK_PAMAPTA[0];
          });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchPejabatSpkt();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose && onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedPamapta) return;
    onConfirmPrint && onConfirmPrint(selectedPamapta);
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
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.15s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose && onClose();
      }}
    >
      <div
        className="w-full max-w-lg bg-[#161310] border border-[rgba(251,219,175,0.18)] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#161310',
          border: '1px solid rgba(251, 219, 175, 0.18)',
          borderRadius: '18px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 32px rgba(224, 112, 32, 0.14)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 bg-[#0E0C0A] border-b border-[rgba(251,219,175,0.14)] flex items-center justify-between"
          style={{
            padding: '16px 20px',
            backgroundColor: '#0E0C0A',
            borderBottom: '1px solid rgba(251, 219, 175, 0.14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(224, 112, 32, 0.16)',
                border: '1px solid rgba(255, 90, 31, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FF5A1F'
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  margin: 0,
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '0.02em'
                }}
              >
                PILIH PEJABAT PAMAPTA SPKT
              </h3>
              <p style={{ fontSize: '11px', color: '#94A3B8', margin: '2px 0 0 0' }}>
                Penandatangan Surat Tanda Penerimaan Laporan (STTLP)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px'
            }}
            title="Tutup (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              fontSize: '11px',
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 600,
              fontFamily: 'JetBrains Mono, monospace',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>Daftar Perwira Jaga / Pamapta Aktif</span>
            {isLoading && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#FF7A33' }}>
                <Loader2 size={12} className="animate-spin" /> Memuat data...
              </span>
            )}
          </div>

          {/* Opsi Radio List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pamaptaList.map((officer) => {
              const isSelected = selectedPamapta?.kode_jabatan === officer.kode_jabatan ||
                (selectedPamapta?.id && officer.id && selectedPamapta.id === officer.id);

              return (
                <div
                  key={officer.id || officer.kode_jabatan}
                  onClick={() => setSelectedPamapta(officer)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    backgroundColor: isSelected ? 'rgba(224, 112, 32, 0.14)' : '#0E0C0A',
                    border: isSelected ? '1.5px solid #FF5A1F' : '1px solid rgba(251, 219, 175, 0.14)',
                    boxShadow: isSelected ? '0 0 18px rgba(224, 112, 32, 0.2)' : 'none'
                  }}
                >
                  {/* Radio Indicator */}
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: isSelected ? '2px solid #FF5A1F' : '2px solid rgba(251, 219, 175, 0.35)',
                      backgroundColor: isSelected ? '#FF5A1F' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isSelected && (
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: '#0E0C0A'
                        }}
                      />
                    )}
                  </div>

                  {/* Officer Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          backgroundColor: isSelected ? '#FFFFFF' : 'rgba(251, 219, 175, 0.08)',
                          color: isSelected ? '#0E0C0A' : '#FBDBAF',
                          letterSpacing: '0.04em'
                        }}
                      >
                        {officer.unit}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: isSelected ? '#FFFFFF' : '#FAF6F0',
                        fontFamily: 'JetBrains Mono, monospace',
                        letterSpacing: '0.02em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {officer.nama}
                    </div>

                    <div
                      style={{
                        fontSize: '11px',
                        color: isSelected ? '#FF7A33' : 'rgba(251, 219, 175, 0.55)',
                        fontFamily: 'JetBrains Mono, monospace',
                        marginTop: '2px'
                      }}
                    >
                      {officer.pangkat_nrp}
                    </div>
                  </div>

                  {isSelected && (
                    <CheckCircle2 size={18} style={{ color: '#FF5A1F', flexShrink: 0 }} />
                  )}
                </div>
              );
            })}
          </div>

          <div
            style={{
              padding: '10px 12px',
              backgroundColor: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid rgba(51, 65, 85, 0.5)',
              borderRadius: '8px',
              fontSize: '11px',
              color: '#94A3B8',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '4px'
            }}
          >
            <UserCheck size={14} style={{ color: '#FF7A33', flexShrink: 0 }} />
            <span>Pejabat yang dipilih akan tercetak pada kolom Tanda Tangan Penerima Laporan (Kanit / Pamapta SPKT).</span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: '#0d1118',
            borderTop: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'JetBrains Mono, monospace',
              color: '#94A3B8',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedPamapta}
            style={{
              padding: '8px 18px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: 'JetBrains Mono, monospace',
              color: '#FFFFFF',
              backgroundColor: '#E07020',
              border: 'none',
              cursor: !selectedPamapta ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 0 18px rgba(224, 112, 32, 0.45)',
              transition: 'all 0.15s ease'
            }}
          >
            <Printer size={15} />
            <span>Cetak STTL</span>
          </button>
        </div>
      </div>
    </div>
  );
}
