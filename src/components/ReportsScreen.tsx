import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Filter, X, User, Calendar, Activity, TrendingUp, Clock, CheckCircle2, XCircle, AlertCircle, BarChart3, Award, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const logoImage = new URL('../assets/898bd8e2c46596e40b55d8328f5f754f003aa92a.png', import.meta.url).href;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface ReportsScreenProps {
  onBack: () => void;
  mode?: 'admin' | 'docente';
  docenteId?: number;
  docentePersonaId?: number;
  docenteAreaId?: number;
}

// Tipos de datos
interface StudentProgress {
  id: string;
  name: string;
  email: string;
  createdDate: string;
  semester?: string | number;
  subjects: {
    areaId?: string;
    name: string;
    color: string;
    progress: number;
    contentViewed: number;
    exercisesCompleted: number;
    miniprojectsSubmitted: number;
    topics: {
      name: string;
      progress: number;
      subtopics: { name: string; progress: number; hasContent?: boolean; }[];
    }[];
  }[];
}

interface Filters {
  contentType: string;
  area: string;
  status: string;
  topic: string;
  student: string;
  semester: string;
  dateFrom: string;
  dateTo: string;
  activityType: string;
}

interface FailuresTotals {
  intentos: number;
  fallos: number;
  aciertos: number;
}

interface FailuresByType {
  ejercicios: FailuresTotals;
  miniproyectos: FailuresTotals;
}

interface FailuresByArea {
  area_id: number | null;
  area_name: string;
  intentos: number;
  fallos: number;
  aciertos: number;
  ejercicios: number;
  miniproyectos: number;
}

interface FailuresByStudent {
  estudiante_id: number;
  nombre: string;
  email: string;
  intentos: number;
  fallos: number;
  aciertos: number;
  ejercicios: number;
  miniproyectos: number;
}

interface FailuresItem {
  tipo: 'ejercicio' | 'miniproyecto';
  actividad_id: number;
  estudiante_id: number;
  titulo: string;
  area_id: number | null;
  area_name: string;
  intentos: number;
  fallos: number;
  aciertos: number;
  aprobado: boolean;
  estudiantesAfectados?: number;
}

interface FailuresReportData {
  totals: FailuresTotals;
  byType: FailuresByType;
  byArea: FailuresByArea[];
  byStudent: FailuresByStudent[];
  items: FailuresItem[];
}

interface BasicArea {
  id: number;
  nombre: string;
}

const buildFailuresFromItems = (
  items: FailuresItem[],
  studentMetadata: Map<string, Pick<FailuresByStudent, 'nombre' | 'email'>> = new Map()
): FailuresReportData => {
  const totals = items.reduce(
    (acc, item) => {
      acc.intentos += item.intentos || 0;
      acc.fallos += item.fallos || 0;
      acc.aciertos += item.aciertos || 0;
      return acc;
    },
    { intentos: 0, fallos: 0, aciertos: 0 }
  );

  const byType: FailuresByType = {
    ejercicios: { intentos: 0, fallos: 0, aciertos: 0 },
    miniproyectos: { intentos: 0, fallos: 0, aciertos: 0 }
  };

  const byAreaMap = new Map<string, FailuresByArea>();
  const byStudentMap = new Map<string, FailuresByStudent>();

  items.forEach((item) => {
    const isEjercicio = item.tipo === 'ejercicio';
    const typeTarget = isEjercicio ? byType.ejercicios : byType.miniproyectos;
    typeTarget.intentos += item.intentos || 0;
    typeTarget.fallos += item.fallos || 0;
    typeTarget.aciertos += item.aciertos || 0;

    const areaKey = item.area_id === null ? 'sin-area' : String(item.area_id);
    const currentArea = byAreaMap.get(areaKey) || {
      area_id: item.area_id ?? null,
      area_name: item.area_name || 'Sin area',
      intentos: 0,
      fallos: 0,
      aciertos: 0,
      ejercicios: 0,
      miniproyectos: 0
    };
    currentArea.intentos += item.intentos || 0;
    currentArea.fallos += item.fallos || 0;
    currentArea.aciertos += item.aciertos || 0;
    if (isEjercicio) currentArea.ejercicios += 1;
    else currentArea.miniproyectos += 1;
    byAreaMap.set(areaKey, currentArea);

    const studentKey = String(item.estudiante_id);
    const studentInfo = studentMetadata.get(studentKey);
    const currentStudent = byStudentMap.get(studentKey) || {
      estudiante_id: item.estudiante_id,
      nombre: studentInfo?.nombre || `Estudiante ${item.estudiante_id}`,
      email: studentInfo?.email || '',
      intentos: 0,
      fallos: 0,
      aciertos: 0,
      ejercicios: 0,
      miniproyectos: 0
    };
    currentStudent.intentos += item.intentos || 0;
    currentStudent.fallos += item.fallos || 0;
    currentStudent.aciertos += item.aciertos || 0;
    if (isEjercicio) currentStudent.ejercicios += 1;
    else currentStudent.miniproyectos += 1;
    byStudentMap.set(studentKey, currentStudent);
  });

  return {
    totals,
    byType,
    byArea: Array.from(byAreaMap.values()).sort((a, b) => b.fallos - a.fallos),
    byStudent: Array.from(byStudentMap.values()).sort((a, b) => b.fallos - a.fallos),
    items
  };
};

const scopeFailuresDataByArea = (data: any, areaId?: number): FailuresReportData => {
  const sourceItems = Array.isArray(data?.items) ? data.items : [];
  const studentMetadata = new Map<string, Pick<FailuresByStudent, 'nombre' | 'email'>>(
    (Array.isArray(data?.byStudent) ? data.byStudent : []).map((student: FailuresByStudent) => [
      String(student.estudiante_id),
      {
        nombre: student.nombre,
        email: student.email,
      }
    ])
  );

  if (!areaId) {
    return buildFailuresFromItems(sourceItems, studentMetadata);
  }

  const scopedItems = sourceItems.filter((item: FailuresItem) => Number(item.area_id) === Number(areaId));
  return buildFailuresFromItems(scopedItems, studentMetadata);
};

const mergeFailuresWithAreas = (data: FailuresReportData, areas: BasicArea[], scopeAreaId?: number): FailuresReportData => {
  const byAreaMap = new Map<string, FailuresByArea>();

  (Array.isArray(data.byArea) ? data.byArea : []).forEach((entry) => {
    if (entry?.area_id === null || entry?.area_id === undefined) return;
    byAreaMap.set(String(entry.area_id), {
      area_id: entry.area_id,
      area_name: entry.area_name,
      intentos: entry.intentos || 0,
      fallos: entry.fallos || 0,
      aciertos: entry.aciertos || 0,
      ejercicios: entry.ejercicios || 0,
      miniproyectos: entry.miniproyectos || 0
    });
  });

  const scopedAreas = scopeAreaId
    ? areas.filter((area) => Number(area.id) === Number(scopeAreaId))
    : areas;

  const completedByArea = scopedAreas.map((area) => {
    const existing = byAreaMap.get(String(area.id));
    if (existing) {
      return {
        ...existing,
        area_name: existing.area_name || area.nombre
      };
    }

    return {
      area_id: area.id,
      area_name: area.nombre,
      intentos: 0,
      fallos: 0,
      aciertos: 0,
      ejercicios: 0,
      miniproyectos: 0
    };
  });

  const sortedByArea = completedByArea.sort((a, b) => b.fallos - a.fallos);

  return {
    ...data,
    byArea: sortedByArea
  };
};

export function ReportsScreen({ onBack, mode = 'admin', docenteId, docentePersonaId, docenteAreaId }: ReportsScreenProps) {
  const isDocenteMode = mode === 'docente';
  const subjectPalette = ['#4A90E2', '#7ED6A7', '#F5A97F'];
  const [activeTab, setActiveTab] = useState<'student' | 'date' | 'activity' | 'failures'>('student');
  const [showFilters, setShowFilters] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [filters, setFilters] = useState<Filters>({
    contentType: 'all',
    area: 'all',
    status: 'all',
    topic: 'all',
    student: 'all',
    semester: 'all',
    dateFrom: '',
    dateTo: '',
    activityType: 'all'
  });
  const [appliedFilters, setAppliedFilters] = useState<Filters>({
    contentType: 'all',
    area: 'all',
    status: 'all',
    topic: 'all',
    student: 'all',
    semester: 'all',
    dateFrom: '',
    dateTo: '',
    activityType: 'all'
  });
  const [appliedSearch, setAppliedSearch] = useState('');
  const [hasAppliedFilters, setHasAppliedFilters] = useState(true);

  // Estado para estudiantes (se carga desde backend). Si falla, usamos fallbackMockStudents
  const [studentsData, setStudentsData] = useState<StudentProgress[]>([]);
  const [areasCatalog, setAreasCatalog] = useState<BasicArea[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(true);
  const [failuresData, setFailuresData] = useState<FailuresReportData | null>(null);
  const [failuresLoading, setFailuresLoading] = useState(false);

  const completeStudentSubjectsWithAreas = (rawSubjects: any[], areas: BasicArea[]) => {
    const sourceSubjects = Array.isArray(rawSubjects) ? rawSubjects : [];
    const normalizeSubject = (subject: any, idx: number, fallbackName?: string, fallbackAreaId?: string) => ({
      areaId: String(subject?.areaId ?? subject?.area_id ?? fallbackAreaId ?? '') || undefined,
      name: subject?.name || subject?.nombre || fallbackName || `Area ${idx + 1}`,
      color: subject?.color || subjectPalette[idx % subjectPalette.length],
      progress: Number(subject?.progress ?? 0) || 0,
      contentViewed: Number(subject?.contentViewed ?? 0) || 0,
      exercisesCompleted: Number(subject?.exercisesCompleted ?? 0) || 0,
      miniprojectsSubmitted: Number(subject?.miniprojectsSubmitted ?? 0) || 0,
      topics: Array.isArray(subject?.topics) ? subject.topics : []
    });

    if (areas.length === 0) {
      return sourceSubjects.map((subject, idx) => normalizeSubject(subject, idx));
    }

    const completed = areas.map((area, idx) => {
      const match = sourceSubjects.find((subject: any) => {
        const subjectAreaId = String(subject?.areaId ?? subject?.area_id ?? '');
        return subjectAreaId === String(area.id)
          || String(subject?.name || subject?.nombre || '').trim().toLowerCase() === area.nombre.trim().toLowerCase();
      });

      if (match) {
        return normalizeSubject(match, idx, area.nombre, String(area.id));
      }

      return {
        areaId: String(area.id),
        name: area.nombre,
        color: subjectPalette[idx % subjectPalette.length],
        progress: 0,
        contentViewed: 0,
        exercisesCompleted: 0,
        miniprojectsSubmitted: 0,
        topics: []
      };
    });

    const includedAreaIds = new Set(completed.map((subject) => String(subject.areaId ?? '')));
    const extras = sourceSubjects
      .filter((subject: any) => {
        const subjectAreaId = String(subject?.areaId ?? subject?.area_id ?? '');
        return subjectAreaId && !includedAreaIds.has(subjectAreaId);
      })
      .map((subject: any, idx: number) => normalizeSubject(subject, idx + areas.length));

    return [...completed, ...extras];
  };

  const getDocenteRequestConfig = () => {
    if (!isDocenteMode) return undefined;

    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (docenteId) {
      headers['x-docente-id'] = String(docenteId);
    }
    if (docenteAreaId) {
      headers['x-area-id'] = String(docenteAreaId);
    }

    return Object.keys(headers).length > 0 ? { headers } : undefined;
  };

  // Fallback con el mock original reducido (solo estructura necesaria)
  const fallbackMockStudents: StudentProgress[] = [
    { id: '1', name: 'Juan Pérez', email: 'juan.perez@universidad.edu', createdDate: '2025-09-15', semester: '1', subjects: [] },
    { id: '2', name: 'María García', email: 'maria.garcia@universidad.edu', createdDate: '2025-09-15', semester: '2', subjects: [] }
  ];

  useEffect(() => {
    const loadStudentsAndProgress = async () => {
      try {
        setLoadingStudents(true);
        let currentAreasCatalog: BasicArea[] = [];

        const normalizeAreasCatalog = (areasInput: any[]): BasicArea[] => areasInput
          .map((area: any) => ({ id: Number(area?.id), nombre: String(area?.nombre || area?.name || '') }))
          .filter((area: BasicArea) => Number.isFinite(area.id) && area.nombre.trim().length > 0);

        try {
          const areasResponse = await api.get('/areas', getDocenteRequestConfig());
          const normalizedAreas = normalizeAreasCatalog(Array.isArray(areasResponse.data) ? areasResponse.data : []);
          if (normalizedAreas.length > 0) {
            currentAreasCatalog = normalizedAreas;
            setAreasCatalog(normalizedAreas);
          }
        } catch {
          // Si falla, intentaremos completar el catalogo usando otros endpoints
        }

        // Nuevo endpoint agregado: resumen general con un solo llamado
        try {
          const resumenEndpoint = isDocenteMode
            ? '/docente/reportes/progreso-estudiantes'
            : '/progresos/resumen-general';
          const resumenRes = await api.get(resumenEndpoint, getDocenteRequestConfig());
          const resumenData = resumenRes.data || {};
          if (Array.isArray(resumenData.students)) {
            const areasList = Array.isArray(resumenData.areas) ? resumenData.areas : [];
            const normalizedAreas = normalizeAreasCatalog(areasList);
            if (normalizedAreas.length > 0) {
              currentAreasCatalog = normalizedAreas;
              setAreasCatalog(normalizedAreas);
            }
            const effectiveAreasCatalog = normalizedAreas.length > 0 ? normalizedAreas : currentAreasCatalog;

            const normalizedStudents: StudentProgress[] = resumenData.students.map((student: any) => ({
              ...student,
              subjects: completeStudentSubjectsWithAreas(student.subjects || [], effectiveAreasCatalog)
            }));

            setStudentsData(normalizedStudents);
            return;
          }
        } catch (e) {
          // Si falla, continuar con el flujo anterior
        }

        if (isDocenteMode) {
          try {
            const fallbackRes = await api.get('/progresos/resumen-general');
            const fallbackData = fallbackRes.data || {};
            if (Array.isArray(fallbackData.students)) {
              const areaId = docenteAreaId ? String(docenteAreaId) : null;
              const normalizedAreas = normalizeAreasCatalog(Array.isArray(fallbackData.areas) ? fallbackData.areas : []);
              if (normalizedAreas.length > 0) {
                currentAreasCatalog = normalizedAreas;
                setAreasCatalog(normalizedAreas);
              }
              const effectiveAreasCatalog = normalizedAreas.length > 0 ? normalizedAreas : currentAreasCatalog;

              const normalizedStudents: StudentProgress[] = fallbackData.students
                .map((student: any) => {
                  const subjects = completeStudentSubjectsWithAreas(student.subjects || [], effectiveAreasCatalog)
                    .filter((subject: any) => {
                      if (!areaId) return true;
                      return String(subject.areaId ?? '') === areaId;
                    });

                  return {
                    ...student,
                    subjects
                  } as StudentProgress;
                })
                .filter((student: StudentProgress) => student.subjects.length > 0);

              setStudentsData(normalizedStudents);
              return;
            }
          } catch {
            // fallback final abajo
          }

          setStudentsData(fallbackMockStudents);
          return;
        }

        // 1) obtener áreas para luego pedir progreso por área por estudiante
        const areasRes = await api.get('/areas');
        const areas = Array.isArray(areasRes.data) ? areasRes.data : [];
        const normalizedAreas = normalizeAreasCatalog(areas);
        currentAreasCatalog = normalizedAreas;
        setAreasCatalog(normalizedAreas);
        console.log('[Reports] áreas recibidas:', areas.length, areas);

        // 2) obtener estudiantes — probar primero el endpoint singular '/estudiante' (el backend usa ese nombre)
        let students: any[] = [];
        try {
          const studentsRes = await api.get('/estudiante');
          students = Array.isArray(studentsRes.data) ? studentsRes.data : (studentsRes.data ? [studentsRes.data] : []);
        } catch (err) {
          // Si falla, intentar el plural '/estudiantes' como alternativa
          try {
            const studentsRes2 = await api.get('/estudiantes');
            students = Array.isArray(studentsRes2.data) ? studentsRes2.data : [];
          } catch (e) {
            students = [];
          }
        }
        console.log('[Reports] estudiantes recibidos:', students.length, students);

        if (students.length === 0) {
          // fallback a mock si no hay endpoint disponible
          setStudentsData(fallbackMockStudents);
          return;
        }

        // 3) por cada estudiante, obtener progreso por cada área y construir subjects
        const studentsWithProgress: StudentProgress[] = await Promise.all(students.map(async (st: any) => {
          const subjects = await Promise.all(areas.map(async (area: any, idx: number) => {
            // Obtener el resumen por área (contenidos/ejercicios/miniproyectos)
            let areaResumen: any = null;
            try {
              const url = `/progresos/por-area?area_id=${area.id}&estudiante_id=${st.id}`;
              const res = await api.get(url);
              areaResumen = res.data;
              console.log('[Reports] progreso por área', { estudianteId: st.id, areaId: area.id, data: areaResumen });
            } catch (e) {
              areaResumen = null;
              console.warn('[Reports] sin progreso por área', { estudianteId: st.id, areaId: area.id, error: e });
            }

            // Obtener temas del área y para cada tema obtener progreso y subtemas
            let topics: { name: string; progress: number; subtopics: { name: string; progress: number }[] }[] = [];
            try {
              const temasRes = await api.get(`/temas/por-area/${area.id}`);
              const temas = Array.isArray(temasRes.data) ? temasRes.data : [];
              console.log('[Reports] temas por área', { areaId: area.id, total: temas.length, temas });

              topics = await Promise.all(temas.map(async (tema: any) => {
                // progreso por tema
                let temaProgress = 0;
                try {
                  const temaProgRes = await api.get(`/progresos/por-tema?tema_id=${tema.id}&estudiante_id=${st.id}`);
                  // preferir porcentaje total del resumen si existe
                  temaProgress = temaProgRes.data?.resumen?.porcentajeTotalTema ?? temaProgRes.data?.progreso?.contenidos?.porcentaje ?? 0;
                  console.log('[Reports] progreso por tema', { estudianteId: st.id, temaId: tema.id, data: temaProgRes.data });
                } catch (e) {
                  temaProgress = 0;
                  console.warn('[Reports] sin progreso por tema', { estudianteId: st.id, temaId: tema.id, error: e });
                }

                // subtemas del tema
                let subtopics: { name: string; progress: number }[] = [];
                try {
                  const subRes = await api.get(`/subtemas/por-tema/${tema.id}`);
                  const subs = Array.isArray(subRes.data) ? subRes.data : [];
                  console.log('[Reports] subtemas por tema', { temaId: tema.id, total: subs.length, subtemas: subs });
                  subtopics = await Promise.all(subs.map(async (sub: any) => {
                    let subProgress = 0;
                    try {
                      const subProgRes = await api.get(`/progresos/por-subtema?subtema_id=${sub.id}&estudiante_id=${st.id}`);
                      subProgress = subProgRes.data?.resumen?.porcentajeTotalSubtema ?? subProgRes.data?.progreso?.contenidos?.porcentaje ?? 0;
                      console.log('[Reports] progreso por subtema', { estudianteId: st.id, subtemaId: sub.id, data: subProgRes.data });
                    } catch (e) {
                      subProgress = 0;
                      console.warn('[Reports] sin progreso por subtema', { estudianteId: st.id, subtemaId: sub.id, error: e });
                    }
                    return { name: sub.nombre || sub.name || `Subtema ${sub.id}`, progress: subProgress };
                  }));
                } catch (e) {
                  subtopics = [];
                  console.warn('[Reports] sin subtemas por tema', { temaId: tema.id, error: e });
                }

                return { name: tema.nombre || tema.name || `Tema ${tema.id}`, progress: Math.round(temaProgress), subtopics };
              }));
            } catch (e) {
              topics = [];
            }

            const contenidos = areaResumen?.progreso?.contenidos || { total: 0, completados: 0, porcentaje: 0 };
            const ejercicios = areaResumen?.progreso?.ejercicios || { total: 0, completados: 0, porcentaje: 0 };
            const miniproyectos = areaResumen?.progreso?.miniproyectos || { total: 0, completados: 0, porcentaje: 0 };

            return {
              areaId: String(area.id),
              name: area.nombre || `Área ${area.id}`,
              color: ['#4A90E2', '#7ED6A7', '#F5A97F'][idx % 3],
              progress: areaResumen?.resumen?.porcentajeTotalArea ?? contenidos.porcentaje ?? 0,
              contentViewed: contenidos.completados ?? 0,
              exercisesCompleted: ejercicios.completados ?? 0,
              miniprojectsSubmitted: miniproyectos.completados ?? 0,
              topics
            };
          }));

          return {
            id: String(st.id),
            name: st.persona?.nombre || st.nombre || st.name || `${st.nombre || 'Estudiante'}`,
            email: st.persona?.email || st.email || st.correo || '',
            createdDate: st.createdAt ? st.createdAt.split('T')[0] : (st.createdDate || ''),
            semester: st.semestre ?? st.semester ?? st.persona?.semestre ?? st.semestreActual ?? '',
            subjects
          } as StudentProgress;
        }));

        setStudentsData(studentsWithProgress);
      } catch (error) {
        console.error('Error cargando estudiantes o áreas:', error);
        setStudentsData(fallbackMockStudents);
      } finally {
        setLoadingStudents(false);
      }
    };

    loadStudentsAndProgress();
  }, [isDocenteMode, docenteId, docentePersonaId, docenteAreaId]);

  useEffect(() => {
    const loadFailuresReport = async () => {
      if (!hasAppliedFilters || activeTab !== 'failures') return;

      try {
        setFailuresLoading(true);
        let areasCatalog: BasicArea[] = [];
        try {
          const areasResponse = await api.get('/areas');
          const areas = Array.isArray(areasResponse.data) ? areasResponse.data : [];
          areasCatalog = areas
            .map((area: any) => ({ id: Number(area?.id), nombre: String(area?.nombre || '') }))
            .filter((area: BasicArea) => Number.isFinite(area.id) && area.nombre.trim().length > 0);
        } catch {
          areasCatalog = [];
        }

        const params = new URLSearchParams();
        if (appliedFilters.student !== 'all') {
          params.append('estudiante_id', appliedFilters.student);
        } else {
          params.append('estudiante_id', 'all');
        }

        if (isDocenteMode) {
          try {
            const docenteResponse = await api.get(`/docente/reportes/fallos?${params.toString()}`, getDocenteRequestConfig());
            const scoped = scopeFailuresDataByArea(docenteResponse.data || {}, docenteAreaId);
            const merged = mergeFailuresWithAreas(scoped, areasCatalog, docenteAreaId);
            setFailuresData(merged);
            return;
          } catch {
            const fallbackResponse = await api.get(`/progresos/reporte-fallos?${params.toString()}`);
            const scoped = scopeFailuresDataByArea(fallbackResponse.data || {}, docenteAreaId);
            const merged = mergeFailuresWithAreas(scoped, areasCatalog, docenteAreaId);
            setFailuresData(merged);
            return;
          }
        }

        const response = await api.get(`/progresos/reporte-fallos?${params.toString()}`);
        const rawData = (response.data || null) as FailuresReportData | null;
        if (!rawData) {
          setFailuresData(null);
          return;
        }

        const merged = mergeFailuresWithAreas(rawData, areasCatalog);
        setFailuresData(merged);
      } catch (error) {
        console.error('Error cargando reporte de fallos:', error);
        setFailuresData(null);
      } finally {
        setFailuresLoading(false);
      }
    };

    loadFailuresReport();
  }, [activeTab, hasAppliedFilters, appliedFilters.student, isDocenteMode, docenteId, docentePersonaId, docenteAreaId]);

  useEffect(() => {
    if (isDocenteMode && (activeTab === 'date' || activeTab === 'activity')) {
      setActiveTab('student');
    }
  }, [isDocenteMode, activeTab]);

  const clearFilters = () => {
    setStudentSearch('');
    setFilters({
      contentType: 'all',
      area: 'all',
      status: 'all',
      topic: 'all',
      student: 'all',
      semester: 'all',
      dateFrom: '',
      dateTo: '',
      activityType: 'all'
    });
    setAppliedSearch('');
    setAppliedFilters({
      contentType: 'all',
      area: 'all',
      status: 'all',
      topic: 'all',
      student: 'all',
      semester: 'all',
      dateFrom: '',
      dateTo: '',
      activityType: 'all'
    });
    setHasAppliedFilters(true);
  };

  const applyFilters = () => {
    setAppliedFilters(filters);
    setAppliedSearch(studentSearch);
    setHasAppliedFilters(true);
  };

  const handleExport = () => {
    downloadPdf(activeTab);
  };

  const downloadPdf = async (type: 'student' | 'date' | 'activity' | 'failures') => {
    if (!hasAppliedFilters) {
      alert('Aplica los filtros antes de descargar el informe.');
      return;
    }

    try {
      setPdfLoading(true);
      const params = new URLSearchParams({ type });
      if (type === 'student' && appliedFilters.student !== 'all') {
        params.append('estudiante_id', appliedFilters.student);
      }
      if (type === 'failures' && appliedFilters.student !== 'all') {
        params.append('estudiante_id', appliedFilters.student);
      }
      if (appliedFilters.semester !== 'all') {
        params.append('semester', appliedFilters.semester);
      }
      if (appliedFilters.dateFrom) {
        params.append('dateFrom', appliedFilters.dateFrom);
      }
      if (appliedFilters.dateTo) {
        params.append('dateTo', appliedFilters.dateTo);
      }
      if (appliedFilters.status !== 'all') {
        params.append('status', appliedFilters.status);
      }
      if (appliedFilters.activityType !== 'all') {
        params.append('activityType', appliedFilters.activityType);
      }

      const response = await api.get(`/progresos/reporte-pdf?${params.toString()}`, {
        ...(getDocenteRequestConfig() || {}),
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');

      if (printWindow) {
        const onReady = () => {
          printWindow.focus();
          printWindow.print();
        };
        printWindow.addEventListener('load', onReady);
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte_${type}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando PDF:', error);
      alert('No se pudo generar el PDF. Intenta nuevamente.');
    } finally {
      setPdfLoading(false);
    }
  };

  const parsePercentValue = (value: number | string | null | undefined) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const normalized = value.trim().replace('%', '').replace(',', '.');
      const parsed = Number.parseFloat(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const formatPercent = (value: number | string | null | undefined) => {
    const numericValue = parsePercentValue(value);
    const rounded = Math.round(numericValue * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}` : `${rounded.toFixed(1)}`;
  };

  const normalizePercent = (value: number | string | null | undefined) => {
    const numericValue = parsePercentValue(value);
    return Math.min(100, Math.max(0, numericValue));
  };

  const formatGrade = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}` : `${rounded.toFixed(1)}`;
  };

  const formatCohortDate = (dateValue: string) => {
    if (!dateValue) return 'Sin fecha';
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return dateValue;
    return parsed.toLocaleDateString('es-CO');
  };

  // Calcular datos agrupados por fecha de creación
  const getDataByDate = (sourceStudents: StudentProgress[]) => {
    const grouped: { [key: string]: StudentProgress[] } = {};
    sourceStudents.forEach(student => {
      if (!grouped[student.createdDate]) {
        grouped[student.createdDate] = [];
      }
      grouped[student.createdDate].push(student);
    });

    return Object.entries(grouped)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, students]) => {
      const sumAvg = students.reduce((sum, s) => {
        const totalProgress = s.subjects.reduce((acc, subj) => acc + subj.progress, 0);
        const avg = s.subjects.length ? totalProgress / s.subjects.length : 0;
        return sum + avg;
      }, 0);

      const avgProgress = students.length ? sumAvg / students.length : 0;

      return {
        date,
        cohortLabel: formatCohortDate(date),
        avgProgress,
        studentCount: students.length,
        students
      };
    });
  };

  // Datos para gráfica de actividades
  const getActivityData = (sourceStudents: StudentProgress[]) => {
    const activities = [
      { name: 'Contenidos Visualizados', value: 0 },
      { name: 'Ejercicios Completados', value: 0 },
      { name: 'Miniproyectos Entregados', value: 0 }
    ];

    sourceStudents.forEach(student => {
      student.subjects.forEach(subject => {
        activities[0].value += subject.contentViewed;
        activities[1].value += subject.exercisesCompleted;
        activities[2].value += subject.miniprojectsSubmitted;
      });
    });

    return activities;
  };

  // Datos para gráfica de progreso por materia
  const getSubjectProgressData = (sourceStudents: StudentProgress[], areas: BasicArea[]) => {
    const subjectMap = new Map<string, { name: string; color: string; areaId?: string }>();
    sourceStudents.forEach(student => {
      student.subjects.forEach(subject => {
        const key = subject.areaId ? `id:${String(subject.areaId)}` : `name:${subject.name}`;
        if (!subjectMap.has(key)) {
          subjectMap.set(key, {
            name: subject.name,
            color: subject.color || '#4A90E2',
            areaId: subject.areaId ? String(subject.areaId) : undefined
          });
        }
      });
    });

    const catalogSubjects = areas.map((area, idx) => {
      const mapKey = `id:${String(area.id)}`;
      const existing = subjectMap.get(mapKey);

      return {
        key: mapKey,
        name: existing?.name || area.nombre,
        color: existing?.color || subjectPalette[idx % subjectPalette.length],
        areaId: String(area.id)
      };
    });

    const baseSubjects = catalogSubjects.length > 0
      ? catalogSubjects
      : Array.from(subjectMap.entries()).map(([key, value]) => ({
          key,
          name: value.name,
          color: value.color,
          areaId: value.areaId
        }));

    return baseSubjects.map((subject) => {
      let total = 0;

      sourceStudents.forEach(student => {
        const matchByAreaId = subject.areaId
          ? student.subjects.find((s) => String(s.areaId ?? '') === subject.areaId)
          : undefined;
        const matchByName = student.subjects.find((s) => s.name === subject.name);
        const matchedSubject = matchByAreaId || matchByName;
        total += matchedSubject?.progress || 0;
      });

      const avgProgress = sourceStudents.length ? total / sourceStudents.length : 0;

      return {
        name: subject.name,
        shortName: subject.name.length > 22 ? `${subject.name.slice(0, 22)}...` : subject.name,
        progress: avgProgress,
        color: subject.color,
        areaId: subject.areaId
      };
    });
  };

  const normalizedSearch = appliedSearch.trim().toLowerCase();
  const semesterOptions = Array.from(
    new Set(
      studentsData
        .map(student => (student.semester ?? '').toString().trim())
        .filter(Boolean)
    )
  ).sort((a, b) => {
    const numA = Number(a);
    const numB = Number(b);
    if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });
  const baseFilteredStudents = hasAppliedFilters ? studentsData.filter(student => {
    if (normalizedSearch && !student.name.toLowerCase().includes(normalizedSearch)) return false;
    if (appliedFilters.student !== 'all' && student.id !== appliedFilters.student) return false;
    if (appliedFilters.semester !== 'all' && String(student.semester ?? '') !== appliedFilters.semester) return false;
    return true;
  }) : [];

  const studentTabStudents = baseFilteredStudents.filter(student => {
    if (appliedFilters.status !== 'all') {
      const hasSubjects = student.subjects.length > 0;
      const allCompleted = hasSubjects && student.subjects.every(subj => (subj.progress || 0) >= 100);
      const anyStarted = student.subjects.some(subj => (subj.progress || 0) > 0);

      if (appliedFilters.status === 'completed' && !allCompleted) return false;
      if (appliedFilters.status === 'in-progress' && (!anyStarted || allCompleted)) return false;
      if (appliedFilters.status === 'not-started' && anyStarted) return false;
    }

    return true;
  });

  const dateTabStudents = baseFilteredStudents.filter(student => {
    if (!appliedFilters.dateFrom && !appliedFilters.dateTo) return true;
    const created = student.createdDate ? new Date(student.createdDate) : null;
    if (!created || Number.isNaN(created.getTime())) return false;
    if (appliedFilters.dateFrom) {
      const from = new Date(appliedFilters.dateFrom);
      if (created < from) return false;
    }
    if (appliedFilters.dateTo) {
      const to = new Date(appliedFilters.dateTo);
      if (created > to) return false;
    }
    return true;
  });

  const activityTabStudents = baseFilteredStudents.filter(student => {
    if (appliedFilters.activityType === 'all') return true;
    const totals = student.subjects.reduce(
      (acc, subj) => {
        acc.content += subj.contentViewed || 0;
        acc.exercise += subj.exercisesCompleted || 0;
        acc.miniproject += subj.miniprojectsSubmitted || 0;
        return acc;
      },
      { content: 0, exercise: 0, miniproject: 0 }
    );

    if (appliedFilters.activityType === 'content') return totals.content > 0;
    if (appliedFilters.activityType === 'exercise') return totals.exercise > 0;
    if (appliedFilters.activityType === 'miniproject') return totals.miniproject > 0;
    return true;
  });

  const dateData = getDataByDate(dateTabStudents);
  const MAX_COHORTS_VISIBLE = 8;
  const sortedDateDataByProgress = [...dateData].sort((a, b) => {
    if (b.avgProgress !== a.avgProgress) return b.avgProgress - a.avgProgress;
    if (b.studentCount !== a.studentCount) return b.studentCount - a.studentCount;
    return a.date.localeCompare(b.date);
  });
  const dateDataVisible = sortedDateDataByProgress.slice(0, MAX_COHORTS_VISIBLE);
  const hiddenCohortsCount = Math.max(0, dateData.length - dateDataVisible.length);
  const activityData = getActivityData(activityTabStudents);
  const subjectProgressData = getSubjectProgressData(activityTabStudents, areasCatalog);

  const failuresTotals = failuresData?.totals || { intentos: 0, fallos: 0, aciertos: 0 };
  const failuresRate = failuresTotals.intentos > 0
    ? Math.round((failuresTotals.fallos / failuresTotals.intentos) * 100)
    : 0;
  const successRate = failuresTotals.intentos > 0
    ? Math.round((failuresTotals.aciertos / failuresTotals.intentos) * 100)
    : 0;
  const failuresByType = failuresData?.byType || {
    ejercicios: { intentos: 0, fallos: 0, aciertos: 0 },
    miniproyectos: { intentos: 0, fallos: 0, aciertos: 0 }
  };
  const failuresByArea = failuresData?.byArea || [];
  const failuresByStudent = failuresData?.byStudent || [];
  const failuresItems = failuresData?.items || [];
  const isAllStudentsFailuresView = appliedFilters.student === 'all';

  const failuresItemsForTable: FailuresItem[] = isAllStudentsFailuresView
    ? Array.from(
        failuresItems.reduce((map, item) => {
          const key = `${item.tipo}-${item.actividad_id}-${item.area_id ?? 'sin-area'}`;
          const existing = map.get(key);
          if (!existing) {
            map.set(key, {
              ...item,
              estudiante_id: 0,
              aprobado: Boolean(item.aprobado),
              estudiantesAfectados: 1
            });
            return map;
          }

          existing.intentos += item.intentos || 0;
          existing.fallos += item.fallos || 0;
          existing.aciertos += item.aciertos || 0;
          existing.aprobado = existing.aprobado && Boolean(item.aprobado);
          existing.estudiantesAfectados = (existing.estudiantesAfectados || 0) + 1;
          map.set(key, existing);
          return map;
        }, new Map<string, FailuresItem>()).values()
      )
    : failuresItems;

  const failuresItemsSorted = [...failuresItemsForTable].sort((a, b) => {
    if (b.fallos !== a.fallos) return b.fallos - a.fallos;
    return b.intentos - a.intentos;
  });
  const failuresItemsDisplay = isAllStudentsFailuresView
    ? failuresItemsSorted.slice(0, 20)
    : failuresItemsSorted;

  const failuresAreaChartData = failuresByArea.map((area) => ({
    name: area.area_name || 'Sin area',
    shortName: (area.area_name || 'Sin area').length > 22
      ? `${(area.area_name || 'Sin area').slice(0, 22)}...`
      : (area.area_name || 'Sin area'),
    fallos: area.fallos,
    intentos: area.intentos
  }));
  const failuresStudentsSorted = [...failuresByStudent].sort((a, b) => b.fallos - a.fallos);
  const failuresStudentsDisplay = appliedFilters.student === 'all'
    ? failuresStudentsSorted.slice(0, 20)
    : failuresStudentsSorted;
  const docenteFailuresStudentChartData = failuresStudentsDisplay
    .slice(0, 8)
    .map((student) => ({
      name: student.nombre || `Estudiante ${student.estudiante_id}`,
      shortName: (student.nombre || `Estudiante ${student.estudiante_id}`).length > 24
        ? `${(student.nombre || `Estudiante ${student.estudiante_id}`).slice(0, 24)}...`
        : (student.nombre || `Estudiante ${student.estudiante_id}`),
      fallos: student.fallos,
      intentos: student.intentos
    }));
  const docenteFailuresActivityChartData = failuresItemsDisplay
    .slice(0, 8)
    .map((item) => ({
      name: item.titulo || `${item.tipo} ${item.actividad_id}`,
      shortName: (item.titulo || `${item.tipo} ${item.actividad_id}`).length > 28
        ? `${(item.titulo || `${item.tipo} ${item.actividad_id}`).slice(0, 28)}...`
        : (item.titulo || `${item.tipo} ${item.actividad_id}`),
      fallos: item.fallos,
      intentos: item.intentos
    }));
  const appliedFilterCount = Object.values(appliedFilters).filter((value) => value && value !== 'all').length + (appliedSearch ? 1 : 0);
  const globalAverageProgress = studentsData.length
    ? studentsData.reduce((sum, student) => {
        const average = student.subjects.length
          ? student.subjects.reduce((acc, subject) => acc + subject.progress, 0) / student.subjects.length
          : 0;
        return sum + average;
      }, 0) / studentsData.length
    : 0;
  const reportViewLabel = activeTab === 'student'
    ? 'Progreso por estudiante'
    : activeTab === 'date'
      ? 'Comparativo por cohorte'
      : activeTab === 'activity'
        ? 'Desempeño por actividad'
        : 'Fallos por actividad';
  const reportViewDescription = activeTab === 'student'
    ? 'Sigue el avance individual y detecta rezagos con mayor claridad.'
    : activeTab === 'date'
      ? 'Compara cohortes y fechas de ingreso bajo la misma lectura visual.'
      : activeTab === 'activity'
        ? 'Concentra uso, completitud y rendimiento por actividad o área.'
        : 'Prioriza fallos, intentos y focos de atención por estudiante y actividad.';
  const reportVisibleCount = activeTab === 'student'
    ? studentTabStudents.length
    : activeTab === 'date'
      ? dateDataVisible.length
      : activeTab === 'activity'
        ? activityTabStudents.length
        : failuresItemsDisplay.length;
  const reportVisibleLabel = activeTab === 'date'
    ? 'Cohortes visibles'
    : activeTab === 'failures'
      ? 'Registros visibles'
      : 'Estudiantes visibles';

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-main py-4">
          <div className="app-page-header">
            <div className="app-brand-block">
              <div className="app-brand-icon">
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-[#3A4A5B]">Reportes académicos</h1>
                <p className="text-sm text-slate-500">{isDocenteMode ? 'Lectura docente del rendimiento y avance' : 'Centro analítico del panel administrativo'}</p>
              </div>
            </div>
            <div className="app-action-row">
              <button onClick={handleExport} className="app-btn app-primary-btn">
                <Download className="w-4 h-4" />
                <span>Exportar PDF</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <button onClick={onBack} className="app-back-button mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Panel</span>
        </button>

        <section className="app-page-hero mb-6">
          <div className="app-page-hero__content">
            <div className="app-page-hero__copy">
              <div className="app-page-hero__eyebrow">Analítica Generalizada</div>
              <h2 className="app-page-hero__title">{reportViewLabel}</h2>
              <p className="app-page-hero__description">{reportViewDescription}</p>
            </div>

            <div className="app-hero-metrics">
              <div className="app-hero-metric">
                <div className="app-hero-metric__label">Estudiantes</div>
                <div className="app-hero-metric__value">{studentsData.length}</div>
                <div className="app-hero-metric__help">Base actual disponible para análisis.</div>
              </div>
              <div className="app-hero-metric">
                <div className="app-hero-metric__label">Áreas</div>
                <div className="app-hero-metric__value">{areasCatalog.length}</div>
                <div className="app-hero-metric__help">Cobertura temática con seguimiento activo.</div>
              </div>
              <div className="app-hero-metric">
                <div className="app-hero-metric__label">{reportVisibleLabel}</div>
                <div className="app-hero-metric__value">{reportVisibleCount}</div>
                <div className="app-hero-metric__help">Resultados en la vista seleccionada.</div>
              </div>
              <div className="app-hero-metric">
                <div className="app-hero-metric__label">Avance global</div>
                <div className="app-hero-metric__value">{formatPercent(globalAverageProgress)}%</div>
                <div className="app-hero-metric__help">Promedio consolidado del entorno.</div>
              </div>
            </div>
          </div>
        </section>

        {pdfLoading && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl px-6 py-4 flex items-center gap-3">
              <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-600">Generando PDF...</span>
            </div>
          </div>
        )}

        {loadingStudents && (
          <div className="app-panel mb-6 p-6">
            <div className="flex items-center gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="h-20 bg-gray-100 rounded-lg animate-pulse" />
              <div className="h-20 bg-gray-100 rounded-lg animate-pulse" />
              <div className="h-20 bg-gray-100 rounded-lg animate-pulse" />
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="app-panel mb-6 overflow-hidden">
          <div className="app-filter-tab-row">
            <button
              onClick={() => setActiveTab('student')}
              className={`app-filter-tab ${
                activeTab === 'student'
                  ? 'app-filter-tab--blue'
                  : ''
              }`}
            >
              <User className="w-5 h-5" />
              <span>Progreso por Estudiante</span>
            </button>
            {!isDocenteMode && (
              <button
                onClick={() => setActiveTab('date')}
                className={`app-filter-tab ${
                  activeTab === 'date'
                    ? 'app-filter-tab--green'
                    : ''
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span>Progreso por Fecha de Creación</span>
              </button>
            )}
            {!isDocenteMode && (
              <button
                onClick={() => setActiveTab('activity')}
                className={`app-filter-tab ${
                  activeTab === 'activity'
                    ? 'app-filter-tab--amber'
                    : ''
                }`}
              >
                <Activity className="w-5 h-5" />
                <span>Desempeño por Actividad</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('failures')}
              className={`app-filter-tab ${
                activeTab === 'failures'
                  ? 'app-filter-tab--red'
                  : ''
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
              <span>Fallos por Actividad</span>
            </button>
          </div>
        </div>

        {/* Filtros */}
        {showFilters && (
          <div className="app-toolbar-card mb-6">
            <div className="app-section-head mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-[#3A4A5B]" />
                  <h3 className="app-section-title">Filtros avanzados</h3>
                </div>
                <p className="app-section-description">Usa un solo punto de control para buscar, acotar y aplicar la lectura actual.</p>
              </div>
              <button
                onClick={() => setShowFilters(false)}
                className="app-btn app-btn-secondary app-btn-sm text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="app-alert app-alert--warning mb-4">
              <span className="text-sm">La información se muestra cuando confirmas la combinación actual de filtros.</span>
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">{appliedFilterCount} activos</span>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="app-form-field">
                <label className="app-form-label">Buscar estudiante</label>
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Escribe un nombre..."
                  className="app-form-input"
                />
              </div>

              <div className="app-form-field">
                <label className="app-form-label">Estudiante</label>
                <select 
                  value={filters.student}
                  onChange={(e) => setFilters({...filters, student: e.target.value})}
                  className="app-form-select"
                >
                  <option value="all">Todos los estudiantes</option>
                  {studentsData.map(student => (
                    <option key={student.id} value={student.id}>{student.name}</option>
                  ))}
                </select>
              </div>

              <div className="app-form-field">
                <label className="app-form-label">Semestre</label>
                <select
                  value={filters.semester}
                  onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
                  className="app-form-select"
                >
                  <option value="all">Todos los semestres</option>
                  {semesterOptions.map((semester) => (
                    <option key={semester} value={semester}>{semester}</option>
                  ))}
                </select>
              </div>
            </div>

            {activeTab === 'student' && (
              <div className="grid grid-cols-1 gap-4 mb-4">
                <div className="app-form-field">
                  <label className="flex items-center gap-2 app-form-label">
                    <span>Estado de Avance</span>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-600"
                      title="Completado: 100% en todas las áreas. En progreso: inició pero no terminó. No iniciado: 0% en todas las áreas."
                      aria-label="Información sobre el estado de avance"
                    >
                      <AlertCircle className="w-4 h-4" />
                    </button>
                  </label>
                  <select 
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="app-form-select"
                  >
                    <option value="all">Todos</option>
                    <option value="completed">Completado</option>
                    <option value="in-progress">En Progreso</option>
                    <option value="not-started">No Iniciado</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'date' && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="app-form-field">
                  <label className="app-form-label">Fecha desde</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                    className="app-form-input"
                  />
                </div>
                <div className="app-form-field">
                  <label className="app-form-label">Fecha hasta</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                    className="app-form-input"
                  />
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="app-form-field">
                  <label className="app-form-label">Tipo de Actividad</label>
                  <select 
                    value={filters.activityType}
                    onChange={(e) => setFilters({...filters, activityType: e.target.value})}
                    className="app-form-select"
                  >
                    <option value="all">Todas</option>
                    <option value="content">Contenidos</option>
                    <option value="exercise">Ejercicios</option>
                    <option value="miniproject">Miniproyectos</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'failures' && (
              <div className="grid grid-cols-1 gap-4 mb-4">
                <div className="app-alert app-alert--warning">
                  Este informe usa el filtro de estudiante. Si seleccionas "Todos", se mostrara el top 20 de actividades con mas fallos. Si necesitas ver los intentos, aciertos o fallos de ejercicios y miniproyectos de un estudiante en especifico, seleccionalo en el filtro "Estudiante" y aplica los filtros.
                </div>
              </div>
            )}

            <div className="app-action-row justify-start">
              <button 
                onClick={clearFilters}
                className="app-btn app-btn-secondary"
              >
                Limpiar Filtros
              </button>
              <button
                onClick={applyFilters}
                className="app-btn app-primary-btn"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        )}

        {!showFilters && (
          <button
            onClick={() => setShowFilters(true)}
            className="app-btn app-btn-secondary mb-6"
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm">Mostrar Filtros</span>
          </button>
        )}

        {/* Content by Tab */}
        {!hasAppliedFilters && (
          <div className="app-empty-panel">
            La información se muestra solo cuando se aplican los filtros.
          </div>
        )}

        {hasAppliedFilters && activeTab === 'student' && (
          <div className="space-y-6">
            {/* Resumen Cards */}
            <div className="app-metric-grid">
              <div className="app-metric-card">
                <div className="app-metric-icon app-metric-icon--blue">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="app-metric-value">{studentTabStudents.length}</div>
                  <div className="app-metric-label">Total estudiantes</div>
                  <div className="mt-1 text-xs text-slate-500">Activos en el sistema.</div>
                </div>
              </div>

              <div className="app-metric-card">
                <div className="app-metric-icon app-metric-icon--green">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="app-metric-value">
                    {formatPercent(
                      studentTabStudents.length
                        ? studentTabStudents.reduce((sum, s) => {
                            const avg = s.subjects.length
                              ? s.subjects.reduce((acc, subj) => acc + subj.progress, 0) / s.subjects.length
                              : 0;
                            return sum + avg;
                          }, 0) / studentTabStudents.length
                        : 0
                    )}%
                  </div>
                  <div className="app-metric-label">Progreso promedio</div>
                  <div className="mt-1 text-xs text-slate-500">En todas las materias.</div>
                </div>
              </div>

              <div className="app-metric-card">
                <div className="app-metric-icon app-metric-icon--green">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="app-metric-value">
                    {studentTabStudents.filter(s => {
                      const avg = s.subjects.length
                        ? s.subjects.reduce((acc, subj) => acc + subj.progress, 0) / s.subjects.length
                        : 0;
                      return avg >= 70;
                    }).length}
                  </div>
                  <div className="app-metric-label">Estudiantes al día</div>
                  <div className="mt-1 text-xs text-slate-500">Con 70% o más de progreso.</div>
                </div>
              </div>

              <div className="app-metric-card">
                <div className="app-metric-icon app-metric-icon--amber">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="app-metric-value">
                    {studentTabStudents.filter(s => {
                      const avg = s.subjects.length
                        ? s.subjects.reduce((acc, subj) => acc + subj.progress, 0) / s.subjects.length
                        : 0;
                      return avg < 50;
                    }).length}
                  </div>
                  <div className="app-metric-label">Estudiantes rezagados</div>
                  <div className="mt-1 text-xs text-slate-500">Por debajo del 50%.</div>
                </div>
              </div>
            </div>

            {/* Tabla detallada por estudiante */}
            <div className="app-table-card">
              <div className="app-table-card__header app-table-card__header--blue">
                <div>
                  <h3 className="app-table-card__title">Progreso detallado por estudiante</h3>
                  <p className="app-table-card__description">Avance en áreas, temas y actividades con una lectura más homogénea.</p>
                </div>
              </div>
              
              <div className="app-table-card__body">
                {studentTabStudents.map((student) => (
                  <div key={student.id} className="mb-8 last:mb-0 border-b border-gray-200 last:border-0 pb-8 last:pb-0">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#4A90E2] to-[#5B9FED] rounded-full flex items-center justify-center text-white">
                          {student.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h4 className="text-[#3A4A5B]">{student.name}</h4>
                          <p className="text-gray-500 text-sm">{student.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl text-[#3A4A5B] mb-1">
                          {formatPercent(
                            student.subjects.length
                              ? student.subjects.reduce((acc, s) => acc + s.progress, 0) / student.subjects.length
                              : 0
                          )}%
                        </div>
                        <div className="text-xs text-gray-500">Progreso general</div>
                      </div>
                    </div>

                    {/* Estadísticas por materia */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      {student.subjects.map((subject) => (
                        <div 
                          key={subject.name}
                          className="border-2 rounded-xl p-4"
                          style={{ borderColor: subject.color + '40' }}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: subject.color }}
                            />
                            <span className="text-[#3A4A5B] text-sm">{subject.name}</span>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs text-gray-600">Progreso</span>
                                <span className="text-sm text-[#3A4A5B]">{formatPercent(subject.progress)}%</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all"
                                  style={{ 
                                    width: `${normalizePercent(subject.progress)}%`,
                                    backgroundColor: subject.color
                                  }}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                              <div className="text-center">
                                <div className="text-lg text-[#3A4A5B]">{subject.contentViewed}</div>
                                <div className="text-xs text-gray-500">Contenidos</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg text-[#3A4A5B]">{subject.exercisesCompleted}</div>
                                <div className="text-xs text-gray-500">Ejercicios</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg text-[#3A4A5B]">{subject.miniprojectsSubmitted}</div>
                                <div className="text-xs text-gray-500">Proyectos</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Detalle de temas y subtemas */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="text-[#3A4A5B] text-sm mb-3">Detalle por Tema y Subtema</h5>
                      <div className="space-y-4">
                        {student.subjects.map((subject) => (
                          <div key={subject.name}>
                            {subject.topics.map((topic) => {
                              return (
                              <div key={topic.name} className="mb-4 last:mb-0">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm text-[#3A4A5B]">{topic.name}</span>
                                  <span className="text-sm text-[#3A4A5B]">{formatPercent(topic.progress)}%</span>
                                </div>
                                <div className="pl-3 space-y-2">
                                  {topic.subtopics.map((subtopic) => (
                                    <div key={subtopic.name} className="grid items-center gap-3 text-xs" style={{ gridTemplateColumns: '1fr 180px 40px' }}>
                                      <span className="text-gray-600">
                                        • {subtopic.name}
                                        {subtopic.hasContent === false ? <span className="text-red-600"> (no tiene contenido)</span> : null}
                                      </span>
                                      <div style={{ width: '180px', height: '8px', backgroundColor: '#D1D5DB', borderRadius: '9999px', overflow: 'hidden' }}>
                                          <div 
                                            style={{ 
                                              width: `${normalizePercent(subtopic.progress)}%`,
                                              height: '100%',
                                              borderRadius: '9999px',
                                              backgroundColor: subject.color || '#4A90E2'
                                            }}
                                          />
                                      </div>
                                      <span className="text-gray-500 text-right">{formatPercent(subtopic.progress)}%</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )})}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {hasAppliedFilters && activeTab === 'date' && (
          <div className="space-y-6">
            {hiddenCohortsCount > 0 && (
              <div className="app-alert app-alert--warning">
                Mostrando {dateDataVisible.length} cohortes con mayor avance. Hay {hiddenCohortsCount} cohortes adicionales ocultas para mejorar legibilidad y rendimiento.
              </div>
            )}

            {/* Resumen por fecha */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-[#3A4A5B] mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#7ED6A7]" />
                  Avance Promedio por Cohorte
                </h3>
                <p className="text-xs text-gray-500 mb-3">
                  Cohorte = grupo de estudiantes creado en la misma fecha. Esta barra muestra el promedio de avance de ese grupo.
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dateDataVisible}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="cohortLabel" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      domain={[0, 100]}
                      ticks={[0, 20, 40, 60, 80, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${formatPercent(value)}%`, 'Promedio de avance']}
                      labelFormatter={(label, payload) => {
                        if (Array.isArray(payload) && payload.length > 0) {
                          const point = payload[0]?.payload;
                          return `Cohorte ${point?.cohortLabel || label} (${point?.studentCount || 0} estudiantes)`;
                        }
                        return `Cohorte ${String(label)}`;
                      }}
                    />
                    <Bar dataKey="avgProgress" fill="#7ED6A7" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-[#3A4A5B] mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#7ED6A7]" />
                  Distribución de Estudiantes
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dateDataVisible}
                      dataKey="studentCount"
                      nameKey="cohortLabel"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.cohortLabel}: ${entry.studentCount}`}
                    >
                      {dateDataVisible.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#7ED6A7', '#4A90E2', '#F5A97F'][index % 3]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [value, 'Estudiantes']}
                      labelFormatter={(label) => `Cohorte ${String(label)}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabla por cohorte */}
            <div className="app-table-card">
              <div className="app-table-card__header app-table-card__header--green">
                <div>
                  <h3 className="app-table-card__title">Análisis por fecha de creación</h3>
                  <p className="app-table-card__description">Comparación de cohortes y detección temprana de rezago.</p>
                </div>
              </div>
              
              <div className="app-table-card__body">
                {dateDataVisible.map((dateGroup) => (
                  <div key={dateGroup.date} className="mb-8 last:mb-0 border-b border-gray-200 last:border-0 pb-8 last:pb-0">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-[#3A4A5B] text-lg">Cohorte: {dateGroup.cohortLabel}</h4>
                        <p className="text-gray-500 text-sm">{dateGroup.studentCount} estudiantes</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl text-[#3A4A5B] mb-1">{formatPercent(dateGroup.avgProgress)}%</div>
                        <div className="text-xs text-gray-500">Promedio de avance</div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="app-data-table">
                        <thead>
                          <tr>
                            <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Estudiante</th>
                            <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Gestion de Proyectos</th>
                            <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Programacion</th>
                            <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Analsis de sistemas</th>
                            <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Promedio</th>
                            <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dateGroup.students.map((student) => {
                            const avgProgress = student.subjects.length
                              ? student.subjects.reduce((acc, s) => acc + s.progress, 0) / student.subjects.length
                              : 0;
                            const isLagging = avgProgress < 50;
                            const subject0 = student.subjects[0];
                            const subject1 = student.subjects[1];
                            const subject2 = student.subjects[2];
                            
                            return (
                              <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gradient-to-br from-[#7ED6A7] to-[#8FE0B7] rounded-full flex items-center justify-center text-white text-xs">
                                      {student.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <span className="text-[#3A4A5B] text-sm">{student.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full rounded-full"
                                        style={{ 
                                          width: `${normalizePercent(subject0?.progress ?? 0)}%`,
                                          backgroundColor: '#4A90E2'
                                        }}
                                      />
                                    </div>
                                    <span className="text-sm text-gray-600">{formatPercent(subject0?.progress ?? 0)}%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full rounded-full"
                                        style={{ 
                                          width: `${normalizePercent(subject1?.progress ?? 0)}%`,
                                          backgroundColor: '#7ED6A7'
                                        }}
                                      />
                                    </div>
                                    <span className="text-sm text-gray-600">{formatPercent(subject1?.progress ?? 0)}%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full rounded-full"
                                        style={{ 
                                          width: `${normalizePercent(subject2?.progress ?? 0)}%`,
                                          backgroundColor: '#F5A97F'
                                        }}
                                      />
                                    </div>
                                    <span className="text-sm text-gray-600">{formatPercent(subject2?.progress ?? 0)}%</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-[#3A4A5B]">{formatPercent(avgProgress)}%</span>
                                </td>
                                <td className="px-4 py-3">
                                  {isLagging ? (
                                    <span className="flex items-center gap-1 text-[#F5A97F] text-sm">
                                      <XCircle className="w-4 h-4" />
                                      Rezagado
                                    </span>
                                  ) : avgProgress >= 70 ? (
                                    <span className="flex items-center gap-1 text-[#7ED6A7] text-sm">
                                      <CheckCircle2 className="w-4 h-4" />
                                      Al día
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-gray-500 text-sm">
                                      <Clock className="w-4 h-4" />
                                      Regular
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {hasAppliedFilters && activeTab === 'activity' && (
          <div className="space-y-6">
            {/* Resumen de actividades */}
            <div className="app-metric-grid">
              <div className="app-metric-card">
                <div className="app-metric-icon app-metric-icon--blue">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="app-metric-value">{activityTabStudents.reduce((sum, s) => sum + s.subjects.reduce((acc, subj) => acc + subj.contentViewed, 0), 0)}</div>
                  <div className="app-metric-label">Contenidos visualizados</div>
                  <div className="mt-1 text-xs text-slate-500">Promedio: {activityTabStudents.length ? Math.round(activityTabStudents.reduce((sum, s) => sum + s.subjects.reduce((acc, subj) => acc + subj.contentViewed, 0), 0) / activityTabStudents.length) : 0} por estudiante.</div>
                </div>
              </div>

              <div className="app-metric-card">
                <div className="app-metric-icon app-metric-icon--green">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="app-metric-value">{activityTabStudents.reduce((sum, s) => sum + s.subjects.reduce((acc, subj) => acc + subj.exercisesCompleted, 0), 0)}</div>
                  <div className="app-metric-label">Ejercicios completados</div>
                  <div className="mt-1 text-xs text-slate-500">Promedio: {activityTabStudents.length ? Math.round(activityTabStudents.reduce((sum, s) => sum + s.subjects.reduce((acc, subj) => acc + subj.exercisesCompleted, 0), 0) / activityTabStudents.length) : 0} por estudiante.</div>
                </div>
              </div>

              <div className="app-metric-card">
                <div className="app-metric-icon app-metric-icon--amber">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="app-metric-value">{activityTabStudents.reduce((sum, s) => sum + s.subjects.reduce((acc, subj) => acc + subj.miniprojectsSubmitted, 0), 0)}</div>
                  <div className="app-metric-label">Miniproyectos entregados</div>
                  <div className="mt-1 text-xs text-slate-500">Promedio: {activityTabStudents.length ? Math.round(activityTabStudents.reduce((sum, s) => sum + s.subjects.reduce((acc, subj) => acc + subj.miniprojectsSubmitted, 0), 0) / activityTabStudents.length) : 0} por estudiante.</div>
                </div>
              </div>
            </div>

            {/* Gráficas de actividades */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-[#3A4A5B] mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#F5A97F]" />
                  Distribución de Actividades
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={activityData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.value}`}
                    >
                      <Cell fill="#4A90E2" />
                      <Cell fill="#7ED6A7" />
                      <Cell fill="#F5A97F" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-[#3A4A5B] mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#F5A97F]" />
                  Progreso por Materia
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={subjectProgressData} layout="vertical" margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <YAxis type="category" dataKey="shortName" width={160} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number) => [`${formatPercent(value)}%`, 'Progreso']}
                      labelFormatter={(_, payload) => {
                        if (Array.isArray(payload) && payload.length > 0) {
                          return payload[0]?.payload?.name || 'Area';
                        }
                        return 'Area';
                      }}
                    />
                    <Bar dataKey="progress" radius={[0, 8, 8, 0]}>
                      {subjectProgressData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabla detallada de actividades por materia */}
            <div className="app-table-card">
              <div className="app-table-card__header app-table-card__header--amber">
                <div>
                  <h3 className="app-table-card__title">Desempeño detallado por actividad</h3>
                  <p className="app-table-card__description">Análisis de completitud, volumen de uso y calificación estimada.</p>
                </div>
              </div>
              
              <div className="app-table-card__body">
                {subjectProgressData.map((subject) => {
                  const subjectName = subject.name;
                  const color = subject.color;
                  const subjectAreaId = subject.areaId;

                  const findMatchingSubject = (student: StudentProgress) => {
                    const matchByAreaId = subjectAreaId
                      ? student.subjects.find((subj) => String(subj.areaId ?? '') === String(subjectAreaId))
                      : undefined;
                    return matchByAreaId || student.subjects.find((subj) => subj.name === subjectName);
                  };

                  const totalContent = activityTabStudents.reduce((sum, s) => {
                    const subj = findMatchingSubject(s);
                    return sum + (subj?.contentViewed || 0);
                  }, 0);

                  const totalExercises = activityTabStudents.reduce((sum, s) => {
                    const subj = findMatchingSubject(s);
                    return sum + (subj?.exercisesCompleted || 0);
                  }, 0);

                  const totalProjects = activityTabStudents.reduce((sum, s) => {
                    const subj = findMatchingSubject(s);
                    return sum + (subj?.miniprojectsSubmitted || 0);
                  }, 0);

                  let avgProgress = 0;
                  let count = 0;
                  activityTabStudents.forEach((s) => {
                    const subj = findMatchingSubject(s);
                    if (subj) {
                      avgProgress += subj.progress || 0;
                      count += 1;
                    }
                  });
                  avgProgress = count ? avgProgress / count : 0;

                  return (
                    <div key={subjectName} className="mb-8 last:mb-0 border-b border-gray-200 last:border-0 pb-8 last:pb-0">
                      <div className="flex items-center gap-3 mb-4">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <h4 className="text-[#3A4A5B] text-lg">{subjectName}</h4>
                      </div>

                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-sm text-gray-600 mb-1">Progreso Promedio</div>
                          <div className="flex items-center gap-2">
                            <div className="text-2xl text-[#3A4A5B]">{formatPercent(avgProgress)}%</div>
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full"
                                style={{ 
                                  width: `${avgProgress}%`,
                                  backgroundColor: color
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-sm text-gray-600 mb-1">Contenidos Visualizados</div>
                          <div className="text-2xl text-[#3A4A5B]">{totalContent}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {activityTabStudents.length ? Math.round(totalContent / activityTabStudents.length) : 0} por estudiante
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-sm text-gray-600 mb-1">Ejercicios Completados</div>
                          <div className="text-2xl text-[#3A4A5B]">{totalExercises}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {activityTabStudents.length ? Math.round(totalExercises / activityTabStudents.length) : 0} por estudiante
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-sm text-gray-600 mb-1">Miniproyectos Entregados</div>
                          <div className="text-2xl text-[#3A4A5B]">{totalProjects}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {activityTabStudents.length ? Math.round(totalProjects / activityTabStudents.length) : 0} por estudiante
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="app-data-table">
                          <thead>
                            <tr>
                              <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Estudiante</th>
                              <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Contenidos</th>
                              <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Ejercicios</th>
                              <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Miniproyectos</th>
                              <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Progreso</th>
                              <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Calificación Est.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activityTabStudents.map((student) => {
                              const subject = student.subjects.find(s => s.name === subjectName);
                              if (!subject) return null;
                              
                              const estimatedGrade = (subject.progress / 100) * 5;

                              return (
                                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-3 text-[#3A4A5B] text-sm">{student.name}</td>
                                  <td className="px-4 py-3 text-gray-600 text-sm">{subject.contentViewed}</td>
                                  <td className="px-4 py-3 text-gray-600 text-sm">{subject.exercisesCompleted}</td>
                                  <td className="px-4 py-3 text-gray-600 text-sm">{subject.miniprojectsSubmitted}</td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full rounded-full"
                                          style={{ 
                                            width: `${subject.progress}%`,
                                            backgroundColor: color
                                          }}
                                        />
                                      </div>
                                      <span className="text-sm text-gray-600">{formatPercent(subject.progress)}%</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span 
                                      className="px-3 py-1 rounded-full text-sm"
                                      style={{
                                        backgroundColor: `${color}20`,
                                        color: color
                                      }}
                                    >
                                        {formatGrade(estimatedGrade)}/5.0
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Estadísticas de tiempo */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-[#3A4A5B] mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#F5A97F]" />
                Tiempo Promedio de Resolución
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#4A90E2]/5 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-2">Ejercicios de Programación</div>
                  <div className="text-3xl text-[#4A90E2] mb-1">25 min</div>
                  <div className="text-xs text-gray-500">Tiempo promedio por ejercicio</div>
                </div>
                <div className="bg-[#7ED6A7]/5 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-2">Actividades Teóricas</div>
                  <div className="text-3xl text-[#7ED6A7] mb-1">15 min</div>
                  <div className="text-xs text-gray-500">Tiempo promedio por actividad</div>
                </div>
                <div className="bg-[#F5A97F]/5 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-2">Miniproyectos</div>
                  <div className="text-3xl text-[#F5A97F] mb-1">3.5 hrs</div>
                  <div className="text-xs text-gray-500">Tiempo promedio por proyecto</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {hasAppliedFilters && activeTab === 'failures' && (
          <div className="space-y-6">
            {failuresLoading && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center gap-3">
                  <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-gray-600">Cargando reporte de fallos...</span>
                </div>
              </div>
            )}

            {!failuresLoading && !failuresData && (
              <div className="app-empty-panel">
                No hay datos disponibles para el reporte de fallos.
              </div>
            )}

            {!failuresLoading && failuresData && (
              <>
                <div className="app-metric-grid">
                  <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-[#FEE2E2] rounded-lg flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-[#B91C1C]" />
                      </div>
                      <div>
                        <div className="text-2xl text-[#3A4A5B]">{failuresTotals.intentos}</div>
                        <div className="text-sm text-gray-600">Intentos Totales</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">Ejercicios y miniproyectos</div>
                  </div>

                  <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-[#FECACA] rounded-lg flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-[#991B1B]" />
                      </div>
                      <div>
                        <div className="text-2xl text-[#3A4A5B]">{failuresTotals.aciertos}</div>
                        <div className="text-sm text-gray-600">Aciertos Totales</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">Intentos aprobados</div>
                  </div>

                  <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-[#FCA5A5] rounded-lg flex items-center justify-center">
                        <XCircle className="w-6 h-6 text-[#991B1B]" />
                      </div>
                      <div>
                        <div className="text-2xl text-[#3A4A5B]">{failuresTotals.fallos}</div>
                        <div className="text-sm text-gray-600">Fallos Totales</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">Intentos no aprobados</div>
                  </div>

                  <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-[#FEE2E2] rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-[#B91C1C]" />
                      </div>
                      <div>
                        <div className="text-2xl text-[#3A4A5B]">{successRate}%</div>
                        <div className="text-sm text-gray-600">Tasa de Acierto</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">Aciertos / Intentos</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-[#3A4A5B] mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-[#B91C1C]" />
                      Aciertos vs Fallos
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Aciertos', value: failuresTotals.aciertos },
                            { name: 'Fallos', value: failuresTotals.fallos }
                          ]}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={110}
                          label={(entry) => `${entry.value}`}
                        >
                          <Cell fill="#FCA5A5" />
                          <Cell fill="#B91C1C" />
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {isDocenteMode ? (
                    <>
                      <div className="bg-white rounded-xl shadow-md p-6">
                        <h3 className="text-[#3A4A5B] mb-4 flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-[#DC2626]" />
                          Estudiantes con Más Fallos
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={docenteFailuresStudentChartData} layout="vertical" margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis type="number" tick={{ fontSize: 12 }} />
                            <YAxis dataKey="shortName" type="category" width={120} tick={{ fontSize: 11 }} />
                            <Tooltip
                              formatter={(value: number, dataKey: string) => {
                                if (dataKey === 'fallos') return [value, 'Fallos'];
                                if (dataKey === 'intentos') return [value, 'Intentos'];
                                return [value, dataKey];
                              }}
                              labelFormatter={(_, payload) => {
                                if (Array.isArray(payload) && payload.length > 0) {
                                  return payload[0]?.payload?.name || 'Estudiante';
                                }
                                return 'Estudiante';
                              }}
                            />
                            <Bar dataKey="fallos" fill="#F97316" radius={[0, 8, 8, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="bg-white rounded-xl shadow-md p-6">
                        <h3 className="text-[#3A4A5B] mb-4 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-[#DC2626]" />
                          Actividades con Más Fallos
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={docenteFailuresActivityChartData} layout="vertical" margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis type="number" tick={{ fontSize: 12 }} />
                            <YAxis dataKey="shortName" type="category" width={140} tick={{ fontSize: 11 }} />
                            <Tooltip
                              formatter={(value: number, dataKey: string) => {
                                if (dataKey === 'fallos') return [value, 'Fallos'];
                                if (dataKey === 'intentos') return [value, 'Intentos'];
                                return [value, dataKey];
                              }}
                              labelFormatter={(_, payload) => {
                                if (Array.isArray(payload) && payload.length > 0) {
                                  return payload[0]?.payload?.name || 'Actividad';
                                }
                                return 'Actividad';
                              }}
                            />
                            <Bar dataKey="fallos" fill="#DC2626" radius={[0, 8, 8, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-white rounded-xl shadow-md p-6">
                        <h3 className="text-[#3A4A5B] mb-4 flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-[#DC2626]" />
                          Fallos por Tipo
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Ejercicios', value: failuresByType.ejercicios.fallos },
                                { name: 'Miniproyectos', value: failuresByType.miniproyectos.fallos }
                              ]}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={110}
                              label={(entry) => `${entry.value}`}
                            >
                              <Cell fill="#DC2626" />
                              <Cell fill="#F87171" />
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="bg-white rounded-xl shadow-md p-6">
                        <h3 className="text-[#3A4A5B] mb-4 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-[#DC2626]" />
                          Fallos por Área
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={failuresAreaChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                              dataKey="shortName"
                              interval={0}
                              height={70}
                              angle={-18}
                              textAnchor="end"
                              tick={{ fontSize: 11 }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                              formatter={(value: number, dataKey: string) => {
                                if (dataKey === 'fallos') return [value, 'Fallos'];
                                if (dataKey === 'intentos') return [value, 'Intentos'];
                                return [value, dataKey];
                              }}
                              labelFormatter={(_, payload) => {
                                if (Array.isArray(payload) && payload.length > 0) {
                                  return payload[0]?.payload?.name || 'Area';
                                }
                                return 'Area';
                              }}
                            />
                            <Bar dataKey="fallos" fill="#DC2626" radius={[8, 8, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  )}
                </div>

                <div className="app-table-card">
                  <div className="app-table-card__header app-table-card__header--red">
                    <div>
                      <h3 className="app-table-card__title">Resumen de fallos por área</h3>
                      <p className="app-table-card__description">Intentos y fallos acumulados.</p>
                    </div>
                  </div>
                  <div className="app-table-card__body overflow-x-auto">
                    <table className="app-data-table text-[#111827]">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Área</th>
                          <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Intentos</th>
                          <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Aciertos</th>
                          <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Fallos</th>
                          <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Ejercicios</th>
                          <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Miniproyectos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {failuresByArea.length === 0 && (
                          <tr>
                            <td className="px-4 py-3 text-sm text-gray-500" colSpan={6}>Sin datos</td>
                          </tr>
                        )}
                        {failuresByArea.map((area) => (
                          <tr key={`${area.area_id ?? 'sin-area'}`} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-[#3A4A5B] text-sm">
                              <div className="flex items-center gap-2">
                                <span>{area.area_name || 'Sin area'}</span>
                                {Number(area.intentos || 0) === 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
                                    Sin intentos de estudiantes
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-sm">{area.intentos}</td>
                            <td className="px-4 py-3 text-gray-600 text-sm">{area.aciertos}</td>
                            <td className="px-4 py-3 text-gray-600 text-sm">{area.fallos}</td>
                            <td className="px-4 py-3 text-gray-600 text-sm">{area.ejercicios}</td>
                            <td className="px-4 py-3 text-gray-600 text-sm">{area.miniproyectos}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="app-table-card">
                  <div className="app-table-card__header app-table-card__header--red">
                    <div>
                    <h3 className="app-table-card__title">Fallos por estudiante</h3>
                    <p className="app-table-card__description">
                      {appliedFilters.student === 'all' ? 'Top 20 estudiantes con mas fallos' : 'Resumen del estudiante'}
                    </p>
                    </div>
                  </div>
                  <div className="app-table-card__body overflow-x-auto">
                    <table className="app-data-table text-[#111827]">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Estudiante</th>
                          <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Correo</th>
                          <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Intentos</th>
                          <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Aciertos</th>
                          <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Fallos</th>
                          <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Ejercicios</th>
                          <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Miniproyectos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {failuresStudentsDisplay.length === 0 && (
                          <tr>
                            <td className="px-4 py-3 text-sm text-gray-500" colSpan={7}>Sin datos</td>
                          </tr>
                        )}
                        {failuresStudentsDisplay.map((student) => (
                          <tr key={student.estudiante_id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-[#3A4A5B] text-sm">{student.nombre || `Estudiante ${student.estudiante_id}`}</td>
                            <td className="px-4 py-3 text-gray-600 text-sm">{student.email || '-'}</td>
                            <td className="px-4 py-3 text-gray-600 text-sm">{student.intentos}</td>
                            <td className="px-4 py-3 text-gray-600 text-sm">{student.aciertos}</td>
                            <td className="px-4 py-3 text-gray-600 text-sm">{student.fallos}</td>
                            <td className="px-4 py-3 text-gray-600 text-sm">{student.ejercicios}</td>
                            <td className="px-4 py-3 text-gray-600 text-sm">{student.miniproyectos}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="app-table-card">
                  <div className="app-table-card__header app-table-card__header--red">
                    <div>
                    <h3 className="app-table-card__title">Detalle de fallos por actividad</h3>
                    <p className="app-table-card__description">
                      {appliedFilters.student === 'all' ? 'Top 20 de actividades con mas fallos' : 'Actividades del estudiante'}
                    </p>
                    </div>
                  </div>
                  <div className="app-table-card__body overflow-x-auto">
                    <table className="app-data-table text-[#111827]">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Tipo</th>
                          <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Actividad</th>
                          {(!isDocenteMode || isAllStudentsFailuresView) && (
                            <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">
                              {isDocenteMode ? 'Estudiantes afectados' : 'Área'}
                            </th>
                          )}
                          <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Intentos</th>
                          <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Aciertos</th>
                          <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Fallos</th>
                          <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Aprobado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {failuresItemsDisplay.length === 0 && (
                          <tr>
                            <td className="px-4 py-3 text-sm text-gray-500" colSpan={(!isDocenteMode || isAllStudentsFailuresView) ? 7 : 6}>Sin datos</td>
                          </tr>
                        )}
                        {failuresItemsDisplay.map((item) => (
                          <tr key={`${item.tipo}-${item.actividad_id}-${item.estudiante_id}`} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-[#3A4A5B] text-sm">{item.tipo}</td>
                            <td className="px-4 py-3 text-gray-600 text-sm">{item.titulo}</td>
                            {(!isDocenteMode || isAllStudentsFailuresView) && (
                              <td className="px-4 py-3 text-gray-600 text-sm">
                                {isDocenteMode ? (item.estudiantesAfectados || 0) : (item.area_name || 'Sin area')}
                              </td>
                            )}
                            <td className="px-4 py-3 text-gray-600 text-sm">{item.intentos}</td>
                            <td className="px-4 py-3 text-gray-600 text-sm">{item.aciertos}</td>
                            <td className="px-4 py-3 text-gray-600 text-sm">{item.fallos}</td>
                            <td className="px-4 py-3">
                              {isAllStudentsFailuresView ? (
                                <span className="inline-flex items-center gap-1 text-gray-500 text-sm">Mixto</span>
                              ) : item.aprobado ? (
                                <span className="inline-flex items-center gap-1 text-[#7ED6A7] text-sm">
                                  <CheckCircle2 className="w-4 h-4" />
                                  Si
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[#F97316] text-sm">
                                  <XCircle className="w-4 h-4" />
                                  No
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
