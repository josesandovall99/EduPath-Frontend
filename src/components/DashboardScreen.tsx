import type { LucideIcon } from 'lucide-react';
import {
  LogOut,
  Code,
  BookOpen,
  TrendingUp,
  User,
  Cpu,
  Workflow,
  GanttChart,
  Database,
  Network,
  Calculator,
  Shield,
  Globe,
  ClipboardList,
} from 'lucide-react';
import { ChatbotButton } from './ChatbotButton';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../utils/constants';
import { cachedFetch } from '../utils/fetchCache';
const logoImage = new URL('../assets/image-removebg-preview (2).png', import.meta.url).href;

/** Alineado con --primary en globals.css; barra e iconos sin verde u otros acentos. */
const STUDENT_ACCENT = '#4A90E2';
const STUDENT_ACCENT_SOFT = 'rgba(74, 144, 226, 0.14)';
const STUDENT_PROGRESS_FILL = 'linear-gradient(90deg, #4A90E2 0%, #5B9FED 100%)';

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function resolveSubjectIcon(
  nombre: string,
  tipoPilar?: 'PROGRAMACION' | 'ANALISIS' | 'ATC' | null
): LucideIcon {
  if (tipoPilar === 'PROGRAMACION') return Code;
  if (tipoPilar === 'ANALISIS') return Workflow;
  if (tipoPilar === 'ATC') return Cpu;

  const n = stripAccents(nombre).toLowerCase();
  const has = (...fragments: string[]) => fragments.some((f) => n.includes(f));

  if (has('base de datos', 'basedatos', 'sql', 'mongodb', 'postgres')) return Database;
  if (has('redes', 'tcp/ip', 'cisco', 'routing', 'protocolos de red')) return Network;
  if (has('matematic', 'calculo', 'estadistic', 'probabilidad', 'algebra lineal')) return Calculator;
  if (has('seguridad informatic', 'criptograf', 'ethical hacking', 'ciberseguridad')) return Shield;
  if (
    has(
      'programacion',
      'algoritm',
      'codigo',
      'computacion',
      'python',
      'java ',
      'javascript',
      'desarrollo de software',
      'ingenieria de software',
      'orientado a objetos'
    )
  )
    return Code;
  if (has('desarrollo web', 'html', 'css', 'frontend', 'backend web')) return Globe;
  if (
    has(
      'analisis',
      'sistema',
      'requerimiento',
      'modelado',
      'uml',
      'arquitectura de software',
      'diseno de sistema'
    )
  )
    return Workflow;
  if (
    has(
      'gestion integral',
      'alcance',
      'tiempo y costo',
      'proyectos informatic',
      'proyecto informatic',
      'direccion de proyecto',
      'pmi'
    )
  )
    return GanttChart;
  if (has('prueba', 'evaluacion ', 'examen ')) return ClipboardList;

  return BookOpen;
}

interface Subject {
  id: string;
  name: string;
  progresion_secuencial?: boolean;
  tipoPilar?: 'PROGRAMACION' | 'ANALISIS' | 'ATC' | null;
}

interface Asignatura {
  id: number;
  nombre: string;
  descripcion?: string;
  progresion_secuencial?: boolean;
  tipo_pilar?: 'PROGRAMACION' | 'ANALISIS' | 'ATC' | null;
  estado?: boolean;
}

interface DashboardScreenProps {
  userName?: string; // Nuevo prop opcional
  onSubjectSelect: (subject: Subject) => void;
  onLogout: () => void;
  estudianteId?: number;
}

export function DashboardScreen({ userName, onSubjectSelect, onLogout, estudianteId }: DashboardScreenProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Mapa asignaturaId → datos reales del progreso del backend
  type AsignaturaProgress = {
    porcentaje: number;
    temasTotal: number;
    temasCompletados: number;
    temasPendientes: number;
    siguienteTema: string;
  };
  const [progresosPorAsignatura, setProgresosPorAsignatura] = useState<Map<number, AsignaturaProgress>>(new Map());


  useEffect(() => {
    const fetchasignaturas = async () => {
      try {
        setLoading(true);
        setError(null);


        // cachedFetch devuelve JSON directo — en revisitas es instantáneo (<1ms)
        const asignaturas = await cachedFetch(`${API_BASE_URL}/asignaturas`) as any[];

        if (!Array.isArray(asignaturas)) {
          throw new Error('Respuesta inválida del servidor');
        }


        // Solo asignaturas activas; el detalle de temas/progreso se carga después desde el backend
        const asignaturasFiltradas = asignaturas.filter((Asignatura: Asignatura) => Asignatura.estado !== false);
        const transformedSubjects: Subject[] = asignaturasFiltradas.map((Asignatura: Asignatura) => ({
          id: Asignatura.id.toString(),
          name: Asignatura.nombre,
          progresion_secuencial: Boolean(Asignatura.progresion_secuencial),
          tipoPilar: Asignatura.tipo_pilar ?? null,
        }));

        setSubjects(transformedSubjects);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        console.error('Error fetching asignaturas:', errorMessage);
        setError(`No se pudieron cargar las asignaturas: ${errorMessage}`);
        
        // No se inventan datos: lista vacía + alerta para que el estudiante sepa que algo falló
        setSubjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchasignaturas();
  }, []);

  // Carga el progreso de todas las asignaturas en una sola petición bulk
  useEffect(() => {
    if (subjects.length === 0 || !estudianteId) return;
    let cancelled = false;

    const fetchBulkProgreso = async () => {
      const asignaturaIds = subjects.map(s => s.id).join(',');
      const url = `${API_BASE_URL}/progresos/bulk-por-asignatura?asignatura_ids=${asignaturaIds}&estudiante_id=${estudianteId}`;
      try {
        // Caché de 30s — el progreso no cambia durante la navegación normal
        const data = await cachedFetch(url, {}, 30_000) as Record<string, any>;
        if (cancelled) return;
        const newMap = new Map<number, AsignaturaProgress>();
        const empty: AsignaturaProgress = { porcentaje: 0, temasTotal: 0, temasCompletados: 0, temasPendientes: 0, siguienteTema: 'Sin temas registrados' };
        for (const subject of subjects) {
          const aId = parseInt(subject.id);
          const entry = data[aId];
          if (!entry || entry.error) {
            newMap.set(aId, empty);
          } else {
            newMap.set(aId, {
              porcentaje: Math.round(entry.resumen?.porcentajeTotalAsignatura || 0),
              temasTotal: Number(entry.temas?.total ?? 0),
              temasCompletados: Number(entry.temas?.completados ?? 0),
              temasPendientes: Number(entry.temas?.pendientes ?? 0),
              siguienteTema: entry.temas?.siguiente || 'Sin temas registrados',
            });
          }
        }
        setProgresosPorAsignatura(newMap);
      } catch (err) {
        console.error('Error al obtener progreso bulk de asignaturas:', err);
      }
    };

    fetchBulkProgreso();
    return () => { cancelled = true; };
  }, [subjects, estudianteId]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="app-page-header">
            <div className="app-brand-block">
              <div className="app-brand-icon">
                <img src={logoImage} alt="Logo UDES" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1>EduPath</h1>
                <p className="text-sm">Panel del estudiante</p>
              </div>
            </div>
            <div className="app-user-chip">
              <div className="app-user-chip__meta">
                <p>{userName || 'Estudiante'}</p>
                <p>Ingeniería de Sistemas</p>
              </div>
              <div className="app-user-avatar">
                <User className="h-5 w-5" />
              </div>
              <button onClick={onLogout} className="app-btn app-btn-ghost">
                <LogOut className="w-4 h-4" />
                <span>Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="app-section-head">
          <div>
            <h3 className="app-section-title">Asignaturas académicas</h3>
            <p className="app-section-description">Consulta del progreso por asignatura académica.</p>
          </div>
        </div>

        <div className="app-card-grid">
          {loading && (
            <div className="app-empty-panel lg:col-span-3">
              <p>Cargando materias...</p>
            </div>
          )}
          
          {error && (
            <div className="app-alert app-alert--warning lg:col-span-3">
              <p className="text-yellow-700 text-sm">{error}</p>
              <p className="text-yellow-600 text-xs mt-2">Verifica que el servidor esté disponible y vuelve a intentarlo.</p>
            </div>
          )}
          
          {!loading && subjects.length === 0 ? (
            <div className="app-empty-panel lg:col-span-3">
              <p>No hay asignaturas disponibles</p>
            </div>
          ) : (
          subjects.map((subject) => {
            const Icon = resolveSubjectIcon(subject.name, subject.tipoPilar);
            const asignaturaId = parseInt(subject.id);
            const data = progresosPorAsignatura.get(asignaturaId);
            const porcentaje = data?.porcentaje ?? 0;
            const temasTotal = data?.temasTotal ?? 0;
            const temasPendientes = data?.temasPendientes ?? 0;
            const siguienteTema = data?.siguienteTema ?? 'Sin temas registrados';
            return (
              <button
                key={subject.id}
                onClick={() => onSubjectSelect({ id: subject.id, name: subject.name, progresion_secuencial: subject.progresion_secuencial, tipoPilar: subject.tipoPilar })}
                className="app-list-card group"
              >
                <div className="app-list-card__head">
                  <div
                    className="app-list-card__icon"
                    style={{ backgroundColor: STUDENT_ACCENT_SOFT }}
                  >
                    <Icon className="w-8 h-8" style={{ color: STUDENT_ACCENT }} />
                  </div>
                  <div className="text-gray-400 group-hover:text-[#4A90E2] transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                <h4 className="app-list-card__title group-hover:text-[#4A90E2] transition-colors">
                  {subject.name}
                </h4>

                <div>
                  <div className="flex items-center justify-between mb-2 app-list-card__meta">
                    <span>Progreso</span>
                    <span className="text-sm" style={{ color: STUDENT_ACCENT }}>
                      {`${porcentaje}%`}
                    </span>
                  </div>
                  <div className="app-progress-track">
                    <div
                      className="app-progress-bar"
                      style={{
                        width: `${porcentaje}%`,
                        background: STUDENT_PROGRESS_FILL,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-end text-sm text-gray-600">
                  <span className="app-badge app-badge--slate">
                    {`${temasPendientes} de ${temasTotal} pendientes`}
                  </span>
                </div>

                <div className="app-list-card__footer">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Siguiente tema</p>
                    <p className="text-sm text-[#3A4A5B]">{siguienteTema}</p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-slate-300 group-hover:text-[#4A90E2] transition-colors" />
                </div>
              </button>
            );
          })
          )}
        </div>

      </main>
      <ChatbotButton contextLabel="panel del estudiante" />
    </div>
  );
}