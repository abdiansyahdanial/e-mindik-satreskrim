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
  const pangkat = profile.pangkat || meta.pangkat || '-';
  const nrp = profile.rank_nrp || profile.nrp || meta.nrp || '-';
  const jabatan = profile.jabatan || meta.jabatan || 'Penyidik Pembantu';
  const satker = profile.satker || meta.satker || 'Satreskrim Polres Kolaka Timur';
  const unit = profile.unit || meta.unit || '-';
  const email = user?.email || profile.email || '-';
  const phone = profile.phone || profile.no_hp || meta.phone || meta.no_hp || '-';

  const handleCheckStatus = async () => {
    setChecking(true);
    setCheckMsg(null);
    try {
      if (!user?.id) return;

      // 1. Fetch fresh profile from Supabase
      const { data: freshProf, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      // Also refresh session user metadata
      const { data: { session } } = await supabase.auth.getSession();
      const currentMeta = session?.user?.user_metadata || {};

      const currentStatus = freshProf?.status || currentMeta?.status || (freshProf?.role !== 'pending' && freshProf?.role ? 'active' : 'pending');

      if (currentStatus === 'active' || freshProf?.role === 'admin' || freshProf?.role === 'super_admin' || freshProf?.role === 'anggota') {
        setCheckMsg({ type: 'success', text: 'Selamat! Akun Anda telah disetujui oleh Super Admin. Mengalihkan ke Dashboard...' });
        setTimeout(() => {
          if (onStatusUpdated) onStatusUpdated(freshProf);
        }, 1200);
      } else if (currentStatus === 'rejected') {
        setCheckMsg({ type: 'error', text: 'Pengajuan akun Anda ditolak oleh Super Admin. Silakan hubungi Kasat Reskrim.' });
      } else {
        setCheckMsg({ type: 'info', text: 'Status akun masih MENUNGGU VERIFIKASI Super Admin. Notifikasi persetujuan akan dikirimkan ke email Anda.' });
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
          linear-gradient(to right, rgba(0, 212, 255, 0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0, 212, 255, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      <div style={{
        maxWidth: '560px',
        width: '100%',
        background: 'rgba(13, 21, 38, 0.92)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(0, 212, 255, 0.25)',
        borderRadius: '16px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 212, 255, 0.15)',
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
            background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(245, 158, 11, 0.15))',
            border: '2px solid rgba(245, 158, 11, 0.6)',
            boxShadow: '0 0 20px rgba(245, 158, 11, 0.25)'
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
              background: '#F59E0B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #0D1526'
            }}>
              <Clock size={14} color="#000" />
            </div>
          </div>
        </div>

        <h2 style={{
          margin: '0 0 4px',
          fontSize: '19px',
          fontWeight: 800,
          letterSpacing: '1px',
          color: '#FFFFFF',
          textTransform: 'uppercase'
        }}>
          Verifikasi Kedinasan Menunggu
        </h2>
        <p style={{
          margin: '0 0 20px',
          fontSize: '12.5px',
          color: 'var(--text-secondary, #94A3B8)',
          letterSpacing: '0.5px'
        }}>
          Satuan Reserse Kriminal Kepolisian Resor Kolaka Timur
        </p>

        {/* Status Banner */}
        <div style={{
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '10px',
          padding: '14px 16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          textAlign: 'left'
        }}>
          <ShieldAlert size={26} color="#F59E0B" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ color: '#FCD34D', fontWeight: 700, fontSize: '13px' }}>
              Status Akun: Menunggu Persetujuan Super Admin
            </div>
            <div style={{ color: '#CBD5E1', fontSize: '11.5px', marginTop: '3px', lineHeight: 1.4 }}>
              Pendaftaran Anda telah berhasil dicatat. Seluruh modul penyidikan & generator berkas dikunci demi keamanan hingga diverifikasi oleh Kasat Reskrim / Super Admin.
            </div>
          </div>
        </div>

        {/* Officer Card Info */}
        <div style={{
          background: 'rgba(6, 11, 24, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          textAlign: 'left'
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            color: 'var(--accent-cyan, #00D4FF)',
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
              <span style={{ color: '#64748B', display: 'block', fontSize: '10.5px' }}>Nama Personel:</span>
              <strong style={{ color: '#F8FAFC' }}>{pangkat} {nama}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '10.5px' }}>NRP Kedinasan:</span>
              <span className="mono" style={{ color: 'var(--accent-cyan, #00D4FF)', fontWeight: 600 }}>{nrp}</span>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '10.5px' }}>Jabatan & Unit:</span>
              <span style={{ color: '#CBD5E1' }}>{jabatan} {unit && `(${unit})`}</span>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '10.5px' }}>Satuan Kerja:</span>
              <span style={{ color: '#CBD5E1' }}>{satker}</span>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '10.5px' }}>Email Dinas:</span>
              <span style={{ color: '#CBD5E1' }}>{email}</span>
            </div>
            <div>
              <span style={{ color: '#64748B', display: 'block', fontSize: '10.5px' }}>No. Handphone / WA:</span>
              <span style={{ color: '#CBD5E1' }}>{phone}</span>
            </div>
          </div>
        </div>

        {/* Status Check Message */}
        {checkMsg && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textAlign: 'left',
            background: checkMsg.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : checkMsg.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 212, 255, 0.12)',
            border: `1px solid ${checkMsg.type === 'success' ? 'var(--accent-green, #22C55E)' : checkMsg.type === 'error' ? 'var(--accent-red, #EF4444)' : 'var(--accent-cyan, #00D4FF)'}`,
            color: '#FFFFFF'
          }}>
            {checkMsg.type === 'success' ? <CheckCircle2 size={16} color="#22C55E" /> : checkMsg.type === 'error' ? <AlertCircle size={16} color="#EF4444" /> : <Clock size={16} color="#00D4FF" />}
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
              background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.9) 0%, rgba(0, 150, 255, 0.9) 100%)',
              color: '#030712',
              border: 'none',
              borderRadius: '10px',
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
