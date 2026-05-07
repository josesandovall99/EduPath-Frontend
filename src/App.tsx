import { useEffect, useState } from 'react';
import { Toaster } from './components/ui/sonner';
import { LoginScreen } from './components/LoginScreen';
import { AdminRegisterScreen } from './components/AdminRegisterScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { ThemeManagementScreen } from './components/ThemeManagementScreen';
import { ContentManagementScreen } from './components/ContentManagementScreen';
import { ReportsScreen } from './components/ReportsScreen';
import { StudentTrackingScreen } from './components/StudentTrackingScreen';
import { SubjectContentScreen } from './components/SubjectContentScreen';
import { ProgrammingContentView } from './components/ProgrammingContentView';
import { ProgrammingMiniproyectoView } from './components/ProgrammingMiniproyectoView';
import { ConfigurableMiniproyectoView } from './components/ConfigurableMiniproyectoView';
import { TheoryContentView } from './components/TheoryContentView';
import { QuizActivityView } from './components/QuizActivityView';
import { UMLDiagramView } from './components/UMLDiagramView';
import { AIWorkshopView } from './components/AIWorkshopView';
import { ChatbotButton } from './components/ChatbotButton';
import { ChangePasswordScreen } from './components/changePassword';
import { ForgotPasswordScreen } from './components/ForgotPasswordScreen';
import { ResetPasswordScreen } from './components/ResetPasswordScreen';
import { StudentUploadScreen } from './components/StudentUploadScreen';
import { SequenceManagementScreen } from './components/SequenceManagementScreen';
import { SubtemaSequenceManagementScreen } from './components/SubtemaSequenceManagementScreen';
import { DocenteDashboard } from './components/DocenteDashboard';
import { DocenteAsignaturaManagementScreen } from './components/DocenteAsignaturaManagementScreen';
import { applyAuthHeaders, setupAuthFetch } from './utils/authHeaders';

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



// Interfaz para la sesión del usuario
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

const normalizeLabel = (value?: string | null) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

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
  const [userData, setUserData] = useState<{id: number, personaId: number, nombre: string} | null>(null);
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
    if (token) {
      localStorage.setItem('authToken', String(token));
    }
  };

  const isPublicScreen = (screen: Screen) => (
    screen === 'login' ||
    screen === 'forgot-password' ||
    screen === 'reset-password' ||
    screen === 'admin-register'
  );

  const clearPersistedNavigation = () => {
    localStorage.removeItem(APP_NAV_STATE_KEY);
    localStorage.removeItem(APP_ROLE_KEY);
    localStorage.removeItem('adminDashboardState');
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

      // Remove token from URL after reading it to reduce sensitive data exposure.
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
        const restoredStudent: UserSession = {
          id: Number(estudianteIdRaw),
          personaId: Number(personaIdRaw),
          nombre: nombreEstudiante,
          codigo: codigoEstudiante
        };
        setUserSession(restoredStudent);
        setDocenteSession(null);
        setAdminSession(null);
      } else if (storedDocenteSession && role === 'docente') {
        const parsedDocente = JSON.parse(storedDocenteSession) as DocenteSession;
        setDocenteSession(parsedDocente);
        setUserSession(null);
        setAdminSession(null);
      } else if (storedAdminSession && role === 'admin') {
        const parsedAdmin = JSON.parse(storedAdminSession) as AdminSession;
        setAdminSession(parsedAdmin);
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
          ) {
            return hasStudentSession && Boolean(nav.selectedContent);
          }
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
          ) {
            return hasAdminSession;
          }
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
    if (isHydratingState || isPublicScreen(currentScreen)) {
      return;
    }

    localStorage.setItem(APP_NAV_STATE_KEY, JSON.stringify({
      currentScreen,
      selectedSubject,
      selectedContent,
      selectedTemaId,
      selectedSubtemaId,
      previousScreen
    }));
  }, [
    isHydratingState,
    currentScreen,
    selectedSubject,
    selectedContent,
    selectedTemaId,
    selectedSubtemaId,
    previousScreen
  ]);
  

  // Función que se llama cuando el login es exitoso
  // 2. Función manejadora del Login Exitoso
  const handleLoginSuccess = (apiResponse: any) => {
    setDocenteSession(null);
    setAdminSession(null);
    localStorage.removeItem('adminId');
    localStorage.removeItem(ADMIN_SESSION_KEY);

    // Guardamos los datos importantes que vienen del backend
    const session = {
      id: apiResponse.estudiante.id,
      personaId: apiResponse.estudiante.personaId,
      nombre: apiResponse.estudiante.nombre,
      codigo: apiResponse.estudiante.codigo
    };
    
    setUserSession(session);
    localStorage.setItem(APP_ROLE_KEY, 'estudiante');
    localStorage.removeItem(DOCENTE_SESSION_KEY);
    
    // Guardar en localStorage para que esté disponible en otros componentes
    localStorage.setItem('estudianteId', apiResponse.estudiante.id.toString());
    localStorage.setItem('personaId', apiResponse.estudiante.personaId.toString());
    localStorage.setItem('nombreEstudiante', apiResponse.estudiante.nombre);
    localStorage.setItem('codigoEstudiante', apiResponse.estudiante.codigo);
    
    // Guardar semestre si viene del backend
    if (apiResponse.estudiante.semestre) {
      localStorage.setItem('semestreEstudiante', apiResponse.estudiante.semestre.toString());
    }

    persistAuthToken(apiResponse);

    applyAuthHeaders();

    // Decidimos a dónde ir basado en el flag 'primerIngreso'
    if (apiResponse.primerIngreso) {
      setCurrentScreen('change-password');
    } else {
      setCurrentScreen('dashboard');
    }
  };

  const handleDocenteLoginSuccess = (apiResponse: any) => {
    const docente = apiResponse.docente;
    if (!docente) {
      return;
    }

    setUserSession(null);
    setAdminSession(null);
    localStorage.removeItem('estudianteId');
    localStorage.removeItem('codigoEstudiante');
    localStorage.removeItem('nombreEstudiante');
    localStorage.removeItem('semestreEstudiante');
    localStorage.removeItem('adminId');
    localStorage.removeItem(ADMIN_SESSION_KEY);

    const session: DocenteSession = {
      id: docente.id,
      personaId: docente.personaId,
      nombre: docente.nombre,
      email: docente.email,
      especialidad: docente.especialidad,
      asignaturaId: docente.Asignatura?.id,
      asignaturaNombre: docente.Asignatura?.nombre
    };

    localStorage.setItem('personaId', docente.personaId.toString());
    localStorage.setItem(APP_ROLE_KEY, 'docente');
    persistAuthToken(apiResponse);
    applyAuthHeaders();

    setDocenteSession(session);
    localStorage.setItem(DOCENTE_SESSION_KEY, JSON.stringify(session));
    if (apiResponse.primerIngreso) {
      setCurrentScreen('change-password');
    } else {
      setCurrentScreen('docente-dashboard');
    }
  };

  const handleAdminLoginSuccess = (apiResponse: any) => {
    const administrador = apiResponse.administrador;
    if (!administrador) {
      return;
    }

    setUserSession(null);
    setDocenteSession(null);
    localStorage.removeItem('estudianteId');
    localStorage.removeItem('codigoEstudiante');
    localStorage.removeItem('nombreEstudiante');
    localStorage.removeItem('semestreEstudiante');
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

    if (apiResponse.primerIngreso) {
      setCurrentScreen('change-password');
    } else {
      setCurrentScreen('admin-dashboard');
    }
  };

  /*const handleLogout = () => {
    setUserSession(null);
    setCurrentScreen('login');
  };*/
  
  // Student login (Google)
  const handleLogin = () => {
    setCurrentScreen('dashboard');
  };

  // Show admin register
  const handleShowRegister = () => {
    setCurrentScreen('admin-register');
  };

  // Complete registration
  const handleRegister = () => {
    // In real app, this would submit the form
    // For now, just go to admin dashboard
    setCurrentScreen('admin-dashboard');
  };

  // Back to login
  const handleBackToLogin = () => {
    setCurrentScreen('login');
    setSelectedSubject(null);
    setSelectedContent(null);
    setUserSession(null);
    setAdminSession(null);
    // Limpiar localStorage
    localStorage.removeItem('estudianteId');
    localStorage.removeItem('personaId');
    localStorage.removeItem('nombreEstudiante');
    localStorage.removeItem('codigoEstudiante');
    localStorage.removeItem('semestreEstudiante');
    localStorage.removeItem('adminId');
    localStorage.removeItem('authToken');
    localStorage.removeItem(DOCENTE_SESSION_KEY);
    localStorage.removeItem(ADMIN_SESSION_KEY);
    clearPersistedNavigation();
    setDocenteSession(null);
    applyAuthHeaders();
  };

  const clearResetTokenFromUrl = () => {
    setResetToken(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    window.history.replaceState({}, document.title, url.toString());
  };

  const executeLogout = () => {
    setCurrentScreen('login');
    setSelectedSubject(null);
    setSelectedContent(null);
    setUserSession(null);
    setAdminSession(null);
    // Limpiar localStorage
    localStorage.removeItem('estudianteId');
    localStorage.removeItem('personaId');
    localStorage.removeItem('nombreEstudiante');
    localStorage.removeItem('codigoEstudiante');
    localStorage.removeItem('semestreEstudiante');
    localStorage.removeItem('adminId');
    localStorage.removeItem('authToken');
    localStorage.removeItem(DOCENTE_SESSION_KEY);
    localStorage.removeItem(ADMIN_SESSION_KEY);
    clearPersistedNavigation();
    setDocenteSession(null);
    applyAuthHeaders();
    setShowLogoutConfirm(false);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleSubjectSelect = (subject: Subject) => {
    setSelectedSubject(subject);
    setCurrentScreen('subject-content');
  };

  const handleBackToDashboard = () => {
    setCurrentScreen('dashboard');
    setSelectedSubject(null);
    setSelectedContent(null);
  };

  const handleBackToAdminDashboard = () => {
    setCurrentScreen('admin-dashboard');
  };

  const handleAdminNavigate = (section: 'themes' | 'contents' | 'reports' | 'students') => {
    switch (section) {
      case 'themes':
        setCurrentScreen('admin-themes');
        break;
      case 'contents':
        setCurrentScreen('admin-contents');
        break;
      case 'reports':
        setCurrentScreen('admin-reports');
        break;
      case 'students':
        setCurrentScreen('admin-students');
        break;
    }
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

      const normalizedAreaName = normalizeLabel(content.asignaturaNombre || selectedSubject?.name);
      const isProgrammingMiniproyecto = content.tipoPilar === 'PROGRAMACION' || normalizedAreaName.includes('programacion');

      setCurrentScreen(isProgrammingMiniproyecto ? 'programming-miniproyecto' : 'ai-workshop');
      return;
    }
    
    // Determine which view to show based on subject and content type
    if (selectedSubject?.name === 'Fundamentos de Programación') {
      // Pasa por TheoryContentView para que el estudiante pueda navegar
      // Subtema ÔåÆ Contenido ÔåÆ Ejercicio (ProgrammingContentView embebido)
      setCurrentScreen('theory-content');
    } else if (selectedSubject?.name === 'Análisis de Sistemas') {
      // Analysis Systems subject
      if (content.type === 'workshop') {
        setCurrentScreen('ai-workshop');
      } else if (content.type === 'uml') {
        setCurrentScreen('uml-diagram');
      } else if (content.type === 'quiz' || content.type === 'activity') {
        setCurrentScreen('quiz-activity');
      } else {
        setCurrentScreen('theory-content');
      }
    } else if (selectedSubject?.name === 'Alcance, Tiempo y Costo') {
      // Project Management subject
      if (content.type === 'workshop') {
        setCurrentScreen('ai-workshop');
      } else if (content.type === 'quiz' || content.type === 'activity') {
        setCurrentScreen('quiz-activity');
      } else {
        setCurrentScreen('theory-content');
      }
    } else {
      // Default to theory content
      setCurrentScreen('theory-content');
    }
  };

  const handleBackToSubject = () => {
    setCurrentScreen('subject-content');
    setSelectedContent(null);
  };

  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-right" richColors />
      {currentScreen === 'login' && (
        <LoginScreen 
          onLoginSuccess={handleLoginSuccess} // Conectamos la función
          onDocenteLoginSuccess={handleDocenteLoginSuccess}
          onLogin={handleLogin}
          onAdminLogin={handleAdminLoginSuccess}
          onShowRegister={() => setCurrentScreen('admin-register')} 
          onShowForgotPassword={() => setCurrentScreen('forgot-password')}
        />
      )}

      {currentScreen === 'forgot-password' && (
        <ForgotPasswordScreen
          onBack={() => setCurrentScreen('login')}
        />
      )}

      {currentScreen === 'reset-password' && (
        <ResetPasswordScreen
          token={resetToken}
          onBack={() => {
            clearResetTokenFromUrl();
            setCurrentScreen('login');
          }}
          onComplete={() => {
            clearResetTokenFromUrl();
            setCurrentScreen('login');
          }}
        />
      )}

      {/* Pantalla de Cambio de Contraseña */}
      {currentScreen === 'change-password' && changePasswordPersonaId && (
        <ChangePasswordScreen 
          personaId={changePasswordPersonaId} // Pasamos el ID necesario
          onComplete={() => setCurrentScreen(changePasswordNextScreen)} // Al terminar, va al dashboard
          isFirstLogin={true}
          userRole={changePasswordRole}
        />
      )}

      {currentScreen === 'dashboard' && userSession && (
              <DashboardScreen 
                userName={userSession.nombre} // Pasamos el nombre para el saludo
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

      {/* DASHBOARD ADMIN */}
      {currentScreen === 'admin-dashboard' && (
        <AdminDashboard
          onLogout={handleLogout}
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

      {/* 3. Renderizamos la pantalla de carga masiva */}
      {currentScreen === 'admin-upload' && (
        <StudentUploadScreen 
          onBack={() => setCurrentScreen('admin-dashboard')} 
        />
      )}

      {currentScreen === 'admin-sequences' && (
        <SequenceManagementScreen
          onBack={() => {
            // Si viene de subtemas, volver a la pantalla de subtemas
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
            // Si viene de temas (tiene temaId), volver a temas
            // Si no, volver al dashboard
            if (selectedTemaId) {
              // En App.tsx no hay pantalla de temas directa, así que volvemos al dashboard
              // pero limpiamos el temaId para indicar que no venimos de temas
              setSelectedTemaId(null);
              setCurrentScreen('admin-dashboard');
            } else {
              setCurrentScreen('admin-dashboard');
            }
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
          <ProgrammingContentView
            content={selectedContent}
            onBack={handleBackToSubject}
          />
          <ChatbotButton asignaturaId={selectedContent.asignaturaId ?? Number(selectedSubject?.id)} contextLabel={selectedContent.title} />
        </>
      )}

      {currentScreen === 'programming-miniproyecto' && selectedContent && (
        <>
          <ProgrammingMiniproyectoView
            content={selectedContent}
            onBack={handleBackToSubject}
          />
          <ChatbotButton
            chatbotType="MINIPROYECTO"
            asignaturaId={selectedContent.asignaturaId ?? Number(selectedSubject?.id)}
            miniproyectoId={selectedContent.id}
            contextLabel={selectedContent.title}
          />
        </>
      )}

      {currentScreen === 'configurable-miniproyecto' && selectedContent && (
        <ConfigurableMiniproyectoView
          content={selectedContent}
          onBack={handleBackToSubject}
        />
      )}

      {currentScreen === 'theory-content' && selectedContent && selectedSubject && userSession && (
        <>
          <TheoryContentView
            subjectName={selectedSubject.name}
            asignaturaId={selectedSubject.id}
            content={selectedContent}
            temaId={selectedTemaId || undefined}
            onBack={handleBackToSubject}
            onHome={handleBackToDashboard}
            estudianteId={userSession.id}
          />
          <ChatbotButton asignaturaId={selectedContent.asignaturaId ?? Number(selectedSubject.id)} contextLabel={selectedContent.title} />
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
          <ChatbotButton asignaturaId={selectedContent.asignaturaId ?? Number(selectedSubject.id)} contextLabel={selectedContent.title} />
        </>
      )}

      {currentScreen === 'uml-diagram' && selectedContent && (
        <>
          <UMLDiagramView
            activity={selectedContent}
            onBack={handleBackToSubject}
          />
          <ChatbotButton asignaturaId={selectedContent.asignaturaId ?? Number(selectedSubject?.id)} contextLabel={selectedContent.title} />
        </>
      )}

      {currentScreen === 'ai-workshop' && selectedContent && selectedSubject && (
        <>
          <AIWorkshopView
            subjectName={selectedSubject.name}
            workshop={selectedContent}
            onBack={handleBackToSubject}
            estudianteId={userSession?.id}
          />
          {/* Note: ChatbotButton is integrated into AIWorkshopView */}
        </>
      )}

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-[#3A4A5B]">Confirmar cierre de sesión</h3>
              <p className="text-sm text-gray-500 mt-1">La sesión actual será cerrada al confirmar.</p>
            </div>
            <div className="px-6 py-4 flex items-center justify-end gap-3 bg-gray-50">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeLogout}
                className="px-4 py-2 bg-[#4A90E2] text-white rounded-lg hover:bg-[#3B82F6] transition-all"
              >
                Sí, cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
