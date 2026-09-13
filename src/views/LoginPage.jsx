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
import { sendRegistrationEmails } from '../services/emailService';
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

const cleanOfficerName = (nama) => {
  if (!nama) return '';
  return String(nama)
    .replace(/^(AKBP|KOMPOL|AKP|IPTU|IPDA|AIPTU|AIPDA|BRIPKA|BRIGPOL|BRIGADIR|BRIPTU|BRIPDA)\s+/i, '')
    .trim();
};

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
  const [regPangkat, setRegPangkat] = useState('BRIPDA');
  const [regNrp, setRegNrp] = useState('');
  const [regJabatan, setRegJabatan] = useState('PENYIDIK PEMBANTU');
  const [regSatker, setRegSatker] = useState('Satreskrim Polres Kolaka Timur');
  const [regUnit, setRegUnit] = useState('Unit I (Pidum)');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
          email: user.email,
          full_name: userMeta.full_name || userMeta.nama || (isSuper ? 'Super Admin Satreskrim' : user.email.split('@')[0].toUpperCase()),
          nama: userMeta.nama || userMeta.full_name || (isSuper ? 'Super Admin Satreskrim' : user.email.split('@')[0].toUpperCase()),
          pangkat: userMeta.pangkat || (isSuper ? 'POLRI' : '-'),
          rank_nrp: userMeta.nrp || '-',
          nrp: userMeta.nrp || '-',
          jabatan: isSuper ? 'Super Admin Satreskrim' : (userMeta.jabatan || 'Penyidik Pembantu Satreskrim'),
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
            email: user.email,
            full_name: finalProfile.full_name,
            role: assignedRole,
            status: assignedStatus
          }
        ]).catch(() => {});
      } else {
        const isApproved = isSuper || profileData.status === 'active';
        const resolvedRole = isSuper ? 'super_admin' : (profileData.role || 'anggota');
        const resolvedStatus = isApproved ? 'active' : (profileData.status || 'pending');

        finalProfile = {
          ...profileData,
          id: user.id,
          email: user.email,
          nama: profileData.full_name || profileData.nama || userMeta.nama || user.email.split('@')[0],
          pangkat: profileData.pangkat || userMeta.pangkat || (isSuper ? 'POLRI' : '-'),
          nrp: profileData.rank_nrp || profileData.nrp || userMeta.nrp || '-',
          jabatan: isSuper ? 'Super Admin Satreskrim' : (profileData.jabatan || userMeta.jabatan || 'Penyidik Pembantu'),
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
      const cleanNama = cleanOfficerName(regNama.trim());
      const cleanNrp = regNrp.trim();

      const officerData = {
        full_name: `${regPangkat} ${cleanNama}`,
        nama: cleanNama,
        pangkat: regPangkat,
        rank: regPangkat,
        nrp: cleanNrp,
        rank_nrp: cleanNrp,
        jabatan: regJabatan,
        satker: regSatker.trim(),
        unit: regUnit,
        phone: regPhone.trim(),
        email: regEmail.trim(),
        status: 'pending',
        role: 'anggota',
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
        // Simpan data registrasi ke public.profiles dengan status: 'pending' dan role: 'anggota'
        // Schema public.profiles: (id, full_name, rank_nrp, role, created_at, email, status, position, phone, unit)
        try {
          const { error: profErr } = await supabase.from('profiles').upsert([
            {
              id: userId,
              email: regEmail.trim(),
              full_name: `${regPangkat} ${cleanNama}`,
              rank_nrp: cleanNrp,
              position: regJabatan,
              unit: regUnit,
              phone: regPhone.trim(),
              role: 'anggota',
              status: 'pending'
            }
          ]);
          if (profErr) {
            console.warn('Profiles initial insert note, trying fallback:', profErr.message);
            await supabase.from('profiles').upsert([
              {
                id: userId,
                email: regEmail.trim(),
                full_name: `${regPangkat} ${cleanNama}`,
                rank_nrp: cleanNrp,
                role: 'anggota',
                status: 'pending'
              }
            ]);
          }
        } catch (dbErr) {
          console.warn('Profiles table fallback handling:', dbErr);
        }
      }

      // Segera panggil signOut() di latar belakang agar sesi tidak langsung aktif ke dashboard
      try {
        await supabase.auth.signOut();
      } catch (soErr) {
        console.warn('Signout after signup notice:', soErr);
      }

      // Kirim email notifikasi kedinasan secara ASYNCHRONOUS
      sendRegistrationEmails(officerData);

      const savedEmail = regEmail.trim();

      // Tampilkan notifikasi/modal sukses yang elegan (nuansa dark navy & gold Presisi)
      setShowSuccessModal(true);
      setStatusMessage('');

      // Tampilan bertahan selama 2 detik dengan countdown bar, lalu otomatis alihkan ke Login
      setTimeout(() => {
        setShowSuccessModal(false);
        setActiveTab('login');
        setLoginEmail(savedEmail);
        setLoginPassword('');
        setRegNama('');
        setRegNrp('');
        setRegPhone('');
        setRegEmail('');
        setRegPassword('');
        setRegConfirmPassword('');
      }, 2000);
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
      <style>{`
        @keyframes countdown2s {
          from { width: 100%; }
          to { width: 0%; }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
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
                placeholder="Masukkan alamat email aktif / terdaftar"
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
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Field a: Nama Lengkap Beserta Gelar */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '11px', fontWeight: 600 }}>
                Nama Lengkap (tanpa pangkat/gelar di awal, contoh: GABRIEL BAYU KURNIAWAN, S.H.) <span style={{ color: 'var(--accent-red)' }}>*</span>
              </label>
              <input
                type="text"
                value={regNama}
                onChange={(e) => setRegNama(e.target.value)}
                placeholder="Contoh: GABRIEL BAYU KURNIAWAN, S.H."
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
                  Email <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="Masukkan alamat email aktif"
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

        {/* -------------------- MODAL SUKSES PENDAFTARAN PERSONEL (DARK NAVY & GOLD PRESISI) -------------------- */}
        {showSuccessModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(3, 7, 18, 0.88)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px'
          }}>
            <div style={{
              background: 'linear-gradient(145deg, #0B1220 0%, #060B18 100%)',
              border: '1px solid #F59E0B',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '28px 24px 22px',
              boxShadow: '0 0 35px rgba(245, 158, 11, 0.25), 0 20px 40px rgba(0, 0, 0, 0.8)',
              textAlign: 'center',
              position: 'relative',
              animation: 'fadeInScale 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
              {/* Icon with Gold Glow */}
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '2px solid #F59E0B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 0 20px rgba(245, 158, 11, 0.35)'
              }}>
                <CheckCircle2 size={34} color="#FCD34D" />
              </div>

              <h3 style={{
                color: '#FFFFFF',
                fontSize: '18px',
                fontWeight: 800,
                margin: '0 0 10px',
                letterSpacing: '0.3px',
                lineHeight: 1.3
              }}>
                Pendaftaran Personel Berhasil Dikirim
              </h3>

              <p style={{
                color: '#CBD5E1',
                fontSize: '13px',
                lineHeight: 1.6,
                margin: '0 0 20px'
              }}>
                Permohonan akses kedinasan Anda telah diterima oleh sistem. Mohon menunggu proses verifikasi dan aktivasi akun oleh Administrator Satreskrim.
              </p>

              {/* Countdown Progress Bar (2 Detik) */}
              <div style={{
                width: '100%',
                height: '4px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '2px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #F59E0B, #FCD34D)',
                  width: '100%',
                  animation: 'countdown2s 2s linear forwards'
                }} />
              </div>

              <div style={{
                marginTop: '10px',
                fontSize: '11px',
                color: '#94A3B8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}>
                <Clock size={12} color="#F59E0B" />
                <span>Mengalihkan ke halaman masuk dalam 2 detik...</span>
              </div>
            </div>
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
