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

  const [selectedAreaByStudent, setSelectedAreaByStudent] = useState<{[studentId: string]: string}>({});

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

        params.append('limit', '10');

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

  }, [activeTab, effectiveAsignaturaId, rankingAsignaturaFilter]);



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

    downloadPdf(activeTab);

  };



  const downloadPdf = async (type: 'student' | 'date' | 'activity' | 'failures' | 'content-views') => {

    if (!hasAppliedFilters && type !== 'content-views') {

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

        const nombreES: Record<string, string> = { student: 'estudiante', date: 'fecha', activity: 'actividad', failures: 'fallos', 'content-views': 'contenidos-vistos' };

        link.download = `reporte_${nombreES[type] ?? type}.pdf`;

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

        ? 'Desempeño por actividad'

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

                <div className="app-hero-metric__label">Asignaturas</div>

                <div className="app-hero-metric__value">{asignaturasCatalog.length}</div>

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

            <button

              onClick={() => setActiveTab('content-views')}

              className={`app-filter-tab ${

                activeTab === 'content-views'

                  ? 'app-filter-tab--blue'

                  : ''

              }`}

            >

              <Eye className="w-5 h-5" />

              <span>Contenidos más vistos</span>

            </button>

          </div>

        </div>



        {/* Filtros */}

        {showFilters && activeTab !== 'content-views' && (

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

                <label className="app-form-label">Buscar por código</label>

                <input

                  type="text"

                  value={studentSearch}

                  onChange={(e) => setStudentSearch(e.target.value)}

                  placeholder="Ej: 123456..."

                  className="app-form-input"

                />

              </div>



              <div className="app-form-field">

                <label className="app-form-label">Estudiante</label>

                <select 

                  value={filters.student}

                  onChange={(e) => handleStudentSelect(e.target.value)}

                  className="app-form-select"

                >

                  <option value="all">Todos los estudiantes</option>

                  {studentsData.map(student => (

                    <option key={student.id} value={student.id}>{student.name}{student.codigo ? ` — ${student.codigo}` : ''}</option>

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

                      title="Completado: 100% en todas las asignaturas. En progreso: inició pero no terminó. No iniciado: 0% en todas las asignaturas."

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



        {!showFilters && activeTab !== 'content-views' && (

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

                  <p className="app-table-card__description">Avance en asignaturas, temas y actividades con una lectura más homogénea.</p>

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

                      {student.subjects.map((subject) => {

                        const isSelected = selectedAreaByStudent[student.id] === subject.name;

                        return (

                        <div

                          key={subject.name}

                          className="border-2 rounded-xl p-4 cursor-pointer transition-all"

                          style={{ borderColor: isSelected ? subject.color : subject.color + '40', backgroundColor: isSelected ? subject.color + '12' : 'white' }}

                          onClick={() => setSelectedAreaByStudent(prev => ({
                            ...prev,
                            [student.id]: isSelected ? '' : subject.name
                          }))}

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

                        );
                      })}

                    </div>



                    {/* Detalle de temas y subtemas */}

                    <div className="bg-gray-50 rounded-lg p-4">

                      <h5 className="text-[#3A4A5B] text-sm mb-3">
                        Detalle por Tema y Subtema
                        {selectedAreaByStudent[student.id] && (
                          <span className="ml-2 text-xs text-gray-400 font-normal">— {selectedAreaByStudent[student.id]}</span>
                        )}
                      </h5>

                      {!selectedAreaByStudent[student.id] && (
                        <p className="text-xs text-gray-400 mb-3">Selecciona un área para ver el detalle.</p>
                      )}

                      <div className="space-y-4">

                        {student.subjects.filter(s => !selectedAreaByStudent[student.id] || s.name === selectedAreaByStudent[student.id]).map((subject) => (

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

                          return payload[0]?.payload?.name || 'Asignatura';

                        }

                        return 'Asignatura';

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

                  const subjectasignaturaId = subject.asignaturaId;



                  const findMatchingSubject = (student: StudentProgress) => {

                    const matchByasignaturaId = subjectasignaturaId

                      ? student.subjects.find((subj) => String(subj.asignaturaId ?? '') === String(subjectasignaturaId))

                      : undefined;

                    return matchByasignaturaId || student.subjects.find((subj) => subj.name === subjectName);

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

                            </tr>

                          </thead>

                          <tbody>

                            {activityTabStudents.map((student) => {

                              const subject = student.subjects.find(s => s.name === subjectName);

                              if (!subject) return null;

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

                  <div className="app-table-card__header app-table-card__header--red">

                    <div>

                      <h3 className="app-table-card__title">Resumen de fallos por asignatura</h3>

                      <p className="app-table-card__description">Intentos y fallos acumulados.</p>

                    </div>

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

                  <div className="app-table-card__header app-table-card__header--red">

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

                  <div className="app-table-card__header app-table-card__header--red">

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

                      <div className="app-table-card__header app-table-card__header--red">

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

        {/* Tab 5: Contenidos más vistos — Podios + Rankings */}
        {activeTab === 'content-views' && (
          <div>
            {/* Filtro de asignatura — solo admin */}
            {!isDocenteMode && (
              <div className="mb-4 flex items-center rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
                {/* Etiqueta */}
                <div className="flex items-center gap-2.5 px-4 py-3 border-r border-[#E5E7EB] shrink-0">
                  <Filter className="w-4 h-4 text-[#9CA3AF]" />
                  <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">
                    Asignatura
                  </span>
                </div>

                {/* Selector */}
                <div className="flex-1 bg-[#F9FAFB] px-4 py-3">
                  <select
                    value={rankingAsignaturaFilter}
                    onChange={e => setRankingAsignaturaFilter(e.target.value)}
                    className="w-full bg-transparent text-sm text-[#3A4A5B] outline-none cursor-pointer"
                  >
                    <option value="all">Todas las asignaturas</option>
                    {asignaturasCatalog.map(a => (
                      <option key={a.id} value={String(a.id)}>{a.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Botón limpiar */}
                {rankingAsignaturaFilter !== 'all' && (
                  <button
                    onClick={() => setRankingAsignaturaFilter('all')}
                    className="flex items-center gap-1.5 px-4 py-3 border-l border-[#E5E7EB] text-xs text-[#6B7280] hover:bg-[#F3F4F6] transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Limpiar</span>
                  </button>
                )}
              </div>
            )}

            {rankingLoading && (
              <div className="app-panel flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3 text-[#3A4A5B]">
                  <div className="w-8 h-8 border-2 border-[#4A90E2] border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Cargando ranking...</span>
                </div>
              </div>
            )}

            {!rankingLoading && !rankingData && (
              <div className="app-panel flex flex-col items-center justify-center py-16 gap-3 text-[#3A4A5B]">
                <Eye className="w-12 h-12 opacity-30" />
                <p className="text-sm">No hay datos de visualización registrados aún.</p>
              </div>
            )}

            {!rankingLoading && rankingData && (() => {
              const top = {
                contenido:  rankingData.contenidos[0]  ?? null,
                subtema:    rankingData.subtemas[0]    ?? null,
                tema:       rankingData.temas[0]       ?? null,
                asignatura: rankingData.asignaturas[0] ?? null,
              };

              const podiosTodos = [
                { label: 'Contenido más visto',  icon: <Award      className="w-4 h-4 text-[#4A90E2]" />, color: '#4A90E2', nombre: top.contenido?.nombre,    sub: top.contenido  ? `${top.contenido.asignatura} · ${top.contenido.tema}`  : null, vistas: top.contenido?.vistas  ?? 0 },
                { label: 'Subtema más visto',    icon: <Clock      className="w-4 h-4 text-[#F5A97F]" />, color: '#F5A97F', nombre: top.subtema?.nombre,     sub: top.subtema   ? `${top.subtema.asignatura} · ${top.subtema.tema}`        : null, vistas: top.subtema?.vistas    ?? 0 },
                { label: 'Tema más visto',       icon: <TrendingUp className="w-4 h-4 text-[#7ED6A7]" />, color: '#7ED6A7', nombre: top.tema?.nombre,        sub: top.tema      ? top.tema.asignatura                                     : null, vistas: top.tema?.vistas       ?? 0 },
                { label: 'Asignatura más vista', icon: <BarChart3  className="w-4 h-4 text-[#A78BFA]" />, color: '#A78BFA', nombre: top.asignatura?.nombre,  sub: null,                                                                          vistas: top.asignatura?.vistas ?? 0 },
              ];

              const filtradoPorAsignatura = isDocenteMode || rankingAsignaturaFilter !== 'all';

              const podios = filtradoPorAsignatura
                ? podiosTodos.filter(p => p.label !== 'Asignatura más vista')
                : podiosTodos;

              const rankings = [
                {
                  titulo: 'Top Contenidos',
                  icon: <Award className="w-4 h-4" />,
                  color: '#4A90E2',
                  items: rankingData.contenidos,
                  sublabel: (it: any) => filtradoPorAsignatura ? `${it.tema}  ·  ${it.subtema}` : `${it.asignatura}  ·  ${it.tema}  ·  ${it.subtema}`,
                  badge: (it: any) => it.tipo,
                },
                {
                  titulo: 'Top Subtemas',
                  icon: <Clock className="w-4 h-4" />,
                  color: '#F5A97F',
                  items: rankingData.subtemas,
                  sublabel: (it: any) => filtradoPorAsignatura ? it.tema : `${it.asignatura}  ·  ${it.tema}`,
                  badge: null,
                },
                {
                  titulo: 'Top Temas',
                  icon: <TrendingUp className="w-4 h-4" />,
                  color: '#7ED6A7',
                  items: rankingData.temas,
                  sublabel: (it: any) => filtradoPorAsignatura ? null : it.asignatura,
                  badge: null,
                },
                ...(!filtradoPorAsignatura ? [{
                  titulo: 'Top Asignaturas',
                  icon: <BarChart3 className="w-4 h-4" />,
                  color: '#A78BFA',
                  items: rankingData.asignaturas,
                  sublabel: null,
                  badge: null,
                }] : []),
              ];

              return (
                <>
                  {/* Podios */}
                  <div className={`grid gap-4 mb-6 ${filtradoPorAsignatura ? 'grid-cols-3' : 'grid-cols-4'}`}>
                    {podios.map((p) => (
                      <div
                        key={p.label}
                        className="flex flex-col gap-4 rounded-2xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
                        style={{ border: `1px solid ${p.color}28` }}
                      >
                        {/* Ícono + etiqueta */}
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${p.color}1A` }}
                          >
                            {p.icon}
                          </div>
                          <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest leading-none">
                            {p.label}
                          </span>
                        </div>

                        {/* Valor principal */}
                        {p.nombre ? (
                          <>
                            <div className="flex-1 min-h-0">
                              <p className="text-base font-bold text-[#1E3A5F] leading-snug line-clamp-2 mb-1">
                                {p.nombre}
                              </p>
                              {p.sub && (
                                <p className="text-xs text-[#9CA3AF] truncate">{p.sub}</p>
                              )}
                            </div>

                            {/* Contador — sin borde, solo espaciado */}
                            <div className="flex items-center gap-1.5 mt-auto">
                              <Eye className="w-3.5 h-3.5" style={{ color: p.color }} />
                              <span className="text-xl font-extrabold" style={{ color: p.color }}>
                                {p.vistas}
                              </span>
                              <span className="text-xs text-[#9CA3AF]">estudiantes</span>
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-[#9CA3AF] italic">Sin datos</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Rankings */}
                  {(() => {
                    const badgeStyle: Record<string, { bg: string; text: string }> = {
                      video:    { bg: '#EFF6FF', text: '#3B82F6' },
                      activity: { bg: '#F0FDF4', text: '#16A34A' },
                      document: { bg: '#FFF7ED', text: '#EA580C' },
                      teoria:   { bg: '#F5F3FF', text: '#7C3AED' },
                    };
                    const getBadge = (tipo: string) => {
                      const style = badgeStyle[tipo?.toLowerCase()] ?? { bg: '#F3F4F6', text: '#6B7280' };
                      return (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                          style={{ backgroundColor: style.bg, color: style.text }}
                        >
                          {tipo}
                        </span>
                      );
                    };

                    return (
                      <div className={`grid gap-6 ${filtradoPorAsignatura ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        {rankings.map((ranking) => (
                          <div key={ranking.titulo} className="bg-white rounded-2xl shadow-sm border border-[#F3F4F6] overflow-hidden">

                            {/* Encabezado del panel */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6]">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-7 h-7 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: `${ranking.color}1A` }}
                                >
                                  <span style={{ color: ranking.color }}>{ranking.icon}</span>
                                </div>
                                <h4 className="font-bold text-[#1E3A5F] text-sm">{ranking.titulo}</h4>
                              </div>
                              <div className="flex items-center gap-1 text-[#9CA3AF]">
                                <Eye className="w-3.5 h-3.5" />
                                <span className="text-xs">Vistas</span>
                              </div>
                            </div>

                            {/* Lista */}
                            <div>
                              {ranking.items.length === 0 && (
                                <p className="text-xs text-[#9CA3AF] italic text-center py-8">Sin datos</p>
                              )}
                              {ranking.items.map((item: any, idx: number) => {
                                const isLast = idx === ranking.items.length - 1;
                                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                                return (
                                  <div
                                    key={item.id}
                                    className={`flex items-center gap-3 px-5 py-3 hover:bg-[#FAFAFA] transition-colors ${!isLast ? 'border-b border-gray-100' : ''}`}
                                  >
                                    {/* Columna rango — ancho fijo */}
                                    <div className="w-6 shrink-0 flex items-center justify-center">
                                      {medal ? (
                                        <span className="text-base leading-none">{medal}</span>
                                      ) : (
                                        <span className="text-xs font-semibold text-[#9CA3AF]">{idx + 1}</span>
                                      )}
                                    </div>

                                    {/* Columna texto — flex-1 */}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-[#1E3A5F] truncate leading-snug">
                                        {item.nombre}
                                      </p>
                                      {ranking.sublabel && ranking.sublabel(item) && (
                                        <p className="text-xs text-[#9CA3AF] truncate mt-0.5">
                                          {ranking.sublabel(item)}
                                        </p>
                                      )}
                                    </div>

                                    {/* Columna derecha — badge + vistas */}
                                    <div className="flex items-center gap-2 shrink-0">
                                      {ranking.badge && getBadge(ranking.badge(item))}
                                      <div className="flex items-center gap-1">
                                        <Eye className="w-3.5 h-3.5 text-[#9CA3AF]" />
                                        <span className="text-sm font-bold" style={{ color: ranking.color }}>
                                          {item.vistas}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                </>
              );
            })()}
          </div>
        )}

      </main>

    </div>

  );

}

