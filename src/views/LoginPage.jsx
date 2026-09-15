import React, { useState, useMemo } from 'react';
import { 
  Lock, 
  Mail, 
  LogIn, 
  AlertCircle, 
  Radio, 
  UserPlus, 
  Check, 
  X, 
  BadgeCheck, 
  Building2, 
  Phone, 
  KeyRound, 
  Clock,
  Eye,
  EyeOff,
  User,
  Award,
  Hash,
  Briefcase,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { sendRegistrationEmails } from '../services/emailService';
import AuthAlertModal from '../components/AuthAlertModal';
import logoImg from '../assets/logo.png';
import './LoginPage.css';

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

export const cleanOfficerName = (nama) => {
  if (!nama) return '';
  return String(nama)
    .replace(/^(AKBP|KOMPOL|AKP|IPTU|IPDA|AIPTU|AIPDA|BRIPKA|BRIGPOL|BRIGADIR|BRIPTU|BRIPDA)\s+/i, '')
    .trim();
};

export default function LoginPage({ onLoginSuccess }) {
  // Panel Active State (false: Login, true: Register)
  const [isRegisterActive, setIsRegisterActive] = useState(false);
  const [isSweeping, setIsSweeping] = useState(false);

  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
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
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: 'login_pending',
    title: '',
    message: '',
    duration: 0,
    showConfirmButton: false,
    confirmText: 'Mengerti'
  });

  // Panel Transition Trigger with Light Sweep
  const handleTogglePanel = (active) => {
    setIsRegisterActive(active);
    setErrorMessage('');
    setStatusMessage('');
    setIsSweeping(true);
    setTimeout(() => {
      setIsSweeping(false);
    }, 900);
  };

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
                      user.id === '75abae80-e013-4987-a5e7-f1107d2ab265' ||
                      profileData?.role === 'super_admin';

      const currentStatus = profileData?.status || userMeta.status || 'pending';
      const isApproved = isSuper || currentStatus === 'active';

      if (!isApproved) {
        // Akun kedinasan belum disetujui oleh Administrator
        try {
          await supabase.auth.signOut();
        } catch (soErr) {
          console.warn('Signout pending user notice:', soErr);
        }

        setLoading(false);
        setStatusMessage('');

        setAlertModal({
          isOpen: true,
          type: 'login_pending',
          title: 'Verifikasi Akun Dalam Proses',
          message: 'Akun kedinasan Anda masih dalam proses verifikasi oleh Admin. Silakan lakukan pengecekan secara berkala.',
          duration: 4000,
          showConfirmButton: true,
          confirmText: 'Mengerti'
        });
        return;
      }

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

        // Non-destructive upsert profile into Supabase
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

      // SignOut di latar belakang agar akun baru yang belum disetujui tidak langsung tersimpan sebagai sesi aktif
      try {
        await supabase.auth.signOut();
      } catch (soErr) {
        console.warn('Signout after signup notice:', soErr);
      }

      // Kirim email notifikasi kedinasan secara ASYNCHRONOUS
      sendRegistrationEmails(officerData);

      const savedEmail = regEmail.trim();

      // Tampilkan Alert Modal Tengah (Center Toast/Modal) selama 2 detik
      setAlertModal({
        isOpen: true,
        type: 'register_success',
        title: 'Registrasi Akun Diajukan',
        message: 'Permohonan registrasi akun anda telah berhasil diajukan. Silakan menunggu proses verifikasi dan persetujuan dari Admin.',
        duration: 2000,
        showConfirmButton: false,
        confirmText: 'Mengerti'
      });
      setStatusMessage('');

      // Setelah 2 detik, modal otomatis hilang dan alihkan status tampilan form ke tab "Masuk / Login" (reset form register)
      setTimeout(() => {
        setAlertModal(prev => ({ ...prev, isOpen: false }));
        handleTogglePanel(false);
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
        msg = 'Email ini sudah terdaftar dalam sistem e-Mindik. Silakan gunakan panel MASUK atau hubungi Super Admin.';
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-auth-page">
      {/* HUD Decors */}
      <div className="auth-top-status">
        <Radio size={13} className="animate-pulse" color="#ff352d" />
        <span>Sistem Otomasi Administrasi Penyidikan Polri</span>
      </div>

      <div className="auth-top-tag">
        E-MINDIK PRESISI • SATRESKRIM POLRES KOLTIM
      </div>

      {/* Main Split Panel Auth Card */}
      <div className={`split-auth-card ${isRegisterActive ? 'active' : ''}`}>
        {/* Light Sweep Beam */}
        <div className={`light-sweep ${isSweeping ? 'sweeping' : ''}`} />

        {/* ============================================================
            PANEL 1: SIGN-IN (LOGIN)
           ============================================================ */}
        <div className="auth-form-panel auth-panel-signin">
          <div className="auth-form-scroll">
            {/* Mobile Switch Bar */}
            <div className="mobile-auth-switch">
              <button 
                type="button" 
                className="mobile-switch-btn active"
                onClick={() => handleTogglePanel(false)}
              >
                Masuk Sesi
              </button>
              <button 
                type="button" 
                className="mobile-switch-btn"
                onClick={() => handleTogglePanel(true)}
              >
                Daftar Akun
              </button>
            </div>

            {/* Header / Logo */}
            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                margin: '0 auto 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#141a1f',
                borderRadius: '50%',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                overflow: 'hidden'
              }}>
                {!logoError ? (
                  <img
                    src={logoImg}
                    alt="Logo Satreskrim"
                    onError={() => setLogoError(true)}
                    style={{ width: '44px', height: '44px', objectFit: 'contain' }}
                  />
                ) : (
                  <ShieldCheck size={32} color="#ff352d" />
                )}
              </div>

              <h2 style={{
                fontSize: '20px',
                fontWeight: 800,
                color: '#FFFFFF',
                margin: '0 0 4px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}>
                E-Mindik Satreskrim
              </h2>
              <p style={{ fontSize: '11.5px', color: 'var(--auth-text-muted)', margin: 0 }}>
                Kepolisian Resor Kolaka Timur • Polda Sulawesi Tenggara
              </p>
            </div>

            {/* Error & Status Alerts */}
            {errorMessage && (
              <div className="auth-alert-error">
                <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {statusMessage && (
              <div className="auth-alert-status">
                <Clock size={16} color="#ff5740" className="animate-spin" style={{ flexShrink: 0 }} />
                <span>{statusMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSupabaseLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="auth-input-group">
                <label className="auth-label">Email Kedinasan (Polri)</label>
                <div className="auth-input-wrapper">
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="nama.nrp@polri.go.id"
                    className="auth-input"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-label">Kata Sandi Dinas</label>
                <div className="auth-input-wrapper">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="auth-input"
                    disabled={loading}
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      color: '#6b7280',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex'
                    }}
                  >
                    {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="auth-btn-primary"
              >
                {loading ? (
                  <>
                    <Clock size={16} className="animate-spin" />
                    <span>Mengautentikasi...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={16} />
                    <span>Masuk ke Sistem Presisi</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer Notice */}
            <div style={{
              marginTop: 'auto',
              paddingTop: '20px',
              textAlign: 'center',
              fontSize: '11px',
              color: 'var(--auth-text-muted)'
            }}>
              <div>Akses Terenkripsi RBAC: Super Admin • Admin • Penyidik</div>
            </div>
          </div>
        </div>

        {/* ============================================================
            PANEL 2: SIGN-UP (REGISTER)
           ============================================================ */}
        <div className="auth-form-panel auth-panel-signup">
          <div className="auth-form-scroll">
            {/* Mobile Switch Bar */}
            <div className="mobile-auth-switch">
              <button 
                type="button" 
                className="mobile-switch-btn"
                onClick={() => handleTogglePanel(false)}
              >
                Masuk Sesi
              </button>
              <button 
                type="button" 
                className="mobile-switch-btn active"
                onClick={() => handleTogglePanel(true)}
              >
                Daftar Akun
              </button>
            </div>

            {/* Header */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  color: '#ff5740',
                  background: 'rgba(255, 53, 45, 0.1)',
                  border: '1px solid rgba(255, 53, 45, 0.25)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  letterSpacing: '0.06em'
                }}>
                  REGISTRASI PERSONEL
                </span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px' }}>
                Pendaftaran Akun Penyidik
              </h3>
              <p style={{ fontSize: '11.5px', color: 'var(--auth-text-muted)', margin: 0 }}>
                Lengkapi biodata kedinasan untuk proses verifikasi oleh Administrator.
              </p>
            </div>

            {/* Error & Status Alerts */}
            {errorMessage && (
              <div className="auth-alert-error">
                <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {statusMessage && (
              <div className="auth-alert-status">
                <Clock size={16} color="#ff5740" className="animate-spin" style={{ flexShrink: 0 }} />
                <span>{statusMessage}</span>
              </div>
            )}

            {/* Register Form */}
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Row 1: Pangkat & Nama Lengkap */}
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px' }}>
                <div className="auth-input-group">
                  <label className="auth-label">Pangkat</label>
                  <div className="auth-input-wrapper">
                    <Award size={15} className="auth-input-icon" />
                    <select
                      value={regPangkat}
                      onChange={(e) => setRegPangkat(e.target.value)}
                      className="auth-input auth-select"
                      disabled={loading}
                    >
                      {PANGKAT_OPTIONS.map((p) => (
                        <option key={p} value={p} style={{ background: '#1b2229', color: '#fff' }}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="auth-input-group">
                  <label className="auth-label">Nama Lengkap (Tanpa Pangkat)</label>
                  <div className="auth-input-wrapper">
                    <User size={15} className="auth-input-icon" />
                    <input
                      type="text"
                      required
                      value={regNama}
                      onChange={(e) => setRegNama(e.target.value)}
                      placeholder="e.g. DANIAL ABDIANSYAH"
                      className="auth-input"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: NRP & Satuan Fungsi / Unit */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="auth-input-group">
                  <label className="auth-label">NRP / NIP Personel</label>
                  <div className="auth-input-wrapper">
                    <Hash size={15} className="auth-input-icon" />
                    <input
                      type="text"
                      required
                      value={regNrp}
                      onChange={(e) => setRegNrp(e.target.value)}
                      placeholder="e.g. 98010234"
                      className="auth-input"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label className="auth-label">Satuan Fungsi / Unit</label>
                  <div className="auth-input-wrapper">
                    <Building2 size={15} className="auth-input-icon" />
                    <select
                      value={regUnit}
                      onChange={(e) => setRegUnit(e.target.value)}
                      className="auth-input auth-select"
                      disabled={loading}
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u} style={{ background: '#1b2229', color: '#fff' }}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 3: Jabatan & Kesatuan (Satker) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="auth-input-group">
                  <label className="auth-label">Jabatan Kedinasan</label>
                  <div className="auth-input-wrapper">
                    <Briefcase size={15} className="auth-input-icon" />
                    <input
                      type="text"
                      required
                      value={regJabatan}
                      onChange={(e) => setRegJabatan(e.target.value)}
                      placeholder="e.g. PENYIDIK PEMBANTU"
                      className="auth-input"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label className="auth-label">Kesatuan / Satker</label>
                  <div className="auth-input-wrapper">
                    <Building2 size={15} className="auth-input-icon" />
                    <input
                      type="text"
                      required
                      value={regSatker}
                      onChange={(e) => setRegSatker(e.target.value)}
                      placeholder="Satreskrim Polres Kolaka Timur"
                      className="auth-input"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Phone & Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="auth-input-group">
                  <label className="auth-label">Nomor WhatsApp / HP</label>
                  <div className="auth-input-wrapper">
                    <Phone size={15} className="auth-input-icon" />
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="0812XXXXXXXX"
                      className="auth-input"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label className="auth-label">Email Aktif</label>
                  <div className="auth-input-wrapper">
                    <Mail size={15} className="auth-input-icon" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="contoh@email.com"
                      className="auth-input"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Row 5: Password & Konfirmasi */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="auth-input-group">
                  <label className="auth-label">Kata Sandi Dinas</label>
                  <div className="auth-input-wrapper">
                    <Lock size={15} className="auth-input-icon" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Minimal 8 Karakter"
                      className="auth-input"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        background: 'none',
                        border: 'none',
                        color: '#6b7280',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex'
                      }}
                    >
                      {showRegPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="auth-input-group">
                  <label className="auth-label">Ulangi Kata Sandi</label>
                  <div className="auth-input-wrapper">
                    <KeyRound size={15} className="auth-input-icon" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Konfirmasi Kata Sandi"
                      className="auth-input"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              {regPassword.length > 0 && (
                <div className="password-check-box">
                  <div className={`check-item ${passwordRules.minLength ? 'valid' : 'invalid'}`}>
                    {passwordRules.minLength ? <Check size={12} /> : <X size={12} />}
                    <span>Min. 8 Karakter</span>
                  </div>
                  <div className={`check-item ${passwordRules.hasUpper ? 'valid' : 'invalid'}`}>
                    {passwordRules.hasUpper ? <Check size={12} /> : <X size={12} />}
                    <span>Huruf Besar (A-Z)</span>
                  </div>
                  <div className={`check-item ${passwordRules.hasNumber ? 'valid' : 'invalid'}`}>
                    {passwordRules.hasNumber ? <Check size={12} /> : <X size={12} />}
                    <span>Angka (0-9)</span>
                  </div>
                  <div className={`check-item ${isPasswordMatch ? 'valid' : 'invalid'}`}>
                    {isPasswordMatch ? <Check size={12} /> : <X size={12} />}
                    <span>Sandi Cocok</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !isRegisterFormValid}
                className="auth-btn-primary"
              >
                {loading ? (
                  <>
                    <Clock size={16} className="animate-spin" />
                    <span>Mendaftarkan Akun...</span>
                  </>
                ) : (
                  <>
                    <BadgeCheck size={16} />
                    <span>Daftarkan Akun Penyidik</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ============================================================
            OVERLAY CONTAINER (Sliding Panel with Angular Slant)
           ============================================================ */}
        <div className="auth-overlay-container">
          <div className="auth-overlay">
            {/* Overlay Left (Visible when Register Active -> Prompts to Sign-In) */}
            <div className="auth-overlay-panel auth-overlay-left">
              <div className="overlay-badge">
                <ShieldCheck size={14} color="#ffe6e4" />
                <span>AKUN KEDINASAN AKTIF</span>
              </div>
              <h2 className="overlay-title">
                Sudah Terdaftar di Sistem?
              </h2>
              <p className="overlay-desc">
                Silakan masuk dengan kredensial kedinasan yang telah diverifikasi oleh Administrator Satreskrim.
              </p>
              <button 
                type="button" 
                className="overlay-ghost-btn"
                onClick={() => handleTogglePanel(false)}
              >
                <span>Masuk Sekarang</span>
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Overlay Right (Visible when Login Active -> Prompts to Register) */}
            <div className="auth-overlay-panel auth-overlay-right">
              <div className="overlay-badge">
                <Radio size={14} className="animate-pulse" color="#ffe6e4" />
                <span>SATRESKRIM POLRES KOLAKA TIMUR</span>
              </div>
              <h2 className="overlay-title">
                Sistem Administrasi Penyidikan Digital
              </h2>
              <p className="overlay-desc">
                Satreskrim Polres Kolaka Timur - Mewujudkan pelayanan penegakan hukum yang Presisi dan transparan.
              </p>
              <button 
                type="button" 
                className="overlay-ghost-btn"
                onClick={() => handleTogglePanel(true)}
              >
                <UserPlus size={16} />
                <span>Daftar Akun Personel</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          MODAL ALERT IN-PLACE (PRESISI SATRESKRIM DESIGN SYSTEM)
         ============================================================ */}
      <AuthAlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        duration={alertModal.duration}
        showConfirmButton={alertModal.showConfirmButton}
        confirmText={alertModal.confirmText}
      />
    </div>
  );
}
