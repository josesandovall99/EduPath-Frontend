/**
 * AsignaturaDashboardScreen
 *
 * Panel específico de una asignatura. Se muestra al seleccionar
 * una asignatura desde la pantalla de gestión, antes de entrar
 * al detalle de temas, contenidos o estudiantes.
 *
 * Principio de diseño: una sola asignatura, toda su información
 * relevante en una vista limpia y sin sobrecarga.
 */
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  ClipboardList,
  FileText,
  Layers,
  List,
} from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';
const logoImage = new URL('../assets/image-removebg-preview (2).png', import.meta.url).href;
import { buildAuthHeaders } from '../utils/authHeaders';
import { cachedFetch } from '../utils/fetchCache';

interface AsignaturaDashboardScreenProps {
  asignaturaId: number;
  asignaturaName: string;
  onBack: () => void;
  onHome?: () => void;
  /** Lleva al listado de temas de esta asignatura. */
  onGoToTemas: () => void;
  /** Lleva al catálogo de contenidos filtrado por esta asignatura. */
  onGoToContenidos: () => void;
  /** Lleva a gestión de miniproyectos filtrado por asignatura. */
  onGoToMiniproyectos: () => void;
  /** Lleva a gestión de ejercicios filtrado por asignatura. */
  onGoToEjercicios: () => void;
  /** Docente: gestión del chatbot acotada a esta asignatura. Si no se pasa, no se muestra el acceso. */
  onGoToChatbot?: () => void;
}

interface AsignaturaStats {
  totalTemas: number;
  temasActivos: number;
  totalContenidos: number;
  contenidosActivos: number;
  totalSubtemas: number;
  totalMiniproyectos: number;
}

const EMPTY: AsignaturaStats = {
  totalTemas: 0,
  temasActivos: 0,
  totalContenidos: 0,
  contenidosActivos: 0,
  totalSubtemas: 0,
  totalMiniproyectos: 0,
};

export function AsignaturaDashboardScreen({
  asignaturaId,
  asignaturaName,
  onBack,
  onHome,
  onGoToTemas,
  onGoToContenidos,
  onGoToMiniproyectos,
  onGoToEjercicios,
  onGoToChatbot,
}: AsignaturaDashboardScreenProps) {
  const [stats, setStats] = useState<AsignaturaStats>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const headers = buildAuthHeaders({ Accept: 'application/json' });
    const opts = { headers, credentials: 'include' as const };
    const get = (url: string) =>
      (cachedFetch(url, opts) as Promise<any[]>).catch(() => []);

    (async () => {
      // ── Ronda 1: todo en paralelo (3 llamadas únicas) ───────────────────
      // /contenidos?asignaturaId=X filtra por temas de la asignatura (backend lo resuelve)
      const [temasRaw, contenidosRaw, minisRaw] = await Promise.all([
        get(`${API_BASE_URL}/temas/por-asignatura/${asignaturaId}`),
        get(`${API_BASE_URL}/contenidos?asignaturaId=${asignaturaId}`),
        get(`${API_BASE_URL}/miniproyectos?asignatura_id=${asignaturaId}`),
      ]);
      if (cancelled) return;

      const temasArr     = Array.isArray(temasRaw)     ? temasRaw     : [];
      const contenidosArr= Array.isArray(contenidosRaw)? contenidosRaw: [];
      const minisArr     = Array.isArray(minisRaw)     ? minisRaw     : [];
      const temaIds      = temasArr.map((t: any) => Number(t.id));

      setStats(prev => ({
        ...prev,
        totalTemas:         temasArr.length,
        temasActivos:       temasArr.filter((t: any) => t.estado !== false).length,
        totalContenidos:    contenidosArr.length,
        contenidosActivos:  contenidosArr.filter((c: any) => c.estado !== false).length,
        totalMiniproyectos: minisArr.length,
      }));

      if (temaIds.length === 0) { setLoading(false); return; }

      // ── Ronda 2: subtemas (necesita temaIds) ────────────────────────────
      const subtemasLists = await Promise.all(
        temaIds.map(id => get(`${API_BASE_URL}/subtemas/por-tema/${id}`))
      );
      if (cancelled) return;

      const todasSubtemas = subtemasLists.flat();
      setStats(prev => ({ ...prev, totalSubtemas: todasSubtemas.length }));
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [asignaturaId]);

  const metrics = [
    { label: 'Temas activos',      value: loading ? '…' : `${stats.temasActivos} / ${stats.totalTemas}`,          icon: Layers },
    { label: 'Subtemas',           value: stats.totalSubtemas === 0 && loading ? '…' : stats.totalSubtemas,        icon: List },
    { label: 'Contenidos activos', value: loading ? '…' : `${stats.contenidosActivos} / ${stats.totalContenidos}`, icon: FileText },
    { label: 'Miniproyectos',      value: loading ? '…' : stats.totalMiniproyectos,                                icon: ClipboardList },
  ];

  const accesos = [
    { label: 'Temas y subtemas', desc: 'Estructura temática de la asignatura.',              icon: Layers,        action: onGoToTemas },
    { label: 'Contenidos',       desc: 'Videos, documentos y recursos de la asignatura.',    icon: FileText,      action: onGoToContenidos },
    { label: 'Ejercicios',       desc: 'Actividades evaluativas asociadas.',                 icon: BookOpen,      action: onGoToEjercicios },
    { label: 'Miniproyectos',    desc: 'Proyectos prácticos de la asignatura.',              icon: ClipboardList, action: onGoToMiniproyectos },
    ...(onGoToChatbot
      ? [{ label: 'Chatbot', desc: 'Documentos y base de conocimiento de esta asignatura.', icon: Bot, action: onGoToChatbot } as const]
      : []),
  ];

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-main py-4">
          <div className="app-page-header">
            <div className="app-brand-block">
              <button type="button" onClick={onHome} className="app-brand-icon" title="Panel principal">
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.15em' }}>Asignatura</p>
                <h1 className="leading-tight">{asignaturaName}</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <button type="button" onClick={onBack} className="app-back-button mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>

        {/* Métricas */}
        <section className="app-metric-grid mb-8">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <article key={m.label} className="app-metric-card">
                <div className="app-metric-icon" style={{ background: '#1a56db', color: '#ffffff' }}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <strong className="app-metric-value" style={{ color: '#1a56db' }}>{m.value}</strong>
                  <p className="app-metric-label">{m.label}</p>
                </div>
              </article>
            );
          })}
        </section>

        {/* Accesos directos */}
        <section className="mb-8">
          <div className="app-section-head mb-4">
            <div>
              <h2 className="app-section-title">Módulos</h2>
              <p className="app-section-description">Selecciona un módulo para gestionarlo.</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', gridAutoRows: '1fr' }}>
            {accesos.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  type="button"
                  onClick={a.action}
                  className="app-list-card text-left"
                  style={{ display: 'flex', flexDirection: 'column' }}
                >
                  {/* Ícono + título */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center justify-center rounded-xl shrink-0" style={{ width: '2.4rem', height: '2.4rem', background: '#dbeafe' }}>
                      <Icon className="w-4 h-4" style={{ color: '#1a56db' }} />
                    </div>
                    <span className="app-list-card__title">{a.label}</span>
                  </div>

                  {/* Descripción que empuja el footer hacia abajo */}
                  <p className="app-list-card__description" style={{ flex: 1 }}>{a.desc}</p>

                  {/* Footer pegado al fondo */}
                  <div className="flex items-center justify-between pt-3 mt-3" style={{ borderTop: '1px solid #e2e8f0' }}>
                    <span className="text-sm font-semibold" style={{ color: '#1a56db' }}>Abrir</span>
                    <div className="flex items-center justify-center rounded-full" style={{ width: '30px', height: '30px', background: '#dbeafe' }}>
                      <ArrowRight className="w-3.5 h-3.5" style={{ color: '#1a56db' }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
