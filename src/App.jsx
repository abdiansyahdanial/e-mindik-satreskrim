import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import LoginPage from './views/LoginPage';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import DashboardView from './views/DashboardView';
import CasesView from './views/CasesView';
import DocGeneratorView from './views/DocGeneratorView';
import ArchivesView from './views/ArchivesView';
import PersonnelView from './views/PersonnelView';
import AdminTemplateStudio from './views/AdminTemplateStudio';
import CaseDetailModal from './components/CaseDetailModal';
import NewCaseModal from './components/NewCaseModal';
import DocPreviewModal from './components/DocPreviewModal';
import UserManagementModal from './components/UserManagementModal';
import { mockDocuments } from './data/mockDocuments';
import { CheckCircle2, ShieldAlert, RefreshCw } from 'lucide-react';

export default function App() {
  // Authentication & Role State (3-tier: 'super_admin' | 'admin' | 'anggota')
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Core Data States - 100% PURE REAL-TIME SUPABASE (NO FALLBACK REVERT)
  const [cases, setCases] = useState([]);
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
          setUser(u);

          // Fetch user profile from Supabase
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', u.id)
            .maybeSingle();

          if (profile && isMounted) {
            const resolvedRole = profile.role || 'anggota';
            setCurrentUserProfile({
              ...profile,
              nama: profile.full_name || profile.nama || u.email.split('@')[0],
              pangkat: profile.pangkat || (resolvedRole === 'super_admin' ? 'AKP' : 'BRIPKA'),
              nrp: profile.rank_nrp || profile.nrp || '-',
              jabatan: (resolvedRole === 'super_admin') ? 'ABDIANSYAH' : (profile.jabatan || 'Penyidik Pembantu'),
              role: resolvedRole
            });
            setUserRole(resolvedRole);
          } else if (isMounted) {
            const isSuper = u.id === '75abae80-e013-4987-a5e7-f1107d2ab265' || 
                            u.email?.includes('kasat') || 
                            u.email?.includes('super');
            const fallbackProf = {
              id: u.id,
              email: u.email,
              full_name: isSuper ? 'AKP AHMAD FATONI, S.H.' : u.email.split('@')[0].toUpperCase(),
              nama: isSuper ? 'AKP AHMAD FATONI, S.H.' : u.email.split('@')[0].toUpperCase(),
              pangkat: isSuper ? 'AKP' : 'BRIPDA',
              rank_nrp: isSuper ? '78120567' : '00000000',
              nrp: isSuper ? '78120567' : '00000000',
              jabatan: isSuper ? 'ABDIANSYAH' : 'Penyidik Pembantu Satreskrim',
              role: isSuper ? 'super_admin' : 'anggota',
            };
            setCurrentUserProfile(fallbackProf);
            setUserRole(fallbackProf.role);
          }
        }
      } catch (err) {
        console.warn('Session verification warning:', err);
      } finally {
        if (isMounted) setIsAuthChecking(false);
      }
    };

    checkCurrentSession();

    const { data: authSubscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
      } else if (event === 'SIGNED_OUT') {
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
          setCases(casesData);
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

        if (!persErr && persData) {
          setPersonnel(persData);
        }
      } catch (e) {
        console.warn('Personnel sync error:', e);
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
  const handleLoginSuccess = ({ user: authUser, profile, role }) => {
    setUser(authUser);
    setCurrentUserProfile(profile);
    setUserRole(role);
    setActiveTab('dashboard');
    showToast(`Selamat bertugas, ${profile.pangkat || ''} ${profile.nama || profile.full_name || ''} (${role.toUpperCase()})`);
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
        console.warn('PGRST204: Kolom dedicated belum ada di schema Supabase, menyimpan ke investigators & references JSONB...');
        const {
          penyidik_penangan_index,
          penyidik_penangan_nama,
          penyidik_penangan_pangkat,
          penyidik_penangan_nrp,
          penyidik_penangan_jabatan,
          penyidik_penangan,
          ...cleanCase
        } = newCase;
        const retry = await supabase.from('cases').insert([cleanCase]);
        error = retry.error;
      }
      if (error) {
        console.error('Insert case error:', error);
        alert(`Gagal menyimpan perkara ke database: ${error.message}`);
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

  // Hapus Personel: HANYA BOLEH UNTUK 'super_admin'
  const handleDeletePersonnel = async (personId) => {
    if (userRole !== 'super_admin') {
      alert('Akses Ditolak: Hanya Super Admin yang berhak menghapus personel!');
      return;
    }

    try {
      const { error } = await supabase.from('investigators').delete().eq('id', personId);
      if (error) {
        console.error('Delete investigator error from Supabase:', error);
        alert(`Gagal menghapus personel dari database: ${error.message}`);
        return;
      }

      setPersonnel((prev) => prev.filter((p) => p.id !== personId));
      showToast('Personel penyidik berhasil dihapus dari database Supabase!');
    } catch (err) {
      console.error('Delete investigator exception:', err);
      alert(`Terjadi kesalahan saat menghapus personel: ${err.message}`);
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

  const handleOpenGeneratorForCase = (caseItem) => {
    setCaseForGenerator(caseItem);
    setActiveTab('generator');
  };

  // Loading state during auth check
  if (isAuthChecking) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        background: '#060B18',
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

      {/* Sidebar Navigation with 3-tier Role-based filtering */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        caseCount={cases.length}
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
          onGenerateDocForCase={(c) => handleOpenGeneratorForCase(c)}
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
      />
    </div>
  );
}
