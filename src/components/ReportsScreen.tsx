import { useState, useEffect } from 'react';
import { useArea } from '../context/AreaContext';

import { ArrowLeft, Download, Filter, X, User, Calendar, Activity, TrendingUp, Clock, CheckCircle2, XCircle, AlertCircle, BarChart3, Award, AlertTriangle, Eye } from 'lucide-react';

import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';



import axios from 'axios';

import { API_BASE_URL } from '../utils/constants';



const logoImage = new URL('../assets/image-removebg-preview (2).png', import.meta.url).href;



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

  docenteAsignaturaId?: number;

}



// Tipos de datos

interface StudentProgress {

  id: string;

  name: string;

  email: string;

  createdDate: string;

  semester?: string | number;

  codigo?: string;

  subjects: {

    asignaturaId?: string;

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

  Asignatura: string;

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



interface FailuresByAsignatura {

  asignatura_id: number | null;

  Asignatura_name: string;

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

  asignatura_id: number | null;

  Asignatura_name: string;

  intentos: number;

  fallos: number;

  aciertos: number;

  aprobado: boolean;

  estudiantesAfectados?: number;

}



interface FailuresReportData {

  totals: FailuresTotals;

  byType: FailuresByType;

  byAsignatura: FailuresByAsignatura[];

  byStudent: FailuresByStudent[];

  items: FailuresItem[];

}



interface RankingContenido {
  id: number;
  nombre: string;
  tipo: string;
  asignatura: string;
  tema: string;
  subtema: string;
  vistas: number;
}

interface RankingItem {
  id: number;
  nombre: string;
  asignatura?: string;
  tema?: string;
  vistas: number;
}

interface RankingVisualizaciones {
  contenidos: RankingContenido[];
  subtemas: RankingItem[];
  temas: RankingItem[];
  asignaturas: RankingItem[];
}

interface BasicAsignatura {

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



  const byAsignaturaMap = new Map<string, FailuresByAsignatura>();

  const byStudentMap = new Map<string, FailuresByStudent>();



  items.forEach((item) => {

    const isEjercicio = item.tipo === 'ejercicio';

    const typeTarget = isEjercicio ? byType.ejercicios : byType.miniproyectos;

    typeTarget.intentos += item.intentos || 0;

    typeTarget.fallos += item.fallos || 0;

    typeTarget.aciertos += item.aciertos || 0;



    const AsignaturaKey = item.asignatura_id === null ? 'sin-Asignatura' : String(item.asignatura_id);

    const currentAsignatura = byAsignaturaMap.get(AsignaturaKey) || {

      asignatura_id: item.asignatura_id ?? null,

      Asignatura_name: item.Asignatura_name || 'Sin Asignatura',

      intentos: 0,

      fallos: 0,

      aciertos: 0,

      ejercicios: 0,

      miniproyectos: 0

    };

    currentAsignatura.intentos += item.intentos || 0;

    currentAsignatura.fallos += item.fallos || 0;

    currentAsignatura.aciertos += item.aciertos || 0;

    if (isEjercicio) currentAsignatura.ejercicios += 1;

    else currentAsignatura.miniproyectos += 1;

    byAsignaturaMap.set(AsignaturaKey, currentAsignatura);



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

    byAsignatura: Array.from(byAsignaturaMap.values()).sort((a, b) => b.fallos - a.fallos),

    byStudent: Array.from(byStudentMap.values()).sort((a, b) => b.fallos - a.fallos),

    items

  };

};



const scopeFailuresDataByAsignatura = (data: any, asignaturaId?: number): FailuresReportData => {

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



  if (!asignaturaId) {

    return buildFailuresFromItems(sourceItems, studentMetadata);

  }



  const scopedItems = sourceItems.filter((item: FailuresItem) => Number(item.asignatura_id) === Number(asignaturaId));

  return buildFailuresFromItems(scopedItems, studentMetadata);

};



const mergeFailuresWithasignaturas = (data: FailuresReportData, asignaturas: BasicAsignatura[], scopeasignaturaId?: number): FailuresReportData => {

  const byAsignaturaMap = new Map<string, FailuresByAsignatura>();



  (Array.isArray(data.byAsignatura) ? data.byAsignatura : []).forEach((entry) => {

    if (entry?.asignatura_id === null || entry?.asignatura_id === undefined) return;

    byAsignaturaMap.set(String(entry.asignatura_id), {

      asignatura_id: entry.asignatura_id,

      Asignatura_name: entry.Asignatura_name,

      intentos: entry.intentos || 0,

      fallos: entry.fallos || 0,

      aciertos: entry.aciertos || 0,

      ejercicios: entry.ejercicios || 0,

      miniproyectos: entry.miniproyectos || 0

    });

  });



  const scopedAsignaturas = scopeasignaturaId

    ? asignaturas.filter((Asignatura) => Number(Asignatura.id) === Number(scopeasignaturaId))

    : asignaturas;



  const completedByAsignatura = scopedAsignaturas.map((Asignatura) => {

    const existing = byAsignaturaMap.get(String(Asignatura.id));

    if (existing) {

      return {

        ...existing,

        Asignatura_name: existing.Asignatura_name || Asignatura.nombre

      };

    }



    return {

      asignatura_id: Asignatura.id,

      Asignatura_name: Asignatura.nombre,

      intentos: 0,

      fallos: 0,

      aciertos: 0,

      ejercicios: 0,

      miniproyectos: 0

    };

  });



  const sortedByAsignatura = completedByAsignatura.sort((a, b) => b.fallos - a.fallos);



  return {

    ...data,

    byAsignatura: sortedByAsignatura

  };

};



export function ReportsScreen({ onBack, mode = 'admin', docenteId, docentePersonaId, docenteAsignaturaId }: ReportsScreenProps) {
  const { asignaturaId: areaContextId } = useArea();
  // En modo admin usa el área activa del contexto si no se pasó un id explícito
  const effectiveAsignaturaId = docenteAsignaturaId ?? (mode === 'admin' ? areaContextId ?? undefined : undefined);

  const isDocenteMode = mode === 'docente';

  const subjectPalette = ['#4A90E2', '#7ED6A7', '#F5A97F'];

  const [activeTab, setActiveTab] = useState<'student' | 'date' | 'activity' | 'failures' | 'content-views'>('student');

  const [showFilters, setShowFilters] = useState(true);

  const [pdfLoading, setPdfLoading] = useState(false);

  const [studentSearch, setStudentSearch] = useState('');

  const [failuresSortBy, setFailuresSortBy] = useState<'fallos' | 'intentos' | 'aciertos' | 'tasa'>('fallos');

  const [selectedActivity, setSelectedActivity] = useState<{ tipo: string; actividad_id: number; titulo: string } | null>(null);

  const [filters, setFilters] = useState<Filters>({

    contentType: 'all',

    Asignatura: 'all',

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

    Asignatura: 'all',

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

  const [asignaturasCatalog, setAsignaturasCatalog] = useState<BasicAsignatura[]>([]);

  const [loadingStudents, setLoadingStudents] = useState<boolean>(true);

  const [failuresData, setFailuresData] = useState<FailuresReportData | null>(null);

  const [failuresLoading, setFailuresLoading] = useState(false);

  const [rankingData, setRankingData] = useState<RankingVisualizaciones | null>(null);

  const [rankingLoading, setRankingLoading] = useState(false);

  const [rankingAsignaturaFilter, setRankingAsignaturaFilter] = useState<string>('all');
  const [rankingMode, setRankingMode] = useState<'top' | 'bottom'>('top');

  const [selectedAreaByStudent, setSelectedAreaByStudent] = useState<{[studentId: string]: string}>({});
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null);
  const [exportAllAsignaturas, setExportAllAsignaturas] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [studentSortOrder, setStudentSortOrder] = useState<'asc' | 'desc'>('asc');
  const [activitySubjectFilter, setActivitySubjectFilter] = useState<string>('all');
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  // Cerrar menú exportar al hacer clic fuera
  useEffect(() => {
    if (!showExportOptions) return;
    const handler = () => setShowExportOptions(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showExportOptions]);

  const [failuresPeriodo, setFailuresPeriodo] = useState<string>('all');



  const completeStudentSubjectsWithasignaturas = (rawSubjects: any[], asignaturas: BasicAsignatura[]) => {

    const sourceSubjects = Array.isArray(rawSubjects) ? rawSubjects : [];

    const normalizeSubject = (subject: any, idx: number, fallbackName?: string, fallbackasignaturaId?: string) => ({

      asignaturaId: String(subject?.asignaturaId ?? subject?.asignatura_id ?? fallbackasignaturaId ?? '') || undefined,

      name: subject?.name || subject?.nombre || fallbackName || `Asignatura ${idx + 1}`,

      color: subject?.color || subjectPalette[idx % subjectPalette.length],

      progress: Number(subject?.progress ?? 0) || 0,

      contentViewed: Number(subject?.contentViewed ?? 0) || 0,

      exercisesCompleted: Number(subject?.exercisesCompleted ?? 0) || 0,

      miniprojectsSubmitted: Number(subject?.miniprojectsSubmitted ?? 0) || 0,

      topics: Array.isArray(subject?.topics) ? subject.topics : []

    });



    if (asignaturas.length === 0) {

      return sourceSubjects.map((subject, idx) => normalizeSubject(subject, idx));

    }



    const completed = asignaturas.map((Asignatura, idx) => {

      const match = sourceSubjects.find((subject: any) => {

        const subjectasignaturaId = String(subject?.asignaturaId ?? subject?.asignatura_id ?? '');

        return subjectasignaturaId === String(Asignatura.id)

          || String(subject?.name || subject?.nombre || '').trim().toLowerCase() === Asignatura.nombre.trim().toLowerCase();

      });



      if (match) {

        return normalizeSubject(match, idx, Asignatura.nombre, String(Asignatura.id));

      }



      return {

        asignaturaId: String(Asignatura.id),

        name: Asignatura.nombre,

        color: subjectPalette[idx % subjectPalette.length],

        progress: 0,

        contentViewed: 0,

        exercisesCompleted: 0,

        miniprojectsSubmitted: 0,

        topics: []

      };

    });



    const includedasignaturaIds = new Set(completed.map((subject) => String(subject.asignaturaId ?? '')));

    const extras = sourceSubjects

      .filter((subject: any) => {

        const subjectasignaturaId = String(subject?.asignaturaId ?? subject?.asignatura_id ?? '');

        return subjectasignaturaId && !includedasignaturaIds.has(subjectasignaturaId);

      })

      .map((subject: any, idx: number) => normalizeSubject(subject, idx + asignaturas.length));



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

    if (effectiveAsignaturaId) {

      headers['x-asignatura-id'] = String(effectiveAsignaturaId);

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

        let currentasignaturasCatalog: BasicAsignatura[] = [];



        const normalizeasignaturasCatalog = (asignaturasInput: any[]): BasicAsignatura[] => asignaturasInput

          .map((Asignatura: any) => ({ id: Number(Asignatura?.id), nombre: String(Asignatura?.nombre || Asignatura?.name || '') }))

          .filter((Asignatura: BasicAsignatura) => Number.isFinite(Asignatura.id) && Asignatura.nombre.trim().length > 0);



        try {

          const asignaturasResponse = await api.get('/asignaturas', getDocenteRequestConfig());

          const normalizedAsignaturas = normalizeasignaturasCatalog(Array.isArray(asignaturasResponse.data) ? asignaturasResponse.data : []);

          if (normalizedAsignaturas.length > 0) {

            currentasignaturasCatalog = normalizedAsignaturas;

            setAsignaturasCatalog(normalizedAsignaturas);

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

            const asignaturasList = Array.isArray(resumenData.asignaturas) ? resumenData.asignaturas : [];

            const normalizedAsignaturas = normalizeasignaturasCatalog(asignaturasList);

            if (normalizedAsignaturas.length > 0) {

              currentasignaturasCatalog = normalizedAsignaturas;

              setAsignaturasCatalog(normalizedAsignaturas);

            }

            const effectiveasignaturasCatalog = normalizedAsignaturas.length > 0 ? normalizedAsignaturas : currentasignaturasCatalog;



            const normalizedStudents: StudentProgress[] = resumenData.students.map((student: any) => ({

              ...student,

              subjects: completeStudentSubjectsWithasignaturas(student.subjects || [], effectiveasignaturasCatalog)

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

              const asignaturaId = effectiveAsignaturaId ? String(effectiveAsignaturaId) : null;

              const normalizedAsignaturas = normalizeasignaturasCatalog(Array.isArray(fallbackData.asignaturas) ? fallbackData.asignaturas : []);

              if (normalizedAsignaturas.length > 0) {

                currentasignaturasCatalog = normalizedAsignaturas;

                setAsignaturasCatalog(normalizedAsignaturas);

              }

              const effectiveasignaturasCatalog = normalizedAsignaturas.length > 0 ? normalizedAsignaturas : currentasignaturasCatalog;



              const normalizedStudents: StudentProgress[] = fallbackData.students

                .map((student: any) => {

                  const subjects = completeStudentSubjectsWithasignaturas(student.subjects || [], effectiveasignaturasCatalog)

                    .filter((subject: any) => {

                      if (!asignaturaId) return true;

                      return String(subject.asignaturaId ?? '') === asignaturaId;

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



        // 1) obtener asignaturas para luego pedir progreso por asignatura por estudiante

        const asignaturasRes = await api.get('/asignaturas');

        const asignaturas = Array.isArray(asignaturasRes.data) ? asignaturasRes.data : [];

        const normalizedAsignaturas = normalizeasignaturasCatalog(asignaturas);

        currentasignaturasCatalog = normalizedAsignaturas;

        setAsignaturasCatalog(normalizedAsignaturas);




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




        if (students.length === 0) {

          // fallback a mock si no hay endpoint disponible

          setStudentsData(fallbackMockStudents);

          return;

        }



        // 3) por cada estudiante, obtener progreso por cada asignatura y construir subjects

        const studentsWithProgress: StudentProgress[] = await Promise.all(students.map(async (st: any) => {

          const subjects = await Promise.all(asignaturas.map(async (Asignatura: any, idx: number) => {

            // Obtener el resumen por asignatura (contenidos/ejercicios/miniproyectos)

            let AsignaturaResumen: any = null;

            try {

              const url = `/progresos/por-asignatura?asignatura_id=${Asignatura.id}&estudiante_id=${st.id}`;

              const res = await api.get(url);

              AsignaturaResumen = res.data;


            } catch (e) {

              AsignaturaResumen = null;

              console.warn('[Reports] sin progreso por asignatura', { estudianteId: st.id, asignaturaId: Asignatura.id, error: e });

            }



            // Obtener temas del asignatura y para cada tema obtener progreso y subtemas

            let topics: { name: string; progress: number; subtopics: { name: string; progress: number }[] }[] = [];

            try {

              const temasRes = await api.get(`/temas/por-asignatura/${Asignatura.id}`);

              const temas = Array.isArray(temasRes.data) ? temasRes.data : [];




              topics = await Promise.all(temas.map(async (tema: any) => {

                // progreso por tema

                let temaProgress = 0;

                try {

                  const temaProgRes = await api.get(`/progresos/por-tema?tema_id=${tema.id}&estudiante_id=${st.id}`);

                  // preferir porcentaje total del resumen si existe

                  temaProgress = temaProgRes.data?.resumen?.porcentajeTotalTema ?? temaProgRes.data?.progreso?.contenidos?.porcentaje ?? 0;


                } catch (e) {

                  temaProgress = 0;

                  console.warn('[Reports] sin progreso por tema', { estudianteId: st.id, temaId: tema.id, error: e });

                }



                // subtemas del tema

                let subtopics: { name: string; progress: number }[] = [];

                try {

                  const subRes = await api.get(`/subtemas/por-tema/${tema.id}`);

                  const subs = Array.isArray(subRes.data) ? subRes.data : [];


                  subtopics = await Promise.all(subs.map(async (sub: any) => {

                    let subProgress = 0;

                    try {

                      const subProgRes = await api.get(`/progresos/por-subtema?subtema_id=${sub.id}&estudiante_id=${st.id}`);

                      subProgress = subProgRes.data?.resumen?.porcentajeTotalSubtema ?? subProgRes.data?.progreso?.contenidos?.porcentaje ?? 0;


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



            const contenidos = AsignaturaResumen?.progreso?.contenidos || { total: 0, completados: 0, porcentaje: 0 };

            const ejercicios = AsignaturaResumen?.progreso?.ejercicios || { total: 0, completados: 0, porcentaje: 0 };

            const miniproyectos = AsignaturaResumen?.progreso?.miniproyectos || { total: 0, completados: 0, porcentaje: 0 };



            return {

              asignaturaId: String(Asignatura.id),

              name: Asignatura.nombre || `Asignatura ${Asignatura.id}`,

              color: ['#4A90E2', '#7ED6A7', '#F5A97F'][idx % 3],

              progress: AsignaturaResumen?.resumen?.porcentajeTotalAsignatura ?? contenidos.porcentaje ?? 0,

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

            periodo_academico: st.periodo_academico ?? st.persona?.periodo_academico ?? '',

            codigo: st.codigoEstudiantil ?? st.codigo ?? '',

            subjects

          } as StudentProgress;

        }));



        setStudentsData(studentsWithProgress);

      } catch (error) {

        console.error('Error cargando estudiantes o asignaturas:', error);

        setStudentsData(fallbackMockStudents);

      } finally {

        setLoadingStudents(false);

      }

    };



    loadStudentsAndProgress();

  }, [isDocenteMode, docenteId, docentePersonaId, effectiveAsignaturaId]);



  useEffect(() => {

    const loadFailuresReport = async () => {

      if (!hasAppliedFilters || activeTab !== 'failures') return;



      try {

        setFailuresLoading(true);

        let asignaturasCatalog: BasicAsignatura[] = [];

        try {

          const asignaturasResponse = await api.get('/asignaturas');

          const asignaturas = Array.isArray(asignaturasResponse.data) ? asignaturasResponse.data : [];

          asignaturasCatalog = asignaturas

            .map((Asignatura: any) => ({ id: Number(Asignatura?.id), nombre: String(Asignatura?.nombre || '') }))

            .filter((Asignatura: BasicAsignatura) => Number.isFinite(Asignatura.id) && Asignatura.nombre.trim().length > 0);

        } catch {

          asignaturasCatalog = [];

        }



        const params = new URLSearchParams();

        if (appliedFilters.student !== 'all') {

          params.append('estudiante_id', appliedFilters.student);

        } else {

          params.append('estudiante_id', 'all');

        }

        if (failuresPeriodo !== 'all') {

          params.append('periodo_academico', failuresPeriodo);

        }



        if (isDocenteMode) {

          try {

            const docenteResponse = await api.get(`/docente/reportes/fallos?${params.toString()}`, getDocenteRequestConfig());

            const scoped = scopeFailuresDataByAsignatura(docenteResponse.data || {}, effectiveAsignaturaId);

            const merged = mergeFailuresWithasignaturas(scoped, asignaturasCatalog, effectiveAsignaturaId);

            setFailuresData(merged);

            return;

          } catch {

            const fallbackResponse = await api.get(`/progresos/reporte-fallos?${params.toString()}`);

            const scoped = scopeFailuresDataByAsignatura(fallbackResponse.data || {}, docenteAsignaturaId);

            const merged = mergeFailuresWithasignaturas(scoped, asignaturasCatalog, docenteAsignaturaId);

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



        const merged = mergeFailuresWithasignaturas(rawData, asignaturasCatalog);

        setFailuresData(merged);

      } catch (error) {

        console.error('Error cargando reporte de fallos:', error);

        setFailuresData(null);

      } finally {

        setFailuresLoading(false);

      }

    };



    loadFailuresReport();

  }, [activeTab, hasAppliedFilters, appliedFilters.student, failuresPeriodo, isDocenteMode, docenteId, docentePersonaId, docenteAsignaturaId]);



  useEffect(() => {

    if (activeTab !== 'content-views') return;

    const loadRanking = async () => {

      try {

        setRankingLoading(true);

        const params = new URLSearchParams();

        const asignaturaIdToUse = effectiveAsignaturaId
          ? String(effectiveAsignaturaId)
          : (!isDocenteMode && rankingAsignaturaFilter !== 'all' ? rankingAsignaturaFilter : null);

        if (asignaturaIdToUse) params.append('asignatura_id', asignaturaIdToUse);

        params.append('limit', '5');
        if (rankingMode === 'bottom') params.append('order', 'asc');

        const response = await api.get(`/progresos/ranking-visualizaciones?${params.toString()}`);

        setRankingData(response.data ?? null);

      } catch (error) {

        console.error('Error cargando ranking de visualizaciones:', error);

        setRankingData(null);

      } finally {

        setRankingLoading(false);

      }

    };

    loadRanking();

  }, [activeTab, effectiveAsignaturaId, rankingAsignaturaFilter, rankingMode]);



  useEffect(() => {

    if (isDocenteMode && (activeTab === 'date' || activeTab === 'activity')) {

      setActiveTab('student');

    }

  }, [isDocenteMode, activeTab]);



  const handleStudentSelect = (studentId: string) => {

    const selected = studentsData.find(s => s.id === studentId);

    const updates: Partial<Filters> = { student: studentId };

    if (selected) {

      if (selected.semester) updates.semester = String(selected.semester);

      if (selected.codigo) setStudentSearch(selected.codigo);

    }

    setFilters(prev => ({ ...prev, ...updates }));

  };



  const clearFilters = () => {

    setStudentSearch('');

    setFailuresSortBy('fallos');

    setSelectedActivity(null);

    setFilters({

      contentType: 'all',

      Asignatura: 'all',

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

      Asignatura: 'all',

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
    if (activeTab === 'content-views' && rankingLoading) return;
    if (activeTab === 'activity') { printAsignaturaReport(); return; }
    downloadPdf(activeTab);
  };



  // Genera informe "Por asignatura" — mismo diseño que el informe por estudiante
  const printAsignaturaReport = () => {
    const fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

    const asigsFiltradas = activitySubjectFilter === 'all'
      ? subjectProgressData
      : subjectProgressData.filter(s => s.name === activitySubjectFilter);

    const tituloFiltro = activitySubjectFilter === 'all' ? 'Todas las asignaturas' : activitySubjectFilter;

    const avgGeneral = asigsFiltradas.length
      ? asigsFiltradas.reduce((sum, s) => sum + (s.progress || 0), 0) / asigsFiltradas.length : 0;

    const matchSubject = (student: StudentProgress, subj: typeof subjectProgressData[0]) => {
      if (subj.asignaturaId) {
        const byId = student.subjects.find(s => String(s.asignaturaId ?? '') === String(subj.asignaturaId));
        if (byId) return byId;
      }
      return student.subjects.find(s => s.name === subj.name);
    };

    // ── Tarjetas — idéntico al informe por estudiante ─────────────────────────
    const subjectCardsHTML = asigsFiltradas.map(subj => {
      const totalContent   = activityTabStudents.reduce((sum, st) => sum + (matchSubject(st, subj)?.contentViewed || 0), 0);
      const totalExercises = activityTabStudents.reduce((sum, st) => sum + (matchSubject(st, subj)?.exercisesCompleted || 0), 0);
      const totalProjects  = activityTabStudents.reduce((sum, st) => sum + (matchSubject(st, subj)?.miniprojectsSubmitted || 0), 0);
      const avg = subj.progress || 0;
      return `
        <div style="border:1.5px solid #bfd3f5;border-radius:8px;padding:12px;display:flex;flex-direction:column;">
          <div style="font-size:10px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:.04em;line-height:1.35;min-height:30px;">${subj.name}</div>
          <div style="margin-top:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-size:9px;color:#666;">Progreso</span>
              <span style="font-size:13px;font-weight:800;color:#111;">${Math.round(avg)}%</span>
            </div>
            <div style="height:5px;background:#e2e8f0;border-radius:999px;overflow:hidden;">
              <div style="width:${Math.min(avg,100)}%;height:100%;background:${subj.color||'#1a56db'};border-radius:999px;"></div>
            </div>
          </div>
          <div style="display:flex;margin-top:10px;">
            <div style="flex:1;text-align:center;"><div style="font-size:15px;font-weight:800;color:#111;">${totalContent}</div><div style="font-size:9px;color:#666;margin-top:2px;">Contenidos</div></div>
            <div style="flex:1;text-align:center;"><div style="font-size:15px;font-weight:800;color:#111;">${totalExercises}</div><div style="font-size:9px;color:#666;margin-top:2px;">Ejercicios</div></div>
            <div style="flex:1;text-align:center;"><div style="font-size:15px;font-weight:800;color:#111;">${totalProjects}</div><div style="font-size:9px;color:#666;margin-top:2px;">Proyectos</div></div>
          </div>
        </div>`;
    }).join('');

    // ── Secciones por asignatura con tabla de estudiantes ────────────────────
    const detailHTML = asigsFiltradas.map(subj => {
      const topicSet = new Set<string>(); const subtopicSet = new Set<string>();
      activityTabStudents.forEach(st => {
        const s = matchSubject(st, subj);
        if (s?.topics) s.topics.forEach(t => {
          topicSet.add(t.name);
          (t.subtopics||[]).forEach(st2 => subtopicSet.add(`${t.name}::${st2.name}`));
        });
      });
      const totalTemas = topicSet.size; const totalSubtemas = subtopicSet.size;
      const avg = subj.progress || 0;

      const rows = activityTabStudents.map(st => {
        const s = matchSubject(st, subj);
        if (!s) return '';
        const temasV    = s.topics ? s.topics.filter(t => t.progress > 0).length : 0;
        const subtemasV = s.topics ? s.topics.reduce((n,t) => n+(t.subtopics||[]).filter(st2=>st2.progress>0).length,0) : 0;
        const prog = Math.round(s.progress || 0);
        const barColor = subj.color || '#1a56db';
        return `<tr>
          <td style="width:11%;padding:5px 6px;font-family:monospace;font-size:9.5px;color:#64748b;word-break:break-all;">${st.codigo??'—'}</td>
          <td style="width:22%;padding:5px 6px;font-size:10px;color:#1e293b;word-break:break-word;">${st.name}</td>
          <td style="width:8%;padding:5px 6px;text-align:center;font-size:10px;font-weight:700;color:${temasV>0?'#1a56db':'#94a3b8'};">${temasV}/${totalTemas}</td>
          <td style="width:9%;padding:5px 6px;text-align:center;font-size:10px;font-weight:700;color:${subtemasV>0?'#1a56db':'#94a3b8'};">${subtemasV}/${totalSubtemas}</td>
          <td style="width:9%;padding:5px 6px;text-align:center;font-size:10px;color:#475569;">${s.contentViewed||0}</td>
          <td style="width:9%;padding:5px 6px;text-align:center;font-size:10px;color:#475569;">${s.exercisesCompleted||0}</td>
          <td style="width:11%;padding:5px 6px;text-align:center;font-size:10px;color:#475569;">${s.miniprojectsSubmitted||0}</td>
          <td style="width:21%;padding:5px 6px;">
            <div style="display:flex;align-items:center;gap:4px;">
              <div style="flex:1;height:5px;background:#e2e8f0;border-radius:999px;overflow:hidden;">
                <div style="width:${Math.min(prog,100)}%;height:100%;background:${barColor};border-radius:999px;"></div>
              </div>
              <span style="font-size:9.5px;font-weight:700;color:#1e293b;white-space:nowrap;">${prog}%</span>
            </div>
          </td>
        </tr>`;
      }).join('');

      return `
        <div style="margin-bottom:24px;page-break-inside:avoid;break-inside:avoid;">
          <div style="display:flex;align-items:center;gap:8px;padding-bottom:6px;border-bottom:1.5px solid #1a56db;margin-bottom:8px;break-after:avoid;page-break-after:avoid;">
            <span style="font-size:11px;font-weight:800;color:#1a56db;text-transform:uppercase;letter-spacing:.06em;">${subj.name}</span>
            <span style="margin-left:auto;font-size:10px;font-weight:700;color:#fff;background:#1a56db;padding:1px 8px;border-radius:999px;">${Math.round(avg)}%</span>
          </div>
          <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
            <colgroup>
              <col style="width:11%"/><col style="width:22%"/>
              <col style="width:8%"/><col style="width:9%"/>
              <col style="width:9%"/><col style="width:9%"/>
              <col style="width:11%"/><col style="width:21%"/>
            </colgroup>
            <thead>
              <tr>
                <th style="padding:8px 10px;text-align:left;font-size:8px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.05em;background:#1a56db;">Código</th>
                <th style="padding:8px 10px;text-align:left;font-size:8px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.05em;background:#1a56db;">Estudiante</th>
                <th style="padding:8px 10px;text-align:center;font-size:8px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.05em;background:#1a56db;">Temas</th>
                <th style="padding:8px 10px;text-align:center;font-size:8px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.05em;background:#1a56db;">Subtemas</th>
                <th style="padding:8px 10px;text-align:center;font-size:8px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.05em;background:#1a56db;">Cont.</th>
                <th style="padding:8px 10px;text-align:center;font-size:8px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.05em;background:#1a56db;">Ejerc.</th>
                <th style="padding:8px 10px;text-align:center;font-size:8px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.05em;background:#1a56db;">Miniproyectos</th>
                <th style="padding:8px 10px;text-align:left;font-size:8px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.05em;background:#1a56db;">Progreso</th>
              </tr>
            </thead>
            <tbody style="border-bottom:1px solid #e2e8f0;">
              ${rows||`<tr><td colspan="8" style="padding:10px;color:#94a3b8;text-align:center;font-size:10px;">Sin estudiantes</td></tr>`}
            </tbody>
          </table>
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Informe por Asignatura — EduPath</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#1e3a5f;font-size:12px;background:#fff;
         -webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .doc-wrap{width:100%;border-collapse:collapse;}
    /* thead con display:table-header-group → el navegador lo repite en CADA página al imprimir */
    .doc-head{display:table-header-group;}
    .doc-body{display:table-row-group;}
    @media print{
      @page{margin:14mm 14mm 12mm 14mm;size:A4;}
      .no-break{page-break-inside:avoid;break-inside:avoid;}
    }
  </style>
</head>
<body>
<table class="doc-wrap">

  <!-- ── Cabecera que se repite en cada página ── -->
  <thead class="doc-head">
    <tr>
      <th style="border:none;padding:0;font-weight:normal;">
        <div style="display:flex;align-items:center;justify-content:flex-end;
                    padding:7px 10px 7px 0;background:#fff;">
          <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
            <img src="${logoImage}" alt="Ingeniería de Sistemas UDES"
                 style="width:50px;height:50px;object-fit:contain;border-radius:50%;
                        border:1.5px solid #bfd3f5;background:#f0f6ff;" />
            <span style="font-size:7px;color:#64748b;text-align:center;line-height:1.3;">
              Ing. de Sistemas<br/>UDES
            </span>
          </div>
        </div>
      </th>
    </tr>
  </thead>

  <!-- ── Contenido del informe ── -->
  <tbody class="doc-body">
    <tr>
      <td style="border:none;padding:16px 14px 20px;vertical-align:top;">

        <!-- Encabezado del informe -->
        <div style="padding-bottom:14px;border-bottom:2px solid #1a56db;margin-bottom:16px;">
          <div style="font-size:18px;font-weight:800;color:#1a56db;line-height:1.2;">Informe de Desempeño por Asignatura</div>
          <div style="font-size:12px;font-weight:600;color:#1e3a5f;margin-top:3px;">${tituloFiltro}</div>
          <div style="font-size:10px;color:#64748b;margin-top:3px;">EduPath · Ingeniería de Sistemas UDES · ${fecha}</div>
          <div style="display:flex;align-items:center;gap:20px;margin-top:10px;flex-wrap:wrap;">
            <div style="font-size:12px;font-weight:600;color:#1e3a5f;">${activityTabStudents.length} estudiante(s) · ${asigsFiltradas.length} asignatura(s)</div>
            <div style="margin-left:auto;text-align:right;">
              <div style="font-size:20px;font-weight:800;color:#1a56db;">${Math.round(avgGeneral)}%</div>
              <div style="font-size:9px;color:#64748b;">Progreso promedio</div>
            </div>
          </div>
        </div>

        <!-- Tarjetas de asignaturas -->
        <div style="display:grid;grid-template-columns:repeat(${Math.min(asigsFiltradas.length,4)},1fr);gap:10px;margin-bottom:18px;align-items:stretch;">
          ${subjectCardsHTML}
        </div>

        <!-- Detalle por estudiante -->
        <div style="font-size:12px;font-weight:700;color:#1e3a5f;margin-bottom:10px;padding-bottom:4px;border-bottom:1px solid #e2e8f0;">
          Detalle por Estudiante
        </div>
        ${detailHTML}

      </td>
    </tr>
  </tbody>

</table>
</body>
</html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;visibility:hidden;';
    document.body.appendChild(iframe);
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) { document.body.removeChild(iframe); return; }
    iframeDoc.open(); iframeDoc.write(html); iframeDoc.close();
    setTimeout(() => {
      try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } catch(e) { /* ignore */ }
      setTimeout(() => { try { document.body.removeChild(iframe); } catch(e) { /* ok */ } }, 2000);
    }, 500);
    setTimeout(() => { try { document.body.removeChild(iframe); } catch(e) { /* ok */ } }, 60000);
  };

  // ── Informe "Top vistos / Menos vistos" — mismo diseño que los demás informes ──
  const printMasVistosReport = () => {
    if (!rankingData) return;

    const fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
    const isBottom = rankingMode === 'bottom';
    const filtradoPorAsignatura = isDocenteMode || rankingAsignaturaFilter !== 'all';
    const asigNombre = filtradoPorAsignatura
      ? asignaturasCatalog.find(a => String(a.id) === rankingAsignaturaFilter)?.nombre ?? 'Asignatura seleccionada'
      : 'Todas las asignaturas';
    const tituloModo = isBottom ? 'Top 5 Menos Vistos' : 'Top 5 Más Vistos';

    const COLORS = ['#7c3aed','#059669','#0891b2','#1a56db'];
    const tipoLabel: Record<string,string> = { document:'Explicación', activity:'Actividad', video:'Video', teoria:'Teoría', explicacion:'Explicación', actividad:'Actividad' };
    const badgeStyle: Record<string,string> = { video:'background:#EFF6FF;color:#1a56db', activity:'background:#F0FDF4;color:#059669', actividad:'background:#F0FDF4;color:#059669', document:'background:#FFF7ED;color:#ea580c', explicacion:'background:#FFF7ED;color:#ea580c', teoria:'background:#F5F3FF;color:#7c3aed' };
    const badge = (tipo: string) => {
      const k = tipo?.toLowerCase() ?? '';
      const st = badgeStyle[k] ?? 'background:#F3F4F6;color:#6B7280';
      return `<span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:999px;${st};white-space:nowrap;">${tipoLabel[k] ?? tipo}</span>`;
    };
    const medal = (idx: number) => isBottom
      ? idx===0?'🔴':idx===1?'🟠':idx===2?'🟡':String(idx+1)
      : idx===0?'🥇':idx===1?'🥈':idx===2?'🥉':String(idx+1);

    const buildTable = (titulo: string, color: string, headers: string[], rows: string[]) => `
      <div style="margin-bottom:24px;page-break-inside:avoid;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0 8px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;"></div>
            <span style="font-weight:700;color:#1e293b;font-size:13px;">${titulo}</span>
          </div>
          <span style="font-size:10px;color:#94a3b8;">Estudiantes que visualizaron</span>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              ${headers.map(h=>`<th style="padding:9px 12px;text-align:${h==='#'||h==='Vistas'?'center':'left'};font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap;background:#1a56db;">${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.length ? rows.join('') : `<tr><td colspan="${headers.length}" style="padding:16px;text-align:center;color:#94a3b8;font-size:12px;">Sin datos</td></tr>`}
          </tbody>
        </table>
      </div>`;

    const makeRow = (cells: string[]) => `
      <tr style="border-bottom:1px solid #f1f5f9;">
        ${cells.map(c=>`<td style="padding:10px 12px;font-size:12px;color:#475569;">${c}</td>`).join('')}
      </tr>`;

    // Orden: Asignaturas → Temas → Subtemas → Contenidos
    const tables = [
      ...(!filtradoPorAsignatura ? [buildTable(
        `${tituloModo} · Asignaturas`, COLORS[0],
        ['#','Asignatura','Vistas'],
        rankingData.asignaturas.map((it,i) => makeRow([
          `<span style="text-align:center;display:block;">${medal(i)}</span>`,
          `<strong style="color:#1e3a5f;">${it.nombre}</strong>`,
          `<span style="text-align:right;display:block;font-weight:700;color:${COLORS[0]};">${it.vistas} est.</span>`,
        ]))
      )] : []),
      buildTable(
        `${tituloModo} · Temas`, COLORS[1],
        ['#','Tema',...(!filtradoPorAsignatura?['Asignatura']:[]),'Vistas'],
        rankingData.temas.map((it,i) => makeRow([
          `<span style="text-align:center;display:block;">${medal(i)}</span>`,
          `<strong style="color:#1e3a5f;">${it.nombre}</strong>`,
          ...(!filtradoPorAsignatura?[it.asignatura]:[]),
          `<span style="text-align:right;display:block;font-weight:700;color:${COLORS[1]};">${it.vistas} est.</span>`,
        ]))
      ),
      buildTable(
        `${tituloModo} · Subtemas`, COLORS[2],
        ['#','Subtema',filtradoPorAsignatura?'Tema':'Asignatura · Tema','Vistas'],
        rankingData.subtemas.map((it,i) => makeRow([
          `<span style="text-align:center;display:block;">${medal(i)}</span>`,
          `<strong style="color:#1e3a5f;">${it.nombre}</strong>`,
          filtradoPorAsignatura ? it.tema : `${it.asignatura} · ${it.tema}`,
          `<span style="text-align:right;display:block;font-weight:700;color:${COLORS[2]};">${it.vistas} est.</span>`,
        ]))
      ),
      buildTable(
        `${tituloModo} · Contenidos`, COLORS[3],
        ['#','Contenido',filtradoPorAsignatura?'Tema · Subtema':'Asignatura · Tema · Subtema','Tipo','Vistas'],
        rankingData.contenidos.map((it,i) => makeRow([
          `<span style="text-align:center;display:block;">${medal(i)}</span>`,
          `<strong style="color:#1e3a5f;">${it.nombre}</strong>`,
          filtradoPorAsignatura ? `${it.tema} · ${it.subtema}` : `${it.asignatura} · ${it.tema} · ${it.subtema}`,
          badge(it.tipo),
          `<span style="text-align:right;display:block;font-weight:700;color:${COLORS[3]};">${it.vistas} est.</span>`,
        ]))
      ),
    ];

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${tituloModo} — EduPath</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#1e3a5f;font-size:12px;background:#fff;
         -webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .doc-wrap{width:100%;border-collapse:collapse;}
    .doc-head{display:table-header-group;}
    .doc-body{display:table-row-group;}
    @media print{@page{margin:14mm 14mm 12mm 14mm;size:A4;}}
  </style>
</head>
<body>
<table class="doc-wrap">
  <thead class="doc-head">
    <tr><th style="border:none;padding:0;font-weight:normal;">
      <div style="display:flex;align-items:center;justify-content:flex-end;padding:7px 10px 7px 0;background:#fff;">
        <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
          <img src="${logoImage}" alt="Ingeniería de Sistemas UDES"
               style="width:50px;height:50px;object-fit:contain;border-radius:50%;border:1.5px solid #bfd3f5;background:#f0f6ff;" />
          <span style="font-size:7px;color:#64748b;text-align:center;line-height:1.3;">Ing. de Sistemas<br/>UDES</span>
        </div>
      </div>
    </th></tr>
  </thead>
  <tbody class="doc-body">
    <tr><td style="border:none;padding:16px 14px 20px;vertical-align:top;">

      <!-- Encabezado — misma estructura que Por estudiante y Por asignatura -->
      <div style="padding-bottom:14px;border-bottom:2px solid #1a56db;margin-bottom:16px;">
        <div style="font-size:18px;font-weight:800;color:#1a56db;line-height:1.2;">${tituloModo}</div>
        <div style="font-size:12px;font-weight:600;color:#1e3a5f;margin-top:3px;">${asigNombre}</div>
        <div style="font-size:10px;color:#64748b;margin-top:3px;">EduPath · Ingeniería de Sistemas UDES · ${fecha}</div>
        <div style="margin-top:8px;text-align:right;">
          <div style="font-size:10px;color:#64748b;">${isBottom ? 'Contenidos con menos visualizaciones registradas' : 'Contenidos con más visualizaciones registradas'}</div>
        </div>
      </div>

      <!-- Tarjetas de resumen — mismo estilo que los demás informes -->
      ${(() => {
        const destacados = [
          { label: isBottom ? 'Contenido menos visto'  : 'Contenido más visto',  item: rankingData.contenidos[0],  color: COLORS[3], sub: rankingData.contenidos[0]  ? (filtradoPorAsignatura ? rankingData.contenidos[0].tema : rankingData.contenidos[0].asignatura)  : null },
          { label: isBottom ? 'Subtema menos visto'    : 'Subtema más visto',    item: rankingData.subtemas[0],    color: COLORS[2], sub: rankingData.subtemas[0]    ? (filtradoPorAsignatura ? rankingData.subtemas[0].tema  : rankingData.subtemas[0].asignatura)    : null },
          { label: isBottom ? 'Tema menos visto'       : 'Tema más visto',       item: rankingData.temas[0],       color: COLORS[1], sub: rankingData.temas[0]       ? (filtradoPorAsignatura ? null : rankingData.temas[0].asignatura)       : null },
          ...(!filtradoPorAsignatura ? [{ label: isBottom ? 'Asignatura menos vista' : 'Asignatura más vista', item: rankingData.asignaturas[0], color: COLORS[0], sub: null }] : []),
        ];
        const cols = destacados.length;
        return `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:10px;margin-bottom:18px;align-items:stretch;">
          ${destacados.map(d => `
            <div style="border:1.5px solid #bfd3f5;border-radius:8px;padding:12px;display:flex;flex-direction:column;">
              <div style="font-size:9px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">${d.label}</div>
              ${d.item ? `
                <div style="font-size:12px;font-weight:700;color:#1e293b;line-height:1.35;flex:1;">${d.item.nombre}</div>
                ${d.sub ? `<div style="font-size:9px;color:#94a3b8;margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${d.sub}</div>` : ''}` : `<div style="font-size:11px;color:#94a3b8;font-style:italic;flex:1;">Sin datos</div>`}
            </div>`).join('')}
        </div>`;
      })()}

      <!-- Tablas de detalle -->
      ${tables.join('')}

    </td></tr>
  </tbody>
</table>
</body>
</html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;visibility:hidden;';
    document.body.appendChild(iframe);
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) { document.body.removeChild(iframe); return; }
    iframeDoc.open(); iframeDoc.write(html); iframeDoc.close();
    setTimeout(() => {
      try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } catch(e) { /* ignore */ }
      setTimeout(() => { try { document.body.removeChild(iframe); } catch(e) { /* ok */ } }, 2000);
    }, 500);
    setTimeout(() => { try { document.body.removeChild(iframe); } catch(e) { /* ok */ } }, 60000);
  };

  // Genera PDF limpio desde los datos — sin capturar DOM con estilos de UI
  const printStudentReport = () => {
    const student = detailStudentId
      ? studentTabStudents.find(s => String(s.id) === detailStudentId)
      : studentTabStudents[0];
    if (!student) return;

    const currentStudentKey = detailStudentId || String(student.id || '');
    const selectedArea = selectedAreaByStudent[currentStudentKey];
    const isAllSubjects = exportAllAsignaturas || !selectedArea;
    const asignaturaLabel = isAllSubjects ? 'Todas las asignaturas' : selectedArea;

    const fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
    const avgGeneral = student.subjects.length
      ? student.subjects.reduce((a, s) => a + s.progress, 0) / student.subjects.length : 0;

    // Filtrar asignaturas según selección
    const subjectsToShow = student.subjects.filter(s => isAllSubjects || s.name === selectedArea);

    // Tarjetas simétricas — barra de progreso + stats sin línea divisoria
    const subjectCardsHTML = subjectsToShow.map(s => `
      <div style="border:1.5px solid #bfd3f5;border-radius:8px;padding:12px;display:flex;flex-direction:column;">
        <div style="font-size:10px;font-weight:800;color:#111;text-transform:uppercase;letter-spacing:.04em;line-height:1.35;min-height:30px;">${s.name}</div>
        <div style="margin-top:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-size:9px;color:#666;">Progreso</span>
            <span style="font-size:13px;font-weight:800;color:#111;">${Math.round(s.progress)}%</span>
          </div>
          <div style="height:5px;background:#e2e8f0;border-radius:999px;overflow:hidden;">
            <div style="width:${Math.min(s.progress,100)}%;height:100%;background:#1a56db;border-radius:999px;"></div>
          </div>
        </div>
        <div style="display:flex;margin-top:10px;">
          <div style="flex:1;text-align:center;">
            <div style="font-size:15px;font-weight:800;color:#111;">${s.contentViewed ?? 0}</div>
            <div style="font-size:9px;color:#666;margin-top:2px;">Contenidos</div>
          </div>
          <div style="flex:1;text-align:center;">
            <div style="font-size:15px;font-weight:800;color:#111;">${s.exercisesCompleted ?? 0}</div>
            <div style="font-size:9px;color:#666;margin-top:2px;">Ejercicios</div>
          </div>
          <div style="flex:1;text-align:center;">
            <div style="font-size:15px;font-weight:800;color:#111;">${s.miniprojectsDone ?? 0}</div>
            <div style="font-size:9px;color:#666;margin-top:2px;">Proyectos</div>
          </div>
        </div>
      </div>`).join('');

    // Detalle temas/subtemas por asignatura
    const detailHTML = subjectsToShow.map(s => `
      <div style="margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:8px;padding-bottom:6px;border-bottom:1.5px solid #1a56db;margin-bottom:10px;page-break-after:avoid;break-after:avoid;">
          <span style="font-size:11px;font-weight:800;color:#1a56db;text-transform:uppercase;letter-spacing:.08em;">${s.name}</span>
          <span style="font-size:10px;font-weight:700;color:#fff;background:#1a56db;padding:1px 8px;border-radius:999px;margin-left:auto;">${Math.round(s.progress)}%</span>
        </div>
        ${s.topics.map(t => `
          <div style="margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;background:#f0f5ff;border-radius:6px;margin-bottom:5px;">
              <span style="font-size:12px;font-weight:700;color:#1a56db;">${t.name}</span>
              <div style="display:flex;align-items:center;gap:6px;">
                <div style="width:80px;height:5px;background:#e2e8f0;border-radius:999px;overflow:hidden;"><div style="width:${Math.min(t.progress,100)}%;height:100%;background:#1a56db;border-radius:999px;"></div></div>
                <span style="font-size:11px;font-weight:700;color:#1a56db;width:32px;text-align:right;">${Math.round(t.progress)}%</span>
              </div>
            </div>
            ${t.subtopics.map(sub => `
              <div style="display:flex;align-items:center;gap:8px;padding:4px 10px 4px 18px;">
                <span style="font-size:11px;color:#475569;flex:1;">· ${sub.name}${sub.hasContent===false?' <span style="color:#dc2626;font-size:9px;">(sin contenido)</span>':''}</span>
                <div style="width:100px;height:4px;background:#e2e8f0;border-radius:999px;overflow:hidden;"><div style="width:${Math.min(sub.progress||0,100)}%;height:100%;background:${(sub.progress||0)>0?'#1a56db':'#e2e8f0'};border-radius:999px;"></div></div>
                <span style="font-size:10px;color:#94a3b8;width:28px;text-align:right;">${Math.round(sub.progress||0)}%</span>
              </div>`).join('')}
          </div>`).join('')}
      </div>`).join('');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Informe — ${student.name}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#1e3a5f;font-size:13px;background:#fff;
         -webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .doc-wrap{width:100%;border-collapse:collapse;}
    .doc-head{display:table-header-group;}
    .doc-body{display:table-row-group;}
    @media print{
      @page{margin:14mm 14mm 12mm 14mm;size:A4;}
      .no-break{page-break-inside:avoid;break-inside:avoid;}
    }
  </style>
</head>
<body>
<table class="doc-wrap">

  <!-- Logo que se repite en cada página -->
  <thead class="doc-head">
    <tr>
      <th style="border:none;padding:0;font-weight:normal;">
        <div style="display:flex;align-items:center;justify-content:flex-end;padding:7px 10px 7px 0;background:#fff;">
          <div style="display:flex;flex-direction:column;align-items:center;gap:3px;">
            <img src="${logoImage}" alt="Ingeniería de Sistemas UDES"
                 style="width:50px;height:50px;object-fit:contain;border-radius:50%;
                        border:1.5px solid #bfd3f5;background:#f0f6ff;" />
            <span style="font-size:7px;color:#64748b;text-align:center;line-height:1.3;">
              Ing. de Sistemas<br/>UDES
            </span>
          </div>
        </div>
      </th>
    </tr>
  </thead>

  <tbody class="doc-body">
    <tr>
      <td style="border:none;padding:16px 14px 20px;vertical-align:top;">

        <!-- Encabezado del informe -->
        <div style="padding-bottom:14px;border-bottom:2px solid #1a56db;margin-bottom:16px;">
          <div style="font-size:18px;font-weight:800;color:#1a56db;line-height:1.2;">Informe de Progreso Académico</div>
          <div style="font-size:12px;font-weight:600;color:#1e3a5f;margin-top:3px;">${isAllSubjects ? 'Todas las asignaturas' : selectedArea}</div>
          <div style="font-size:10px;color:#64748b;margin-top:3px;">EduPath · Ingeniería de Sistemas UDES · ${fecha}</div>
          <div style="display:flex;align-items:center;gap:20px;margin-top:10px;flex-wrap:wrap;">
            <div>
              <div style="font-size:13px;font-weight:700;color:#1e3a5f;">${student.name}</div>
              <div style="font-size:11px;color:#64748b;">${student.email}</div>
            </div>
            ${isAllSubjects ? `<div style="margin-left:auto;text-align:right;">
              <div style="font-size:20px;font-weight:800;color:#1a56db;">${Math.round(avgGeneral)}%</div>
              <div style="font-size:9px;color:#64748b;">Progreso general</div>
            </div>` : `<div style="margin-left:auto;text-align:right;">
              <div style="font-size:20px;font-weight:800;color:#1a56db;">${Math.round(subjectsToShow[0]?.progress || 0)}%</div>
              <div style="font-size:9px;color:#64748b;">Progreso en la asignatura</div>
            </div>`}
          </div>
        </div>

        <!-- Tarjetas resumen -->
        <div style="display:grid;grid-template-columns:repeat(${Math.min(subjectsToShow.length,4)},1fr);gap:10px;margin-bottom:18px;align-items:stretch;">
          ${subjectCardsHTML}
        </div>

        <!-- Detalle temas/subtemas -->
        <div style="font-size:12px;font-weight:700;color:#1e3a5f;margin-bottom:10px;padding-bottom:4px;border-bottom:1px solid #e2e8f0;">Detalle por Tema y Subtema</div>
        ${detailHTML}

      </td>
    </tr>
  </tbody>

</table>
</body>
</html>`;

    // Imprimir con iframe oculto — flag para evitar loop al cancelar
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;visibility:hidden;';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) { document.body.removeChild(iframe); return; }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // Usar setTimeout en lugar de load event para evitar el loop de impresión
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch(e) { /* ignorar */ }
      setTimeout(() => {
        try { document.body.removeChild(iframe); } catch(e) { /* ya removido */ }
      }, 2000);
    }, 500);

    // Fallback: nunca dejar el iframe colgado
    setTimeout(() => {
      try { document.body.removeChild(iframe); } catch(e) { /* ok */ }
    }, 60000);

  };

  const downloadPdf = async (type: 'student' | 'date' | 'activity' | 'failures' | 'content-views') => {

    if (!hasAppliedFilters && type !== 'content-views') {

      alert('Aplica los filtros antes de descargar el informe.');

      return;

    }



    try {

      setPdfLoading(true);

      const params = new URLSearchParams({ type });

      // En modo detalle de estudiante, usar el ID del estudiante actualmente visible
      const exportEstudianteId = type === 'student' && detailStudentId
        ? detailStudentId
        : appliedFilters.student !== 'all' ? appliedFilters.student : null;

      if (exportEstudianteId) {
        params.append('estudiante_id', exportEstudianteId);
      }

      // Filtrar por asignatura según selección del admin (solo si NO es "todas")
      if (type === 'student' && !exportAllAsignaturas && detailStudentId) {
        const areaSeleccionada = selectedAreaByStudent[detailStudentId];
        if (areaSeleccionada) {
          params.append('asignatura_nombre', areaSeleccionada);
        }
      }

      if (type === 'failures' && appliedFilters.student !== 'all') {

        params.append('estudiante_id', appliedFilters.student);

      }

      // Filtros del tab "Por asignatura"
      if (type === 'activity') {
        if (appliedFilters.student !== 'all') {
          params.append('estudiante_id', appliedFilters.student);
        }
        if (activitySubjectFilter !== 'all') {
          params.append('asignatura_nombre', activitySubjectFilter);
        }
      }

      if (type === 'content-views' && !isDocenteMode && rankingAsignaturaFilter !== 'all') {

        params.append('asignatura_id', rankingAsignaturaFilter);

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

      setPdfPreviewUrl(url);

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

      const periodo = student.periodo_academico || 'Sin periodo';

      if (!grouped[periodo]) {

        grouped[periodo] = [];

      }

      grouped[periodo].push(student);

    });



    return Object.entries(grouped)

      .sort(([a], [b]) => a.localeCompare(b))

      .map(([periodo, students]) => {

      const sumAvg = students.reduce((sum, s) => {

        const totalProgress = s.subjects.reduce((acc, subj) => acc + subj.progress, 0);

        const avg = s.subjects.length ? totalProgress / s.subjects.length : 0;

        return sum + avg;

      }, 0);



      const avgProgress = students.length ? sumAvg / students.length : 0;



      return {

        date: periodo,

        cohortLabel: periodo,

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

  const getSubjectProgressData = (sourceStudents: StudentProgress[], asignaturas: BasicAsignatura[]) => {

    const subjectMap = new Map<string, { name: string; color: string; asignaturaId?: string }>();

    sourceStudents.forEach(student => {

      student.subjects.forEach(subject => {

        const key = subject.asignaturaId ? `id:${String(subject.asignaturaId)}` : `name:${subject.name}`;

        if (!subjectMap.has(key)) {

          subjectMap.set(key, {

            name: subject.name,

            color: subject.color || '#4A90E2',

            asignaturaId: subject.asignaturaId ? String(subject.asignaturaId) : undefined

          });

        }

      });

    });



    const catalogSubjects = asignaturas.map((Asignatura, idx) => {

      const mapKey = `id:${String(Asignatura.id)}`;

      const existing = subjectMap.get(mapKey);



      return {

        key: mapKey,

        name: existing?.name || Asignatura.nombre,

        color: existing?.color || subjectPalette[idx % subjectPalette.length],

        asignaturaId: String(Asignatura.id)

      };

    });



    const baseSubjects = catalogSubjects.length > 0

      ? catalogSubjects

      : Array.from(subjectMap.entries()).map(([key, value]) => ({

          key,

          name: value.name,

          color: value.color,

          asignaturaId: value.asignaturaId

        }));



    return baseSubjects.map((subject) => {

      let total = 0;



      sourceStudents.forEach(student => {

        const matchByasignaturaId = subject.asignaturaId

          ? student.subjects.find((s) => String(s.asignaturaId ?? '') === subject.asignaturaId)

          : undefined;

        const matchByName = student.subjects.find((s) => s.name === subject.name);

        const matchedSubject = matchByasignaturaId || matchByName;

        total += matchedSubject?.progress || 0;

      });



      const avgProgress = sourceStudents.length ? total / sourceStudents.length : 0;



      return {

        name: subject.name,

        shortName: subject.name.length > 22 ? `${subject.name.slice(0, 22)}...` : subject.name,

        progress: avgProgress,

        color: subject.color,

        asignaturaId: subject.asignaturaId

      };

    });

  };



  const normalizedSearch = appliedSearch.trim().toLowerCase();

  const semesterOptions = Array.from(

    new Set(

      studentsData

        .map(student => (student.periodo_academico ?? '').toString().trim())

        .filter(Boolean)

    )

  ).sort((a, b) => {

    const numA = Number(a);

    const numB = Number(b);

    if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;

    return a.localeCompare(b);

  });

  const baseFilteredStudents = hasAppliedFilters ? studentsData.filter(student => {

    if (normalizedSearch && !student.name.toLowerCase().includes(normalizedSearch) && !(student.codigo ?? '').toLowerCase().includes(normalizedSearch)) return false;

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

  const subjectProgressData = getSubjectProgressData(activityTabStudents, asignaturasCatalog);

  const filteredSubjectProgressData = activitySubjectFilter === 'all'
    ? subjectProgressData
    : subjectProgressData.filter(s => s.name === activitySubjectFilter);

  const filteredActivityData = activitySubjectFilter === 'all'
    ? activityData
    : (() => {
        const counts = [
          { name: 'Contenidos Visualizados', value: 0 },
          { name: 'Ejercicios Completados', value: 0 },
          { name: 'Miniproyectos Entregados', value: 0 }
        ];
        activityTabStudents.forEach(student => {
          const subj = student.subjects.find(s => s.name === activitySubjectFilter);
          if (subj) {
            counts[0].value += subj.contentViewed;
            counts[1].value += subj.exercisesCompleted;
            counts[2].value += subj.miniprojectsSubmitted;
          }
        });
        return counts;
      })();

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

  const failuresByAsignatura = failuresData?.byAsignatura || [];

  const failuresByStudent = failuresData?.byStudent || [];

  const failuresItems = failuresData?.items || [];

  const isAllStudentsFailuresView = appliedFilters.student === 'all';



  const failuresItemsForTable: FailuresItem[] = isAllStudentsFailuresView

    ? Array.from(

        failuresItems.reduce((map, item) => {

          const key = `${item.tipo}-${item.actividad_id}-${item.asignatura_id ?? 'sin-Asignatura'}`;

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

    if (failuresSortBy === 'intentos') return b.intentos - a.intentos;

    if (failuresSortBy === 'aciertos') return b.aciertos - a.aciertos;

    if (failuresSortBy === 'tasa') {

      const tasaA = a.intentos > 0 ? a.fallos / a.intentos : 0;

      const tasaB = b.intentos > 0 ? b.fallos / b.intentos : 0;

      return tasaB - tasaA;

    }

    // default: 'fallos'

    if (b.fallos !== a.fallos) return b.fallos - a.fallos;

    return b.intentos - a.intentos;

  });

  const failuresItemsDisplay = isAllStudentsFailuresView

    ? failuresItemsSorted.slice(0, 20)

    : failuresItemsSorted;



  const failuresAsignaturaChartData = failuresByAsignatura.map((Asignatura) => ({

    name: Asignatura.Asignatura_name || 'Sin Asignatura',

    shortName: (Asignatura.Asignatura_name || 'Sin Asignatura').length > 22

      ? `${(Asignatura.Asignatura_name || 'Sin Asignatura').slice(0, 22)}...`

      : (Asignatura.Asignatura_name || 'Sin Asignatura'),

    fallos: Asignatura.fallos,

    intentos: Asignatura.intentos

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

      ? 'Comparativo por periodo académico'

      : activeTab === 'activity'

        ? 'Desempeño por asignatura'

        : activeTab === 'content-views'

          ? 'Contenidos más vistos por área'

          : 'Fallos por actividad';

  const reportViewDescription = activeTab === 'student'

    ? 'Sigue el avance individual y detecta rezagos con mayor claridad.'

    : activeTab === 'date'

      ? 'Compara el rendimiento de estudiantes por periodo académico.'

      : activeTab === 'activity'

        ? 'Concentra uso, completitud y rendimiento por actividad o asignatura.'

        : activeTab === 'content-views'

          ? 'Identifica qué contenidos generan más engagement por asignatura, tema y subtema.'

          : 'Prioriza fallos, intentos y focos de atención por estudiante y actividad.';

  const reportVisibleCount = activeTab === 'student'

    ? studentTabStudents.length

    : activeTab === 'date'

      ? dateDataVisible.length

      : activeTab === 'activity'

        ? activityTabStudents.length

        : activeTab === 'content-views'

          ? (rankingData?.contenidos.length ?? 0)

          : failuresItemsDisplay.length;

  const reportVisibleLabel = activeTab === 'date'

    ? 'Periodos visibles'

    : activeTab === 'failures'

      ? 'Registros visibles'

      : 'Estudiantes visibles';



  const nombreES: Record<string, string> = { student: 'estudiante', date: 'fecha', activity: 'asignatura', failures: 'fallos', 'content-views': 'contenidos-vistos' };

  return (

    <div className="app-shell">

      {/* ── Visor PDF nativo del navegador ── */}
      {pdfPreviewUrl && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000 }}>
          {/* Botón cerrar flotante — sin interferir con el visor nativo */}
          <button
            onClick={() => { window.URL.revokeObjectURL(pdfPreviewUrl); setPdfPreviewUrl(null); }}
            style={{ position: 'absolute', top: 12, right: 16, zIndex: 10001, background: '#1a56db', color: '#fff', border: 'none', borderRadius: '50%', width: 36, height: 36, fontSize: 18, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
            ✕
          </button>
          <iframe
            src={pdfPreviewUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Informe PDF"
          />
        </div>
      )}

      {/* Header */}
      <header className="app-header">
        <div className="app-main py-4">
          <div className="app-page-header">
            <div className="app-brand-block">
              <button type="button" onClick={onBack} className="app-brand-icon" title="Volver">
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '0.15em' }}>
                  Reportes académicos
                </p>
                <h1 className="leading-tight">Informes</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        {/* Volver + breadcrumb */}
        <button onClick={onBack} className="app-back-button mb-3">
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>
        <nav className="flex items-center gap-2 mb-6 flex-wrap" style={{ fontSize: '13px' }}>
          <button type="button" onClick={onBack} className="hover:underline" style={{ color: '#4a6fa5', fontWeight: 500 }}>
            {isDocenteMode ? 'Panel docente' : 'Panel admin'}
          </button>
          <span style={{ color: '#bfd3f5' }}>→</span>
          <span style={{ color: '#1a56db', fontWeight: 700, background: '#dbeafe', padding: '2px 10px', borderRadius: '999px' }}>
            Reportes
          </span>
        </nav>

        {/* Métricas compactas — top dashboard unificado */}
        <div className="app-metric-grid mb-6">
          {[
            { label: 'Estudiantes', value: studentsData.length, icon: User },
            { label: 'Asignaturas', value: asignaturasCatalog.length, icon: BarChart3 },
            { label: 'Avance global', value: `${formatPercent(globalAverageProgress)}%`, icon: TrendingUp },
            { label: reportVisibleLabel, value: reportVisibleCount, icon: Activity },
          ].map(m => {
            const Icon = m.icon;
            return (
              <article key={m.label} className="app-metric-card">
                <div className="app-metric-icon" style={{ background: '#dbeafe', color: '#1a56db' }}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <strong className="app-metric-value" style={{ color: '#1a56db' }}>{m.value}</strong>
                  <p className="app-metric-label">{m.label}</p>
                </div>
              </article>
            );
          })}
        </div>



        {pdfLoading && (
          <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(10,20,50,0.45)', backdropFilter: 'blur(4px)' }}>
            <div className="flex items-center gap-3 rounded-2xl px-6 py-4" style={{ background: '#fff', boxShadow: '0 8px 32px rgba(26,86,219,0.2)', border: '1.5px solid #bfd3f5' }}>
              <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#1a56db', borderTopColor: 'transparent' }} />
              <span className="text-sm font-semibold" style={{ color: '#1e3a5f' }}>Generando PDF...</span>
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



        {/* Tabs — ancho completo simétrico */}
        <div className="mb-6" style={{ display: 'grid', gridTemplateColumns: `repeat(${isDocenteMode ? 3 : 5}, 1fr)`, gap: '8px' }}>
          {[
            { key: 'student', label: 'Por estudiante', icon: User },
            ...(!isDocenteMode ? [
              { key: 'date', label: 'Por fecha', icon: Calendar },
              { key: 'activity', label: 'Por asignatura', icon: Activity },
            ] : []),
            { key: 'failures', label: 'Fallos', icon: AlertTriangle },
            { key: 'content-views', label: 'Más vistos', icon: Eye },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key as any)}
                className="flex items-center justify-center gap-2 text-sm font-semibold py-2.5 rounded-xl transition-all hover:opacity-90"
                style={{
                  background: isActive ? '#1a56db' : '#fff',
                  color: isActive ? '#fff' : '#4a6fa5',
                  border: `1.5px solid ${isActive ? '#1a56db' : '#bfd3f5'}`,
                }}>
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>



        {/* Filtros — siempre visibles, inline */}
        {activeTab !== 'content-views' && (
          <div className="mb-6">



            <div className="flex flex-wrap items-end gap-3 mb-4">

              <div style={{ flex: 1, minWidth: '160px' }}>

                <label style={{ fontSize: '12px', fontWeight: 600, color: '#1e3a5f', display: 'block', marginBottom: '4px' }}>Código o nombre</label>

                <div className="flex items-center gap-2 rounded-xl px-3" style={{ background: '#fff', border: '1.5px solid #bfd3f5', height: '40px' }}>
                  <Filter className="w-3.5 h-3.5 shrink-0" style={{ color: '#4a7ac8' }} />
                  <input type="text" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Buscar estudiante..." className="flex-1 outline-none text-sm bg-transparent" style={{ color: '#1e3a5f' }} />
                </div>
              </div>



              {/* Estado de Avance — inline */}
              {activeTab === 'student' && (
                <div style={{ minWidth: '160px', flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#1e3a5f', display: 'block', marginBottom: '4px' }}>Estado</label>
                  <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="rounded-xl px-3 text-sm font-medium outline-none w-full"
                    style={{ background: '#fff', border: '1.5px solid #bfd3f5', color: '#1e3a5f', height: '40px' }}>
                    <option value="all">Todos</option>
                    <option value="completed">Completado</option>
                    <option value="in-progress">En progreso</option>
                    <option value="not-started">No iniciado</option>
                  </select>
                </div>
              )}

              {/* Botones alineados con los inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ display: 'block', height: '20px' }} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={applyFilters}
                    style={{ height: '40px', padding: '0 20px', borderRadius: '10px', background: 'linear-gradient(135deg, #1a56db, #142d61)', color: '#fff', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Aplicar
                  </button>
                  {appliedFilterCount > 0 && (
                    <button onClick={clearFilters}
                      style={{ height: '40px', padding: '0 16px', borderRadius: '10px', border: '1.5px solid #bfd3f5', background: '#fff', color: '#1e3a5f', fontWeight: 600, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

            </div>




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






            {activeTab === 'failures' && (

              <div className="grid grid-cols-1 gap-4 mb-4">

                <div className="app-form-field">

                  <label className="app-form-label">Periodo Académico</label>

                  <select

                    value={failuresPeriodo}

                    onChange={(e) => setFailuresPeriodo(e.target.value)}

                    className="app-form-select"

                  >

                    <option value="all">Todos los periodos</option>

                    {semesterOptions.map((p) => (

                      <option key={p} value={p}>{p}</option>

                    ))}

                  </select>

                </div>

                <div className="app-form-field">

                  <label className="app-form-label">Ordenar detalle por</label>

                  <select

                    value={failuresSortBy}

                    onChange={(e) => setFailuresSortBy(e.target.value as 'fallos' | 'intentos' | 'aciertos' | 'tasa')}

                    className="app-form-select"

                  >

                    <option value="fallos">Más fallos</option>

                    <option value="intentos">Más intentos</option>

                    <option value="aciertos">Más aciertos</option>

                    <option value="tasa">Mayor tasa de fallo</option>

                  </select>

                </div>

              </div>

            )}
          </div>
        )}






        {/* Content by Tab */}

        {!hasAppliedFilters && (

          <div className="app-empty-panel">

            La información se muestra solo cuando se aplican los filtros.

          </div>

        )}



        {hasAppliedFilters && activeTab === 'student' && (
          <div className="space-y-6">




            {/* Selección / Detalle por estudiante */}

            {studentTabStudents.length === 0 ? (
              <div className="app-empty-panel py-10" style={{ color: '#4a6fa5' }}>
                No se encontraron estudiantes con esos filtros.
              </div>
            ) : studentTabStudents.length > 1 && !detailStudentId ? (
              /* Lista de selección cuando hay múltiples resultados */
              <div className="app-table-card">
                <div style={{ background: '#1a56db', padding: '14px 18px', borderRadius: '0.875rem 0.875rem 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Selecciona un estudiante</p>
                    <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px', marginTop: '2px' }}>
                      {studentTabStudents.filter(s => { const q = studentSearch.trim().toLowerCase(); return !q || s.name.toLowerCase().includes(q) || (s.codigo ?? '').toLowerCase().includes(q); }).length} resultados — ordenados por progreso {studentSortOrder === 'asc' ? '↑ menor a mayor' : '↓ mayor a menor'}
                    </p>
                  </div>
                  <button type="button"
                    onClick={() => setStudentSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                    style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', color: '#fff', cursor: 'pointer', padding: '6px 14px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {studentSortOrder === 'asc' ? '↑ Menor progreso' : '↓ Mayor progreso'}
                  </button>
                </div>
                <div className="app-table-card__body" style={{ padding: 0 }}>
                  {/* Cabecera de columnas */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '8px 18px', background: '#EFF6FF', borderBottom: '1.5px solid #1a56db' }}>
                    <div style={{ width: '36px', flexShrink: 0, marginRight: '14px' }} />
                    <div style={{ width: '130px', flexShrink: 0 }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#1a56db', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Código</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#1a56db', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Estudiante</span>
                    </div>
                    <div style={{ width: '160px', textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#1a56db', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Progreso</span>
                    </div>
                  </div>

                  {[...studentTabStudents].filter(student => {
                    const q = studentSearch.trim().toLowerCase();
                    if (!q) return true;
                    return student.name.toLowerCase().includes(q) || (student.codigo ?? '').toLowerCase().includes(q);
                  }).sort((a, b) => {
                    const avgA = a.subjects.length ? a.subjects.reduce((acc, s) => acc + s.progress, 0) / a.subjects.length : 0;
                    const avgB = b.subjects.length ? b.subjects.reduce((acc, s) => acc + s.progress, 0) / b.subjects.length : 0;
                    return studentSortOrder === 'asc' ? avgA - avgB : avgB - avgA;
                  }).map((student, idx) => {
                    const avg = student.subjects.length
                      ? student.subjects.reduce((acc, s) => acc + s.progress, 0) / student.subjects.length
                      : 0;
                    const initials = student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
                    return (
                      <button key={student.id} type="button"
                        onClick={() => setDetailStudentId(String(student.id))}
                        className="w-full text-left"
                        style={{ display: 'flex', alignItems: 'center', padding: '12px 18px',
                          borderBottom: idx < studentTabStudents.length - 1 ? '1px solid #e2e8f0' : 'none',
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          transition: 'background 0.15s', width: '100%' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f0f5ff')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        {/* Avatar */}
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1a56db', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, flexShrink: 0, marginRight: '14px' }}>
                          {initials}
                        </div>
                        {/* Código */}
                        <div style={{ width: '130px', flexShrink: 0 }}>
                          <p style={{ fontSize: '13px', fontFamily: 'monospace', color: '#3A4A5B', fontWeight: 500 }}>{student.codigo ?? '—'}</p>
                        </div>
                        {/* Nombre */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 600, fontSize: '14px', color: '#1e3a5f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.name}</p>
                          <p style={{ fontSize: '12px', color: '#94a3b8' }}>{student.email}</p>
                        </div>
                        {/* Progreso */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                          <div style={{ width: '100px', height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(avg, 100)}%`, height: '100%', background: '#1a56db', borderRadius: '999px' }} />
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#1a56db', width: '40px', textAlign: 'right' }}>{Math.round(avg)}%</span>
                          <span style={{ fontSize: '12px', color: '#bfd3f5' }}>→</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Detalle completo de UN estudiante */
              (() => {
                const visibleStudents = detailStudentId
                  ? studentTabStudents.filter(s => String(s.id) === detailStudentId)
                  : studentTabStudents;
                return (
              <div className="app-table-card" style={{ position: 'relative' }} id="student-detail-report">
                <div style={{ background: '#1a56db', padding: '14px 18px', borderRadius: '0.875rem 0.875rem 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div>
                    <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Informe detallado</p>
                    <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px', marginTop: '2px' }}>Avance en asignaturas, temas y actividades.</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Volver a la lista cuando hay detailStudentId */}
                    {detailStudentId && (
                      <button type="button" onClick={() => setDetailStudentId(null)}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Volver
                      </button>
                    )}
                    {/* Botón exportar — directo */}
                    <button type="button" onClick={() => printStudentReport()}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                      <Download className="w-3.5 h-3.5" />
                      Exportar PDF
                    </button>
                  </div>
                </div>
                <div className="app-table-card__body">
                  {visibleStudents.map((student) => (

                  <div key={student.id} className="mb-8 last:mb-0 border-b border-gray-200 last:border-0 pb-8 last:pb-0">

                    <div className="flex items-center justify-between mb-4">

                      <div className="flex items-center gap-3">

                        <div className="w-12 h-12 bg-gradient-to-br from-[#4A90E2] to-[#5B9FED] rounded-full flex items-center justify-center text-white">

                          {student.name.split(' ').map(n => n[0]).join('')}

                        </div>

                        <div id="student-report-header">

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



                    {/* Checkbox: todas las asignaturas */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569', cursor: 'pointer', fontWeight: 500 }}>
                        <input type="checkbox" checked={exportAllAsignaturas}
                          onChange={e => {
                            setExportAllAsignaturas(e.target.checked);
                            if (e.target.checked) {
                              // Limpiar selección para mostrar todas
                              setSelectedAreaByStudent(prev => ({ ...prev, [student.id]: '' }));
                            }
                          }}
                          style={{ accentColor: '#1a56db', width: '15px', height: '15px' }} />
                        Seleccionar todas las asignaturas
                      </label>
                      {!exportAllAsignaturas && selectedAreaByStudent[student.id] && (
                        <span style={{ fontSize: '11px', color: '#1a56db', background: '#dbeafe', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
                          Filtrando: {selectedAreaByStudent[student.id]}
                        </span>
                      )}
                    </div>

                    {/* Estadísticas por materia */}
                    <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>

                      {student.subjects.map((subject) => {

                        const isSelected = !exportAllAsignaturas && selectedAreaByStudent[student.id] === subject.name;

                        return (

                        <div

                          key={subject.name}

                          className="rounded-xl transition-all"

                          style={{ padding: '12px', borderWidth: '1.5px', borderStyle: 'solid',
                            borderColor: isSelected ? '#1a56db' : exportAllAsignaturas ? '#e2e8f0' : '#bfd3f5',
                            backgroundColor: isSelected ? '#f0f5ff' : 'white',
                            cursor: exportAllAsignaturas ? 'default' : 'pointer' }}

                          onClick={() => !exportAllAsignaturas && setSelectedAreaByStudent(prev => ({
                            ...prev,
                            [student.id]: isSelected ? '' : subject.name
                          }))}

                        >

                          <div className="flex items-center gap-1.5 mb-2">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e3a5f', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{subject.name}</span>
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

                        );
                      })}

                    </div>



                    {/* Detalle de temas y subtemas */}

                    <div id="student-tema-detail" style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e3a5f' }}>Detalle por Tema y Subtema</span>
                        {selectedAreaByStudent[student.id] && (
                          <span style={{ fontSize: '11px', color: '#1a56db', background: '#dbeafe', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
                            {selectedAreaByStudent[student.id]}
                          </span>
                        )}
                      </div>

                      {!selectedAreaByStudent[student.id] && !exportAllAsignaturas && (
                        <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Selecciona una asignatura o marca "todas" para ver el detalle completo.</p>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {student.subjects.filter(s => exportAllAsignaturas || !selectedAreaByStudent[student.id] || s.name === selectedAreaByStudent[student.id]).map((subject) => (
                          <div key={subject.name}>
                            {/* Header de asignatura — siempre visible para distinguir */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', paddingBottom: '8px', borderBottom: '2px solid #1a56db' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: subject.color || '#1a56db', flexShrink: 0 }} />
                              <span style={{ fontSize: '12px', fontWeight: 800, color: '#1a56db', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{subject.name}</span>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#fff', background: '#1a56db', padding: '1px 8px', borderRadius: '999px', marginLeft: 'auto' }}>{formatPercent(subject.progress)}%</span>
                            </div>
                            {subject.topics.map((topic) => (
                              <div key={topic.name} style={{ marginBottom: '12px' }}>
                                {/* Tema — barra más visible */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', padding: '8px 10px', background: '#fff', borderRadius: '8px', border: '1.5px solid #bfd3f5' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1a56db' }}>{topic.name}</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '100px', height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                                      <div style={{ width: `${normalizePercent(topic.progress)}%`, height: '100%', borderRadius: '999px', background: '#1a56db' }} />
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#1a56db', width: '36px', textAlign: 'right' }}>{formatPercent(topic.progress)}%</span>
                                  </div>
                                </div>

                                {/* Subtemas — sangría y diferenciados */}
                                <div style={{ paddingLeft: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {topic.subtopics.map((subtopic) => (
                                    <div key={subtopic.name} style={{ display: 'grid', alignItems: 'center', gap: '10px', gridTemplateColumns: '1fr 140px 36px' }}>
                                      <span style={{ fontSize: '12px', color: '#475569' }}>
                                        <span style={{ color: '#94a3b8', marginRight: '4px' }}>·</span>
                                        {subtopic.name}
                                        {subtopic.hasContent === false && <span style={{ color: '#dc2626', fontSize: '10px' }}> (sin contenido)</span>}
                                      </span>
                                      <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                                        <div style={{ width: `${normalizePercent(subtopic.progress)}%`, height: '100%', borderRadius: '999px', background: subtopic.progress > 0 ? '#1a56db' : '#e2e8f0' }} />
                                      </div>
                                      <span style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'right' }}>{formatPercent(subtopic.progress)}%</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                ))}

              </div>
            </div>
                );
              })()
            )}

          </div>

        )}



        {hasAppliedFilters && activeTab === 'date' && (

          <div className="space-y-6">

            {hiddenCohortsCount > 0 && (

              <div className="app-alert app-alert--warning">

                Mostrando {dateDataVisible.length} periodos con mayor avance. Hay {hiddenCohortsCount} periodos adicionales ocultos para mejorar legibilidad y rendimiento.

              </div>

            )}



            {/* Resumen por fecha */}

            <div className="grid grid-cols-2 gap-6">

              <div className="bg-white rounded-xl shadow-md p-6">

                <h3 className="text-[#3A4A5B] mb-4 flex items-center gap-2">

                  <Calendar className="w-5 h-5 text-[#7ED6A7]" />

                  Avance Promedio por Periodo Académico

                </h3>

                <p className="text-xs text-gray-500 mb-3">

                  Cada barra representa el promedio de avance de los estudiantes en ese periodo académico.

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

                          return `Periodo ${point?.cohortLabel || label} (${point?.studentCount || 0} estudiantes)`;

                        }

                        return `Periodo ${String(label)}`;

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

              <div style={{ background: '#1a56db', padding: '14px 18px', borderRadius: '0.875rem 0.875rem 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Análisis por fecha de creación</p>
                  <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px', marginTop: '2px' }}>Comparación de cohortes y detección temprana de rezago.</p>
                </div>
                <button onClick={() => downloadPdf('date')}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  <Download className="w-3.5 h-3.5" />
                  Exportar PDF
                </button>
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






            {/* Tabla detallada de actividades por materia */}

            <div className="app-table-card">

              <div style={{ background: '#1a56db', padding: '14px 18px', borderRadius: '0.875rem 0.875rem 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Desempeño por asignatura</p>
                  <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px', marginTop: '2px' }}>Cobertura de temas, subtemas y actividades por estudiante.</p>
                </div>
                <button onClick={() => printAsignaturaReport()}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  <Download className="w-3.5 h-3.5" />
                  Exportar PDF
                </button>
              </div>

              

              <div className="app-table-card__body">

                {/* ── Filtro de asignatura ── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', cursor: 'pointer', fontWeight: 500, userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={activitySubjectFilter === 'all'}
                      onChange={e => setActivitySubjectFilter(e.target.checked ? 'all' : (subjectProgressData[0]?.name ?? 'all'))}
                      style={{ accentColor: '#1a56db', width: 15, height: 15, cursor: 'pointer' }}
                    />
                    Seleccionar todas las asignaturas
                  </label>
                  {activitySubjectFilter !== 'all' && (
                    <span style={{
                      fontSize: 11, color: '#1a56db', background: '#dbeafe',
                      padding: '4px 12px', borderRadius: 999, fontWeight: 600,
                      maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      Filtrando: {activitySubjectFilter}
                    </span>
                  )}
                </div>

                {/* ── Grid de tarjetas — 4 columnas, clicables ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
                  {subjectProgressData.map((subject) => {
                    const subjectName = subject.name;
                    const color = subject.color;
                    const subjectasignaturaId = subject.asignaturaId;
                    const findMatch = (student: StudentProgress) => {
                      const byId = subjectasignaturaId
                        ? student.subjects.find(s => String(s.asignaturaId ?? '') === String(subjectasignaturaId))
                        : undefined;
                      return byId || student.subjects.find(s => s.name === subjectName);
                    };
                    const totalContent  = activityTabStudents.reduce((sum, s) => sum + (findMatch(s)?.contentViewed       || 0), 0);
                    const totalExercises= activityTabStudents.reduce((sum, s) => sum + (findMatch(s)?.exercisesCompleted  || 0), 0);
                    const totalProjects = activityTabStudents.reduce((sum, s) => sum + (findMatch(s)?.miniprojectsSubmitted|| 0), 0);
                    let avgProg = 0, cnt = 0;
                    activityTabStudents.forEach(s => { const subj = findMatch(s); if (subj) { avgProg += subj.progress || 0; cnt++; } });
                    avgProg = cnt ? avgProg / cnt : 0;
                    const isSelected = activitySubjectFilter === subjectName;

                    return (
                      <div key={subjectName}
                        onClick={() => setActivitySubjectFilter(isSelected ? 'all' : subjectName)}
                        style={{
                          background: '#ffffff',
                          border: isSelected ? '2px solid #1a56db' : '1.5px solid #e2e8f0',
                          borderRadius: 14,
                          padding: '18px 16px 16px',
                          cursor: 'pointer',
                          boxShadow: isSelected
                            ? '0 0 0 3px rgba(26,86,219,0.10)'
                            : '0 1px 3px rgba(0,0,0,0.06)',
                          transition: 'border-color 0.15s, box-shadow 0.15s',
                          display: 'flex',
                          flexDirection: 'column',
                        }}>

                        {/* Nombre — minHeight fija la simetría vertical */}
                        <div style={{
                          fontWeight: 700,
                          color: '#1e293b',
                          fontSize: 13,
                          lineHeight: 1.4,
                          minHeight: 54,        /* espacio para hasta 3 líneas */
                          marginBottom: 10,
                        }}>
                          {subjectName}
                        </div>

                        {/* Progreso */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                          <span style={{ fontSize: 12, color: '#64748b' }}>Progreso</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{formatPercent(avgProg)}%</span>
                        </div>
                        <div style={{ height: 7, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden', marginBottom: 18 }}>
                          <div style={{ height: 7, width: `${avgProg}%`, background: color, borderRadius: 999 }} />
                        </div>

                        {/* Contadores */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', textAlign: 'center' }}>
                          {[
                            { label: 'Contenidos', value: totalContent  },
                            { label: 'Ejercicios',  value: totalExercises},
                            { label: 'Proyectos',   value: totalProjects },
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>{value}</div>
                              <div style={{ fontSize: 11, color: '#1a56db', fontWeight: 500, marginTop: 5 }}>{label}</div>
                            </div>
                          ))}
                        </div>

                      </div>
                    );
                  })}
                </div>

                {/* ── Gráficas — se filtran según selección ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
                  <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                    <h3 style={{ color: '#3A4A5B', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
                      <BarChart3 style={{ width: 18, height: 18, color: '#F5A97F' }} />
                      Distribución de Actividades
                    </h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                        <Pie
                          data={filteredActivityData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="44%"
                          outerRadius={88}
                          innerRadius={0}
                          label={({ cx, cy, midAngle, outerRadius: or, value }) => {
                            if (!value) return null;
                            const RADIAN = Math.PI / 180;
                            const r = or + 18;
                            const x = cx + r * Math.cos(-midAngle * RADIAN);
                            const y = cy + r * Math.sin(-midAngle * RADIAN);
                            return (
                              <text x={x} y={y} fill="#374151" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
                                {value}
                              </text>
                            );
                          }}
                          labelLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
                        >
                          <Cell fill="#4A90E2" />
                          <Cell fill="#7ED6A7" />
                          <Cell fill="#F5A97F" />
                        </Pie>
                        <Tooltip formatter={(v: number, name: string) => [v, name]} />
                        <Legend verticalAlign="bottom" height={52} wrapperStyle={{ paddingTop: 14, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                    <h3 style={{ color: '#3A4A5B', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
                      <TrendingUp style={{ width: 18, height: 18, color: '#F5A97F' }} />
                      Progreso por Materia
                    </h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={filteredSubjectProgressData} layout="vertical" margin={{ top: 8, right: 32, left: 24, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 11 }}
                          domain={[0, 100]}
                          ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                          tickFormatter={(v) => `${v}`}
                        />
                        <YAxis type="category" dataKey="shortName" width={160} tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(value: number) => [`${formatPercent(value)}%`, 'Progreso']}
                          labelFormatter={(_, payload) => Array.isArray(payload) && payload.length > 0 ? payload[0]?.payload?.name || 'Asignatura' : 'Asignatura'}
                        />
                        <Bar dataKey="progress" radius={[0, 8, 8, 0]}>
                          {filteredSubjectProgressData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* ── Tablas detalladas — solo asignaturas filtradas ── */}
                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
                  {subjectProgressData
                    .filter(s => activitySubjectFilter === 'all' || s.name === activitySubjectFilter)
                    .map((subject) => {
                      const subjectName = subject.name;
                      const color = subject.color;
                      const subjectasignaturaId = subject.asignaturaId;
                      const findMatchingSubject = (student: StudentProgress) => {
                        const byId = subjectasignaturaId
                          ? student.subjects.find(s => String(s.asignaturaId ?? '') === String(subjectasignaturaId))
                          : undefined;
                        return byId || student.subjects.find(s => s.name === subjectName);
                      };
                      const topicNames = new Set<string>();
                      const subtopicKeys = new Set<string>();
                      activityTabStudents.forEach(s => {
                        const subj = findMatchingSubject(s);
                        if (subj) {
                          subj.topics.forEach(t => {
                            topicNames.add(t.name);
                            t.subtopics.forEach(st => subtopicKeys.add(`${t.name}::${st.name}`));
                          });
                        }
                      });
                      const totalTemasCount = topicNames.size;
                      const totalSubtemasCount = subtopicKeys.size;
                      return (
                        <div key={subjectName} className="mb-8 last:mb-0 border-b border-gray-200 last:border-0 pb-8 last:pb-0">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color }} />
                            <span style={{ fontWeight: 700, color: '#3A4A5B', fontSize: 14 }}>{subjectName}</span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="app-data-table">
                              <thead>
                                <tr>
                                  <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Código</th>
                                  <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Estudiante</th>
                                  <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Temas</th>
                                  <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Subtemas</th>
                                  <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Contenidos</th>
                                  <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Ejercicios</th>
                                  <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Miniproyectos</th>
                                  <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Progreso</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activityTabStudents.map((student) => {
                                  const subj = findMatchingSubject(student);
                                  if (!subj) return null;
                                  const temasVistos = subj.topics.filter(t => t.progress > 0).length;
                                  const subtemasVistos = subj.topics.reduce((sum, t) => sum + t.subtopics.filter(st => st.progress > 0).length, 0);
                                  return (
                                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-4 py-3 text-gray-500 text-sm font-mono">{student.codigo ?? '—'}</td>
                                      <td className="px-4 py-3 text-[#3A4A5B] text-sm">{student.name}</td>
                                      <td className="px-4 py-3 text-sm">
                                        <span style={{ fontWeight: 600, color: temasVistos > 0 ? '#1a56db' : '#9ca3af' }}>
                                          {temasVistos}/{totalTemasCount}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-sm">
                                        <span style={{ fontWeight: 600, color: subtemasVistos > 0 ? '#1a56db' : '#9ca3af' }}>
                                          {subtemasVistos}/{totalSubtemasCount}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-gray-600 text-sm">{subj.contentViewed}</td>
                                      <td className="px-4 py-3 text-gray-600 text-sm">{subj.exercisesCompleted}</td>
                                      <td className="px-4 py-3 text-gray-600 text-sm">{subj.miniprojectsSubmitted}</td>
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full" style={{ width: `${subj.progress}%`, backgroundColor: color }} />
                                          </div>
                                          <span className="text-sm text-gray-600">{formatPercent(subj.progress)}%</span>
                                        </div>
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

                          {isAllStudentsFailuresView ? 'Estudiantes con Más Fallos' : 'Fallos por Tipo'}

                        </h3>

                        {isAllStudentsFailuresView ? (

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

                        ) : (

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

                        )}

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

                          Fallos por Asignatura

                        </h3>

                        <ResponsiveContainer width="100%" height={300}>

                          <BarChart data={failuresAsignaturaChartData}>

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

                                  return payload[0]?.payload?.name || 'Asignatura';

                                }

                                return 'Asignatura';

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

                  <div style={{ background: '#1a56db', padding: '14px 18px', borderRadius: '0.875rem 0.875rem 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Fallos por actividad</p>
                      <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px', marginTop: '2px' }}>Intentos, fallos y tasa de error acumulados.</p>
                    </div>
                    <button onClick={() => downloadPdf('failures')}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                      <Download className="w-3.5 h-3.5" />
                      Exportar PDF
                    </button>
                  </div>

                  <div className="app-table-card__body overflow-x-auto">

                    <table className="app-data-table text-[#111827]">

                      <thead>

                        <tr>

                          <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Asignatura</th>

                          <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Intentos</th>

                          <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Aciertos</th>

                          <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Fallos</th>

                          <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Ejercicios</th>

                          <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Miniproyectos</th>

                        </tr>

                      </thead>

                      <tbody>

                        {failuresByAsignatura.length === 0 && (

                          <tr>

                            <td className="px-4 py-3 text-sm text-gray-500" colSpan={6}>Sin datos</td>

                          </tr>

                        )}

                        {failuresByAsignatura.map((Asignatura) => (

                          <tr key={`${Asignatura.asignatura_id ?? 'sin-Asignatura'}`} className="hover:bg-gray-50 transition-colors">

                            <td className="px-4 py-3 text-[#3A4A5B] text-sm">

                              <div className="flex items-center gap-2">

                                <span>{Asignatura.Asignatura_name || 'Sin Asignatura'}</span>

                                {Number(Asignatura.intentos || 0) === 0 && (

                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">

                                    Sin intentos de estudiantes

                                  </span>

                                )}

                              </div>

                            </td>

                            <td className="px-4 py-3 text-gray-600 text-sm">{Asignatura.intentos}</td>

                            <td className="px-4 py-3 text-gray-600 text-sm">{Asignatura.aciertos}</td>

                            <td className="px-4 py-3 text-gray-600 text-sm">{Asignatura.fallos}</td>

                            <td className="px-4 py-3 text-gray-600 text-sm">{Asignatura.ejercicios}</td>

                            <td className="px-4 py-3 text-gray-600 text-sm">{Asignatura.miniproyectos}</td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                  </div>

                </div>



                {isAllStudentsFailuresView && (

                <div className="app-table-card">

                  <div style={{ background: '#1a56db', padding: '14px 18px', borderRadius: '0.875rem 0.875rem 0 0' }}>

                    <div>

                    <h3 className="app-table-card__title">Fallos por estudiante</h3>

                    <p className="app-table-card__description">Top 20 estudiantes con mas fallos</p>

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

                )}



                <div className="app-table-card">

                  <div style={{ background: '#1a56db', padding: '14px 18px', borderRadius: '0.875rem 0.875rem 0 0' }}>

                    <div>

                    <h3 className="app-table-card__title">Detalle de fallos por actividad</h3>

                    <p className="app-table-card__description">

                      {appliedFilters.student === 'all' ? 'Top 20 de actividades con mas fallos. Haz clic en una fila para ver los estudiantes.' : 'Actividades del estudiante'}

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

                              {isDocenteMode ? 'Estudiantes afectados' : 'Asignatura'}

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

                        {failuresItemsDisplay.map((item, idx) => {

                          const isSelected = isAllStudentsFailuresView &&

                            selectedActivity?.tipo === item.tipo &&

                            selectedActivity?.actividad_id === item.actividad_id;

                          return (

                          <tr

                            key={`${item.tipo}-${item.actividad_id}-${item.estudiante_id}-${idx}`}

                            className={`transition-colors ${isAllStudentsFailuresView ? 'cursor-pointer' : ''} ${isSelected ? 'bg-red-50' : 'hover:bg-gray-50'}`}

                            onClick={() => {

                              if (!isAllStudentsFailuresView) return;

                              setSelectedActivity(isSelected ? null : { tipo: item.tipo, actividad_id: item.actividad_id, titulo: item.titulo });

                            }}

                          >

                            <td className="px-4 py-3 text-[#3A4A5B] text-sm">{item.tipo}</td>

                            <td className="px-4 py-3 text-gray-600 text-sm">

                              <div className="flex items-center gap-2">

                                {item.titulo}

                                {isSelected && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">Seleccionada</span>}

                              </div>

                            </td>

                            {(!isDocenteMode || isAllStudentsFailuresView) && (

                              <td className="px-4 py-3 text-gray-600 text-sm">

                                {isDocenteMode ? (item.estudiantesAfectados || 0) : (item.Asignatura_name || 'Sin Asignatura')}

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

                          );

                        })}

                      </tbody>

                    </table>

                  </div>

                </div>



                {isAllStudentsFailuresView && selectedActivity && (() => {

                  const studentMap = new Map(failuresByStudent.map(s => [String(s.estudiante_id), s]));

                  const activityStudents = failuresItems

                    .filter(i => i.tipo === selectedActivity.tipo && i.actividad_id === selectedActivity.actividad_id)

                    .sort((a, b) => b.fallos - a.fallos);

                  return (

                    <div className="app-table-card border-2 border-red-200">

                      <div style={{ background: '#1a56db', padding: '14px 18px', borderRadius: '0.875rem 0.875rem 0 0' }}>

                        <div>

                          <h3 className="app-table-card__title">Estudiantes en: {selectedActivity.titulo}</h3>

                          <p className="app-table-card__description">{activityStudents.length} estudiante(s) con intentos registrados</p>

                        </div>

                        <button

                          className="app-btn app-btn-secondary app-btn-sm"

                          onClick={() => setSelectedActivity(null)}

                        >

                          <X className="w-4 h-4" />

                        </button>

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

                              <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Aprobado</th>

                            </tr>

                          </thead>

                          <tbody>

                            {activityStudents.length === 0 && (

                              <tr>

                                <td className="px-4 py-3 text-sm text-gray-500" colSpan={6}>Sin datos</td>

                              </tr>

                            )}

                            {activityStudents.map((item) => {

                              const meta = studentMap.get(String(item.estudiante_id));

                              return (

                                <tr key={item.estudiante_id} className="hover:bg-gray-50 transition-colors">

                                  <td className="px-4 py-3 text-[#3A4A5B] text-sm">{meta?.nombre || `Estudiante ${item.estudiante_id}`}</td>

                                  <td className="px-4 py-3 text-gray-600 text-sm">{meta?.email || '-'}</td>

                                  <td className="px-4 py-3 text-gray-600 text-sm">{item.intentos}</td>

                                  <td className="px-4 py-3 text-gray-600 text-sm">{item.aciertos}</td>

                                  <td className="px-4 py-3 text-gray-600 text-sm">{item.fallos}</td>

                                  <td className="px-4 py-3">

                                    {item.aprobado ? (

                                      <span className="inline-flex items-center gap-1 text-[#7ED6A7] text-sm">

                                        <CheckCircle2 className="w-4 h-4" />

                                        Sí

                                      </span>

                                    ) : (

                                      <span className="inline-flex items-center gap-1 text-[#F97316] text-sm">

                                        <XCircle className="w-4 h-4" />

                                        No

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

                  );

                })()}

              </>

            )}

          </div>

        )}

        {/* Tab 5: Contenidos más vistos */}
        {activeTab === 'content-views' && (
          <div className="space-y-6">
            {/* Header con toggle + exportar */}
            <div className="app-table-card">
              <div style={{ background: '#1a56db', padding: '14px 18px', borderRadius: '0.875rem 0.875rem 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Contenidos más vistos</p>
                  <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '12px', marginTop: '2px' }}>
                    Ranking de visualizaciones por contenido, subtema, tema y asignatura.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Botón flip único — top / bottom */}
                  <button
                    onClick={() => setRankingMode(m => m === 'top' ? 'bottom' : 'top')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 14px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.18)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.4)',
                      cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      transition: 'background 0.2s, border-color 0.2s',
                    }}>
                    <span style={{ transition: 'transform 0.3s', display: 'inline-block', transform: rankingMode === 'bottom' ? 'rotate(180deg)' : 'rotate(0deg)' }}>↑</span>
                    {rankingMode === 'top' ? 'Top 5 más vistos' : 'Top 5 menos vistos'}
                  </button>
                  <button onClick={() => printMasVistosReport()}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                    <Download className="w-3.5 h-3.5" />
                    Exportar PDF
                  </button>
                </div>
              </div>

            </div>

            {/* ── Tarjetas de asignatura — filtro visual ── */}
            {!isDocenteMode && (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(asignaturasCatalog.length + 1, 5)}, 1fr)`, gap: 12 }}>
                {/* Tarjeta "Todas" */}
                {(() => {
                  const active = rankingAsignaturaFilter === 'all';
                  return (
                    <div onClick={() => setRankingAsignaturaFilter('all')} style={{
                      background: '#fff', border: active ? '2px solid #1a56db' : '1.5px solid #e2e8f0',
                      borderRadius: 14, padding: '14px 16px', cursor: 'pointer',
                      boxShadow: active ? '0 0 0 3px rgba(26,86,219,0.10)' : '0 1px 3px rgba(0,0,0,0.06)',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}>
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 13, marginBottom: 10, minHeight: 36 }}>Todas las asignaturas</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                        <span>Asignaturas</span><span style={{ fontWeight: 700, color: '#1a56db' }}>{asignaturasCatalog.length}</span>
                      </div>
                    </div>
                  );
                })()}
                {/* Tarjeta por asignatura */}
                {asignaturasCatalog.map((a, idx) => {
                  const active = rankingAsignaturaFilter === String(a.id);
                  const subjectColors = ['#4A90E2','#7ED6A7','#F5A97F','#A78BFA'];
                  const color = subjectColors[idx % subjectColors.length];
                  return (
                    <div key={a.id} onClick={() => setRankingAsignaturaFilter(String(a.id))} style={{
                      background: '#fff', border: active ? `2px solid #1a56db` : '1.5px solid #e2e8f0',
                      borderRadius: 14, padding: '14px 16px', cursor: 'pointer',
                      boxShadow: active ? '0 0 0 3px rgba(26,86,219,0.10)' : '0 1px 3px rgba(0,0,0,0.06)',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}>
                      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 12, lineHeight: 1.35, minHeight: 36, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{a.nombre}</div>
                      <div style={{ height: 5, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden', marginTop: 8 }}>
                        <div style={{ height: 5, width: active ? '100%' : '0%', background: color, borderRadius: 999, transition: 'width 0.3s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {rankingLoading && (
              <div className="app-table-card p-10 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-[#3A4A5B]">
                  <div className="w-8 h-8 border-2 border-[#1a56db] border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Cargando ranking...</span>
                </div>
              </div>
            )}

            {!rankingLoading && !rankingData && (
              <div className="app-table-card flex flex-col items-center justify-center py-16 gap-3 text-[#3A4A5B]">
                <Eye className="w-12 h-12 opacity-30" />
                <p className="text-sm">No hay datos de visualización registrados aún.</p>
              </div>
            )}


            {!rankingLoading && rankingData && (() => {
              const isBottom = rankingMode === 'bottom';
              const filtradoPorAsignatura = isDocenteMode || rankingAsignaturaFilter !== 'all';
              const pfx = isBottom ? 'Menos vistos' : 'Top 5';
              const COLORS = ['#1a56db','#0891b2','#059669','#7c3aed'];
              const tipoLabel: Record<string,string> = { document:'Explicación', activity:'Actividad', video:'Video', teoria:'Teoría', explicacion:'Explicación', actividad:'Actividad' };
              const badgeColors: Record<string,{bg:string;text:string}> = { video:{bg:'#EFF6FF',text:'#1a56db'}, activity:{bg:'#F0FDF4',text:'#059669'}, actividad:{bg:'#F0FDF4',text:'#059669'}, document:{bg:'#FFF7ED',text:'#ea580c'}, explicacion:{bg:'#FFF7ED',text:'#ea580c'}, teoria:{bg:'#F5F3FF',text:'#7c3aed'} };
              const getBadge = (tipo: string) => {
                const key = tipo?.toLowerCase() ?? '';
                const s = badgeColors[key] ?? {bg:'#F3F4F6',text:'#6B7280'};
                const label = tipoLabel[key] ?? tipo;
                return <span style={{fontSize:10,fontWeight:600,padding:'2px 10px',borderRadius:999,background:s.bg,color:s.text,whiteSpace:'nowrap'}}>{label}</span>;
              };
              const hoverBg = ['#EFF6FF','#ECFEFF','#F0FDF4','#FAF5FF'];
              // Iconos para top (medallas) vs bottom (alertas inversas)
              const topIcon    = (idx: number) => idx===0?'🥇':idx===1?'🥈':idx===2?'🥉':<span style={{fontSize:11,color:'#94a3b8',fontWeight:500}}>{idx+1}</span>;
              const bottomIcon = (idx: number) => idx===0
                ? <span title="Menos visto" style={{fontSize:15}}>🔴</span>
                : idx===1 ? <span title="2° menos visto" style={{fontSize:15}}>🟠</span>
                : idx===2 ? <span title="3° menos visto" style={{fontSize:15}}>🟡</span>
                : <span style={{fontSize:11,color:'#94a3b8',fontWeight:500}}>{idx+1}</span>;

              const makeTr = (it: any, idx: number, color: string, hbg: string, cells: React.ReactNode[]) => (
                <tr key={it.id} style={{background:'#fff',transition:'background 0.15s',borderBottom:'1px solid #f1f5f9'}}
                  onMouseEnter={e=>(e.currentTarget.style.background=hbg)} onMouseLeave={e=>(e.currentTarget.style.background='#fff')}>
                  <td style={{padding:'13px 16px',textAlign:'center',fontSize:13,color:'#94a3b8',fontWeight:500,width:42}}>
                    {isBottom ? bottomIcon(idx) : topIcon(idx)}
                  </td>
                  {cells}
                  <td style={{padding:'13px 16px',textAlign:'right',whiteSpace:'nowrap'}}>
                    <span style={{display:'inline-flex',alignItems:'center',gap:5,fontWeight:700,color,fontSize:14}}>
                      <Eye className="w-3.5 h-3.5" style={{opacity:0.5}}/>
                      {it.vistas}
                      <span style={{fontSize:10,fontWeight:400,color:'#94a3b8'}}>est.</span>
                    </span>
                  </td>
                </tr>
              );
              // Orden: Asignaturas → Temas → Subtemas → Contenidos
              const categories = [
                ...(!filtradoPorAsignatura?[{ titulo:`${pfx} · Asignaturas`, color:COLORS[3], hbg:hoverBg[3], items:rankingData.asignaturas,
                  headers:['#','Asignatura','Vistas'],
                  rows:(it:any,idx:number)=>makeTr(it,idx,COLORS[3],hoverBg[3],[<td key="n" style={{padding:'13px 16px',fontSize:13,fontWeight:600,color:'#1e3a5f'}}>{it.nombre}</td>]),
                }]:[]),
                { titulo:`${pfx} · Temas`, color:COLORS[2], hbg:hoverBg[2], items:rankingData.temas,
                  headers:['#','Tema',...(!filtradoPorAsignatura?['Asignatura']:[]),'Vistas'],
                  rows:(it:any,idx:number)=>makeTr(it,idx,COLORS[2],hoverBg[2],[
                    <td key="n" style={{padding:'13px 16px',fontSize:13,fontWeight:600,color:'#1e3a5f'}}>{it.nombre}</td>,
                    ...(!filtradoPorAsignatura?[<td key="a" style={{padding:'13px 16px',fontSize:12,color:'#64748b'}}>{it.asignatura}</td>]:[]),
                  ])},
                { titulo:`${pfx} · Subtemas`, color:COLORS[1], hbg:hoverBg[1], items:rankingData.subtemas,
                  headers:['#','Subtema', filtradoPorAsignatura?'Tema':'Asignatura · Tema','Vistas'],
                  rows:(it:any,idx:number)=>makeTr(it,idx,COLORS[1],hoverBg[1],[
                    <td key="n" style={{padding:'13px 16px',fontSize:13,fontWeight:600,color:'#1e3a5f'}}>{it.nombre}</td>,
                    <td key="s" style={{padding:'13px 16px',fontSize:12,color:'#64748b'}}>{filtradoPorAsignatura?it.tema:`${it.asignatura} · ${it.tema}`}</td>,
                  ])},
                { titulo:`${pfx} · Contenidos`, color:COLORS[0], hbg:hoverBg[0], items:rankingData.contenidos,
                  headers:['#','Contenido', filtradoPorAsignatura?'Tema · Subtema':'Asignatura · Tema · Subtema','Tipo','Vistas'],
                  rows:(it:any,idx:number)=>makeTr(it,idx,COLORS[0],hoverBg[0],[
                    <td key="n" style={{padding:'13px 16px',fontSize:13,fontWeight:600,color:'#1e3a5f'}}>{it.nombre}</td>,
                    <td key="s" style={{padding:'13px 16px',fontSize:12,color:'#64748b'}}>{filtradoPorAsignatura?`${it.tema} · ${it.subtema}`:`${it.asignatura} · ${it.tema} · ${it.subtema}`}</td>,
                    <td key="b" style={{padding:'13px 16px'}}>{getBadge(it.tipo)}</td>,
                  ])},
              ];
              return (
                <div style={{display:'flex',flexDirection:'column',gap:24}}>
                  {categories.map(cat=>(
                    <div key={cat.titulo} className="app-table-card" style={{overflow:'hidden'}}>
                      {/* Cabecera de sección — minimalista */}
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px 12px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div style={{width:8,height:8,borderRadius:'50%',background:cat.color,flexShrink:0}}/>
                          <span style={{fontWeight:700,color:'#1e293b',fontSize:14,letterSpacing:'0.01em'}}>{cat.titulo}</span>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:4,color:'#94a3b8',fontSize:11}}>
                          <Eye className="w-3 h-3"/>
                          <span>Estudiantes que visualizaron</span>
                        </div>
                      </div>
                      <table style={{width:'100%',borderCollapse:'collapse'}}>
                        <thead>
                          <tr style={{background:'#1a56db'}}>
                            {cat.headers.map(h=>(
                              <th key={h} style={{padding:'10px 16px',textAlign:h==='Vistas'||h==='#'?'center':'left',fontSize:11,fontWeight:700,color:'#fff',textTransform:'uppercase',letterSpacing:'0.06em',whiteSpace:'nowrap'}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {cat.items.length===0
                            ?<tr><td colSpan={cat.headers.length} style={{padding:'24px 16px',textAlign:'center',color:'#94a3b8',fontSize:13}}>Sin datos de visualización</td></tr>
                            :cat.items.map((it,idx)=>cat.rows(it,idx))
                          }
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

      </main>

    </div>

  );

}


