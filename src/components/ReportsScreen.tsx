import { useState, useEffect } from 'react';
import { ArrowLeft, Download, FileSpreadsheet, Filter, X, User, Calendar, Activity, TrendingUp, Clock, CheckCircle2, XCircle, AlertCircle, BarChart3, Award } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';

import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:4000',
  timeout: 15000
});

interface ReportsScreenProps {
  onBack: () => void;
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
      subtopics: { name: string; progress: number; }[];
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

export function ReportsScreen({ onBack }: ReportsScreenProps) {
  const [activeTab, setActiveTab] = useState<'student' | 'date' | 'activity'>('student');
  const [showFilters, setShowFilters] = useState(true);
  const [showPdfModal, setShowPdfModal] = useState(false);
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
  const [hasAppliedFilters, setHasAppliedFilters] = useState(false);

  // Estado para estudiantes (se carga desde backend). Si falla, usamos fallbackMockStudents
  const [studentsData, setStudentsData] = useState<StudentProgress[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(true);

  // Fallback con el mock original reducido (solo estructura necesaria)
  const fallbackMockStudents: StudentProgress[] = [
    { id: '1', name: 'Juan Pérez', email: 'juan.perez@universidad.edu', createdDate: '2025-09-15', semester: '1', subjects: [] },
    { id: '2', name: 'María García', email: 'maria.garcia@universidad.edu', createdDate: '2025-09-15', semester: '2', subjects: [] }
  ];

  useEffect(() => {
    const loadStudentsAndProgress = async () => {
      try {
        setLoadingStudents(true);

        // Nuevo endpoint agregado: resumen general con un solo llamado
        try {
          const resumenRes = await api.get('/progresos/resumen-general');
          const resumenData = resumenRes.data || {};
          if (Array.isArray(resumenData.students)) {
            const palette = ['#4A90E2', '#7ED6A7', '#F5A97F'];
            const areasList = Array.isArray(resumenData.areas) ? resumenData.areas : [];
            const areaColorById = new Map(
              areasList.map((area: any, idx: number) => [String(area.id), palette[idx % palette.length]])
            );
            const areaColorByName = new Map(
              areasList.map((area: any, idx: number) => [area.nombre || area.name, palette[idx % palette.length]])
            );

            const normalizedStudents: StudentProgress[] = resumenData.students.map((student: any) => ({
              ...student,
              subjects: (student.subjects || []).map((subject: any, idx: number) => ({
                ...subject,
                color: subject.color
                  || areaColorById.get(String(subject.areaId ?? ''))
                  || areaColorByName.get(subject.name)
                  || palette[idx % palette.length]
              }))
            }));

            setStudentsData(normalizedStudents);
            return;
          }
        } catch (e) {
          // Si falla, continuar con el flujo anterior
        }

        // 1) obtener áreas para luego pedir progreso por área por estudiante
        const areasRes = await api.get('/areas');
        const areas = Array.isArray(areasRes.data) ? areasRes.data : [];
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
  }, []);

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
    setHasAppliedFilters(false);
  };

  const applyFilters = () => {
    setAppliedFilters(filters);
    setAppliedSearch(studentSearch);
    setHasAppliedFilters(true);
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    if (format === 'pdf') {
      setShowPdfModal(true);
      return;
    }
    alert(`Exportando informe en formato ${format.toUpperCase()}...`);
  };

  const downloadPdf = async (type: 'student' | 'date' | 'activity') => {
    if (!hasAppliedFilters) {
      alert('Aplica los filtros antes de descargar el informe.');
      return;
    }
    if (type === 'student' && appliedFilters.student === 'all') {
      alert('Selecciona un estudiante en los filtros para exportar el informe por estudiante.');
      return;
    }

    try {
      setPdfLoading(true);
      const params = new URLSearchParams({ type });
      if (type === 'student') {
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
      if (appliedFilters.area !== 'all') {
        params.append('area', appliedFilters.area);
      }
      if (appliedFilters.topic !== 'all') {
        params.append('topic', appliedFilters.topic);
      }
      if (appliedFilters.status !== 'all') {
        params.append('status', appliedFilters.status);
      }
      if (appliedFilters.contentType !== 'all') {
        params.append('contentType', appliedFilters.contentType);
      }
      if (appliedFilters.activityType !== 'all') {
        params.append('activityType', appliedFilters.activityType);
      }

      const response = await api.get(`/progresos/reporte-pdf?${params.toString()}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte_${type}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setShowPdfModal(false);
    } catch (error) {
      console.error('Error descargando PDF:', error);
      alert('No se pudo generar el PDF. Intenta nuevamente.');
    } finally {
      setPdfLoading(false);
    }
  };

  const formatPercent = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}` : `${rounded.toFixed(1)}`;
  };

  const normalizePercent = (value: number) => {
    if (!Number.isFinite(value)) return 0;
    return Math.min(100, Math.max(0, value));
  };

  const formatGrade = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}` : `${rounded.toFixed(1)}`;
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

    return Object.entries(grouped).map(([date, students]) => {
      const sumAvg = students.reduce((sum, s) => {
        const totalProgress = s.subjects.reduce((acc, subj) => acc + subj.progress, 0);
        const avg = s.subjects.length ? totalProgress / s.subjects.length : 0;
        return sum + avg;
      }, 0);

      const avgProgress = students.length ? sumAvg / students.length : 0;

      return {
        date,
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
  const getSubjectProgressData = (sourceStudents: StudentProgress[]) => {
    const subjectMap = new Map<string, string>();
    sourceStudents.forEach(student => {
      student.subjects.forEach(subject => {
        if (!subjectMap.has(subject.name)) {
          subjectMap.set(subject.name, subject.color || '#4A90E2');
        }
      });
    });

    return Array.from(subjectMap.entries()).map(([subjectName, color]) => {
      let total = 0;
      let count = 0;
      sourceStudents.forEach(student => {
        const subject = student.subjects.find(s => s.name === subjectName);
        if (subject) {
          total += subject.progress || 0;
          count += 1;
        }
      });

      const avgProgress = count ? total / count : 0;

      return {
        name: subjectName,
        progress: avgProgress,
        color
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

  const areaValueMap: Record<string, string> = {
    programming: 'Fundamentos de Programación',
    analysis: 'Análisis de Sistemas',
    management: 'Alcance, Tiempo y Costo'
  };

  const topicValueMap: Record<string, string> = {
    python: 'Introducción a Python',
    'data-structures': 'Estructuras de datos',
    requirements: 'Requerimientos',
    scope: 'Gestión de Alcance'
  };

  const studentTabStudents = baseFilteredStudents.filter(student => {
    if (appliedFilters.area !== 'all') {
      const areaLabel = areaValueMap[appliedFilters.area] || appliedFilters.area;
      const matchesArea = student.subjects.some(subject => subject.name.toLowerCase().includes(areaLabel.toLowerCase()));
      if (!matchesArea) return false;
    }

    if (appliedFilters.topic !== 'all') {
      const topicLabel = topicValueMap[appliedFilters.topic] || appliedFilters.topic;
      const matchesTopic = student.subjects.some(subject =>
        subject.topics.some(topic => topic.name.toLowerCase().includes(topicLabel.toLowerCase()))
      );
      if (!matchesTopic) return false;
    }

    if (appliedFilters.status !== 'all') {
      const avg = student.subjects.length
        ? student.subjects.reduce((acc, subj) => acc + subj.progress, 0) / student.subjects.length
        : 0;
      if (appliedFilters.status === 'completed' && avg < 70) return false;
      if (appliedFilters.status === 'in-progress' && (avg < 30 || avg >= 70)) return false;
      if (appliedFilters.status === 'not-started' && avg >= 30) return false;
    }

    if (appliedFilters.contentType !== 'all') {
      const totals = student.subjects.reduce(
        (acc, subj) => {
          acc.content += subj.contentViewed || 0;
          acc.exercise += subj.exercisesCompleted || 0;
          acc.miniproject += subj.miniprojectsSubmitted || 0;
          return acc;
        },
        { content: 0, exercise: 0, miniproject: 0 }
      );

      if (appliedFilters.contentType === 'content' && totals.content === 0) return false;
      if (appliedFilters.contentType === 'exercise' && totals.exercise === 0) return false;
      if (appliedFilters.contentType === 'miniproject' && totals.miniproject === 0) return false;
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
  const activityData = getActivityData(activityTabStudents);
  const subjectProgressData = getSubjectProgressData(activityTabStudents);

  return (
    <div className="min-h-screen bg-[#F2F2F2]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2.5 shadow-md">
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-[#3A4A5B]">Generación de Informes Académicos</h1>
                <p className="text-gray-500 text-sm">Panel de Administrador - EduPath</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => handleExport('excel')}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-[#7ED6A7] text-[#7ED6A7] rounded-lg hover:bg-[#7ED6A7] hover:text-white transition-all duration-300"
              >
                <FileSpreadsheet className="w-5 h-5" />
                <span>Excel</span>
              </button>
              <button 
                onClick={() => handleExport('pdf')}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#F5A97F] to-[#F7B98F] text-white rounded-lg hover:shadow-lg transition-all duration-300"
              >
                <Download className="w-5 h-5" />
                <span>Exportar PDF</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-[#3A4A5B] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Panel</span>
        </button>

        {showPdfModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-[#3A4A5B] text-xl">Descargar informe en PDF</h3>
                  <p className="text-gray-500 text-sm mt-1">
                    Selecciona el tipo de informe. Se aplicarán los filtros actuales.
                  </p>
                </div>
                <button
                  disabled={pdfLoading}
                  onClick={() => setShowPdfModal(false)}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition disabled:opacity-60"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  disabled={pdfLoading}
                  onClick={() => downloadPdf('student')}
                  className="group flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-[#4A90E2] to-[#5B9FED] text-white rounded-xl hover:shadow-lg transition disabled:opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold">Progreso por Estudiante</div>
                      <div className="text-xs text-white/80">Detalle individual y métricas clave</div>
                    </div>
                  </div>
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full">PDF</span>
                </button>

                <button
                  disabled={pdfLoading}
                  onClick={() => downloadPdf('date')}
                  className="group flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-[#7ED6A7] to-[#8FE0B7] text-white rounded-xl hover:shadow-lg transition disabled:opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold">Progreso por Fecha de Creación</div>
                      <div className="text-xs text-white/80">Comparativo de cohortes y tendencias</div>
                    </div>
                  </div>
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full">PDF</span>
                </button>

                <button
                  disabled={pdfLoading}
                  onClick={() => downloadPdf('activity')}
                  className="group flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-[#F5A97F] to-[#F7B98F] text-white rounded-xl hover:shadow-lg transition disabled:opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold">Desempeño por Actividad</div>
                      <div className="text-xs text-white/80">Contenido, ejercicios y proyectos</div>
                    </div>
                  </div>
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full">PDF</span>
                </button>
              </div>

              <div className="flex items-center justify-between mt-5">
                {pdfLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                    Generando PDF...
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">El PDF se descargará automáticamente.</span>
                )}
                <button
                  disabled={pdfLoading}
                  onClick={() => setShowPdfModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-[#3A4A5B] disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {loadingStudents && (
          <div className="bg-white rounded-xl shadow-md mb-6 p-6">
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
        <div className="bg-white rounded-xl shadow-md mb-6 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('student')}
              className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 transition-all ${
                activeTab === 'student'
                  ? 'bg-[#4A90E2] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <User className="w-5 h-5" />
              <span>Progreso por Estudiante</span>
            </button>
            <button
              onClick={() => setActiveTab('date')}
              className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 transition-all ${
                activeTab === 'date'
                  ? 'bg-[#7ED6A7] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span>Progreso por Fecha de Creación</span>
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex-1 px-6 py-4 flex items-center justify-center gap-2 transition-all ${
                activeTab === 'activity'
                  ? 'bg-[#F5A97F] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Activity className="w-5 h-5" />
              <span>Desempeño por Actividad</span>
            </button>
          </div>
        </div>

        {/* Filtros */}
        {showFilters && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-[#3A4A5B]" />
                <h3 className="text-[#3A4A5B]">Filtros Avanzados</h3>
              </div>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              La información se muestra solo cuando se aplican los filtros.
            </p>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-[#3A4A5B] mb-2 text-sm">Buscar estudiante</label>
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Escribe un nombre..."
                  className="w-full border-2 border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent bg-white"
                />
              </div>

              <div>
                <label className="block text-[#3A4A5B] mb-2 text-sm">Estudiante</label>
                <select 
                  value={filters.student}
                  onChange={(e) => setFilters({...filters, student: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent bg-white"
                >
                  <option value="all">Todos los estudiantes</option>
                  {studentsData.map(student => (
                    <option key={student.id} value={student.id}>{student.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#3A4A5B] mb-2 text-sm">Semestre</label>
                <select
                  value={filters.semester}
                  onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent bg-white"
                >
                  <option value="all">Todos los semestres</option>
                  {semesterOptions.map((semester) => (
                    <option key={semester} value={semester}>{semester}</option>
                  ))}
                </select>
              </div>
            </div>

            {activeTab === 'student' && (
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-[#3A4A5B] mb-2 text-sm">Tipo de Contenido</label>
                  <select 
                    value={filters.contentType}
                    onChange={(e) => setFilters({...filters, contentType: e.target.value})}
                    className="w-full border-2 border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent bg-white"
                  >
                    <option value="all">Todos</option>
                    <option value="content">Contenido</option>
                    <option value="exercise">Ejercicio</option>
                    <option value="miniproject">Miniproyecto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#3A4A5B] mb-2 text-sm">Área</label>
                  <select 
                    value={filters.area}
                    onChange={(e) => setFilters({...filters, area: e.target.value})}
                    className="w-full border-2 border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent bg-white"
                  >
                    <option value="all">Todas las áreas</option>
                    <option value="programming">Fundamentos de Programación</option>
                    <option value="analysis">Análisis de Sistemas</option>
                    <option value="management">Alcance, Tiempo y Costo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#3A4A5B] mb-2 text-sm">Estado de Avance</label>
                  <select 
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="w-full border-2 border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent bg-white"
                  >
                    <option value="all">Todos</option>
                    <option value="completed">Completado</option>
                    <option value="in-progress">En Progreso</option>
                    <option value="not-started">No Iniciado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#3A4A5B] mb-2 text-sm">Tema</label>
                  <select 
                    value={filters.topic}
                    onChange={(e) => setFilters({...filters, topic: e.target.value})}
                    className="w-full border-2 border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent bg-white"
                  >
                    <option value="all">Todos los temas</option>
                    <option value="python">Introducción a Python</option>
                    <option value="data-structures">Estructuras de datos</option>
                    <option value="requirements">Requerimientos</option>
                    <option value="scope">Gestión de Alcance</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'date' && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[#3A4A5B] mb-2 text-sm">Fecha desde</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                    className="w-full border-2 border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[#3A4A5B] mb-2 text-sm">Fecha hasta</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                    className="w-full border-2 border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent bg-white"
                  />
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[#3A4A5B] mb-2 text-sm">Tipo de Actividad</label>
                  <select 
                    value={filters.activityType}
                    onChange={(e) => setFilters({...filters, activityType: e.target.value})}
                    className="w-full border-2 border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent bg-white"
                  >
                    <option value="all">Todas</option>
                    <option value="content">Contenidos</option>
                    <option value="exercise">Ejercicios</option>
                    <option value="miniproject">Miniproyectos</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button 
                onClick={clearFilters}
                className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm"
              >
                Limpiar Filtros
              </button>
              <button
                onClick={applyFilters}
                className="px-5 py-2.5 bg-gradient-to-r from-[#4A90E2] to-[#5B9FED] text-white rounded-lg hover:shadow-lg transition-all text-sm"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        )}

        {!showFilters && (
          <button
            onClick={() => setShowFilters(true)}
            className="mb-6 flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all text-[#3A4A5B]"
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm">Mostrar Filtros</span>
          </button>
        )}

        {/* Content by Tab */}
        {!hasAppliedFilters && (
          <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-500">
            La información se muestra solo cuando se aplican los filtros.
          </div>
        )}

        {hasAppliedFilters && activeTab === 'student' && (
          <div className="space-y-6">
            {/* Resumen Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Total Estudiantes</span>
                  <User className="w-5 h-5 text-[#4A90E2]" />
                </div>
                <div className="text-3xl text-[#3A4A5B] mb-1">{studentTabStudents.length}</div>
                <div className="text-xs text-gray-500">Activos en el sistema</div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Progreso Promedio</span>
                  <TrendingUp className="w-5 h-5 text-[#7ED6A7]" />
                </div>
                <div className="text-3xl text-[#3A4A5B] mb-1">
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
                <div className="text-xs text-gray-500">En todas las materias</div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Estudiantes al Día</span>
                  <CheckCircle2 className="w-5 h-5 text-[#7ED6A7]" />
                </div>
                <div className="text-3xl text-[#3A4A5B] mb-1">
                  {studentTabStudents.filter(s => {
                    const avg = s.subjects.length
                      ? s.subjects.reduce((acc, subj) => acc + subj.progress, 0) / s.subjects.length
                      : 0;
                    return avg >= 70;
                  }).length}
                </div>
                <div className="text-xs text-gray-500">≥ 70% de progreso</div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm">Estudiantes Rezagados</span>
                  <AlertCircle className="w-5 h-5 text-[#F5A97F]" />
                </div>
                <div className="text-3xl text-[#3A4A5B] mb-1">
                  {studentTabStudents.filter(s => {
                    const avg = s.subjects.length
                      ? s.subjects.reduce((acc, subj) => acc + subj.progress, 0) / s.subjects.length
                      : 0;
                    return avg < 50;
                  }).length}
                </div>
                <div className="text-xs text-gray-500">{'<'} 50% de progreso</div>
              </div>
            </div>

            {/* Tabla detallada por estudiante */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="border-b border-gray-200 p-6 bg-gradient-to-r from-[#4A90E2] to-[#5B9FED]">
                <h3 className="text-white text-lg">Progreso Detallado por Estudiante</h3>
                <p className="text-white/90 text-sm mt-1">Avance en áreas, temas y actividades</p>
              </div>
              
              <div className="p-6">
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
                      <div className="space-y-3">
                        {student.subjects.map((subject) => (
                          <div key={subject.name}>
                            {subject.topics.map((topic) => (
                              <div key={topic.name} className="mb-3 last:mb-0">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm text-[#3A4A5B]">{topic.name}</span>
                                  <span className="text-sm text-gray-600">{formatPercent(topic.progress)}%</span>
                                </div>
                                <div className="pl-4 space-y-1">
                                  {topic.subtopics.map((subtopic) => (
                                    <div key={subtopic.name} className="flex items-center justify-between text-xs">
                                      <span className="text-gray-600">• {subtopic.name}</span>
                                      <div className="flex items-center gap-2">
                                        <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                          <div 
                                            className="h-full rounded-full"
                                            style={{ 
                                              width: `${normalizePercent(subtopic.progress)}%`,
                                              backgroundColor: subject.color
                                            }}
                                          />
                                        </div>
                                        <span className="text-gray-500 w-8">{formatPercent(subtopic.progress)}%</span>
                                      </div>
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
          </div>
        )}

        {hasAppliedFilters && activeTab === 'date' && (
          <div className="space-y-6">
            {/* Resumen por fecha */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-[#3A4A5B] mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#7ED6A7]" />
                  Progreso Promedio por Cohorte
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dateData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
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
                      data={dateData}
                      dataKey="studentCount"
                      nameKey="date"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.date}: ${entry.studentCount}`}
                    >
                      {dateData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#7ED6A7', '#4A90E2', '#F5A97F'][index % 3]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabla por cohorte */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="border-b border-gray-200 p-6 bg-gradient-to-r from-[#7ED6A7] to-[#8FE0B7]">
                <h3 className="text-white text-lg">Análisis por Fecha de Creación</h3>
                <p className="text-white/90 text-sm mt-1">Comparación de cohortes y estudiantes rezagados</p>
              </div>
              
              <div className="p-6">
                {dateData.map((dateGroup) => (
                  <div key={dateGroup.date} className="mb-8 last:mb-0 border-b border-gray-200 last:border-0 pb-8 last:pb-0">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-[#3A4A5B] text-lg">Cohorte: {dateGroup.date}</h4>
                        <p className="text-gray-500 text-sm">{dateGroup.studentCount} estudiantes</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl text-[#3A4A5B] mb-1">{formatPercent(dateGroup.avgProgress)}%</div>
                        <div className="text-xs text-gray-500">Promedio de avance</div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Estudiante</th>
                            <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Gestion de Proyectos</th>
                            <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Programacion</th>
                            <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Analsis de sistemas</th>
                            <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Promedio</th>
                            <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
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
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-[#4A90E2]/10 rounded-lg flex items-center justify-center">
                    <Activity className="w-6 h-6 text-[#4A90E2]" />
                  </div>
                  <div>
                    <div className="text-2xl text-[#3A4A5B]">
                      {activityTabStudents.reduce((sum, s) => sum + s.subjects.reduce((acc, subj) => acc + subj.contentViewed, 0), 0)}
                    </div>
                    <div className="text-sm text-gray-600">Contenidos Visualizados</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                    Promedio: {activityTabStudents.length ? Math.round(activityTabStudents.reduce((sum, s) => sum + s.subjects.reduce((acc, subj) => acc + subj.contentViewed, 0), 0) / activityTabStudents.length) : 0} por estudiante
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-[#7ED6A7]/10 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-[#7ED6A7]" />
                  </div>
                  <div>
                    <div className="text-2xl text-[#3A4A5B]">
                      {activityTabStudents.reduce((sum, s) => sum + s.subjects.reduce((acc, subj) => acc + subj.exercisesCompleted, 0), 0)}
                    </div>
                    <div className="text-sm text-gray-600">Ejercicios Completados</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Promedio: {activityTabStudents.length ? Math.round(activityTabStudents.reduce((sum, s) => sum + s.subjects.reduce((acc, subj) => acc + subj.exercisesCompleted, 0), 0) / activityTabStudents.length) : 0} por estudiante
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-[#F5A97F]/10 rounded-lg flex items-center justify-center">
                    <Award className="w-6 h-6 text-[#F5A97F]" />
                  </div>
                  <div>
                    <div className="text-2xl text-[#3A4A5B]">
                      {activityTabStudents.reduce((sum, s) => sum + s.subjects.reduce((acc, subj) => acc + subj.miniprojectsSubmitted, 0), 0)}
                    </div>
                    <div className="text-sm text-gray-600">Miniproyectos Entregados</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Promedio: {activityTabStudents.length ? Math.round(activityTabStudents.reduce((sum, s) => sum + s.subjects.reduce((acc, subj) => acc + subj.miniprojectsSubmitted, 0), 0) / activityTabStudents.length) : 0} por estudiante
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
                  <BarChart data={subjectProgressData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="progress" radius={[8, 8, 0, 0]}>
                      {subjectProgressData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabla detallada de actividades por materia */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="border-b border-gray-200 p-6 bg-gradient-to-r from-[#F5A97F] to-[#F7B98F]">
                <h3 className="text-white text-lg">Desempeño Detallado por Actividad</h3>
                <p className="text-white/90 text-sm mt-1">Análisis de completitud y calificaciones</p>
              </div>
              
              <div className="p-6">
                {subjectProgressData.map((subject) => {
                  const subjectName = subject.name;
                  const color = subject.color;

                  const totalContent = activityTabStudents.reduce((sum, s) => {
                    const subj = s.subjects.find(subj => subj.name === subjectName);
                    return sum + (subj?.contentViewed || 0);
                  }, 0);

                  const totalExercises = activityTabStudents.reduce((sum, s) => {
                    const subj = s.subjects.find(subj => subj.name === subjectName);
                    return sum + (subj?.exercisesCompleted || 0);
                  }, 0);

                  const totalProjects = activityTabStudents.reduce((sum, s) => {
                    const subj = s.subjects.find(subj => subj.name === subjectName);
                    return sum + (subj?.miniprojectsSubmitted || 0);
                  }, 0);

                  let avgProgress = 0;
                  let count = 0;
                  activityTabStudents.forEach((s) => {
                    const subj = s.subjects.find(subj => subj.name === subjectName);
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
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Estudiante</th>
                              <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Contenidos</th>
                              <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Ejercicios</th>
                              <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Miniproyectos</th>
                              <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Progreso</th>
                              <th className="px-4 py-3 text-left text-[#3A4A5B] text-sm">Calificación Est.</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
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
      </main>
    </div>
  );
}
