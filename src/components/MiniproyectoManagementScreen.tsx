import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ClipboardList, RefreshCw, Save, Search } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { API_BASE_URL } from '../utils/constants';
import { createQuillModules, loadQuill } from '../utils/quill';

interface MiniproyectoManagementScreenProps {
  onBack: () => void;
}

interface AreaInfo {
  id: number;
  nombre: string;
}

interface TipoActividadInfo {
  id: number;
  nombre?: string;
}

interface ActividadInfo {
  id?: number;
  titulo?: string;
  descripcion?: string;
  nivel_dificultad?: string;
  fecha_creacion?: string;
  tipo?: TipoActividadInfo;
}

interface MiniproyectoItem {
  id: number;
  actividad_id?: number;
  entregable?: string;
  respuesta_miniproyecto?: string;
  Area?: AreaInfo;
  Actividad?: ActividadInfo;
}

interface EditFormData {
  titulo: string;
  descripcion: string;
  nivel_dificultad: string;
  entregable: string;
  respuesta_miniproyecto: string;
}

type ScheduleRow = { milestone: string; start: string; end: string };
type CostRow = { deliverable: string; unitMeasure: string; quantity: string; unitPrice: string };

const UNIT_MEASURE_OPTIONS = ['Unidad', 'Hora', 'Día', 'Semana', 'Mes', 'Licencia', 'Documento', 'Paquete'];

type ExpectedSnapshot =
  | {
      mode: 'analysis';
      stakeholders: string[];
      requisitosFuncionales: string[];
      requisitosNoFuncionales: string[];
    }
  | {
      mode: 'management';
      objetivoPrincipal: string[];
      objetivosEspecificos: string[];
      entregables: string[];
      cronograma: string[];
      costos: string[];
      supuestos: string[];
    };

const normalizeAreaName = (value?: string | null) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export function MiniproyectoManagementScreen({ onBack }: MiniproyectoManagementScreenProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<any>(null);
  const [miniproyectos, setMiniproyectos] = useState<MiniproyectoItem[]>([]);
  const [selected, setSelected] = useState<MiniproyectoItem | null>(null);
  const [formData, setFormData] = useState<EditFormData>({
    titulo: '',
    descripcion: '',
    nivel_dificultad: '',
    entregable: '',
    respuesta_miniproyecto: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [sintaxisRequerida, setSintaxisRequerida] = useState<string[]>([]);
  const [lenguajesPermitidos, setLenguajesPermitidos] = useState<number[]>([]);
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
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([
    { milestone: '', start: '', end: '' }
  ]);
  const [costRows, setCostRows] = useState<CostRow[]>([]);
  const [contingencyPercentage, setContingencyPercentage] = useState('5');
  const [utilityPercentage, setUtilityPercentage] = useState('10');
  const [assumptionsList, setAssumptionsList] = useState<string[]>([]);
  const [assumptionInput, setAssumptionInput] = useState('');
  const [scopeInput, setScopeInput] = useState('');
  const [showExpectedModal, setShowExpectedModal] = useState(false);
  const [expectedSnapshot, setExpectedSnapshot] = useState<ExpectedSnapshot | null>(null);

  // El tipo de editor depende del area del miniproyecto, no del id de la actividad.
  const selectedAreaName = normalizeAreaName(selected?.Area?.nombre);
  const isProgrammingMiniproyecto = selectedAreaName.includes('programacion');
  const isManagementMiniproyecto = selectedAreaName.includes('alcance') || selectedAreaName.includes('gestion');

  useEffect(() => {
    if (!isProgrammingMiniproyecto) return;

    let cancelled = false;

    const ensureQuill = async () => {
      if (!editorRef.current) return;
      const Quill = await loadQuill();
      if (cancelled || !editorRef.current) return;
      if (!quillRef.current) {
        editorRef.current.innerHTML = '';
        quillRef.current = new Quill(editorRef.current, {
          theme: 'snow',
          placeholder: 'Ingrese la descripcion del miniproyecto',
          modules: createQuillModules()
        });
        quillRef.current.on('text-change', () => {
          setFormData((prev) => ({ ...prev, descripcion: quillRef.current.root.innerHTML }));
        });
      }
    };

    ensureQuill();

    if (quillRef.current) {
      quillRef.current.root.innerHTML = formData.descripcion || '';
    }

    return () => {
      cancelled = true;
    };
  }, [selected, formData.descripcion, isProgrammingMiniproyecto]);

  const lenguajesDisponibles = [
    { id: 62, nombre: 'Java', extension: '.java', ejemplo: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hola Mundo");\n  }\n}' },
    { id: 71, nombre: 'Python', extension: '.py', ejemplo: '# Escribe tu código aquí\nprint("Hola Mundo")' },
    { id: 63, nombre: 'JavaScript', extension: '.js', ejemplo: '// Escribe tu código aquí\nconsole.log("Hola Mundo");' },
    { id: 50, nombre: 'C', extension: '.c', ejemplo: '#include <stdio.h>\n\nint main() {\n  printf("Hola Mundo\\n");\n  return 0;\n}' },
    { id: 54, nombre: 'C++', extension: '.cpp', ejemplo: '#include <iostream>\nusing namespace std;\n\nint main() {\n  cout << "Hola Mundo" << endl;\n  return 0;\n}' },
    { id: 51, nombre: 'C#', extension: '.cs', ejemplo: 'using System;\n\nclass Program {\n  static void Main() {\n    Console.WriteLine("Hola Mundo");\n  }\n}' }
  ];

  const sintaxisDisponibles = ['while', 'for', 'if', 'switch'];

  useEffect(() => {
    loadMiniproyectos();
  }, []);

  const loadMiniproyectos = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/miniproyectos`);
      if (!response.ok) {
        throw new Error('No se pudieron cargar los miniproyectos');
      }
      const data = await response.json();
      setMiniproyectos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error en loadMiniproyectos:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar miniproyectos');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMiniproyectos = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return miniproyectos;
    return miniproyectos.filter((item) => {
      const titulo = item.Actividad?.titulo?.toLowerCase() || '';
      const area = item.Area?.nombre?.toLowerCase() || '';
      const nivel = item.Actividad?.nivel_dificultad?.toLowerCase() || '';
      return titulo.includes(term) || area.includes(term) || nivel.includes(term);
    });
  }, [miniproyectos, query]);

  const parseNumber = (value: string) => {
    const normalized = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

  const buildScheduleList = (rows: ScheduleRow[]) =>
    rows
      .filter((row) => row.milestone || row.start || row.end)
      .map((row, index) =>
        `Hito ${index + 1}: ${row.milestone || '-'} | Inicio: ${row.start || '-'} | Fin: ${row.end || '-'}`
      );

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

  const buildCostList = (rows: CostRow[]) => {
    const lines = rows
      .filter((row) => row.deliverable || row.quantity || row.unitPrice)
      .map((row, index) =>
        `Entregable ${index + 1}: ${row.deliverable || '-'} | Unidad de medida: ${row.unitMeasure || '-'} | Cantidad: ${row.quantity || '-'} | Precio unitario: ${row.unitPrice || '-'} | Subtotal: ${formatCurrency(calculateRowTotal(row))}`
      );
    return [
      ...lines,
      `Total: ${formatCurrency(totalCost)}`,
      `Imprevistos: ${contingencyPercentage || '0'}% | Valor: ${formatCurrency(contingencyValue)}`,
      `Utilidad: ${utilityPercentage || '0'}% | Valor: ${formatCurrency(utilityValue)}`,
      `Total proyecto: ${formatCurrency(projectTotal)}`
    ];
  };

  const handleSelect = (item: MiniproyectoItem) => {
    setSelected(item);
    let parsedStakeholders: string[] = [];
    let parsedFunctional: string[] = [];
    let parsedNonFunctional: string[] = [];
    let parsedObjective = '';
    let parsedSpecificObjectives: string[] = [];
    let parsedScope: string[] = [];
    let parsedAssumptions: string[] = [];
    let parsedSchedule: ScheduleRow[] = [];
    let parsedCosts: CostRow[] = [];
    let parsedEsperado = '';
    let parsedSintaxis: string[] = [];
    let parsedLenguajes: number[] = [];

    if (item.respuesta_miniproyecto) {
      try {
        const parsed = JSON.parse(item.respuesta_miniproyecto);
        parsedStakeholders = Array.isArray(parsed?.stakeholders) ? parsed.stakeholders : [];
        parsedFunctional = Array.isArray(parsed?.requisitosFuncionales) ? parsed.requisitosFuncionales : [];
        parsedNonFunctional = Array.isArray(parsed?.requisitosNoFuncionales) ? parsed.requisitosNoFuncionales : [];
        parsedObjective = Array.isArray(parsed?.objetivoPrincipal)
          ? parsed.objetivoPrincipal[0]?.toString?.().trim?.() ?? ''
          : Array.isArray(parsed?.objetivo)
            ? parsed.objetivo[0]?.toString?.().trim?.() ?? ''
            : typeof parsed?.objetivoPrincipal === 'string'
              ? parsed.objetivoPrincipal.trim()
              : typeof parsed?.objetivo === 'string'
                ? parsed.objetivo.trim()
                : '';
        parsedSpecificObjectives = Array.isArray(parsed?.objetivosEspecificos)
          ? parsed.objetivosEspecificos.map((item: unknown) => item?.toString?.().trim?.() ?? '').filter(Boolean)
          : [];
        parsedScope = Array.isArray(parsed?.entregables)
          ? parsed.entregables
          : Array.isArray(parsed?.alcance)
            ? parsed.alcance
            : [];
        parsedAssumptions = parseAssumptionsList(
          parsed?.supuestos ?? parsed?.justificacionGestion ?? parsed?.justificacion ?? parsed?.notas
        );
        if (parsed?.tipo === 'programacion') {
          parsedEsperado = parsed?.esperado || '';
          parsedSintaxis = Array.isArray(parsed?.sintaxis) ? parsed.sintaxis : [];
          parsedLenguajes = Array.isArray(parsed?.lenguajesPermitidos) ? parsed.lenguajesPermitidos : [];
        }
        const cronogramaRaw = Array.isArray(parsed?.cronograma) ? parsed.cronograma : [];
        parsedSchedule = cronogramaRaw.map((entry: any) => {
          if (entry && typeof entry === 'object') {
            return {
              milestone: (entry.milestone ?? entry.hito ?? entry.activity ?? entry.actividad ?? entry.tarea ?? '').toString(),
              start: (entry.start ?? entry.inicio ?? entry.date ?? entry.fecha ?? '').toString(),
              end: (entry.end ?? entry.fin ?? entry.date ?? entry.fecha ?? '').toString()
            };
          }

          const text = entry?.toString?.() ?? '';
          const activityMatch = text.match(/(?:Hito|Actividad)\s*\d*:?\s*([^|]+)\|/i);
          const startMatch = text.match(/Inicio\s*:?\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}\/[0-9]{2}\/[0-9]{4})/i);
          const endMatch = text.match(/Fin\s*:?\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}\/[0-9]{2}\/[0-9]{4})/i);
          const dateMatch = text.match(/Fecha\s*:?\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}\/[0-9]{2}\/[0-9]{4})/i);
          const normalizeDate = (value?: string) => {
            if (!value) return '';
            if (/\d{4}-\d{2}-\d{2}/.test(value)) return value;
            if (/\d{2}\/\d{2}\/\d{4}/.test(value)) {
              const [day, month, year] = value.split('/');
              return `${year}-${month}-${day}`;
            }
            return value;
          };

          return {
            milestone: activityMatch ? activityMatch[1].trim() : text,
            start: normalizeDate(startMatch?.[1] || dateMatch?.[1]),
            end: normalizeDate(endMatch?.[1] || dateMatch?.[1])
          };
        });

        const costosRaw = Array.isArray(parsed?.costos) ? parsed.costos : [];
        parsedCosts = costosRaw.map((entry: any) => {
          if (entry && typeof entry === 'object') {
            return {
              deliverable: (entry.deliverable ?? entry.entregable ?? entry.concept ?? entry.concepto ?? '').toString(),
              unitMeasure: (entry.unitMeasure ?? entry.unidadMedida ?? UNIT_MEASURE_OPTIONS[0]).toString(),
              quantity: (entry.quantity ?? entry.cantidad ?? '').toString(),
              unitPrice: (entry.unitPrice ?? entry.precioUnitario ?? entry.unitCost ?? entry.costoUnitario ?? '').toString()
            };
          }

          const text = entry?.toString?.() ?? '';
          if (/imprevistos/i.test(text)) {
            const percentageMatch = text.match(/([0-9]+(?:[.,][0-9]+)?)\s*%/);
            setContingencyPercentage(percentageMatch?.[1]?.replace(',', '.') || '5');
            return null;
          }

          if (/utilidad/i.test(text)) {
            const percentageMatch = text.match(/([0-9]+(?:[.,][0-9]+)?)\s*%/);
            setUtilityPercentage(percentageMatch?.[1]?.replace(',', '.') || '10');
            return null;
          }

          if (/total\s+general|total\s*:|total proyecto/i.test(text)) return null;

          const conceptMatch = text.match(/(?:Entregable|Costo|Concepto)\s*\d*:?\s*([^|]+)\|/i);
          const unitMeasureMatch = text.match(/Unidad\s+de\s+medida\s*:?\s*([^|]+)/i);
          const qtyMatch = text.match(/Cantidad\s*:?\s*([0-9.,]+)/i);
          const unitMatch = text.match(/(?:Precio|Costo)\s*unitario\s*:?\s*([0-9.,]+)/i);

          return {
            deliverable: conceptMatch ? conceptMatch[1].trim() : text,
            unitMeasure: unitMeasureMatch ? unitMeasureMatch[1].trim() : UNIT_MEASURE_OPTIONS[0],
            quantity: qtyMatch?.[1] ?? '',
            unitPrice: unitMatch?.[1] ?? ''
          };
        }).filter(Boolean);
      } catch (err) {
        parsedStakeholders = [];
        parsedFunctional = [];
        parsedNonFunctional = [];
        parsedObjective = '';
        parsedSpecificObjectives = [];
        parsedScope = [];
        parsedAssumptions = [];
        parsedSchedule = [];
        parsedCosts = [];
      }
    }

    setFormData({
      titulo: item.Actividad?.titulo || '',
      descripcion: item.Actividad?.descripcion || '',
      nivel_dificultad: item.Actividad?.nivel_dificultad || '',
      entregable: item.entregable || '',
      respuesta_miniproyecto: item.respuesta_miniproyecto || ''
    });
    setStakeholdersList(parsedStakeholders);
    setFunctionalList(parsedFunctional);
    setNonFunctionalList(parsedNonFunctional);
    setProjectObjective(parsedObjective);
    setSpecificObjectivesList(parsedSpecificObjectives);
    setAssumptionsList(parsedAssumptions);
    setStakeholderInput('');
    setFunctionalInput('');
    setNonFunctionalInput('');
    setScopeList(parsedScope);
    setScheduleRows(parsedSchedule.length > 0 ? parsedSchedule : [{ milestone: '', start: '', end: '' }]);
    setCostRows(parsedCosts);
    setAssumptionInput('');
    setScopeInput('');
    const normalizedItemAreaName = normalizeAreaName(item.Area?.nombre);
    const isProgrammingItem = normalizedItemAreaName.includes('programacion');
    if (isProgrammingItem) {
      setExpectedOutput(parsedEsperado || item.respuesta_miniproyecto || '');
      setSintaxisRequerida(parsedSintaxis);
      setLenguajesPermitidos(parsedLenguajes);
    } else {
      setExpectedOutput('');
      setSintaxisRequerida([]);
      setLenguajesPermitidos([]);
    }
  };

  const addListItem = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>, reset: () => void) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setter((prev) => [...prev, trimmed]);
    reset();
  };

  const removeListItem = (index: number, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (field: keyof EditFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSintaxis = (sintaxis: string) => {
    setSintaxisRequerida((prev) =>
      prev.includes(sintaxis) ? prev.filter((s) => s !== sintaxis) : [...prev, sintaxis]
    );
  };

  const toggleLenguajePermitido = (lenguajeId: number) => {
    setLenguajesPermitidos((prev) =>
      prev.includes(lenguajeId) ? prev.filter((id) => id !== lenguajeId) : [...prev, lenguajeId]
    );
  };

  useEffect(() => {
    if (!isManagementMiniproyecto) return;

    setCostRows((prev) => {
      const deliverables = scopeList.map((item) => item.trim()).filter(Boolean);
      if (deliverables.length === 0) return [];

      return deliverables.map((deliverable) => {
        const existing = prev.find((row) => normalizeAreaName(row.deliverable) === normalizeAreaName(deliverable));
        return existing ? { ...existing, deliverable } : createDefaultCostRow(deliverable);
      });
    });
  }, [scopeList, isManagementMiniproyecto]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;

    if (isProgrammingMiniproyecto) {
      if (!expectedOutput.trim()) {
        setError('Define la salida esperada antes de guardar.');
        return;
      }
    }

    setIsSaving(true);
    setError(null);

    try {
      const scheduleList = buildScheduleList(scheduleRows);
      const costsList = buildCostList(costRows);

      const response = await fetch(`${API_BASE_URL}/miniproyectos/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: formData.titulo,
          descripcion: formData.descripcion,
          nivel_dificultad: formData.nivel_dificultad,
          entregable: formData.entregable,
          respuesta_miniproyecto: isProgrammingMiniproyecto
            ? JSON.stringify({
                tipo: 'programacion',
                esperado: expectedOutput.trim(),
                sintaxis: sintaxisRequerida,
                lenguajesPermitidos
              })
            : isManagementMiniproyecto
              ? JSON.stringify({
                  objetivoPrincipal: projectObjective.trim() ? [projectObjective.trim()] : [],
                  objetivosEspecificos: specificObjectivesList,
                  entregables: scopeList,
                  cronograma: scheduleList,
                  costos: costsList,
                  supuestos: assumptionsList
                })
              : JSON.stringify({
                  stakeholders: stakeholdersList,
                  requisitosFuncionales: functionalList,
                  requisitosNoFuncionales: nonFunctionalList
                })
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al actualizar el miniproyecto');
      }

      setMiniproyectos((prev) =>
        prev.map((item) => {
          if (item.id !== selected.id) return item;
          return {
            ...item,
            entregable: formData.entregable,
            respuesta_miniproyecto: isProgrammingMiniproyecto
              ? JSON.stringify({
                  tipo: 'programacion',
                  esperado: expectedOutput.trim(),
                  sintaxis: sintaxisRequerida,
                  lenguajesPermitidos
                })
              : isManagementMiniproyecto
                ? JSON.stringify({
                    objetivoPrincipal: projectObjective.trim() ? [projectObjective.trim()] : [],
                    objetivosEspecificos: specificObjectivesList,
                    entregables: scopeList,
                    cronograma: scheduleList,
                    costos: costsList,
                    supuestos: assumptionsList
                  })
                : JSON.stringify({
                    stakeholders: stakeholdersList,
                    requisitosFuncionales: functionalList,
                    requisitosNoFuncionales: nonFunctionalList
                  }),
            Actividad: {
              ...(item.Actividad || {}),
              titulo: formData.titulo,
              descripcion: formData.descripcion,
              nivel_dificultad: formData.nivel_dificultad
            }
          };
        })
      );

      if (!isProgrammingMiniproyecto) {
        if (isManagementMiniproyecto) {
          setExpectedSnapshot({
            mode: 'management',
            objetivoPrincipal: projectObjective.trim() ? [projectObjective.trim()] : [],
            objetivosEspecificos: specificObjectivesList,
            entregables: scopeList,
            cronograma: scheduleList,
            costos: costsList,
            supuestos: assumptionsList
          });
        } else {
          setExpectedSnapshot({
            mode: 'analysis',
            stakeholders: stakeholdersList,
            requisitosFuncionales: functionalList,
            requisitosNoFuncionales: nonFunctionalList
          });
        }
        setShowExpectedModal(true);
      }

      setSelected(null);
    } catch (err) {
      console.error('Error actualizando miniproyecto:', err);
      setError(err instanceof Error ? err.message : 'Error al actualizar el miniproyecto');
    } finally {
      setIsSaving(false);
    }
  };

  const totalMiniproyectos = miniproyectos.length;
  const resultadosMostrados = filteredMiniproyectos.length;

  const kpiCards = [
    {
      label: 'Miniproyectos totales',
      value: String(totalMiniproyectos),
      bg: '#4A90E2'
    },
    {
      label: 'Resultados visibles',
      value: String(resultadosMostrados),
      bg: '#14B8A6'
    },
    {
      label: 'Seleccionado',
      value: selected?.Actividad?.titulo || 'Sin selección',
      bg: '#8B5CF6'
    }
  ];

  const getMiniproyectoTone = (index: number) => {
    const tones = [
      { bg: '#EAF3FF', border: '#4A90E2' },
      { bg: '#EAFBF7', border: '#14B8A6' },
      { bg: '#FFF6EA', border: '#F59E0B' },
      { bg: '#F3EEFF', border: '#8B5CF6' }
    ];
    return tones[index % tones.length];
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="max-w-7xl mx-auto px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2.5 shadow-md">
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-[#3A4A5B]">Gestión de Miniproyectos</h1>
                <p className="text-gray-500 text-sm">Panel de Docente - EduPath</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-full">
                <span>Total:</span>
                <span className="font-semibold text-gray-700">{totalMiniproyectos}</span>
              </div>
              <button
                onClick={loadMiniproyectos}
                className="app-btn app-btn-secondary px-4 py-2 text-gray-600 hover:text-[#4A90E2]"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm">Actualizar</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <button
          onClick={onBack}
          className="app-back-button mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Panel</span>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {kpiCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl shadow-md p-4 text-white"
              style={{ backgroundColor: card.bg }}
            >
              <p className="text-xs text-white/90">{card.label}</p>
              <p className="text-2xl font-semibold text-white truncate">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-8">
          <section className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-[#3A4A5B] text-lg font-semibold">Listado de Miniproyectos</h2>
                <p className="text-sm text-gray-500">Selecciona un miniproyecto para editarlo.</p>
              </div>
              <div className="relative w-full sm:w-auto">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por título, área o nivel"
                  className="w-full sm:w-80 h-11 pl-10 pr-4 border border-gray-300 rounded-lg text-sm leading-5 focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent bg-white"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="py-10 text-center text-gray-500">Cargando miniproyectos...</div>
            ) : error ? (
              <div className="py-10 text-center text-red-600">{error}</div>
            ) : filteredMiniproyectos.length === 0 ? (
              <div className="py-10 text-center text-gray-500">
                No hay miniproyectos que coincidan con la búsqueda.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredMiniproyectos.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`w-full text-left border rounded-2xl p-5 transition-all hover:shadow-lg ${
                      selected?.id === item.id ? 'shadow-md' : ''
                    }`}
                    style={
                      selected?.id === item.id
                        ? {
                            backgroundColor: '#EAF3FF',
                            borderColor: '#4A90E2'
                          }
                        : {
                            backgroundColor: getMiniproyectoTone(index).bg,
                            borderColor: getMiniproyectoTone(index).border
                          }
                    }
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-[#3A4A5B]">
                          {item.Actividad?.titulo || 'Sin título'}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-xs px-2.5 py-1 rounded-full bg-white/80 text-gray-700">
                            Área: {item.Area?.nombre || 'Sin área'}
                          </span>
                          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                            Nivel: {item.Actividad?.nivel_dificultad || 'No definido'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[#4A90E2]">
                        <ClipboardList className="w-5 h-5" />
                        <span className="text-sm font-medium">Editar</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-[#3A4A5B] text-lg font-semibold mb-4">Editar Miniproyecto</h2>
            {!selected ? (
              <div className="py-12 text-center text-gray-500">
                Selecciona un miniproyecto para editar sus datos.
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">Título</label>
                  <input
                    value={formData.titulo}
                    onChange={(event) => handleChange('titulo', event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">Descripción</label>
                  {isProgrammingMiniproyecto ? (
                    <div className="quill-editor-container">
                      <div
                        ref={editorRef}
                        className="w-full"
                        data-placeholder="Ingrese la descripcion del miniproyecto"
                      />
                    </div>
                  ) : (
                    <textarea
                      value={formData.descripcion}
                      onChange={(event) => handleChange('descripcion', event.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">Nivel de dificultad</label>
                  <input
                    value={formData.nivel_dificultad}
                    onChange={(event) => handleChange('nivel_dificultad', event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">Entregable</label>
                  <input
                    value={formData.entregable}
                    onChange={(event) => handleChange('entregable', event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                  />
                </div>
                {isProgrammingMiniproyecto ? (
                  <div className="space-y-4">
                    <div className="space-y-4 rounded-lg border border-blue-100 bg-blue-50/40 p-4">
                      <div>
                        <label className="text-sm text-gray-600">Sintaxis requerida</label>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {sintaxisDisponibles.map((sintaxis) => (
                            <label key={sintaxis} className="flex items-center gap-2 text-xs text-gray-700">
                              <input
                                type="checkbox"
                                checked={sintaxisRequerida.includes(sintaxis)}
                                onChange={() => toggleSintaxis(sintaxis)}
                                className="h-4 w-4"
                              />
                              <span className="font-mono">{sintaxis}</span>
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Define estructuras obligatorias para validar el codigo.</p>
                      </div>

                      <div>
                        <label className="text-sm text-gray-600">Lenguajes permitidos</label>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {lenguajesDisponibles.map((lenguaje) => (
                            <label key={lenguaje.id} className="flex items-center gap-2 text-xs text-gray-700">
                              <input
                                type="checkbox"
                                checked={lenguajesPermitidos.includes(lenguaje.id)}
                                onChange={() => toggleLenguajePermitido(lenguaje.id)}
                                className="h-4 w-4"
                              />
                              <span>{lenguaje.nombre}</span>
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Si no seleccionas ninguno, se permiten todos.</p>
                      </div>

                      <div>
                        <label className="text-sm text-gray-600">Salida esperada</label>
                        <textarea
                          value={expectedOutput}
                          onChange={(event) => setExpectedOutput(event.target.value)}
                          rows={4}
                          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          placeholder="Ejemplo: 1 2 3"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {isManagementMiniproyecto ? (
                      <>
                        <div>
                          <label className="text-sm text-gray-600">Objetivo principal</label>
                          <textarea
                            value={projectObjective}
                            onChange={(event) => setProjectObjective(event.target.value)}
                            rows={3}
                            placeholder="Resume el propósito central del proyecto según el charter."
                            className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                          />
                        </div>

                        <div>
                          <label className="text-sm text-gray-600">Objetivos específicos</label>
                          <div className="mt-2 flex gap-2">
                            <input
                              value={specificObjectiveInput}
                              onChange={(event) => setSpecificObjectiveInput(event.target.value)}
                              placeholder="Agregar objetivo específico"
                              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                            />
                            <button
                              type="button"
                              onClick={() => addListItem(specificObjectiveInput, setSpecificObjectivesList, () => setSpecificObjectiveInput(''))}
                              className="px-4 py-2 rounded-lg bg-[#4A90E2] text-white text-sm"
                            >
                              Agregar
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {specificObjectivesList.map((item, index) => (
                              <span key={`${item}-${index}`} className="inline-flex items-center gap-2 bg-cyan-50 text-cyan-700 px-3 py-1 rounded-full text-xs">
                                {item}
                                <button type="button" onClick={() => removeListItem(index, setSpecificObjectivesList)} className="text-cyan-600">×</button>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-sm text-gray-600">Entregables clave</label>
                          <div className="mt-2 flex gap-2">
                            <input
                              value={scopeInput}
                              onChange={(event) => setScopeInput(event.target.value)}
                              placeholder="Agregar entregable"
                              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                            />
                            <button
                              type="button"
                              onClick={() => addListItem(scopeInput, setScopeList, () => setScopeInput(''))}
                              className="px-4 py-2 rounded-lg bg-[#4A90E2] text-white text-sm"
                            >
                              Agregar
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {scopeList.map((item, index) => (
                              <span key={`${item}-${index}`} className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs">
                                {item}
                                <button type="button" onClick={() => removeListItem(index, setScopeList)} className="text-blue-600">×</button>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-sm text-gray-600">Hitos del proyecto</label>
                          <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">
                            <div
                              className="bg-gray-50 text-[11px] text-gray-500"
                              style={{ display: 'grid', gridTemplateColumns: '2.4fr 1fr 1fr auto' }}
                            >
                              <div className="px-3 py-2">Hito</div>
                              <div className="px-3 py-2">Inicio</div>
                              <div className="px-3 py-2">Fin</div>
                              <div className="px-3 py-2"></div>
                            </div>
                            <div className="divide-y divide-gray-100">
                              {scheduleRows.map((row, index) => (
                                <div
                                  key={index}
                                  className="px-3 py-2"
                                  style={{ display: 'grid', gridTemplateColumns: '2.4fr 1fr 1fr auto', gap: '8px', alignItems: 'center' }}
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
                                    className="text-xs text-red-500 hover:text-red-600"
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

                        <div>
                          <label className="text-sm text-gray-600">Costos por entregable</label>
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

                        <div>
                          <label className="text-sm text-gray-600">Supuestos cuantificables</label>
                          <div className="mt-2 flex gap-2">
                            <input
                              value={assumptionInput}
                              onChange={(event) => setAssumptionInput(event.target.value)}
                              placeholder="Agregar supuesto verificable"
                              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                            />
                            <button
                              type="button"
                              onClick={() => addListItem(assumptionInput, setAssumptionsList, () => setAssumptionInput(''))}
                              className="px-4 py-2 rounded-lg bg-[#4A90E2] text-white text-sm"
                            >
                              Agregar
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {assumptionsList.map((item, index) => (
                              <span key={`${item}-${index}`} className="inline-flex items-center gap-2 bg-slate-50 text-slate-700 px-3 py-1 rounded-full text-xs">
                                {item}
                                <button type="button" onClick={() => removeListItem(index, setAssumptionsList)} className="text-slate-600">×</button>
                              </span>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="text-sm text-gray-600">Stakeholders</label>
                          <div className="mt-2 flex gap-2">
                            <input
                              value={stakeholderInput}
                              onChange={(event) => setStakeholderInput(event.target.value)}
                              placeholder="Agregar stakeholder"
                              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                            />
                            <button
                              type="button"
                              onClick={() => addListItem(stakeholderInput, setStakeholdersList, () => setStakeholderInput(''))}
                              className="px-4 py-2 rounded-lg bg-[#4A90E2] text-white text-sm"
                            >
                              Agregar
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {stakeholdersList.map((item, index) => (
                              <span key={`${item}-${index}`} className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs">
                                {item}
                                <button type="button" onClick={() => removeListItem(index, setStakeholdersList)} className="text-blue-600">×</button>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-sm text-gray-600">Requisitos funcionales</label>
                          <div className="mt-2 flex gap-2">
                            <input
                              value={functionalInput}
                              onChange={(event) => setFunctionalInput(event.target.value)}
                              placeholder="Agregar requisito funcional"
                              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                            />
                            <button
                              type="button"
                              onClick={() => addListItem(functionalInput, setFunctionalList, () => setFunctionalInput(''))}
                              className="px-4 py-2 rounded-lg bg-[#4A90E2] text-white text-sm"
                            >
                              Agregar
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {functionalList.map((item, index) => (
                              <span key={`${item}-${index}`} className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs">
                                {item}
                                <button type="button" onClick={() => removeListItem(index, setFunctionalList)} className="text-green-600">×</button>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-sm text-gray-600">Requisitos no funcionales</label>
                          <div className="mt-2 flex gap-2">
                            <input
                              value={nonFunctionalInput}
                              onChange={(event) => setNonFunctionalInput(event.target.value)}
                              placeholder="Agregar requisito no funcional"
                              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                            />
                            <button
                              type="button"
                              onClick={() => addListItem(nonFunctionalInput, setNonFunctionalList, () => setNonFunctionalInput(''))}
                              className="px-4 py-2 rounded-lg bg-[#4A90E2] text-white text-sm"
                            >
                              Agregar
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {nonFunctionalList.map((item, index) => (
                              <span key={`${item}-${index}`} className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs">
                                {item}
                                <button type="button" onClick={() => removeListItem(index, setNonFunctionalList)} className="text-orange-600">×</button>
                              </span>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {error && (
                  <div className="text-sm text-red-600">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full flex items-center justify-center gap-2 bg-[#4A90E2] text-white py-2 rounded-lg hover:bg-[#357ABD] transition-all disabled:opacity-70"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </form>
            )}
          </section>
        </div>
      </main>

      {showExpectedModal && expectedSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#1F2A37]">Respuesta esperada guardada</h3>
              <button
                onClick={() => setShowExpectedModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            {expectedSnapshot.mode === 'management' ? (
              <div className="space-y-4">
                <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-cyan-700 mb-2">Objetivo principal</h4>
                  <ul className="text-xs text-cyan-700 space-y-1">
                    {expectedSnapshot.objetivoPrincipal.map((item, index) => (
                      <li key={`objective-${index}`}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-sky-50 border border-sky-100 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-sky-700 mb-2">Objetivos específicos</h4>
                  <ul className="text-xs text-sky-700 space-y-1">
                    {expectedSnapshot.objetivosEspecificos.map((item, index) => (
                      <li key={`specific-objective-${index}`}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-blue-700 mb-2">Entregables clave</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    {expectedSnapshot.entregables.map((item, index) => (
                      <li key={`scope-${index}`}>• {item}</li>
                    ))}
                  </ul>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-green-700 mb-2">Cronograma</h4>
                    <ul className="text-xs text-green-700 space-y-1">
                      {expectedSnapshot.cronograma.map((item, index) => (
                        <li key={`schedule-${index}`}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-orange-700 mb-2">Costos</h4>
                    <ul className="text-xs text-orange-700 space-y-1">
                      {expectedSnapshot.costos.map((item, index) => (
                        <li key={`cost-${index}`}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Supuestos</h4>
                  <ul className="text-xs text-slate-700 space-y-1">
                    {expectedSnapshot.supuestos.map((item, index) => (
                      <li key={`assumption-${index}`}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-blue-700 mb-2">Stakeholders</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    {expectedSnapshot.stakeholders.map((item, index) => (
                      <li key={`stake-${index}`}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-green-700 mb-2">Requisitos funcionales</h4>
                  <ul className="text-xs text-green-700 space-y-1">
                    {expectedSnapshot.requisitosFuncionales.map((item, index) => (
                      <li key={`func-${index}`}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-orange-700 mb-2">Requisitos no funcionales</h4>
                  <ul className="text-xs text-orange-700 space-y-1">
                    {expectedSnapshot.requisitosNoFuncionales.map((item, index) => (
                      <li key={`nonfunc-${index}`}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowExpectedModal(false)}
                className="px-4 py-2 rounded-lg bg-[#4A90E2] text-white"
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
