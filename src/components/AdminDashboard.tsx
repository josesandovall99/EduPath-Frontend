/**
 * Pantalla raíz del rol Administrador.
 *
 * Actúa como router interno entre el dashboard de inicio y los once módulos
 * de gestión (áreas, temas, subtemas, secuencias, contenidos, ejercicios,
 * miniproyectos, chatbot, docentes, administradores, carga masiva).
 *
 * Responsabilidades:
 *  • Mantener el estado de navegación (pantalla actual + historial) y
 *    persistirlo en `localStorage` para sobrevivir refrescos.
 *  • Mantener el contexto académico seleccionado (área → tema → subtema)
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
const SequenceManagementScreen       = lazyNamed(() => import('./SequenceManagementScreen'),       'SequenceManagementScreen');
const SubtemaSequenceManagementScreen= lazyNamed(() => import('./SubtemaSequenceManagementScreen'),'SubtemaSequenceManagementScreen');
const AreasManagementScreen          = lazyNamed(() => import('./AreasManagementScreen'),          'AreasManagementScreen');
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
  | 'areas'
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

/** Conteo de entidades activas que se muestra en las tarjetas de métricas. */
type DashboardStats = {
  activeAreas: number;
  activeTemas: number;
  activeEstudiantes: number;
  activeContenidos: number;
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
  activeAreas: 0,
  activeTemas: 0,
  activeEstudiantes: 0,
  activeContenidos: 0,
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

  // Contexto académico: área → tema → subtema. Cada nivel se propaga como
  // prop a la pantalla hija para que opere ya filtrada.
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [selectedAreaName, setSelectedAreaName] = useState<string>('');
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
        selectedAreaId: number | null;
        selectedAreaName: string;
        selectedTemaId: number | null;
        selectedTemaName: string;
        selectedSubtemaId: number | null;
        selectedSubtemaNombre: string;
      }>;

      if (parsed.currentScreen) setCurrentScreen(parsed.currentScreen);
      if (Array.isArray(parsed.navigationHistory)) setNavigationHistory(parsed.navigationHistory);
      if (parsed.selectedAreaId !== undefined) setSelectedAreaId(parsed.selectedAreaId);
      if (parsed.selectedAreaName !== undefined) setSelectedAreaName(parsed.selectedAreaName);
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
        selectedAreaId,
        selectedAreaName,
        selectedTemaId,
        selectedTemaName,
        selectedSubtemaId,
        selectedSubtemaNombre,
      }),
    );
  }, [
    currentScreen,
    navigationHistory,
    selectedAreaId,
    selectedAreaName,
    selectedTemaId,
    selectedTemaName,
    selectedSubtemaId,
    selectedSubtemaNombre,
  ]);

  /**
   * Carga las métricas del panel mediante cuatro consultas en paralelo:
   * `/areas`, `/temas`, `/estudiante` y `/contenidos`. Solo se dispara
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

        const [areas, temas, estudiantes, contenidos] = await Promise.all([
          fetchJsonWithFallback(['/areas']),
          fetchJsonWithFallback(['/temas']),
          fetchJsonWithFallback(['/estudiante', '/estudiantes']),
          fetchJsonWithFallback(['/contenidos']),
        ]);

        if (isCancelled) return;

        // El backend devuelve listas planas; se filtran las entidades
        // activas y se cuenta la cardinalidad resultante.
        setStatsData({
          activeAreas: Array.isArray(areas) ? areas.filter((area) => isActiveFlag(area?.estado)).length : 0,
          activeTemas: Array.isArray(temas) ? temas.filter((tema) => isActiveFlag(tema?.estado)).length : 0,
          activeEstudiantes: Array.isArray(estudiantes)
            ? estudiantes.filter((estudiante) => isActiveFlag(estudiante?.persona?.estado)).length
            : 0,
          activeContenidos: Array.isArray(contenidos)
            ? contenidos.filter((contenido) => isActiveFlag(contenido?.estado)).length
            : 0,
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
   * Selecciona un área desde la pantalla de áreas y limpia los niveles
   * inferiores (tema/subtema) para que la siguiente pantalla los redefina.
   */
  const handleAreaSelect = useCallback(
    (areaId: number, areaName: string) => {
      setSelectedAreaId(areaId);
      setSelectedAreaName(areaName);
      setSelectedTemaId(null);
      setSelectedTemaName('');
      setSelectedSubtemaId(null);
      setSelectedSubtemaNombre('');
      navigateTo('temas');
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

  /** Configuración de las tarjetas de métricas mostradas en la cabecera. */
  const stats = useMemo(
    () => [
      { label: 'Áreas activas',        value: statsData.activeAreas,        icon: BookOpen,    color: '#4A90E2' },
      { label: 'Temas activos',        value: statsData.activeTemas,        icon: FileEdit,    color: '#7ED6A7' },
      { label: 'Estudiantes activos',  value: statsData.activeEstudiantes,  icon: Users,       color: '#F5A97F' },
      { label: 'Contenidos activos',   value: statsData.activeContenidos,   icon: TrendingUp,  color: '#14B8A6' },
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
      { id: 'areas',          title: 'Gestión de Áreas',           description: 'Registro y organización de áreas académicas.',                       icon: BookOpen,      color: '#4A90E2', gradient: 'from-[#4A90E2] to-[#5B9FED]', group: 'workflow', badge: 'Paso 1',       tone: 'blue',  onClick: () => navigateTo('areas') },
      { id: 'contents',       title: 'Catálogo de Contenidos',     description: 'Administración del catálogo de contenidos, recursos y actividades.', icon: TrendingUp,    color: '#0F766E', gradient: 'from-[#0F766E] to-[#14B8A6]', group: 'workflow', badge: 'Paso final',   tone: 'green', onClick: () => navigateTo('content-management') },
      { id: 'ejercicios',     title: 'Gestión de Ejercicios',      description: 'Creación y edición de ejercicios asociados a contenidos.',           icon: ClipboardList, color: '#0EA5E9', gradient: 'from-[#0EA5E9] to-[#38BDF8]', group: 'workflow', badge: 'Complemento',  tone: 'blue',  onClick: () => navigateTo('ejercicios') },
      { id: 'miniproyectos',  title: 'Gestión de Miniproyectos',   description: 'Administración de miniproyectos y actividades relacionadas.',         icon: ClipboardList, color: '#0EA5E9', gradient: 'from-[#0EA5E9] to-[#38BDF8]', group: 'workflow', badge: 'Complemento',  tone: 'green', onClick: () => navigateTo('miniproyectos') },
      { id: 'reports',        title: 'Generación de Informes',     description: 'Consulta y exportación de informes de progreso y estado.',           icon: BarChart3,     color: '#F5A97F', gradient: 'from-[#F5A97F] to-[#F7B98F]', group: 'support',  badge: 'Seguimiento',  tone: 'amber', navigateSection: 'reports' },
      { id: 'docentes',       title: 'Gestión de Docentes',        description: 'Administración de docentes, especialidades y áreas asignadas.',      icon: Users,         color: '#14B8A6', gradient: 'from-[#14B8A6] to-[#2DD4BF]', group: 'support',  badge: 'Operación',    tone: 'green', onClick: () => navigateTo('docentes') },
      { id: 'administradores',title: 'Gestión de Administradores', description: 'Administración de cuentas y credenciales del rol administrador.',    icon: Shield,        color: '#2563EB', gradient: 'from-[#2563EB] to-[#3B82F6]', group: 'support',  badge: 'Control',      tone: 'blue',  onClick: () => navigateTo('administradores') },
      { id: 'upload',         title: 'Carga Masiva de Estudiantes',description: 'Importación masiva de estudiantes desde archivo Excel.',            icon: Upload,        color: '#F472B6', gradient: 'from-[#F472B6] to-[#FB87C6]', group: 'support',  badge: 'Operación',    tone: 'amber', navigateSection: 'upload' },
      { id: 'chatbot',        title: 'Gestión del Chatbot',        description: 'Administración de documentos y actualización de la base de conocimiento.', icon: Bot,       color: '#6366F1', gradient: 'from-[#6366F1] to-[#818CF8]', group: 'support',  badge: 'Soporte',      tone: 'slate', onClick: () => navigateTo('chatbot') },
    ],
    [navigateTo],
  );

  /** Indicadores de qué nivel del contexto académico está poblado. */
  const hasAreaContext = Boolean(selectedAreaId);
  const hasTemaContext = Boolean(selectedTemaId);
  const hasSubtemaContext = Boolean(selectedSubtemaId);

  /** Etiqueta del breadcrumb actual derivada del nivel más profundo activo. */
  const currentFlowLabel = hasSubtemaContext
    ? 'Secuencias y contenidos'
    : hasTemaContext
      ? 'Subtemas'
      : hasAreaContext
        ? 'Temas'
        : 'Áreas';

  /** Tarjetas pertenecientes a la ruta principal de gestión académica. */
  const academicActions = useMemo(() => actions.filter((a) => a.group === 'workflow'), [actions]);
  /** Tarjetas pertenecientes al grupo de soporte y administración. */
  const supportActions  = useMemo(() => actions.filter((a) => a.group === 'support'),  [actions]);

  /** Última pantalla visitada antes de la actual; usado por la lógica de scope. */
  const lastNavigationScreen = navigationHistory.length > 0 ? navigationHistory[navigationHistory.length - 1] : null;

  /**
   * `true` cuando el catálogo de contenidos se abrió DESDE el flujo de
   * gestión académica (área/tema/subtema seleccionado) en lugar del acceso
   * directo desde el dashboard. Determina si la pantalla de contenidos debe
   * filtrarse por contexto (`flow`) o mostrar el catálogo completo (`catalog`).
   */
  const isContentManagementFlowScoped =
    lastNavigationScreen === 'contents' && (hasAreaContext || hasTemaContext || hasSubtemaContext);

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
  // está poblado (p.ej. abrir 'temas' sin un área seleccionada), se
  // redirige automáticamente al paso anterior para que el usuario lo
  // complete. Esto evita estados inválidos en submódulos.
  // ─────────────────────────────────────────────────────────────────────

  if (currentScreen === 'subthemes') {
    // Subtemas requiere área Y tema. Si falta alguno, se baja al paso
    // correspondiente sin perder la pantalla destino del historial.
    if (!selectedAreaId) {
      return (
        <Suspense fallback={<ScreenLoader />}>
          <AreasManagementScreen onBack={goBack} onHome={goHome} onSelectArea={handleAreaSelect} />
        </Suspense>
      );
    }
    if (!selectedTemaId) {
      return (
        <Suspense fallback={<ScreenLoader />}>
          <TemasManagementScreen
            areaId={selectedAreaId}
            areaName={selectedAreaName}
            onBack={goBack}
            onHome={goHome}
            onSelectTema={(temaId, temaName) => handleTemaSelect(temaId, temaName, 'subthemes')}
          />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<ScreenLoader />}>
        <SubThemeManagementScreen
          onBack={goBack}
          onHome={goHome}
          initialAreaId={selectedAreaId}
          initialTemaId={selectedTemaId}
          onManageSequences={(nextAreaId, nextAreaName, nextTemaId, nextTemaName) => {
            // Salta a la gestión de secuencias dentro del mismo tema
            // refrescando el contexto recibido por el callback.
            setSelectedAreaId(nextAreaId);
            setSelectedAreaName(nextAreaName);
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

  if (currentScreen === 'areas') {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <AreasManagementScreen onBack={goBack} onHome={goHome} onSelectArea={handleAreaSelect} />
      </Suspense>
    );
  }

  if (currentScreen === 'temas') {
    if (!selectedAreaId) {
      return (
        <Suspense fallback={<ScreenLoader />}>
          <AreasManagementScreen onBack={goBack} onHome={goHome} onSelectArea={handleAreaSelect} />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<ScreenLoader />}>
        <TemasManagementScreen
          areaId={selectedAreaId}
          areaName={selectedAreaName}
          onBack={goBack}
          onHome={goHome}
          onSelectTema={(temaId, temaName) => handleTemaSelect(temaId, temaName, 'subthemes')}
        />
      </Suspense>
    );
  }

  if (currentScreen === 'subtema-sequences') {
    if (!selectedAreaId) {
      return (
        <Suspense fallback={<ScreenLoader />}>
          <AreasManagementScreen onBack={goBack} onHome={goHome} onSelectArea={handleAreaSelect} />
        </Suspense>
      );
    }
    if (!selectedTemaId) {
      return (
        <Suspense fallback={<ScreenLoader />}>
          <TemasManagementScreen
            areaId={selectedAreaId}
            areaName={selectedAreaName}
            onBack={goBack}
            onHome={goHome}
            onSelectTema={(temaId, temaName) => handleTemaSelect(temaId, temaName, 'subthemes')}
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
          areaId={selectedAreaId || undefined}
          areaName={selectedAreaName}
          temaId={selectedTemaId || undefined}
          temaName={selectedTemaName}
        />
      </Suspense>
    );
  }

  if (currentScreen === 'miniproyectos') {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <MiniproyectoManagementScreen onBack={goBack} />
      </Suspense>
    );
  }

  if (currentScreen === 'ejercicios') {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <ExerciseManagementScreen onBack={goBack} />
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
        <DocenteManagementScreen onBack={goBack} />
      </Suspense>
    );
  }

  if (currentScreen === 'administradores') {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <AdminManagementScreen onBack={goBack} />
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
            subtemaId={selectedSubtemaId}
            temaId={selectedTemaId}
            areaId={selectedAreaId || undefined}
            areaName={selectedAreaName}
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
          scopeMode={hasAreaContext || hasTemaContext || hasSubtemaContext ? 'flow' : 'catalog'}
          initialAreaId={selectedAreaId || undefined}
          initialAreaName={selectedAreaName || undefined}
          initialTemaId={selectedTemaId || undefined}
          initialTemaName={selectedTemaName || undefined}
          initialSubtemaId={selectedSubtemaId || undefined}
          initialSubtemaName={selectedSubtemaNombre || undefined}
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
          initialAreaId={isContentManagementFlowScoped ? selectedAreaId || undefined : undefined}
          initialAreaName={isContentManagementFlowScoped ? selectedAreaName || undefined : undefined}
          initialTemaId={isContentManagementFlowScoped ? selectedTemaId || undefined : undefined}
          initialTemaName={isContentManagementFlowScoped ? selectedTemaName || undefined : undefined}
          initialSubtemaId={isContentManagementFlowScoped ? selectedSubtemaId || undefined : undefined}
          initialSubtemaName={isContentManagementFlowScoped ? selectedSubtemaNombre || undefined : undefined}
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

        {/*
          Guía de flujo: muestra el orden recomendado (Áreas → Temas →
          Subtemas → Secuencias) y el progreso del usuario derivado del
          contexto académico que tenga seleccionado.
        */}
        <AdminFlowGuide
          eyebrow="Flujo de gestión"
          title="Orden de gestión académica"
          description="Referencia del orden de acceso para áreas, temas, subtemas y secuencias."
          breadcrumbs={[{ label: 'Panel admin' }, { label: currentFlowLabel, current: true }]}
          steps={[
            { label: 'Áreas',                    helper: 'Definición de la estructura base.',           status: hasAreaContext ? 'complete' : 'current' },
            { label: 'Temas',                    helper: 'Organización temática por área.',             status: hasTemaContext ? 'complete' : hasAreaContext ? 'current' : 'upcoming' },
            { label: 'Subtemas',                 helper: 'Detalle de la estructura académica.',         status: hasSubtemaContext ? 'complete' : hasTemaContext ? 'current' : 'upcoming' },
            { label: 'Secuencias y contenidos',  helper: 'Orden y gestión del contenido final.',        status: hasSubtemaContext ? 'current' : 'upcoming' },
          ]}
        />

        <div className="app-metric-grid mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="app-metric-card">
                <div className="app-metric-icon" style={{ backgroundColor: `${stat.color}16`, color: stat.color }}>
                  <Icon className="w-6 h-6" style={{ color: stat.color }} aria-hidden="true" />
                </div>
                <div>
                  <div className="app-metric-value" style={{ color: stat.color }}>
                    {isLoadingStats ? '...' : stat.value}
                  </div>
                  <p className="app-metric-label">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        <section className="mb-8">
          <div className="app-section-head">
            <div>
              <h3 className="app-section-title">Gestión académica</h3>
              <p className="app-section-description">Módulos para áreas, contenidos, ejercicios y miniproyectos.</p>
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
