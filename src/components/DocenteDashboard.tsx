import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { BarChart3, BookOpen, ChevronRight, ClipboardList, Loader2, LogOut, Search } from 'lucide-react';
import { buildAuthHeaders } from '../utils/authHeaders';
import { API_BASE_URL } from '../utils/constants';
import { ChatbotButton } from './ChatbotButton';

const logoImage = new URL('../assets/image-removebg-preview (2).png', import.meta.url).href;

const lazyNamed = <T extends object>(loader: () => Promise<T>, key: keyof T) =>
  lazy(async () => { const mod = await loader(); return { default: mod[key] as React.ComponentType<any> }; });

const AsignaturaDashboardScreen      = lazyNamed(() => import('./AsignaturaDashboardScreen'),      'AsignaturaDashboardScreen');
const TemasManagementScreen          = lazyNamed(() => import('./TemasManagementScreen'),          'TemasManagementScreen');
const SubThemeManagementScreen       = lazyNamed(() => import('./SubThemeManagementScreen'),       'SubThemeManagementScreen');
const SubtemaSequenceManagementScreen= lazyNamed(() => import('./SubtemaSequenceManagementScreen'),'SubtemaSequenceManagementScreen');
const ContentManagementScreen        = lazyNamed(() => import('./ContentManagementScreen'),        'ContentManagementScreen');
const SequenceManagementScreen       = lazyNamed(() => import('./SequenceManagementScreen'),       'SequenceManagementScreen');
const ExerciseManagementScreen       = lazyNamed(() => import('./ExerciseManagementScreen'),       'ExerciseManagementScreen');
const MiniproyectoManagementScreen      = lazyNamed(() => import('./MiniproyectoManagementScreen'),      'MiniproyectoManagementScreen');
const DocenteChatbotManagementScreen    = lazyNamed(() => import('./DocenteChatbotManagementScreen'),    'DocenteChatbotManagementScreen');
const ReportsScreen                     = lazyNamed(() => import('./ReportsScreen'),                     'ReportsScreen');

interface DocenteDashboardProps {
  onLogout: () => void;
  onManageAsignatura?: () => void;
  docente?: {
    id?: number; personaId?: number; nombre?: string; email?: string;
    especialidad?: string; asignaturaId?: number; asignaturaNombre?: string;
  } | null;
}

type DocenteScreen =
  | 'dashboard' | 'asignatura-dashboard' | 'temas' | 'subthemes'
  | 'subtema-sequences' | 'contents' | 'content-management'
  | 'ejercicios' | 'miniproyectos' | 'chatbot' | 'reports';

interface Asignatura { id: number; nombre: string; tipo_pilar?: string | null; estado?: boolean; }

const ScreenLoader = () => (
  <div className="app-shell flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#1a56db' }} />
      <span className="text-sm" style={{ color: '#4a6fa5' }}>Cargando módulo…</span>
    </div>
  </div>
);

export function DocenteDashboard({ onLogout, docente }: DocenteDashboardProps) {
  const [currentScreen, setCurrentScreen] = useState<DocenteScreen>('dashboard');
  const [navigationHistory, setNavigationHistory] = useState<DocenteScreen[]>([]);

  const [asignaturasList, setAsignaturasList] = useState<Asignatura[]>([]);
  const [loadingAsignaturas, setLoadingAsignaturas] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedAsignaturaId, setSelectedAsignaturaId] = useState<number | null>(null);
  const [selectedAsignaturaName, setSelectedAsignaturaName] = useState<string>('');
  const [selectedTemaId, setSelectedTemaId] = useState<number | null>(null);
  const [selectedTemaName, setSelectedTemaName] = useState<string>('');
  const [selectedSubtemaId, setSelectedSubtemaId] = useState<number | null>(null);
  const [selectedSubtemaNombre, setSelectedSubtemaNombre] = useState<string>('');
  const [selectedContenidoId, setSelectedContenidoId] = useState<string | null>(null);

  // Cargar asignaturas del docente
  useEffect(() => {
    if (currentScreen !== 'dashboard') return;
    setLoadingAsignaturas(true);
    fetch(`${API_BASE_URL}/asignaturas/mis-asignaturas`, {
      headers: buildAuthHeaders({ Accept: 'application/json' }), credentials: 'include'
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setAsignaturasList(Array.isArray(data) ? data.filter((a: any) => a.estado !== false) : []))
      .catch(() => setAsignaturasList([]))
      .finally(() => setLoadingAsignaturas(false));
  }, [currentScreen]);

  const navigateTo = useCallback((screen: DocenteScreen) => {
    setNavigationHistory(prev => [...prev, currentScreen]);
    setCurrentScreen(screen);
  }, [currentScreen]);

  const goBack = useCallback(() => {
    const prev = navigationHistory[navigationHistory.length - 1];
    if (prev) {
      setNavigationHistory(h => h.slice(0, -1));
      setCurrentScreen(prev);
    } else {
      setCurrentScreen('dashboard');
    }
  }, [navigationHistory]);

  const goHome = useCallback(() => {
    setNavigationHistory([]);
    setCurrentScreen('dashboard');
    setSelectedAsignaturaId(null);
    setSelectedAsignaturaName('');
    setSelectedTemaId(null);
    setSelectedTemaName('');
    setSelectedSubtemaId(null);
    setSelectedSubtemaNombre('');
    setSelectedContenidoId(null);
  }, []);

  const handleAsignaturaSelect = useCallback((id: number, nombre: string) => {
    setSelectedAsignaturaId(id);
    setSelectedAsignaturaName(nombre);
    setSelectedTemaId(null); setSelectedTemaName('');
    setSelectedSubtemaId(null); setSelectedSubtemaNombre('');
    setSelectedContenidoId(null);
    navigateTo('asignatura-dashboard');
  }, [navigateTo]);

  const handleTemaSelect = useCallback((temaId: number, temaName: string, nextScreen: DocenteScreen = 'subthemes') => {
    setSelectedTemaId(temaId); setSelectedTemaName(temaName);
    setSelectedSubtemaId(null); setSelectedSubtemaNombre('');
    navigateTo(nextScreen);
  }, [navigateTo]);

  const handleSubtemaSelect = useCallback((subtemaId: number, temaId: number, subtemaNombre: string) => {
    setSelectedTemaId(temaId); setSelectedSubtemaId(subtemaId); setSelectedSubtemaNombre(subtemaNombre);
    navigateTo('contents');
  }, [navigateTo]);

  const handleBreadcrumbNavigation = useCallback((index: number) => {
    switch (index) {
      case 0: goHome(); break;
      case 1: setSelectedTemaId(null); setSelectedTemaName(''); setSelectedSubtemaId(null); setSelectedSubtemaNombre(''); setNavigationHistory([]); setCurrentScreen('temas'); break;
      case 2: setSelectedSubtemaId(null); setSelectedSubtemaNombre(''); setNavigationHistory([]); setCurrentScreen('subthemes'); break;
      case 3: setNavigationHistory([]); setCurrentScreen('subtema-sequences'); break;
      default: goHome();
    }
  }, [goHome]);

  const docenteAsignaturaId = selectedAsignaturaId || docente?.asignaturaId || undefined;
  const isContentFlowScoped = !!(selectedAsignaturaId || selectedTemaId || selectedSubtemaId);

  // ── Pantallas de módulos ───────────────────────────────────────────────
  if (currentScreen === 'reports') {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <ReportsScreen onBack={goBack} mode="docente"
          docenteId={docente?.id} docentePersonaId={docente?.personaId}
          docenteAsignaturaId={docenteAsignaturaId} />
      </Suspense>
    );
  }

  if (currentScreen === 'asignatura-dashboard' && selectedAsignaturaId) {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <AsignaturaDashboardScreen
          asignaturaId={selectedAsignaturaId} asignaturaName={selectedAsignaturaName}
          onBack={goBack} onHome={goHome}
          onGoToTemas={() => navigateTo('temas')}
          onGoToContenidos={() => navigateTo('content-management')}
          onGoToMiniproyectos={() => navigateTo('miniproyectos')}
          onGoToEjercicios={() => navigateTo('ejercicios')}
          onGoToChatbot={() => navigateTo('chatbot')}
        />
      </Suspense>
    );
  }

  if (currentScreen === 'temas') {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <TemasManagementScreen
          asignaturaId={selectedAsignaturaId!} asignaturaName={selectedAsignaturaName}
          onBack={goBack} onHome={goHome} mode="docente"
          onSelectTema={(id, name) => handleTemaSelect(id, name, 'subthemes')}
          onNavigateToBreadcrumb={handleBreadcrumbNavigation} />
      </Suspense>
    );
  }

  if (currentScreen === 'subthemes') {
    if (!selectedTemaId) { setCurrentScreen('temas'); return null; }
    return (
      <Suspense fallback={<ScreenLoader />}>
        <SubThemeManagementScreen
          onBack={goBack} onHome={goHome} mode="docente"
          initialAsignaturaId={selectedAsignaturaId || undefined}
          initialTemaId={selectedTemaId}
          onSelectSubtema={handleSubtemaSelect}
          onManageSequences={(aId, aName, tId, tName) => {
            setSelectedAsignaturaId(aId); setSelectedAsignaturaName(aName);
            setSelectedTemaId(tId); setSelectedTemaName(tName);
            setSelectedSubtemaId(null); setSelectedSubtemaNombre('');
            navigateTo('subtema-sequences');
          }}
          onNavigateToBreadcrumb={handleBreadcrumbNavigation} />
      </Suspense>
    );
  }

  if (currentScreen === 'subtema-sequences') {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <SubtemaSequenceManagementScreen
          onBack={goBack} onHome={goHome} mode="docente"
          asignaturaId={selectedAsignaturaId || undefined} asignaturaName={selectedAsignaturaName}
          temaId={selectedTemaId || undefined} temaName={selectedTemaName}
          onNavigateToBreadcrumb={handleBreadcrumbNavigation}
          onSelectSubtema={handleSubtemaSelect} />
      </Suspense>
    );
  }

  if (currentScreen === 'contents') {
    if (selectedSubtemaId && selectedTemaId) {
      return (
        <Suspense fallback={<ScreenLoader />}>
          <SequenceManagementScreen
            onBack={goBack} onHome={goHome} mode="docente"
            subtemaId={selectedSubtemaId} temaId={selectedTemaId}
            asignaturaId={selectedAsignaturaId || undefined}
            asignaturaName={selectedAsignaturaName} temaName={selectedTemaName}
            subtemaNombre={selectedSubtemaNombre}
            onNavigateToBreadcrumb={handleBreadcrumbNavigation}
            onGoToContentManagement={() => navigateTo('content-management')} />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<ScreenLoader />}>
        <ContentManagementScreen
          onBack={goBack} onHome={goHome} mode="docente"
          scopeMode={isContentFlowScoped ? 'flow' : 'catalog'}
          initialAsignaturaId={selectedAsignaturaId || undefined}
          initialAsignaturaName={selectedAsignaturaName || undefined}
          initialTemaId={selectedTemaId || undefined} initialTemaName={selectedTemaName || undefined}
          initialSubtemaId={selectedSubtemaId || undefined} initialSubtemaName={selectedSubtemaNombre || undefined}
          onBreadcrumbPanel={goHome}
          onGoToEjerciciosByContenido={isContentFlowScoped ? (cId) => { setSelectedContenidoId(cId); navigateTo('ejercicios'); } : undefined} />
      </Suspense>
    );
  }

  if (currentScreen === 'content-management') {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <ContentManagementScreen
          onBack={goBack} onHome={goHome} mode="docente"
          scopeMode={isContentFlowScoped ? 'flow' : 'catalog'}
          initialAsignaturaId={selectedAsignaturaId || undefined}
          initialAsignaturaName={selectedAsignaturaName || undefined}
          onBreadcrumbPanel={goHome}
          onGoToEjerciciosByContenido={isContentFlowScoped ? (cId) => { setSelectedContenidoId(cId); navigateTo('ejercicios'); } : undefined} />
      </Suspense>
    );
  }

  if (currentScreen === 'ejercicios') {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <ExerciseManagementScreen
          onBack={goBack} onHome={goHome} mode="docente"
          docenteId={docente?.id} docentePersonaId={docente?.personaId}
          docenteAsignaturaId={docenteAsignaturaId}
          initialTemaId={selectedTemaId || undefined}
          initialSubtemaId={selectedSubtemaId || undefined}
          initialContenidoId={selectedContenidoId || undefined}
          flowAsignaturaName={selectedAsignaturaName || undefined}
          flowTemaName={selectedTemaName || undefined}
          flowSubtemaName={selectedSubtemaNombre || undefined} />
      </Suspense>
    );
  }

  if (currentScreen === 'miniproyectos') {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <MiniproyectoManagementScreen
          onBack={goBack} onHome={goHome} mode="docente"
          docenteId={docente?.id} docentePersonaId={docente?.personaId}
          docenteAsignaturaId={docenteAsignaturaId} />
      </Suspense>
    );
  }

  if (currentScreen === 'chatbot') {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <DocenteChatbotManagementScreen
          onBack={goBack}
          docenteId={docente?.id}
          docentePersonaId={docente?.personaId}
          docenteAsignaturaId={docenteAsignaturaId} />
      </Suspense>
    );
  }

  // ── Dashboard principal ───────────────────────────────────────────────
  const filteredAsignaturas = asignaturasList.filter(a =>
    a.nombre.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const docenteName = docente?.nombre || 'Docente';
  const initial = docenteName.charAt(0).toUpperCase();

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="app-main py-4">
          <div className="app-page-header">
            <div className="app-brand-block">
              <button type="button" onClick={goHome} className="app-brand-icon" title="Panel docente">
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </button>
              <div>
                <h1 className="text-white">Panel docente</h1>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>Aplicación de Apoyo Académico</p>
              </div>
            </div>
            <div className="app-user-chip">
              <div className="app-user-chip__meta">
                <p style={{ fontSize: '0.82rem' }}>{docenteName}</p>
                <p>{docente?.especialidad || 'Docente'}</p>
              </div>
              <div className="app-user-avatar" aria-hidden="true">
                <span className="text-base font-bold">{initial}</span>
              </div>
              <button type="button" onClick={onLogout} className="app-btn app-btn-ghost">
                <LogOut className="w-4 h-4" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        {/* Asignaturas asignadas */}
        <section className="mb-8">
          <div className="app-section-head mb-4">
            <div>
              <h2 className="app-section-title">Asignaturas</h2>
              <p className="app-section-description">Selecciona una asignatura para gestionar sus temas, contenidos, ejercicios y miniproyectos.</p>
            </div>
          </div>

          {/* Buscador */}
          <div className="flex items-center gap-2 rounded-xl px-3 mb-4"
            style={{ background: '#fff', border: '1.5px solid #bfd3f5', height: '40px', maxWidth: '400px' }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: '#4a7ac8' }} />
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar asignatura..." className="flex-1 outline-none text-sm bg-transparent"
              style={{ color: '#1e3a5f' }} />
          </div>

          {loadingAsignaturas ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#1a56db' }} />
            </div>
          ) : filteredAsignaturas.length === 0 ? (
            <div className="app-empty-panel py-10">
              <p style={{ color: '#4a6fa5' }}>
                {asignaturasList.length === 0 ? 'No tienes asignaturas asignadas.' : 'Sin resultados para la búsqueda.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAsignaturas.map(a => (
                <button key={a.id} type="button"
                  onClick={() => handleAsignaturaSelect(a.id, a.nombre)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-4 text-left transition-all"
                  style={{ borderLeft: '3px solid transparent' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderLeftColor = '#1a56db'; (e.currentTarget as HTMLElement).style.borderColor = '#bfd3f5'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderLeftColor = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'; }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#dbeafe' }}>
                    <BookOpen className="w-5 h-5" style={{ color: '#1a56db' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1E293B] truncate">{a.nombre}</p>
                    {a.tipo_pilar && <p className="text-xs text-gray-400 mt-0.5">{a.tipo_pilar}</p>}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Módulos de soporte */}
        <section className="mb-8">
          <div className="app-section-head mb-4">
            <div>
              <h2 className="app-section-title">Soporte</h2>
              <p className="app-section-description">Herramientas de seguimiento e informes académicos.</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.875rem' }}>
            {[
              { label: 'Generación de Informes', desc: 'Consulta y exportación de informes de progreso.', icon: BarChart3, action: () => navigateTo('reports') },
              { label: 'Miniproyectos', desc: 'Gestión de miniproyectos y actividades prácticas.', icon: ClipboardList, action: () => navigateTo('miniproyectos') },
            ].map(item => {
              const Icon = item.icon;
              return (
                <button key={item.label} type="button" onClick={item.action}
                  className="app-list-card text-left flex flex-col">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex items-center justify-center rounded-xl shrink-0" style={{ width: '2.4rem', height: '2.4rem', background: '#dbeafe' }}>
                      <Icon className="w-4 h-4" style={{ color: '#1a56db' }} />
                    </div>
                    <span className="app-list-card__title">{item.label}</span>
                  </div>
                  <p className="app-list-card__description">{item.desc}</p>
                  <div className="app-list-card__footer mt-auto pt-3">
                    <span className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: '#1a56db' }}>
                      Abrir <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </main>

      <ChatbotButton chatbotType="GENERAL_DOCENTE"
        asignaturaId={docenteAsignaturaId}
        contextLabel={selectedAsignaturaName || docente?.asignaturaNombre || 'panel docente'} />
    </div>
  );
}
