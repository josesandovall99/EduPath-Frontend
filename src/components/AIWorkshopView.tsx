import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Lightbulb, FileText, Check, Save } from 'lucide-react';


interface AIWorkshopViewProps {
  subjectName: string;
  workshop: {
    id: string;
    title: string;
    isMiniproyecto?: boolean;
    actividadId?: number;
  };
  onBack: () => void;
  estudianteId?: number;
}


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
        En este taller interactuarás con un cliente simulado por IA que te 
        presentará un proyecto real. Tu objetivo es realizar el análisis de 
        requisitos completo del sistema.
      </>
    ),
    tasks: [
      'Identificar stakeholders del proyecto',
      'Recopilar requisitos funcionales',
      'Definir requisitos no funcionales'
    ],
    iframeSrc: 'https://zenoembed.textcortex.com/?embed_id=emb_01kg7mwvbgfw2r9tjcat0get0c'
  },
  management: {
    description: (
      <>
        En este taller interactuarás con un cliente simulado por IA. Tu objetivo 
        es determinar el alcance, crear un cronograma y estimar los costos del 
        proyecto propuesto.
      </>
    ),
    tasks: [
      'Definir alcance del proyecto',
      'Crear cronograma del proyecto',
      'Estimar costos y recursos'
    ],
    iframeSrc: 'https://zenoembed.textcortex.com/?embed_id=emb_01kg7w1f7aep7axvz2r0wjw6jm'
  }
};

const taskColors = ['#4A90E2', '#7ED6A7', '#F5A97F', '#A78BFA', '#FBBF24', '#60A5FA'];

const API_BASE_URL = '/api';

export function AIWorkshopView({ subjectName, workshop, onBack, estudianteId }: AIWorkshopViewProps) {
  const [currentTask, setCurrentTask] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [studentResponse, setStudentResponse] = useState('');
  const [stakeholdersResponse, setStakeholdersResponse] = useState('');
  const [functionalResponse, setFunctionalResponse] = useState('');
  const [nonFunctionalResponse, setNonFunctionalResponse] = useState('');
  const [scopeResponse, setScopeResponse] = useState('');
  const [scheduleRows, setScheduleRows] = useState<Array<{ activity: string; start: string; end: string }>>([
    { activity: '', start: '', end: '' }
  ]);
  const [costRows, setCostRows] = useState<
    Array<{ concept: string; type: 'Humano' | 'Material'; quantity: string; unitCost: string }>
  >([
    { concept: '', type: 'Humano', quantity: '', unitCost: '' }
  ]);
  const [expectedCounts, setExpectedCounts] = useState<{ stakeholders: number; functional: number; nonFunctional: number } | null>(null);
  const [evaluation, setEvaluation] = useState<{
    puntaje: number;
    criterios?: Array<{ criterio: string; cumplido: boolean }>;
  } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingEstado, setPendingEstado] = useState<'ENVIADO' | 'COMPLETADO' | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const totalTasks = 5;
  const subjectColor = subjectColors[subjectName] || '#4A90E2';
  const isManagementWorkshop = workshop.actividadId === 13 || subjectName === 'Alcance, Tiempo y Costo';
  const workshopConfig = isManagementWorkshop ? workshopConfigs.management : workshopConfigs.analysis;

  const formatScheduleRows = (rows: Array<{ activity: string; start: string; end: string }>) =>
    rows
      .filter((row) => row.activity || row.start || row.end)
      .map((row, index) =>
        `Actividad ${index + 1}: ${row.activity || '-'} | Inicio: ${row.start || '-'} | Fin: ${row.end || '-'}`
      )
      .join('\n');

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

  const formatCostRows = (
    rows: Array<{ concept: string; type: 'Humano' | 'Material'; quantity: string; unitCost: string }>
  ) =>
    rows
      .filter((row) => row.concept || row.quantity || row.unitCost)
      .map((row, index) =>
        `Costo ${index + 1}: ${row.concept || '-'} | Tipo: ${row.type} | Cantidad: ${row.quantity || '-'} | Costo unitario: ${row.unitCost || '-'} | Subtotal: ${formatCurrency(calculateRowTotal(row))}`
      )
      .concat([`Total general: ${formatCurrency(totalCost)}`])
      .join('\n');

  useEffect(() => {
    const fetchExpectedCounts = async () => {
      if (!workshop.isMiniproyecto || isManagementWorkshop) return;
      const miniId = parseInt(workshop.id, 10);
      if (isNaN(miniId)) return;

      try {
        const response = await fetch(`${API_BASE_URL}/miniproyectos/${miniId}`);
        if (!response.ok) return;
        const data = await response.json();
        const expectedRaw = data?.respuesta_miniproyecto || data?.respuestaMiniproyecto || data?.Miniproyecto?.respuesta_miniproyecto;
        if (!expectedRaw) return;

        const parsed = typeof expectedRaw === 'string' ? JSON.parse(expectedRaw) : expectedRaw;
        const stakeholders = Array.isArray(parsed?.stakeholders) ? parsed.stakeholders.length : 0;
        const functional = Array.isArray(parsed?.requisitosFuncionales) ? parsed.requisitosFuncionales.length : 0;
        const nonFunctional = Array.isArray(parsed?.requisitosNoFuncionales) ? parsed.requisitosNoFuncionales.length : 0;
        if (stakeholders || functional || nonFunctional) {
          setExpectedCounts({ stakeholders, functional, nonFunctional });
        }
      } catch (error) {
        console.warn('No se pudieron cargar las pistas del miniproyecto:', error);
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
          alcance: scopeResponse,
          cronograma: formatScheduleRows(scheduleRows),
          costos: formatCostRows(costRows)
        }
      : {
          stakeholders: stakeholdersResponse,
          requisitosFuncionales: functionalResponse,
          requisitosNoFuncionales: nonFunctionalResponse
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
          estudiante_id: esId,
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

            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <iframe
                src={workshopConfig.iframeSrc}
                width="100%"
                height="760"
                frameBorder={0}
                title="Chatbot cliente"
              />
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
              <label className="text-sm text-gray-600">Respuesta del estudiante</label>
              <p className="text-xs text-gray-500">
                A partir del chat con la IA, responde las tareas solicitadas.
              </p>
              {isManagementWorkshop ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500">Alcance del proyecto</label>
                    <textarea
                      value={scopeResponse}
                      onChange={(event) => setScopeResponse(event.target.value)}
                      rows={3}
                      placeholder="Describe el alcance del proyecto..."
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Cronograma del proyecto</label>
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
                    <label className="text-xs text-gray-500">Estimación de costos y recursos</label>
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
                                  setCostRows([
                                    { concept: '', type: 'Humano', quantity: '', unitCost: '' }
                                  ]);
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
                        <span className="font-semibold">Total: {formatCurrency(totalCost)}</span>
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
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500">Stakeholders</label>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Pista: se esperan {expectedCounts?.stakeholders ?? 4} stakeholders.
                    </p>
                    <textarea
                      value={stakeholdersResponse}
                      onChange={(event) => setStakeholdersResponse(event.target.value)}
                      rows={3}
                      placeholder="Describe los stakeholders identificados..."
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Requisitos funcionales</label>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Pista: se esperan {expectedCounts?.functional ?? 6} requisitos funcionales.
                    </p>
                    <textarea
                      value={functionalResponse}
                      onChange={(event) => setFunctionalResponse(event.target.value)}
                      rows={3}
                      placeholder="Enumera los requisitos funcionales..."
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Requisitos no funcionales</label>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Pista: se esperan {expectedCounts?.nonFunctional ?? 5} requisitos no funcionales.
                    </p>
                    <textarea
                      value={nonFunctionalResponse}
                      onChange={(event) => setNonFunctionalResponse(event.target.value)}
                      rows={3}
                      placeholder="Enumera los requisitos no funcionales..."
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
                    />
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
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${criterio.cumplido ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}
                      >
                        <span>{criterio.criterio}</span>
                        <span>{criterio.cumplido ? 'Cumple' : 'No cumple'}</span>
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
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${criterio.cumplido ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}
                  >
                    <span>{criterio.criterio}</span>
                    <span>{criterio.cumplido ? 'Cumple' : 'No cumple'}</span>
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