import React from 'react';

/**
 * ComponentErrorBoundary — Generic Error Boundary
 * Membungkus komponen apapun agar tidak menyebabkan layar blank saat crash.
 * Menampilkan UI pemulihan dengan opsi bersihkan draft korup.
 */
export class ComponentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[CRITICAL UI CRASH]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    try {
      localStorage.removeItem('emindik_draft_daftar_bb_v1');
      localStorage.removeItem('emindik_draft_form_perkara_v1');
      localStorage.removeItem('emindik_temp_draft_bb');
      localStorage.removeItem('temp_dumas_bb');
      localStorage.removeItem('emindik_dumas_form_draft_v1');
      sessionStorage.removeItem('emindik_dumas_subview');
    } catch (e) {
      console.error('[CACHE CLEAR ERROR]:', e);
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleRetryOnly = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '400px',
            backgroundColor: '#080B10',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '12px',
            padding: '36px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            margin: '24px',
          }}
        >
          {/* Ikon Peringatan */}
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '18px',
              fontSize: '28px',
            }}
          >
            ⚠️
          </div>

          <h3
            style={{
              color: '#FFFFFF',
              fontSize: '17px',
              fontWeight: 700,
              margin: '0 0 8px 0',
            }}
          >
            Terjadi Kendala Rendering Komponen
          </h3>
          <p
            style={{
              color: '#94A3B8',
              fontSize: '13px',
              margin: '0 0 20px 0',
              maxWidth: '520px',
              lineHeight: 1.6,
            }}
          >
            Komponen gagal dimuat karena anomali data cache atau struktur state. Data di server tidak terpengaruh.
          </p>

          {/* Rincian error untuk debugging */}
          {this.state.error && (
            <div
              style={{
                width: '100%',
                maxWidth: '600px',
                backgroundColor: '#0F131D',
                border: '1px solid #1E2536',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '22px',
                textAlign: 'left',
                overflowX: 'auto',
              }}
            >
              <span
                style={{
                  fontSize: '10px',
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
                {this.state.error?.message || String(this.state.error)}
              </code>
            </div>
          )}

          {/* Tombol Pemulihan */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={this.handleRetryOnly}
              style={{
                padding: '9px 16px',
                backgroundColor: '#1E293B',
                border: '1px solid #334155',
                color: '#F8FAFC',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              🔄 Coba Ulang
            </button>

            <button
              type="button"
              onClick={this.handleReset}
              style={{
                padding: '9px 16px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#F87171',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              🗑️ Bersihkan Draft Korup &amp; Muat Ulang Form
            </button>

            {this.props.onResetView && (
              <button
                type="button"
                onClick={this.props.onResetView}
                style={{
                  padding: '9px 16px',
                  backgroundColor: 'transparent',
                  border: '1px solid #292F42',
                  color: '#94A3B8',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontFamily: 'JetBrains Mono, monospace',
                  cursor: 'pointer',
                }}
              >
                ← Kembali ke Daftar
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ComponentErrorBoundary;
