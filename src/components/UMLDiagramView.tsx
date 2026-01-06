import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Square, GitMerge, Share2, Boxes, Diamond, RotateCcw, Redo2, Trash2, BookOpen, Save, Send } from 'lucide-react';
import * as joint from 'jointjs';
import 'jointjs/dist/joint.css';


interface UMLDiagramViewProps {
  activity: {
    id: string;
    title: string;
  };
  onBack: () => void;
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

interface MultiplicityDialog {
  isOpen: boolean;
  sourceId: string | null;
  targetId: string | null;
  type: RelationType;
  sourceMultiplicity: string;
  targetMultiplicity: string;
}

export function UMLDiagramView({ activity, onBack }: UMLDiagramViewProps) {
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

  // Actualizar los refs cuando cambien los estados
  useEffect(() => {
    drawingModeRef.current = drawingMode;
    selectedForRelationRef.current = selectedForRelation;
  }, [drawingMode, selectedForRelation]);

  // Inicializar el lienzo de jointjs
  useEffect(() => {
    const graph = new joint.dia.Graph();
    graphRef.current = graph;

    const paper = new joint.dia.Paper({
      el: containerRef.current!,
      model: graph,
      width: '100%',
      height: '100%',
      gridSize: 10,
      drawGrid: true,
      background: { color: '#ffffff' },
      interactive: true
    });
    paperRef.current = paper;

    paper.on('element:pointerclick', (elementView: joint.dia.ElementView) => {
      const element = ((elementView as any).model) as joint.dia.Element;
      
      console.log('Click en elemento:', element.id, 'DrawingMode:', drawingModeRef.current);
      
      // Si estamos en modo de dibujo de relaciones
      if (drawingModeRef.current) {
        console.log('En modo dibujo, selected:', selectedForRelationRef.current);
        
        if (!selectedForRelationRef.current) {
          // Seleccionar el primer elemento
          console.log('Primera clase seleccionada:', element.id);
          selectedForRelationRef.current = element.id as string;
          setSelectedForRelation(element.id as string);
          
          // Resaltar visualmente
          element.attr('body/stroke', '#FF6B6B');
          element.attr('body/strokeWidth', 4);
        } else if (element.id !== selectedForRelationRef.current) {
          // Seleccionar el segundo elemento y abrir diálogo
          console.log('Segunda clase seleccionada:', element.id, 'Abriendo modal...');
          
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
          
          console.log('Abriendo modal con:', { sourceId, targetId, type });
          
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
          console.log('Deseleccionando...');
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
        console.log('Modo normal - seleccionando clase');
        setSelectedElement(element);
        setClassText(element.attr('label/text') || '');
        setIsEditingClass(false);
      }
    });

    return () => {
      graphRef.current = null;
      paperRef.current = null;
    };
  }, []);

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
    const newClass = new joint.shapes.standard.Rectangle();
    newClass.position(100 + Math.random() * 600, 100 + Math.random() * 300);
    newClass.resize(200, 100);
    newClass.attr({
      body: { fill: '#ffffff', stroke: '#7ED6A7', strokeWidth: 2 },
      label: { text: 'NuevaClase\n- atributo: tipo\n+ metodo(): retorno', fill: '#3A4A5B' }
    });
    graphRef.current?.addCell(newClass);
  };

  const startDrawingRelation = (type: RelationType) => {
    setDrawingMode(type);
    setSelectedForRelation(null);
    setSelectedElement(null);
  };

  const createRelation = () => {
    if (!multiplicityDialog.sourceId || !multiplicityDialog.targetId || !multiplicityDialog.type) {
      console.log('Faltan datos para crear relación');
      return;
    }

    console.log('Creando relación de:', multiplicityDialog.sourceId, 'a:', multiplicityDialog.targetId);
    
    saveToUndoStack();
    const source = graphRef.current?.getCell(multiplicityDialog.sourceId);
    const target = graphRef.current?.getCell(multiplicityDialog.targetId);

    console.log('Source:', source?.id, 'Target:', target?.id);

    if (!source || !target) {
      console.log('No se encontraron las celdas');
      return;
    }

    const link = new joint.shapes.standard.Link();
    link.source(source);
    link.target(target);

    let lineStyle: any = { stroke: '#7ED6A7', strokeWidth: 2 };
    let targetMarker: any = { type: 'classic' };

    // Configurar según el tipo de relación
    if (multiplicityDialog.type === 'inheritance') {
      lineStyle.strokeDasharray = '5,5';
      targetMarker = { type: 'path', d: 'M 10 -10 L 0 0 L 10 10 Z', fill: '#7ED6A7', stroke: '#7ED6A7' };
    } else if (multiplicityDialog.type === 'aggregation') {
      targetMarker = { type: 'path', d: 'M 10 -10 L 0 0 L 10 10 Z', fill: 'white', stroke: '#7ED6A7', strokeWidth: 2 };
    } else if (multiplicityDialog.type === 'composition') {
      targetMarker = { type: 'path', d: 'M 10 -10 L 0 0 L 10 10 Z', fill: '#7ED6A7', stroke: '#7ED6A7' };
    }

    link.attr('line', { stroke: lineStyle.stroke, strokeWidth: lineStyle.strokeWidth, targetMarker });
    
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
    console.log('Relación creada exitosamente');

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
    if (undoStack.length > 0) {
      const lastState = undoStack[undoStack.length - 1];
      graphRef.current?.fromJSON(JSON.parse(lastState));
      setUndoStack(undoStack.slice(0, -1));
    }
  };

  const redo = () => {
    const json = graphRef.current?.toJSON();
    if (json) {
      setUndoStack([...undoStack, JSON.stringify(json)]);
    }
    if (redoStack.length > 0) {
      const lastState = redoStack[redoStack.length - 1];
      graphRef.current?.fromJSON(JSON.parse(lastState));
      setRedoStack(redoStack.slice(0, -1));
    }
  };

  const validateDiagram = async () => {
    setIsValidating(true);
    const json = graphRef.current?.toJSON();
    
    try {
      const response = await fetch('http://localhost:4000/diagrams/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagram: json })
      });

      const data: ValidationResponse = await response.json();

      if (!data.success && data.errors) {
        // Resaltar elementos con error en rojo
        data.errors.forEach(err => {
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

        setValidationErrors(data.errors);
        setValidationWarnings(data.warnings || []);
        setShowErrorModal(true);
      } else {
        // Diagrama válido
        setValidationErrors([]);
        setValidationWarnings(data.warnings || []);
        setShowErrorModal(false);
        alert('✓ Diagrama válido');
      }
    } catch (error) {
      alert('❌ Error al validar. Backend no disponible en este momento.');
    } finally {
      setIsValidating(false);
    }
  };
  
  const subjectColor = '#7ED6A7'; // Análisis de Sistemas

  return (
    <div className="min-h-screen bg-[#F2F2F2] flex">
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
              }}>❌ Errores en el diagrama</h3>
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
                      📍 {err.location}
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
                        💡 {err.details}
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
                    ⚠️ Advertencias
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
                            💡 {warn.suggestion}
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
            ? `✓ Primera clase seleccionada (${drawingMode}) - Toca la segunda clase`
            : `Modo ${drawingMode}: Selecciona la PRIMERA clase`}
        </div>
      )}
      {/* Left Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto shadow-sm">
        <div 
          className="p-4 border-b border-gray-200 text-white"
          style={{ background: `linear-gradient(135deg, ${subjectColor} 0%, ${subjectColor}dd 100%)` }}
        >
          <div className="flex items-center gap-3">
            <Boxes className="w-5 h-5" />
            <span className="text-sm">Herramientas UML</span>
          </div>
        </div>

        {/* UML Tools */}
        <div className="p-4">
          <div className="mb-6">
            <h3 className="text-sm text-gray-500 mb-3">Elementos</h3>
            <div className="space-y-2">
              <button 
                onClick={addClass}
                className="w-full p-3 border-2 border-gray-200 rounded-lg hover:shadow-md text-left text-sm transition-all flex items-center gap-3 group hover:border-green-400"
               
              >
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${subjectColor}15` }}
                >
                  <Square className="w-4 h-4" style={{ color: subjectColor }} />
                </div>
                <span className="text-[#3A4A5B]">Clase</span>
              </button>
              <button 
                onClick={() => startDrawingRelation('association')}
                className={`w-full p-3 border-2 rounded-lg hover:shadow-md text-left text-sm transition-all flex items-center gap-3 ${
                  drawingMode === 'association' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-400'
                }`}>
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${subjectColor}15` }}
                >
                  <Share2 className="w-4 h-4" style={{ color: subjectColor }} />
                </div>
                <span className="text-[#3A4A5B]">Asociación</span>
              </button>
              <button 
                onClick={() => startDrawingRelation('inheritance')}
                className={`w-full p-3 border-2 rounded-lg hover:shadow-md text-left text-sm transition-all flex items-center gap-3 ${
                  drawingMode === 'inheritance' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-400'
                }`}>
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${subjectColor}15` }}
                >
                  <GitMerge className="w-4 h-4" style={{ color: subjectColor }} />
                </div>
                <span className="text-[#3A4A5B]">Herencia</span>
              </button>
              <button 
                onClick={() => startDrawingRelation('aggregation')}
                className={`w-full p-3 border-2 rounded-lg hover:shadow-md text-left text-sm transition-all flex items-center gap-3 ${
                  drawingMode === 'aggregation' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-400'
                }`}>
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${subjectColor}15` }}
                >
                  <Diamond className="w-4 h-4" style={{ color: subjectColor }} />
                </div>
                <span className="text-[#3A4A5B]">Agregación</span>
              </button>
              <button 
                onClick={() => startDrawingRelation('composition')}
                className={`w-full p-3 border-2 rounded-lg hover:shadow-md text-left text-sm transition-all flex items-center gap-3 ${
                  drawingMode === 'composition' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-400'
                }`}>
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${subjectColor}15` }}
                >
                  <Diamond className="w-4 h-4 fill-current" style={{ color: subjectColor }} />
                </div>
                <span className="text-[#3A4A5B]">Composición</span>
              </button>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm text-gray-500 mb-3">Acciones</h3>
            <div className="space-y-2">
              <button 
                onClick={clearDiagram}
                className="w-full p-3 border-2 border-gray-200 rounded-lg hover:bg-red-50 text-sm text-[#3A4A5B] flex items-center gap-2 transition-all hover:border-red-300">
                <Trash2 className="w-4 h-4 text-gray-500" />
                Limpiar diagrama
              </button>
              <button 
                onClick={undo}
                className="w-full p-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 text-sm text-[#3A4A5B] flex items-center gap-2 transition-all hover:border-gray-400">
                <RotateCcw className="w-4 h-4 text-gray-500" />
                Deshacer
              </button>
              <button 
                onClick={redo}
                className="w-full p-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 text-sm text-[#3A4A5B] flex items-center gap-2 transition-all hover:border-gray-400">
                <Redo2 className="w-4 h-4 text-gray-500" />
                Rehacer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Content Area */}
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
                  <h1 className="text-[#3A4A5B]">Análisis de Sistemas</h1>
                  <p className="text-gray-500 text-sm">{activity.title}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="border-2 border-gray-300 px-5 py-2 rounded-lg bg-white hover:bg-gray-50 text-gray-700 transition-all flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Guardar borrador
                </button>
              <button 
                onClick={validateDiagram}
                disabled={isValidating}
                className="px-6 py-2 rounded-lg text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: subjectColor }}
              >
                <Send className="w-4 h-4" />
                {isValidating ? 'Validando...' : 'Enviar diagrama'}
              </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Instructions Panel */}
          <div className="w-96 border-r border-gray-200 bg-white p-6 overflow-y-auto">
            {/* Back Button */}
            <button 
              onClick={onBack}
              className="mb-6 flex items-center gap-2 text-gray-600 hover:text-[#3A4A5B] transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>

            <h2 className="text-[#3A4A5B] mb-4">Instrucciones</h2>
            <div className="space-y-4 text-gray-700 text-sm">
              <p>
                Crea un diagrama de clases UML para un sistema de gestión de biblioteca 
                que incluya las siguientes entidades:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-600 ml-2">
                <li>Libro (con atributos: título, autor, ISBN)</li>
                <li>Usuario (con atributos: nombre, ID, email)</li>
                <li>Préstamo (con atributos: fecha inicio, fecha fin)</li>
              </ul>
              <div 
                className="border-l-4 pl-4 p-3 rounded-r-lg"
                style={{ 
                  borderColor: subjectColor,
                  backgroundColor: `${subjectColor}15`
                }}
              >
                <p className="text-[#3A4A5B]">
                  <strong>Nota:</strong> Asegúrate de incluir las relaciones apropiadas 
                  entre las clases y sus multiplicidades.
                </p>
              </div>
              <p>
                Usa las herramientas del panel izquierdo para crear los elementos del 
                diagrama. Puedes arrastrar los elementos en el lienzo para organizarlos.
              </p>
            </div>

            <div className="mt-6 border-t border-gray-200 pt-6">
              <h3 className="text-[#3A4A5B] mb-3">Criterios de evaluación</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 rounded flex items-center justify-center" style={{ borderColor: subjectColor }}>
                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: subjectColor }}></div>
                  </div>
                  <span className="text-gray-700">Clases correctamente definidas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                  <span className="text-gray-600">Atributos apropiados</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                  <span className="text-gray-600">Relaciones bien establecidas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                  <span className="text-gray-600">Multiplicidades indicadas</span>
                </div>
              </div>
            </div>
          </div>

          {/* Diagram Canvas */}
          <div className="flex-1 bg-[#F2F2F2] p-6 overflow-hidden flex flex-col">
            {selectedElement && !drawingMode && (
              <div className="mb-4 bg-white p-4 rounded-lg shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-[#3A4A5B]">Clase Seleccionada</label>
                  <button 
                    onClick={() => setIsEditingClass(!isEditingClass)}
                    className="px-3 py-1 rounded text-sm transition-all"
                    style={{ 
                      backgroundColor: isEditingClass ? '#ff6b6b' : subjectColor,
                      color: 'white'
                    }}
                  >
                    {isEditingClass ? '❌ Cancelar' : '✏️ Editar'}
                  </button>
                </div>
                
                {isEditingClass && (
                  <>
                    <textarea
                      value={classText}
                      onChange={(e) => setClassText(e.target.value)}
                      rows={4}
                      className="w-full border border-gray-300 p-2 font-mono rounded text-sm mb-2"
                      placeholder="Nombre\n- atributo: tipo\n+ metodo(): retorno"
                    />
                    <button 
                      onClick={updateClassText} 
                      className="w-full px-4 py-2 rounded text-white transition-all"
                      style={{ backgroundColor: subjectColor }}
                    >
                      💾 Guardar Cambios
                    </button>
                  </>
                )}
                
                {!isEditingClass && (
                  <div className="text-sm text-gray-600 font-mono whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-200">
                    {classText || 'Sin contenido'}
                  </div>
                )}
              </div>
            )}
            <div 
              ref={containerRef} 
              style={{ 
                flex: 1,
                border: '2px solid #ddd',
                borderRadius: '0.5rem',
                backgroundColor: '#ffffff'
              }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}