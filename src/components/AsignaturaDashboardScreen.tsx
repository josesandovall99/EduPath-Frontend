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
  Users,
} from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';
import { buildAuthHeaders } from '../utils/authHeaders';

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
  totalEstudiantes: number;
  totalMiniproyectos: number;
}

const EMPTY: AsignaturaStats = {
  totalTemas: 0,
  temasActivos: 0,
  totalContenidos: 0,
  contenidosActivos: 0,
  totalEstudiantes: 0,
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

    const fetchJson = async (url: string) => {
      try {
        const r = await fetch(url, { headers, credentials: 'include' });
        if (!r.ok) return [];
        return r.json();
      } catch {
        return [];
      }
    };

    (async () => {
      const [temas, contenidos, estudiantes, miniproyectos] = await Promise.all([
        fetchJson(`${API_BASE_URL}/temas?asignatura_id=${asignaturaId}`),
        fetchJson(`${API_BASE_URL}/contenidos?asignatura_id=${asignaturaId}`),
        fetchJson(`${API_BASE_URL}/estudiante`),
        fetchJson(`${API_BASE_URL}/miniproyectos?asignatura_id=${asignaturaId}`),
      ]);

      if (cancelled) return;

      const temasArr      = Array.isArray(temas)        ? temas        : [];
      const contenidosArr = Array.isArray(contenidos)   ? contenidos   : [];
      const estudArr      = Array.isArray(estudiantes)  ? estudiantes  : [];
      const minisArr      = Array.isArray(miniproyectos)? miniproyectos: [];

      setStats({
        totalTemas:          temasArr.length,
        temasActivos:        temasArr.filter((t: any) => t.estado !== false).length,
        totalContenidos:     contenidosArr.length,
        contenidosActivos:   contenidosArr.filter((c: any) => c.estado !== false).length,
        totalEstudiantes:    estudArr.filter((e: any) => e.persona?.estado !== false).length,
        totalMiniproyectos:  minisArr.length,
      });
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [asignaturaId]);

  const metrics = [
    { label: 'Temas activos',      value: loading ? '…' : `${stats.temasActivos} / ${stats.totalTemas}`,         icon: Layers,      color: '#2563EB' },
    { label: 'Contenidos activos', value: loading ? '…' : `${stats.contenidosActivos} / ${stats.totalContenidos}`, icon: FileText,    color: '#059669' },
    { label: 'Estudiantes',        value: loading ? '…' : stats.totalEstudiantes,                                  icon: Users,       color: '#D97706' },
    { label: 'Miniproyectos',      value: loading ? '…' : stats.totalMiniproyectos,                                icon: ClipboardList, color: '#6D28D9' },
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
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={onBack}
                aria-label="Volver al listado de asignaturas"
                className="app-btn app-btn-ghost"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Asignatura</p>
                <h1 className="text-[#1E293B] font-bold text-lg leading-tight truncate">{asignaturaName}</h1>
              </div>
            </div>
            {onHome && (
              <button type="button" onClick={onHome} className="app-btn app-btn-secondary px-4 py-2">
                Panel admin
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
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
