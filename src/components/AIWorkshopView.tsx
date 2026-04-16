import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Lightbulb, FileText, Check, Save } from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';
import { MiniproyectoChatbotPanel } from './MiniproyectoChatbotPanel';


interface AIWorkshopViewProps {
  subjectName: string;
  workshop: {
    id: string;
    title: string;
    isMiniproyecto?: boolean;
    actividadId?: number;
    areaId?: number;
    areaNombre?: string;
  };
  onBack: () => void;
  estudianteId?: number;
}

const normalizeAreaName = (value?: string | null) =>
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

type ScheduleRow = { milestone: string; start: string; end: string };
type CostRow = { deliverable: string; unitMeasure: string; quantity: string; unitPrice: string };

const UNIT_MEASURE_OPTIONS = ['Unidad', 'Hora', 'Día', 'Semana', 'Mes', 'Licencia', 'Documento', 'Paquete'];

const MANAGEMENT_DEVELOPMENT_DEFAULTS = {
  objective: 'Digitalizar la matricula para reducir tiempos y errores administrativos.',
  specificObjectives: [
    'Permitir la inscripcion en linea',
    'Enviar notificaciones al estudiante'
  ],
  deliverables: [
    'Modulo de matricula en linea',
    'Notificaciones por correo',
    'Panel administrativo basico'
  ],
  schedule: [
    { milestone: 'Definicion de requisitos', start: '2026-04-02', end: '2026-04-05' },
    { milestone: 'Desarrollo del modulo', start: '2026-04-06', end: '2026-04-18' },
    { milestone: 'Pruebas y cierre', start: '2026-04-19', end: '2026-04-24' }
  ] satisfies ScheduleRow[],
  costs: [
    { deliverable: 'Modulo de matricula en linea', unitMeasure: 'Unidad', quantity: '1', unitPrice: '2500000' },
    { deliverable: 'Notificaciones por correo', unitMeasure: 'Licencia', quantity: '1', unitPrice: '400000' },
    { deliverable: 'Panel administrativo basico', unitMeasure: 'Unidad', quantity: '1', unitPrice: '1800000' }
  ] satisfies CostRow[],
  assumptions: [
    'La institucion asigna 2 administrativos para validar requisitos en la semana 1',
    'El proyecto cuenta con 1 analista y 2 desarrolladores durante 3 semanas',
    'La licencia de correo se adquiere por 1 mes para la salida inicial'
  ]
};

const workshopConfigs = {
  analysis: {
    description: (
      <>
        En este taller interactuarás con un cliente simulado por IA que te 
        presentará un proyecto real. Tu objetivo es realizar el análisis de 
        requisitos completo del sistema.
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
        En este taller interactuarás con un cliente simulado por IA para entender
        el charter del proyecto. Tu objetivo es resumir qué busca el cliente y,
        a partir de eso, proponer alcance, cronograma y costos de forma coherente.
      </>
    ),
    tasks: [
      'Definir objetivo principal',
      'Definir objetivos específicos',
      'Definir entregables',
      'Definir hitos del proyecto',
      'Estimar costos por entregable'
    ]
  }
};

const taskColors = ['#4A90E2', '#7ED6A7', '#F5A97F', '#A78BFA', '#FBBF24', '#60A5FA'];

export function AIWorkshopView({ subjectName, workshop, onBack, estudianteId }: AIWorkshopViewProps) {
  const [currentTask, setCurrentTask] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [studentResponse, setStudentResponse] = useState('');
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
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([
    { milestone: '', start: '', end: '' }
  ]);
  const [costRows, setCostRows] = useState<CostRow[]>([]);
  const [contingencyPercentage, setContingencyPercentage] = useState('5');
  const [utilityPercentage, setUtilityPercentage] = useState('10');
  const [managementAssumptionsList, setManagementAssumptionsList] = useState<string[]>([]);
  const [managementAssumptionInput, setManagementAssumptionInput] = useState('');
  const [expectedCounts, setExpectedCounts] = useState<{ stakeholders: number; functional: number; nonFunctional: number } | null>(null);
  const [expectedManagementCounts, setExpectedManagementCounts] = useState<{ scope: number; schedule: number; costs: number } | null>(null);
  const [evaluation, setEvaluation] = useState<{
    puntaje: number;
    criterios?: Array<{ criterio: string; cumplido: boolean; puntaje?: number; peso?: number; detalle?: string }>;
  } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingEstado, setPendingEstado] = useState<'ENVIADO' | 'COMPLETADO' | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const subjectColor = subjectColors[subjectName] || '#4A90E2';
  const normalizedAreaName = normalizeAreaName(workshop.areaNombre || subjectName);
  const isManagementWorkshop = normalizedAreaName.includes('alcance') || normalizedAreaName.includes('gestion');
  const workshopConfig = isManagementWorkshop ? workshopConfigs.management : workshopConfigs.analysis;
  const totalTasks = workshopConfig.tasks.length;

  const buildScheduleList = (rows: ScheduleRow[]) =>
    rows
      .filter((row) => row.milestone || row.start || row.end)
      .map((row, index) =>
        `Hito ${index + 1}: ${row.milestone || '-'} | Inicio: ${row.start || '-'} | Fin: ${row.end || '-'}`
      );

  const parseNumber = (value: string) => {
    const normalized = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

  const calculateRowTotal = (row: CostRow) =>
    parseNumber(row.quantity) * parseNumber(row.unitPrice);

  const totalCost = costRows.reduce((sum, row) => sum + calculateRowTotal(row), 0);
  const contingencyValue = totalCost * (parseNumber(contingencyPercentage) / 100);
  const utilityValue = totalCost * (parseNumber(utilityPercentage) / 100);
  const projectTotal = totalCost + contingencyValue + utilityValue;

  const createDefaultCostRow = (deliverable: string): CostRow => ({
    deliverable,
    unitMeasure: UNIT_MEASURE_OPTIONS[0],
    quantity: '',
    unitPrice: ''
  });

  const normalizeDate = (value?: string) => {
    if (!value) return '';
    if (/\d{4}-\d{2}-\d{2}/.test(value)) return value;
    if (/\d{2}\/\d{2}\/\d{4}/.test(value)) {
      const [day, month, year] = value.split('/');
      return `${year}-${month}-${day}`;
    }
    return value;
  };

  const parseAssumptionsList = (value: unknown) => {
    if (Array.isArray(value)) {
      return value.map((item) => item?.toString?.().trim?.() ?? '').filter(Boolean);
    }

    if (typeof value !== 'string') return [];

    const normalized = value
      .split(/\r?\n+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (normalized.length > 1) return normalized;

    return value
      .split(/[.;]\s+/)
      .map((item) => item.trim().replace(/[.;]+$/g, ''))
      .filter(Boolean);
  };

  const parseExpectedScheduleRows = (value: unknown) => {
    const scheduleItems = Array.isArray(value) ? value : [];
    const parsedRows = scheduleItems.map((entry) => {
      if (entry && typeof entry === 'object') {
        const objectEntry = entry as { milestone?: string; hito?: string; activity?: string; actividad?: string; tarea?: string; date?: string; fecha?: string; start?: string; inicio?: string; end?: string; fin?: string };
        return {
          milestone: (objectEntry.milestone ?? objectEntry.hito ?? objectEntry.activity ?? objectEntry.actividad ?? objectEntry.tarea ?? '').toString(),
          start: normalizeDate((objectEntry.start ?? objectEntry.inicio ?? objectEntry.date ?? objectEntry.fecha ?? '').toString()),
          end: normalizeDate((objectEntry.end ?? objectEntry.fin ?? objectEntry.date ?? objectEntry.fecha ?? '').toString())
        };
      }

      const text = entry?.toString?.() ?? '';
      const activityMatch = text.match(/(?:Hito|Actividad)\s*\d*:?\s*([^|]+)\|/i);
      const startMatch = text.match(/Inicio\s*:?\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}\/\d{2}\/\d{4})/i);
      const endMatch = text.match(/Fin\s*:?\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}\/\d{2}\/\d{4})/i);
      const dateMatch = text.match(/Fecha\s*:?\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}\/\d{2}\/\d{4})/i);

      return {
        milestone: activityMatch ? activityMatch[1].trim() : text,
        start: normalizeDate(startMatch?.[1] || dateMatch?.[1]),
        end: normalizeDate(endMatch?.[1] || dateMatch?.[1])
      };
    }).filter((row) => row.milestone || row.start || row.end);

    return parsedRows.length > 0 ? parsedRows : [{ milestone: '', start: '', end: '' }];
  };

  const parseExpectedCostRows = (value: unknown) => {
    const costItems = Array.isArray(value) ? value : [];
    let parsedContingency = '5';
    let parsedUtility = '10';
    const parsedRows = costItems.map((entry) => {
      if (entry && typeof entry === 'object') {
        const objectEntry = entry as { deliverable?: string; entregable?: string; concept?: string; concepto?: string; unitMeasure?: string; unidadMedida?: string; quantity?: string | number; cantidad?: string | number; unitPrice?: string | number; precioUnitario?: string | number; unitCost?: string | number; costoUnitario?: string | number };
        return {
          deliverable: (objectEntry.deliverable ?? objectEntry.entregable ?? objectEntry.concept ?? objectEntry.concepto ?? '').toString(),
          unitMeasure: (objectEntry.unitMeasure ?? objectEntry.unidadMedida ?? UNIT_MEASURE_OPTIONS[0]).toString(),
          quantity: (objectEntry.quantity ?? objectEntry.cantidad ?? '').toString(),
          unitPrice: (objectEntry.unitPrice ?? objectEntry.precioUnitario ?? objectEntry.unitCost ?? objectEntry.costoUnitario ?? '').toString()
        };
      }

      const text = entry?.toString?.() ?? '';
      if (/imprevistos/i.test(text)) {
        const percentageMatch = text.match(/([0-9]+(?:[.,][0-9]+)?)\s*%/);
        parsedContingency = percentageMatch?.[1]?.replace(',', '.') || parsedContingency;
        return null;
      }

      if (/utilidad/i.test(text)) {
        const percentageMatch = text.match(/([0-9]+(?:[.,][0-9]+)?)\s*%/);
        parsedUtility = percentageMatch?.[1]?.replace(',', '.') || parsedUtility;
        return null;
      }

      if (/total\s+general|total\s*:|total proyecto/i.test(text)) return null;

      const deliverableMatch = text.match(/(?:Entregable|Costo|Concepto)\s*\d*:?\s*([^|]+)\|/i);
      const unitMeasureMatch = text.match(/Unidad\s+de\s+medida\s*:?\s*([^|]+)/i);
      const quantityMatch = text.match(/Cantidad\s*:?\s*([0-9.,]+)/i);
      const unitCostMatch = text.match(/(?:Precio|Costo)\s*unitario\s*:?\s*([0-9.,]+)/i);

      return {
        deliverable: deliverableMatch ? deliverableMatch[1].trim() : text,
        unitMeasure: unitMeasureMatch ? unitMeasureMatch[1].trim() : UNIT_MEASURE_OPTIONS[0],
        quantity: quantityMatch?.[1] ?? '',
        unitPrice: unitCostMatch?.[1] ?? ''
      };
    }).filter((row): row is CostRow => Boolean(row && (row.deliverable || row.quantity || row.unitPrice)));

    setContingencyPercentage(parsedContingency);
    setUtilityPercentage(parsedUtility);

    return parsedRows;
  };

  const buildCostList = (rows: CostRow[]) =>
    rows
      .filter((row) => row.deliverable || row.quantity || row.unitPrice)
      .map((row, index) =>
        `Entregable ${index + 1}: ${row.deliverable || '-'} | Unidad de medida: ${row.unitMeasure || '-'} | Cantidad: ${row.quantity || '-'} | Precio unitario: ${row.unitPrice || '-'} | Subtotal: ${formatCurrency(calculateRowTotal(row))}`
      )
      .concat([
        `Total: ${formatCurrency(totalCost)}`,
        `Imprevistos: ${contingencyPercentage || '0'}% | Valor: ${formatCurrency(contingencyValue)}`,
        `Utilidad: ${utilityPercentage || '0'}% | Valor: ${formatCurrency(utilityValue)}`,
        `Total proyecto: ${formatCurrency(projectTotal)}`
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
        const expectedRaw = data?.respuesta_miniproyecto || data?.respuestaMiniproyecto || data?.Miniproyecto?.respuesta_miniproyecto;
        if (!expectedRaw) return;

        const parsed = typeof expectedRaw === 'string' ? JSON.parse(expectedRaw) : expectedRaw;
        if (isManagementWorkshop) {
          const deliverables = Array.isArray(parsed?.entregables)
            ? parsed.entregables.length
            : Array.isArray(parsed?.alcance)
              ? parsed.alcance.length
              : 0;
          const schedule = Array.isArray(parsed?.cronograma) ? parsed.cronograma.length : 0;
          if (deliverables || schedule) {
            setExpectedManagementCounts({ scope: deliverables, schedule, costs: deliverables });
          }

          const defaultScope = Array.isArray(parsed?.entregables)
            ? parsed.entregables.map((item: unknown) => item?.toString?.().trim?.() ?? '').filter(Boolean)
            : Array.isArray(parsed?.alcance)
              ? parsed.alcance.map((item: unknown) => item?.toString?.().trim?.() ?? '').filter(Boolean)
              : [];
          const defaultObjective = Array.isArray(parsed?.objetivoPrincipal)
            ? parsed.objetivoPrincipal[0]?.toString?.().trim?.() ?? ''
            : Array.isArray(parsed?.objetivo)
              ? parsed.objetivo[0]?.toString?.().trim?.() ?? ''
              : '';
          const defaultSpecificObjectives = Array.isArray(parsed?.objetivosEspecificos)
            ? parsed.objetivosEspecificos.map((item: unknown) => item?.toString?.().trim?.() ?? '').filter(Boolean)
            : [];
          const defaultAssumptions = parseAssumptionsList(
            parsed?.supuestos ?? parsed?.justificacionGestion ?? parsed?.justificacion ?? parsed?.notas
          );
          const defaultSchedule = parseExpectedScheduleRows(parsed?.cronograma);
          const defaultCosts = parseExpectedCostRows(parsed?.costos);

          if (defaultObjective) {
            setProjectObjective((prev) => prev || defaultObjective);
          }

          if (defaultSpecificObjectives.length > 0) {
            setSpecificObjectivesList((prev) => (prev.length > 0 ? prev : defaultSpecificObjectives));
          }

          if (defaultScope.length > 0) {
            setScopeList((prev) => (prev.length > 0 ? prev : defaultScope));
          }

          if (defaultAssumptions.length > 0) {
            setManagementAssumptionsList((prev) => (prev.length > 0 ? prev : defaultAssumptions));
          }

          setScheduleRows((prev) => (
            prev.some((row) => row.milestone || row.start || row.end)
              ? prev
              : defaultSchedule
          ));

          setCostRows((prev) => (
            prev.some((row) => row.deliverable || row.quantity || row.unitPrice)
              ? prev
              : defaultCosts
          ));
        } else {
          const stakeholders = Array.isArray(parsed?.stakeholders) ? parsed.stakeholders.length : 0;
          const functional = Array.isArray(parsed?.requisitosFuncionales) ? parsed.requisitosFuncionales.length : 0;
          const nonFunctional = Array.isArray(parsed?.requisitosNoFuncionales) ? parsed.requisitosNoFuncionales.length : 0;
          if (stakeholders || functional || nonFunctional) {
            setExpectedCounts({ stakeholders, functional, nonFunctional });
          }
        }
      } catch (error) {
        console.warn('No se pudieron cargar las pistas del miniproyecto:', error);
      }
    };

    fetchExpectedCounts();
  }, [workshop.id, workshop.isMiniproyecto, isManagementWorkshop]);

  useEffect(() => {
    if (!isManagementWorkshop) return;

    setCostRows((prev) => {
      const deliverables = scopeList.map((item) => item.trim()).filter(Boolean);
      if (deliverables.length === 0) return [];

      return deliverables.map((deliverable) => {
        const existing = prev.find((row) => normalizeAreaName(row.deliverable) === normalizeAreaName(deliverable));
        return existing
          ? { ...existing, deliverable }
          : createDefaultCostRow(deliverable);
      });
    });
  }, [scopeList, isManagementWorkshop]);

  useEffect(() => {
    if (!isManagementWorkshop) return;

    const hasExistingContent =
      Boolean(projectObjective.trim()) ||
      specificObjectivesList.length > 0 ||
      scopeList.length > 0 ||
      scheduleRows.some((row) => row.milestone || row.start || row.end) ||
      costRows.some((row) => row.deliverable || row.quantity || row.unitPrice) ||
      managementAssumptionsList.length > 0;

    if (hasExistingContent) return;

    setProjectObjective(MANAGEMENT_DEVELOPMENT_DEFAULTS.objective);
    setSpecificObjectivesList(MANAGEMENT_DEVELOPMENT_DEFAULTS.specificObjectives);
    setScopeList(MANAGEMENT_DEVELOPMENT_DEFAULTS.deliverables);
    setScheduleRows(MANAGEMENT_DEVELOPMENT_DEFAULTS.schedule);
    setCostRows(MANAGEMENT_DEVELOPMENT_DEFAULTS.costs);
    setManagementAssumptionsList(MANAGEMENT_DEVELOPMENT_DEFAULTS.assumptions);
  }, [
    isManagementWorkshop,
    projectObjective,
    specificObjectivesList,
    scopeList,
    scheduleRows,
    costRows,
    managementAssumptionsList
  ]);

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
          entregables: scopeList,
          cronograma: buildScheduleList(scheduleRows),
          costos: buildCostList(costRows),
          supuestos: managementAssumptionsList
        }
      : {
          stakeholders: stakeholdersList,
          requisitosFuncionales: functionalList,
          requisitosNoFuncionales: nonFunctionalList
        };

    const respuesta = JSON.stringify({
      mensajes: [],
      tareaActual: currentTask,
      totalTareas: totalTasks,
      respuestaEstudiante
    });

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/respuestasEstudianteMiniproyecto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          <h2 className="text-sm">Taller Evaluativo</h2>
          <p className="text-xs text-white/80 mt-1">{workshop.title}</p>
        </div>

        {/* Workshop Info */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-[#3A4A5B] mb-3">Descripción del Taller</h3>
          <p className="text-gray-700 text-sm mb-4">
            {workshopConfig.description}
          </p>
          
          {/* Progress */}
          <div 
            className="border-2 p-4 rounded-xl"
            style={{ 
              backgroundColor: `${subjectColor}10`,
              borderColor: `${subjectColor}40`
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-700">Progreso</span>
              <span className="text-sm" style={{ color: subjectColor }}>{currentTask}/{totalTasks} tareas</span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${(currentTask / totalTasks) * 100}%`,
                  backgroundColor: subjectColor
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Tasks Checklist */}
        <div className="p-6">
          <h3 className="text-[#3A4A5B] mb-4">Tareas a Completar</h3>
          <div className="space-y-3">
            {workshopConfig.tasks.map((task, index) => (
              <TaskItem
                key={task}
                number={index + 1}
                text={task}
                completed={index === 0}
                active={index === 1}
                subjectColor={subjectColor}
                taskColor={taskColors[index % taskColors.length]}
              />
            ))}
          </div>

          {/* Help Section */}
          <div className="mt-6 border-t border-gray-200 pt-6">
            <h4 className="text-[#3A4A5B] mb-3 text-sm">Consejos</h4>
            <div className="space-y-3 text-xs text-gray-700">
              <div className="flex gap-3 items-start">
                <div 
                  className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${subjectColor}20` }}
                >
                  <Lightbulb className="w-3 h-3" style={{ color: subjectColor }} />
                </div>
                <span>Haz preguntas específicas al cliente para obtener información clara</span>
              </div>
              <div className="flex gap-3 items-start">
                <div 
                  className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${subjectColor}20` }}
                >
                  <FileText className="w-3 h-3" style={{ color: subjectColor }} />
                </div>
                <span>Documenta todas las respuestas importantes</span>
              </div>
              <div className="flex gap-3 items-start">
                <div 
                  className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${subjectColor}20` }}
                >
                  <Check className="w-3 h-3" style={{ color: subjectColor }} />
                </div>
                <span>Verifica tu comprensión repitiendo lo entendido</span>
              </div>
            </div>
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
              <div className="space-y-3 text-xs text-gray-700">
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                  Tu respuesta se evalúa con una rúbrica ponderada por secciones. Cada sección se considera cumplida desde 70%.
                </div>
                <div className="grid gap-2">
                  <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2">
                      <strong>Objetivo principal:</strong> debe resumir con claridad el propósito central del proyecto según el acta de inicio.
                  </div>
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2">
                      <strong>Objetivos específicos y entregables:</strong> deben concretar lo que se va a lograr y lo que luego se va a costear.
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                      <strong>Cronograma:</strong> suma más cuando los hitos tienen orden lógico y fechas de inicio y fin coherentes.
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                      <strong>Costos:</strong> se revisa la consistencia entre entregable, cantidad, precio unitario, subtotales y total del proyecto.
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <strong>Supuestos:</strong> sirven como apoyo para documentar el razonamiento del estudiante, pero no afectan el puntaje de cronograma ni costos.
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-600">
                  No necesitas coincidir exactamente con una única respuesta: necesitas justificar una propuesta coherente.
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-gray-700">
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                  Tu respuesta se evalúa con una rúbrica ponderada por secciones. Cada sección se considera cumplida desde 70%.
                </div>
                <div className="grid gap-2">
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2">
                    <strong>Stakeholders:</strong> roles reales del proyecto (usuario final, admin, cliente).
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                    <strong>Requisitos funcionales:</strong> acciones o funcionalidades concretas.
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                    <strong>Requisitos no funcionales:</strong> rendimiento, seguridad, disponibilidad, etc.
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] text-gray-600">
                  Usa términos específicos y evita respuestas genéricas para obtener mejor puntaje.
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
              areaId={workshop.areaId}
              miniproyectoId={workshop.isMiniproyecto ? workshop.id : null}
              title="Cliente del Proyecto"
              subtitle="Este chatbot reemplaza la integración anterior de TextCortex"
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
                <p className="font-semibold text-gray-700">¿Cómo se evalúa?</p>
                {isManagementWorkshop ? (
                  <ul className="mt-2 list-disc pl-4 space-y-1">
                    <li>Se revisa que el objetivo principal y los objetivos específicos sí correspondan al charter.</li>
                    <li>Los entregables clave deben ser coherentes con lo que luego vas a costear.</li>
                    <li>El cronograma suma más si los hitos siguen un orden lógico y las fechas de inicio y fin son coherentes.</li>
                    <li>Los costos suman más si subtotales, imprevistos, utilidad y total del proyecto son consistentes.</li>
                    <li>Los supuestos sirven para documentar el análisis, pero no cambian el puntaje de cronograma ni costos.</li>
                  </ul>
                ) : (
                  <ul className="mt-2 list-disc pl-4 space-y-1">
                    <li>Se comparan tus respuestas con criterios esperados por palabras clave.</li>
                    <li>Incluye conceptos del cliente, fechas y términos específicos.</li>
                    <li>Mientras más completos y concretos sean los ítems, mejor puntuación.</li>
                  </ul>
                )}
              </div>
              {isManagementWorkshop ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <label className="text-xs text-gray-500">Objetivo principal</label>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Resume en 1 o 2 líneas el propósito central del proyecto según el charter.
                    </p>
                    <textarea
                      value={projectObjective}
                      onChange={(event) => setProjectObjective(event.target.value)}
                      placeholder="Ejemplo: desarrollar una plataforma para digitalizar la matrícula y reducir errores operativos."
                      rows={3}
                      className="mt-3 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                    />
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <label className="text-xs text-gray-500">Objetivos específicos</label>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Define 2 o 3 objetivos específicos que desarrollen el objetivo principal.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={specificObjectiveInput}
                        onChange={(event) => setSpecificObjectiveInput(event.target.value)}
                        placeholder="Agregar objetivo específico"
                        className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = specificObjectiveInput.trim();
                          if (!trimmed) return;
                          setSpecificObjectivesList((prev) => [...prev, trimmed]);
                          setSpecificObjectiveInput('');
                        }}
                        className="px-4 py-2 rounded-xl bg-[#4A90E2] text-white text-xs"
                      >
                        Agregar
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {specificObjectivesList.map((item, index) => (
                        <span
                          key={`${item}-${index}`}
                          className="inline-flex items-center gap-2 bg-cyan-50 text-cyan-700 px-3 py-1 rounded-full text-xs"
                        >
                          {item}
                          <button
                            type="button"
                            onClick={() => setSpecificObjectivesList((prev) => prev.filter((_, i) => i !== index))}
                            className="text-cyan-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <label className="text-xs text-gray-500">Entregables clave</label>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Pista: se esperan {expectedManagementCounts?.scope ?? 3} entregables clave. Estos mismos se usarán en la tabla de costos.
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
                        <span
                          key={`${item}-${index}`}
                          className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs"
                        >
                          {item}
                          <button
                            type="button"
                            onClick={() => setScopeList((prev) => prev.filter((_, i) => i !== index))}
                            className="text-blue-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <label className="text-xs text-gray-500">Hitos del proyecto</label>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Pista: se esperan {expectedManagementCounts?.schedule ?? 3} hitos clave en el cronograma.
                    </p>
                    <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">
                      <div
                        className="bg-gray-50 text-[11px] text-gray-500"
                        style={{ display: 'grid', gridTemplateColumns: '2.4fr 1fr 1fr 80px' }}
                      >
                        <div className="px-3 py-2">Hito</div>
                        <div className="px-3 py-2">Inicio</div>
                        <div className="px-3 py-2">Fin</div>
                        <div className="px-3 py-2 text-right">Acción</div>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {scheduleRows.map((row, index) => (
                          <div
                            key={index}
                            className="px-3 py-2"
                            style={{ display: 'grid', gridTemplateColumns: '2.4fr 1fr 1fr 80px', gap: '8px', alignItems: 'center' }}
                          >
                            <input
                              value={row.milestone}
                              onChange={(event) => {
                                const updated = [...scheduleRows];
                                updated[index] = { ...updated[index], milestone: event.target.value };
                                setScheduleRows(updated);
                              }}
                              placeholder="Hito"
                              className="rounded-lg border border-gray-200 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                            />
                            <input
                              type="date"
                              value={row.start}
                              onChange={(event) => {
                                const updated = [...scheduleRows];
                                updated[index] = { ...updated[index], start: event.target.value };
                                setScheduleRows(updated);
                              }}
                              placeholder="Inicio"
                              className="rounded-lg border border-gray-200 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                            />
                            <input
                              type="date"
                              value={row.end}
                              onChange={(event) => {
                                const updated = [...scheduleRows];
                                updated[index] = { ...updated[index], end: event.target.value };
                                setScheduleRows(updated);
                              }}
                              placeholder="Fin"
                              className="rounded-lg border border-gray-200 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (scheduleRows.length === 1) {
                                  setScheduleRows([{ milestone: '', start: '', end: '' }]);
                                  return;
                                }
                                setScheduleRows(scheduleRows.filter((_, rowIndex) => rowIndex !== index));
                              }}
                              className="text-xs text-red-500 hover:text-red-600 justify-self-end"
                            >
                              Quitar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setScheduleRows([...scheduleRows, { milestone: '', start: '', end: '' }])}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        + Agregar fila
                      </button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <label className="text-xs text-gray-500">Costos por entregable</label>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Los entregables se cargan automáticamente desde la sección anterior. Solo completa unidad de medida, cantidad, precio unitario e indicadores porcentuales.
                    </p>
                    <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">
                      <div
                        className="bg-gray-50 text-[11px] text-gray-500"
                        style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.2fr 0.9fr 1.2fr 1fr' }}
                      >
                        <div className="px-3 py-2">Entregable</div>
                        <div className="px-3 py-2">Unidad de medida</div>
                        <div className="px-3 py-2">Cantidad</div>
                        <div className="px-3 py-2">Precio unitario</div>
                        <div className="px-3 py-2 text-right">Subtotal</div>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {costRows.map((row, index) => (
                          <div
                            key={index}
                            className="px-3 py-2"
                            style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.2fr 0.9fr 1.2fr 1fr', gap: '8px', alignItems: 'center' }}
                          >
                            <input
                              value={row.deliverable}
                              readOnly
                              className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-2 text-xs text-gray-600"
                            />
                            <select
                              value={row.unitMeasure}
                              onChange={(event) => {
                                const updated = [...costRows];
                                updated[index] = { ...updated[index], unitMeasure: event.target.value };
                                setCostRows(updated);
                              }}
                              className="rounded-lg border border-gray-200 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                            >
                              {UNIT_MEASURE_OPTIONS.map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              step="1"
                              value={row.quantity}
                              onChange={(event) => {
                                const updated = [...costRows];
                                updated[index] = { ...updated[index], quantity: event.target.value };
                                setCostRows(updated);
                              }}
                              placeholder="Cantidad"
                              className="rounded-lg border border-gray-200 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                            />
                            <input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step="0.01"
                              value={row.unitPrice}
                              onChange={(event) => {
                                const updated = [...costRows];
                                updated[index] = { ...updated[index], unitPrice: event.target.value };
                                setCostRows(updated);
                              }}
                              placeholder="Precio unitario"
                              className="rounded-lg border border-gray-200 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                            />
                            <div className="text-right text-xs font-semibold text-gray-700">
                              {formatCurrency(calculateRowTotal(row))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="grid gap-3 border-t border-gray-200 px-3 py-3 text-xs text-gray-600 md:grid-cols-[1fr_auto] md:items-center">
                        <div className="grid gap-2 md:grid-cols-2">
                          <label className="flex items-center gap-2">
                            <span>Imprevistos (%)</span>
                            <input
                              type="number"
                              min={0}
                              step="0.1"
                              value={contingencyPercentage}
                              onChange={(event) => setContingencyPercentage(event.target.value)}
                              className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-xs"
                            />
                          </label>
                          <label className="flex items-center gap-2">
                            <span>Utilidad (%)</span>
                            <input
                              type="number"
                              min={0}
                              step="0.1"
                              value={utilityPercentage}
                              onChange={(event) => setUtilityPercentage(event.target.value)}
                              className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-xs"
                            />
                          </label>
                        </div>
                        <div className="space-y-1 text-right">
                          <div>Total: <span className="font-semibold">{formatCurrency(totalCost)}</span></div>
                          <div>Imprevistos: <span className="font-semibold">{formatCurrency(contingencyValue)}</span></div>
                          <div>Utilidad: <span className="font-semibold">{formatCurrency(utilityValue)}</span></div>
                          <div>Total proyecto: <span className="font-semibold">{formatCurrency(projectTotal)}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <label className="text-xs text-gray-500">Supuestos cuantificables</label>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Agrega un supuesto por ítem. Cada uno debe ser concreto y verificable: cantidad de personas, tiempo, licencias, infraestructura o condiciones de ejecución.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={managementAssumptionInput}
                        onChange={(event) => setManagementAssumptionInput(event.target.value)}
                        placeholder="Ejemplo: La institución asigna 2 administrativos para validar requisitos en la semana 1"
                        className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = managementAssumptionInput.trim();
                          if (!trimmed) return;
                          setManagementAssumptionsList((prev) => [...prev, trimmed]);
                          setManagementAssumptionInput('');
                        }}
                        className="px-4 py-2 rounded-xl bg-[#4A90E2] text-white text-xs"
                      >
                        Agregar
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {managementAssumptionsList.map((item, index) => (
                        <span
                          key={`${item}-${index}`}
                          className="inline-flex items-center gap-2 bg-slate-50 text-slate-700 px-3 py-1 rounded-full text-xs"
                        >
                          {item}
                          <button
                            type="button"
                            onClick={() => setManagementAssumptionsList((prev) => prev.filter((_, i) => i !== index))}
                            className="text-slate-600"
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
          <div className="flex items-center justify-between px-4">
            <div className="text-gray-600 text-sm">
              Tarea actual: <span style={{ color: subjectColor }}>{currentTask} de {totalTasks}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setPendingEstado('ENVIADO');
                  setShowConfirmModal(true);
                }}
                disabled={isSaving || !workshop.isMiniproyecto}
                className="border-2 border-gray-300 px-5 py-2 rounded-lg bg-white hover:bg-gray-50 text-gray-700 text-sm transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                Guardar progreso
              </button>
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
            <h3 className="text-lg text-[#3A4A5B] mb-2">¿Confirmar envío?</h3>
            <p className="text-sm text-gray-600 mb-6">
              {pendingEstado === 'COMPLETADO'
                ? 'Se evaluará tu respuesta y se marcará el miniproyecto como completado.'
                : 'Se guardará tu progreso actual. Podrás seguir editando luego.'}
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
}

function TaskItem({ number, text, completed, active, subjectColor, taskColor }: TaskItemProps) {
  return (
    <div 
      className="flex items-start gap-3 p-3 border-2 rounded-xl transition-all"
      style={{
        borderColor: taskColor,
        backgroundColor: `${taskColor}10`
      }}
    >
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
      <span className={`text-sm ${
        active ? 'text-[#3A4A5B]' :
        'text-gray-600'
      }`}>
        {text}
      </span>
    </div>
  );
}