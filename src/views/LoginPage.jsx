import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  LogIn, 
  AlertCircle, 
  Radio, 
  ShieldAlert, 
  Sparkles, 
  CheckCircle2, 
  KeyRound,
  UserCheck
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // 1. Official Supabase Auth handler
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

      setStatusMessage('Memeriksa profil dan hak akses personel...');

      // Fetch user profile from public.profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      let finalProfile;
      if (profileError || !profileData) {
        // Auto-create or fallback default profile if not yet initialized in profiles table
        finalProfile = {
          id: user.id,
          email: user.email,
          nama: user.email.includes('kasat') || user.email.includes('super') 
            ? 'AKP AHMAD FATONI, S.H.' 
            : 'BRIPKA DEDI PRASETYO, S.H.',
          pangkat: user.email.includes('kasat') || user.email.includes('super') ? 'AKP' : 'BRIPKA',
          nrp: user.email.includes('kasat') || user.email.includes('super') ? '78120567' : '88110543',
          jabatan: user.email.includes('kasat') || user.email.includes('super') 
            ? 'Kepala Satuan Reserse Kriminal' 
            : 'Penyidik Pembantu Unit 1',
          role: user.email.includes('kasat') || user.email.includes('super') ? 'super_admin' : 'admin'
        };

        // Attempt upsert profile into Supabase
        await supabase.from('profiles').upsert([finalProfile]).catch(() => {});
      } else {
        finalProfile = profileData;
      }

      onLoginSuccess({
        user,
        profile: finalProfile,
        role: finalProfile.role || 'admin'
      });
    } catch (err) {
      console.error('Login error:', err);
      let msg = err.message || 'Gagal login.';
      if (msg.includes('Invalid login credentials')) {
        msg = 'Email atau kata sandi dinas tidak cocok. Pastikan akun telah terdaftar di Supabase Auth atau gunakan Mode Akses Cepat di bawah.';
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // 2. Quick Demo Role Selector (Instant testing without creating auth users)
  const handleQuickLogin = (roleType) => {
    setErrorMessage('');
    if (roleType === 'super_admin') {
      const demoSuperAdmin = {
        id: 'super-admin-001',
        email: 'kasat.reskrim@polri.go.id',
        nama: 'AKP AHMAD FATONI, S.H.',
        pangkat: 'AKP',
        nrp: '78120567',
        jabatan: 'Kepala Satuan Reserse Kriminal (Kasat)',
        role: 'super_admin'
      };
      onLoginSuccess({
        user: { id: demoSuperAdmin.id, email: demoSuperAdmin.email },
        profile: demoSuperAdmin,
        role: 'super_admin'
      });
    } else {
      const demoAdmin = {
        id: 'admin-002',
        email: 'penyidik.pidum@polri.go.id',
        nama: 'BRIPKA DEDI PRASETYO, S.H.',
        pangkat: 'BRIPKA',
        nrp: '88110543',
        jabatan: 'Penyidik Pembantu Satreskrim',
        role: 'admin'
      };
      onLoginSuccess({
        user: { id: demoAdmin.id, email: demoAdmin.email },
        profile: demoAdmin,
        role: 'admin'
      });
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
      {/* Tactical Background Grid & Glows */}
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
        GATEWAY: SUPABASE ENCRYPTED PROD-V1
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
        {/* Header Insignia */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.25) 0%, rgba(59, 130, 246, 0.2) 100%)',
            border: '2px solid var(--accent-cyan)',
            boxShadow: 'var(--glow-cyan-strong)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <ShieldCheck size={36} color="var(--accent-cyan)" />
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

        {/* Form Supabase Auth */}
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
              marginTop: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
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

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          margin: '22px 0 16px',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Akses Cepat (Simulasi Role)
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }} />
        </div>

        {/* Quick Demo Role Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Super Admin Option */}
          <button
            type="button"
            onClick={() => handleQuickLogin('super_admin')}
            className="glass glass-hover"
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(0, 212, 255, 0.4)',
              background: 'linear-gradient(90deg, rgba(0, 212, 255, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              textAlign: 'left',
              transition: 'all var(--transition-fast)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(0, 212, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <ShieldAlert size={18} color="var(--accent-cyan)" />
              </div>
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#FFFFFF' }}>
                  Super Admin (Kasat / KBO Reskrim)
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--accent-cyan)' }}>
                  Akses Penuh: Generator, Berkas, Personel, & Template Studio
                </div>
              </div>
            </div>
            <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
              PILIH
            </span>
          </button>

          {/* Admin / Investigator Option */}
          <button
            type="button"
            onClick={() => handleQuickLogin('admin')}
            className="glass glass-hover"
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(34, 197, 94, 0.4)',
              background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.1) 0%, rgba(13, 21, 38, 0.6) 100%)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              textAlign: 'left',
              transition: 'all var(--transition-fast)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(34, 197, 94, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <UserCheck size={18} color="var(--accent-green)" />
              </div>
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#FFFFFF' }}>
                  Admin (Penyidik / Banum)
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--accent-green)' }}>
                  Akses Terbatas: Generator Mindik & Input LP Baru
                </div>
              </div>
            </div>
            <span className="badge badge-green" style={{ fontSize: '10px' }}>
              PILIH
            </span>
          </button>
        </div>

        {/* Footer Note */}
        <div style={{
          marginTop: '20px',
          textAlign: 'center',
          fontSize: '11px',
          color: 'var(--text-muted)',
          lineHeight: 1.4,
        }}>
          Sistem terhubung langsung ke database cloud Supabase.<br />
          Keamanan data terproteksi Row-Level Security (RLS).
        </div>
      </div>
    </div>
  );
}
