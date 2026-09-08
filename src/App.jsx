import React, { useState, useEffect } from 'react';
import { mockCases } from './data/mockCases';
import { mockDocuments } from './data/mockDocuments';
import { mockPersonnel } from './data/mockPersonnel';
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
import { CheckCircle2, ShieldAlert, RefreshCw } from 'lucide-react';

export default function App() {
  // Authentication & Role State
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'super_admin' | 'admin'
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Core Data States
  const [cases, setCases] = useState(mockCases);
  const [personnel, setPersonnel] = useState(mockPersonnel);
  const [documents, setDocuments] = useState(mockDocuments);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Modal States
  const [selectedCaseForDetail, setSelectedCaseForDetail] = useState(null);
  const [caseForGenerator, setCaseForGenerator] = useState(null);
  const [templateForGenerator, setTemplateForGenerator] = useState(null);
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState(null);
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
            setCurrentUserProfile(profile);
            setUserRole(profile.role || 'admin');
          } else if (isMounted) {
            const isSuper = u.email?.includes('kasat') || u.email?.includes('super');
            const fallbackProf = {
              id: u.id,
              email: u.email,
              nama: isSuper ? 'AKP AHMAD FATONI, S.H.' : 'BRIPKA DEDI PRASETYO, S.H.',
              pangkat: isSuper ? 'AKP' : 'BRIPKA',
              nrp: isSuper ? '78120567' : '88110543',
              jabatan: isSuper ? 'Kepala Satuan Reserse Kriminal (Kasat)' : 'Penyidik Pembantu Unit 1',
              role: isSuper ? 'super_admin' : 'admin',
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

  // 2. Fetch Supabase Data (Cases, Personnel, Documents)
  useEffect(() => {
    if (!user) return;

    const loadSupabaseData = async () => {
      // Cases
      try {
        const { data: casesData, error: casesErr } = await supabase
          .from('cases')
          .select('*')
          .order('created_at', { ascending: false });
        if (!casesErr && casesData && casesData.length > 0) {
          setCases(casesData);
        }
      } catch (e) {
        console.warn('Cases sync fallback:', e);
      }

      // Personnel
      try {
        const { data: persData, error: persErr } = await supabase
          .from('investigators')
          .select('*')
          .order('nama', { ascending: true });
        if (!persErr && persData && persData.length > 0) {
          setPersonnel(persData);
        }
      } catch (e) {
        console.warn('Personnel sync fallback:', e);
      }

      // Documents
      try {
        const { data: docData, error: docErr } = await supabase
          .from('documents')
          .select('*')
          .order('created_at', { ascending: false });
        if (!docErr && docData && docData.length > 0) {
          setDocuments(docData);
        }
      } catch (e) {
        console.warn('Documents sync fallback:', e);
      }
    };

    loadSupabaseData();
  }, [user]);

  // 3. Protected Routes Guard for Admin vs Super Admin
  useEffect(() => {
    if (userRole === 'admin' && (activeTab === 'personnel' || activeTab === 'admin-templates')) {
      setActiveTab('dashboard');
      showToast('Akses dibatasi: Menu khusus Super Admin Satreskrim.');
    }
  }, [userRole, activeTab]);

  // Handlers
  const handleLoginSuccess = ({ user: authUser, profile, role }) => {
    setUser(authUser);
    setCurrentUserProfile(profile);
    setUserRole(role);
    setActiveTab('dashboard');
    showToast(`Selamat bertugas, ${profile.pangkat} ${profile.nama} (${role === 'super_admin' ? 'SUPER ADMIN' : 'PENYIDIK / ADMIN'})`);
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
    showToast(`Perkara ${newCase.no_lp} berhasil diregistrasi!`);

    try {
      await supabase.from('cases').insert([newCase]);
    } catch (err) {
      console.warn('Insert case notice:', err);
    }
  };

  const handleDeleteCase = async (caseId) => {
    if (userRole !== 'super_admin') {
      alert('Akses Ditolak: Hanya Super Admin (Kasat/Kaur) yang berhak menghapus berkas perkara!');
      return;
    }

    setCases((prev) => prev.filter((c) => c.id !== caseId));
    setDocuments((prev) => prev.filter((d) => d.case_id !== caseId));
    showToast('Berkas perkara dan riwayat mindik berhasil dihapus!');

    try {
      await supabase.from('cases').delete().eq('id', caseId);
      await supabase.from('documents').delete().eq('case_id', caseId);
    } catch (err) {
      console.warn('Delete case notice:', err);
    }
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
      await supabase.from('investigators').insert([personWithId]);
    } catch (err) {
      console.warn('Insert investigator notice:', err);
    }
  };

  const handleDeletePersonnel = async (personId) => {
    if (userRole !== 'super_admin') return;

    setPersonnel((prev) => prev.filter((p) => p.id !== personId));
    showToast('Personel penyidik berhasil dinonaktifkan/dihapus!');

    try {
      await supabase.from('investigators').delete().eq('id', personId);
    } catch (err) {
      console.warn('Delete investigator notice:', err);
    }
  };

  const handleSaveDocument = async (newDoc) => {
    setDocuments((prev) => [newDoc, ...prev]);
    showToast(`Dokumen ${newDoc.doc_title || 'Mindik'} berhasil disimpan ke arsip!`);

    try {
      await supabase.from('documents').insert([newDoc]);
    } catch (err) {
      console.warn('Insert document notice:', err);
    }
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

  // Not authenticated -> Show Tactical Cyber LoginPage
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

      {/* Sidebar Navigation with Role-based filtering */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        caseCount={cases.length}
        docCount={documents.length}
        personnelCount={personnel.length}
        userRole={userRole}
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
          onClose={() => setSelectedCaseForDetail(null)}
          onGenerateDocForCase={(c) => handleOpenGeneratorForCase(c)}
          caseDocuments={documents.filter((d) => d.case_id === selectedCaseForDetail.id)}
        />
      )}

      {/* New Case Registration Modal with dynamic personnel slot 1-5 */}
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
    </div>
  );
}
