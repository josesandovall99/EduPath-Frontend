import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ClipboardList, RefreshCw, Save, Search } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';

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

type ExpectedSnapshot =
  | {
      mode: 'analysis';
      stakeholders: string[];
      requisitosFuncionales: string[];
      requisitosNoFuncionales: string[];
    }
  | {
      mode: 'management';
      alcance: string[];
      cronograma: string[];
      costos: string[];
    };

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
  const [scopeList, setScopeList] = useState<string[]>([]);
  const [scheduleRows, setScheduleRows] = useState<Array<{ activity: string; start: string; end: string }>>([
    { activity: '', start: '', end: '' }
  ]);
  const [costRows, setCostRows] = useState<
    Array<{ concept: string; type: 'Humano' | 'Material'; quantity: string; unitCost: string }>
  >([{ concept: '', type: 'Humano', quantity: '', unitCost: '' }]);
  const [scopeInput, setScopeInput] = useState('');
  const [showExpectedModal, setShowExpectedModal] = useState(false);
  const [expectedSnapshot, setExpectedSnapshot] = useState<ExpectedSnapshot | null>(null);

  const actividadId = selected?.actividad_id ? Number(selected.actividad_id) : null;
  const isProgrammingMiniproyecto = actividadId === 12;
  const isManagementMiniproyecto = actividadId === 13;

  useEffect(() => {
    if (!isProgrammingMiniproyecto) return;

    const ensureQuill = () => {
      if (!editorRef.current) return;
      if (!(window as any).Quill) return;
      if (!quillRef.current) {
        try {
          const SizeStyle = (window as any).Quill.import('attributors/style/size');
          SizeStyle.whitelist = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '32px'];
          (window as any).Quill.register(SizeStyle, true);

          const FontStyle = (window as any).Quill.import('attributors/style/font');
          FontStyle.whitelist = ['Arial', 'Monospace', 'Algerian'];
          (window as any).Quill.register(FontStyle, true);
        } catch (err) {
          console.warn('Quill format registration failed', err);
        }

        editorRef.current.innerHTML = '';
        quillRef.current = new (window as any).Quill(editorRef.current, {
          theme: 'snow',
          placeholder: 'Ingrese la descripcion del miniproyecto',
          modules: {
            toolbar: [
              [{ font: ['Arial', 'Monospace', 'Algerian'] }],
              [{ size: ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '32px'] }],
              ['bold', 'italic', 'underline', 'strike'],
              [{ color: [] }, { background: [] }],
              [{ list: 'ordered' }, { list: 'bullet' }],
              [{ align: [] }],
              ['link', 'image', 'video'],
              ['clean']
            ]
          }
        });

        quillRef.current.format('size', '14px');
        quillRef.current.on('text-change', () => {
          setFormData((prev) => ({ ...prev, descripcion: quillRef.current.root.innerHTML }));
        });
      }
    };

    ensureQuill();

    if (quillRef.current) {
      quillRef.current.root.innerHTML = formData.descripcion || '';
    }
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
      const response = await fetch('http://localhost:4000/miniproyectos');
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

  const buildScheduleList = (rows: Array<{ activity: string; start: string; end: string }>) =>
    rows
      .filter((row) => row.activity || row.start || row.end)
      .map((row, index) =>
        `Actividad ${index + 1}: ${row.activity || '-'} | Inicio: ${row.start || '-'} | Fin: ${row.end || '-'}`
      );

  const calculateRowTotal = (row: { quantity: string; unitCost: string }) =>
    parseNumber(row.quantity) * parseNumber(row.unitCost);

  const buildCostList = (
    rows: Array<{ concept: string; type: 'Humano' | 'Material'; quantity: string; unitCost: string }>
  ) => {
    const lines = rows
      .filter((row) => row.concept || row.quantity || row.unitCost)
      .map((row, index) =>
        `Costo ${index + 1}: ${row.concept || '-'} | Tipo: ${row.type} | Cantidad: ${row.quantity || '-'} | Costo unitario: ${row.unitCost || '-'} | Subtotal: ${formatCurrency(calculateRowTotal(row))}`
      );
    const total = rows.reduce((sum, row) => sum + calculateRowTotal(row), 0);
    return [...lines, `Total general: ${formatCurrency(total)}`];
  };

  const handleSelect = (item: MiniproyectoItem) => {
    setSelected(item);
    let parsedStakeholders: string[] = [];
    let parsedFunctional: string[] = [];
    let parsedNonFunctional: string[] = [];
    let parsedScope: string[] = [];
    let parsedSchedule: Array<{ activity: string; start: string; end: string }> = [];
    let parsedCosts: Array<{ concept: string; type: 'Humano' | 'Material'; quantity: string; unitCost: string }> = [];
    let parsedEsperado = '';
    let parsedSintaxis: string[] = [];
    let parsedLenguajes: number[] = [];

    if (item.respuesta_miniproyecto) {
      try {
        const parsed = JSON.parse(item.respuesta_miniproyecto);
        parsedStakeholders = Array.isArray(parsed?.stakeholders) ? parsed.stakeholders : [];
        parsedFunctional = Array.isArray(parsed?.requisitosFuncionales) ? parsed.requisitosFuncionales : [];
        parsedNonFunctional = Array.isArray(parsed?.requisitosNoFuncionales) ? parsed.requisitosNoFuncionales : [];
        parsedScope = Array.isArray(parsed?.alcance) ? parsed.alcance : [];
        if (parsed?.tipo === 'programacion') {
          parsedEsperado = parsed?.esperado || '';
          parsedSintaxis = Array.isArray(parsed?.sintaxis) ? parsed.sintaxis : [];
          parsedLenguajes = Array.isArray(parsed?.lenguajesPermitidos) ? parsed.lenguajesPermitidos : [];
        }
        const cronogramaRaw = Array.isArray(parsed?.cronograma) ? parsed.cronograma : [];
        parsedSchedule = cronogramaRaw.map((entry: any) => {
          if (entry && typeof entry === 'object') {
            return {
              activity: (entry.activity ?? entry.actividad ?? entry.tarea ?? '').toString(),
              start: (entry.start ?? entry.inicio ?? '').toString(),
              end: (entry.end ?? entry.fin ?? '').toString()
            };
          }

          const text = entry?.toString?.() ?? '';
          const activityMatch = text.match(/Actividad\s*\d*:?\s*([^|]+)\|/i);
          const startMatch = text.match(/Inicio\s*:?\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}\/[0-9]{2}\/[0-9]{4})/i);
          const endMatch = text.match(/Fin\s*:?\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{2}\/[0-9]{2}\/[0-9]{4})/i);
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
            activity: activityMatch ? activityMatch[1].trim() : text,
            start: normalizeDate(startMatch?.[1]),
            end: normalizeDate(endMatch?.[1])
          };
        });

        const costosRaw = Array.isArray(parsed?.costos) ? parsed.costos : [];
        parsedCosts = costosRaw.map((entry: any) => {
          if (entry && typeof entry === 'object') {
            return {
              concept: (entry.concept ?? entry.concepto ?? '').toString(),
              type: entry.type === 'Material' ? 'Material' : 'Humano',
              quantity: (entry.quantity ?? entry.cantidad ?? '').toString(),
              unitCost: (entry.unitCost ?? entry.costoUnitario ?? '').toString()
            };
          }

          const text = entry?.toString?.() ?? '';
          const conceptMatch = text.match(/Costo\s*\d*:?\s*([^|]+)\|/i);
          const typeMatch = text.match(/Tipo\s*:?\s*(Humano|Material)/i);
          const qtyMatch = text.match(/Cantidad\s*:?\s*([0-9.,]+)/i);
          const unitMatch = text.match(/Costo\s*unitario\s*:?\s*([0-9.,]+)/i);

          return {
            concept: conceptMatch ? conceptMatch[1].trim() : text,
            type: typeMatch && typeMatch[1]?.toLowerCase() === 'material' ? 'Material' : 'Humano',
            quantity: qtyMatch?.[1] ?? '',
            unitCost: unitMatch?.[1] ?? ''
          };
        });
      } catch (err) {
        parsedStakeholders = [];
        parsedFunctional = [];
        parsedNonFunctional = [];
        parsedScope = [];
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
    setStakeholderInput('');
    setFunctionalInput('');
    setNonFunctionalInput('');
    setScopeList(parsedScope);
    setScheduleRows(parsedSchedule.length > 0 ? parsedSchedule : [{ activity: '', start: '', end: '' }]);
    setCostRows(parsedCosts.length > 0 ? parsedCosts : [{ concept: '', type: 'Humano', quantity: '', unitCost: '' }]);
    setScopeInput('');
    const isProgrammingItem = Number(item.actividad_id) === 12;
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

      const response = await fetch(`http://localhost:4000/miniproyectos/${selected.id}`, {
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
                  alcance: scopeList,
                  cronograma: scheduleList,
                  costos: costsList
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
                    alcance: scopeList,
                    cronograma: scheduleList,
                    costos: costsList
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
            alcance: scopeList,
            cronograma: scheduleList,
            costos: costsList
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F6F8FB] via-[#F2F2F2] to-[#EEF2F6]">
      <header className="bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center p-2.5 shadow-lg">
                <img src={logoImage} alt="EduPath" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-[#1F2A37] text-xl font-semibold">Gestión de Miniproyectos</h1>
                <p className="text-gray-500 text-sm">Administra y edita los miniproyectos activos</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-full">
                <span>Total:</span>
                <span className="font-semibold text-gray-700">{totalMiniproyectos}</span>
              </div>
              <button
                onClick={loadMiniproyectos}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:text-[#4A90E2] hover:border-[#4A90E2] transition-all bg-white shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm">Actualizar</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-[#3A4A5B] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Panel</span>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs text-gray-500">Miniproyectos totales</p>
            <p className="text-2xl font-semibold text-[#1F2A37]">{totalMiniproyectos}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs text-gray-500">Resultados visibles</p>
            <p className="text-2xl font-semibold text-[#1F2A37]">{resultadosMostrados}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs text-gray-500">Seleccionado</p>
            <p className="text-sm font-semibold text-[#1F2A37]">
              {selected?.Actividad?.titulo || 'Sin selección'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
          <section className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-[#1F2A37] text-lg font-semibold">Listado de Miniproyectos</h2>
                <p className="text-sm text-gray-500">Selecciona un miniproyecto para editarlo.</p>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por título, área o nivel"
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30 bg-[#F9FAFB]"
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
                {filteredMiniproyectos.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`w-full text-left border rounded-2xl p-5 transition-all hover:shadow-md ${
                      selected?.id === item.id ? 'border-[#4A90E2] bg-blue-50 shadow-sm' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-[#1F2A37] text-lg font-semibold">
                          {item.Actividad?.titulo || 'Sin título'}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
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

          <section className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
            <h2 className="text-[#1F2A37] text-lg font-semibold mb-4">Editar Miniproyecto</h2>
            {!selected ? (
              <div className="py-12 text-center text-gray-500">
                Selecciona un miniproyecto para editar sus datos.
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600">Título</label>
                  <input
                    value={formData.titulo}
                    onChange={(event) => handleChange('titulo', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Descripción</label>
                  {isProgrammingMiniproyecto ? (
                    <div className="quill-editor-container mt-1">
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
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                    />
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-600">Nivel de dificultad</label>
                  <input
                    value={formData.nivel_dificultad}
                    onChange={(event) => handleChange('nivel_dificultad', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Entregable</label>
                  <input
                    value={formData.entregable}
                    onChange={(event) => handleChange('entregable', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
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
                          <label className="text-sm text-gray-600">Alcance del proyecto</label>
                          <div className="mt-2 flex gap-2">
                            <input
                              value={scopeInput}
                              onChange={(event) => setScopeInput(event.target.value)}
                              placeholder="Agregar alcance"
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
                          <label className="text-sm text-gray-600">Cronograma del proyecto</label>
                          <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">
                            <div
                              className="bg-gray-50 text-[11px] text-gray-500"
                              style={{ display: 'grid', gridTemplateColumns: '2.6fr 1fr 1fr auto' }}
                            >
                              <div className="px-3 py-2">Actividad</div>
                              <div className="px-3 py-2">Inicio</div>
                              <div className="px-3 py-2">Fin</div>
                              <div className="px-3 py-2"></div>
                            </div>
                            <div className="divide-y divide-gray-100">
                              {scheduleRows.map((row, index) => (
                                <div
                                  key={index}
                                  className="px-3 py-2"
                                  style={{ display: 'grid', gridTemplateColumns: '2.6fr 1fr 1fr auto', gap: '8px', alignItems: 'center' }}
                                >
                                  <input
                                    value={row.activity}
                                    onChange={(event) => {
                                      const updated = [...scheduleRows];
                                      updated[index] = { ...updated[index], activity: event.target.value };
                                      setScheduleRows(updated);
                                    }}
                                    placeholder="Actividad"
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
                                        setScheduleRows([{ activity: '', start: '', end: '' }]);
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
                              onClick={() => setScheduleRows([...scheduleRows, { activity: '', start: '', end: '' }])}
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              + Agregar fila
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm text-gray-600">Costos y recursos</label>
                          <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">
                            <div
                              className="bg-gray-50 text-[11px] text-gray-500"
                              style={{ display: 'grid', gridTemplateColumns: '2.4fr 1fr 1fr 1.2fr auto' }}
                            >
                              <div className="px-3 py-2">Concepto</div>
                              <div className="px-3 py-2">Tipo</div>
                              <div className="px-3 py-2">Cantidad</div>
                              <div className="px-3 py-2">Costo unitario</div>
                              <div className="px-3 py-2"></div>
                            </div>
                            <div className="divide-y divide-gray-100">
                              {costRows.map((row, index) => (
                                <div
                                  key={index}
                                  className="px-3 py-2"
                                  style={{ display: 'grid', gridTemplateColumns: '2.4fr 1fr 1fr 1.2fr auto', gap: '8px', alignItems: 'center' }}
                                >
                                  <input
                                    value={row.concept}
                                    onChange={(event) => {
                                      const updated = [...costRows];
                                      updated[index] = { ...updated[index], concept: event.target.value };
                                      setCostRows(updated);
                                    }}
                                    placeholder="Concepto"
                                    className="rounded-lg border border-gray-200 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                                  />
                                  <select
                                    value={row.type}
                                    onChange={(event) => {
                                      const updated = [...costRows];
                                      updated[index] = { ...updated[index], type: event.target.value as 'Humano' | 'Material' };
                                      setCostRows(updated);
                                    }}
                                    className="rounded-lg border border-gray-200 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                                  >
                                    <option value="Humano">Humano</option>
                                    <option value="Material">Material</option>
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
                                    value={row.unitCost}
                                    onChange={(event) => {
                                      const updated = [...costRows];
                                      updated[index] = { ...updated[index], unitCost: event.target.value };
                                      setCostRows(updated);
                                    }}
                                    placeholder="Costo unitario"
                                    className="rounded-lg border border-gray-200 px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (costRows.length === 1) {
                                        setCostRows([{ concept: '', type: 'Humano', quantity: '', unitCost: '' }]);
                                        return;
                                      }
                                      setCostRows(costRows.filter((_, rowIndex) => rowIndex !== index));
                                    }}
                                    className="text-xs text-red-500 hover:text-red-600"
                                  >
                                    Quitar
                                  </button>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-600">
                              <span>Subtotal fila calculado automáticamente</span>
                              <span className="font-semibold">
                                Total: {formatCurrency(costRows.reduce((sum, row) => sum + calculateRowTotal(row), 0))}
                              </span>
                            </div>
                          </div>
                          <div className="mt-3 flex justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                setCostRows([
                                  ...costRows,
                                  { concept: '', type: 'Humano', quantity: '', unitCost: '' }
                                ])
                              }
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              + Agregar fila
                            </button>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-blue-700 mb-2">Alcance</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    {expectedSnapshot.alcance.map((item, index) => (
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
