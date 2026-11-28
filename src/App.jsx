import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from './supabaseClient';
import LoginPage from './views/LoginPage';
import ExpandingSidebar from './components/layout/ExpandingSidebar';
import Navbar from './components/Navbar';
import DashboardView from './views/DashboardView';
import CasesView from './views/CasesView';
// import DocGeneratorView from './views/DocGeneratorView';
import MindikGeneratorView from './views/mindik/MindikGeneratorView';
import ArchivesView from './views/ArchivesView';
import PersonnelView, { cleanOfficerName } from './views/PersonnelView';
import AdminTemplateStudio from './views/AdminTemplateStudio';
import {
  toCanonicalMindikCode,
  normalizeLpNumber,
  isSameLpNumber,
  isDocumentLinkedToCase
} from './constants/mindikChainRegistry';
import CaseDetailModal from './components/CaseDetailModal';
import NewCaseModal from './components/NewCaseModal';
import DocPreviewModal from './components/DocPreviewModal';
import UserManagementModal from './components/UserManagementModal';
import DumasView from './views/DumasView';
import DumasFormView from './components/dumas/DumasFormView';
import MobileUploadView from './views/MobileUploadView';
import { fetchDumasRecords, convertDumasToCase } from './services/dumasService';
import {
  CASES_LOCAL_STORAGE_KEY,
  DOCUMENTS_LOCAL_STORAGE_KEY,
  upsertCaseToSupabaseSafe,
  upsertDocumentToSupabaseSafe,
  syncLocalDataToSupabase
} from './services/localDataSyncService';
import { isSpktRole } from './utils/rbacHelper';
import { CheckCircle2, RefreshCw } from 'lucide-react';

export default function App() {
  const spotlightRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!spotlightRef.current) return;
      spotlightRef.current.style.background = `radial-gradient(circle 260px at ${e.clientX}px ${e.clientY}px, rgba(255, 42, 42, 0.16) 0%, rgba(220, 38, 38, 0.06) 50%, transparent 100%)`;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Authentication & Role State (4-tier: 'super_admin' | 'admin' | 'anggota' | 'spkt')
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const isSpktUser = isSpktRole(userRole);

  // Core Data States - 100% PURE REAL-TIME SUPABASE (NO MOCK / NO DUMMY FALLBACK)
  const [cases, setCases] = useState([]);
  const [dumasList, setDumasList] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState(() => {
    // Pertahankan posisi tab aktif saat browser refresh
    // Hanya tab yang valid yang dipulihkan — tab terbatas akses (personnel, admin-templates)
    // akan divalidasi lebih lanjut oleh guard useEffect di bawah.
    try {
      const saved = sessionStorage.getItem('emindik_active_tab');
      const validTabs = ['dashboard', 'dumas', 'cases', 'generator', 'archives', 'personnel', 'admin-templates'];
      if (saved && validTabs.includes(saved)) return saved;
    } catch {}
    return 'dashboard';
  });

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
            const spktAccount = isSpktRole(finalRole);
            setUser(u);
            setUserRole(finalRole);
            if (spktAccount) {
              setActiveTab('dumas');
            }
            setCurrentUserProfile({
              ...profile,
              id: u.id,
              email: u.email,
              nama: profile?.full_name || profile?.nama || meta.nama || meta.full_name || u.email.split('@')[0],
              pangkat: profile?.pangkat || meta.pangkat || '-',
              nrp: profile?.rank_nrp || profile?.nrp || meta.nrp || '-',
              jabatan: isSuper ? 'Super Admin Satreskrim' : (profile?.jabatan || meta.jabatan || (spktAccount ? 'Petugas Loket SPKT' : 'Penyidik Pembantu')),
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

  // 2. Fetch Supabase Data Purely (Tunggu user & userRole; isolasi data sensitif untuk role spkt)
  useEffect(() => {
    if (!user || !userRole) return;

    if (isSpktRole(userRole)) {
      // Isolasi total data sensitif Satreskrim untuk akun SPKT
      setCases([]);
      setPersonnel([]);
      setDocuments([]);
      setSelectedCaseForDetail(null);

      const loadSpktDumasOnly = async () => {
        try {
          const { data: dumasData } = await fetchDumasRecords();
          if (dumasData && Array.isArray(dumasData)) {
            setDumasList(dumasData);
          }
        } catch (e) {
          console.warn('Dumas sync error (SPKT):', e);
        }
      };

      loadSpktDumasOnly();
      return;
    }

    const loadSupabaseData = async () => {
      let loadedServerCases = [];
      let loadedServerDumas = [];
      let loadedServerDocs = [];

      // 1. Cases: read pure real-time data from Supabase + local cache fallback
      try {
        const { data: casesData, error: casesErr } = await supabase
          .from('cases')
          .select('*')
          .order('created_at', { ascending: false });

        let localCasesCache = [];
        try {
          const parsedLocalCases = JSON.parse(localStorage.getItem(CASES_LOCAL_STORAGE_KEY) || '[]');
          if (Array.isArray(parsedLocalCases)) localCasesCache = parsedLocalCases;
        } catch {}

        if (!casesErr && casesData) {
          const mappedCases = casesData.map((c) => {
            const invList = Array.isArray(c.investigators) ? c.investigators : [];
            const foundIdx = invList.findIndex((i) => i.is_penangan === true || i.is_penangan === 'true' || i.is_penangan === 1);
            const penanganIdx = c.penyidik_penangan_index 
              ?? c.references?.penyidik_penangan_index 
              ?? (foundIdx !== -1 ? (Number(invList[foundIdx].role_order) || (foundIdx + 1)) : 1);

            return {
              ...c,
              nomor_lp: c.nomor_lp || c.no_lp || '',
              no_lp: c.no_lp || c.nomor_lp || '',
              penyidik_penangan_index: Number(penanganIdx) || 1,
            };
          });

          // Gabungkan dengan localCasesCache tanpa menimpa data server
          const mergedCaseMap = new Map();
          mappedCases.forEach((c) => mergedCaseMap.set(String(c.id), c));
          localCasesCache.forEach((lc) => {
            if (!lc) return;
            const existsByLp = mappedCases.some((sc) =>
              isSameLpNumber(sc.nomor_lp || sc.no_lp, lc.nomor_lp || lc.no_lp)
            );
            if (!mergedCaseMap.has(String(lc.id)) && !existsByLp) {
              mergedCaseMap.set(String(lc.id), lc);
            }
          });

          loadedServerCases = Array.from(mergedCaseMap.values());
          setCases(loadedServerCases);
          setSelectedCaseForDetail((prev) => {
            if (!prev) return null;
            const updated = loadedServerCases.find((c) => c.id === prev.id);
            return updated ? { ...prev, ...updated } : prev;
          });
        } else if (localCasesCache.length > 0) {
          loadedServerCases = localCasesCache;
          setCases(localCasesCache);
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
            if (!exists && ap.role !== 'super_admin' && !isSpktRole(ap.role)) {
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
          loadedServerDumas = dumasData;
          setDumasList(dumasData);
        }
      } catch (e) {
        console.warn('Dumas sync error:', e);
      }

      // 4. Documents (Arsip Dokumen): read pure real-time data from Supabase + local cache
      try {
        try {
          const { data: listDocs, error: docsError } = await supabase
            .from('documents')
            .select('*')
            .order('created_at', { ascending: false });

          if (docsError) {
            console.warn('[FETCH DOCUMENTS NOTICE]:', docsError.message);
          }

          // Ambil juga cache offline dari localStorage jika ada
          let listLocal = [];
          try {
            const cached = JSON.parse(localStorage.getItem(DOCUMENTS_LOCAL_STORAGE_KEY) || '[]');
            if (Array.isArray(cached)) listLocal = cached;
          } catch {}

          // Gabungkan hasil public.documents (prioritas server) dan cache offline berdasarkan ID
          const hydrateDocRow = (doc) => {
            if (!doc) return doc;
            const mv = (doc.meta_values && typeof doc.meta_values === 'object') ? doc.meta_values : {};
            const canonicalCode = toCanonicalMindikCode(doc.template_code || mv.canonical_code || '', doc.doc_title || '');
            return {
              ...doc,
              case_id: doc.case_id || mv.original_case_id || null,
              template_code: canonicalCode,
              tgl_surat: doc.tgl_surat || mv.tgl_surat || mv.TANGGAL_SURAT || doc.created_at,
              nomor_lp: doc.nomor_lp || mv.nomor_lp || mv.NOMOR_LP || ''
            };
          };

          const combinedMap = new Map();
          [...(listDocs || []), ...listLocal].forEach(doc => {
            if (doc && doc.id && !combinedMap.has(doc.id)) {
              combinedMap.set(doc.id, hydrateDocRow(doc));
            }
          });

          const finalDocs = Array.from(combinedMap.values()).sort(
            (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
          );

          loadedServerDocs = (listDocs || []).map(hydrateDocRow);
          setDocuments(finalDocs);
        } catch (fetchErr) {
          console.warn('[FETCH DOCUMENTS NOTICE]:', fetchErr);
        }
      } catch (e) {
        console.warn('Documents sync error:', e);
        setDocuments([]);
      }

      // 5. SINKRONISASI OTOMATIS localStorage & Dumas LP -> Supabase (`cases` & `documents`)
      try {
        const syncRes = await syncLocalDataToSupabase({
          existingServerCases: loadedServerCases,
          existingServerDumas: loadedServerDumas,
          existingServerDocs: loadedServerDocs
        });
        if (syncRes.totalSynced > 0) {
          setCases(syncRes.syncedCasesList);
          setDocuments((prev) => {
            const docMap = new Map();
            [...syncRes.syncedDocsList, ...prev].forEach((d) => {
              if (d && d.id && !docMap.has(d.id)) docMap.set(d.id, d);
            });
            return Array.from(docMap.values()).sort(
              (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
            );
          });
          showToast(
            `Pemulihan otomatis berhasil: ${syncRes.syncedCasesCount} Berkas LP & ${syncRes.syncedDocsCount} Dokumen Arsip disinkronkan ke database!`
          );
        }
      } catch (syncErr) {
        console.warn('[Auto-Sync Local->Supabase Notice]:', syncErr);
      }
    };

    loadSupabaseData();
  }, [user, userRole]);

  // 3. Protected Routes Guard:
  // - Role spkt hanya diizinkan mengakses tab 'dumas' (auto-landing & blokir rute lain)
  // - Hanya Super Admin yang boleh akses Personel & Template Studio
  useEffect(() => {
    if (isSpktRole(userRole)) {
      if (activeTab !== 'dumas') {
        setActiveTab('dumas');
      }
      setSelectedCaseForDetail(null);
      setCaseForGenerator(null);
      setIsNewCaseModalOpen(false);
      setSelectedDocForPreview(null);
      setIsUserManagementOpen(false);
      return;
    }

    if (userRole && userRole !== 'super_admin' && (activeTab === 'personnel' || activeTab === 'admin-templates')) {
      setActiveTab('dashboard');
      showToast('Akses dibatasi: Menu ini hanya dapat diakses oleh Super Admin Satreskrim.');
    }
  }, [userRole, activeTab]);

  // 4. Persist Tab Aktif ke sessionStorage — dipulihkan saat browser refresh
  useEffect(() => {
    try {
      sessionStorage.setItem('emindik_active_tab', isSpktRole(userRole) ? 'dumas' : activeTab);
    } catch {}
  }, [activeTab, userRole]);

  const handleNavigateTab = (nextTab) => {
    if (isSpktRole(userRole)) {
      if (nextTab !== 'dumas') {
        setActiveTab('dumas');
      }
      return;
    }
    if (userRole && userRole !== 'super_admin' && (nextTab === 'personnel' || nextTab === 'admin-templates')) {
      setActiveTab('dashboard');
      showToast('Akses dibatasi: Menu ini hanya dapat diakses oleh Super Admin Satreskrim.');
      return;
    }
    setActiveTab(nextTab);
  };

  // Handlers
  const handleLoginSuccess = ({ user: authUser, profile, role, status }) => {
    setUser(authUser);
    setCurrentUserProfile(profile);
    setUserRole(role);
    if (status === 'active' || role === 'super_admin') {
      const spktAccount = isSpktRole(role);
      setActiveTab(spktAccount ? 'dumas' : 'dashboard');
      showToast(`Selamat bertugas, ${profile.pangkat || ''} ${profile.nama || profile.full_name || ''} (${spktAccount ? 'PETUGAS SPKT' : role.toUpperCase()})`);
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
    if (isSpktRole(userRole)) return;
    setCases((prev) => [newCase, ...prev.filter((c) => c.id !== newCase.id)]);

    // Simpan cadangan di localStorage agar perkara baru tidak pernah hilang meskipun jaringan terputus
    try {
      const currentLocalCases = JSON.parse(localStorage.getItem(CASES_LOCAL_STORAGE_KEY) || '[]');
      const nextLocalCases = [newCase, ...(Array.isArray(currentLocalCases) ? currentLocalCases.filter((x) => x.id !== newCase.id) : [])];
      localStorage.setItem(CASES_LOCAL_STORAGE_KEY, JSON.stringify(nextLocalCases));
    } catch {}

    try {
      const res = await upsertCaseToSupabaseSafe(newCase);
      if (!res.success && res.error) {
        console.error('Insert case error:', res.error);
        alert(`Gagal menyimpan perkara ke database Supabase: ${res.error.message || JSON.stringify(res.error)}`);
      } else {
        showToast(`Perkara ${newCase.nomor_lp || newCase.no_lp} berhasil disimpan ke database Supabase!`);
        // Insert seluruh terlapor_list dan tersangka_list ke tabel case_suspects di Supabase
        const allInitialSuspects = [
          ...(Array.isArray(newCase.terlapor_list) ? newCase.terlapor_list.map(t => ({ ...t, status: 'terlapor' })) : []),
          ...(Array.isArray(newCase.tersangka_list) ? newCase.tersangka_list.map(t => ({ ...t, status: 'tersangka' })) : [])
        ].filter(t => t && t.nama);

        if (allInitialSuspects.length > 0) {
          const targetCaseId = res.id || newCase.id;
          const suspectsPayload = allInitialSuspects.map((t) => ({
            case_id: targetCaseId,
            nama: t.nama || 'Dalam Penyelidikan',
            nik: t.nik || '-',
            jenis_kelamin: t.jenis_kelamin || 'Laki-laki',
            tempat_lahir: t.tempat_lahir || 'Kolaka Timur',
            tgl_lahir: t.tanggal_lahir || t.tgl_lahir || null,
            umur: t.umur ? String(t.umur) : null,
            agama: t.agama || 'Islam',
            pekerjaan: t.pekerjaan || 'Wiraswasta',
            kewarganegaraan: t.kewarganegaraan || 'Indonesia',
            pendidikan: t.pendidikan || 'SMA',
            status_pernikahan: t.status_pernikahan || 'Kawin',
            alamat: t.alamat || newCase.locus || '',
            status: t.status === 'tersangka' ? 'tersangka' : 'terlapor',
            no_sp_tap_tsk: t.nomor_sp_tap || t.no_sp_tap_tsk || null,
            nomor_sp_tap: t.nomor_sp_tap || t.no_sp_tap_tsk || null,
            tanggal_sp_tap: t.tanggal_sp_tap || t.tgl_sp_tap_tsk || null,
            tgl_sp_tap_tsk: t.tanggal_sp_tap || t.tgl_sp_tap_tsk || null,
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
      alert(`Gagal menyimpan perkara ke database Supabase: ${err.message || err}`);
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
      setDocuments((prev) => prev.filter((d) => d.case_id !== caseId));
      try {
        localStorage.removeItem('emindik_archive_documents');
      } catch {}
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
    if (isSpktRole(userRole)) return;
    const docToSave = newDoc || {};
    const skipDbUpsert = Boolean(docToSave._skipDbUpsert);

    const existingMeta = (docToSave.meta_values && typeof docToSave.meta_values === 'object')
      ? docToSave.meta_values
      : ((docToSave.metadata && typeof docToSave.metadata === 'object') ? docToSave.metadata : {});

    const canonicalCode = toCanonicalMindikCode(
      docToSave.template_code || existingMeta.canonical_code || 'MINDIK',
      docToSave.doc_title || docToSave.title || ''
    );
    const tglSuratVal = docToSave.tgl_surat || docToSave.tanggal_surat || existingMeta.tgl_surat || existingMeta.TANGGAL_SURAT || null;
    const nomorLpVal = docToSave.nomor_lp || docToSave.no_lp || existingMeta.nomor_lp || existingMeta.NOMOR_LP || '';

    const mergedMetaValues = {
      ...existingMeta,
      ...(tglSuratVal ? { tgl_surat: tglSuratVal } : {}),
      ...(nomorLpVal ? { nomor_lp: nomorLpVal } : {}),
      canonical_code: canonicalCode
    };

    // Payload 100% sesuai DDL tabel resmi public.documents
    const dbPayload = {
      id: docToSave.id || crypto.randomUUID(),
      case_id: docToSave.case_id ? String(docToSave.case_id) : null,
      template_id: docToSave.template_id ? String(docToSave.template_id) : null,
      template_code: canonicalCode,
      doc_title: docToSave.doc_title || docToSave.title || 'Dokumen Mindik',
      doc_number: docToSave.doc_number || docToSave.nomor_surat || '-',
      meta_values: mergedMetaValues,
      file_url: docToSave.file_url || null,
      storage_path: docToSave.storage_path || null,
      created_at: docToSave.created_at || new Date().toISOString()
    };

    const hydratedUiDoc = {
      ...dbPayload,
      tgl_surat: tglSuratVal || dbPayload.created_at,
      nomor_lp: nomorLpVal || '-'
    };

    setDocuments((prev) => [hydratedUiDoc, ...prev.filter(d => d.id !== hydratedUiDoc.id)]);
    showToast(`Dokumen ${hydratedUiDoc.doc_title || 'Mindik'} berhasil disimpan ke arsip!`);

    // Pastikan localStorage juga menyimpan salinan dokumen sementara sebagai fallback luring
    try {
      const currentLocal = JSON.parse(localStorage.getItem('emindik_archive_documents') || '[]');
      localStorage.setItem('emindik_archive_documents', JSON.stringify([hydratedUiDoc, ...currentLocal.filter(x => x.id !== hydratedUiDoc.id)]));
    } catch (e) {}

    // Simpan ke database Supabase (lewati bila sudah di-insert oleh pemanggil seperti MindikGeneratorView)
    if (!skipDbUpsert) {
      const targetParentCase = allMergedCases.find(
        (c) => String(c.id) === String(dbPayload.case_id) || (nomorLpVal && isSameLpNumber(c.nomor_lp || c.no_lp, nomorLpVal))
      ) || null;
      const upsertRes = await upsertDocumentToSupabaseSafe(dbPayload, targetParentCase);
      if (!upsertRes.success && upsertRes.error) {
        console.error('[CRITICAL DB INSERT ERROR]:', upsertRes.error.message || upsertRes.error);
        alert(`Gagal menyimpan arsip dokumen ke Supabase: ${upsertRes.error.message || JSON.stringify(upsertRes.error)}`);
      }
    }
  };

  const handleDeleteDocument = async (doc) => {
    if (isSpktRole(userRole)) return;
    if (!doc || !doc.id) return;

    const docCode = (doc.template_code || doc.code || '').toUpperCase();
    const docTitle = (doc.doc_title || doc.title || '').toUpperCase();

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

    // A. Hapus dari database tabel resmi public.documents
    await supabase.from('documents').delete().eq('id', doc.id);

    // B. JIKA YANG DIHAPUS ADALAH SP.TAP TSK / PENETAPAN TERSANGKA:
    if (docCode.includes('TAP_TSK') || docTitle.includes('PENETAPAN TERSANGKA')) {
      if (doc.case_id) {
        // Reset di database case_suspects
        await supabase.from('case_suspects')
          .update({ nomor_sp_tap: null, no_sp_tap_tsk: null, tanggal_sp_tap: null, tgl_sp_tap: null, status: 'terlapor' })
          .eq('case_id', doc.case_id);
      }

      // Update state di memori React
      setCases(prev => prev.map(c => {
        if (String(c.id) === String(doc.case_id)) {
          const updatedSuspects = (c.suspects || []).map(s => ({
            ...s,
            nomor_sp_tap: null,
            no_sp_tap_tsk: null,
            tanggal_sp_tap: null,
            tgl_sp_tap: null,
            status: 'terlapor'
          }));
          const updatedTerlapor = (c.terlapor_list || []).map(s => ({
            ...s,
            nomor_sp_tap: null,
            no_sp_tap_tsk: null,
            tanggal_sp_tap: null,
            tgl_sp_tap: null,
            status: 'terlapor'
          }));
          return {
            ...c,
            suspects: updatedSuspects,
            terlapor_list: updatedTerlapor,
            references: {
              ...(c.references || {}),
              no_sp_tap_tsk: null,
              nomor_sp_tap: null,
              tanggal_sp_tap: null,
              tgl_sp_tap: null
            }
          };
        }
        return c;
      }));

      setSelectedCaseForDetail(prev => {
        if (!prev || String(prev.id) !== String(doc.case_id)) return prev;
        return {
          ...prev,
          suspects: (prev.suspects || []).map(s => ({ ...s, nomor_sp_tap: null, no_sp_tap_tsk: null, tanggal_sp_tap: null, tgl_sp_tap: null, status: 'terlapor' })),
          terlapor_list: (prev.terlapor_list || []).map(s => ({ ...s, nomor_sp_tap: null, no_sp_tap_tsk: null, tanggal_sp_tap: null, tgl_sp_tap: null, status: 'terlapor' })),
          references: { ...(prev.references || {}), no_sp_tap_tsk: null, nomor_sp_tap: null, tanggal_sp_tap: null, tgl_sp_tap: null }
        };
      });

      setCaseForGenerator(prev => {
        if (!prev || String(prev.id) !== String(doc.case_id)) return prev;
        return {
          ...prev,
          suspects: (prev.suspects || []).map(s => ({ ...s, nomor_sp_tap: null, no_sp_tap_tsk: null, tanggal_sp_tap: null, tgl_sp_tap: null, status: 'terlapor' })),
          terlapor_list: (prev.terlapor_list || []).map(s => ({ ...s, nomor_sp_tap: null, no_sp_tap_tsk: null, tanggal_sp_tap: null, tgl_sp_tap: null, status: 'terlapor' })),
          references: { ...(prev.references || {}), no_sp_tap_tsk: null, nomor_sp_tap: null, tanggal_sp_tap: null, tgl_sp_tap: null }
        };
      });

      setSuspectForGenerator(prev => {
        if (!prev) return prev;
        return typeof prev === 'object' 
          ? { ...prev, nomor_sp_tap: null, no_sp_tap_tsk: null, tanggal_sp_tap: null, tgl_sp_tap: null, status: 'terlapor' }
          : prev;
      });
    }

    // C. JIKA YANG DIHAPUS ADALAH SP.SIDIK / SPRIN.SIDIK:
    if (docCode.includes('SIDIK') && !docCode.includes('GAS') && !docCode.includes('TAMBAHAN')) {
      if (doc.case_id) {
        const targetCase = cases.find(c => String(c.id) === String(doc.case_id));
        const cleanedRefs = {
          ...(targetCase?.references || {}),
          no_sprin_sidik: null,
          no_sp_sidik: null,
          sprin_date: null,
          tgl_sprin_sidik: null,
          spgas_sidik: null,
          no_spgas_sidik: null,
          no_sp_gas_sidik: null,
          no_sprin_gas_sidik: null
        };
        await supabase.from('cases')
          .update({
            no_sprin_sidik: null,
            sprin_date: null,
            references: cleanedRefs,
            updated_at: new Date().toISOString()
          })
          .eq('id', doc.case_id);
      }
        
      setCases(prev => prev.map(c => {
        if (String(c.id) === String(doc.case_id)) {
          return {
            ...c,
            no_sprin_sidik: null,
            no_sp_sidik: null,
            sprin_date: null,
            tgl_sprin_sidik: null,
            no_sp_gas_sidik: null,
            no_sprin_gas_sidik: null,
            tgl_sp_gas_sidik: null,
            tgl_sprin_gas_sidik: null,
            references: {
              ...(c.references || {}),
              no_sprin_sidik: null,
              no_sp_sidik: null,
              sprin_date: null,
              tgl_sprin_sidik: null,
              no_spgas_sidik: null,
              no_sp_gas_sidik: null,
              no_sprin_gas_sidik: null
            }
          };
        }
        return c;
      }));

      setSelectedCaseForDetail(prev => {
        if (!prev || String(prev.id) !== String(doc.case_id)) return prev;
        return {
          ...prev,
          no_sprin_sidik: null,
          no_sp_sidik: null,
          sprin_date: null,
          tgl_sprin_sidik: null,
          no_sp_gas_sidik: null,
          no_sprin_gas_sidik: null,
          tgl_sp_gas_sidik: null,
          tgl_sprin_gas_sidik: null,
          references: { ...(prev.references || {}), no_sprin_sidik: null, no_sp_sidik: null, sprin_date: null, tgl_sprin_sidik: null, no_spgas_sidik: null, no_sp_gas_sidik: null, no_sprin_gas_sidik: null }
        };
      });

      setCaseForGenerator(prev => {
        if (!prev || String(prev.id) !== String(doc.case_id)) return prev;
        return {
          ...prev,
          no_sprin_sidik: null,
          no_sp_sidik: null,
          sprin_date: null,
          tgl_sprin_sidik: null,
          no_sp_gas_sidik: null,
          no_sprin_gas_sidik: null,
          tgl_sp_gas_sidik: null,
          tgl_sprin_gas_sidik: null,
          references: { ...(prev.references || {}), no_sprin_sidik: null, no_sp_sidik: null, sprin_date: null, tgl_sprin_sidik: null, no_spgas_sidik: null, no_sp_gas_sidik: null, no_sprin_gas_sidik: null }
        };
      });
    }

    // D. JIKA YANG DIHAPUS ADALAH SP.GAS.SIDIK:
    if (docCode.includes('GAS') && docCode.includes('SIDIK')) {
      if (doc.case_id) {
        const targetCase = cases.find(c => String(c.id) === String(doc.case_id));
        const cleanedRefs = {
          ...(targetCase?.references || {}),
          spgas_sidik: null,
          no_spgas_sidik: null,
          no_sp_gas_sidik: null,
          no_sprin_gas_sidik: null,
          tgl_sprin_gas_sidik: null
        };
        await supabase.from('cases')
          .update({
            references: cleanedRefs,
            updated_at: new Date().toISOString()
          })
          .eq('id', doc.case_id);
      }

      setCases(prev => prev.map(c => {
        if (String(c.id) === String(doc.case_id)) {
          return {
            ...c,
            no_sp_gas_sidik: null,
            no_sprin_gas_sidik: null,
            tgl_sp_gas_sidik: null,
            tgl_sprin_gas_sidik: null,
            references: {
              ...(c.references || {}),
              no_spgas_sidik: null,
              no_sp_gas_sidik: null,
              no_sprin_gas_sidik: null
            }
          };
        }
        return c;
      }));

      setSelectedCaseForDetail(prev => {
        if (!prev || String(prev.id) !== String(doc.case_id)) return prev;
        return {
          ...prev,
          no_sp_gas_sidik: null,
          no_sprin_gas_sidik: null,
          tgl_sp_gas_sidik: null,
          tgl_sprin_gas_sidik: null,
          references: { ...(prev.references || {}), no_spgas_sidik: null, no_sp_gas_sidik: null, no_sprin_gas_sidik: null }
        };
      });

      setCaseForGenerator(prev => {
        if (!prev || String(prev.id) !== String(doc.case_id)) return prev;
        return {
          ...prev,
          no_sp_gas_sidik: null,
          no_sprin_gas_sidik: null,
          tgl_sp_gas_sidik: null,
          tgl_sprin_gas_sidik: null,
          references: { ...(prev.references || {}), no_spgas_sidik: null, no_sp_gas_sidik: null, no_sprin_gas_sidik: null }
        };
      });
    }

    // D. Update state dokumen lokal & bersihkan cache
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    try { localStorage.removeItem('emindik_archive_documents'); } catch {}
    showToast(`Dokumen '${doc.doc_title || doc.title || 'Mindik'}' berhasil dihapus permanen!`);
  };

  const handleOpenGeneratorForCase = (caseItem, templateCode = null, suspectId = null) => {
    if (isSpktRole(userRole)) return;
    setCaseForGenerator(caseItem);
    if (templateCode) {
      setTemplateForGenerator(typeof templateCode === 'object' ? templateCode : { code: templateCode });
    } else {
      setTemplateForGenerator(null);
    }
    setSuspectForGenerator(suspectId || null);
    setActiveTab('generator');
  };

  const handleHandoverFromDumas = async (mappedCase) => {
    if (isSpktRole(userRole)) return;
    if (mappedCase) {
      const normalizedMapped = {
        ...mappedCase,
        nomor_lp: mappedCase.nomor_lp || mappedCase.no_lp || '',
        no_lp: mappedCase.no_lp || mappedCase.nomor_lp || ''
      };
      setCases((prev) => {
        const exists = prev.some(
          (c) =>
            String(c.id) === String(normalizedMapped.id) ||
            (normalizedMapped.dumas_id && String(c.dumas_id) === String(normalizedMapped.dumas_id)) ||
            (normalizedMapped.nomor_lp && isSameLpNumber(c.nomor_lp || c.no_lp, normalizedMapped.nomor_lp))
        );
        return exists ? prev : [normalizedMapped, ...prev];
      });
      setCaseForGenerator(normalizedMapped);

      // Simpan ke localStorage & promosi otomatis ke public.cases Supabase
      try {
        const currentLocalCases = JSON.parse(localStorage.getItem(CASES_LOCAL_STORAGE_KEY) || '[]');
        const nextLocalCases = [
          normalizedMapped,
          ...(Array.isArray(currentLocalCases) ? currentLocalCases.filter((x) => x.id !== normalizedMapped.id) : [])
        ];
        localStorage.setItem(CASES_LOCAL_STORAGE_KEY, JSON.stringify(nextLocalCases));
      } catch {}

      upsertCaseToSupabaseSafe(normalizedMapped).catch((err) => {
        console.warn('[App] Promosi Dumas ke public.cases notice:', err);
      });
    } else {
      setCaseForGenerator(mappedCase);
    }
    setActiveTab('generator');
    showToast(`Data perkara ${mappedCase?.nomor_lp || mappedCase?.no_lp || ''} siap diproses di Generator Mindik.`);
  };

  // Handler Sinkronisasi Manual dari tombol "Sinkronkan Data Lokal ke Database" di halaman Arsip Dokumen
  const handleManualSyncLocalToSupabase = async () => {
    if (isSpktRole(userRole)) return { totalSynced: 0 };
    try {
      const syncRes = await syncLocalDataToSupabase({
        existingServerCases: cases,
        existingServerDumas: dumasList,
        existingServerDocs: documents
      });
      setCases(syncRes.syncedCasesList);
      setDocuments((prev) => {
        const docMap = new Map();
        [...syncRes.syncedDocsList, ...prev].forEach((d) => {
          if (d && d.id && !docMap.has(d.id)) docMap.set(d.id, d);
        });
        return Array.from(docMap.values()).sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
        );
      });
      if (syncRes.totalSynced > 0) {
        showToast(
          `Berhasil memulihkan ${syncRes.syncedCasesCount} Berkas LP & ${syncRes.syncedDocsCount} Dokumen Arsip ke database Supabase!`
        );
      } else {
        showToast('Seluruh data lokal (Perkara, Dumas LP, dan Arsip Dokumen) sudah tersinkronisasi 100% dengan database Supabase.');
      }
      return syncRes;
    } catch (err) {
      console.error('[Manual Sync Error]:', err);
      alert(`Gagal menyinkronkan data lokal ke Supabase: ${err.message || err}`);
      return { totalSynced: 0, error: err };
    }
  };

  // Jaring Pengaman Re-Link Dokumen Arsip ke Laporan Polisi (READ / MERGE / RE-LINK ONLY - TANPA MENGHAPUS DATA)
  const handleRelinkDocumentToCase = async (doc, targetCase) => {
    if (isSpktRole(userRole)) return;
    if (!doc?.id || !targetCase?.id) return;

    const targetLp = targetCase.nomor_lp || targetCase.no_lp || '';
    const existingMeta = (doc.meta_values && typeof doc.meta_values === 'object') ? doc.meta_values : {};
    const updatedMetaValues = {
      ...existingMeta,
      nomor_lp: targetLp,
      NOMOR_LP: targetLp
    };

    try {
      const { error } = await supabase
        .from('documents')
        .update({
          case_id: String(targetCase.id),
          meta_values: updatedMetaValues
        })
        .eq('id', doc.id);

      if (error) {
        console.warn('[App] Notice saat re-link dokumen ke LP:', error.message);
      }
    } catch (err) {
      console.warn('[App] Exception saat re-link dokumen ke LP:', err);
    }

    setDocuments((prev) =>
      prev.map((d) => {
        if (d.id !== doc.id) return d;
        return {
          ...d,
          case_id: String(targetCase.id),
          nomor_lp: targetLp,
          no_lp: targetLp,
          meta_values: updatedMetaValues
        };
      })
    );

    try {
      const cached = JSON.parse(localStorage.getItem('emindik_archive_documents') || '[]');
      if (Array.isArray(cached) && cached.length > 0) {
        const updatedCache = cached.map((d) =>
          d.id === doc.id
            ? { ...d, case_id: String(targetCase.id), nomor_lp: targetLp, no_lp: targetLp, meta_values: updatedMetaValues }
            : d
        );
        localStorage.setItem('emindik_archive_documents', JSON.stringify(updatedCache));
      }
    } catch {}

    showToast(`Dokumen "${doc.doc_title || doc.title || 'Mindik'}" berhasil ditautkan ke ${targetLp}!`);
  };

  // --- SINKRONISASI & PEMULIHAN OTOMATIS PERKARA LP MODEL A & LP MODEL B (NON-DESTRUCTIVE MERGE) ---
  // Menggabungkan:
  // 1. Seluruh baris resmi dari public.cases (LP Model A maupun LP Model B)
  // 2. Baris dari dumasList (laporan_pengaduan) yang bernomor LP/A atau LP/B atau sudah memiliki dokumen arsip
  // 3. Rekonstruksi otomatis kartu perkara dari arsip public.documents (misal "LP A 2") jika induknya belum ada di state cases
  const allMergedCases = useMemo(() => {
    if (isSpktUser) return [];

    const result = [];
    const seenIds = new Set();

    const addOrMergeCase = (rawCase) => {
      if (!rawCase) return;
      const nomorLp = String(rawCase.nomor_lp || rawCase.no_lp || '').trim();
      const normalizedObj = {
        ...rawCase,
        id: String(rawCase.id || `recovered-case-${normalizeLpNumber(nomorLp) || Date.now()}`),
        nomor_lp: nomorLp,
        no_lp: String(rawCase.no_lp || rawCase.nomor_lp || nomorLp).trim()
      };

      const existingIdx = result.findIndex((existing) => {
        if (String(existing.id) === String(normalizedObj.id)) return true;
        const cleanExistingId = String(existing.id).replace(/^case-dumas-/, '');
        const cleanNewId = String(normalizedObj.id).replace(/^case-dumas-/, '');
        if (cleanExistingId && cleanNewId && cleanExistingId === cleanNewId) return true;
        if (existing.dumas_id && normalizedObj.dumas_id && String(existing.dumas_id) === String(normalizedObj.dumas_id)) return true;
        if (nomorLp && (existing.nomor_lp || existing.no_lp) && isSameLpNumber(existing.nomor_lp || existing.no_lp, nomorLp)) return true;
        return false;
      });

      if (existingIdx === -1) {
        seenIds.add(String(normalizedObj.id));
        result.push(normalizedObj);
      } else {
        // Perkaya field yang kosong tanpa menimpa data utama dari public.cases
        const current = result[existingIdx];
        result[existingIdx] = {
          ...normalizedObj,
          ...current,
          id: current.id,
          dumas_id: current.dumas_id || normalizedObj.dumas_id || null,
          nomor_lp: current.nomor_lp || normalizedObj.nomor_lp || current.no_lp || '',
          no_lp: current.no_lp || normalizedObj.no_lp || current.nomor_lp || '',
          nama_pelapor: (current.nama_pelapor && current.nama_pelapor !== '-') ? current.nama_pelapor : (normalizedObj.nama_pelapor || current.pelapor_name || '-'),
          pelapor_name: (current.pelapor_name && current.pelapor_name !== '-') ? current.pelapor_name : (normalizedObj.pelapor_name || current.nama_pelapor || '-'),
          nama_terlapor: (current.nama_terlapor && current.nama_terlapor !== '-') ? current.nama_terlapor : (normalizedObj.nama_terlapor || current.terlapor_name || '-'),
          terlapor_name: (current.terlapor_name && current.terlapor_name !== '-') ? current.terlapor_name : (normalizedObj.terlapor_name || current.nama_terlapor || '-'),
          tindak_pidana: (current.tindak_pidana && current.tindak_pidana !== '-') ? current.tindak_pidana : (normalizedObj.tindak_pidana || current.perkara || 'Tindak Pidana Umum')
        };
      }
    };

    // 1. Masukkan seluruh perkara dari public.cases
    (Array.isArray(cases) ? cases : []).forEach(addOrMergeCase);

    // 2. Periksa dumasList (laporan_pengaduan): masukkan jika merupakan Laporan Polisi (LP/A, LP A, LP/B, LP B)
    //    atau jika sudah memiliki dokumen mindik yang merujuk ke ID / Nomor LP-nya
    (Array.isArray(dumasList) ? dumasList : []).forEach((dItem) => {
      if (!dItem) return;
      const rawNo = String(dItem.nomor_lp || dItem.no_lp || '').trim();
      const isPoliceReportNumber = /^LP[\s/._:-]*(?:[AB]|\d)/i.test(rawNo);
      const hasLinkedDocs = (Array.isArray(documents) ? documents : []).some((doc) => {
        if (!doc) return false;
        const docCaseId = String(doc.case_id || '').trim();
        if (docCaseId && (docCaseId === String(dItem.id) || docCaseId === `case-dumas-${dItem.id}`)) return true;
        const docLp = doc.nomor_lp || doc.no_lp || doc.meta_values?.nomor_lp || doc.meta_values?.NOMOR_LP || '';
        return Boolean(rawNo && docLp && isSameLpNumber(docLp, rawNo));
      });

      if (isPoliceReportNumber || hasLinkedDocs) {
        const converted = convertDumasToCase(dItem);
        // Jika dokumen di public.documents disimpan menggunakan dItem.id langsung, selaraskan ID-nya
        const directIdUsedInDocs = (Array.isArray(documents) ? documents : []).some(
          (doc) => doc && String(doc.case_id) === String(dItem.id)
        );
        addOrMergeCase({
          ...converted,
          id: directIdUsedInDocs ? String(dItem.id) : converted.id,
          dumas_id: dItem.id
        });
      }
    });

    // 3. Rekonstruksi otomatis dari public.documents untuk LP (seperti "LP A 2") yang dokumennya ada di database
    //    tetapi belum memiliki baris induk di state cases
    const unlinkedGroups = new Map();
    (Array.isArray(documents) ? documents : []).forEach((doc) => {
      if (!doc) return;
      const alreadyMatched = result.some((c) => isDocumentLinkedToCase(doc, c));
      if (alreadyMatched) return;

      const mv = (doc.meta_values && typeof doc.meta_values === 'object') ? doc.meta_values : {};
      const docLp = String(
        doc.nomor_lp ||
        doc.no_lp ||
        mv.nomor_lp ||
        mv.NOMOR_LP ||
        mv.no_lp ||
        mv.NO_LP ||
        ''
      ).trim();
      const docCaseId = String(doc.case_id || mv.case_id || '').trim();

      // Hanya rekonstruksi kartu LP jika dokumen memiliki nomor_lp atau case_id
      const normLp = normalizeLpNumber(docLp);
      if (!normLp && !docCaseId) return;

      // Cari apakah sudah ada grup yang cocok berdasarkan case_id atau isSameLpNumber
      let matchedGroupKey = null;
      for (const [gKey, gVal] of unlinkedGroups.entries()) {
        if (docCaseId && gVal.caseIds.has(docCaseId)) {
          matchedGroupKey = gKey;
          break;
        }
        if (docLp && gVal.nomorLp && isSameLpNumber(docLp, gVal.nomorLp)) {
          matchedGroupKey = gKey;
          break;
        }
      }

      if (!matchedGroupKey) {
        matchedGroupKey = normLp ? `lp:${normLp}` : `id:${docCaseId}`;
        unlinkedGroups.set(matchedGroupKey, {
          nomorLp: docLp,
          caseIds: new Set(docCaseId ? [docCaseId] : []),
          docs: []
        });
      }

      const grp = unlinkedGroups.get(matchedGroupKey);
      if (docCaseId) grp.caseIds.add(docCaseId);
      if (docLp && (!grp.nomorLp || docLp.length > grp.nomorLp.length)) {
        grp.nomorLp = docLp;
      }
      grp.docs.push(doc);
    });

    for (const grp of unlinkedGroups.values()) {
      const docsInGroup = grp.docs;
      if (docsInGroup.length === 0) continue;

      // Ambil metadata terkaya dari kumpulan dokumen LP tersebut
      const firstCaseId = Array.from(grp.caseIds)[0] || `recovered-case-${normalizeLpNumber(grp.nomorLp) || Date.now()}`;
      const recoveredLp = grp.nomorLp || firstCaseId;

      let tanggalLp = '';
      let namaPelapor = '';
      let namaTerlapor = '';
      let tindakPidana = '';
      let pasal = '';
      let locus = '';
      let tempus = '';
      let kasatNama = '';
      let kasatPangkat = '';
      let kasatNrp = '';
      let penyidik1Nama = '';
      let penyidik1Pangkat = '';
      let penyidik1Nrp = '';
      let penyidik1Jabatan = '';
      let noSprinSidik = '';
      let tglSprinSidik = '';
      let noSpdp = '';
      const recoveredSuspects = [];

      docsInGroup.forEach((d) => {
        const mv = (d.meta_values && typeof d.meta_values === 'object') ? d.meta_values : {};
        if (!tanggalLp) tanggalLp = mv.TANGGAL_LP || mv.tanggal_lp || mv.TGL_LP || '';
        if (!namaPelapor) namaPelapor = mv.NAMA_PELAPOR || mv.PELAPOR_NAMA || mv.nama_pelapor || '';
        if (!namaTerlapor) {
          namaTerlapor =
            mv.NAMA_TERSANGKA ||
            mv.TERSANGKA_NAMA ||
            mv.NAMA_TERLAPOR ||
            mv.TERLAPOR_NAMA ||
            mv.target_suspect_name ||
            mv.target_subject_name ||
            '';
        }
        if (!tindakPidana) {
          tindakPidana =
            mv.TINDAK_PIDANA ||
            mv.PERKARA ||
            mv.URAIAN_SINGKAT_KEJADIAN ||
            mv.tindak_pidana ||
            '';
        }
        if (!pasal) pasal = mv.PASAL || mv.PASAL_UU || mv.PASAL_DILANGGAR || mv.pasal || '';
        if (!locus) locus = mv.TEMPAT_KEJADIAN || mv.TKP || mv.LOCUS || mv.locus || '';
        if (!tempus) tempus = mv.WAKTU_KEJADIAN || mv.TEMPUS || mv.tempus || '';
        if (!kasatNama) kasatNama = mv.KASAT_NAMA || mv.ATASAN_NAMA || '';
        if (!kasatPangkat) kasatPangkat = mv.KASAT_PANGKAT || mv.ATASAN_PANGKAT || '';
        if (!kasatNrp) kasatNrp = mv.KASAT_NRP || mv.ATASAN_NRP || '';
        if (!penyidik1Nama) penyidik1Nama = mv.PENYIDIK_1_NAMA || mv.PENYIDIK_PENANGAN_NAMA || mv.PENYIDIK_NAMA || '';
        if (!penyidik1Pangkat) penyidik1Pangkat = mv.PENYIDIK_1_PANGKAT || mv.PENYIDIK_PENANGAN_PANGKAT || mv.PENYIDIK_PANGKAT || '';
        if (!penyidik1Nrp) penyidik1Nrp = mv.PENYIDIK_1_NRP || mv.PENYIDIK_PENANGAN_NRP || mv.PENYIDIK_NRP || '';
        if (!penyidik1Jabatan) penyidik1Jabatan = mv.PENYIDIK_1_JABATAN || mv.PENYIDIK_PENANGAN_JABATAN || mv.PENYIDIK_JABATAN || '';
        if (!noSprinSidik) {
          if (d.template_code === 'SPRIN_SIDIK' && d.doc_number && d.doc_number !== '-') {
            noSprinSidik = d.doc_number;
            tglSprinSidik = d.tgl_surat || mv.TANGGAL_SURAT || '';
          } else {
            noSprinSidik = mv.NO_SPRIN_SIDIK || mv.NOMOR_SPRIN_SIDIK || '';
            tglSprinSidik = mv.TGL_SPRIN_SIDIK || mv.TANGGAL_SPRIN_SIDIK || '';
          }
        }
        if (!noSpdp && String(d.template_code || '').startsWith('SPDP') && d.doc_number && d.doc_number !== '-') {
          noSpdp = d.doc_number;
        }
        if (Array.isArray(mv.suspect_data)) {
          mv.suspect_data.forEach((s) => {
            if (s && (s.nama || s.name)) recoveredSuspects.push(s);
          });
        } else if (Array.isArray(mv.TERSANGKA)) {
          mv.TERSANGKA.forEach((s) => {
            if (s && (s.nama || s.NAMA)) {
              recoveredSuspects.push({
                nama: s.nama || s.NAMA,
                nik: s.nik || s.NIK || '-',
                jenis_kelamin: s.jenis_kelamin || s.JENIS_KELAMIN || 'Laki-laki',
                tempat_lahir: s.tempat_lahir || s.TEMPAT_LAHIR || 'Kolaka Timur',
                tgl_lahir: s.tgl_lahir || s.TANGGAL_LAHIR || null,
                agama: s.agama || s.AGAMA || 'Islam',
                pekerjaan: s.pekerjaan || s.PEKERJAAN || 'Wiraswasta',
                kewarganegaraan: s.kewarganegaraan || s.KEWARGANEGARAAN || 'Indonesia',
                alamat: s.alamat || s.ALAMAT || '',
                status: 'tersangka'
              });
            }
          });
        }
      });

      const earliestCreatedAt = docsInGroup
        .map((d) => d.created_at)
        .filter(Boolean)
        .sort()[0] || new Date().toISOString();

      const isLpModelA = /^LP[\s/._:-]*A\b/i.test(recoveredLp);

      addOrMergeCase({
        id: firstCaseId,
        nomor_lp: recoveredLp,
        no_lp: recoveredLp,
        jenis_lp: isLpModelA ? 'LP Model A' : 'LP Model B',
        tanggal_lp: tanggalLp || earliestCreatedAt.split('T')[0],
        nama_pelapor: namaPelapor || (isLpModelA ? 'Petugas Polri (LP Model A)' : '-'),
        pelapor_name: namaPelapor || (isLpModelA ? 'Petugas Polri (LP Model A)' : '-'),
        nama_terlapor: namaTerlapor || recoveredSuspects[0]?.nama || 'Dalam Penyidikan',
        terlapor_name: namaTerlapor || recoveredSuspects[0]?.nama || 'Dalam Penyidikan',
        tindak_pidana: tindakPidana || 'Tindak Pidana Umum',
        perkara: tindakPidana || 'Tindak Pidana Umum',
        pasal: pasal || '',
        pasal_uu: pasal || '',
        dasar_pasal_uu: pasal || '',
        locus: locus || 'Wilayah Hukum Polres Kolaka Timur',
        tempus: tempus || '-',
        kasat_nama: kasatNama || 'IPTU Wahyu Hidayat, S.H.',
        kasat_pangkat: kasatPangkat || 'IPTU',
        kasat_nrp: kasatNrp || '',
        penyidik_1_nama: penyidik1Nama || '',
        penyidik_1_pangkat: penyidik1Pangkat || '',
        penyidik_1_nrp: penyidik1Nrp || '',
        penyidik_1_jabatan: penyidik1Jabatan || 'Penyidik Pembantu',
        penyidik_penangan_index: 1,
        no_sprin_sidik: noSprinSidik || null,
        tgl_sprin_sidik: tglSprinSidik || null,
        sprin_date: tglSprinSidik || tanggalLp || earliestCreatedAt.split('T')[0],
        no_spdp: noSpdp || null,
        status: 'Sidik',
        created_at: earliestCreatedAt,
        terlapor_list: recoveredSuspects,
        tersangka_list: recoveredSuspects.filter((s) => s.status === 'tersangka' || !s.status),
        references: {
          no_sprin_sidik: noSprinSidik || '',
          tgl_sprin_sidik: tglSprinSidik || '',
          no_spdp: noSpdp || '',
          terlapor_list: recoveredSuspects,
          tersangka_list: recoveredSuspects
        }
      });
    }

    return result;
  }, [cases, dumasList, documents, isSpktUser]);

  // Handle Public Mobile Upload Route (Dibuka langsung dari pemindaian kamera HP - Tanpa Perlu Login)
  if (typeof window !== 'undefined' && (window.location.pathname === '/mobile-upload' || window.location.pathname.startsWith('/mobile-upload'))) {
    return <MobileUploadView />;
  }

  // Loading state during auth check
  if (isAuthChecking) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        backgroundColor: '#0B0E14',
        backgroundImage: 'radial-gradient(circle at 80% 12%, rgba(220, 38, 38, 0.22) 0%, rgba(255, 42, 42, 0.08) 35%, #0B0E14 75%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        color: '#FF2A2A',
        fontFamily: 'Orbitron, Inter, sans-serif',
      }}>
        <RefreshCw size={32} className="animate-spin" />
        <div style={{ fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600, color: '#CBD5E1' }}>
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
    <div 
      className="app-container relative min-h-screen flex"
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        backgroundColor: '#0B0E14',
        backgroundImage: 'radial-gradient(circle at 80% 12%, rgba(220, 38, 38, 0.22) 0%, rgba(255, 42, 42, 0.08) 35%, #0B0E14 75%)',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Interactive Cursor Spotlight Overlay (01 // Midnight Crimson Radial Bloom) */}
      <div
        ref={spotlightRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          transition: 'background 0.08s linear',
        }}
      />

      {/* Watermark Insignia Satreskrim */}
      <div 
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
      >
        <img
          src="/logo-satreskrim-koltim.png"
          alt="Watermark Satreskrim"
          className="w-[480px] md:w-[560px] opacity-[0.05] grayscale filter select-none pointer-events-none"
          style={{
            width: '520px',
            maxWidth: '65vw',
            opacity: 0.05,
            filter: 'grayscale(100%)',
            userSelect: 'none',
            pointerEvents: 'none'
          }}
        />
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          background: '#11161F',
          border: '1px solid #FF2A2A',
          boxShadow: '0 8px 28px rgba(255, 42, 42, 0.32)',
          borderRadius: '9999px',
          padding: '12px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#FFFFFF',
          fontSize: '13px',
          fontWeight: 600,
          animation: 'slideInRight 250ms ease-out',
        }}>
          <CheckCircle2 size={18} color="#FF2A2A" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Expanding Sidebar Navigation with 4-tier Role-based filtering */}
      <ExpandingSidebar
        activeTab={isSpktUser ? 'dumas' : activeTab}
        setActiveTab={handleNavigateTab}
        caseCount={allMergedCases.length}
        dumasCount={dumasList.length}
        docCount={documents.length}
        personnelCount={personnel.length}
        userRole={userRole}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
      />

      {/* Main Content Area */}
      <div 
        className="app-main relative z-10 flex-1 min-w-0 overflow-y-auto"
        style={{
          position: 'relative',
          zIndex: 10,
          flex: 1,
          minWidth: 0,
          overflowY: 'auto'
        }}
      >
        <Navbar
          onNewCase={() => {
            if (!isSpktUser) setIsNewCaseModalOpen(true);
          }}
          onNewDoc={() => {
            if (isSpktUser) return;
            setCaseForGenerator(null);
            handleNavigateTab('generator');
          }}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          currentUserProfile={currentUserProfile}
          userRole={userRole}
          onLogout={handleLogout}
          onOpenUserManagement={() => setIsUserManagementOpen(true)}
        />

        <main className="main-content">
          {!isSpktUser && activeTab === 'dashboard' && (
            <DashboardView
              cases={allMergedCases}
              documents={documents}
              personnel={personnel}
              onSelectCase={(c) => setSelectedCaseForDetail(c)}
              onNewCase={() => setIsNewCaseModalOpen(true)}
              onOpenGenerator={(c) => handleOpenGeneratorForCase(c)}
              onViewDoc={(doc) => setSelectedDocForPreview(doc)}
            />
          )}

          {(activeTab === 'dumas' || isSpktUser) && (
            <div className="w-full h-full overflow-y-auto">
              {DumasView ? (
                <DumasView
                  dumasList={dumasList}
                  setDumasList={setDumasList}
                  currentUserProfile={currentUserProfile}
                  userRole={userRole}
                  isSpkt={isSpktUser}
                  onHandoverToGenerator={isSpktUser ? undefined : handleHandoverFromDumas}
                  onShowToast={showToast}
                />
              ) : DumasFormView ? (
                <div className="w-full h-full p-6 text-white overflow-y-auto">
                  <DumasFormView />
                </div>
              ) : (
                <div className="w-full h-full p-6 text-white overflow-y-auto">
                  <div style={{ padding: '16px', background: 'rgba(255, 42, 42, 0.14)', border: '1px solid #FF2A2A', borderRadius: '12px', color: '#CBD5E1' }}>
                    Komponen DumasFormView tidak terdefinisi (undefined component). Periksa file import di App.jsx.
                  </div>
                </div>
              )}
            </div>
          )}

          {!isSpktUser && activeTab === 'cases' && (
            <CasesView
              cases={allMergedCases}
              personnel={personnel}
              userRole={userRole}
              onSelectCase={(c) => setSelectedCaseForDetail(c)}
              onNewCase={() => setIsNewCaseModalOpen(true)}
              onGenerateDocForCase={(c) => handleOpenGeneratorForCase(c)}
              onDeleteCase={handleDeleteCase}
              onUpdateCase={handleUpdateCase}
            />
          )}

          {!isSpktUser && activeTab === 'generator' && (
            <MindikGeneratorView
              cases={allMergedCases}
              personnel={personnel}
              userRole={userRole}
              initialCase={caseForGenerator}
              initialTemplate={templateForGenerator}
              initialSuspectId={suspectForGenerator}
              onSaveDocument={handleSaveDocument}
              onOpenTemplateStudio={() => handleNavigateTab('admin-templates')}
            />
          )}

          {!isSpktUser && activeTab === 'archives' && (
            <ArchivesView
              documents={documents}
              personnel={personnel}
              cases={allMergedCases}
              onPreviewDoc={(doc) => setSelectedDocForPreview(doc)}
              onDeleteDoc={handleDeleteDocument}
              onOpenGenerator={(c) => handleOpenGeneratorForCase(c)}
              onRelinkDoc={handleRelinkDocumentToCase}
              onSyncLocalToDatabase={handleManualSyncLocalToSupabase}
            />
          )}

          {!isSpktUser && activeTab === 'personnel' && userRole === 'super_admin' && (
            <PersonnelView
              cases={allMergedCases}
              personnel={personnel}
              userRole={userRole}
              onAddPersonnel={handleAddPersonnel}
              onDeletePersonnel={handleDeletePersonnel}
              onUpdatePersonnel={handleUpdatePersonnel}
            />
          )}

          {!isSpktUser && activeTab === 'admin-templates' && userRole === 'super_admin' && (
            <AdminTemplateStudio
              userRole={userRole}
              onTemplateSaved={(newTpl) => {
                showToast(`Template ${newTpl.title} berhasil diunggah ke Supabase!`);
              }}
              onSelectTemplateForGenerator={(tpl) => {
                setTemplateForGenerator(tpl);
                handleNavigateTab('generator');
              }}
            />
          )}
        </main>
      </div>

      {/* Case Detail Dossier Modal */}
      {!isSpktUser && selectedCaseForDetail && (
        <CaseDetailModal
          caseItem={selectedCaseForDetail}
          personnel={personnel}
          onClose={() => setSelectedCaseForDetail(null)}
          onGenerateDocForCase={(c, tpl, suspId) => handleOpenGeneratorForCase(c, tpl, suspId)}
          onUpdateCase={handleUpdateCase}
          caseDocuments={documents.filter((d) => isDocumentLinkedToCase(d, selectedCaseForDetail))}
        />
      )}

      {/* New Case Registration Modal */}
      {!isSpktUser && isNewCaseModalOpen && (
        <NewCaseModal
          onClose={() => setIsNewCaseModalOpen(false)}
          onAddCase={handleAddCase}
          personnel={personnel}
        />
      )}

      {/* Document View / Print Modal */}
      {!isSpktUser && selectedDocForPreview && (
        <DocPreviewModal
          docItem={selectedDocForPreview}
          cases={allMergedCases}
          onClose={() => setSelectedDocForPreview(null)}
        />
      )}

      {/* User / RBAC Role Management Modal (Khusus Super Admin) */}
      {!isSpktUser && userRole === 'super_admin' && (
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
      )}
    </div>
  );
}


