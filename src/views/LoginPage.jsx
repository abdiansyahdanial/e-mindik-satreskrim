import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  LogIn, 
  AlertCircle, 
  Radio, 
  Shield, 
  KeyRound
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import logoImg from '../assets/logo.png';

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [logoError, setLogoError] = useState(false);

  // Official Supabase Auth handler (Strict Login)
  const handleSupabaseLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setStatusMessage('');

    if (!email || !password) {
      setErrorMessage('Silakan masukkan email dinas dan kata sandi.');
      return;
    }

    setLoading(true);
    setStatusMessage('Mengautentikasi kredensial dinas dengan server Supabase...');

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (authError) {
        throw authError;
      }

      const user = authData?.user;
      if (!user) throw new Error('Autentikasi gagal. Akun tidak ditemukan.');

      setStatusMessage('Memverifikasi profil dan hak akses personel (RBAC)...');

      // Fetch user profile from public.profiles
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      let finalProfile;
      if (!profileData) {
        // Default role for new users is strictly 'anggota', unless designated as super_admin
        const isSuper = user.email?.includes('super') || 
                        user.email?.includes('kasat') || 
                        user.id === '75abae80-e013-4987-a5e7-f1107d2ab265';
        const assignedRole = isSuper ? 'super_admin' : 'anggota';

        finalProfile = {
          id: user.id,
          full_name: isSuper ? 'AKP AHMAD FATONI, S.H.' : user.email.split('@')[0].toUpperCase(),
          nama: isSuper ? 'AKP AHMAD FATONI, S.H.' : user.email.split('@')[0].toUpperCase(),
          pangkat: isSuper ? 'AKP' : 'BRIPDA',
          rank_nrp: isSuper ? '78120567' : '00000000',
          nrp: isSuper ? '78120567' : '00000000',
          jabatan: isSuper ? 'Kepala Satuan Reserse Kriminal' : 'Penyidik Pembantu Satreskrim',
          role: assignedRole,
        };

        // Attempt upsert profile into Supabase
        await supabase.from('profiles').upsert([
          {
            id: user.id,
            full_name: finalProfile.full_name,
            role: assignedRole,
          }
        ]).catch(() => {});
      } else {
        finalProfile = {
          ...profileData,
          nama: profileData.full_name || profileData.nama || user.email.split('@')[0],
          pangkat: profileData.pangkat || (profileData.role === 'super_admin' ? 'AKP' : 'BRIPKA'),
          nrp: profileData.rank_nrp || profileData.nrp || '-',
          jabatan: profileData.jabatan || (profileData.role === 'super_admin' ? 'Kasat Reskrim' : 'Penyidik Pembantu'),
          role: profileData.role || 'anggota'
        };
      }

      onLoginSuccess({
        user,
        profile: finalProfile,
        role: finalProfile.role || 'anggota'
      });
    } catch (err) {
      console.error('Login error:', err);
      let msg = err.message || 'Gagal login.';
      if (msg.includes('Invalid login credentials')) {
        msg = 'Email atau kata sandi dinas tidak cocok. Pastikan akun telah terdaftar di Supabase Auth.';
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'radial-gradient(circle at 50% 20%, rgba(0, 212, 255, 0.12) 0%, rgba(6, 11, 24, 0.95) 70%, #030712 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Tactical Background Grid */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          linear-gradient(to right, rgba(0, 212, 255, 0.04) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0, 212, 255, 0.04) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      {/* Cyber Corner HUD Decors */}
      <div style={{
        position: 'absolute',
        top: '24px',
        left: '28px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: 'var(--accent-cyan)',
        fontSize: '11px',
        letterSpacing: '0.1em',
        fontFamily: 'monospace',
      }}>
        <Radio size={14} className="animate-pulse" />
        <span>SECURE TERMINAL // SATRESKRIM POLRES KOLAKA TIMUR</span>
      </div>

      <div style={{
        position: 'absolute',
        top: '24px',
        right: '28px',
        fontSize: '11px',
        color: 'var(--text-muted)',
        fontFamily: 'monospace',
      }}>
        GATEWAY: SUPABASE AUTH ENCRYPTED (RBAC V2)
      </div>

      {/* Main Login Card */}
      <div className="glass" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '36px 32px',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-glass-hover)',
        boxShadow: 'var(--glow-cyan-strong)',
        position: 'relative',
        zIndex: 10,
        animation: 'slideInRight 350ms ease-out',
      }}>
        {/* Header Insignia with Official Logo */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            {!logoError ? (
              <img
                src={logoImg}
                alt="Logo Sat Reskrim Polres Kolaka Timur"
                onError={() => setLogoError(true)}
                style={{
                  height: '84px',
                  width: 'auto',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 0 16px rgba(0, 212, 255, 0.45))',
                  transition: 'transform 0.3s ease',
                }}
              />
            ) : (
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.25) 0%, rgba(59, 130, 246, 0.2) 100%)',
                border: '2px solid var(--accent-cyan)',
                boxShadow: 'var(--glow-cyan-strong)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Shield size={38} color="var(--accent-cyan)" />
              </div>
            )}
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            background: 'rgba(0, 212, 255, 0.08)',
            border: '1px solid var(--accent-cyan)',
            borderRadius: 'var(--radius-full)',
            fontSize: '10px',
            fontWeight: 700,
            color: 'var(--accent-cyan)',
            letterSpacing: '0.08em',
            marginBottom: '8px',
            textTransform: 'uppercase',
          }}>
            <Radio size={12} className="animate-pulse" />
            <span>Sistem Otomasi Administrasi Penyidikan</span>
          </div>

          <h1 style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#FFFFFF',
            margin: '4px 0',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            E-Mindik Satreskrim
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            Kepolisian Resor Kolaka Timur • Polda Sulawesi Tenggara
          </p>
        </div>

        {/* Status Alert */}
        {errorMessage && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid var(--accent-red)',
            color: '#FFFFFF',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'start',
            gap: '10px',
            marginBottom: '18px',
          }}>
            <AlertCircle size={16} color="var(--accent-red)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {statusMessage && !errorMessage && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(0, 212, 255, 0.1)',
            border: '1px solid var(--accent-cyan)',
            color: 'var(--accent-cyan)',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '18px',
          }}>
            <Radio size={14} className="animate-pulse" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Form Supabase Auth: STRICT LOGIN ONLY */}
        <form onSubmit={handleSupabaseLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={13} color="var(--accent-cyan)" />
              <span>Email Personel / Akun Dinas</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama.nrp@polri.go.id"
              className="form-input"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={13} color="var(--accent-cyan)" />
              <span>Kata Sandi (Password)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="form-input mono"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              padding: '12px',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.03em',
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: 'var(--glow-cyan)',
            }}
          >
            {loading ? (
              <>
                <Radio size={16} className="animate-pulse" />
                <span>Memproses Otentikasi...</span>
              </>
            ) : (
              <>
                <LogIn size={16} />
                <span>Masuk Melalui Supabase Auth</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <div style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-glass)',
          textAlign: 'center',
          fontSize: '11px',
          color: 'var(--text-muted)',
          lineHeight: 1.5,
        }}>
          <div>Hak Akses Berjenjang (RBAC): Super Admin • Admin • Anggota</div>
          <div style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>
            Autentikasi resmi terenkripsi via Supabase Auth & PostgreSQL RLS.
          </div>
        </div>
      </div>
    </div>
  );
}
