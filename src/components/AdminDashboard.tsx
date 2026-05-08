/**
 * Pantalla raíz del rol Administrador.
 *
 * Actúa como router interno entre el dashboard de inicio y los once módulos
 * de gestión (asignaturas, temas, subtemas, secuencias, contenidos, ejercicios,
 * miniproyectos, chatbot, docentes, administradores, carga masiva).
 *
 * Responsabilidades:
 *  • Mantener el estado de navegación (pantalla actual + historial) y
 *    persistirlo en `localStorage` para sobrevivir refrescos.
 *  • Mantener el contexto académico seleccionado (asignatura → tema → subtema)
 *    que se propaga a las pantallas hijas.
 *  • Calcular y exponer las métricas del panel (entidades activas) cuando
 *    la pantalla activa es el dashboard.
 *  • Mostrar el flujo guiado (`AdminFlowGuide`) y las tarjetas de acción
 *    agrupadas por categoría (`workflow` / `support`).
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bot,
  BookOpen,
  ClipboardList,
  FileEdit,
  Loader2,
  LogOut,
  Shield,
  TrendingUp,
  Upload,
  Users,
} from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { API_BASE_URL } from '../utils/constants';
import { cachedFetch } from '../utils/fetchCache';
import { AdminFlowGuide } from './ui/AdminFlowGuide';
import { ChatbotButton } from './ChatbotButton';

/**
 * Envuelve `React.lazy` para módulos que exportan el componente como nombrado
 * (no `default`). Recibe el cargador del módulo y la clave de la exportación
 * deseada y devuelve un componente lazy listo para usarse con `Suspense`.
 */
const lazyNamed = <T extends object>(loader: () => Promise<T>, key: keyof T) =>
  lazy(async () => {
    const mod = await loader();
    return { default: mod[key] as React.ComponentType<any> };
  });

const ContentManagementScreen        = lazyNamed(() => import('./ContentManagementScreen'),        'ContentManagementScreen');
const AsignaturaDashboardScreen      = lazyNamed(() => import('./AsignaturaDashboardScreen'),      'AsignaturaDashboardScreen');
const SequenceManagementScreen       = lazyNamed(() => import('./SequenceManagementScreen'),       'SequenceManagementScreen');
const SubtemaSequenceManagementScreen= lazyNamed(() => import('./SubtemaSequenceManagementScreen'),'SubtemaSequenceManagementScreen');
const AsignaturasManagementScreen          = lazyNamed(() => import('./AsignaturasManagementScreen'),          'AsignaturasManagementScreen');
const TemasManagementScreen          = lazyNamed(() => import('./TemasManagementScreen'),          'TemasManagementScreen');
const SubThemeManagementScreen       = lazyNamed(() => import('./SubThemeManagementScreen'),       'SubThemeManagementScreen');
const MiniproyectoManagementScreen   = lazyNamed(() => import('./MiniproyectoManagementScreen'),   'MiniproyectoManagementScreen');
const ExerciseManagementScreen       = lazyNamed(() => import('./ExerciseManagementScreen'),       'ExerciseManagementScreen');
const ChatbotManagementScreen        = lazyNamed(() => import('./ChatbotManagementScreen'),        'ChatbotManagementScreen');
const DocenteManagementScreen        = lazyNamed(() => import('./DocenteManagementScreen'),        'DocenteManagementScreen');
const AdminManagementScreen          = lazyNamed(() => import('./AdminManagementScreen'),          'AdminManagementScreen');

interface AdminDashboardProps {
  /** Cierra la sesión del administrador y vuelve a la pantalla de login. */
  onLogout: () => void;
  /** Solicita al contenedor padre la navegación a una sección externa al dashboard. */
  onNavigate: (section: 'themes' | 'contents' | 'reports' | 'students' | 'upload' | 'subtema-sequences' | 'subthemes') => void;
}

/** Identificador interno de cada pantalla manejada por el router del dashboard. */
type AdminScreen =
  | 'dashboard'
  | 'asignaturas'
  | 'asignatura-dashboard'
  | 'temas'
  | 'subtema-sequences'
  | 'contents'
  | 'content-management'
  | 'subthemes'
  | 'miniproyectos'
  | 'ejercicios'
  | 'chatbot'
  | 'docentes'
  | 'administradores';

/**
 * Solo métricas macro del panel principal.
 * El detalle por asignatura (temas, contenidos) es accesible
 * mediante drill-down una vez seleccionada el área académica.
 */
type DashboardStats = {
  activeasignaturas: number;
  activeEstudiantes: number;
};

/** Definición de una tarjeta de acción del panel principal. */
type DashboardAction = {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  gradient: string;
  /** Categoría visual: ruta principal del flujo o módulos de soporte. */
  group: 'workflow' | 'support';
  badge: string;
  tone: 'blue' | 'green' | 'amber' | 'slate';
  /** Acción interna: navega a otra pantalla del propio dashboard. */
  onClick?: () => void;
  /** Acción externa: solicita al padre saltar a una sección global. */
  navigateSection?: 'themes' | 'contents' | 'reports' | 'students' | 'upload' | 'subtema-sequences' | 'subthemes';
};

/** Clave bajo la cual se serializa el estado de navegación en `localStorage`. */
const ADMIN_DASHBOARD_STATE_KEY = 'adminDashboardState';

/** Estado inicial de las métricas: todas en cero hasta que el fetch responda. */
const EMPTY_STATS: DashboardStats = {
  activeasignaturas: 0,
  activeEstudiantes: 0,
};

/**
 * Indicador visual que se renderiza mientras un `Suspense` resuelve el chunk
 * de una pantalla cargada de forma diferida.
 */
const ScreenLoader = () => (
  <div className="app-shell flex items-center justify-center" role="status" aria-live="polite">
    <div className="flex flex-col items-center gap-3 text-slate-500">
      <Loader2 className="w-8 h-8 animate-spin text-[#4A90E2]" />
      <span className="text-sm">Cargando módulo…</span>
    </div>
  </div>
);

/**
 * Predicado para considerar activa una entidad. El backend usa `estado: false`
 * para soft-delete; cualquier otro valor (true, undefined, null) se interpreta
 * como activo.
 */
const isActiveFlag = (value: unknown) => value !== false;

export function AdminDashboard({ onLogout, onNavigate }: AdminDashboardProps) {
  /** Pantalla que se renderiza actualmente. */
  const [currentScreen, setCurrentScreen] = useState<AdminScreen>('dashboard');
  /** Pila de pantallas previas; se usa al pulsar "volver". */
  const [navigationHistory, setNavigationHistory] = useState<AdminScreen[]>([]);

  // Contexto académico: asignatura → tema → subtema. Cada nivel se propaga como
  // prop a la pantalla hija para que opere ya filtrada.
  const [selectedAsignaturaId, setSelectedasignaturaId] = useState<number | null>(null);
  const [selectedAsignaturaName, setSelectedasignaturaName] = useState<string>('');
  const [selectedTemaId, setSelectedTemaId] = useState<number | null>(null);
  const [selectedTemaName, setSelectedTemaName] = useState<string>('');
  const [selectedSubtemaId, setSelectedSubtemaId] = useState<number | null>(null);
  const [selectedSubtemaNombre, setSelectedSubtemaNombre] = useState<string>('');

  const [statsData, setStatsData] = useState<DashboardStats>(EMPTY_STATS);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  /**
   * Hidrata el estado del dashboard desde `localStorage` al montar.
   * Si el JSON guardado está corrupto o es de una versión incompatible,
   * se descarta de forma silenciosa y la sesión arranca con los valores por
   * defecto.
   */
  useEffect(() => {
    try {
      const rawState = localStorage.getItem(ADMIN_DASHBOARD_STATE_KEY);
      if (!rawState) return;

      const parsed = JSON.parse(rawState) as Partial<{
        currentScreen: AdminScreen;
        navigationHistory: AdminScreen[];
        selectedAsignaturaId: number | null;
        selectedAsignaturaName: string;
        selectedTemaId: number | null;
        selectedTemaName: string;
        selectedSubtemaId: number | null;
        selectedSubtemaNombre: string;
      }>;

      if (parsed.currentScreen) setCurrentScreen(parsed.currentScreen);
      if (Array.isArray(parsed.navigationHistory)) setNavigationHistory(parsed.navigationHistory);
      if (parsed.selectedAsignaturaId !== undefined) setSelectedasignaturaId(parsed.selectedAsignaturaId);
      if (parsed.selectedAsignaturaName !== undefined) setSelectedasignaturaName(parsed.selectedAsignaturaName);
      if (parsed.selectedTemaId !== undefined) setSelectedTemaId(parsed.selectedTemaId);
      if (parsed.selectedTemaName !== undefined) setSelectedTemaName(parsed.selectedTemaName);
      if (parsed.selectedSubtemaId !== undefined) setSelectedSubtemaId(parsed.selectedSubtemaId);
      if (parsed.selectedSubtemaNombre !== undefined) setSelectedSubtemaNombre(parsed.selectedSubtemaNombre);
    } catch {
      /* Estado serializado inválido — se ignora. */
    }
  }, []);

  /**
   * Persiste cualquier cambio de la navegación o del contexto académico en
   * `localStorage`. La serialización usa la misma estructura que se hidrata
   * en el efecto anterior.
   */
  useEffect(() => {
    localStorage.setItem(
      ADMIN_DASHBOARD_STATE_KEY,
      JSON.stringify({
        currentScreen,
        navigationHistory,
        selectedAsignaturaId,
        selectedAsignaturaName,
        selectedTemaId,
        selectedTemaName,
        selectedSubtemaId,
        selectedSubtemaNombre,
      }),
    );
  }, [
    currentScreen,
    navigationHistory,
    selectedAsignaturaId,
    selectedAsignaturaName,
    selectedTemaId,
    selectedTemaName,
    selectedSubtemaId,
    selectedSubtemaNombre,
  ]);

  /**
   * Carga las métricas del panel mediante cuatro consultas en paralelo:
   * `/asignaturas`, `/temas`, `/estudiante` y `/contenidos`. Solo se dispara
   * cuando la pantalla activa es el dashboard (no al entrar a un submódulo)
   * y soporta cancelación via `isCancelled` para evitar `setState` después
   * de desmontar.
   *
   * Si alguna entidad falla, su contador queda en cero pero el resto del
   * panel sigue disponible.
   */
  useEffect(() => {
    if (currentScreen !== 'dashboard') return;

    let isCancelled = false;

    const loadDashboardStats = async () => {
      setIsLoadingStats(true);
      try {
        const authToken = localStorage.getItem('authToken');
        const headers = {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        };

        /**
         * Intenta resolver el primer endpoint disponible de la lista. Sirve
         * para tolerar diferencias de naming entre versiones del backend
         * (`/estudiante` vs `/estudiantes`, por ejemplo).
         */
        const fetchJsonWithFallback = async (paths: string[]) => {
          let lastError: unknown = null;
          for (const path of paths) {
            try {
              const response = await fetch(`${API_BASE_URL}${path}`, { headers, credentials: 'include' });
              if (!response.ok) {
                lastError = new Error(`HTTP ${response.status} en ${path}`);
                continue;
              }
              return await response.json();
            } catch (error) {
              lastError = error;
            }
          }
          throw lastError || new Error('No se pudo obtener la respuesta del servidor');
        };

        // Endpoint dedicado con COUNT() directos — < 50 ms vs ~800 ms con findAll.
        // Se cachea 60 s para que la navegación dentro del dashboard no vuelva
        // a disparar peticiones en cada render.
        let data: any = null;
        try {
          data = await cachedFetch(`${API_BASE_URL}/asignaturas/admin/stats`, { headers, credentials: 'include' }, 60_000);
        } catch {
          // Fallback: si el endpoint nuevo aún no está disponible, usa los existentes
          const [asignaturas, estudiantes] = await Promise.all([
            fetchJsonWithFallback(['/asignaturas']),
            fetchJsonWithFallback(['/estudiante', '/estudiantes']),
          ]);
          data = {
            asignaturas: { activas: Array.isArray(asignaturas) ? asignaturas.filter((a: any) => isActiveFlag(a?.estado)).length : 0 },
            estudiantes: { activos: Array.isArray(estudiantes) ? estudiantes.filter((e: any) => isActiveFlag(e?.persona?.estado)).length : 0 },
          };
        }

        if (isCancelled) return;

        setStatsData({
          activeasignaturas: data?.asignaturas?.activas ?? 0,
          activeEstudiantes: data?.estudiantes?.activos ?? 0,
        });
      } catch {
        if (!isCancelled) setStatsData(EMPTY_STATS);
      } finally {
        if (!isCancelled) setIsLoadingStats(false);
      }
    };

    loadDashboardStats();
    return () => {
      isCancelled = true;
    };
  }, [currentScreen]);

  /**
   * Empuja la pantalla actual al historial y abre `nextScreen`. Si ya estamos
   * en esa pantalla, no hace nada (evita ciclos en el historial).
   */
  const navigateTo = useCallback(
    (nextScreen: AdminScreen) => {
      if (nextScreen === currentScreen) return;
      setNavigationHistory((prev) => [...prev, currentScreen]);
      setCurrentScreen(nextScreen);
    },
    [currentScreen],
  );

  /**
   * Saca la última entrada del historial y la convierte en la pantalla
   * activa. Si el historial está vacío, regresa al dashboard.
   */
  const goBack = useCallback(() => {
    setNavigationHistory((prev) => {
      if (prev.length === 0) {
        setCurrentScreen('dashboard');
        return prev;
      }
      const newHistory = [...prev];
      const previousScreen = newHistory.pop()!;
      setCurrentScreen(previousScreen);
      return newHistory;
    });
  }, []);

  /** Vuelve al dashboard descartando todo el historial de navegación. */
  const goHome = useCallback(() => {
    setNavigationHistory([]);
    setCurrentScreen('dashboard');
  }, []);

  /**
   * Selecciona un asignatura desde la pantalla de asignaturas y limpia los niveles
   * inferiores (tema/subtema) para que la siguiente pantalla los redefina.
   */
  const handleasignaturaselect = useCallback(
    (asignaturaId: number, asignaturaName: string) => {
      setSelectedasignaturaId(asignaturaId);
      setSelectedasignaturaName(asignaturaName);
      setSelectedTemaId(null);
      setSelectedTemaName('');
      setSelectedSubtemaId(null);
      setSelectedSubtemaNombre('');
      // Primero muestra el dashboard específico de la asignatura.
      // Desde allí el admin navega a temas, contenidos, etc.
      navigateTo('asignatura-dashboard');
    },
    [navigateTo],
  );

  /**
   * Selecciona un tema y navega a la pantalla indicada (por defecto
   * 'subthemes'). El parámetro `nextScreen` permite reusar el handler para
   * flujos alternos (p.ej. saltar directo a secuencias de subtema).
   */
  const handleTemaSelect = useCallback(
    (temaId: number, temaName: string, nextScreen: AdminScreen = 'subthemes') => {
      setSelectedTemaId(temaId);
      setSelectedTemaName(temaName);
      setSelectedSubtemaId(null);
      setSelectedSubtemaNombre('');
      navigateTo(nextScreen);
    },
    [navigateTo],
  );

  /**
   * Selecciona un subtema y navega a la gestión de contenidos en su contexto.
   * Reasigna también `selectedTemaId` porque el subtema se elige desde la
   * pantalla de secuencias de subtema y allí se conoce el tema padre.
   */
  const handleSubtemaSelect = useCallback(
    (subtemaId: number, temaId: number, subtemaNombre: string) => {
      setSelectedTemaId(temaId);
      setSelectedSubtemaId(subtemaId);
      setSelectedSubtemaNombre(subtemaNombre);
      navigateTo('contents');
    },
    [navigateTo],
  );

  /**
   * Solo se exponen indicadores macro en el panel principal.
   * El detalle de temas, contenidos y subtemas es visible únicamente
   * dentro del flujo de una asignatura específica (drill-down).
   */
  const stats = useMemo(
    () => [
      { label: 'Asignaturas activas', value: statsData.activeasignaturas, icon: BookOpen, color: 'var(--color-primary)' },
      { label: 'Estudiantes activos', value: statsData.activeEstudiantes,  icon: Users,   color: 'var(--color-accent-orange)' },
    ],
    [statsData],
  );

  /**
   * Catálogo declarativo de tarjetas de acción. Cada entrada describe el
   * módulo que abre, su grupo (workflow vs support) y la ruta a invocar:
   *  • `onClick`        → navegación interna del propio dashboard.
   *  • `navigateSection`→ delega al padre vía `onNavigate` (rutas globales).
   */
  const actions = useMemo<DashboardAction[]>(
    () => [
      { id: 'asignaturas',          title: 'Gestión de Asignaturas',           description: 'Registro y organización de asignaturas académicas.',                       icon: BookOpen,      color: '#4A90E2', gradient: 'from-[#4A90E2] to-[#5B9FED]', group: 'workflow', badge: 'Paso 1',       tone: 'blue',  onClick: () => navigateTo('asignaturas') },
      { id: 'contents',       title: 'Catálogo de Contenidos',     description: 'Administración del catálogo de contenidos, recursos y actividades.', icon: TrendingUp,    color: '#0F766E', gradient: 'from-[#0F766E] to-[#14B8A6]', group: 'workflow', badge: 'Paso final',   tone: 'green', onClick: () => navigateTo('content-management') },
      { id: 'ejercicios',     title: 'Gestión de Ejercicios',      description: 'Creación y edición de ejercicios asociados a contenidos.',           icon: ClipboardList, color: '#0EA5E9', gradient: 'from-[#0EA5E9] to-[#38BDF8]', group: 'workflow', badge: 'Complemento',  tone: 'blue',  onClick: () => navigateTo('ejercicios') },
      { id: 'miniproyectos',  title: 'Gestión de Miniproyectos',   description: 'Administración de miniproyectos y actividades relacionadas.',         icon: ClipboardList, color: '#0EA5E9', gradient: 'from-[#0EA5E9] to-[#38BDF8]', group: 'workflow', badge: 'Complemento',  tone: 'green', onClick: () => navigateTo('miniproyectos') },
      { id: 'reports',        title: 'Generación de Informes',     description: 'Consulta y exportación de informes de progreso y estado.',           icon: BarChart3,     color: '#F5A97F', gradient: 'from-[#F5A97F] to-[#F7B98F]', group: 'support',  badge: 'Seguimiento',  tone: 'amber', navigateSection: 'reports' },
      { id: 'docentes',       title: 'Gestión de Docentes',        description: 'Administración de docentes, especialidades y asignaturas asignadas.',      icon: Users,         color: '#14B8A6', gradient: 'from-[#14B8A6] to-[#2DD4BF]', group: 'support',  badge: 'Operación',    tone: 'green', onClick: () => navigateTo('docentes') },
      { id: 'administradores',title: 'Gestión de Administradores', description: 'Administración de cuentas y credenciales del rol administrador.',    icon: Shield,        color: '#2563EB', gradient: 'from-[#2563EB] to-[#3B82F6]', group: 'support',  badge: 'Control',      tone: 'blue',  onClick: () => navigateTo('administradores') },
      { id: 'upload',         title: 'Carga Masiva de Estudiantes',description: 'Importación masiva de estudiantes desde archivo Excel.',            icon: Upload,        color: '#F472B6', gradient: 'from-[#F472B6] to-[#FB87C6]', group: 'support',  badge: 'Operación',    tone: 'amber', navigateSection: 'upload' },
      { id: 'chatbot',        title: 'Gestión del Chatbot',        description: 'Administración de documentos y actualización de la base de conocimiento.', icon: Bot,       color: '#6366F1', gradient: 'from-[#6366F1] to-[#818CF8]', group: 'support',  badge: 'Soporte',      tone: 'slate', onClick: () => navigateTo('chatbot') },
    ],
    [navigateTo],
  );

  /** Indicadores de qué nivel del contexto académico está poblado. */
  const hasAsignaturaContext = Boolean(selectedAsignaturaId);
  const hasTemaContext = Boolean(selectedTemaId);
  const hasSubtemaContext = Boolean(selectedSubtemaId);

  /**
   * Devuelve un handler para `onNavigateToBreadcrumb` según el contexto actual.
   * Cada nivel (index) corresponde a una posición en el breadcrumb:
   *   0 = "Panel admin"  → dashboard
   *   1 = asignatura     → listado de temas de esa asignatura
   *   2 = tema           → listado de subtemas de ese tema
   *   3 = subtema        → secuencias de ese subtema
   * Se usa en TODOS los componentes de gestión para unificar la navegación.
   */
  const handleBreadcrumbNavigation = useCallback((index: number) => {
    switch (index) {
      case 0:
        goHome();
        break;
      case 1:
        setSelectedTemaId(null);
        setSelectedTemaName('');
        setSelectedSubtemaId(null);
        setSelectedSubtemaNombre('');
        setNavigationHistory([]);
        setCurrentScreen('temas');
        break;
      case 2:
        setSelectedSubtemaId(null);
        setSelectedSubtemaNombre('');
        setNavigationHistory([]);
        setCurrentScreen('subthemes');
        break;
      case 3:
        setNavigationHistory([]);
        setCurrentScreen('subtema-sequences');
        break;
      default:
        goHome();
    }
  }, [goHome]);

  /** Etiqueta del breadcrumb actual derivada del nivel más profundo activo. */
  const currentFlowLabel = hasSubtemaContext
    ? 'Secuencias y contenidos'
    : hasTemaContext
      ? 'Subtemas'
      : hasAsignaturaContext
        ? 'Temas'
        : 'Asignaturas';

  /** Tarjetas pertenecientes a la ruta principal de gestión académica. */
  const academicActions = useMemo(() => actions.filter((a) => a.group === 'workflow'), [actions]);
  /** Tarjetas pertenecientes al grupo de soporte y administración. */
  const supportActions  = useMemo(() => actions.filter((a) => a.group === 'support'),  [actions]);

  /** Última pantalla visitada antes de la actual; usado por la lógica de scope. */
  const lastNavigationScreen = navigationHistory.length > 0 ? navigationHistory[navigationHistory.length - 1] : null;

  /**
   * `true` cuando el catálogo de contenidos se abrió DESDE el flujo de
   * gestión académica (asignatura/tema/subtema seleccionado) en lugar del acceso
   * directo desde el dashboard. Determina si la pantalla de contenidos debe
   * filtrarse por contexto (`flow`) o mostrar el catálogo completo (`catalog`).
   */
  const isContentManagementFlowScoped =
    lastNavigationScreen === 'contents' && (hasAsignaturaContext || hasTemaContext || hasSubtemaContext);

  /**
   * Despacha la activación de una tarjeta. Si tiene `onClick` lo ejecuta
   * (navegación interna); si no, delega al padre vía `onNavigate`
   * (navegación externa).
   */
  const openAction = useCallback(
    (action: DashboardAction) => {
      if (action.onClick) {
        action.onClick();
        return;
      }
      if (action.navigateSection) onNavigate(action.navigateSection);
    },
    [onNavigate],
  );

  /**
   * Dibuja una tarjeta de acción a partir de una entrada del catálogo
   * `actions`. El `aria-label` garantiza un nombre accesible para lectores
   * de pantalla.
   */
  const renderActionCard = useCallback(
    (action: DashboardAction) => {
      const Icon = action.icon;
      return (
        <button
          key={action.id}
          type="button"
          onClick={() => openAction(action)}
          aria-label={`Abrir ${action.title}`}
          className="app-list-card group border-transparent text-left"
        >
          <div className="app-list-card__head">
            <div
              className={`app-list-card__icon bg-gradient-to-br ${action.gradient} shadow-md`}
              style={{ backgroundColor: action.color }}
            >
              <Icon className="w-6 h-6 text-white" aria-hidden="true" />
            </div>
            <span className={`app-badge app-badge--${action.tone}`}>{action.badge}</span>
          </div>
          <div>
            <div className="app-list-card__title">{action.title}</div>
            <div className="app-list-card__description mt-2">{action.description}</div>
          </div>
          <div className="app-list-card__footer">
            <span className="app-list-card__meta">
              {action.group === 'workflow' ? 'Ruta principal' : 'Soporte operativo'}
            </span>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563eb]">
              Abrir
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </span>
          </div>
        </button>
      );
    },
    [openAction],
  );

  // ─────────────────────────────────────────────────────────────────────
  // Router interno
  //
  // Cada `if` evalúa la pantalla activa y delega en la pantalla hija
  // correspondiente. Cuando una pantalla requiere un contexto que aún no
  // está poblado (p.ej. abrir 'temas' sin un asignatura seleccionada), se
  // redirige automáticamente al paso anterior para que el usuario lo
  // complete. Esto evita estados inválidos en submódulos.
  // ─────────────────────────────────────────────────────────────────────

  // ── Dashboard específico de asignatura ──────────────────────────────────
  // Se muestra tras seleccionar una asignatura del listado. Presenta métricas
  // propias (temas, contenidos, estudiantes, miniproyectos) y accesos directos
  // a los módulos de esa asignatura, sin mezclar datos globales.
  if (currentScreen === 'asignatura-dashboard' && selectedAsignaturaId) {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <AsignaturaDashboardScreen
          asignaturaId={selectedAsignaturaId}
          asignaturaName={selectedAsignaturaName}
          onBack={goBack}
          onHome={goHome}
          onGoToTemas={() => navigateTo('temas')}
          onGoToContenidos={() => navigateTo('content-management')}
          onGoToMiniproyectos={() => navigateTo('miniproyectos')}
          onGoToEjercicios={() => navigateTo('ejercicios')}
        />
      </Suspense>
    );
  }

  if (currentScreen === 'subthemes') {
    // Subtemas requiere asignatura Y tema. Si falta alguno, se baja al paso
    // correspondiente sin perder la pantalla destino del historial.
    if (!selectedAsignaturaId) {
      return (
        <Suspense fallback={<ScreenLoader />}>
          <AsignaturasManagementScreen onBack={goBack} onHome={goHome} onSelectAsignatura={handleasignaturaselect} />
        </Suspense>
      );
    }
    if (!selectedTemaId) {
      return (
        <Suspense fallback={<ScreenLoader />}>
          <TemasManagementScreen
            asignaturaId={selectedAsignaturaId}
            asignaturaName={selectedAsignaturaName}
            onBack={goBack}
            onHome={goHome}
            onSelectTema={(temaId, temaName) => handleTemaSelect(temaId, temaName, 'subthemes')}
          onNavigateToBreadcrumb={handleBreadcrumbNavigation}
          />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<ScreenLoader />}>
        <SubThemeManagementScreen
          onBack={goBack}
          onHome={goHome}
          initialAsignaturaId={selectedAsignaturaId}
          initialTemaId={selectedTemaId}
          onNavigateToBreadcrumb={handleBreadcrumbNavigation}
          onManageSequences={(nextasignaturaId, nextasignaturaName, nextTemaId, nextTemaName) => {
            // Salta a la gestión de secuencias dentro del mismo tema
            // refrescando el contexto recibido por el callback.
            setSelectedasignaturaId(nextasignaturaId);
            setSelectedasignaturaName(nextasignaturaName);
            setSelectedTemaId(nextTemaId);
            setSelectedTemaName(nextTemaName);
            setSelectedSubtemaId(null);
            setSelectedSubtemaNombre('');
            navigateTo('subtema-sequences');
          }}
        />
      </Suspense>
    );
  }

  if (currentScreen === 'asignaturas') {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <AsignaturasManagementScreen onBack={goBack} onHome={goHome} onSelectAsignatura={handleasignaturaselect} />
      </Suspense>
    );
  }

  if (currentScreen === 'temas') {
    if (!selectedAsignaturaId) {
      return (
        <Suspense fallback={<ScreenLoader />}>
          <AsignaturasManagementScreen onBack={goBack} onHome={goHome} onSelectAsignatura={handleasignaturaselect} />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<ScreenLoader />}>
        <TemasManagementScreen
          asignaturaId={selectedAsignaturaId}
          asignaturaName={selectedAsignaturaName}
          onBack={goBack}
          onHome={goHome}
          onSelectTema={(temaId, temaName) => handleTemaSelect(temaId, temaName, 'subthemes')}
          onNavigateToBreadcrumb={handleBreadcrumbNavigation}
        />
      </Suspense>
    );
  }

  if (currentScreen === 'subtema-sequences') {
    if (!selectedAsignaturaId) {
      return (
        <Suspense fallback={<ScreenLoader />}>
          <AsignaturasManagementScreen onBack={goBack} onHome={goHome} onSelectAsignatura={handleasignaturaselect} />
        </Suspense>
      );
    }
    if (!selectedTemaId) {
      return (
        <Suspense fallback={<ScreenLoader />}>
          <TemasManagementScreen
            asignaturaId={selectedAsignaturaId}
            asignaturaName={selectedAsignaturaName}
            onBack={goBack}
            onHome={goHome}
            onSelectTema={(temaId, temaName) => handleTemaSelect(temaId, temaName, 'subthemes')}
          onNavigateToBreadcrumb={handleBreadcrumbNavigation}
          />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<ScreenLoader />}>
        <SubtemaSequenceManagementScreen
          onBack={goBack}
          onHome={goHome}
          onSelectSubtema={handleSubtemaSelect}
          onNavigateToBreadcrumb={handleBreadcrumbNavigation}
          asignaturaId={selectedAsignaturaId || undefined}
          asignaturaName={selectedAsignaturaName}
          temaId={selectedTemaId || undefined}
          temaName={selectedTemaName}
        />
      </Suspense>
    );
  }

  if (currentScreen === 'miniproyectos') {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <MiniproyectoManagementScreen onBack={goBack} onHome={goHome} />
      </Suspense>
    );
  }

  if (currentScreen === 'ejercicios') {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <ExerciseManagementScreen onBack={goBack} onHome={goHome} />
      </Suspense>
    );
  }

  if (currentScreen === 'chatbot') {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <ChatbotManagementScreen onBack={goBack} />
      </Suspense>
    );
  }

  if (currentScreen === 'docentes') {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <DocenteManagementScreen onBack={goBack} onHome={goHome} />
      </Suspense>
    );
  }

  if (currentScreen === 'administradores') {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <AdminManagementScreen onBack={goBack} onHome={goHome} />
      </Suspense>
    );
  }

  if (currentScreen === 'contents') {
    // Cuando hay subtema seleccionado se entra a la gestión de secuencias
    // del subtema; en otro caso al catálogo general filtrado por contexto.
    if (selectedSubtemaId && selectedTemaId) {
      return (
        <Suspense fallback={<ScreenLoader />}>
          <SequenceManagementScreen
            onBack={() => {
              // Al volver desde secuencias, el subtema deja de tener sentido
              // como contexto activo y se descarta antes de regresar.
              setSelectedSubtemaId(null);
              setSelectedSubtemaNombre('');
              goBack();
            }}
            onHome={goHome}
            onGoToContentManagement={() => navigateTo('content-management')}
            onNavigateToBreadcrumb={handleBreadcrumbNavigation}
            subtemaId={selectedSubtemaId}
            temaId={selectedTemaId}
            asignaturaId={selectedAsignaturaId || undefined}
            asignaturaName={selectedAsignaturaName}
            temaName={selectedTemaName}
            subtemaNombre={selectedSubtemaNombre}
          />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<ScreenLoader />}>
        <ContentManagementScreen
          onBack={goBack}
          onHome={goHome}
          scopeMode={hasAsignaturaContext || hasTemaContext || hasSubtemaContext ? 'flow' : 'catalog'}
          initialAsignaturaId={selectedAsignaturaId || undefined}
          initialAsignaturaName={selectedAsignaturaName || undefined}
          initialTemaId={selectedTemaId || undefined}
          initialTemaName={selectedTemaName || undefined}
          initialSubtemaId={selectedSubtemaId || undefined}
          initialSubtemaName={selectedSubtemaNombre || undefined}
          onBreadcrumbPanel={goHome}
          onBreadcrumbAsignatura={() => {
            // Regresa al listado de temas de la asignatura actual
            setSelectedTemaId(null);
            setSelectedTemaName('');
            setSelectedSubtemaId(null);
            setSelectedSubtemaNombre('');
            setNavigationHistory([]);
            setCurrentScreen('temas');
          }}
          onBreadcrumbTema={() => {
            // Regresa al listado de subtemas del tema actual
            setSelectedSubtemaId(null);
            setSelectedSubtemaNombre('');
            setNavigationHistory([]);
            setCurrentScreen('subthemes');
          }}
          onBreadcrumbSubtema={() => {
            // Regresa a la gestión de secuencias del subtema actual
            setNavigationHistory([]);
            setCurrentScreen('contents');
          }}
        />
      </Suspense>
    );
  }

  if (currentScreen === 'content-management') {
    // Solo se aplica el filtro por contexto si la apertura provino del
    // flujo (variable `isContentManagementFlowScoped`); en caso contrario
    // se muestra el catálogo completo.
    return (
      <Suspense fallback={<ScreenLoader />}>
        <ContentManagementScreen
          onBack={goBack}
          onHome={goHome}
          scopeMode={isContentManagementFlowScoped ? 'flow' : 'catalog'}
          initialAsignaturaId={isContentManagementFlowScoped ? selectedAsignaturaId || undefined : undefined}
          initialAsignaturaName={isContentManagementFlowScoped ? selectedAsignaturaName || undefined : undefined}
          initialTemaId={isContentManagementFlowScoped ? selectedTemaId || undefined : undefined}
          initialTemaName={isContentManagementFlowScoped ? selectedTemaName || undefined : undefined}
          initialSubtemaId={isContentManagementFlowScoped ? selectedSubtemaId || undefined : undefined}
          initialSubtemaName={isContentManagementFlowScoped ? selectedSubtemaNombre || undefined : undefined}
          onBreadcrumbPanel={goHome}
          onBreadcrumbAsignatura={isContentManagementFlowScoped ? () => {
            setSelectedTemaId(null);
            setSelectedTemaName('');
            setSelectedSubtemaId(null);
            setSelectedSubtemaNombre('');
            setNavigationHistory([]);
            setCurrentScreen('temas');
          } : undefined}
          onBreadcrumbTema={isContentManagementFlowScoped ? () => {
            setSelectedSubtemaId(null);
            setSelectedSubtemaNombre('');
            setNavigationHistory([]);
            setCurrentScreen('subthemes');
          } : undefined}
          onBreadcrumbSubtema={isContentManagementFlowScoped ? () => {
            setNavigationHistory([]);
            setCurrentScreen('contents');
          } : undefined}
        />
      </Suspense>
    );
  }

  // Pantalla principal del dashboard: cabecera, métricas, flujo guiado
  // y las dos rejillas de tarjetas de acción.
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-main py-4">
          <div className="app-page-header">
            <div className="app-brand-block">
              <div className="app-brand-icon">
                <img
                  src={logoImage}
                  alt="EduPath"
                  className="w-full h-full object-contain"
                  width={48}
                  height={48}
                  decoding="async"
                />
              </div>
              <div>
                <h1 className="text-[#3A4A5B]">Panel de Administrador</h1>
                <p className="text-slate-600 text-sm">Acceso a los módulos del rol administrador.</p>
              </div>
            </div>

            <div className="app-user-chip">
              <div className="app-user-chip__meta">
                <p>Admin Usuario</p>
                <p>Coordinador Académico</p>
              </div>
              <div className="app-user-avatar" aria-hidden="true">
                <span className="text-xl">A</span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                aria-label="Cerrar sesión del administrador"
                className="app-btn app-btn-ghost"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="app-section-head mb-6">
          <div>
            <h2 className="app-section-title">Módulos del administrador</h2>
            <p className="app-section-description">Panel principal con acceso a los módulos del rol administrador.</p>
          </div>
        </div>

        <section className="mb-8">
          <div className="app-section-head">
            <div>
              <h3 className="app-section-title">Gestión académica</h3>
              <p className="app-section-description">Módulos para asignaturas, contenidos, ejercicios y miniproyectos.</p>
            </div>
          </div>
          <div className="app-card-grid">{academicActions.map(renderActionCard)}</div>
        </section>

        <section className="mb-8">
          <div className="app-section-head">
            <div>
              <h3 className="app-section-title">Administración y soporte</h3>
              <p className="app-section-description">Módulos para usuarios, informes, carga masiva y servicios del sistema.</p>
            </div>
          </div>
          <div className="app-card-grid">{supportActions.map(renderActionCard)}</div>
        </section>
      </main>

      <ChatbotButton chatbotType="GENERAL_ADMINISTRADOR" contextLabel="panel administrativo" />
    </div>
  );
}
