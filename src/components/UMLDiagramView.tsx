import { useState, useEffect, useRef } from 'react';

import { ArrowLeft, Square, GitMerge, Share2, Boxes, Diamond, RotateCcw, Redo2, Trash2, BookOpen, Save, Send, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

import * as joint from 'jointjs';

import 'jointjs/dist/joint.css';

import {

  createUmlClassCell,

  layoutAllUmlCells,

  layoutUmlClassCell,

  migrateDiagramCellsJson,

  ensureUmlClassShapeRegistered,

  refreshJointLinksForElements,

  refreshAllJointLinks,

} from '../joint/umlClassShape';

import { API_BASE_URL } from '../utils/constants';





interface UMLDiagramViewProps {

  activity: {

    id: string;

    title: string;

    description?: string;

  };

  onBack: () => void;

  onComplete?: () => void;

  configurableMode?: boolean;

  configurableResponse?: any;

  onConfigurableResponseChange?: (response: any) => void;

  resolvePath?: string;

  submitPath?: string;

  feedbackPath?: string;

}



type RelationType = 'association' | 'inheritance' | 'aggregation' | 'composition' | null;



interface ValidationError {

  type: string;

  severity: 'error' | 'warning';

  message: string;

  elementId?: string;

  lineNumber?: number;

  location: string;

  details?: string;

  suggestion?: string;

}



interface ValidationResponse {

  success: boolean;

  message: string;

  errors?: ValidationError[];

  warnings?: ValidationError[];

}



interface EjercicioResponse {

  ejercicioId?: string;

  intentoId?: number;

  esCorrecta: boolean;

  puntosObtenidos: number;

  detalle: {

    errors: ValidationError[];

    warnings: ValidationError[];

  };

  retroalimentacion?: string;

}



interface MultiplicityDialog {

  isOpen: boolean;

  sourceId: string | null;

  targetId: string | null;

  type: RelationType;

  sourceMultiplicity: string;

  targetMultiplicity: string;

}



export function UMLDiagramView({ activity, onBack, onComplete, configurableMode = false, configurableResponse, onConfigurableResponseChange, resolvePath, submitPath, feedbackPath }: UMLDiagramViewProps) {

  const containerRef = useRef<HTMLDivElement>(null);

  const graphRef = useRef<joint.dia.Graph | null>(null);

  const paperRef = useRef<joint.dia.Paper | null>(null);

  const [selectedElement, setSelectedElement] = useState<joint.dia.Element | null>(null);

  const [classText, setClassText] = useState('');

  const [isEditingClass, setIsEditingClass] = useState(false);

  const [undoStack, setUndoStack] = useState<string[]>([]);

  const [redoStack, setRedoStack] = useState<string[]>([]);

  

  // Estados para modo de dibujo de relaciones

  const [drawingMode, setDrawingMode] = useState<RelationType>(null);

  const [selectedForRelation, setSelectedForRelation] = useState<string | null>(null);

  

  // Refs para mantener los valores actuales en los listeners

  const drawingModeRef = useRef<RelationType>(null);

  const selectedForRelationRef = useRef<string | null>(null);

  

  const [multiplicityDialog, setMultiplicityDialog] = useState<MultiplicityDialog>({

    isOpen: false,

    sourceId: null,

    targetId: null,

    type: null,

    sourceMultiplicity: '1',

    targetMultiplicity: '1',

  });



  // Estados para validación de diagrama

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const [validationWarnings, setValidationWarnings] = useState<ValidationError[]>([]);

  const [showErrorModal, setShowErrorModal] = useState(false);

  const [isValidating, setIsValidating] = useState(false);

  const [ejercicioAprobado, setEjercicioAprobado] = useState(false); // Nuevo estado



  // Estados para zoom

  const [zoomLevel, setZoomLevel] = useState(1);



  // Actualizar los refs cuando cambien los estados

  useEffect(() => {

    drawingModeRef.current = drawingMode;

    selectedForRelationRef.current = selectedForRelation;

  }, [drawingMode, selectedForRelation]);



  // Inicializar el lienzo de jointjs

  useEffect(() => {

    ensureUmlClassShapeRegistered();

    const el = containerRef.current;

    if (!el) return;



    const graph = new joint.dia.Graph();

    graphRef.current = graph;



    const measurePaperHost = () => {

      const r = el.getBoundingClientRect();

      const w = Math.max(400, Math.floor(r.width));

      const h = Math.max(480, Math.floor(r.height));

      return { w, h };

    };



    const { w: initialW, h: initialH } = measurePaperHost();

    let paper!: joint.dia.Paper;



    let resizeRaf = 0;

    const syncPaperDimensions = () => {

      cancelAnimationFrame(resizeRaf);

      resizeRaf = window.requestAnimationFrame(() => {

        const { w, h } = measurePaperHost();

        paper.setDimensions(w, h);

        refreshAllJointLinks(graph, paper);

      });

    };



    paper = new joint.dia.Paper({

      el,

      model: graph,

      width: initialW,

      height: initialH,

      gridSize: 10,

      drawGrid: true,

      background: { color: '#ffffff' },

      interactive: true,

      cellViewNamespace: joint.shapes,

      overflow: true,

    });

    paperRef.current = paper;



    syncPaperDimensions();

    window.addEventListener('resize', syncPaperDimensions);

    queueMicrotask(syncPaperDimensions);


    paper.on('element:pointerclick', (elementView: joint.dia.ElementView) => {

      const element = ((elementView as any).model) as joint.dia.Element;

      


      

      // Si estamos en modo de dibujo de relaciones

      if (drawingModeRef.current) {


        

        if (!selectedForRelationRef.current) {

          // Seleccionar el primer elemento


          selectedForRelationRef.current = element.id as string;

          setSelectedForRelation(element.id as string);

          

          // Resaltar visualmente

          element.attr('body/stroke', '#FF6B6B');

          element.attr('body/strokeWidth', 4);

        } else if (element.id !== selectedForRelationRef.current) {

          // Seleccionar el segundo elemento y abrir diálogo


          

          // Restaurar el color de la primera clase

          const firstElement = graphRef.current?.getCell(selectedForRelationRef.current);

          if (firstElement) {

            firstElement.attr('body/stroke', '#7ED6A7');

            firstElement.attr('body/strokeWidth', 2);

          }

          

          // Abrir modal

          const sourceId = selectedForRelationRef.current;

          const targetId = element.id as string;

          const type = drawingModeRef.current;

          


          

          setMultiplicityDialog({

            isOpen: true,

            sourceId,

            targetId,

            type,

            sourceMultiplicity: '1',

            targetMultiplicity: '1',

          });

          

          selectedForRelationRef.current = null;

          setSelectedForRelation(null);

          setDrawingMode(null);

        } else {

          // Deseleccionar si hace clic en el mismo elemento


          const currentElement = graphRef.current?.getCell(element.id as string);

          if (currentElement) {

            currentElement.attr('body/stroke', '#7ED6A7');

            currentElement.attr('body/strokeWidth', 2);

          }

          selectedForRelationRef.current = null;

          setSelectedForRelation(null);

        }

      } else {

        // Modo normal: solo seleccionar la clase (no editar automáticamente)


        setSelectedElement(element);

        setClassText(element.attr('label/text') || '');

        setIsEditingClass(false);

      }

    });



    return () => {

      window.removeEventListener('resize', syncPaperDimensions);

      cancelAnimationFrame(resizeRaf);

      graphRef.current = null;

      paperRef.current = null;

    };

  }, []);



  useEffect(() => {

    if (!graphRef.current) return;

    const serialized = configurableResponse?.respuesta?.diagram;

    if (serialized && typeof serialized === 'object' && graphRef.current.getCells().length === 0) {

      graphRef.current.fromJSON(migrateDiagramCellsJson(serialized as Record<string, unknown>) as joint.dia.Graph.JSON);

      layoutAllUmlCells(graphRef.current, paperRef.current);

    }

  }, [configurableResponse]);



  useEffect(() => {

    if (!graphRef.current || !configurableMode || !onConfigurableResponseChange) return;



    const emitDiagram = () => {

      onConfigurableResponseChange({ respuesta: { diagram: graphRef.current?.toJSON() } });

    };



    emitDiagram();

    graphRef.current.on('add remove change', emitDiagram);

    return () => {

      graphRef.current?.off('add remove change', emitDiagram);

    };

  }, [configurableMode, onConfigurableResponseChange]);



  const saveToUndoStack = () => {

    const json = graphRef.current?.toJSON();

    if (json) {

      setUndoStack([...undoStack, JSON.stringify(json)]);

    }

  };



  const addClass = () => {

    setDrawingMode(null);

    setSelectedForRelation(null);

    saveToUndoStack();

    const newClass = createUmlClassCell();

    newClass.position(100 + Math.random() * 600, 100 + Math.random() * 300);

    graphRef.current?.addCell(newClass);

  };



  const startDrawingRelation = (type: RelationType) => {

    setDrawingMode(type);

    setSelectedForRelation(null);

    setSelectedElement(null);

  };



  const createRelation = () => {

    if (!multiplicityDialog.sourceId || !multiplicityDialog.targetId || !multiplicityDialog.type) {


      return;

    }




    

    saveToUndoStack();

    const source = graphRef.current?.getCell(multiplicityDialog.sourceId);

    const target = graphRef.current?.getCell(multiplicityDialog.targetId);






    if (!source || !target) {


      return;

    }



    const link = new joint.shapes.standard.Link();

    link.source(source as joint.dia.Element, { selector: 'body' });

    link.target(target as joint.dia.Element, { selector: 'body' });


    let lineStyle: any = { stroke: '#7ED6A7', strokeWidth: 2 };

    let targetMarker: any = { type: 'path', d: 'M 10 -5 0 0 10 5 z', fill: '#7ED6A7', stroke: '#7ED6A7' };



    // Configurar según el tipo de relación

    if (multiplicityDialog.type === 'inheritance') {

      lineStyle.strokeDasharray = '5,5';

      targetMarker = { type: 'path', d: 'M 10 -10 L 0 0 L 10 10 Z', fill: '#7ED6A7', stroke: '#7ED6A7' };

    } else if (multiplicityDialog.type === 'aggregation') {

      targetMarker = { type: 'path', d: 'M 10 -10 L 0 0 L 10 10 Z', fill: 'white', stroke: '#7ED6A7', strokeWidth: 2 };

    } else if (multiplicityDialog.type === 'composition') {

      targetMarker = { type: 'path', d: 'M 10 -10 L 0 0 L 10 10 Z', fill: '#7ED6A7', stroke: '#7ED6A7' };

    }



    link.attr({

      line: {

        connection: true,

        fill: 'none',

        strokeLinejoin: 'round',

        stroke: lineStyle.stroke,

        strokeWidth: lineStyle.strokeWidth,

        targetMarker,

      },

      wrapper: {

        connection: true,

        strokeLinejoin: 'round',

        strokeWidth: 10,

        stroke: 'transparent',

      },

    });

    

    if (lineStyle.strokeDasharray) {

      link.attr('line/strokeDasharray', lineStyle.strokeDasharray);

    }



    link.labels([

      {

        position: 0.25,

        attrs: {

          text: { text: multiplicityDialog.sourceMultiplicity, fontSize: 12, fill: '#3A4A5B' }

        }

      },

      {

        position: 0.75,

        attrs: {

          text: { text: multiplicityDialog.targetMultiplicity, fontSize: 12, fill: '#3A4A5B' }

        }

      }

    ]);



    graphRef.current?.addCell(link);



    const pv = paperRef.current;

    if (pv) {

      (pv as unknown as { updateViews: (o?: { async?: boolean }) => void }).updateViews?.({ async: false });

      (pv.findViewByModel(link) as joint.dia.LinkView | undefined)?.requestConnectionUpdate({});

    }


    // Resetear diálogo

    setMultiplicityDialog({

      isOpen: false,

      sourceId: null,

      targetId: null,

      type: null,

      sourceMultiplicity: '1',

      targetMultiplicity: '1',

    });

  };



  const updateClassText = () => {

    if (selectedElement) {

      selectedElement.attr('label/text', classText);

      layoutUmlClassCell(selectedElement);

      refreshJointLinksForElements(graphRef.current, paperRef.current, [selectedElement]);

    }

  };



  const clearDiagram = () => {

    saveToUndoStack();

    graphRef.current?.clear();

    setSelectedElement(null);

    setClassText('');

    setDrawingMode(null);

    setSelectedForRelation(null);

  };



  const undo = () => {

    const json = graphRef.current?.toJSON();

    if (json) {

      setRedoStack([...redoStack, JSON.stringify(json)]);

    }

    if (undoStack.length > 0 && graphRef.current) {

      const lastState = undoStack[undoStack.length - 1];

      graphRef.current.fromJSON(migrateDiagramCellsJson(JSON.parse(lastState) as Record<string, unknown>) as joint.dia.Graph.JSON);

      layoutAllUmlCells(graphRef.current, paperRef.current);

      setUndoStack(undoStack.slice(0, -1));

    }

  };



  const redo = () => {

    const json = graphRef.current?.toJSON();

    if (json) {

      setUndoStack([...undoStack, JSON.stringify(json)]);

    }

    if (redoStack.length > 0 && graphRef.current) {

      const lastState = redoStack[redoStack.length - 1];

      graphRef.current.fromJSON(migrateDiagramCellsJson(JSON.parse(lastState) as Record<string, unknown>) as joint.dia.Graph.JSON);

      layoutAllUmlCells(graphRef.current, paperRef.current);

      setRedoStack(redoStack.slice(0, -1));

    }

  };



  // Validación rápida (preview) - usa /resolver (no guarda intento)

  const validateDiagram = async () => {

    setIsValidating(true);

    const json = graphRef.current?.toJSON();

    


    

    try {

      const response = await fetch(`${API_BASE_URL}${resolvePath || `/ejercicios/${activity.id}/resolver`}`, {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ respuesta: { diagrama: json } })

      });



      const data: EjercicioResponse = await response.json();




      const errors = data.detalle?.errors || [];

      const warnings = data.detalle?.warnings || [];



      if (!data.esCorrecta && errors.length > 0) {

        // Resaltar elementos con error en rojo

        errors.forEach(err => {

          if (err.elementId) {

            const element = graphRef.current?.getCell(err.elementId);

            if (element) {

              element.attr({

                body: {

                  stroke: '#f44336',

                  strokeWidth: 3

                }

              });

            }

          }

        });



        setValidationErrors(errors);

        setValidationWarnings(warnings);

        setShowErrorModal(true);

      } else {

        // Diagrama válido

        setValidationErrors([]);

        setValidationWarnings(warnings);

        setShowErrorModal(false);

        alert(`Diagrama válido (preview)\n\nPuntos: ${data.puntosObtenidos}\nCorrecto: ${data.esCorrecta ? 'Sí' : 'No'}`);

      }

    } catch (error) {

      console.error('Error completo:', error);

      alert('Error al validar. Backend no disponible en este momento.');

    } finally {

      setIsValidating(false);

    }

  };



  // Enviar y calificar el diagrama (usa /enviar con nueva lógica de estados)

  const submitDiagram = async () => {

    setIsValidating(true);

    const json = graphRef.current?.toJSON();



    const estudianteId = localStorage.getItem('estudianteId') || localStorage.getItem('userId');

    if (!estudianteId) {

      alert('Error: No se encontró el ID del estudiante. Por favor, inicia sesión nuevamente.');

      setIsValidating(false);

      return;

    }



    try {

      const response = await fetch(`${API_BASE_URL}${submitPath || `/ejercicios/${activity.id}/enviar`}`, {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ estudiante_id: estudianteId, respuesta: { diagram: json } })

      });



      const data: any = await response.json().catch(() => ({}));



      // 429: Evaluación en curso (evitar doble click)

      if (response.status === 429) {

        alert(`${data?.message || data?.error || 'Evaluación en curso'}\n\nIntenta nuevamente en unos segundos.`);

        setIsValidating(false);

        return;

      }



      // 409: Ejercicio ya aprobado (bloquear envíos)

      if (response.status === 409) {

        setEjercicioAprobado(true);

        onComplete?.();

        alert(`${data?.message || data?.error || 'Ejercicio ya aprobado'}`);

        setIsValidating(false);

        return;

      }



      // 400: Incorrecta - mostrar feedback y permitir reintento inmediato

      if (response.status === 400) {

        const ejercicioData = data as EjercicioResponse;

        const errors = ejercicioData.detalle?.errors || [];

        const warnings = ejercicioData.detalle?.warnings || [];



        errors.forEach(err => {

          if (err.elementId) {

            const element = graphRef.current?.getCell(err.elementId);

            if (element) {

              element.attr({ body: { stroke: '#f44336', strokeWidth: 3 } });

            }

          }

        });



        setValidationErrors(errors);

        setValidationWarnings(warnings);

        setShowErrorModal(true);



        let msg = `Respuesta incorrecta`;

        if (typeof ejercicioData.puntosObtenidos === 'number') msg += `\n\nPuntos obtenidos: ${ejercicioData.puntosObtenidos}`;

        if (ejercicioData.retroalimentacion) msg += `\n\nRetroalimentación:\n${ejercicioData.retroalimentacion}`;

        alert(msg);



        // Permitir reintento

        setEjercicioAprobado(false);

        setIsValidating(false);

        return;

      }



      // 200: Correcta - mostrar feedback y puntos, bloquear envíos

      if (response.status === 200) {

        const ejercicioData = data as EjercicioResponse;

        setValidationErrors([]);

        setValidationWarnings([]);

        setShowErrorModal(false);

        setEjercicioAprobado(true);

        onComplete?.();



        let msg = `Correcta`;

        if (typeof ejercicioData.puntosObtenidos === 'number') msg += `\n\nPuntos obtenidos: ${ejercicioData.puntosObtenidos}`;

        if (ejercicioData.retroalimentacion) msg += `\n\nRetroalimentación:\n${ejercicioData.retroalimentacion}`;

        alert(msg);

        setIsValidating(false);

        return;

      }



      // Otros errores

      alert(`Error del servidor: ${data?.message || data?.error || 'Error desconocido'}`);

    } catch (error) {

      console.error('Error completo:', error);

      alert('Error al enviar el diagrama. Backend no disponible.');

    } finally {

      setIsValidating(false);

    }

  };



  // Ver retroalimentación del ejercicio

  const verRetroalimentacion = async () => {

    try {

      const response = await fetch(`${API_BASE_URL}${feedbackPath || `/ejercicios/${activity.id}/retroalimentacion`}`);

      

      if (!response.ok) {

        alert('No se pudo obtener la retroalimentación.');

        return;

      }

      

      const data = await response.json();


      

      // Mostrar retroalimentación en un alert o modal

      let mensaje = 'Retroalimentación del Ejercicio\n\n';

      

      if (data.salidaEsperada) {

        mensaje += `Salida esperada:\n${JSON.stringify(data.salidaEsperada, null, 2)}\n\n`;

      }

      

      if (data.retroalimentacion) {

        mensaje += `${data.retroalimentacion}`;

      }

      

      if (data.feedback) {

        mensaje += `${data.feedback}`;

      }

      

      alert(mensaje);

    } catch (error) {

      console.error('Error al obtener retroalimentación:', error);

      alert('Error al obtener la retroalimentación.');

    }

  };



  // Funciones de zoom

  const zoomIn = () => {

    const newZoom = Math.min(zoomLevel + 0.1, 2);

    setZoomLevel(newZoom);

    paperRef.current?.scale(newZoom, newZoom);

  };



  const zoomOut = () => {

    const newZoom = Math.max(zoomLevel - 0.1, 0.5);

    setZoomLevel(newZoom);

    paperRef.current?.scale(newZoom, newZoom);

  };



  const resetZoom = () => {

    setZoomLevel(1);

    paperRef.current?.scale(1, 1);

  };

  

  const subjectColor = '#7ED6A7'; // Análisis de Sistemas



  return (

    <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-200">

      {/* Modal de Errores de Validación */}

      {showErrorModal && validationErrors.length > 0 && (

        <div style={{

          position: 'fixed',

          top: 0,

          left: 0,

          right: 0,

          bottom: 0,

          backgroundColor: 'rgba(0,0,0,0.6)',

          display: 'flex',

          alignItems: 'center',

          justifyContent: 'center',

          zIndex: 10001,

        }}>

          <div style={{

            backgroundColor: 'white',

            borderRadius: '12px',

            padding: '0',

            maxWidth: '600px',

            width: '90%',

            maxHeight: '80vh',

            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',

            display: 'flex',

            flexDirection: 'column',

          }}>

            {/* Header del modal */}

            <div style={{

              padding: '24px',

              borderBottom: '1px solid #e0e0e0',

              display: 'flex',

              justifyContent: 'space-between',

              alignItems: 'center',

            }}>

              <h3 style={{

                fontSize: '18px',

                fontWeight: '600',

                color: '#d32f2f',

                margin: 0,

              }}>Errores en el diagrama</h3>

              <button

                onClick={() => setShowErrorModal(false)}

                style={{

                  background: 'none',

                  border: 'none',

                  fontSize: '24px',

                  cursor: 'pointer',

                  color: '#999',

                }}

              >

                ✕

              </button>

            </div>



            {/* Contenido con scroll */}

            <div style={{

              flex: 1,

              overflowY: 'auto',

              padding: '24px',

            }}>

              <p style={{

                color: '#666',

                fontSize: '14px',

                marginBottom: '20px',

              }}>

                Se encontraron {validationErrors.length} error{validationErrors.length !== 1 ? 'es' : ''}

              </p>



              {/* Lista de errores */}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {validationErrors.map((err, idx) => (

                  <div

                    key={idx}

                    style={{

                      borderLeft: '4px solid #f44336',

                      backgroundColor: '#ffebee',

                      padding: '12px',

                      borderRadius: '4px',

                    }}

                  >

                    <div style={{

                      color: '#d32f2f',

                      fontWeight: 'bold',

                      fontSize: '14px',

                      marginBottom: '5px',

                    }}>

                      {err.location}

                    </div>

                    <div style={{

                      color: '#c62828',

                      fontSize: '14px',

                      marginBottom: '5px',

                    }}>

                      {err.message}

                    </div>

                    {err.details && (

                      <div style={{

                        color: '#666',

                        fontSize: '12px',

                        fontStyle: 'italic',

                      }}>

                        {err.details}

                      </div>

                    )}

                  </div>

                ))}

              </div>



              {/* Warnings */}

              {validationWarnings && validationWarnings.length > 0 && (

                <>

                  <h4 style={{

                    marginTop: '24px',

                    marginBottom: '12px',

                    color: '#f57c00',

                    fontWeight: 'bold',

                    fontSize: '14px',

                  }}>

                    Advertencias

                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                    {validationWarnings.map((warn, idx) => (

                      <div

                        key={idx}

                        style={{

                          borderLeft: '4px solid #ff9800',

                          backgroundColor: '#fff3e0',

                          padding: '12px',

                          borderRadius: '4px',

                        }}

                      >

                        <div style={{

                          color: '#e65100',

                          fontWeight: 'bold',

                          fontSize: '14px',

                          marginBottom: '5px',

                        }}>

                          {warn.message}

                        </div>

                        {warn.suggestion && (

                          <div style={{

                            color: '#666',

                            fontSize: '12px',

                            marginTop: '5px',

                          }}>

                            {warn.suggestion}

                          </div>

                        )}

                      </div>

                    ))}

                  </div>

                </>

              )}

            </div>



            {/* Footer del modal */}

            <div style={{

              padding: '16px 24px',

              borderTop: '1px solid #e0e0e0',

              display: 'flex',

              gap: '12px',

              justifyContent: 'flex-end',

              backgroundColor: '#f5f5f5',

            }}>

              <button

                onClick={() => {

                  setShowErrorModal(false);

                  // Restaurar colores de elementos

                  graphRef.current?.getCells().forEach(cell => {

                    if (cell.isElement()) {

                      cell.attr({

                        body: {

                          stroke: '#333333',

                          strokeWidth: 2,

                        }

                      });

                    }

                  });

                }}

                style={{

                  padding: '8px 16px',

                  border: '1px solid #ddd',

                  borderRadius: '6px',

                  backgroundColor: '#f5f5f5',

                  color: '#3A4A5B',

                  cursor: 'pointer',

                  fontSize: '14px',

                  fontWeight: '500',

                  transition: 'all 0.2s',

                }}

              >

                Cerrar

              </button>

            </div>

          </div>

        </div>

      )}



      {/* Modal de Multiplicidad */}

      {multiplicityDialog.isOpen && (

        <div style={{

          position: 'fixed',

          top: 0,

          left: 0,

          right: 0,

          bottom: 0,

          backgroundColor: 'rgba(0,0,0,0.5)',

          display: 'flex',

          alignItems: 'center',

          justifyContent: 'center',

          zIndex: 10000,

        }}>

          <div style={{

            backgroundColor: 'white',

            borderRadius: '12px',

            padding: '24px',

            maxWidth: '400px',

            width: '90%',

            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',

          }}>

            <h3 style={{

              fontSize: '18px',

              fontWeight: '600',

              color: '#3A4A5B',

              marginBottom: '16px',

            }}>Configurar Multiplicidad</h3>

            

            <p style={{

              color: '#666',

              fontSize: '14px',

              marginBottom: '16px',

            }}>Define la multiplicidad en ambos lados de la relación</p>



            <div style={{ marginBottom: '16px' }}>

              <label style={{

                display: 'block',

                fontSize: '13px',

                fontWeight: '500',

                color: '#3A4A5B',

                marginBottom: '6px',

              }}>Multiplicidad izquierda (origen):</label>

              <select

                value={multiplicityDialog.sourceMultiplicity}

                onChange={(e) => setMultiplicityDialog({

                  ...multiplicityDialog,

                  sourceMultiplicity: e.target.value

                })}

                style={{

                  width: '100%',

                  padding: '8px 12px',

                  border: '1px solid #ddd',

                  borderRadius: '6px',

                  fontSize: '14px',

                  cursor: 'pointer',

                }}

              >

                <option value="1">1</option>

                <option value="0..1">0..1</option>

                <option value="*">* (Muchos)</option>

                <option value="0..*">0..* (Cero o más)</option>

                <option value="1..*">1..* (Uno o más)</option>

              </select>

            </div>



            <div style={{ marginBottom: '20px' }}>

              <label style={{

                display: 'block',

                fontSize: '13px',

                fontWeight: '500',

                color: '#3A4A5B',

                marginBottom: '6px',

              }}>Multiplicidad derecha (destino):</label>

              <select

                value={multiplicityDialog.targetMultiplicity}

                onChange={(e) => setMultiplicityDialog({

                  ...multiplicityDialog,

                  targetMultiplicity: e.target.value

                })}

                style={{

                  width: '100%',

                  padding: '8px 12px',

                  border: '1px solid #ddd',

                  borderRadius: '6px',

                  fontSize: '14px',

                  cursor: 'pointer',

                }}

              >

                <option value="1">1</option>

                <option value="0..1">0..1</option>

                <option value="*">* (Muchos)</option>

                <option value="0..*">0..* (Cero o más)</option>

                <option value="1..*">1..* (Uno o más)</option>

              </select>

            </div>



            <div style={{

              display: 'flex',

              gap: '10px',

              justifyContent: 'flex-end',

            }}>

              <button

                onClick={() => setMultiplicityDialog({

                  isOpen: false,

                  sourceId: null,

                  targetId: null,

                  type: null,

                  sourceMultiplicity: '1',

                  targetMultiplicity: '1',

                })}

                style={{

                  padding: '8px 16px',

                  border: '1px solid #ddd',

                  borderRadius: '6px',

                  backgroundColor: '#f5f5f5',

                  color: '#3A4A5B',

                  cursor: 'pointer',

                  fontSize: '14px',

                  fontWeight: '500',

                }}

              >

                Cancelar

              </button>

              <button

                onClick={createRelation}

                style={{

                  padding: '8px 16px',

                  border: 'none',

                  borderRadius: '6px',

                  backgroundColor: subjectColor,

                  color: 'white',

                  cursor: 'pointer',

                  fontSize: '14px',

                  fontWeight: '500',

                }}

              >

                Crear Relación

              </button>

            </div>

          </div>

        </div>

      )}



      {/* Indicador de modo de dibujo */}

      {drawingMode && (

        <div style={{

          position: 'fixed',

          top: '20px',

          left: '50%',

          transform: 'translateX(-50%)',

          backgroundColor: 'rgba(126, 214, 167, 0.95)',

          color: 'white',

          padding: '12px 24px',

          borderRadius: '8px',

          zIndex: 9998,

          fontSize: '14px',

          fontWeight: '500',

          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',

          maxWidth: '90%',

          textAlign: 'center',

        }}>

          {selectedForRelation 

            ? `Primera clase seleccionada (${drawingMode}) - Toca la segunda clase`

            : `Modo ${drawingMode}: Selecciona la PRIMERA clase`}

        </div>

      )}



      {/* Header con botones de validar y enviar */}

      <div className="bg-gradient-to-r from-[#7ED6A7] to-[#7ED6A7]/90 px-6 py-4 flex items-center justify-between">

        <div className="flex items-center gap-3">

          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-md">

            <Boxes className="w-5 h-5 text-[#7ED6A7]" />

          </div>

          <div>

            <h2 className="text-white font-bold text-lg">Editor de Diagramas UML</h2>

            <p className="text-white/80 text-sm">{activity.title}</p>

          </div>

        </div>

        <div className="flex items-center gap-3">

          {configurableMode ? (

            <div className="rounded-lg bg-white/90 px-4 py-2 text-sm font-medium text-[#4F6B5B] shadow-sm">

              El diagrama actual se evaluará con el botón principal del miniproyecto.

            </div>

          ) : (

            <>

              <button 

                onClick={validateDiagram}

                disabled={isValidating || ejercicioAprobado}

                className="px-5 py-2 rounded-lg bg-white/90 text-[#7ED6A7] shadow-md hover:shadow-lg hover:bg-white transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"

              >

                <BookOpen className="w-4 h-4" />

                {isValidating ? 'Validando...' : 'Preview'}

              </button>

              <button 

                onClick={submitDiagram}

                disabled={isValidating || ejercicioAprobado}

                className="px-6 py-2 rounded-lg bg-white text-[#7ED6A7] shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"

                title={ejercicioAprobado ? 'Ejercicio ya aprobado' : 'Enviar y calificar'}

              >

                <Send className="w-4 h-4" />

                {ejercicioAprobado ? 'Aprobado' : isValidating ? 'Enviando...' : 'Enviar y Calificar'}

              </button>

            </>

          )}

        </div>

      </div>



      {/* Descripcion del ejercicio */}

      {activity.description && (

        <div

          className="bg-[#F0FBF5] border-b border-[#7ED6A7]/30 px-6 py-4 quill-render"

          dangerouslySetInnerHTML={{ __html: activity.description }}

        />

      )}



      {/* Layout Horizontal: Sidebar + Canvas */}

      <div className="flex min-h-[560px] h-[min(78vh,880px)]">

        {/* Sidebar izquierdo con herramientas - 30% */}

        <div className="bg-gray-50 border-r border-gray-200 overflow-y-auto p-3 flex-shrink-0" style={{ width: '30%' }}>

          {/* Herramientas UML */}

          <div className="mb-4">

            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Elementos UML</h3>

            <div className="space-y-1.5">

              <button 

                onClick={addClass}

                className="w-full p-2 bg-white border border-gray-200 rounded-lg hover:border-[#7ED6A7] hover:bg-[#7ED6A7]/5 text-left text-xs transition-all flex items-center gap-2 group"

              >

                <div className="w-6 h-6 bg-[#7ED6A7]/10 rounded flex items-center justify-center group-hover:bg-[#7ED6A7]/20">

                  <Square className="w-3 h-3 text-[#7ED6A7]" />

                </div>

                <span className="text-[#3A4A5B] font-medium">Clase</span>

              </button>



              <button 

                onClick={() => startDrawingRelation('association')}

                className={`w-full p-2 bg-white border rounded-lg text-left text-xs transition-all flex items-center gap-2 ${

                  drawingMode === 'association' ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300'

                }`}

              >

                <div className="w-6 h-6 bg-blue-50 rounded flex items-center justify-center">

                  <Share2 className="w-3 h-3 text-blue-500" />

                </div>

                <span className="text-[#3A4A5B] font-medium">Asociación</span>

              </button>



              <button 

                onClick={() => startDrawingRelation('inheritance')}

                className={`w-full p-2 bg-white border rounded-lg text-left text-xs transition-all flex items-center gap-2 ${

                  drawingMode === 'inheritance' ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-purple-300'

                }`}

              >

                <div className="w-6 h-6 bg-purple-50 rounded flex items-center justify-center">

                  <GitMerge className="w-3 h-3 text-purple-500" />

                </div>

                <span className="text-[#3A4A5B] font-medium">Herencia</span>

              </button>



              <button 

                onClick={() => startDrawingRelation('aggregation')}

                className={`w-full p-2 bg-white border rounded-lg text-left text-xs transition-all flex items-center gap-2 ${

                  drawingMode === 'aggregation' ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:border-orange-300'

                }`}

              >

                <div className="w-6 h-6 bg-orange-50 rounded flex items-center justify-center">

                  <Diamond className="w-3 h-3 text-orange-500" />

                </div>

                <span className="text-[#3A4A5B] font-medium">Agregación</span>

              </button>



              <button 

                onClick={() => startDrawingRelation('composition')}

                className={`w-full p-2 bg-white border rounded-lg text-left text-xs transition-all flex items-center gap-2 ${

                  drawingMode === 'composition' ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'

                }`}

              >

                <div className="w-6 h-6 bg-indigo-50 rounded flex items-center justify-center">

                  <Diamond className="w-3 h-3 fill-current text-indigo-500" />

                </div>

                <span className="text-[#3A4A5B] font-medium">Composición</span>

              </button>

            </div>

          </div>



          {/* Acciones */}

          <div>

            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Acciones</h3>

            <div className="space-y-1.5">

              <button 

                onClick={undo}

                className="w-full p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-xs text-[#3A4A5B] flex items-center gap-2 transition-all"

              >

                <RotateCcw className="w-3 h-3 text-gray-500" />

                <span className="font-medium">Deshacer</span>

              </button>

              <button 

                onClick={redo}

                className="w-full p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-xs text-[#3A4A5B] flex items-center gap-2 transition-all"

              >

                <Redo2 className="w-3 h-3 text-gray-500" />

                <span className="font-medium">Rehacer</span>

              </button>

              <button 

                onClick={clearDiagram}

                className="w-full p-2 bg-white border border-red-200 rounded-lg hover:bg-red-50 text-xs text-red-600 flex items-center gap-2 transition-all"

              >

                <Trash2 className="w-3 h-3" />

                <span className="font-medium">Limpiar</span>

              </button>

            </div>

          </div>

        </div>



        {/* Asignatura principal del canvas - 70% */}

        <div className="flex-1 flex flex-col bg-white overflow-hidden min-h-0">

          {/* Editor de clase seleccionada */}

          {selectedElement && !drawingMode && (

            <div className="bg-gradient-to-r from-blue-50 to-white px-6 py-3 border-b border-blue-100 flex items-center justify-between">

              <div className="flex items-center gap-3">

                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">

                  <span className="text-white text-sm">E</span>

                </div>

                <div>

                  <label className="text-sm font-semibold text-[#3A4A5B]">Clase Seleccionada</label>

                  {!isEditingClass && (

                    <p className="text-xs text-gray-500 font-mono">{classText.split('\n')[0] || 'Sin nombre'}</p>

                  )}

                </div>

              </div>

              <button 

                onClick={() => setIsEditingClass(!isEditingClass)}

                className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all shadow-sm"

                style={{ 

                  backgroundColor: isEditingClass ? '#ff6b6b' : '#7ED6A7',

                  color: 'white'

                }}

              >

                {isEditingClass ? 'Cancelar' : 'Editar'}

              </button>

            </div>

          )}



          {/* Panel de edición expandido */}

          {isEditingClass && selectedElement && (

            <div className="bg-white px-6 py-4 border-b border-gray-200">

              <textarea

                value={classText}

                onChange={(e) => setClassText(e.target.value)}

                rows={5}

                className="w-full border-2 border-gray-300 focus:border-[#7ED6A7] p-3 font-mono rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7ED6A7]/20"

                placeholder="NombreClase&#10;- atributo: tipo&#10;+ metodo(): retorno"

              />

              <button 

                onClick={updateClassText} 

                className="mt-2 px-6 py-2 rounded-lg text-white transition-all font-semibold shadow-md hover:shadow-lg"

                style={{ backgroundColor: '#7ED6A7' }}

              >

                💾 Guardar Cambios

              </button>

            </div>

          )}



          {/* Canvas principal */}

          <div className="flex-1 min-h-0 p-6 bg-gray-50 overflow-hidden relative flex flex-col">

            <div 

              ref={containerRef} 

              className="uml-joint-host flex-1 min-h-[520px] w-full bg-white rounded-xl shadow-inner border-2 border-gray-200"

            />

            

            {/* Controles de zoom flotantes */}

            <div 

              className="flex flex-col gap-1 bg-white rounded-lg shadow-lg border border-gray-300 p-1.5"

              style={{

                position: 'absolute',

                top: '32px',

                right: '32px',

                zIndex: 1000,

              }}

            >

              <button

                onClick={zoomIn}

                className="p-2.5 hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"

                title="Acercar (Zoom +)"

                style={{

                  border: 'none',

                  background: 'transparent',

                  cursor: 'pointer',

                }}

              >

                <ZoomIn className="w-5 h-5 text-gray-700" />

              </button>

              <div className="border-t border-gray-200 my-0.5"></div>

              <button

                onClick={resetZoom}

                className="p-2.5 hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"

                title="Restablecer Zoom (100%)"

                style={{

                  border: 'none',

                  background: 'transparent',

                  cursor: 'pointer',

                }}

              >

                <Maximize2 className="w-5 h-5 text-gray-700" />

              </button>

              <div className="border-t border-gray-200 my-0.5"></div>

              <button

                onClick={zoomOut}

                className="p-2.5 hover:bg-gray-100 rounded-md transition-colors flex items-center justify-center"

                title="Alejar (Zoom -)"

                style={{

                  border: 'none',

                  background: 'transparent',

                  cursor: 'pointer',

                }}

              >

                <ZoomOut className="w-5 h-5 text-gray-700" />

              </button>

              <div className="text-[11px] text-center text-gray-600 font-semibold px-2 py-1.5 border-t border-gray-200 bg-gray-50 rounded-b-md">

                {Math.round(zoomLevel * 100)}%

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>

  );

}

