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
import { DocenteAreaManagementScreen } from './components/DocenteAreaManagementScreen';
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
  | 'theory-content'
  | 'quiz-activity'
  | 'uml-diagram'
  | 'admin-upload'
  | 'admin-sequences'
  | 'admin-subtema-sequences'
  | 'ai-workshop'
  | 'docente-dashboard'
  | 'docente-area-management';



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
  areaId?: number;
  areaNombre?: string;
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
}

export default function App() {
  const APP_NAV_STATE_KEY = 'appNavigationState';
  const APP_ROLE_KEY = 'appActiveRole';
  const DOCENTE_SESSION_KEY = 'docenteSession';

  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [selectedTemaId, setSelectedTemaId] = useState<string | null>(null);
  const [selectedSubtemaId, setSelectedSubtemaId] = useState<number | null>(null);
  const [previousScreen, setPreviousScreen] = useState<Screen | null>(null);
  const [userData, setUserData] = useState<{id: number, personaId: number, nombre: string} | null>(null);
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [docenteSession, setDocenteSession] = useState<DocenteSession | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [isHydratingState, setIsHydratingState] = useState(true);
  const changePasswordPersonaId = userSession?.personaId ?? docenteSession?.personaId ?? null;
  const changePasswordNextScreen: Screen = userSession ? 'dashboard' : 'docente-dashboard';
  const changePasswordRole = userSession ? 'estudiante' : 'docente';

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

      if (personaIdRaw && estudianteIdRaw && nombreEstudiante && codigoEstudiante) {
        const restoredStudent: UserSession = {
          id: Number(estudianteIdRaw),
          personaId: Number(personaIdRaw),
          nombre: nombreEstudiante,
          codigo: codigoEstudiante
        };
        setUserSession(restoredStudent);
        setDocenteSession(null);
      } else if (storedDocenteSession && role === 'docente') {
        const parsedDocente = JSON.parse(storedDocenteSession) as DocenteSession;
        setDocenteSession(parsedDocente);
        setUserSession(null);
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
            screen === 'theory-content' ||
            screen === 'quiz-activity' ||
            screen === 'uml-diagram' ||
            screen === 'ai-workshop'
          ) {
            return hasStudentSession && Boolean(nav.selectedContent);
          }
          if (screen === 'docente-dashboard' || screen === 'docente-area-management') return hasDocenteSession;
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
    localStorage.removeItem('adminId');

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
    
    // 🎓 Guardar semestre si viene del backend
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
    localStorage.removeItem('estudianteId');
    localStorage.removeItem('codigoEstudiante');
    localStorage.removeItem('nombreEstudiante');
    localStorage.removeItem('semestreEstudiante');
    localStorage.removeItem('adminId');

    const session: DocenteSession = {
      id: docente.id,
      personaId: docente.personaId,
      nombre: docente.nombre,
      email: docente.email,
      especialidad: docente.especialidad,
      areaId: docente.area?.id,
      areaNombre: docente.area?.nombre
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

  /*const handleLogout = () => {
    setUserSession(null);
    setCurrentScreen('login');
  };*/
  
  // Student login (Google)
  const handleLogin = () => {
    setCurrentScreen('dashboard');
  };

  // Admin login (Ingresar button)
  const handleAdminLogin = () => {
    setCurrentScreen('admin-dashboard');
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
    // Limpiar localStorage
    localStorage.removeItem('estudianteId');
    localStorage.removeItem('personaId');
    localStorage.removeItem('nombreEstudiante');
    localStorage.removeItem('codigoEstudiante');
    localStorage.removeItem('semestreEstudiante');
    localStorage.removeItem('adminId');
    localStorage.removeItem('authToken');
    localStorage.removeItem(DOCENTE_SESSION_KEY);
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

  const handleLogout = () => {
    setCurrentScreen('login');
    setSelectedSubject(null);
    setSelectedContent(null);
    setUserSession(null);
    // Limpiar localStorage
    localStorage.removeItem('estudianteId');
    localStorage.removeItem('personaId');
    localStorage.removeItem('nombreEstudiante');
    localStorage.removeItem('codigoEstudiante');
    localStorage.removeItem('semestreEstudiante');
    localStorage.removeItem('adminId');
    localStorage.removeItem('authToken');
    localStorage.removeItem(DOCENTE_SESSION_KEY);
    clearPersistedNavigation();
    setDocenteSession(null);
    applyAuthHeaders();
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

    const isMiniproyectoAI = Boolean(content.isMiniproyecto && (content.actividadId === 11 || content.actividadId === 13));
    if (isMiniproyectoAI) {
      setCurrentScreen('ai-workshop');
      return;
    }
    if (content.isMiniproyecto) {
      setCurrentScreen('programming-miniproyecto');
      return;
    }
    
    // Determine which view to show based on subject and content type
    if (selectedSubject?.name === 'Fundamentos de Programación') {
      // Programming subject uses the programming view for all content
      setCurrentScreen('programming-content');
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
          onAdminLogin={() => {
            localStorage.setItem(APP_ROLE_KEY, 'admin');
            setCurrentScreen('admin-dashboard');
          }} 
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
          onManageArea={() => setCurrentScreen('docente-area-management')}
        />
      )}

      {currentScreen === 'docente-area-management' && docenteSession?.areaId && (
        <DocenteAreaManagementScreen
          docenteId={docenteSession.id}
          areaId={docenteSession.areaId}
          areaNombre={docenteSession.areaNombre}
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
            if (section === 'sequences') setCurrentScreen('admin-sequences');
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
          <ChatbotButton />
        </>
      )}

      {currentScreen === 'programming-content' && selectedContent && (
        <>
          <ProgrammingContentView
            content={selectedContent}
            onBack={handleBackToSubject}
          />
          <ChatbotButton />
        </>
      )}

      {currentScreen === 'programming-miniproyecto' && selectedContent && (
        <>
          <ProgrammingMiniproyectoView
            content={selectedContent}
            onBack={handleBackToSubject}
          />
          <ChatbotButton />
        </>
      )}

      {currentScreen === 'theory-content' && selectedContent && selectedSubject && userSession && (
        <>
          <TheoryContentView
            subjectName={selectedSubject.name}
            content={selectedContent}
            temaId={selectedTemaId || undefined}
            onBack={handleBackToSubject}
            estudianteId={userSession.id}
          />
          <ChatbotButton />
        </>
      )}

      {currentScreen === 'quiz-activity' && selectedContent && selectedSubject && (
        <>
          <QuizActivityView
            subjectName={selectedSubject.name}
            activity={selectedContent}
            onBack={handleBackToSubject}
          />
          <ChatbotButton />
        </>
      )}

      {currentScreen === 'uml-diagram' && selectedContent && (
        <>
          <UMLDiagramView
            activity={selectedContent}
            onBack={handleBackToSubject}
          />
          <ChatbotButton />
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
    </div>
  );
}
