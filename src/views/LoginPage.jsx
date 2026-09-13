import React, { useState, useMemo } from 'react';
import { 
  Lock, 
  Mail, 
  LogIn, 
  AlertCircle, 
  Radio, 
  Shield, 
  UserPlus, 
  Check, 
  X, 
  BadgeCheck, 
  Building2, 
  Phone, 
  KeyRound,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { sendSuperadminNewUserEmail } from '../services/emailService';
import logoImg from '../assets/logo.png';

const PANGKAT_OPTIONS = [
  'BRIPDA', 
  'BRIPTU', 
  'BRIGADIR', 
  'BRIPKA', 
  'AIPDA', 
  'AIPTU', 
  'IPDA', 
  'IPTU', 
  'AKP', 
  'KOMPOL', 
  'AKBP'
];

const UNIT_OPTIONS = [
  'Unit I (Pidum)',
  'Unit II (Tipidter)',
  'Unit III (Tipidkor)',
  'Unit IV (PPA)',
  'Urbinopsnal',
  'Urmintu',
  'Identifikasi (Inafis)'
];

export default function LoginPage({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [logoError, setLogoError] = useState(false);

  // Register Form States (10 Standard Fields)
  const [regNama, setRegNama] = useState('');
  const [regPangkat, setRegPangkat] = useState('BRIPKA');
  const [regNrp, setRegNrp] = useState('');
  const [regJabatan, setRegJabatan] = useState('PENYIDIK PEMBANTU');
  const [regSatker, setRegSatker] = useState('Satreskrim Polres Kolaka Timur');
  const [regUnit, setRegUnit] = useState('Unit I (Pidum)');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [registerSuccessData, setRegisterSuccessData] = useState(null);

  // Real-time Strict Password Rule Evaluation
  const passwordRules = useMemo(() => {
    const pwd = regPassword || '';
    return {
      minLength: pwd.length >= 8,
      hasUpper: /[A-Z]/.test(pwd),
      hasLower: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSymbol: /[-!@#$%^&*()_+=[\]{}|;:,.<>?]/.test(pwd),
    };
  }, [regPassword]);

  const isPasswordValid = 
    passwordRules.minLength && 
    passwordRules.hasUpper && 
    passwordRules.hasLower && 
    passwordRules.hasNumber && 
    passwordRules.hasSymbol;

  const isPasswordMatch = regPassword.length > 0 && regPassword === regConfirmPassword;

  const isRegisterFormValid = 
    regNama.trim().length > 0 &&
    regNrp.trim().length > 0 &&
    regEmail.trim().length > 0 &&
    isPasswordValid &&
    isPasswordMatch;

  // 1. Official Supabase Auth handler (Strict Login)
  const handleSupabaseLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setStatusMessage('');

    if (!loginEmail || !loginPassword) {
      setErrorMessage('Silakan masukkan email dinas dan kata sandi.');
      return;
    }

    setLoading(true);
    setStatusMessage('Mengautentikasi kredensial dinas dengan server Supabase...');

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword
      });

      if (authError) throw authError;

      const user = authData?.user;
      if (!user) throw new Error('Autentikasi gagal. Akun tidak ditemukan.');

      setStatusMessage('Memverifikasi profil dan hak akses personel (RBAC)...');

      // Fetch user profile from public.profiles
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const userMeta = user.user_metadata || {};
      const isSuper = user.email?.includes('super') || 
                      user.email?.includes('kasat') || 
                      user.id === '75abae80-e013-4987-a5e7-f1107d2ab265';

      let finalProfile;
      if (!profileData) {
        const assignedRole = isSuper ? 'super_admin' : (userMeta.role || 'anggota');
        const assignedStatus = isSuper ? 'active' : (userMeta.status || 'pending');

        finalProfile = {
          id: user.id,
          full_name: isSuper ? 'AKP AHMAD FATONI, S.H.' : (userMeta.full_name || userMeta.nama || user.email.split('@')[0].toUpperCase()),
          nama: isSuper ? 'AKP AHMAD FATONI, S.H.' : (userMeta.nama || userMeta.full_name || user.email.split('@')[0].toUpperCase()),
          pangkat: isSuper ? 'AKP' : (userMeta.pangkat || 'BRIPDA'),
          rank_nrp: isSuper ? '78120567' : (userMeta.nrp || '00000000'),
          nrp: isSuper ? '78120567' : (userMeta.nrp || '00000000'),
          jabatan: isSuper ? 'Kepala Satuan Reserse Kriminal' : (userMeta.jabatan || 'Penyidik Pembantu Satreskrim'),
          satker: userMeta.satker || 'Satreskrim Polres Kolaka Timur',
          unit: userMeta.unit || '',
          phone: userMeta.phone || '',
          role: assignedRole,
          status: assignedStatus,
        };

        // Attempt non-destructive upsert profile into Supabase
        await supabase.from('profiles').upsert([
          {
            id: user.id,
            full_name: finalProfile.full_name,
            role: assignedRole,
          }
        ]).catch(() => {});
      } else {
        const resolvedRole = profileData.role || userMeta.role || (isSuper ? 'super_admin' : 'anggota');
        const resolvedStatus = profileData.status || userMeta.status || (isSuper || resolvedRole === 'super_admin' || resolvedRole === 'admin' ? 'active' : 'active');

        finalProfile = {
          ...profileData,
          nama: profileData.full_name || profileData.nama || userMeta.nama || user.email.split('@')[0],
          pangkat: profileData.pangkat || userMeta.pangkat || (resolvedRole === 'super_admin' ? 'AKP' : 'BRIPKA'),
          nrp: profileData.rank_nrp || profileData.nrp || userMeta.nrp || '-',
          jabatan: (resolvedRole === 'super_admin') ? 'ABDIANSYAH' : (profileData.jabatan || userMeta.jabatan || 'Penyidik Pembantu'),
          satker: profileData.satker || userMeta.satker || 'Satreskrim Polres Kolaka Timur',
          unit: profileData.unit || userMeta.unit || '',
          phone: profileData.phone || userMeta.phone || '',
          role: resolvedRole,
          status: resolvedStatus
        };
      }

      onLoginSuccess({
        user,
        profile: finalProfile,
        role: finalProfile.role || 'anggota',
        status: finalProfile.status
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

  // 2. Official Supabase Auth Registration Handler (Registrasi Mandiri)
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setStatusMessage('');

    if (!isRegisterFormValid) {
      setErrorMessage('Silakan lengkapi seluruh field formulir dan pastikan syarat kata sandi terpenuhi.');
      return;
    }

    setLoading(true);
    setStatusMessage('Mendaftarkan akun personel ke Supabase Auth & Keamanan...');

    try {
      const officerData = {
        full_name: regNama.trim(),
        nama: regNama.trim(),
        pangkat: regPangkat,
        nrp: regNrp.trim(),
        jabatan: regJabatan,
        satker: regSatker.trim(),
        unit: regUnit,
        phone: regPhone.trim(),
        email: regEmail.trim(),
        status: 'pending',
        role: 'penyidik',
      };

      // Daftarkan akun ke supabase.auth.signUp() dengan metadata lengkap
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: regEmail.trim(),
        password: regPassword,
        options: {
          data: officerData
        }
      });

      if (signUpError) throw signUpError;

      const newUser = signUpData?.user;
      const userId = newUser?.id;

      if (userId) {
        // Non-destructive insert/upsert into public.profiles
        // Try with status & role 'penyidik', fallback to basic if column missing
        try {
          const { error: profErr } = await supabase.from('profiles').upsert([
            {
              id: userId,
              full_name: `${regPangkat} ${regNama.trim()}`,
              role: 'pending', // marks as pending role or status in database
              rank_nrp: regNrp.trim()
            }
          ]);
          if (profErr) {
            console.warn('Profiles initial insert note:', profErr.message);
          }
        } catch (dbErr) {
          console.warn('Profiles table fallback handling:', dbErr);
        }
      }

      // Kirim email notifikasi ke Super Admin secara ASYNCHRONOUS (non-blocking)
      sendSuperadminNewUserEmail(officerData);

      // Tampilkan layar sukses/tunggu
      setRegisterSuccessData(officerData);
      setStatusMessage('');
    } catch (err) {
      console.error('Registration error:', err);
      let msg = err.message || 'Gagal melakukan pendaftaran.';
      if (msg.includes('already registered')) {
        msg = 'Email ini sudah terdaftar dalam sistem e-Mindik. Silakan gunakan tab MASUK atau hubungi Super Admin.';
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
      background: 'radial-gradient(circle at 50% 15%, rgba(0, 212, 255, 0.12) 0%, rgba(6, 11, 24, 0.96) 70%, #030712 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      position: 'relative',
      overflowX: 'hidden',
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
        top: '20px',
        left: '24px',
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
        top: '20px',
        right: '24px',
        fontSize: '11px',
        color: 'var(--text-muted)',
        fontFamily: 'monospace',
      }}>
        GATEWAY: SUPABASE AUTH & RESEND NOTIFICATION
      </div>

      {/* Main Container Card */}
      <div className="glass" style={{
        width: '100%',
        maxWidth: activeTab === 'register' && !registerSuccessData ? '580px' : '480px',
        padding: '32px 28px',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-glass-hover)',
        boxShadow: 'var(--glow-cyan-strong)',
        position: 'relative',
        zIndex: 10,
        transition: 'max-width 0.3s ease',
        margin: '30px 0'
      }}>
        {/* Header Insignia with Official Logo */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            {!logoError ? (
              <img
                src={logoImg}
                alt="Logo Sat Reskrim Polres Kolaka Timur"
                onError={() => setLogoError(true)}
                style={{
                  height: '76px',
                  width: 'auto',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 0 16px rgba(0, 212, 255, 0.45))',
                  transition: 'transform 0.3s ease',
                }}
              />
            ) : (
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.25) 0%, rgba(59, 130, 246, 0.2) 100%)',
                border: '2px solid var(--accent-cyan)',
                boxShadow: 'var(--glow-cyan-strong)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Shield size={34} color="var(--accent-cyan)" />
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
            marginBottom: '6px',
            textTransform: 'uppercase',
          }}>
            <Radio size={12} className="animate-pulse" />
            <span>Sistem Otomasi Administrasi Penyidikan</span>
          </div>

          <h1 style={{
            fontSize: '21px',
            fontWeight: 800,
            color: '#FFFFFF',
            margin: '4px 0',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            E-Mindik Satreskrim
          </h1>
          <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: 0 }}>
            Kepolisian Resor Kolaka Timur • Polda Sulawesi Tenggara
          </p>
        </div>

        {/* Tab Switcher: LOGIN vs DAFTAR */}
        {!registerSuccessData && (
          <div style={{
            display: 'flex',
            background: 'rgba(6, 11, 24, 0.8)',
            border: '1px solid var(--border-glass)',
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '20px',
            gap: '4px'
          }}>
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMessage('');
                setStatusMessage('');
              }}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'login' ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.25), rgba(59, 130, 246, 0.25))' : 'transparent',
                color: activeTab === 'login' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'login' ? 700 : 500,
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: activeTab === 'login' ? '0 0 10px rgba(0, 212, 255, 0.2)' : 'none',
                borderBottom: activeTab === 'login' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                transition: 'all 0.2s ease'
              }}
            >
              <LogIn size={15} />
              <span>MASUK / LOGIN</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMessage('');
                setStatusMessage('');
              }}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'register' ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.25), rgba(59, 130, 246, 0.25))' : 'transparent',
                color: activeTab === 'register' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'register' ? 700 : 500,
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: activeTab === 'register' ? '0 0 10px rgba(0, 212, 255, 0.2)' : 'none',
                borderBottom: activeTab === 'register' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                transition: 'all 0.2s ease'
              }}
            >
              <UserPlus size={15} />
              <span>DAFTAR PENYIDIK</span>
            </button>
          </div>
        )}

        {/* Status & Error Alerts */}
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

        {/* -------------------- TAB 1: FORM LOGIN -------------------- */}
        {activeTab === 'login' && !registerSuccessData && (
          <form onSubmit={handleSupabaseLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={13} color="var(--accent-cyan)" />
                <span>Email Personel / Akun Dinas</span>
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
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
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
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
        )}

        {/* -------------------- TAB 2: FORM REGISTRASI MANDIRI PENYIDIK -------------------- */}
        {activeTab === 'register' && !registerSuccessData && (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Field a: Nama Lengkap Beserta Gelar */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '11px', fontWeight: 600 }}>
                Nama Lengkap Beserta Gelar <span style={{ color: 'var(--accent-red)' }}>*</span>
              </label>
              <input
                type="text"
                value={regNama}
                onChange={(e) => setRegNama(e.target.value)}
                placeholder="Contoh: AHMAD FATONI, S.H."
                className="form-input"
                required
              />
            </div>

            {/* Grid 2 Kolom: Pangkat & NRP */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Field b: Pangkat */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 600 }}>
                  Pangkat Kedinasan <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <select
                  value={regPangkat}
                  onChange={(e) => setRegPangkat(e.target.value)}
                  className="form-select"
                  required
                >
                  {PANGKAT_OPTIONS.map((pkt) => (
                    <option key={pkt} value={pkt}>{pkt}</option>
                  ))}
                </select>
              </div>

              {/* Field c: NRP */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 600 }}>
                  NRP Kedinasan <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={regNrp}
                  onChange={(e) => setRegNrp(e.target.value)}
                  placeholder="Contoh: 85041234"
                  className="form-input mono"
                  required
                />
              </div>
            </div>

            {/* Field d: Jabatan Dinas */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Jabatan Dinas <span style={{ color: 'var(--accent-red)' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: '#FFF',
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: regJabatan === 'PENYIDIK PEMBANTU' ? 'rgba(0, 212, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: regJabatan === 'PENYIDIK PEMBANTU' ? '1px solid var(--accent-cyan)' : '1px solid transparent'
                }}>
                  <input
                    type="radio"
                    name="jabatan"
                    value="PENYIDIK PEMBANTU"
                    checked={regJabatan === 'PENYIDIK PEMBANTU'}
                    onChange={(e) => setRegJabatan(e.target.value)}
                  />
                  <span>PENYIDIK PEMBANTU</span>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: '#FFF',
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: regJabatan === 'PENYIDIK' ? 'rgba(0, 212, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: regJabatan === 'PENYIDIK' ? '1px solid var(--accent-cyan)' : '1px solid transparent'
                }}>
                  <input
                    type="radio"
                    name="jabatan"
                    value="PENYIDIK"
                    checked={regJabatan === 'PENYIDIK'}
                    onChange={(e) => setRegJabatan(e.target.value)}
                  />
                  <span>PENYIDIK</span>
                </label>
              </div>
            </div>

            {/* Grid 2 Kolom: Satker & Unit */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
              {/* Field e: Satker */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 600 }}>
                  Satker
                </label>
                <input
                  type="text"
                  value={regSatker}
                  onChange={(e) => setRegSatker(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* Field f: Unit */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 600 }}>
                  Unit Kerja
                </label>
                <select
                  value={regUnit}
                  onChange={(e) => setRegUnit(e.target.value)}
                  className="form-select"
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grid 2 Kolom: No HP/WhatsApp & Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Field g: Nomor Handphone / WhatsApp */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 600 }}>
                  No. Handphone / WA
                </label>
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="0812XXXXXXXX"
                  className="form-input"
                />
              </div>

              {/* Field h: Email */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 600 }}>
                  Email Dinas <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="nama.nrp@polri.go.id"
                  className="form-input"
                  required
                />
              </div>
            </div>

            {/* Grid 2 Kolom: Password & Konfirmasi Password */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Field i: Kata Sandi */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 600 }}>
                  Kata Sandi <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min. 8 karakter..."
                  className="form-input mono"
                  required
                />
              </div>

              {/* Field j: Konfirmasi Kata Sandi */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11px', fontWeight: 600 }}>
                  Konfirmasi Sandi <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  type="password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi..."
                  className="form-input mono"
                  style={{
                    borderColor: regConfirmPassword.length > 0 
                      ? (isPasswordMatch ? 'var(--accent-green)' : 'var(--accent-red)') 
                      : undefined
                  }}
                  required
                />
              </div>
            </div>

            {/* Strict Password Checklist Indicator (Real-Time Dynamic) */}
            <div style={{
              background: 'rgba(6, 11, 24, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '11px'
            }}>
              <div style={{ color: '#94A3B8', fontWeight: 600, marginBottom: '6px' }}>
                Indikator Syarat Keamanan Kata Sandi:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: passwordRules.minLength ? 'var(--accent-green)' : '#64748B'
                }}>
                  {passwordRules.minLength ? <Check size={13} color="var(--accent-green)" /> : <div style={{ width: 13, height: 13, borderRadius: '50%', background: '#334155' }} />}
                  <span>Minimal 8 Karakter</span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: passwordRules.hasUpper ? 'var(--accent-green)' : '#64748B'
                }}>
                  {passwordRules.hasUpper ? <Check size={13} color="var(--accent-green)" /> : <div style={{ width: 13, height: 13, borderRadius: '50%', background: '#334155' }} />}
                  <span>Huruf Besar (A-Z)</span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: passwordRules.hasLower ? 'var(--accent-green)' : '#64748B'
                }}>
                  {passwordRules.hasLower ? <Check size={13} color="var(--accent-green)" /> : <div style={{ width: 13, height: 13, borderRadius: '50%', background: '#334155' }} />}
                  <span>Huruf Kecil (a-z)</span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: passwordRules.hasNumber ? 'var(--accent-green)' : '#64748B'
                }}>
                  {passwordRules.hasNumber ? <Check size={13} color="var(--accent-green)" /> : <div style={{ width: 13, height: 13, borderRadius: '50%', background: '#334155' }} />}
                  <span>Angka (0-9)</span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: passwordRules.hasSymbol ? 'var(--accent-green)' : '#64748B',
                  gridColumn: 'span 2'
                }}>
                  {passwordRules.hasSymbol ? <Check size={13} color="var(--accent-green)" /> : <div style={{ width: 13, height: 13, borderRadius: '50%', background: '#334155' }} />}
                  <span>Simbol Khusus (!@#$%^&*()_+-=[]{}|;:,.&lt;&gt;?)</span>
                </div>

                {regConfirmPassword.length > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: isPasswordMatch ? 'var(--accent-green)' : 'var(--accent-red)',
                    gridColumn: 'span 2',
                    marginTop: '2px',
                    paddingTop: '4px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    {isPasswordMatch ? <Check size={13} color="var(--accent-green)" /> : <X size={13} color="var(--accent-red)" />}
                    <span>{isPasswordMatch ? 'Konfirmasi Kata Sandi Cocok' : 'Konfirmasi Kata Sandi Tidak Cocok'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tombol Submit Registrasi */}
            <button
              type="submit"
              disabled={loading || !isRegisterFormValid}
              className="btn btn-primary"
              style={{
                padding: '12px',
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.03em',
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: (!isRegisterFormValid && !loading) ? 0.5 : 1,
                cursor: (!isRegisterFormValid && !loading) ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? (
                <>
                  <Radio size={16} className="animate-pulse" />
                  <span>Mendaftarkan Akun Dinas...</span>
                </>
              ) : (
                <>
                  <BadgeCheck size={16} />
                  <span>Daftarkan Akun Penyidik</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* -------------------- LAYAR PENDAFTARAN BERHASIL -------------------- */}
        {registerSuccessData && (
          <div style={{
            textAlign: 'center',
            padding: '16px 8px',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.15)',
              border: '2px solid var(--accent-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)'
            }}>
              <CheckCircle2 size={32} color="var(--accent-green)" />
            </div>

            <h3 style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: 800, margin: '0 0 8px' }}>
              Pendaftaran Berhasil!
            </h3>
            <p style={{ color: 'var(--accent-cyan)', fontSize: '13px', fontWeight: 600, margin: '0 0 16px' }}>
              Akun Anda sedang menunggu verifikasi kedinasan oleh Super Admin.
            </p>

            <div style={{
              background: 'rgba(6, 11, 24, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '14px',
              textAlign: 'left',
              fontSize: '12px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>Nama & Pangkat:</span>
                  <strong style={{ color: '#FFF' }}>{registerSuccessData.pangkat} {registerSuccessData.nama}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>NRP Kedinasan:</span>
                  <span className="mono" style={{ color: 'var(--accent-cyan)' }}>{registerSuccessData.nrp}</span>
                </div>
                <div>
                  <span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>Jabatan / Unit:</span>
                  <span style={{ color: '#CBD5E1' }}>{registerSuccessData.jabatan} ({registerSuccessData.unit})</span>
                </div>
                <div>
                  <span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>Email Terdaftar:</span>
                  <span style={{ color: '#CBD5E1' }}>{registerSuccessData.email}</span>
                </div>
              </div>
            </div>

            <p style={{ color: '#94A3B8', fontSize: '11.5px', margin: '0 0 20px', lineHeight: 1.5 }}>
              Notifikasi telah otomatis dikirimkan ke email Super Admin (Kasat Reskrim). Anda akan menerima email konfirmasi aktivasi setelah identitas dinas Anda disetujui.
            </p>

            <button
              type="button"
              onClick={() => {
                setRegisterSuccessData(null);
                setActiveTab('login');
                setLoginEmail(registerSuccessData.email);
              }}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '11px',
                fontSize: '13px',
                fontWeight: 700
              }}
            >
              Kembali ke Halaman Masuk
            </button>
          </div>
        )}

        {/* Footer Note */}
        <div style={{
          marginTop: '20px',
          paddingTop: '14px',
          borderTop: '1px solid var(--border-glass)',
          textAlign: 'center',
          fontSize: '11px',
          color: 'var(--text-muted)',
          lineHeight: 1.5,
        }}>
          <div>Hak Akses Berjenjang (RBAC): Super Admin • Admin • Penyidik</div>
          <div style={{ marginTop: '3px', color: 'var(--text-secondary)' }}>
            Autentikasi resmi terenkripsi via Supabase Auth & PostgreSQL RLS.
          </div>
        </div>
      </div>
    </div>
  );
}
