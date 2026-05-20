import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Save } from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';
import { buildAuthHeaders } from '../utils/authHeaders';
import { MiniproyectoChatbotPanel } from './MiniproyectoChatbotPanel';
import 'quill/dist/quill.snow.css';


interface AIWorkshopViewProps {
  subjectName: string;
  workshop: {
    id: string;
    title: string;
    isMiniproyecto?: boolean;
    actividadId?: number;
    asignaturaId?: number;
    asignaturaNombre?: string;
    tipoPilar?: 'PROGRAMACION' | 'ANALISIS' | 'ATC' | null;
  };
  onBack: () => void;
  estudianteId?: number;
}

const normalizeasignaturaName = (value?: string | null) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();



// Colores por materia
const subjectColors: Record<string, string> = {
  'Análisis de Sistemas': '#7ED6A7',
  'Alcance, Tiempo y Costo': '#F5A97F',
  'Fundamentos de Programación': '#4A90E2'
};

const workshopConfigs = {
  analysis: {
    description: (
      <>
        Taller con cliente simulado por IA para análisis completo de requisitos
        del sistema.
      </>
    ),
    tasks: [
      'Identificar stakeholders del proyecto',
      'Recopilar requisitos funcionales',
      'Definir requisitos no funcionales'
    ]
  },
  management: {
    description: (
      <>
        Taller con cliente simulado por IA para definición de alcance,
        cronograma y costos del proyecto propuesto.
      </>
    ),
    tasks: [
      'Definir entregables del proyecto',
      'Crear cronograma del proyecto',
      'Estimar costos y recursos'
    ]
  }
};

const ANALYSIS_TASK_KEYS = ['stakeholders', 'requisitosFuncionales', 'requisitosNoFuncionales'] as const;
const MANAGEMENT_TASK_KEYS = ['alcance', 'cronograma', 'costos'] as const;

const taskColors = ['#4A90E2', '#7ED6A7', '#F5A97F', '#A78BFA', '#FBBF24', '#60A5FA'];

export function AIWorkshopView({ subjectName, workshop, onBack, estudianteId }: AIWorkshopViewProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [stakeholdersList, setStakeholdersList] = useState<string[]>([]);
  const [functionalList, setFunctionalList] = useState<string[]>([]);
  const [nonFunctionalList, setNonFunctionalList] = useState<string[]>([]);
  const [stakeholderInput, setStakeholderInput] = useState('');
  const [functionalInput, setFunctionalInput] = useState('');
  const [nonFunctionalInput, setNonFunctionalInput] = useState('');
  const [projectObjective, setProjectObjective] = useState('');
  const [specificObjectivesList, setSpecificObjectivesList] = useState<string[]>([]);
  const [specificObjectiveInput, setSpecificObjectiveInput] = useState('');
  const [scopeList, setScopeList] = useState<string[]>([]);
  const [scopeInput, setScopeInput] = useState('');
  const [scheduleRows, setScheduleRows] = useState<Array<{ activity: string; start: string; end: string }>>([
    { activity: '', start: '', end: '' }
  ]);
  const [costRows, setCostRows] = useState<
    Array<{ concept: string; quantity: string; unitCost: string }>
  >([
    { concept: '', quantity: '', unitCost: '' }
  ]);
  const [imprevistos, setImprevistos] = useState('5');
  const [utilidad, setUtilidad] = useState('10');
  const [supuestosList, setSupuestosList] = useState<string[]>([]);
  const [supuestosInput, setSupuestosInput] = useState('');
  const [expectedCounts, setExpectedCounts] = useState<{ stakeholders: number; functional: number; nonFunctional: number } | null>(null);
  const [expectedManagementCounts, setExpectedManagementCounts] = useState<{ scope: number; schedule: number; costs: number; supuestos: number } | null>(null);
  const [miniproyectoDescripcion, setMiniproyectoDescripcion] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<{
    puntaje: number;
    criterios?: Array<{ criterio: string; cumplido: boolean; puntaje?: number; peso?: number; detalle?: string }>;
  } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingEstado, setPendingEstado] = useState<'ENVIADO' | 'COMPLETADO' | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const subjectColor = subjectColors[subjectName] || '#4A90E2';
  const normalizedAsignaturaName = normalizeasignaturaName(workshop.asignaturaNombre || subjectName);
  const isManagementWorkshop = workshop.tipoPilar === 'ATC' || normalizedAsignaturaName.includes('alcance') || normalizedAsignaturaName.includes('gestion');
  const workshopConfig = isManagementWorkshop ? workshopConfigs.management : workshopConfigs.analysis;

  const sectionFilledCount = isManagementWorkshop
    ? {
        alcance: scopeList.length,
        cronograma: scheduleRows.filter((r) => r.activity.trim()).length,
        costos: costRows.filter((r) => r.concept.trim()).length,
      }
    : {
        stakeholders: stakeholdersList.length,
        requisitosFuncionales: functionalList.length,
        requisitosNoFuncionales: nonFunctionalList.length,
      };

  const sectionExpectedCount = isManagementWorkshop
    ? {
        alcance: expectedManagementCounts?.scope ?? 3,
        cronograma: expectedManagementCounts?.schedule ?? 3,
        costos: expectedManagementCounts?.costs ?? 3,
      }
    : {
        stakeholders: expectedCounts?.stakeholders ?? 4,
        requisitosFuncionales: expectedCounts?.functional ?? 6,
        requisitosNoFuncionales: expectedCounts?.nonFunctional ?? 5,
      };

  const isSectionComplete = (key: string) => {
    const filled = (sectionFilledCount as Record<string, number>)[key] ?? 0;
    const expected = (sectionExpectedCount as Record<string, number>)[key] ?? 1;
    return filled >= expected;
  };

  const taskKeys = isManagementWorkshop
    ? (MANAGEMENT_TASK_KEYS as unknown as string[])
    : (ANALYSIS_TASK_KEYS as unknown as string[]);

  const completedTasksCount = taskKeys.filter((key) => isSectionComplete(key)).length;

  const buildScheduleList = (rows: Array<{ activity: string; start: string; end: string }>) =>
    rows
      .filter((row) => row.activity || row.start || row.end)
      .map((row, index) =>
        `Hito ${index + 1}: ${row.activity || '-'} | Inicio: ${row.start || '-'} | Fin: ${row.end || '-'}`
      );

  const parseNumber = (value: string) => {
    const normalized = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

  const calculateRowTotal = (row: { quantity: string; unitCost: string }) =>
    parseNumber(row.quantity) * parseNumber(row.unitCost);

  const totalCost = costRows.reduce((sum, row) => sum + calculateRowTotal(row), 0);
  const contingencyValue = totalCost * (parseNumber(imprevistos) / 100);
  const utilityValue = totalCost * (parseNumber(utilidad) / 100);
  const projectTotal = totalCost + contingencyValue + utilityValue;

  const buildCostList = (
    rows: Array<{ concept: string; quantity: string; unitCost: string }>
  ) =>
    rows
      .filter((row) => row.concept || row.quantity || row.unitCost)
      .map((row, index) =>
        `Entregable ${index + 1}: ${row.concept || '-'} | Cantidad: ${row.quantity || '-'} | Precio unitario: ${row.unitCost || '-'} | Subtotal: ${formatCurrency(calculateRowTotal(row))}`
      )
      .concat([
        `Total: ${formatCurrency(totalCost)}`,
        `Imprevistos: ${imprevistos}% | Valor: ${formatCurrency(contingencyValue)}`,
        `Utilidad: ${utilidad}% | Valor: ${formatCurrency(utilityValue)}`,
        `Total proyecto: ${formatCurrency(projectTotal)}`,
      ]);

  useEffect(() => {
    const fetchExpectedCounts = async () => {
      if (!workshop.isMiniproyecto) return;
      const miniId = parseInt(workshop.id, 10);
      if (isNaN(miniId)) return;

      try {
        const response = await fetch(`${API_BASE_URL}/miniproyectos/${miniId}`);
        if (!response.ok) return;
        const data = await response.json();
        const descripcionProfe = data?.Actividad?.descripcion || data?.actividad?.descripcion || null;
        if (descripcionProfe) setMiniproyectoDescripcion(descripcionProfe);
        const expectedRaw = data?.respuesta_miniproyecto || data?.respuestaMiniproyecto || data?.Miniproyecto?.respuesta_miniproyecto;
        if (!expectedRaw) return;

        const parsed = typeof expectedRaw === 'string' ? JSON.parse(expectedRaw) : expectedRaw;
        if (isManagementWorkshop) {
          const scope = Array.isArray(parsed?.entregables) ? parsed.entregables.length : Array.isArray(parsed?.alcance) ? parsed.alcance.length : 0;
          const schedule = Array.isArray(parsed?.cronograma) ? parsed.cronograma.length : 0;
          const costs = Array.isArray(parsed?.costos) ? parsed.costos.length : 0;
          const supuestos = Array.isArray(parsed?.supuestos) ? parsed.supuestos.length : 0;
          if (scope || schedule || costs || supuestos) {
            setExpectedManagementCounts({ scope, schedule, costs, supuestos });
          }

        } else {
          const stakeholders = Array.isArray(parsed?.stakeholders) ? parsed.stakeholders.length : 0;
          const functional = Array.isArray(parsed?.requisitosFuncionales) ? parsed.requisitosFuncionales.length : 0;
          const nonFunctional = Array.isArray(parsed?.requisitosNoFuncionales) ? parsed.requisitosNoFuncionales.length : 0;
          if (stakeholders || functional || nonFunctional) {
            setExpectedCounts({ stakeholders, functional, nonFunctional });
          }
        }
      } catch (error) {
      }
    };

    fetchExpectedCounts();
  }, [workshop.id, workshop.isMiniproyecto, isManagementWorkshop]);

  const resolveEstudianteId = () => {
    if (estudianteId) return estudianteId;
    const stored = localStorage.getItem('estudianteId') || localStorage.getItem('userId');
    return stored ? parseInt(stored, 10) : null;
  };

  const handlePersistProgress = async (estado: 'ENVIADO' | 'COMPLETADO') => {
    if (!workshop.isMiniproyecto) return;
    const esId = resolveEstudianteId();
    const miniId = parseInt(workshop.id, 10);
    if (!esId || isNaN(miniId)) {
      setSaveMessage('No se pudo identificar estudiante o miniproyecto.');
      return;
    }

    const respuestaEstudiante = isManagementWorkshop
      ? {
          objetivoPrincipal: projectObjective.trim() ? [projectObjective.trim()] : [],
          objetivosEspecificos: specificObjectivesList,
          alcance: scopeList,
          cronograma: buildScheduleList(scheduleRows),
          costos: buildCostList(costRows),
          supuestos: supuestosList
        }
      : {
          stakeholders: stakeholdersList,
          requisitosFuncionales: functionalList,
          requisitosNoFuncionales: nonFunctionalList
        };

    const respuesta = JSON.stringify({
      mensajes: [],
      tareaActual: completedTasksCount,
      totalTareas: workshopConfig.tasks.length,
      respuestaEstudiante
    });

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/respuestasEstudianteMiniproyecto`, {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          respuesta,
          miniproyecto_id: miniId,
          estado
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.mensaje || 'Error al guardar el progreso');
      }

      const responseData = await response.json().catch(() => null);
      if (responseData?.respuesta) {
        try {
          const parsed = JSON.parse(responseData.respuesta);
          setEvaluation(parsed?.evaluacion || null);
          setShowResultModal(true);
        } catch (error) {
          setEvaluation(null);
        }
      }

      setSaveMessage(estado === 'COMPLETADO' ? 'Miniproyecto completado.' : 'Progreso guardado.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar el progreso';
      setSaveMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F2] flex">
      {/* Left Panel - Tasks & Guidelines */}
      <div className="w-96 bg-white border-r border-gray-200 overflow-y-auto shadow-sm">
        {/* Header */}
        <div 
          className="text-white p-4 border-b border-gray-200"
          style={{ background: `linear-gradient(135deg, ${subjectColor} 0%, ${subjectColor}dd 100%)` }}
        >
          <h2 className="text-sm">Miniproyecto</h2>
          <p className="text-xs text-white/80 mt-1">{workshop.title}</p>
        </div>

        {/* Workshop Info */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-[#3A4A5B] mb-3">Descripción del Miniproyecto</h3>
          {miniproyectoDescripcion ? (
            <div
              className="ql-editor mb-4"
              style={{ padding: 0, height: 'auto', overflow: 'visible', fontSize: '0.875rem', color: '#374151' }}
              dangerouslySetInnerHTML={{ __html: miniproyectoDescripcion }}
            />
          ) : (
            <p className="text-gray-700 text-sm mb-4">
              {workshopConfig.description}
            </p>
          )}
        </div>

        {/* Tasks Checklist */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[#3A4A5B]">Tareas a Completar</h3>
          </div>
          <div className="space-y-3">
            {workshopConfig.tasks.map((task, index) => {
              const key = taskKeys[index];
              const filled = (sectionFilledCount as Record<string, number>)[key] ?? 0;
              const expected = (sectionExpectedCount as Record<string, number>)[key] ?? 1;
              const completed = filled >= expected;
              const active = !completed && index === taskKeys.findIndex((k) => !(isSectionComplete(k)));
              return (
                <TaskItem
                  key={task}
                  number={index + 1}
                  text={task}
                  completed={completed}
                  active={active}
                  subjectColor={subjectColor}
                  taskColor={taskColors[index % taskColors.length]}
                  filled={filled}
                  expected={expected}
                />
              );
            })}
          </div>


          <div className="mt-6 border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[#3A4A5B] text-sm">Criterio de evaluación</h4>
              <span
                className="text-[10px] px-2 py-1 rounded-full border"
                style={{ color: subjectColor, borderColor: `${subjectColor}40`, backgroundColor: `${subjectColor}10` }}
              >
                Requiere 70%
              </span>
            </div>
            {isManagementWorkshop ? (
              <div className="grid gap-2 mt-2">
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-gray-700">
                  <strong>Entregables:</strong> productos o módulos del proyecto.
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-gray-700">
                  <strong>Cronograma:</strong> fases con fechas coherentes.
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-gray-700">
                  <strong>Costos:</strong> recursos humanos y materiales.
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-gray-700">
                  <strong>Supuestos:</strong> justificación de estimaciones.
                </div>
              </div>
            ) : (
              <div className="grid gap-2 mt-2">
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-gray-700">
                  <strong>Stakeholders:</strong> roles involucrados en el sistema.
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-gray-700">
                  <strong>Req. funcionales:</strong> acciones que debe realizar el sistema.
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-gray-700">
                  <strong>Req. no funcionales:</strong> rendimiento, seguridad, usabilidad.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Chat Interface */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2.5 shadow-md">
                  <img src='https://tse1.mm.bing.net/th/id/OIP.RfniSZo5EqSsXFGeP-zRuQHaE7?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3' alt="EduPath" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="text-[#3A4A5B]">{subjectName}</h1>
                  <p className="text-gray-500 text-sm">Conversación con el Cliente (IA)</p>
                </div>
              </div>
              
              {/* Client Info */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[#3A4A5B] text-sm">Cliente: TechCorp</div>
                  <div className="flex items-center gap-1 justify-end" style={{ color: subjectColor }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subjectColor }}></div>
                    <span className="text-xs">En línea</span>
                  </div>
                </div>
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center p-2 shadow-md"
                  style={{ backgroundColor: `${subjectColor}20` }}
                >
                  <img src='https://tse1.mm.bing.net/th/id/OIP.RfniSZo5EqSsXFGeP-zRuQHaE7?cb=ucfimg2&ucfimg=1&rs=1&pid=ImgDetMain&o=7&rm=3' alt="AI" className="w-full h-full object-contain" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Chat */}
        <div className="flex-1 overflow-y-auto bg-[#F2F2F2] p-6">
          <div className="max-w-6xl mx-auto space-y-4">
            {/* Back Button */}
            <button 
              onClick={onBack}
              className="mb-4 flex items-center gap-2 text-gray-600 hover:text-[#3A4A5B] transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>

            <MiniproyectoChatbotPanel
              chatbotType={workshop.isMiniproyecto ? 'MINIPROYECTO' : 'GENERAL'}
              asignaturaId={workshop.asignaturaId}
              miniproyectoId={workshop.isMiniproyecto ? workshop.id : null}
              title="Cliente del Proyecto"
              subtitle="Cliente simulado del proyecto"
              contextLabel={workshop.title}
            />

            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <label className="text-sm text-gray-700 font-semibold">Respuesta del estudiante</label>
                  <p className="text-xs text-gray-500 mt-1">
                    A partir del chat con la IA, responde las tareas solicitadas.
                  </p>
                </div>
                <span
                  className="text-[11px] px-4 py-1 rounded-full border"
                  style={{ color: subjectColor, borderColor: `${subjectColor}40`, backgroundColor: `${subjectColor}10` }}
                >
                  Evaluación automática
                </span>
              </div>

              <div className="my-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600">
                <p className="font-semibold text-gray-700">Criterios de evaluación</p>
                {isManagementWorkshop ? (
                  <ul className="mt-2 list-disc pl-4 space-y-1">
                    <li>Se revisan actividades y rubros clave, no una fecha o costo exacto.</li>
                    <li>El cronograma suma más si las fases siguen un orden lógico y las fechas son coherentes.</li>
                    <li>Los costos suman más si los subtotales y el total general son consistentes.</li>
                    <li>Registro de supuestos para respaldar la estimación realizada con IA.</li>
                  </ul>
                ) : (
                  <ul className="mt-2 list-disc pl-4 space-y-1">
                    <li>Las respuestas se comparan con criterios esperados por palabras clave.</li>
                    <li>Incluye conceptos del cliente, fechas y términos específicos.</li>
                    <li>Mientras más completos y concretos sean los ítems, mejor puntuación.</li>
                  </ul>
                )}
              </div>
              {isManagementWorkshop ? (
                <div className="space-y-4">
                  {/* Objetivo principal */}
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <label className="text-xs text-gray-500">Objetivo principal</label>
                    <textarea
                      value={projectObjective}
                      onChange={(event) => setProjectObjective(event.target.value)}
                      rows={3}
                      placeholder="Resume el propósito central del proyecto..."
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                    />
                  </div>
                  {/* Objetivos específicos */}
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <label className="text-xs text-gray-500">Objetivos específicos</label>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={specificObjectiveInput}
                        onChange={(event) => setSpecificObjectiveInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') { event.preventDefault(); const t = specificObjectiveInput.trim(); if (!t) return; setSpecificObjectivesList((p) => [...p, t]); setSpecificObjectiveInput(''); }
                        }}
                        placeholder="Agregar objetivo específico"
                        className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                      />
                      <button type="button" onClick={() => { const t = specificObjectiveInput.trim(); if (!t) return; setSpecificObjectivesList((p) => [...p, t]); setSpecificObjectiveInput(''); }} className="px-4 py-2 rounded-xl bg-[#4A90E2] text-white text-xs">Agregar</button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {specificObjectivesList.map((item, index) => (
                        <span key={`${item}-${index}`} className="inline-flex items-center gap-2 bg-cyan-50 text-cyan-700 px-3 py-1 rounded-full text-xs">
                          {item}
                          <button type="button" onClick={() => setSpecificObjectivesList((p) => p.filter((_, i) => i !== index))} className="text-cyan-600">×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Entregables */}
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <label className="text-xs text-gray-500">Entregables clave</label>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Pista: se esperan {expectedManagementCounts?.scope ?? 3} entregables.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={scopeInput}
                        onChange={(event) => setScopeInput(event.target.value)}
                        placeholder="Agregar entregable"
                        className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = scopeInput.trim();
                          if (!trimmed) return;
                          setScopeList((prev) => [...prev, trimmed]);
                          setScopeInput('');
                        }}
                        className="px-4 py-2 rounded-xl bg-[#4A90E2] text-white text-xs"
                      >
                        Agregar
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {scopeList.map((item, index) => (
                        <span key={`${item}-${index}`} className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs">
                          {item}
                          <button type="button" onClick={() => setScopeList((prev) => prev.filter((_, i) => i !== index))} className="text-blue-600">×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Cronograma / Hitos */}
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <label className="text-xs text-gray-500">Hitos del proyecto</label>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Pista: se esperan {expectedManagementCounts?.schedule ?? 3} hitos en el cronograma.
                    </p>
                    <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 overflow-x-auto">
                      <div className="bg-gray-50 text-[11px] text-gray-500" style={{ display: 'grid', gridTemplateColumns: '2.6fr 1fr 1fr 80px', minWidth: '400px' }}>
                        <div className="px-3 py-2">Hito</div>
                        <div className="px-3 py-2">Inicio</div>
                        <div className="px-3 py-2">Fin</div>
                        <div className="px-3 py-2 text-right">Acción</div>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {scheduleRows.map((row, index) => (
                          <div key={index} className="px-3 py-2" style={{ display: 'grid', gridTemplateColumns: '2.6fr 1fr 1fr 80px', gap: '8px', alignItems: 'center' }}>
                            <input value={row.activity} onChange={(event) => { const u = [...scheduleRows]; u[index] = { ...u[index], activity: event.target.value }; setScheduleRows(u); }} placeholder="Hito" className="rounded-lg border border-gray-200 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30" />
                            <input type="date" value={row.start} onChange={(event) => { const u = [...scheduleRows]; u[index] = { ...u[index], start: event.target.value }; setScheduleRows(u); }} className="rounded-lg border border-gray-200 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30" />
                            <input type="date" value={row.end} onChange={(event) => { const u = [...scheduleRows]; u[index] = { ...u[index], end: event.target.value }; setScheduleRows(u); }} className="rounded-lg border border-gray-200 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30" />
                            <button type="button" onClick={() => { if (scheduleRows.length === 1) { setScheduleRows([{ activity: '', start: '', end: '' }]); return; } setScheduleRows(scheduleRows.filter((_, i) => i !== index)); }} className="text-xs text-red-500 hover:text-red-600 justify-self-end">Quitar</button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button type="button" onClick={() => setScheduleRows([...scheduleRows, { activity: '', start: '', end: '' }])} className="text-xs text-blue-600 hover:text-blue-700">+ Agregar fila</button>
                    </div>
                  </div>
                  {/* Costos por entregable */}
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <label className="text-xs text-gray-500">Costos por entregable</label>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Pista: se esperan {expectedManagementCounts?.costs ?? 3} ítems de costos.
                    </p>
                    <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 overflow-x-auto">
                      <div className="bg-gray-50 text-[11px] text-gray-500" style={{ display: 'grid', gridTemplateColumns: '2.6fr 1fr 1.4fr 80px', minWidth: '440px' }}>
                        <div className="px-3 py-2">Entregable</div>
                        <div className="px-3 py-2">Cantidad</div>
                        <div className="px-3 py-2">Precio unitario</div>
                        <div className="px-3 py-2 text-right">Acción</div>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {costRows.map((row, index) => (
                          <div key={index} className="px-3 py-2" style={{ display: 'grid', gridTemplateColumns: '2.6fr 1fr 1.4fr 80px', gap: '8px', alignItems: 'center' }}>
                            <input value={row.concept} onChange={(event) => { const u = [...costRows]; u[index] = { ...u[index], concept: event.target.value }; setCostRows(u); }} placeholder="Entregable" className="rounded-lg border border-gray-200 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30" />
                            <input type="number" inputMode="numeric" min={0} step="1" value={row.quantity} onChange={(event) => { const u = [...costRows]; u[index] = { ...u[index], quantity: event.target.value }; setCostRows(u); }} placeholder="Cantidad" className="rounded-lg border border-gray-200 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30" />
                            <input type="number" inputMode="decimal" min={0} step="0.01" value={row.unitCost} onChange={(event) => { const u = [...costRows]; u[index] = { ...u[index], unitCost: event.target.value }; setCostRows(u); }} placeholder="Precio unitario" className="rounded-lg border border-gray-200 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30" />
                            <button type="button" onClick={() => { if (costRows.length === 1) { setCostRows([{ concept: '', quantity: '', unitCost: '' }]); return; } setCostRows(costRows.filter((_, i) => i !== index)); }} className="text-xs text-red-500 hover:text-red-600 justify-self-end">Quitar</button>
                          </div>
                        ))}
                      </div>
                      <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-100">Subtotal fila calculado automáticamente</div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button type="button" onClick={() => setCostRows([...costRows, { concept: '', quantity: '', unitCost: '' }])} className="text-xs text-blue-600 hover:text-blue-700">
                        + Agregar fila
                      </button>
                    </div>
                    {/* Imprevistos y Utilidad */}
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-gray-500">Imprevistos (%)</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.1"
                          value={imprevistos}
                          onChange={(event) => setImprevistos(event.target.value)}
                          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-500">Utilidad (%)</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.1"
                          value={utilidad}
                          onChange={(event) => setUtilidad(event.target.value)}
                          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                        />
                      </div>
                    </div>
                    {/* Resumen de costos */}
                    <div className="mt-4 rounded-xl bg-gray-50 border border-gray-200 p-3 text-xs text-gray-700 space-y-1">
                      <div className="flex justify-between"><span>Subtotal entregables</span><span className="font-mono">{formatCurrency(totalCost)}</span></div>
                      <div className="flex justify-between text-gray-500"><span>Imprevistos ({imprevistos}%)</span><span className="font-mono">{formatCurrency(contingencyValue)}</span></div>
                      <div className="flex justify-between text-gray-500"><span>Utilidad ({utilidad}%)</span><span className="font-mono">{formatCurrency(utilityValue)}</span></div>
                      <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold text-[#3A4A5B]"><span>Total proyecto</span><span className="font-mono">{formatCurrency(projectTotal)}</span></div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <label className="text-xs text-gray-500">Supuestos del proyecto</label>
                    {expectedManagementCounts?.supuestos ? (
                      <p className="text-[11px] text-gray-400 mt-1">
                        Pista: se esperan {expectedManagementCounts.supuestos} supuestos.
                      </p>
                    ) : null}
                    <div className="mt-2 flex gap-2">
                      <input
                        value={supuestosInput}
                        onChange={(event) => setSupuestosInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            const trimmed = supuestosInput.trim();
                            if (!trimmed) return;
                            setSupuestosList((prev) => [...prev, trimmed]);
                            setSupuestosInput('');
                          }
                        }}
                        placeholder="Agregar supuesto"
                        className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = supuestosInput.trim();
                          if (!trimmed) return;
                          setSupuestosList((prev) => [...prev, trimmed]);
                          setSupuestosInput('');
                        }}
                        className="px-4 py-2 rounded-xl bg-[#4A90E2] text-white text-xs"
                      >
                        Agregar
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {supuestosList.map((item, index) => (
                        <span
                          key={`${item}-${index}`}
                          className="inline-flex items-center gap-2 bg-slate-50 text-slate-700 px-3 py-1 rounded-full text-xs border border-slate-200"
                        >
                          {item}
                          <button
                            type="button"
                            onClick={() => setSupuestosList((prev) => prev.filter((_, i) => i !== index))}
                            className="text-slate-500"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <label className="text-xs text-gray-500">Stakeholders</label>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Pista: se esperan {expectedCounts?.stakeholders ?? 4} stakeholders.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={stakeholderInput}
                        onChange={(event) => setStakeholderInput(event.target.value)}
                        placeholder="Agregar stakeholder"
                        className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = stakeholderInput.trim();
                          if (!trimmed) return;
                          setStakeholdersList((prev) => [...prev, trimmed]);
                          setStakeholderInput('');
                        }}
                        className="px-4 py-2 rounded-xl bg-[#4A90E2] text-white text-xs"
                      >
                        Agregar
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {stakeholdersList.map((item, index) => (
                        <span
                          key={`${item}-${index}`}
                          className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs"
                        >
                          {item}
                          <button
                            type="button"
                            onClick={() => setStakeholdersList((prev) => prev.filter((_, i) => i !== index))}
                            className="text-blue-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <label className="text-xs text-gray-500">Requisitos funcionales</label>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Pista: se esperan {expectedCounts?.functional ?? 6} requisitos funcionales.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={functionalInput}
                        onChange={(event) => setFunctionalInput(event.target.value)}
                        placeholder="Agregar requisito funcional"
                        className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = functionalInput.trim();
                          if (!trimmed) return;
                          setFunctionalList((prev) => [...prev, trimmed]);
                          setFunctionalInput('');
                        }}
                        className="px-4 py-2 rounded-xl bg-[#4A90E2] text-white text-xs"
                      >
                        Agregar
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {functionalList.map((item, index) => (
                        <span
                          key={`${item}-${index}`}
                          className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs"
                        >
                          {item}
                          <button
                            type="button"
                            onClick={() => setFunctionalList((prev) => prev.filter((_, i) => i !== index))}
                            className="text-green-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <label className="text-xs text-gray-500">Requisitos no funcionales</label>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Pista: se esperan {expectedCounts?.nonFunctional ?? 5} requisitos no funcionales.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={nonFunctionalInput}
                        onChange={(event) => setNonFunctionalInput(event.target.value)}
                        placeholder="Agregar requisito no funcional"
                        className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = nonFunctionalInput.trim();
                          if (!trimmed) return;
                          setNonFunctionalList((prev) => [...prev, trimmed]);
                          setNonFunctionalInput('');
                        }}
                        className="px-4 py-2 rounded-xl bg-[#4A90E2] text-white text-xs"
                      >
                        Agregar
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {nonFunctionalList.map((item, index) => (
                        <span
                          key={`${item}-${index}`}
                          className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs"
                        >
                          {item}
                          <button
                            type="button"
                            onClick={() => setNonFunctionalList((prev) => prev.filter((_, i) => i !== index))}
                            className="text-orange-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {evaluation && (
              <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm text-gray-600">Resultado de la evaluación</h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${evaluation.puntaje >= 70 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {evaluation.puntaje >= 70 ? 'Aprobado' : 'No aprobado'}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold" style={{ color: evaluation.puntaje >= 70 ? '#15803d' : '#b91c1c' }}>
                    {evaluation.puntaje}
                  </div>
                  <div className="text-sm text-gray-500">/ 100</div>
                </div>
                {evaluation.criterios && evaluation.criterios.length > 0 && (
                  <div className="space-y-2">
                    {evaluation.criterios.map((criterio) => (
                      <div
                        key={criterio.criterio}
                        className={`rounded-lg border px-3 py-2 text-xs ${criterio.cumplido ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span>{criterio.criterio}</span>
                          <span>{criterio.cumplido ? 'Cumple' : 'No cumple'}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-3 text-[11px] opacity-90">
                          <span>{typeof criterio.detalle === 'string' ? criterio.detalle : 'Evaluación por rúbrica'}</span>
                          <span>{typeof criterio.puntaje === 'number' ? `${criterio.puntaje}/100` : ''}{typeof criterio.peso === 'number' ? ` · Peso ${criterio.peso}%` : ''}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-center justify-end px-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setPendingEstado('COMPLETADO');
                  setShowConfirmModal(true);
                }}
                disabled={isSaving || !workshop.isMiniproyecto}
                className="px-6 py-2 rounded-lg text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: subjectColor }}
              >
                <CheckCircle2 className="w-4 h-4" />
                Completar tarea
              </button>
            </div>
          </div>
          {saveMessage && (
            <div className="mt-3 px-4 text-sm text-gray-600">
              {saveMessage}
            </div>
          )}
        </div>
      </div>

      {showConfirmModal && pendingEstado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg text-[#3A4A5B] mb-2">Confirmar envío</h3>
            <p className="text-sm text-gray-600 mb-6">
              {pendingEstado === 'COMPLETADO'
                ? 'La respuesta será evaluada y el miniproyecto quedará marcado como completado.'
                : 'El progreso actual será guardado. La edición podrá continuar posteriormente.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                onClick={() => {
                  setShowConfirmModal(false);
                  setPendingEstado(null);
                }}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 rounded-lg text-white"
                style={{ backgroundColor: subjectColor }}
                onClick={() => {
                  const estado = pendingEstado;
                  setShowConfirmModal(false);
                  setPendingEstado(null);
                  handlePersistProgress(estado);
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {showResultModal && evaluation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg text-[#3A4A5B]">Resultado de la evaluación</h3>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${evaluation.puntaje >= 70 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
              >
                {evaluation.puntaje >= 70 ? 'Aprobado' : 'Reprobado'}
              </span>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-3xl font-bold" style={{ color: evaluation.puntaje >= 70 ? '#15803d' : '#b91c1c' }}>
                {evaluation.puntaje}
              </div>
              <div className="text-sm text-gray-500">/ 100</div>
            </div>
            {evaluation.criterios && evaluation.criterios.length > 0 && (
              <div className="space-y-2 mb-4">
                {evaluation.criterios.map((criterio) => (
                  <div
                    key={criterio.criterio}
                    className={`rounded-lg border px-3 py-2 text-xs ${criterio.cumplido ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span>{criterio.criterio}</span>
                      <span>{criterio.cumplido ? 'Cumple' : 'No cumple'}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3 text-[11px] opacity-90">
                      <span>{typeof criterio.detalle === 'string' ? criterio.detalle : 'Evaluación por rúbrica'}</span>
                      <span>{typeof criterio.puntaje === 'number' ? `${criterio.puntaje}/100` : ''}{typeof criterio.peso === 'number' ? ` · Peso ${criterio.peso}%` : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg text-white"
                style={{ backgroundColor: subjectColor }}
                onClick={() => {
                  setShowResultModal(false);
                  onBack();
                }}
              >
                Siguiente
              </button>
              <button
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                onClick={() => setShowResultModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface TaskItemProps {
  number: number;
  text: string;
  completed?: boolean;
  active?: boolean;
  subjectColor: string;
  taskColor: string;
  filled?: number;
  expected?: number;
}

function TaskItem({ number, text, completed, active, subjectColor, taskColor, filled = 0, expected = 1 }: TaskItemProps) {
  const progressPct = expected > 0 ? Math.min(100, Math.round((filled / expected) * 100)) : 0;
  return (
    <div
      className="flex flex-col gap-1.5 p-3 border-2 rounded-xl transition-all"
      style={{
        borderColor: taskColor,
        backgroundColor: `${taskColor}10`
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-xs shadow-sm"
          style={{
            borderColor: taskColor,
            backgroundColor: taskColor,
            color: 'white'
          }}
        >
          {number}
        </div>
        <span className={`text-sm flex-1 ${active ? 'text-[#3A4A5B]' : 'text-gray-600'}`}>
          {text}
        </span>
      </div>
    </div>
  );
}