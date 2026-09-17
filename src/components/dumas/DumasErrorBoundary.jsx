import React from 'react';
import { AlertTriangle, RotateCcw, ArrowLeft, RefreshCw } from 'lucide-react';

/**
 * Lightweight Error Boundary khusus untuk menu Input Dumas & Bukti Digital
 * Mencegah layar blank total saat terjadi runtime exception pada pembacaan storage / rendering bukti.
 */
export default class DumasErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[DUMAS ERROR BOUNDARY DIBAJAK]:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleClearCacheAndReload = () => {
    try {
      localStorage.removeItem('emindik_draft_daftar_bb_v1');
      localStorage.removeItem('emindik_draft_form_perkara_v1');
      localStorage.removeItem('emindik_temp_draft_bb');
      localStorage.removeItem('temp_dumas_bb');
      localStorage.removeItem('emindik_dumas_form_draft_v1');
      sessionStorage.removeItem('temp_dumas_token');
      sessionStorage.removeItem('emindik_dumas_subview');
    } catch (e) {
      console.warn('Gagal membersihkan cache:', e);
    }
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '600px',
            backgroundColor: '#080B10',
            border: '1px solid #292F42',
            borderRadius: '12px',
            padding: '36px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            margin: '24px auto',
            maxWidth: '800px',
          }}
        >
          {/* Ikon Peringatan */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
            }}
          >
            <AlertTriangle size={32} color="#EF4444" />
          </div>

          <h3
            style={{
              color: '#FFFFFF',
              fontSize: '18px',
              fontWeight: 700,
              margin: '0 0 8px 0',
              letterSpacing: '0.02em',
            }}
          >
            Terjadi Kendala Saat Memuat Formulir Dumas
          </h3>
          <p
            style={{
              color: '#94A3B8',
              fontSize: '13px',
              margin: '0 0 20px 0',
              maxWidth: '560px',
              lineHeight: 1.5,
            }}
          >
            Sistem mendeteksi galat saat memuat data atau merender daftar barang bukti. Data Anda telah diamankan dan tidak hilang dari server.
          </p>

          {/* Rincian Pesan Error */}
          {this.state.error && (
            <div
              style={{
                width: '100%',
                backgroundColor: '#0F131D',
                border: '1px solid #1E2536',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '24px',
                textAlign: 'left',
                overflowX: 'auto',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#EF4444',
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Pesan Galat:
              </span>
              <code
                style={{
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#CBD5E1',
                  wordBreak: 'break-word',
                }}
              >
                {this.state.error.message || String(this.state.error)}
              </code>
            </div>
          )}

          {/* Tombol Aksi Pemulihan */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={this.handleRetry}
              style={{
                padding: '10px 18px',
                backgroundColor: '#1E293B',
                border: '1px solid #334155',
                color: '#F8FAFC',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600,
              }}
            >
              <RefreshCw size={14} />
              Coba Ulang
            </button>

            <button
              type="button"
              onClick={this.handleClearCacheAndReload}
              style={{
                padding: '10px 18px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#F87171',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600,
              }}
            >
              <RotateCcw size={14} />
              Reset Cache Form & Buat Baru
            </button>

            {this.props.onResetView && (
              <button
                type="button"
                onClick={this.props.onResetView}
                style={{
                  padding: '10px 18px',
                  backgroundColor: 'transparent',
                  border: '1px solid #292F42',
                  color: '#94A3B8',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontFamily: 'JetBrains Mono, monospace',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ArrowLeft size={14} />
                Kembali ke Daftar Dumas
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
