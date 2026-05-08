import { LogOut, Code, BookOpen, TrendingUp, User } from 'lucide-react';
import { ChatbotButton } from './ChatbotButton';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../utils/constants';

interface Subject {
  id: string;
  name: string;
  icon: typeof Code;
  color: string;
  progresion_secuencial?: boolean;
}

interface Asignatura {
  id: number;
  nombre: string;
  descripcion?: string;
  progresion_secuencial?: boolean;
}

interface DashboardScreenProps {
  userName?: string; // Nuevo prop opcional
  onSubjectSelect: (subject: Subject) => void;
  onLogout: () => void;
  estudianteId?: number;
}

type RestrictedAsignaturaCategory = 'fundamentos' | 'analisis' | 'atc';

const colorPalette = ['#4A90E2', '#7ED6A7', '#F5A97F', '#FFB84D', '#A78BFA', '#EC4899'];

const normalizeasignaturaName = (value?: string | null) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

const getRestrictedAsignaturaCategory = (asignaturaName?: string | null): RestrictedAsignaturaCategory | null => {
  const normalizedName = normalizeasignaturaName(asignaturaName);

  if (normalizedName.includes('fundamentos') && normalizedName.includes('program')) {
    return 'fundamentos';
  }

  if (normalizedName.includes('analisis')) {
    return 'analisis';
  }

  if (
    normalizedName === 'atc' ||
    normalizedName.includes('alcance') ||
    normalizedName.includes('tiempo') ||
    normalizedName.includes('costo') ||
    normalizedName.includes('gestion de proyectos') ||
    normalizedName.includes('gestion proyectos')
  ) {
    return 'atc';
  }

  return null;
};

// Si el fetch de asignaturas falla, mostramos lista vacía + alerta — no se inventan datos.

export function DashboardScreen({ userName, onSubjectSelect, onLogout, estudianteId }: DashboardScreenProps) {
  const [subjects, setSubjects] = useState<any[]>([]);
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

  // Función para obtener asignaturas permitidas según el semestre
  const obtenerasignaturasPermitidas = (semestre: number): RestrictedAsignaturaCategory[] => {
    if (semestre >= 1 && semestre <= 4) {
      return ['fundamentos'];
    } else if (semestre >= 5 && semestre <= 6) {
      return ['fundamentos', 'analisis'];
    } else if (semestre >= 7 && semestre <= 10) {
      return ['fundamentos', 'analisis', 'atc'];
    }
    return []; // Si el semestre está fuera de rango
  };

  // Obtener progreso real de un asignatura (porcentaje + info de temas)
  const obtenerProgresoAsignatura = async (asignaturaId: number): Promise<AsignaturaProgress> => {
    const empty: AsignaturaProgress = {
      porcentaje: 0, temasTotal: 0, temasCompletados: 0, temasPendientes: 0,
      siguienteTema: 'Sin temas registrados'
    };
    if (!estudianteId) return empty;
    try {
      const url = `${API_BASE_URL}/progresos/por-asignatura?asignatura_id=${asignaturaId}&estudiante_id=${estudianteId}`;
      const response = await fetch(url);
      if (!response.ok) return empty;
      const data = await response.json();
      return {
        porcentaje: Math.round(data.resumen?.porcentajeTotalAsignatura || 0),
        temasTotal: Number(data.temas?.total ?? 0),
        temasCompletados: Number(data.temas?.completados ?? 0),
        temasPendientes: Number(data.temas?.pendientes ?? 0),
        siguienteTema: data.temas?.siguiente || 'Sin temas registrados',
      };
    } catch (err) {
      console.error(`Error al obtener progreso del asignatura ${asignaturaId}:`, err);
      return empty;
    }
  };

  useEffect(() => {
    const fetchasignaturas = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Fetching asignaturas from:', `${API_BASE_URL}/asignaturas`);

        const response = await fetch(`${API_BASE_URL}/asignaturas`);

        // Validación crítica: verificar si la respuesta es exitosa
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          throw new Error(`Invalid content type. Expected JSON, got: ${contentType}`);
        }

        const asignaturas = await response.json();
        console.log('asignaturas loaded successfully:', asignaturas);

        // Filtro de seguridad: obtener semestre del estudiante
        // NOTA: Esto debería venir del backend en producción
        const semestre = parseInt(localStorage.getItem('semestreEstudiante') || '1');
        const asignaturasPermitidas = obtenerasignaturasPermitidas(semestre);
        
        // Filtrar asignaturas según el semestre
        const asignaturasFiltradas = asignaturas.filter((Asignatura: Asignatura) => {
          const restrictedCategory = getRestrictedAsignaturaCategory(Asignatura.nombre);

          // Las asignaturas históricas siguen limitadas por semestre.
          // Cualquier asignatura nueva queda visible para todos los estudiantes.
          if (!restrictedCategory) {
            return true;
          }

          return asignaturasPermitidas.includes(restrictedCategory);
        });

        console.log(`Semestre ${semestre} - Asignaturas permitidas:`, asignaturasPermitidas);
        console.log('Asignaturas filtradas:', asignaturasFiltradas);

        // Transformar asignaturas a formato de subjects (los temas/progreso se cargan después desde el backend)
        const transformedSubjects = asignaturasFiltradas.map((Asignatura: Asignatura, index: number) => ({
          id: Asignatura.id.toString(),
          name: Asignatura.nombre,
          progresion_secuencial: Boolean(Asignatura.progresion_secuencial),
          icon: Code,
          color: colorPalette[index % colorPalette.length],
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

  // Cargar progreso real (en paralelo) cuando las asignaturas se carguen
  useEffect(() => {
    if (subjects.length > 0 && estudianteId) {
      const cargarProgresos = async () => {
        const entries = await Promise.all(
          subjects.map(async (s) => {
            const asignaturaId = parseInt(s.id);
            const progreso = await obtenerProgresoAsignatura(asignaturaId);
            return [asignaturaId, progreso] as const;
          })
        );
        setProgresosPorAsignatura(new Map(entries));
      };
      cargarProgresos();
    }
  }, [subjects, estudianteId]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="app-page-header">
            <div className="app-brand-block">
              <div className="app-brand-icon">
                <BookOpen className="w-6 h-6 text-[#4A90E2]" />
              </div>
              <div>
                <h1 className="text-[#3A4A5B]">EduPath</h1>
                <p className="text-gray-500 text-sm">Panel del estudiante</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="app-user-chip">
                <div className="app-user-chip__meta">
                  <p>{userName || 'Estudiante'}</p>
                  <p>Ingeniería de Sistemas</p>
                </div>
                <div className="app-user-avatar">
                  <User className="h-5 w-5" />
                </div>
              </div>
              <button onClick={onLogout} className="app-btn app-btn-secondary px-4 py-2.5 text-slate-700">
                <LogOut className="w-4 h-4" />
                <span>Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <section className="app-page-hero mb-8">
          <div className="app-page-hero__content">
            <div className="app-page-hero__copy">
              <div className="app-page-hero__eyebrow">Panel académico</div>
              <h2 className="app-page-hero__title">{userName || 'Estudiante'}</h2>
              <p className="app-page-hero__description">Resumen de asignaturas académicas y avance registrado.</p>
            </div>
            <BookOpen className="app-page-hero__icon w-20 h-20" />
          </div>
        </section>

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
            const Icon = subject.icon;
            const asignaturaId = parseInt(subject.id);
            const data = progresosPorAsignatura.get(asignaturaId);
            const porcentaje = data?.porcentaje ?? 0;
            const temasTotal = data?.temasTotal ?? 0;
            const temasPendientes = data?.temasPendientes ?? 0;
            const siguienteTema = data?.siguienteTema ?? 'Sin temas registrados';
            return (
              <button
                key={subject.id}
                onClick={() => onSubjectSelect({ id: subject.id, name: subject.name, progresion_secuencial: subject.progresion_secuencial })}
                className="app-list-card group"
              >
                <div className="app-list-card__head">
                  <div
                    className="app-list-card__icon"
                    style={{ backgroundColor: `${subject.color}15` }}
                  >
                    <Icon className="w-8 h-8" style={{ color: subject.color }} />
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
                    <span className="text-sm" style={{ color: subject.color }}>
                      {`${porcentaje}%`}
                    </span>
                  </div>
                  <div className="app-progress-track">
                    <div
                      className="app-progress-bar"
                      style={{
                        width: `${porcentaje}%`,
                        backgroundColor: subject.color
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