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
  BookOpen,
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
}: AsignaturaDashboardScreenProps) {
  const [stats, setStats] = useState<AsignaturaStats>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const headers = buildAuthHeaders({ Accept: 'application/json' });
    const opts = { headers, credentials: 'include' as const };

    // cachedFetch (60s) — datos estructurales del área, cambian poco
    const get = (url: string) =>
      (cachedFetch(url, opts) as Promise<any[]>).catch(() => []);

    (async () => {
      // Ronda 1: temas (endpoint correcto) + contenidos + miniproyectos en paralelo
      const [temas, contenidos, miniproyectos] = await Promise.all([
        get(`${API_BASE_URL}/temas/por-asignatura/${asignaturaId}`),
        get(`${API_BASE_URL}/contenidos?asignatura_id=${asignaturaId}`),
        get(`${API_BASE_URL}/miniproyectos?asignatura_id=${asignaturaId}`),
      ]);

      if (cancelled) return;

      const temasArr      = Array.isArray(temas)        ? temas        : [];
      const contenidosArr = Array.isArray(contenidos)   ? contenidos   : [];
      const minisArr      = Array.isArray(miniproyectos)? miniproyectos: [];
      const temaIds       = temasArr.map((t: any) => t.id);

      // Render inmediato con los datos ya disponibles
      setStats(prev => ({
        ...prev,
        totalTemas:        temasArr.length,
        temasActivos:      temasArr.filter((t: any) => t.estado !== false).length,
        totalContenidos:   contenidosArr.length,
        contenidosActivos: contenidosArr.filter((c: any) => c.estado !== false).length,
        totalMiniproyectos: minisArr.length,
      }));
      setLoading(false); // muestra métricas disponibles ya

      // Ronda 2: subtemas (necesita temaIds) — actualiza sin bloquear el render
      if (temaIds.length > 0) {
        const subtemasFetches = await Promise.all(
          temaIds.map((id: number) =>
            get(`${API_BASE_URL}/subtemas/por-tema/${id}`)
          )
        );
        if (cancelled) return;
        const totalSub = subtemasFetches.flat().length;
        setStats(prev => ({ ...prev, totalSubtemas: totalSub }));
      }
    })();

    return () => { cancelled = true; };
  }, [asignaturaId]);

  const metrics = [
    { label: 'Temas activos',      value: loading ? '…' : `${stats.temasActivos} / ${stats.totalTemas}`,           icon: Layers,       color: '#2563EB' },
    { label: 'Subtemas',           value: stats.totalSubtemas === 0 && loading ? '…' : stats.totalSubtemas,         icon: List,         color: '#0891B2' },
    { label: 'Contenidos activos', value: loading ? '…' : `${stats.contenidosActivos} / ${stats.totalContenidos}`,  icon: FileText,     color: '#059669' },
    { label: 'Miniproyectos',      value: loading ? '…' : stats.totalMiniproyectos,                                 icon: ClipboardList, color: '#6D28D9' },
  ];

  const accesos = [
    { label: 'Temas y subtemas',    desc: 'Estructura temática de la asignatura.',          icon: Layers,       action: onGoToTemas,          color: '#2563EB' },
    { label: 'Contenidos',          desc: 'Videos, documentos y recursos de esta asignatura.', icon: FileText,  action: onGoToContenidos,     color: '#059669' },
    { label: 'Ejercicios',          desc: 'Actividades evaluativas asociadas.',               icon: BookOpen,   action: onGoToEjercicios,     color: '#0F766E' },
    { label: 'Miniproyectos',       desc: 'Proyectos prácticos de la asignatura.',            icon: ClipboardList, action: onGoToMiniproyectos, color: '#6D28D9' },
  ];

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-main py-4">
          <div className="app-page-header">
            <div className="app-brand-block">
              <button
                type="button"
                onClick={onHome}
                className="app-brand-icon"
                title="Ir al panel principal"
              >
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.65)', letterSpacing: '0.15em' }}>Asignatura</p>
                <h1>{asignaturaName}</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <button
          type="button"
          onClick={onBack}
          className="app-back-button mb-6"
          aria-label="Volver al listado de asignaturas"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Volver</span>
        </button>
        {/* ── Métricas específicas de la asignatura ───────────────────────── */}
        <section aria-label={`Indicadores de ${asignaturaName}`} className="app-metric-grid mb-8">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <article key={m.label} className="app-metric-card" aria-label={`${m.label}: ${m.value}`}>
                <div className="app-metric-icon" style={{ backgroundColor: `${m.color}18`, color: m.color }}>
                  <Icon className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <strong className="app-metric-value" style={{ color: m.color }}>{m.value}</strong>
                  <p className="app-metric-label">{m.label}</p>
                </div>
              </article>
            );
          })}
        </section>

        {/* ── Acceso rápido a los módulos de la asignatura ────────────────── */}
        <section aria-label="Módulos de la asignatura" className="mb-8">
          <div className="app-section-head">
            <div>
              <h2 className="app-section-title">Gestiona esta asignatura</h2>
              <p className="app-section-description">
                Toda la información y herramientas corresponden exclusivamente a <strong>{asignaturaName}</strong>.
              </p>
            </div>
          </div>
          <div className="app-card-grid">
            {accesos.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  type="button"
                  onClick={a.action}
                  aria-label={`Ir a ${a.label}`}
                  className="app-list-card group border-transparent text-left"
                >
                  <div className="app-list-card__head">
                    <div
                      className="app-list-card__icon shadow-sm"
                      style={{ backgroundColor: `${a.color}18`, color: a.color }}
                    >
                      <Icon className="w-6 h-6" aria-hidden="true" />
                    </div>
                  </div>
                  <div>
                    <div className="app-list-card__title group-hover:text-[#2563EB] transition-colors">
                      {a.label}
                    </div>
                    <p className="app-list-card__description mt-2">{a.desc}</p>
                  </div>
                  <div className="app-list-card__footer">
                    <span className="app-list-card__meta">Módulo de {asignaturaName}</span>
                    <span className="text-sm font-semibold text-[#2563EB]">Abrir →</span>
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
