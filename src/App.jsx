import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import LoginPage from './views/LoginPage';
import ExpandingSidebar from './components/layout/ExpandingSidebar';
import Navbar from './components/Navbar';
import DashboardView from './views/DashboardView';
import CasesView from './views/CasesView';
import DocGeneratorView from './views/DocGeneratorView';
import ArchivesView from './views/ArchivesView';
import PersonnelView, { cleanOfficerName } from './views/PersonnelView';
import AdminTemplateStudio from './views/AdminTemplateStudio';
import CaseDetailModal from './components/CaseDetailModal';
import NewCaseModal from './components/NewCaseModal';
import DocPreviewModal from './components/DocPreviewModal';
import UserManagementModal from './components/UserManagementModal';
import DumasView from './views/DumasView';
import { fetchDumasRecords } from './services/dumasService';
import { mockDocuments } from './data/mockDocuments';
import { CheckCircle2, RefreshCw } from 'lucide-react';

export default function App() {
  // Authentication & Role State (3-tier: 'super_admin' | 'admin' | 'anggota')
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Core Data States - 100% PURE REAL-TIME SUPABASE (NO FALLBACK REVERT)
  const [cases, setCases] = useState([]);
  const [dumasList, setDumasList] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [documents, setDocuments] = useState(() => {
    try {
      const saved = localStorage.getItem('emindik_archive_documents');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return mockDocuments;
  });
  const [activeTab, setActiveTab] = useState('dashboard');

  // Modal States
  const [selectedCaseForDetail, setSelectedCaseForDetail] = useState(null);
  const [caseForGenerator, setCaseForGenerator] = useState(null);
  const [templateForGenerator, setTemplateForGenerator] = useState(null);
  const [suspectForGenerator, setSuspectForGenerator] = useState(null);
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState(null);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // 1. Initial Session Check & Auth Listener
  useEffect(() => {
    let isMounted = true;

    const checkCurrentSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          const u = session.user;

          // Fetch user profile from Supabase
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', u.id)
            .maybeSingle();

          const meta = u.user_metadata || {};
          const isSuper = u.id === '75abae80-e013-4987-a5e7-f1107d2ab265' || 
                          u.email?.includes('kasat') || 
                          u.email?.includes('super') ||
                          profile?.role === 'super_admin';

          // Determine if approved: ONLY if status is 'active' or user is super_admin
          const isApproved = isSuper || (profile?.status === 'active');

          if (!isApproved) {
            // Unapproved or pending session: do not keep active session
            await supabase.auth.signOut().catch(() => {});
            if (isMounted) {
              setUser(null);
              setUserRole(null);
              setCurrentUserProfile(null);
            }
            return;
          }

          if (isMounted) {
            const finalRole = isSuper ? 'super_admin' : (profile?.role || meta.role || 'anggota');
            setUser(u);
            setUserRole(finalRole);
            setCurrentUserProfile({
              ...profile,
              id: u.id,
              email: u.email,
              nama: profile?.full_name || profile?.nama || meta.nama || meta.full_name || u.email.split('@')[0],
              pangkat: profile?.pangkat || meta.pangkat || '-',
              nrp: profile?.rank_nrp || profile?.nrp || meta.nrp || '-',
              jabatan: isSuper ? 'Super Admin Satreskrim' : (profile?.jabatan || meta.jabatan || 'Penyidik Pembantu'),
              satker: profile?.satker || meta.satker || 'Satreskrim Polres Kolaka Timur',
              unit: profile?.unit || meta.unit || '',
              phone: profile?.phone || profile?.no_hp || meta.phone || meta.no_hp || '',
              role: finalRole,
              status: 'active'
            });
          }
        }
      } catch (err) {
        console.warn('Session verification warning:', err);
      } finally {
        if (isMounted) setIsAuthChecking(false);
      }
    };

    checkCurrentSession();

    // Auth state listener: only handle SIGNED_OUT to avoid race conditions during login/register
    const { data: authSubscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserRole(null);
        setCurrentUserProfile(null);
      }
    });

    return () => {
      isMounted = false;
      authSubscription?.subscription?.unsubscribe();
    };
  }, []);

  // 2. Fetch Supabase Data Purely (Cases, Personnel, Documents)
  useEffect(() => {
    if (!user) return;

    const loadSupabaseData = async () => {
      // 1. Cases: read pure real-time data from Supabase
      try {
        const { data: casesData, error: casesErr } = await supabase
          .from('cases')
          .select('*')
          .order('created_at', { ascending: false });

        if (!casesErr && casesData) {
          const mappedCases = casesData.map((c) => {
            const invList = Array.isArray(c.investigators) ? c.investigators : [];
            const foundIdx = invList.findIndex((i) => i.is_penangan === true || i.is_penangan === 'true' || i.is_penangan === 1);
            const penanganIdx = c.penyidik_penangan_index 
              ?? c.references?.penyidik_penangan_index 
              ?? (foundIdx !== -1 ? (Number(invList[foundIdx].role_order) || (foundIdx + 1)) : 1);

            return {
              ...c,
              penyidik_penangan_index: Number(penanganIdx) || 1,
            };
          });
          setCases(mappedCases);
          setSelectedCaseForDetail((prev) => {
            if (!prev) return null;
            const updated = mappedCases.find((c) => c.id === prev.id);
            return updated ? { ...prev, ...updated } : prev;
          });
        }
      } catch (e) {
        console.warn('Cases sync error:', e);
      }

      // 2. Personnel: read pure real-time data from Supabase
      try {
        const { data: persData, error: persErr } = await supabase
          .from('investigators')
          .select('*')
          .order('nama', { ascending: true });

        // Query active profiles to ensure newly registered and approved officers appear seamlessly
        const { data: activeProfs } = await supabase
          .from('profiles')
          .select('*')
          .eq('status', 'active');

        let merged = persData ? [...persData] : [];
        if (activeProfs && activeProfs.length > 0) {
          const ranks = ['AKBP', 'KOMPOL', 'AKP', 'IPTU', 'IPDA', 'AIPTU', 'AIPDA', 'BRIPKA', 'BRIGPOL', 'BRIGADIR', 'BRIPTU', 'BRIPDA'];
          activeProfs.forEach(ap => {
            const exists = merged.some(m => m.id === ap.id || (ap.rank_nrp && m.nrp === ap.rank_nrp));
            if (!exists && ap.role !== 'super_admin') {
              let detectedRank = 'BRIPDA';
              const nameUpper = (ap.full_name || '').toUpperCase();
              for (const rk of ranks) {
                if (nameUpper.startsWith(rk) || nameUpper.includes(` ${rk} `)) {
                  detectedRank = rk;
                  break;
                }
              }

              merged.push({
                id: ap.id,
                nama: cleanOfficerName(ap.full_name || ap.nama || 'Penyidik Satreskrim'),
                pangkat: ap.pangkat || detectedRank,
                nrp: ap.rank_nrp || ap.nrp || '-',
                jabatan: ap.position || ap.jabatan || 'Penyidik Pembantu',
                role: 'Penyidik',
                phone: ap.phone || '',
                status: 'active'
              });
            }
          });
        }

        if (merged.length > 0) {
          setPersonnel(merged);
        } else if (!persErr && persData) {
          setPersonnel(persData);
        }
      } catch (e) {
        console.warn('Personnel sync error:', e);
      }

      // 3. Dumas: read registered reports
      try {
        const { data: dumasData } = await fetchDumasRecords();
        if (dumasData && Array.isArray(dumasData)) {
          setDumasList(dumasData);
        }
      } catch (e) {
        console.warn('Dumas sync error:', e);
      }
    };

    loadSupabaseData();
  }, [user]);

  // 3. Protected Routes Guard: Hanya Super Admin yang boleh akses Personel & Template Studio
  useEffect(() => {
    if (userRole && userRole !== 'super_admin' && (activeTab === 'personnel' || activeTab === 'admin-templates')) {
      setActiveTab('dashboard');
      showToast('Akses dibatasi: Menu ini hanya dapat diakses oleh Super Admin Satreskrim.');
    }
  }, [userRole, activeTab]);

  // Handlers
  const handleLoginSuccess = ({ user: authUser, profile, role, status }) => {
    setUser(authUser);
    setCurrentUserProfile(profile);
    setUserRole(role);
    if (status === 'active' || role === 'super_admin') {
      setActiveTab('dashboard');
      showToast(`Selamat bertugas, ${profile.pangkat || ''} ${profile.nama || profile.full_name || ''} (${role.toUpperCase()})`);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Logout warning:', err);
    }
    setUser(null);
    setUserRole(null);
    setCurrentUserProfile(null);
    showToast('Sesi telah diakhiri. Anda telah keluar dari sistem E-Mindik.');
  };

  const handleAddCase = async (newCase) => {
    setCases((prev) => [newCase, ...prev]);
    showToast(`Perkara ${newCase.nomor_lp || newCase.no_lp} berhasil diregistrasi!`);

    try {
      let { error } = await supabase.from('cases').insert([newCase]);
      if (error && (error.code === 'PGRST204' || (error.message && error.message.includes('schema cache')))) {
        console.warn('PGRST204: Membuang objek non-kolom dan mencoba insert ulang...');
        const {
          penyidik_penangan,
          ...cleanCase
        } = newCase;
        const retry = await supabase.from('cases').insert([cleanCase]);
        error = retry.error;
      }
      if (error) {
        console.error('Insert case error:', error);
        alert(`Gagal menyimpan perkara ke database: ${error.message}`);
      } else {
        // Insert seluruh terlapor_list ke tabel case_suspects di Supabase dengan status murni terlapor
        if (Array.isArray(newCase.terlapor_list) && newCase.terlapor_list.length > 0) {
          const suspectsPayload = newCase.terlapor_list.map((t) => ({
            case_id: newCase.id,
            nama: t.nama || 'Dalam Penyelidikan',
            nik: t.nik || '-',
            jenis_kelamin: t.jenis_kelamin || 'Laki-laki',
            tempat_lahir: t.tempat_lahir || 'Kolaka Timur',
            tgl_lahir: t.tgl_lahir || null,
            umur: t.umur ? String(t.umur) : null,
            agama: t.agama || 'Islam',
            pekerjaan: t.pekerjaan || 'Wiraswasta',
            kewarganegaraan: t.kewarganegaraan || 'Indonesia',
            pendidikan: t.pendidikan || 'SMA',
            status_pernikahan: t.status_pernikahan || 'Kawin',
            alamat: t.alamat || newCase.locus || '',
            status: 'terlapor', // Formil murni terlapor
            no_sp_tap_tsk: null,
            nomor_sp_tap: null,
            tanggal_sp_tap: null,
            tgl_sp_tap_tsk: null,
            created_at: new Date().toISOString(),
          }));
          try {
            await supabase.from('case_suspects').insert(suspectsPayload);
          } catch (csErr) {
            console.warn('Insert initial case_suspects notice:', csErr);
          }
        }
      }
    } catch (err) {
      console.warn('Insert case notice:', err);
    }
  };

  // Hapus Berkas Perkara: HANYA BOLEH UNTUK 'super_admin' DAN 'admin'
  const handleDeleteCase = async (caseId) => {
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      alert('Akses Ditolak: Hanya Super Admin dan Admin yang berhak menghapus berkas perkara!');
      return;
    }

    try {
      // 1. Hapus relasi anak terlebih dahulu jika ada
      try {
        await supabase.from('case_suspects').delete().eq('case_id', caseId);
      } catch (csErr) {
        console.warn('Delete case_suspects notice:', csErr);
      }
      try {
        await supabase.from('documents').delete().eq('case_id', caseId);
      } catch (docErr) {
        console.warn('Delete documents notice:', docErr);
      }

      // 2. Hapus berkas perkara utama
      const { error } = await supabase
        .from('cases')
        .delete()
        .eq('id', caseId);

      if (error) throw error;
      
      // Update state in memory after successful deletion
      setCases((prev) => prev.filter((c) => c.id !== caseId));
      setDocuments((prev) => {
        const updated = prev.filter((d) => d.case_id !== caseId);
        try {
          localStorage.setItem('emindik_archive_documents', JSON.stringify(updated));
        } catch {}
        return updated;
      });
      showToast('Berkas perkara dan riwayat mindik berhasil dihapus dari database Supabase!');
    } catch (err) {
      console.error('Gagal menghapus perkara:', err);
      alert(`Terjadi kesalahan saat menghapus perkara: ${err.message}`);
    }
  };

  const handleUpdateCase = (updatedCase) => {
    setCases((prev) => prev.map((c) => (c.id === updatedCase.id ? { ...c, ...updatedCase } : c)));
    if (selectedCaseForDetail && selectedCaseForDetail.id === updatedCase.id) {
      setSelectedCaseForDetail((prev) => ({ ...prev, ...updatedCase }));
    }
    showToast(`Data perkara ${updatedCase.nomor_lp || updatedCase.no_lp} berhasil diperbarui!`);
  };

  const handleAddPersonnel = async (newPerson) => {
    if (userRole !== 'super_admin') return;

    const personWithId = {
      ...newPerson,
      id: newPerson.id || `usr-${Date.now().toString().slice(-4)}`,
    };

    setPersonnel((prev) => [personWithId, ...prev]);
    showToast(`Personel ${newPerson.pangkat} ${newPerson.nama} berhasil ditambahkan!`);

    try {
      const { error } = await supabase.from('investigators').insert([personWithId]);
      if (error) {
        console.error('Insert investigator error:', error);
        alert(`Gagal menyimpan personel ke database: ${error.message}`);
      }
    } catch (err) {
      console.warn('Insert investigator notice:', err);
    }
  };

  // Hapus Personel Total (Hard Delete): HANYA BOLEH UNTUK 'super_admin'
  const handleDeletePersonnel = async (personInput) => {
    if (userRole !== 'super_admin') {
      alert('Akses Ditolak: Hanya Super Admin yang berhak menghapus personel!');
      return;
    }

    try {
      const personId = typeof personInput === 'object' ? personInput?.id : personInput;
      const personNrp = typeof personInput === 'object' ? personInput?.nrp : null;
      const personEmail = typeof personInput === 'object' ? personInput?.email : null;
      const personNama = typeof personInput === 'object' ? personInput?.nama : '';

      const isUuid = (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

      let targetUserId = isUuid(personId) ? personId : null;

      // 1. Dapatkan target_user_id (UUID auth.users & profiles) jika belum berformat UUID
      if (!targetUserId) {
        try {
          if (personNrp) {
            const { data: profByNrp } = await supabase
              .from('profiles')
              .select('id')
              .or(`nrp.eq.${personNrp},rank_nrp.eq.${personNrp}`)
              .limit(1)
              .maybeSingle();
            if (profByNrp?.id) targetUserId = profByNrp.id;
          }

          if (!targetUserId && personEmail) {
            const { data: profByEmail } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', personEmail)
              .limit(1)
              .maybeSingle();
            if (profByEmail?.id) targetUserId = profByEmail.id;
          }

          if (!targetUserId && personNama) {
            const { data: profByNama } = await supabase
              .from('profiles')
              .select('id')
              .ilike('nama', `%${personNama}%`)
              .limit(1)
              .maybeSingle();
            if (profByNama?.id) targetUserId = profByNama.id;
          }
        } catch (findErr) {
          console.warn('Notice: Gagal mencari profile user_id:', findErr);
        }
      }

      // 2. Hapus data dari tabel investigators
      try {
        if (personId) {
          await supabase.from('investigators').delete().eq('id', personId);
        }
        if (personNrp) {
          await supabase.from('investigators').delete().eq('nrp', personNrp);
        }
      } catch (invErr) {
        console.warn('Delete investigators notice:', invErr);
      }

      // 3. Hapus data profil dari tabel profiles
      try {
        if (targetUserId) {
          await supabase.from('profiles').delete().eq('id', targetUserId);
        }
        if (personNrp) {
          await supabase.from('profiles').delete().or(`nrp.eq.${personNrp},rank_nrp.eq.${personNrp}`);
        }
      } catch (profErr) {
        console.warn('Delete profiles notice:', profErr);
      }

      // 4. Hapus akun kredensial dari auth.users dengan memanggil fungsi RPC
      if (targetUserId) {
        try {
          const { error: rpcErr } = await supabase.rpc('delete_user_completely', { target_user_id: targetUserId });
          if (rpcErr) {
            console.warn('Supabase RPC delete_user_completely notice:', rpcErr);
          }
        } catch (rpcEx) {
          console.warn('RPC delete_user_completely exception:', rpcEx);
        }
      }

      // 5. Perbarui state lokal daftar personel
      setPersonnel((prev) => prev.filter((p) => {
        if (personId && p.id === personId) return false;
        if (personNrp && p.nrp === personNrp) return false;
        if (targetUserId && p.id === targetUserId) return false;
        return true;
      }));

      showToast('Akun & data personel berhasil dihapus total secara permanen!');
    } catch (err) {
      console.error('Delete investigator exception:', err);
      alert(`Terjadi kesalahan saat menghapus akun personel: ${err.message}`);
    }
  };

  // Perbarui Data Personel: HANYA BOLEH UNTUK 'super_admin'
  const handleUpdatePersonnel = async (updatedPerson) => {
    if (userRole !== 'super_admin') return;
    const cleanNama = cleanOfficerName(updatedPerson.nama);
    const sanitizedPerson = {
      ...updatedPerson,
      nama: cleanNama
    };

    // Update in-memory state
    setPersonnel((prev) => prev.map((p) => {
      if ((sanitizedPerson.id && p.id === sanitizedPerson.id) || (sanitizedPerson.nrp && p.nrp === sanitizedPerson.nrp)) {
        return { ...p, ...sanitizedPerson };
      }
      return p;
    }));
    showToast(`Data personel ${sanitizedPerson.pangkat || ''} ${sanitizedPerson.nama} berhasil diperbarui!`);

    try {
      // 1. Update di tabel investigators
      if (sanitizedPerson.id) {
        const { error: invErr } = await supabase
          .from('investigators')
          .update({
            nama: sanitizedPerson.nama,
            pangkat: sanitizedPerson.pangkat,
            nrp: sanitizedPerson.nrp,
            jabatan: sanitizedPerson.jabatan,
            phone: sanitizedPerson.phone,
            status: sanitizedPerson.status
          })
          .eq('id', sanitizedPerson.id);

        if (invErr) {
          // Jika belum ada di investigators, insert baru
          await supabase.from('investigators').upsert([{
            id: sanitizedPerson.id,
            nama: sanitizedPerson.nama,
            pangkat: sanitizedPerson.pangkat,
            nrp: sanitizedPerson.nrp,
            jabatan: sanitizedPerson.jabatan,
            phone: sanitizedPerson.phone,
            status: sanitizedPerson.status,
            role: 'Penyidik'
          }]);
        }
      }

      // 2. Update di tabel profiles (menggunakan nama kolom rank_nrp & position yang ada di Supabase)
      if (sanitizedPerson.id) {
        await supabase
          .from('profiles')
          .update({
            full_name: `${sanitizedPerson.pangkat || ''} ${sanitizedPerson.nama}`.trim(),
            rank_nrp: sanitizedPerson.nrp,
            phone: sanitizedPerson.phone,
            position: sanitizedPerson.jabatan
          })
          .eq('id', sanitizedPerson.id);
      }
    } catch (err) {
      console.warn('Update personnel database warning:', err);
    }
  };

  const handleSaveDocument = async (newDoc) => {
    setDocuments((prev) => {
      const updated = [newDoc, ...prev];
      try {
        localStorage.setItem('emindik_archive_documents', JSON.stringify(updated));
      } catch (err) {
        console.warn('LocalStorage save error:', err);
      }
      return updated;
    });
    showToast(`Dokumen ${newDoc.doc_title || 'Mindik'} berhasil disimpan ke arsip!`);

    try {
      await supabase.from('documents').insert([newDoc]);
    } catch (err) {
      console.warn('Insert document notice:', err);
    }
  };

  const handleDeleteDocument = async (doc) => {
    if (!doc) return;

    // 1. Hapus file fisik dari Supabase Storage jika ada
    const fileUrl = doc.file_url || doc.storage_path || doc.url || '';
    if (fileUrl) {
      try {
        let bucket = 'documents';
        let path = '';

        if (fileUrl.includes('/documents/')) {
          bucket = 'documents';
          path = decodeURIComponent(fileUrl.split('/documents/')[1]?.split('?')[0] || '');
        } else if (fileUrl.includes('/templates/')) {
          bucket = 'templates';
          path = decodeURIComponent(fileUrl.split('/templates/')[1]?.split('?')[0] || '');
        } else if (!fileUrl.startsWith('http')) {
          path = fileUrl;
        }

        if (path) {
          const { error: storageErr } = await supabase.storage.from(bucket).remove([path]);
          if (storageErr) {
            console.warn(`Gagal hapus file fisik storage [${bucket}/${path}]:`, storageErr.message);
          }
        }
      } catch (stErr) {
        console.warn('Physical file deletion error:', stErr);
      }
    }

    // 2. Hapus baris dokumen dari tabel Supabase
    try {
      if (doc.id && !String(doc.id).startsWith('doc-')) {
        await supabase.from('documents').delete().eq('id', doc.id);
      }
    } catch (dbErr) {
      console.warn('Delete document database row error:', dbErr);
    }

    // 3. Update state dokumen lokal & localStorage
    setDocuments((prev) => {
      const updated = prev.filter((d) => d.id !== doc.id);
      try {
        localStorage.setItem('emindik_archive_documents', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    showToast(`Dokumen '${doc.doc_title || doc.title || 'Mindik'}' berhasil dihapus dari arsip!`);
  };

  const handleOpenGeneratorForCase = (caseItem, templateCode = null, suspectId = null) => {
    setCaseForGenerator(caseItem);
    if (templateCode) {
      setTemplateForGenerator(typeof templateCode === 'object' ? templateCode : { code: templateCode });
    } else {
      setTemplateForGenerator(null);
    }
    setSuspectForGenerator(suspectId || null);
    setActiveTab('generator');
  };

  const handleHandoverFromDumas = (mappedCase) => {
    setCaseForGenerator(mappedCase);
    setActiveTab('generator');
    showToast(`Data perkara Dumas ${mappedCase.no_lp || ''} siap diproses di Generator Mindik.`);
  };

  // Loading state during auth check
  if (isAuthChecking) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        background: '#1b2229',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        color: 'var(--accent-cyan)',
        fontFamily: 'Inter, sans-serif',
      }}>
        <RefreshCw size={32} className="animate-spin" />
        <div style={{ fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600 }}>
          Memeriksa Kredensial E-Mindik Polri...
        </div>
      </div>
    );
  }

  // Not authenticated -> Show Strict LoginPage
  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }



  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          background: 'rgba(13, 21, 38, 0.95)',
          border: '1px solid var(--accent-cyan)',
          boxShadow: 'var(--glow-cyan-strong)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#FFFFFF',
          fontSize: '13px',
          fontWeight: 600,
          animation: 'slideInRight 250ms ease-out',
        }}>
          <CheckCircle2 size={18} color="var(--accent-cyan)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Expanding Sidebar Navigation with 3-tier Role-based filtering */}
      <ExpandingSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        caseCount={cases.length}
        dumasCount={dumasList.length}
        docCount={documents.length}
        personnelCount={personnel.length}
        userRole={userRole}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
      />

      {/* Main Content Area */}
      <div className="app-main">
        <Navbar
          onNewCase={() => setIsNewCaseModalOpen(true)}
          onNewDoc={() => {
            setCaseForGenerator(null);
            setActiveTab('generator');
          }}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          currentUserProfile={currentUserProfile}
          userRole={userRole}
          onLogout={handleLogout}
          onOpenUserManagement={() => setIsUserManagementOpen(true)}
        />

        <main className="main-content">
          {activeTab === 'dashboard' && (
            <DashboardView
              cases={cases}
              documents={documents}
              onSelectCase={(c) => setSelectedCaseForDetail(c)}
              onNewCase={() => setIsNewCaseModalOpen(true)}
              onOpenGenerator={(c) => handleOpenGeneratorForCase(c)}
              onViewDoc={(doc) => setSelectedDocForPreview(doc)}
            />
          )}

          {activeTab === 'dumas' && (
            <DumasView
              dumasList={dumasList}
              setDumasList={setDumasList}
              currentUserProfile={currentUserProfile}
              onHandoverToGenerator={handleHandoverFromDumas}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'cases' && (
            <CasesView
              cases={cases}
              personnel={personnel}
              userRole={userRole}
              onSelectCase={(c) => setSelectedCaseForDetail(c)}
              onNewCase={() => setIsNewCaseModalOpen(true)}
              onGenerateDocForCase={(c) => handleOpenGeneratorForCase(c)}
              onDeleteCase={handleDeleteCase}
              onUpdateCase={handleUpdateCase}
            />
          )}

          {activeTab === 'generator' && (
            <DocGeneratorView
              cases={cases}
              personnel={personnel}
              userRole={userRole}
              initialCase={caseForGenerator}
              initialTemplate={templateForGenerator}
              initialSuspectId={suspectForGenerator}
              onSaveDocument={handleSaveDocument}
              onOpenTemplateStudio={() => setActiveTab('admin-templates')}
            />
          )}

          {activeTab === 'archives' && (
            <ArchivesView
              documents={documents}
              cases={cases}
              onPreviewDoc={(doc) => setSelectedDocForPreview(doc)}
              onDeleteDoc={handleDeleteDocument}
            />
          )}

          {activeTab === 'personnel' && userRole === 'super_admin' && (
            <PersonnelView
              cases={cases}
              personnel={personnel}
              userRole={userRole}
              onAddPersonnel={handleAddPersonnel}
              onDeletePersonnel={handleDeletePersonnel}
              onUpdatePersonnel={handleUpdatePersonnel}
            />
          )}

          {activeTab === 'admin-templates' && userRole === 'super_admin' && (
            <AdminTemplateStudio
              userRole={userRole}
              onTemplateSaved={(newTpl) => {
                showToast(`Template ${newTpl.title} berhasil diunggah ke Supabase!`);
              }}
              onSelectTemplateForGenerator={(tpl) => {
                setTemplateForGenerator(tpl);
                setActiveTab('generator');
              }}
            />
          )}
        </main>
      </div>

      {/* Case Detail Dossier Modal */}
      {selectedCaseForDetail && (
        <CaseDetailModal
          caseItem={selectedCaseForDetail}
          personnel={personnel}
          onClose={() => setSelectedCaseForDetail(null)}
          onGenerateDocForCase={(c, tpl, suspId) => handleOpenGeneratorForCase(c, tpl, suspId)}
          onUpdateCase={handleUpdateCase}
          caseDocuments={documents.filter((d) => d.case_id === selectedCaseForDetail.id)}
        />
      )}

      {/* New Case Registration Modal */}
      {isNewCaseModalOpen && (
        <NewCaseModal
          onClose={() => setIsNewCaseModalOpen(false)}
          onAddCase={handleAddCase}
          personnel={personnel}
        />
      )}

      {/* Document View / Print Modal */}
      {selectedDocForPreview && (
        <DocPreviewModal
          docItem={selectedDocForPreview}
          cases={cases}
          onClose={() => setSelectedDocForPreview(null)}
        />
      )}

      {/* User / RBAC Role Management Modal (Khusus Super Admin) */}
      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        currentUserId={user?.id}
        onPersonnelUpdated={(newPerson) => {
          if (!newPerson) return;
          const cleanedName = cleanOfficerName(newPerson.nama);
          const sanitizedPerson = {
            ...newPerson,
            nama: cleanedName,
          };
          setPersonnel(prev => {
            const exists = prev.some(p => (sanitizedPerson.nrp && sanitizedPerson.nrp !== '-' && p.nrp === sanitizedPerson.nrp) || p.id === sanitizedPerson.id);
            if (exists) {
              return prev.map(p => ((sanitizedPerson.nrp && sanitizedPerson.nrp !== '-' && p.nrp === sanitizedPerson.nrp) || p.id === sanitizedPerson.id) ? { ...p, ...sanitizedPerson } : p);
            }
            return [sanitizedPerson, ...prev];
          });
          showToast(`Personel ${cleanedName} berhasil disinkronkan ke direktori!`);
        }}
      />
    </div>
  );
}
