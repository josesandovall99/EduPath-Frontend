import Editor, { OnMount } from '@monaco-editor/react';
import { useEffect, useRef } from 'react';

interface JavaEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string | number;
  readOnlyLabel?: string;
  /**
   * Template del docente. Las líneas no triviales quedan resaltadas
   * en rojo y no pueden ser eliminadas ni modificadas por el alumno.
   */
  protectedTemplate?: string;
}

// ── Helpers (puro JS, sin React) ─────────────────────────────────────────────

function getRequiredLines(template: string): string[] {
  return template
    .split('\n')
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length > 0 &&
        !/^\/\/\s*(Tu\s+c[oó]digo|implementa|agrega|aqu[ií]|here|TODO|FIXME|\.\.\.|your\s+code)/i.test(l)
    );
}

function findProtectedLineNums(code: string, required: string[]): number[] {
  if (required.length === 0) return [];
  return code.split('\n').reduce<number[]>((acc, line, idx) => {
    if (required.some((req) => line.trim() === req)) acc.push(idx + 1);
    return acc;
  }, []);
}

function ensureProtectedLineStyle() {
  const ID = 'monaco-protected-lines-style';
  if (document.getElementById(ID)) return;
  const s = document.createElement('style');
  s.id = ID;
  s.textContent = `
    .protected-line-bg {
      background: rgba(239,68,68,0.11) !important;
      border-left: 2px solid rgba(239,68,68,0.6) !important;
    }
    .protected-line-margin { background: rgba(239,68,68,0.24) !important; }
  `;
  document.head.appendChild(s);
}

// ── Componente ────────────────────────────────────────────────────────────────

export function JavaEditor({
  value,
  onChange,
  readOnly = false,
  height = 320,
  readOnlyLabel,
  protectedTemplate,
}: JavaEditorProps) {
  const editorRef  = useRef<any>(null);
  const monacoRef  = useRef<any>(null);
  const decoIds    = useRef<string[]>([]);
  const lastValid  = useRef<string>(value);
  const reverting  = useRef(false);
  // ⚡ Ref para el template — evita el closure-stale en onDidChangeModelContent
  const templateRef = useRef<string | undefined>(protectedTemplate);
  const requiredRef = useRef<string[]>([]);

  // Mantener templateRef y requiredRef al día con la prop
  useEffect(() => {
    templateRef.current = protectedTemplate;
    requiredRef.current = protectedTemplate ? getRequiredLines(protectedTemplate) : [];
  }, [protectedTemplate]);

  // ── Decoraciones ────────────────────────────────────────────────────────────
  function applyDecorations(editor: any, monaco: any, code: string) {
    if (readOnly || requiredRef.current.length === 0) return;
    const nums = findProtectedLineNums(code, requiredRef.current);
    const decos = nums.map((n) => ({
      range: new monaco.Range(n, 1, n, 1),
      options: {
        isWholeLine: true,
        className: 'protected-line-bg',
        marginClassName: 'protected-line-margin',
        hoverMessage: { value: '🔒 Línea del docente — no modificable' },
      },
    }));
    decoIds.current = editor.deltaDecorations(decoIds.current, decos);
  }

  // ── Revertir al último contenido válido ─────────────────────────────────────
  function revertToLastValid(editor: any, monaco: any) {
    if (reverting.current) return;
    reverting.current = true;
    const model = editor.getModel();
    // model.setValue dispara onDidChangeModelContent sincrónicamente;
    // el flag reverting lo cortocircuita en esa re-entrada.
    if (model) model.setValue(lastValid.current);
    // requestAnimationFrame: corre DESPUÉS de todos los microtasks de Monaco
    requestAnimationFrame(() => {
      reverting.current = false;
      applyDecorations(editor, monaco, lastValid.current);
    });
  }

  // ── Montaje del editor ──────────────────────────────────────────────────────
  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    ensureProtectedLineStyle();
    lastValid.current = value;

    // Decoraciones iniciales (si el template ya está disponible)
    if (requiredRef.current.length > 0) {
      applyDecorations(editor, monaco, value);
    }

    editor.onDidChangeModelContent(() => {
      if (reverting.current || readOnly) return;

      const newCode = editor.getValue();

      // Protección: LCS — todas las líneas del docente deben aparecer EN ORDEN
      // Esto protege líneas duplicadas (ej: dos '}') y evita reordenamientos.
      if (templateRef.current && requiredRef.current.length > 0) {
        const currentTrimmed = newCode.split('\n').map((l: string) => l.trim());
        let seqIdx = 0;
        for (const line of currentTrimmed) {
          if (seqIdx < requiredRef.current.length && line === requiredRef.current[seqIdx]) seqIdx++;
        }
        const intact = seqIdx === requiredRef.current.length;
        if (!intact) {
          revertToLastValid(editor, monaco);
          return;
        }
        applyDecorations(editor, monaco, newCode);
      }

      lastValid.current = newCode;
      onChange?.(newCode);
    });
  };

  // ── Sincronizar cuando el padre cambia `value` (ej: "Restaurar plantilla") ─
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const current = editor.getValue();
    if (current === value) {
      applyDecorations(editor, monaco, value);
      return;
    }

    reverting.current = true;
    lastValid.current = value;
    const model = editor.getModel();
    if (model) model.setValue(value);
    requestAnimationFrame(() => {
      reverting.current = false;
      applyDecorations(editor, monaco, value);
    });
  }, [value]); // Solo cuando value cambia desde afuera

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col overflow-hidden rounded-none">
      {readOnly && readOnlyLabel && (
        <div className="flex items-center gap-2 border-b border-yellow-600/30 bg-yellow-500/10 px-3 py-1.5 text-[11px] font-mono text-yellow-400">
          <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-6V7a5 5 0 00-10 0v4" />
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          </svg>
          {readOnlyLabel}
        </div>
      )}
      {!readOnly && templateRef.current && (
        <div className="flex items-center gap-2 border-b border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[10px] font-mono text-rose-400">
          <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          Fondo rojo = línea del docente — no se puede eliminar ni modificar
        </div>
      )}
      <Editor
        height={height}
        defaultLanguage="java"
        value={value}
        onMount={handleMount}
        theme="vs-dark"
        options={{
          readOnly,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 13,
          lineHeight: 22,
          lineNumbers: 'on',
          automaticLayout: true,
          wordWrap: 'on',
          tabSize: 4,
          insertSpaces: true,
          renderLineHighlight: readOnly ? 'none' : 'line',
          cursorStyle: readOnly ? 'underline' : 'line',
          scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
          padding: { top: 12, bottom: 12 },
          suggest: { showKeywords: true, showSnippets: true },
          quickSuggestions: !readOnly,
          parameterHints: { enabled: !readOnly },
        }}
      />
    </div>
  );
}
