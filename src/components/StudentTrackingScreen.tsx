import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Loader2, Search, Users } from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';
import { useArea } from '../context/AreaContext';

interface StudentTrackingScreenProps {
  onBack: () => void;
}

interface SubjectProgress {
  asignaturaId: number;
  name: string;
  progress: number;
  contentViewed: number;
  exercisesCompleted: number;
  miniprojectsSubmitted: number;
  topics: { name: string; progress: number }[];
}

interface StudentSummary {
  id: number;
  name: string;
  email: string;
  semester: string | number;
  codigo: string;
  subjects: SubjectProgress[];
}

function ProgressBar({ value }: { value: number }) {
  const color = value >= 70 ? '#7ED6A7' : value >= 40 ? '#FFB84D' : '#F5A97F';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-600 w-8 text-right">{value}%</span>
    </div>
  );
}

export function StudentTrackingScreen({ onBack }: StudentTrackingScreenProps) {
  const { asignaturaId: areaId, asignaturaName: areaName } = useArea();

  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE_URL}/progresos/resumen-general`, { headers });
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = await res.json();
        if (!cancelled) setStudents(Array.isArray(data.students) ? data.students : []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error al cargar estudiantes');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Filtra por área activa y por búsqueda de texto
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return students
      .filter((s) => {
        // Si hay área activa, solo mostrar estudiantes que tengan progreso en esa área
        if (areaId) {
          const hasSubject = s.subjects.some((sub) => sub.asignaturaId === areaId);
          if (!hasSubject) return false;
        }
        if (!term) return true;
        return (
          s.name.toLowerCase().includes(term) ||
          s.email.toLowerCase().includes(term) ||
          String(s.codigo).toLowerCase().includes(term)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [students, areaId, query]);

  // Progreso del estudiante: del área activa si hay una, si no el promedio global
  const getProgressForStudent = (student: StudentSummary): number => {
    if (areaId) {
      const sub = student.subjects.find((s) => s.asignaturaId === areaId);
      return sub?.progress ?? 0;
    }
    if (student.subjects.length === 0) return 0;
    const total = student.subjects.reduce((acc, s) => acc + s.progress, 0);
    return Math.round(total / student.subjects.length);
  };

  const avgProgress = filtered.length
    ? Math.round(filtered.reduce((acc, s) => acc + getProgressForStudent(s), 0) / filtered.length)
    : 0;

  const title = areaName ? `Estudiantes — ${areaName}` : 'Seguimiento de Estudiantes';
  const subtitle = areaName
    ? `Progreso de los estudiantes en el área "${areaName}".`
    : 'Vista general de todos los estudiantes.';

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-main py-4">
          <div className="app-page-header">
            <div className="app-brand-block">
              <div className="app-brand-icon">
                <Users className="w-6 h-6 text-[#4A90E2]" />
              </div>
              <div>
                <h1 className="text-[#3A4A5B]">{title}</h1>
                <p className="text-slate-500 text-sm">{subtitle}</p>
              </div>
            </div>
            <button type="button" onClick={onBack} className="app-btn app-btn-ghost">
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>
          </div>
        </div>
      </header>

      <main className="app-main py-6">
        {/* Barra de búsqueda + resumen */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, código o correo…"
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]"
            />
          </div>
          {!loading && !error && (
            <div className="flex gap-4 shrink-0">
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-center">
                <p className="text-xs text-gray-500">Estudiantes</p>
                <p className="text-lg font-bold text-[#3A4A5B]">{filtered.length}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-center">
                <p className="text-xs text-gray-500">Progreso promedio</p>
                <p className="text-lg font-bold text-[#4A90E2]">{avgProgress}%</p>
              </div>
            </div>
          )}
        </div>

        {/* Estados */}
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#4A90E2]" />
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500 text-sm">
            No se encontraron estudiantes{areaId ? ` en "${areaName}"` : ''}.
          </div>
        )}

        {/* Lista de estudiantes */}
        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((student) => {
              const progress = getProgressForStudent(student);
              const isExpanded = expandedId === student.id;
              const areaSubject = areaId
                ? student.subjects.find((s) => s.asignaturaId === areaId)
                : null;

              return (
                <div key={student.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : student.id)}
                    className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    {/* Avatar inicial */}
                    <div className="w-9 h-9 rounded-full bg-[#4A90E2] flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {student.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#3A4A5B] truncate">{student.name}</p>
                      <p className="text-xs text-gray-400 truncate">{student.email}</p>
                    </div>

                    {/* Semestre y código */}
                    <div className="hidden sm:flex gap-3 text-xs text-gray-500 shrink-0">
                      {student.semester ? <span>Sem. {student.semester}</span> : null}
                      {student.codigo ? <span className="font-mono">{student.codigo}</span> : null}
                    </div>

                    {/* Barra de progreso */}
                    <div className="w-32 shrink-0">
                      <ProgressBar value={progress} />
                    </div>

                    {isExpanded
                      ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                  </button>

                  {/* Detalle expandido */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-4">
                      {(areaSubject ? [areaSubject] : student.subjects).map((sub) => (
                        <div key={sub.asignaturaId}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium text-[#3A4A5B]">{sub.name}</p>
                            <div className="flex gap-3 text-xs text-gray-400">
                              <span>{sub.contentViewed} contenidos</span>
                              <span>{sub.exercisesCompleted} ejercicios</span>
                              <span>{sub.miniprojectsSubmitted} miniproyectos</span>
                            </div>
                          </div>
                          <ProgressBar value={sub.progress} />

                          {/* Temas */}
                          {sub.topics.length > 0 && (
                            <div className="mt-2 space-y-1 pl-3 border-l-2 border-gray-200">
                              {sub.topics.map((topic) => (
                                <div key={topic.name} className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500 w-32 truncate">{topic.name}</span>
                                  <div className="flex-1">
                                    <ProgressBar value={topic.progress} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
