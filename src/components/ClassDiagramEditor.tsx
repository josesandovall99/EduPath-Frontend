import React, { useEffect, useRef, useState } from 'react';
import * as joint from 'jointjs';
import 'jointjs/dist/joint.css';

export default function ClassDiagramEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<joint.dia.Graph | null>(null);
  const paperRef = useRef<joint.dia.Paper | null>(null);
  const [selectedElement, setSelectedElement] = useState<joint.dia.Element | null>(null);
  const [classText, setClassText] = useState('');

  useEffect(() => {
    const graph = new joint.dia.Graph();
    graphRef.current = graph;

    const paper = new joint.dia.Paper({
      el: containerRef.current!,
      model: graph,
      width: 1000,
      height: 600,
      gridSize: 10,
      drawGrid: true,
      background: { color: '#f0f0f0' },
      interactive: true
    });
    paperRef.current = paper;

    // ✅ Corrección: tipado explícito para evitar error con elementView.model
    paper.on('element:pointerclick', (elementView: joint.dia.ElementView) => {
      const element = ((elementView as any).model) as joint.dia.Element;
      setSelectedElement(element);
      setClassText(element.attr('label/text'));
    });
  }, []);

  const addClass = () => {
    const newClass = new joint.shapes.standard.Rectangle();
    newClass.position(100 + Math.random() * 600, 100 + Math.random() * 400);
    newClass.resize(200, 100);
    newClass.attr({
      body: { fill: '#ffffff', stroke: '#000000' },
      label: { text: 'NuevaClase\n- atributo: tipo\n+ metodo(): retorno', fill: '#000000' }
    });
    graphRef.current?.addCell(newClass);
  };

  const updateClassText = () => {
    if (selectedElement) {
      selectedElement.attr('label/text', classText);
    }
  };

  const connectClasses = () => {
    const elements = graphRef.current?.getElements();
    if (elements && elements.length >= 2) {
      const link = new joint.shapes.standard.Link();
      link.source(elements[elements.length - 2]);
      link.target(elements[elements.length - 1]);
      link.attr({
        line: { stroke: '#000000', strokeWidth: 2, targetMarker: { type: 'classic' } }
      });
      graphRef.current?.addCell(link);
    }
  };

  const exportDiagram = async () => {
    const json = graphRef.current?.toJSON();
    const res = await fetch('http://localhost:4000/diagrams/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diagram: json })
    });
    const data = await res.json();
    alert('Validación: ' + data.message);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Editor gráfico de Diagramas UML</h2>
      <div className="flex gap-4 mb-4">
        <button onClick={addClass} className="px-4 py-2 bg-green-600 text-white rounded">➕ Nueva Clase</button>
        <button onClick={connectClasses} className="px-4 py-2 bg-blue-600 text-white rounded">🔗 Conectar Últimas</button>
        <button onClick={exportDiagram} className="px-4 py-2 bg-purple-600 text-white rounded">📤 Validar Diagrama</button>
      </div>

      {selectedElement && (
        <div className="mb-4">
          <textarea
            value={classText}
            onChange={(e) => setClassText(e.target.value)}
            rows={4}
            className="w-full border p-2 font-mono"
          />
          <button onClick={updateClassText} className="mt-2 px-4 py-2 bg-gray-800 text-white rounded">💾 Actualizar Clase</button>
        </div>
      )}

      <div ref={containerRef} style={{ width: '100%', height: '600px', border: '1px solid #ccc' }} />
    </div>
  );
}
