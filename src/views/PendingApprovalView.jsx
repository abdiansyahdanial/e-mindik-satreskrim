import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Clock, 
  RefreshCw, 
  LogOut, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  User, 
  Building2, 
  Mail, 
  Phone 
} from 'lucide-react';
import logoImg from '../assets/logo.png';
import { supabase } from '../supabaseClient';

export default function PendingApprovalView({ currentUserProfile, user, onStatusUpdated, onLogout }) {
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState(null);

  const profile = currentUserProfile || {};
  const meta = user?.user_metadata || {};

  const nama = profile.nama || profile.full_name || meta.full_name || meta.nama || user?.email?.split('@')[0] || 'Personel Penyidik';
  const pangkat = profile.pangkat || profile.rank || meta.pangkat || meta.rank || '-';
  const nrp = profile.nrp || profile.rank_nrp || meta.nrp || meta.rank_nrp || '-';
  const jabatan = profile.jabatan || meta.jabatan || 'Penyidik Pembantu';
  const satker = profile.satker || meta.satker || 'Satreskrim Polres Kolaka Timur';
  const unit = profile.unit || meta.unit || '-';
  const email = user?.email || profile.email || '-';
  const phone = profile.phone || profile.no_hp || meta.phone || meta.no_hp || '-';

  // Supabase Realtime Listener: otomatis beralih seketika saat Super Admin menyetujui akun
  React.useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profile_approval_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        async (payload) => {
          const updated = payload.new;
          if (updated && updated.status === 'active') {
            setCheckMsg({ 
              type: 'success', 
              text: 'Selamat! Akun Anda telah diverifikasi oleh Admin, silahkan login kembali.' 
            });
            setTimeout(async () => {
              try {
                await supabase.auth.signOut();
              } catch (soErr) {
                console.warn('Signout notice:', soErr);
              }
              if (onLogout) {
                onLogout();
              } else {
                window.location.replace('/');
              }
            }, 2500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, onLogout]);

  const handleCheckStatus = async () => {
    setChecking(true);
    setCheckMsg(null);
    try {
      if (!user?.id) return;

      // 1. Fetch fresh profile directly from Supabase profiles table
      const { data: freshProf, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      const isApproved = freshProf?.status === 'active';

      if (isApproved) {
        setCheckMsg({ 
          type: 'success', 
          text: 'Selamat! Akun Anda telah diverifikasi oleh Admin, silahkan login kembali.' 
        });

        setTimeout(async () => {
          try {
            await supabase.auth.signOut();
          } catch (soErr) {
            console.warn('Signout notice:', soErr);
          }
          if (onLogout) {
            onLogout();
          } else {
            window.location.replace('/');
          }
        }, 2500);
      } else if (freshProf?.status === 'rejected' || freshProf?.role === 'rejected') {
        setCheckMsg({ type: 'error', text: 'Pengajuan akun Anda ditolak oleh Super Admin. Silakan hubungi Kasat Reskrim.' });
      } else {
        setCheckMsg({ type: 'info', text: 'Akun Anda masih dalam proses antrean verifikasi oleh Administrator Satreskrim.' });
      }
    } catch (err) {
      console.warn('Status check warning:', err);
      setCheckMsg({ type: 'error', text: `Gagal memeriksa status: ${err.message}` });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'radial-gradient(circle at 50% 15%, rgba(0, 212, 255, 0.1) 0%, rgba(6, 11, 24, 0.98) 75%, #030712 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Grid Pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          linear-gradient(to right, rgba(251, 219, 175, 0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(251, 219, 175, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      <div style={{
        maxWidth: '560px',
        width: '100%',
        background: 'rgba(18, 14, 11, 0.88)',
        backdropFilter: 'blur(18px)',
        border: '1px solid rgba(251, 219, 175, 0.16)',
        borderRadius: '18px',
        boxShadow: '0 24px 55px rgba(0, 0, 0, 0.85), 0 0 32px rgba(224, 112, 32, 0.14)',
        padding: '36px 32px',
        position: 'relative',
        zIndex: 10,
        textAlign: 'center'
      }}>
        {/* Emblem & Logo Header */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{
            position: 'relative',
            width: '74px',
            height: '74px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(224, 112, 32, 0.18), rgba(255, 90, 31, 0.12))',
            border: '2px solid rgba(255, 90, 31, 0.6)',
            boxShadow: '0 0 20px rgba(224, 112, 32, 0.28)'
          }}>
            <img 
              src={logoImg} 
              alt="Logo Polri" 
              style={{ width: '48px', height: '48px', objectFit: 'contain' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div style={{
              position: 'absolute',
              bottom: '-4px',
              right: '-4px',
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #0E0C0A'
            }}>
              <Clock size={14} color="#FF5A1F" />
            </div>
          </div>
        </div>

        <h2 className="heading-font" style={{
          margin: '0 0 4px',
          fontSize: '19px',
          fontWeight: 800,
          letterSpacing: '0.04em',
          color: '#FFFFFF',
          textTransform: 'uppercase'
        }}>
          Verifikasi Kedinasan Menunggu
        </h2>
        <p style={{
          margin: '0 0 20px',
          fontSize: '12.5px',
          color: 'rgba(251, 219, 175, 0.65)',
          letterSpacing: '0.5px'
        }}>
          Satuan Reserse Kriminal Kepolisian Resor Kolaka Timur
        </p>

        {/* Status Banner */}
        <div style={{
          background: 'rgba(224, 112, 32, 0.12)',
          border: '1px solid rgba(255, 90, 31, 0.45)',
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          textAlign: 'left'
        }}>
          <ShieldAlert size={26} color="#FF5A1F" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '13px' }}>
              Status: Menunggu Persetujuan Kasat Reskrim / Super Admin
            </div>
            <div style={{ color: '#FBDBAF', fontSize: '11.5px', marginTop: '3px', lineHeight: 1.4 }}>
              Pendaftaran Anda telah berhasil dicatat. Seluruh modul penyidikan & generator berkas dikunci demi keamanan hingga diverifikasi oleh Kasat Reskrim / Super Admin.
            </div>
          </div>
        </div>

        {/* Officer Card Info */}
        <div style={{
          background: '#161310',
          border: '1px solid rgba(251, 219, 175, 0.14)',
          borderRadius: '14px',
          padding: '16px',
          marginBottom: '24px',
          textAlign: 'left'
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            color: '#FF5A1F',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <User size={13} />
            <span>Identitas Personel Terdaftar</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
            <div>
              <span style={{ color: 'rgba(251, 219, 175, 0.55)', display: 'block', fontSize: '10.5px' }}>Nama Personel:</span>
              <strong style={{ color: '#FFFFFF' }}>{pangkat} {nama}</strong>
            </div>
            <div>
              <span style={{ color: 'rgba(251, 219, 175, 0.55)', display: 'block', fontSize: '10.5px' }}>NRP Kedinasan:</span>
              <span className="mono" style={{ color: '#FF7A33', fontWeight: 600 }}>{nrp}</span>
            </div>
            <div>
              <span style={{ color: 'rgba(251, 219, 175, 0.55)', display: 'block', fontSize: '10.5px' }}>Jabatan & Unit:</span>
              <span style={{ color: '#FBDBAF' }}>{jabatan} {unit && `(${unit})`}</span>
            </div>
            <div>
              <span style={{ color: 'rgba(251, 219, 175, 0.55)', display: 'block', fontSize: '10.5px' }}>Satuan Kerja:</span>
              <span style={{ color: '#FBDBAF' }}>{satker}</span>
            </div>
            <div>
              <span style={{ color: 'rgba(251, 219, 175, 0.55)', display: 'block', fontSize: '10.5px' }}>Email:</span>
              <span style={{ color: '#FBDBAF' }}>{email}</span>
            </div>
            <div>
              <span style={{ color: 'rgba(251, 219, 175, 0.55)', display: 'block', fontSize: '10.5px' }}>No. Handphone / WA:</span>
              <span style={{ color: '#FBDBAF' }}>{phone}</span>
            </div>
          </div>
        </div>

        {/* Status Check Message */}
        {checkMsg && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textAlign: 'left',
            background: checkMsg.type === 'success' ? 'rgba(224, 112, 32, 0.14)' : checkMsg.type === 'error' ? 'rgba(255, 90, 31, 0.18)' : 'rgba(251, 219, 175, 0.1)',
            border: `1px solid ${checkMsg.type === 'success' ? 'rgba(224, 112, 32, 0.5)' : checkMsg.type === 'error' ? '#FF5A1F' : 'rgba(251, 219, 175, 0.35)'}`,
            color: '#FFFFFF'
          }}>
            {checkMsg.type === 'success' ? <CheckCircle2 size={16} color="#FF5A1F" /> : checkMsg.type === 'error' ? <AlertCircle size={16} color="#FF5A1F" /> : <Clock size={16} color="#FBDBAF" />}
            <span>{checkMsg.text}</span>
          </div>
        )}

        {/* Buttons Action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            onClick={handleCheckStatus}
            disabled={checking}
            style={{
              background: '#E07020',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '9999px',
              padding: '12px 20px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: checking ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(0, 212, 255, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            <RefreshCw size={16} className={checking ? 'animate-spin' : ''} />
            <span>{checking ? 'Memeriksa Verifikasi Kedinasan...' : 'Periksa Status Sekarang'}</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#94A3B8',
              borderRadius: '10px',
              padding: '10px 18px',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <LogOut size={14} />
            <span>Keluar / Ganti Akun</span>
          </button>
        </div>

        <div style={{
          marginTop: '24px',
          fontSize: '10.5px',
          color: '#64748B',
          letterSpacing: '0.3px'
        }}>
          Jika membutuhkan verifikasi darurat, silakan konfirmasi langsung kepada Kasat Reskrim atau Kaur Mintu Satreskrim.
        </div>
      </div>
    </div>
  );
}
