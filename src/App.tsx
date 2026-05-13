import { lazy, Suspense, useEffect, useState } from 'react';
import { Toaster } from './components/ui/sonner';
import { ChatbotButton } from './components/ChatbotButton';
import { applyAuthHeaders, setupAuthFetch } from './utils/authHeaders';
import { clearAllCache } from './utils/fetchCache';

// Carga diferida — el bundle inicial solo incluye LoginScreen
const LoginScreen = lazy(() => import('./components/LoginScreen').then(m => ({ default: m.LoginScreen })));
const AdminRegisterScreen = lazy(() => import('./components/AdminRegisterScreen').then(m => ({ default: m.AdminRegisterScreen })));
const DashboardScreen = lazy(() => import('./components/DashboardScreen').then(m => ({ default: m.DashboardScreen })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const ThemeManagementScreen = lazy(() => import('./components/ThemeManagementScreen').then(m => ({ default: m.ThemeManagementScreen })));
const ContentManagementScreen = lazy(() => import('./components/ContentManagementScreen').then(m => ({ default: m.ContentManagementScreen })));
const ReportsScreen = lazy(() => import('./components/ReportsScreen').then(m => ({ default: m.ReportsScreen })));
const StudentTrackingScreen = lazy(() => import('./components/StudentTrackingScreen').then(m => ({ default: m.StudentTrackingScreen })));
const SubjectContentScreen = lazy(() => import('./components/SubjectContentScreen').then(m => ({ default: m.SubjectContentScreen })));
const ProgrammingContentView = lazy(() => import('./components/ProgrammingContentView').then(m => ({ default: m.ProgrammingContentView })));
const ProgrammingMiniproyectoView = lazy(() => import('./components/ProgrammingMiniproyectoView').then(m => ({ default: m.ProgrammingMiniproyectoView })));
const ConfigurableMiniproyectoView = lazy(() => import('./components/ConfigurableMiniproyectoView').then(m => ({ default: m.ConfigurableMiniproyectoView })));
const TheoryContentView = lazy(() => import('./components/TheoryContentView').then(m => ({ default: m.TheoryContentView })));
const QuizActivityView = lazy(() => import('./components/QuizActivityView').then(m => ({ default: m.QuizActivityView })));
const UMLDiagramView = lazy(() => import('./components/UMLDiagramView').then(m => ({ default: m.UMLDiagramView })));
const AIWorkshopView = lazy(() => import('./components/AIWorkshopView').then(m => ({ default: m.AIWorkshopView })));
const ChangePasswordScreen = lazy(() => import('./components/changePassword').then(m => ({ default: m.ChangePasswordScreen })));
const ForgotPasswordScreen = lazy(() => import('./components/ForgotPasswordScreen').then(m => ({ default: m.ForgotPasswordScreen })));
const ResetPasswordScreen = lazy(() => import('./components/ResetPasswordScreen').then(m => ({ default: m.ResetPasswordScreen })));
const StudentUploadScreen = lazy(() => import('./components/StudentUploadScreen').then(m => ({ default: m.StudentUploadScreen })));
const SequenceManagementScreen = lazy(() => import('./components/SequenceManagementScreen').then(m => ({ default: m.SequenceManagementScreen })));
const SubtemaSequenceManagementScreen = lazy(() => import('./components/SubtemaSequenceManagementScreen').then(m => ({ default: m.SubtemaSequenceManagementScreen })));
const DocenteDashboard = lazy(() => import('./components/DocenteDashboard').then(m => ({ default: m.DocenteDashboard })));
const DocenteAsignaturaManagementScreen = lazy(() => import('./components/DocenteAsignaturaManagementScreen').then(m => ({ default: m.DocenteAsignaturaManagementScreen })));

type Screen =
  | 'login'
  | 'admin-register'
  | 'dashboard'
  | 'change-password'
  | 'forgot-password'
  | 'reset-password'
  | 'admin-dashboard'
  | 'admin-themes'
  | 'admin-contents'
  | 'admin-reports'
  | 'admin-students'
  | 'subject-content'
  | 'programming-content'
  | 'programming-miniproyecto'
  | 'configurable-miniproyecto'
  | 'theory-content'
  | 'quiz-activity'
  | 'uml-diagram'
  | 'admin-upload'
  | 'admin-sequences'
  | 'admin-subtema-sequences'
  | 'ai-workshop'
  | 'docente-dashboard'
  | 'docente-asignatura-management';

interface UserSession {
  id: number;
  personaId: number;
  nombre: string;
  codigo: string;
}

interface DocenteSession {
  id: number;
  personaId: number;
  nombre: string;
  email: string;
  especialidad: string;
  asignaturaId?: number;
  asignaturaNombre?: string;
}

interface AdminSession {
  id: number;
  personaId: number;
  nombre: string;
  email: string;
}

interface Subject {
  id: string;
  name: string;
  progresion_secuencial?: boolean;
  tipoPilar?: 'PROGRAMACION' | 'ANALISIS' | 'ATC' | null;
}

interface Content {
  id: string;
  title: string;
  type: 'video' | 'document' | 'activity' | 'quiz' | 'uml' | 'workshop';
  duration?: string;
  status?: 'completed' | 'in-progress' | 'not-started';
  isMiniproyecto?: boolean;
  actividadId?: number;
  asignaturaId?: number;
  asignaturaNombre?: string;
  tipoPilar?: 'PROGRAMACION' | 'ANALISIS' | 'ATC' | null;
  miniproyectoMode?: 'legacy' | 'configurable';
}

export default function App() {
  const APP_NAV_STATE_KEY = 'appNavigationState';
  const APP_ROLE_KEY = 'appActiveRole';
  const DOCENTE_SESSION_KEY = 'docenteSession';
  const ADMIN_SESSION_KEY = 'adminSession';

  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [selectedTemaId, setSelectedTemaId] = useState<string | null>(null);
  const [selectedSubtemaId, setSelectedSubtemaId] = useState<number | null>(null);
  const [previousScreen, setPreviousScreen] = useState<Screen | null>(null);
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [docenteSession, setDocenteSession] = useState<DocenteSession | null>(null);
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [isHydratingState, setIsHydratingState] = useState(true);

  const changePasswordPersonaId = userSession?.personaId ?? docenteSession?.personaId ?? adminSession?.personaId ?? null;
  const changePasswordNextScreen: Screen = userSession ? 'dashboard' : adminSession ? 'admin-dashboard' : 'docente-dashboard';
  const changePasswordRole = userSession ? 'estudiante' : adminSession ? 'admin' : 'docente';

  const extractAuthToken = (apiResponse: any): string | null => {
    const candidates = [
      apiResponse?.token,
      apiResponse?.accessToken,
      apiResponse?.access_token,
      apiResponse?.jwt,
      apiResponse?.data?.token,
      apiResponse?.data?.accessToken,
      apiResponse?.data?.access_token,
      apiResponse?.estudiante?.token,
      apiResponse?.estudiante?.accessToken,
      apiResponse?.docente?.token,
      apiResponse?.docente?.accessToken,
      apiResponse?.usuario?.token,
      apiResponse?.usuario?.accessToken,
    ];
    const token = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
    return token ? String(token) : null;
  };

  const persistAuthToken = (apiResponse: any) => {
    const token = extractAuthToken(apiResponse);
    if (token) localStorage.setItem('authToken', String(token));
  };

  const isPublicScreen = (screen: Screen) =>
    screen === 'login' ||
    screen === 'forgot-password' ||
    screen === 'reset-password' ||
    screen === 'admin-register';

  const clearPersistedNavigation = () => {
    localStorage.removeItem(APP_NAV_STATE_KEY);
    localStorage.removeItem(APP_ROLE_KEY);
    localStorage.removeItem('adminDashboardState');
    localStorage.removeItem('docenteAsignaturaFlowState');
    localStorage.removeItem('docenteDashboardScreen');
    clearAllCache();
  };

  // Limpia sesión y vuelve al login — usado por logout y "volver al login"
  const clearSession = () => {
    setCurrentScreen('login');
    setSelectedSubject(null);
    setSelectedContent(null);
    setUserSession(null);
    setAdminSession(null);
    setDocenteSession(null);
    localStorage.removeItem('estudianteId');
    localStorage.removeItem('personaId');
    localStorage.removeItem('nombreEstudiante');
    localStorage.removeItem('codigoEstudiante');
    localStorage.removeItem('periodoAcademicoEstudiante');
    localStorage.removeItem('adminId');
    localStorage.removeItem('authToken');
    localStorage.removeItem(DOCENTE_SESSION_KEY);
    localStorage.removeItem(ADMIN_SESSION_KEY);
    clearPersistedNavigation();
    applyAuthHeaders();
  };

  useEffect(() => {
    setupAuthFetch();
    applyAuthHeaders();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setResetToken(token);
      setCurrentScreen('reset-password');
      try {
        const cleanUrl = `${window.location.origin}${window.location.pathname}${window.location.hash || ''}`;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch (error) {
        console.warn('No se pudo limpiar el token de la URL:', error);
      }
      setIsHydratingState(false);
      return;
    }

    try {
      const personaIdRaw = localStorage.getItem('personaId');
      const estudianteIdRaw = localStorage.getItem('estudianteId');
      const nombreEstudiante = localStorage.getItem('nombreEstudiante');
      const codigoEstudiante = localStorage.getItem('codigoEstudiante');
      const adminIdRaw = localStorage.getItem('adminId');
      const role = localStorage.getItem(APP_ROLE_KEY);
      const storedDocenteSession = localStorage.getItem(DOCENTE_SESSION_KEY);
      const storedAdminSession = localStorage.getItem(ADMIN_SESSION_KEY);

      if (personaIdRaw && estudianteIdRaw && nombreEstudiante && codigoEstudiante) {
        setUserSession({
          id: Number(estudianteIdRaw),
          personaId: Number(personaIdRaw),
          nombre: nombreEstudiante,
          codigo: codigoEstudiante,
        });
        setDocenteSession(null);
        setAdminSession(null);
      } else if (storedDocenteSession && role === 'docente') {
        setDocenteSession(JSON.parse(storedDocenteSession) as DocenteSession);
        setUserSession(null);
        setAdminSession(null);
      } else if (storedAdminSession && role === 'admin') {
        setAdminSession(JSON.parse(storedAdminSession) as AdminSession);
        setUserSession(null);
        setDocenteSession(null);
      }

      const navRaw = localStorage.getItem(APP_NAV_STATE_KEY);
      if (navRaw) {
        const nav = JSON.parse(navRaw) as {
          currentScreen?: Screen;
          selectedSubject?: Subject | null;
          selectedContent?: Content | null;
          selectedTemaId?: string | null;
          selectedSubtemaId?: number | null;
          previousScreen?: Screen | null;
        };

        if (nav.selectedSubject) setSelectedSubject(nav.selectedSubject);
        if (nav.selectedContent) setSelectedContent(nav.selectedContent);
        if (nav.selectedTemaId !== undefined) setSelectedTemaId(nav.selectedTemaId);
        if (nav.selectedSubtemaId !== undefined) setSelectedSubtemaId(nav.selectedSubtemaId);
        if (nav.previousScreen !== undefined) setPreviousScreen(nav.previousScreen);

        const hasStudentSession = Boolean(estudianteIdRaw);
        const hasDocenteSession = Boolean(storedDocenteSession);
        const hasAdminSession = Boolean(adminIdRaw && personaIdRaw);

        const canRestoreScreen = (screen: Screen) => {
          if (isPublicScreen(screen)) return false;
          if (screen === 'dashboard') return hasStudentSession;
          if (screen === 'subject-content') return hasStudentSession && Boolean(nav.selectedSubject);
          if (
            screen === 'programming-content' ||
            screen === 'programming-miniproyecto' ||
            screen === 'configurable-miniproyecto' ||
            screen === 'theory-content' ||
            screen === 'quiz-activity' ||
            screen === 'uml-diagram' ||
            screen === 'ai-workshop'
          ) return hasStudentSession && Boolean(nav.selectedContent);
          if (screen === 'docente-dashboard' || screen === 'docente-asignatura-management') return hasDocenteSession;
          if (
            screen === 'admin-dashboard' ||
            screen === 'admin-themes' ||
            screen === 'admin-contents' ||
            screen === 'admin-reports' ||
            screen === 'admin-students' ||
            screen === 'admin-upload' ||
            screen === 'admin-sequences' ||
            screen === 'admin-subtema-sequences'
          ) return hasAdminSession;
          return false;
        };

        if (nav.currentScreen && canRestoreScreen(nav.currentScreen)) {
          setCurrentScreen(nav.currentScreen);
        } else if (role === 'estudiante' && estudianteIdRaw) {
          setCurrentScreen('dashboard');
        } else if (role === 'docente' && storedDocenteSession) {
          setCurrentScreen('docente-dashboard');
        } else if (role === 'admin' && adminIdRaw && personaIdRaw) {
          setCurrentScreen('admin-dashboard');
        }
      } else if (role === 'estudiante' && estudianteIdRaw) {
        setCurrentScreen('dashboard');
      } else if (role === 'docente' && storedDocenteSession) {
        setCurrentScreen('docente-dashboard');
      } else if (role === 'admin' && adminIdRaw && personaIdRaw) {
        setCurrentScreen('admin-dashboard');
      }
    } catch (restoreError) {
      console.error('No se pudo restaurar el estado de navegación:', restoreError);
    } finally {
      setIsHydratingState(false);
    }
  }, []);

  useEffect(() => {
    if (isHydratingState || isPublicScreen(currentScreen)) return;
    localStorage.setItem(APP_NAV_STATE_KEY, JSON.stringify({
      currentScreen,
      selectedSubject,
      selectedContent,
      selectedTemaId,
      selectedSubtemaId,
      previousScreen,
    }));
  }, [isHydratingState, currentScreen, selectedSubject, selectedContent, selectedTemaId, selectedSubtemaId, previousScreen]);

  const handleLoginSuccess = (apiResponse: any) => {
    setDocenteSession(null);
    setAdminSession(null);
    localStorage.removeItem('adminId');
    localStorage.removeItem(ADMIN_SESSION_KEY);

    const session: UserSession = {
      id: apiResponse.estudiante.id,
      personaId: apiResponse.estudiante.personaId,
      nombre: apiResponse.estudiante.nombre,
      codigo: apiResponse.estudiante.codigo,
    };
    setUserSession(session);
    localStorage.setItem(APP_ROLE_KEY, 'estudiante');
    localStorage.removeItem(DOCENTE_SESSION_KEY);
    localStorage.setItem('estudianteId', apiResponse.estudiante.id.toString());
    localStorage.setItem('personaId', apiResponse.estudiante.personaId.toString());
    localStorage.setItem('nombreEstudiante', apiResponse.estudiante.nombre);
    localStorage.setItem('codigoEstudiante', apiResponse.estudiante.codigo);
    if (apiResponse.estudiante.periodo_academico) {
      localStorage.setItem('periodoAcademicoEstudiante', apiResponse.estudiante.periodo_academico);
    }
    persistAuthToken(apiResponse);
    applyAuthHeaders();
    setCurrentScreen(apiResponse.primerIngreso ? 'change-password' : 'dashboard');
  };

  const handleDocenteLoginSuccess = (apiResponse: any) => {
    const docente = apiResponse.docente;
    if (!docente) return;

    setUserSession(null);
    setAdminSession(null);
    localStorage.removeItem('estudianteId');
    localStorage.removeItem('codigoEstudiante');
    localStorage.removeItem('nombreEstudiante');
    localStorage.removeItem('periodoAcademicoEstudiante');
    localStorage.removeItem('adminId');
    localStorage.removeItem(ADMIN_SESSION_KEY);

    const session: DocenteSession = {
      id: docente.id,
      personaId: docente.personaId,
      nombre: docente.nombre,
      email: docente.email,
      especialidad: docente.especialidad,
      asignaturaId: docente.Asignatura?.id,
      asignaturaNombre: docente.Asignatura?.nombre,
    };
    localStorage.setItem('personaId', docente.personaId.toString());
    localStorage.setItem(APP_ROLE_KEY, 'docente');
    persistAuthToken(apiResponse);
    applyAuthHeaders();
    setDocenteSession(session);
    localStorage.setItem(DOCENTE_SESSION_KEY, JSON.stringify(session));
    setCurrentScreen(apiResponse.primerIngreso ? 'change-password' : 'docente-dashboard');
  };

  const handleAdminLoginSuccess = (apiResponse: any) => {
    const administrador = apiResponse.administrador;
    if (!administrador) return;

    setUserSession(null);
    setDocenteSession(null);
    localStorage.removeItem('estudianteId');
    localStorage.removeItem('codigoEstudiante');
    localStorage.removeItem('nombreEstudiante');
    localStorage.removeItem('periodoAcademicoEstudiante');
    localStorage.removeItem(DOCENTE_SESSION_KEY);

    const session: AdminSession = {
      id: administrador.id,
      personaId: administrador.personaId,
      nombre: administrador.nombre,
      email: administrador.email,
    };
    setAdminSession(session);
    localStorage.setItem('adminId', String(administrador.id));
    localStorage.setItem('personaId', String(administrador.personaId));
    localStorage.setItem(APP_ROLE_KEY, 'admin');
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
    persistAuthToken(apiResponse);
    applyAuthHeaders();
    setCurrentScreen(apiResponse.primerIngreso ? 'change-password' : 'admin-dashboard');
  };

  const handleBackToLogin = () => clearSession();

  const executeLogout = () => {
    clearSession();
    setShowLogoutConfirm(false);
  };

  const handleLogout = () => setShowLogoutConfirm(true);

  const handleSubjectSelect = (subject: Subject) => {
    setSelectedSubject(subject);
    setCurrentScreen('subject-content');
  };

  const handleBackToDashboard = () => {
    setCurrentScreen('dashboard');
    setSelectedSubject(null);
    setSelectedContent(null);
  };

  const handleBackToAdminDashboard = () => setCurrentScreen('admin-dashboard');

  const handleAdminNavigate = (section: 'themes' | 'contents' | 'reports' | 'students') => {
    const map: Record<typeof section, Screen> = {
      themes: 'admin-themes',
      contents: 'admin-contents',
      reports: 'admin-reports',
      students: 'admin-students',
    };
    setCurrentScreen(map[section]);
  };

  const handleContentSelect = (content: Content, temaId?: string) => {
    setSelectedContent(content);
    if (content.isMiniproyecto) {
      setSelectedTemaId(null);
    } else if (temaId) {
      setSelectedTemaId(temaId);
    }

    if (content.isMiniproyecto) {
      if (content.miniproyectoMode === 'configurable') {
        setCurrentScreen('configurable-miniproyecto');
        return;
      }
      // Usa tipoPilar del contenido o del área activa
      const isProgramming =
        content.tipoPilar === 'PROGRAMACION' ||
        selectedSubject?.tipoPilar === 'PROGRAMACION';
      setCurrentScreen(isProgramming ? 'programming-miniproyecto' : 'ai-workshop');
      return;
    }

    // Routing por pilar del área, luego por tipo de contenido
    if (selectedSubject?.tipoPilar === 'PROGRAMACION') {
      setCurrentScreen('theory-content');
      return;
    }

    switch (content.type) {
      case 'workshop': setCurrentScreen('ai-workshop'); break;
      case 'uml':      setCurrentScreen('uml-diagram'); break;
      case 'quiz':
      case 'activity': setCurrentScreen('quiz-activity'); break;
      default:         setCurrentScreen('theory-content');
    }
  };

  const handleBackToSubject = () => {
    setCurrentScreen('subject-content');
    setSelectedContent(null);
  };

  const clearResetTokenFromUrl = () => {
    setResetToken(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    window.history.replaceState({}, document.title, url.toString());
  };

  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-right" richColors />
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#4A90E2] border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        {currentScreen === 'login' && (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onDocenteLoginSuccess={handleDocenteLoginSuccess}
            onLogin={() => setCurrentScreen('dashboard')}
            onAdminLogin={handleAdminLoginSuccess}
            onShowRegister={() => setCurrentScreen('admin-register')}
            onShowForgotPassword={() => setCurrentScreen('forgot-password')}
          />
        )}

        {currentScreen === 'forgot-password' && (
          <ForgotPasswordScreen onBack={() => setCurrentScreen('login')} />
        )}

        {currentScreen === 'reset-password' && (
          <ResetPasswordScreen
            token={resetToken}
            onBack={() => { clearResetTokenFromUrl(); setCurrentScreen('login'); }}
            onComplete={() => { clearResetTokenFromUrl(); setCurrentScreen('login'); }}
          />
        )}

        {currentScreen === 'change-password' && changePasswordPersonaId && (
          <ChangePasswordScreen
            personaId={changePasswordPersonaId}
            onComplete={() => setCurrentScreen(changePasswordNextScreen)}
            isFirstLogin={true}
            userRole={changePasswordRole}
          />
        )}

        {currentScreen === 'admin-register' && (
          <AdminRegisterScreen
            onBack={handleBackToLogin}
            onRegister={() => setCurrentScreen('admin-dashboard')}
          />
        )}

        {currentScreen === 'dashboard' && userSession && (
          <DashboardScreen
            userName={userSession.nombre}
            onSubjectSelect={handleSubjectSelect}
            onLogout={handleLogout}
            estudianteId={userSession.id}
          />
        )}

        {currentScreen === 'docente-dashboard' && (
          <DocenteDashboard
            docente={docenteSession}
            onLogout={handleLogout}
            onManageAsignatura={() => setCurrentScreen('docente-asignatura-management')}
          />
        )}

        {currentScreen === 'docente-asignatura-management' && docenteSession && (
          <DocenteAsignaturaManagementScreen
            onBack={() => setCurrentScreen('docente-dashboard')}
          />
        )}

        {currentScreen === 'admin-dashboard' && (
          <AdminDashboard
            onLogout={handleLogout}
            adminName={adminSession?.nombre}
            onNavigate={(section) => {
              if (section === 'themes') setCurrentScreen('admin-themes');
              if (section === 'contents') setCurrentScreen('admin-contents');
              if (section === 'reports') setCurrentScreen('admin-reports');
              if (section === 'students') setCurrentScreen('admin-students');
              if (section === 'upload') setCurrentScreen('admin-upload');
              if (section === 'subtema-sequences') setCurrentScreen('admin-subtema-sequences');
            }}
          />
        )}

        {currentScreen === 'admin-upload' && (
          <StudentUploadScreen onBack={() => setCurrentScreen('admin-dashboard')} />
        )}

        {currentScreen === 'admin-sequences' && (
          <SequenceManagementScreen
            onBack={() => {
              if (selectedSubtemaId) {
                setCurrentScreen('admin-subtema-sequences');
              } else {
                setCurrentScreen('admin-dashboard');
              }
            }}
            onGoToContentManagement={() => setCurrentScreen('admin-contents')}
            subtemaId={selectedSubtemaId || undefined}
            temaId={selectedTemaId ? parseInt(selectedTemaId) : undefined}
          />
        )}

        {currentScreen === 'admin-subtema-sequences' && (
          <SubtemaSequenceManagementScreen
            onBack={() => {
              setSelectedTemaId(null);
              setCurrentScreen('admin-dashboard');
            }}
            onSelectSubtema={(subtemaId, temaId) => {
              setSelectedSubtemaId(subtemaId);
              setSelectedTemaId(temaId.toString());
              setCurrentScreen('admin-sequences');
            }}
            temaId={selectedTemaId ? parseInt(selectedTemaId) : undefined}
          />
        )}

        {currentScreen === 'admin-themes' && (
          <ThemeManagementScreen onBack={handleBackToAdminDashboard} />
        )}

        {currentScreen === 'admin-contents' && (
          <ContentManagementScreen onBack={handleBackToAdminDashboard} />
        )}

        {currentScreen === 'admin-reports' && (
          <ReportsScreen onBack={handleBackToAdminDashboard} />
        )}

        {currentScreen === 'admin-students' && (
          <StudentTrackingScreen onBack={handleBackToAdminDashboard} />
        )}

        {currentScreen === 'subject-content' && selectedSubject && userSession && (
          <>
            <SubjectContentScreen
              subject={selectedSubject}
              onBack={handleBackToDashboard}
              onContentSelect={handleContentSelect}
              estudianteId={userSession.id}
            />
            <ChatbotButton asignaturaId={Number(selectedSubject.id)} contextLabel={selectedSubject.name} />
          </>
        )}

        {currentScreen === 'programming-content' && selectedContent && (
          <>
            <ProgrammingContentView content={selectedContent} onBack={handleBackToSubject} />
            <ChatbotButton
              asignaturaId={selectedContent.asignaturaId ?? Number(selectedSubject?.id)}
              contextLabel={selectedContent.title}
            />
          </>
        )}

        {currentScreen === 'programming-miniproyecto' && selectedContent && (
          <>
            <ProgrammingMiniproyectoView content={selectedContent} onBack={handleBackToSubject} />
            <ChatbotButton
              chatbotType="MINIPROYECTO"
              asignaturaId={selectedContent.asignaturaId ?? Number(selectedSubject?.id)}
              miniproyectoId={selectedContent.id}
              contextLabel={selectedContent.title}
            />
          </>
        )}

        {currentScreen === 'configurable-miniproyecto' && selectedContent && (
          <ConfigurableMiniproyectoView content={selectedContent} onBack={handleBackToSubject} />
        )}

        {currentScreen === 'theory-content' && selectedContent && selectedSubject && userSession && (
          <>
            <TheoryContentView
              subjectName={selectedSubject.name}
              asignaturaId={selectedSubject.id}
              progresionSecuencial={Boolean(selectedSubject.progresion_secuencial)}
              content={selectedContent}
              temaId={selectedTemaId || undefined}
              onBack={handleBackToSubject}
              onHome={handleBackToDashboard}
              estudianteId={userSession.id}
            />
            <ChatbotButton
              asignaturaId={selectedContent.asignaturaId ?? Number(selectedSubject.id)}
              contextLabel={selectedContent.title}
            />
          </>
        )}

        {currentScreen === 'quiz-activity' && selectedContent && selectedSubject && (
          <>
            <QuizActivityView
              subjectName={selectedSubject.name}
              activity={selectedContent}
              onBack={handleBackToSubject}
              onHome={handleBackToDashboard}
            />
            <ChatbotButton
              asignaturaId={selectedContent.asignaturaId ?? Number(selectedSubject.id)}
              contextLabel={selectedContent.title}
            />
          </>
        )}

        {currentScreen === 'uml-diagram' && selectedContent && (
          <>
            <UMLDiagramView activity={selectedContent} onBack={handleBackToSubject} />
            <ChatbotButton
              asignaturaId={selectedContent.asignaturaId ?? Number(selectedSubject?.id)}
              contextLabel={selectedContent.title}
            />
          </>
        )}

        {currentScreen === 'ai-workshop' && selectedContent && selectedSubject && (
          <AIWorkshopView
            subjectName={selectedSubject.name}
            workshop={selectedContent}
            onBack={handleBackToSubject}
            estudianteId={userSession?.id}
          />
        )}
      </Suspense>

      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: 'rgba(10,20,50,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="rounded-2xl shadow-2xl"
            style={{ width: '380px', background: '#fff', padding: '32px 28px 24px' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg mb-2" style={{ color: '#1e3a5f' }}>
              ¿Deseas cerrar sesión?
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: '#4a6fa5' }}>
              ¿Confirmas que deseas cerrar sesión?
            </p>

            <div className="flex items-center justify-center gap-3 mt-7">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                style={{ background: '#fff', color: '#1e3a5f', border: '1.5px solid #bfd3f5' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeLogout}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #1a56db 0%, #142d61 100%)' }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
