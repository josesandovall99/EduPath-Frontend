import { useState } from 'react';
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
import { TheoryContentView } from './components/TheoryContentView';
import { QuizActivityView } from './components/QuizActivityView';
import { UMLDiagramView } from './components/UMLDiagramView';
import { AIWorkshopView } from './components/AIWorkshopView';
import { ChatbotButton } from './components/ChatbotButton';
import { ChangePasswordScreen } from './components/changePassword';
import { StudentUploadScreen } from './components/StudentUploadScreen';

type Screen = 
  | 'login' 
  | 'admin-register'
  | 'dashboard' 
  | 'change-password' // Nueva pantalla
  | 'admin-dashboard'
  | 'admin-themes'
  | 'admin-contents'
  | 'admin-reports'
  | 'admin-students'
  | 'subject-content' 
  | 'programming-content'
  | 'theory-content'
  | 'quiz-activity'
  | 'uml-diagram'
  | 'admin-upload' // 1. Agregamos este estado
  | 'ai-workshop';



// Interfaz para la sesión del usuario
interface UserSession {
  id: number;
  personaId: number;
  nombre: string;
  codigo: string;
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
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [selectedTemaId, setSelectedTemaId] = useState<string | null>(null);
  const [userData, setUserData] = useState<{id: number, personaId: number, nombre: string} | null>(null);
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  

  // Función que se llama cuando el login es exitoso
  // 2. Función manejadora del Login Exitoso
  const handleLoginSuccess = (apiResponse: any) => {
    // Guardamos los datos importantes que vienen del backend
    setUserSession({
      id: apiResponse.estudiante.id,
      personaId: apiResponse.estudiante.personaId,
      nombre: apiResponse.estudiante.nombre,
      codigo: apiResponse.estudiante.codigo
    });

    // Decidimos a dónde ir basado en el flag 'primerIngreso'
    if (apiResponse.primerIngreso) {
      setCurrentScreen('change-password');
    } else {
      setCurrentScreen('dashboard');
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
  };

  const handleLogout = () => {
    setCurrentScreen('login');
    setSelectedSubject(null);
    setSelectedContent(null);
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
    if (temaId) {
      setSelectedTemaId(temaId);
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
          onLogin={handleLogin}
          onAdminLogin={() => setCurrentScreen('admin-dashboard')} 
          onShowRegister={() => setCurrentScreen('admin-register')} 
        />
      )}

      {/* Pantalla de Cambio de Contraseña */}
      {currentScreen === 'change-password' && userSession && (
        <ChangePasswordScreen 
          personaId={userSession.personaId} // Pasamos el ID necesario
          onComplete={() => setCurrentScreen('dashboard')} // Al terminar, va al dashboard
          isFirstLogin={true}
        />
      )}

      {currentScreen === 'dashboard' && userSession && (
              <DashboardScreen 
                userName={userSession.nombre} // Pasamos el nombre para el saludo
                onSubjectSelect={handleSubjectSelect}
                onLogout={handleLogout}
              />
            )}

      {/* DASHBOARD ADMIN */}
      {currentScreen === 'admin-dashboard' && (
        <AdminDashboard
          onLogout={handleLogout}
          onNavigate={(section) => {
            // 2. Manejamos la navegación según el botón presionado
            if (section === 'themes') setCurrentScreen('admin-themes');
            if (section === 'contents') setCurrentScreen('admin-contents');
            if (section === 'reports') setCurrentScreen('admin-reports');
            if (section === 'students') setCurrentScreen('admin-students');
            if (section === 'upload') setCurrentScreen('admin-upload'); 
          }}
        />
      )}

      {/* 3. Renderizamos la pantalla de carga masiva */}
      {currentScreen === 'admin-upload' && (
        <StudentUploadScreen 
          onBack={() => setCurrentScreen('admin-dashboard')} 
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
      
      {currentScreen === 'subject-content' && selectedSubject && (
        <>
          <SubjectContentScreen 
            subject={selectedSubject}
            onBack={handleBackToDashboard}
            onContentSelect={handleContentSelect}
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
          />
          {/* Note: ChatbotButton is integrated into AIWorkshopView */}
        </>
      )}
    </div>
  );
}
