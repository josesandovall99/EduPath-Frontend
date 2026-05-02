import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, Lightbulb, Loader2, Lock, Trash2, XCircle } from 'lucide-react';
import logoImage from 'figma:asset/898bd8e2c46596e40b55d8328f5f754f003aa92a.png';
import { toast } from 'sonner';
import { executeExercise, submitExercise } from '../utils/submitExercise';
import { API_BASE_URL } from '../utils/constants';
import { JavaEditor } from './JavaEditor';
import { CONSOLA_IO_SOURCE } from '../utils/consolaIOSource';
import { mergeMvcFiles } from '../utils/mergeMvcFiles';

interface Content {
  id: string;
  title: string;
  type: 'video' | 'document' | 'activity' | 'quiz' | 'uml' | 'workshop';
  isMiniproyecto?: boolean;
  actividadId?: number;
}

interface ProgrammingContentViewProps {
  content: Content;
  onBack: () => void;
  embedded?: boolean;
  configurableMode?: boolean;
  configurableResponse?: any;
  onConfigurableResponseChange?: (response: any) => void;
  exerciseId?: number;
  exerciseData?: Ejercicio | null;
  executePath?: string;
  submitPath?: string;
}

interface MetodoConfiguracion {
  nombre?: string;
  retorno?: string;
  parametros?: Array<{ nombre: string; tipo: string }>;
  plantilla?: string;
}

interface CasoPruebaConfigurado {
  inputs?: string;
  output?: string;
}

interface Ejercicio {
  id: number;
  contenido_id: number;
  puntos: number;
  resultado_ejercicio: string;
  codigoEstructura?: string;
  tipo_ejercicio: string;
  configuracion?: {
    // MVC fields
    tipo?: string;
    nombreModelo?: string;
    templateMain?: string;
    templateModelo?: string;
    esperado?: string;
    // Legacy fields
    metodo?: MetodoConfiguracion;
    casos_prueba?: CasoPruebaConfigurado[];
    lenguajesPermitidos?: number[];
    sintaxis?: string[];
    [key: string]: unknown;
  };
  actividad?: {
    titulo: string;
    descripcion?: string;
    nivel_dificultad?: string;
  };
}

interface CasoPruebaResultado {
  caseNum: number;
  paso?: boolean;
  error?: string | null;
  omitido?: boolean;
  outputObtenido?: string;
  statusDescription?: string;
}

type ResultMode = 'idle' | 'execution' | 'evaluation';

const DEFAULT_TEMPLATE = 'public static int resolver() {\n    // Codigo inicial\n    return 0;\n}';
const COMPILER_WRAPPER_LINE_OFFSET = 6;
const EDITOR_BASE_VISIBLE_LINES = 15;

function stripMarkdownCodeFences(value: string) {
  const text = (value || '').trim();
  if (!text) return '';
  return text.replace(/^```[a-zA-Z0-9_-]*\s*/i, '').replace(/\s*```$/, '').trim();
}

function getInitialTemplate(ejercicio?: Ejercicio | null) {
  return stripMarkdownCodeFences(
    ejercicio?.codigoEstructura || ejercicio?.configuracion?.metodo?.plantilla || ''
  ) || DEFAULT_TEMPLATE;
}

function buildMethodSignature(metodo?: MetodoConfiguracion) {
  if (!metodo?.nombre) return 'public static void resolver()';
  const retorno = metodo.retorno || 'void';
  const parametros = Array.isArray(metodo.parametros)
    ? metodo.parametros.map((p) => `${p.tipo} ${p.nombre}`).join(', ')
    : '';
  return `public static ${retorno} ${metodo.nombre}(${parametros})`;
}

function buildMethodPreview(metodo?: MetodoConfiguracion) {
  const signature = buildMethodSignature(metodo);
  return [
    'public class Solution {',
    `    ${signature} {`,
    '        // Implementacion inicial',
    '    }',
    '}'
  ].join('\n');
}

function normalizeCaseValue(value?: string) {
  const normalized = (value || '').trim();
  return normalized || 'Sin datos';
}

function normalizeCompilerLineNumber(rawLine: number, editorLineCount: number) {
  const adjustedLine = rawLine - COMPILER_WRAPPER_LINE_OFFSET;
  if (adjustedLine < 1) return 1;
  if (editorLineCount > 0 && adjustedLine > editorLineCount) return editorLineCount;
  return adjustedLine;
}

function normalizeCompilerMessage(message: string | undefined | null, editorCode: string) {
  if (!message) return '';
  const editorLineCount = editorCode.split('\n').length;

  return message
    .replace(/Main\.java:(\d+)/gi, (_, rawLine) => {
      const normalized = normalizeCompilerLineNumber(Number(rawLine), editorLineCount);
      return `Codigo registrado: linea ${normalized}`;
    })
    .replace(/line\s+(\d+)/gi, (_, rawLine) => {
      const normalized = normalizeCompilerLineNumber(Number(rawLine), editorLineCount);
      return `linea ${normalized}`;
    });
}

function getCaseVisualState(caso: CasoPruebaResultado) {
  if (caso.statusDescription && /accepted/i.test(caso.statusDescription)) {
    return {
      label: 'Ejecutado',
      icon: CheckCircle2,
      cardClass: 'border-sky-200 bg-sky-50',
      iconClass: 'text-sky-600',
      badgeClass: 'bg-sky-100 text-sky-700'
    };
  }

  if (caso.omitido) {
    return {
      label: 'Omitido',
      icon: AlertCircle,
      cardClass: 'border-amber-200 bg-amber-50',
      iconClass: 'text-amber-600',
      badgeClass: 'bg-amber-100 text-amber-700'
    };
  }

  if (caso.paso) {
    return {
      label: 'Superado',
      icon: CheckCircle2,
      cardClass: 'border-emerald-200 bg-emerald-50',
      iconClass: 'text-emerald-600',
      badgeClass: 'bg-emerald-100 text-emerald-700'
    };
  }

  return {
    label: 'Fallo',
    icon: XCircle,
    cardClass: 'border-rose-200 bg-rose-50',
    iconClass: 'text-rose-600',
    badgeClass: 'bg-rose-100 text-rose-700'
  };
}

// ── Terminal output ───────────────────────────────────────────────────────────

function TerminalOutput({ output }: { output: string }) {
  if (!output) return null;
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-slate-700">
      {/* Chrome bar */}
      <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <span className="ml-2 font-mono text-[10px] text-slate-400">Salida del compilador</span>
      </div>
      {/* Output body */}
      <pre className="overflow-x-auto whitespace-pre-wrap break-words bg-slate-900 px-4 py-3 font-mono text-[12px] leading-6 text-slate-100">
        {output.split('\n').map((line, i) => {
          // Highlight input values (appended after prompts ending in ':')
          const promptMatch = line.match(/^(.*:\s*)(.+)$/);
          if (promptMatch) {
            return (
              <div key={i}>
                <span className="text-slate-300">{promptMatch[1]}</span>
                <span className="text-emerald-300 font-semibold">{promptMatch[2]}</span>
              </div>
            );
          }
          // Section separators like "--- RESULTADOS ---"
          if (/^-{2,}/.test(line.trim())) {
            return <div key={i} className="text-slate-500">{line}</div>;
          }
          // Key: value pairs
          const kvMatch = line.match(/^([^:]+):\s*(.+)$/);
          if (kvMatch) {
            return (
              <div key={i}>
                <span className="text-slate-400">{kvMatch[1]}:</span>
                <span className="text-sky-300"> {kvMatch[2]}</span>
              </div>
            );
          }
          return <div key={i} className="text-slate-200">{line || ' '}</div>;
        })}
      </pre>
    </div>
  );
}

// ── Diagnóstico de compilación ──────────────────────────────────────────────

function isCompilerError(error: string | null | undefined): boolean {
  if (!error) return false;
  return /Main\.java:\d+|cannot find symbol|Exception|error:/i.test(error);
}

// ── Offsets MVC (cuántas líneas hay ANTES de cada sección en el merged file) ──

function _mvcParts(consolaIOCode: string, modeloCode: string, mainCode: string) {
  function extractParts(code: string) {
    const lines = (code || '').split('\n');
    const imports: string[] = [];
    const body: string[] = [];
    for (const line of lines) {
      const t = line.trim();
      if (/^package\s/.test(t) || /^import\s/.test(t)) imports.push(t);
      else body.push(line);
    }
    return { imports, body: body.join('\n') };
  }
  function removePublic(c: string) {
    return c.replace(/^(\s*)public\s+(class|interface|enum)\s+/gm, '$1$2 ');
  }
  const cio  = extractParts(removePublic(consolaIOCode || ''));
  const mod  = extractParts(removePublic(modeloCode || ''));
  const main = extractParts(mainCode || '');
  const seen = new Set<string>();
  const allImports: string[] = [];
  for (const imp of [...cio.imports, ...mod.imports, ...main.imports]) {
    if (imp && !seen.has(imp)) { seen.add(imp); allImports.push(imp); }
  }
  return { cio, mod, main, allImports };
}

/** Líneas ANTES del cuerpo de Main en el merged file. */
function calcMvcMainOffset(consolaIOCode: string, modeloCode: string, mainCode: string): number {
  const { cio, mod, allImports } = _mvcParts(consolaIOCode, modeloCode, mainCode);
  const prefix = [allImports.join('\n'), cio.body.trim(), mod.body.trim()].filter(Boolean).join('\n\n');
  return prefix ? prefix.split('\n').length + 1 : 0;
}

/** Líneas ANTES del cuerpo de Modelo en el merged file. */
function calcMvcModeloOffset(consolaIOCode: string, modeloCode: string, mainCode: string): number {
  const { cio, allImports } = _mvcParts(consolaIOCode, modeloCode, mainCode);
  const prefix = [allImports.join('\n'), cio.body.trim()].filter(Boolean).join('\n\n');
  return prefix ? prefix.split('\n').length + 1 : 0;
}

/**
 * Detecta si el error pertenece a Modelo o Main y devuelve el studentCode + offset correcto.
 */
function resolveMvcErrorSource(
  error: string,
  consolaIOCode: string,
  modeloCode: string,
  mainCode: string
): { studentCode: string; offset: number; file: 'main' | 'modelo' } {
  const mainOffset   = calcMvcMainOffset(consolaIOCode, modeloCode, mainCode);
  const modeloOffset = calcMvcModeloOffset(consolaIOCode, modeloCode, mainCode);
  const lineMatch    = error.match(/Main\.java:(\d+)/i);
  if (lineMatch) {
    const mergedLine = Number(lineMatch[1]);
    if (mergedLine <= mainOffset) {
      // La línea cae antes del Main → pertenece al Modelo
      return { studentCode: modeloCode, offset: modeloOffset, file: 'modelo' };
    }
  }
  return { studentCode: mainCode, offset: mainOffset, file: 'main' };
}

/** Wrapper de DiagnosticBlock que resuelve automáticamente la fuente (Main vs Modelo). */
function MvcDiagnosticBlock({ error, consolaIOCode, modeloCode, mainCode, className }: {
  error: string; consolaIOCode: string; modeloCode: string; mainCode: string; className?: string;
}) {
  const { studentCode, offset } = resolveMvcErrorSource(error, consolaIOCode, modeloCode, mainCode);
  return <DiagnosticBlock error={error} studentCode={studentCode} offset={offset} className={className} />;
}

function parseCompilerError(error: string, offset = 0): {
  mergedLine: number | null;
  studentLine: number | null;
  errorType: string;
  symbol: string | null;
  location: string | null;
  compilerCodeLine: string | null;
  caretLine: string | null;
} {
  const lineMatch = error.match(/Main\.java:(\d+)/i);
  const mergedLine = lineMatch ? Number(lineMatch[1]) : null;
  const studentLine = mergedLine !== null ? Math.max(1, mergedLine - offset) : null;
  const errorTypeMatch = error.match(/error:\s*([^\n^]+)/i);
  const errorType = (errorTypeMatch ? errorTypeMatch[1] : error.split('\n')[0]).trim().slice(0, 100);
  const symbolMatch = error.match(/symbol:\s*([^\n]+)/i);
  const locationMatch = error.match(/location:\s*([^\n]+)/i);
  // Extrae la línea de código y el caret que muestra el compilador
  const caretMatch = error.match(/error:[^\n]+\n([^\n]+)\n(\s*\^)/);
  return {
    mergedLine, studentLine, errorType,
    symbol: symbolMatch ? symbolMatch[1].trim() : null,
    location: locationMatch ? locationMatch[1].trim() : null,
    compilerCodeLine: caretMatch ? caretMatch[1] : null,
    caretLine: caretMatch ? caretMatch[2] : null,
  };
}

function getCodeSnippet(code: string, lineNum: number): Array<{ n: number; text: string; isError: boolean }> {
  if (!code || lineNum < 1) return [];
  const lines = code.split('\n');
  const idx = lineNum - 1;
  if (idx < 0 || idx >= lines.length) return [];
  const start = Math.max(0, idx - 1);
  const end = Math.min(lines.length - 1, idx + 1);
  return lines.slice(start, end + 1).map((text, i) => ({ n: start + i + 1, text, isError: start + i + 1 === lineNum }));
}

function buildFriendlyCompilerAction(rawError: string, parsed: {
  errorType: string;
  symbol: string | null;
  location: string | null;
}, studentCode?: string, studentLine?: number | null) {
  const errorLower = (rawError || '').toLowerCase();
  const errorTypeLower = (parsed.errorType || '').toLowerCase();
  const sourceLines = (studentCode || '').split('\n');
  const currentLine = studentLine && studentLine > 0 ? (sourceLines[studentLine - 1] || '') : '';
  const previousLine = studentLine && studentLine > 1 ? (sourceLines[studentLine - 2] || '') : '';
  const currentTrim = currentLine.trim();
  const previousTrim = previousLine.trim();
  const isLonelyToken = (text: string) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(text);
  const isIgnorableLine = (text: string) => !text || text.startsWith('//');

  if (errorTypeLower.includes('not a statement')) {
    return 'Hay texto suelto que Java no entiende como instruccion (por ejemplo una letra sola). Elimina ese fragmento o conviertelo en una sentencia valida.';
  }

  // Heurística: cuando Java reporta "';' expected" pero realmente hay una cadena/carácter suelto en la línea actual o anterior.
  if (errorTypeLower.includes("';' expected") || errorLower.includes("';' expected")) {
    if (isLonelyToken(currentTrim) || isLonelyToken(previousTrim)) {
      const token = isLonelyToken(currentTrim) ? currentTrim : previousTrim;
      return `Hay una cadena/carácter suelto ("${token}") que rompe la sintaxis. Si fue accidental, elimínalo; si era una variable, úsala dentro de una instrucción válida.`;
    }

    // Si no está en la línea reportada, buscar hacia arriba (hasta 5 líneas),
    // ignorando comentarios/espacios para detectar cadenas sueltas tipo "www".
    if (studentLine && studentLine > 1) {
      for (let i = studentLine - 2; i >= Math.max(0, studentLine - 6); i -= 1) {
        const candidate = (sourceLines[i] || '').trim();
        if (isIgnorableLine(candidate)) continue;
        if (isLonelyToken(candidate)) {
          return `Hay una cadena/carácter suelto ("${candidate}") que rompe la sintaxis. Si fue accidental, elimínalo; si era una variable, úsala dentro de una instrucción válida.`;
        }
        // Si encontramos una línea de código real no-token, detenemos la búsqueda.
        break;
      }
    }
  }

  if (errorTypeLower.includes('cannot find symbol')) {
    if (parsed.symbol) {
      return `No existe o no es visible este simbolo: ${parsed.symbol}. Revisa nombre, mayusculas/minusculas o si falta declararlo/importarlo.`;
    }
    return 'Se referencia un simbolo que Java no reconoce. Revisa nombre, mayusculas/minusculas o si falta declararlo/importarlo.';
  }

  if (errorTypeLower.includes("';' expected") || errorLower.includes("';' expected")) {
    return 'Falta un punto y coma (;). Revisa la linea marcada y la instruccion anterior.';
  }

  if (errorTypeLower.includes('reached end of file while parsing') || errorLower.includes('reached end of file while parsing')) {
    return 'Falta cerrar una llave, parentesis o bloque. Revisa que todas las aperturas tengan su cierre.';
  }

  const fallback = [parsed.symbol, parsed.location].filter(Boolean).join(' — ');
  return fallback || parsed.errorType || 'Revisa la firma del método o campo referenciado.';
}

function DiagnosticBlock({ error, className = '', studentCode, offset = 0 }: { error: string; className?: string; studentCode?: string; offset?: number }) {
  const parsed = parseCompilerError(error, offset);
  const snippetLines = parsed.studentLine && studentCode ? getCodeSnippet(studentCode, parsed.studentLine) : [];

  // Columna relativa del ^ respecto al contenido trimmeado de la línea de error
  let caretRelCol = -1;
  if (parsed.compilerCodeLine && parsed.caretLine) {
    const compilerIndent = parsed.compilerCodeLine.match(/^(\s*)/)?.[1].length ?? 0;
    caretRelCol = Math.max(0, parsed.caretLine.indexOf('^') - compilerIndent);
  }

  const accion = buildFriendlyCompilerAction(error, parsed, studentCode, parsed.studentLine);

  return (
    <div className={`overflow-hidden rounded-xl border border-rose-200 bg-white shadow-[0_4px_14px_rgba(244,63,94,0.10)] ${className}`}>
      {/* Header — banda roja con ícono + estado + línea */}
      <div className="flex items-center justify-between gap-3 border-b border-rose-200/70 bg-gradient-to-r from-rose-50 to-rose-50/40 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100">
            <AlertCircle className="h-4 w-4 text-rose-600" strokeWidth={2.2} />
          </div>
          <span className="text-sm font-semibold text-rose-700">Error de compilación</span>
        </div>
        {parsed.studentLine !== null && (
          <span className="rounded-md bg-white px-2.5 py-1 font-mono text-[11px] font-semibold text-rose-600 ring-1 ring-rose-200">
            línea {parsed.studentLine}
          </span>
        )}
      </div>

      {/* Detalle del error — sin caja anidada, solo etiqueta + texto */}
      <div className="px-4 py-3 border-b border-rose-100">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-1.5">Detalle</p>
        <p className="font-mono text-[13px] text-slate-800 break-words leading-relaxed">{parsed.errorType}</p>
      </div>

      {/* Code snippet — IDE style integrado */}
      {snippetLines.length > 0 && (
        <pre className="overflow-x-auto bg-slate-950 px-4 py-3 font-mono text-[12px] leading-[1.65] text-slate-100 border-b border-rose-100">
          {snippetLines.map(({ n, text, isError }) => {
            const prefix = `${isError ? '→' : ' '} ${String(n).padStart(2)}: `;
            const studentIndent = text.match(/^(\s*)/)?.[1].length ?? 0;
            return (
              <div key={n}>
                <span className={`select-none ${isError ? 'text-rose-400' : 'text-slate-500'}`}>{prefix}</span>
                <span className={isError ? 'font-semibold text-rose-200' : 'text-slate-200'}>{text}</span>
                {isError && caretRelCol >= 0 && (
                  <div className="select-none text-rose-400">
                    {' '.repeat(prefix.length + studentIndent + caretRelCol)}
                    <span className="font-bold text-rose-400">^</span>
                  </div>
                )}
              </div>
            );
          })}
        </pre>
      )}

      {/* Acción sugerida — footer con ícono lightbulb, sin caja amarilla suelta */}
      <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50/40">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <Lightbulb className="h-3.5 w-3.5 text-amber-600" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700 mb-1">Acción sugerida</p>
          <p className="text-xs leading-relaxed text-slate-700">{accion}</p>
        </div>
      </div>
    </div>
  );
}

// ── Protección de estructura del docente ────────────────────────────────────

/** Verifica que TODAS las líneas no triviales del template del docente sigan presentes. */
/**
 * Simula el echo del terminal: inserta los valores de entrada del caso
 * después de cada línea de prompt (líneas que terminan en ':').
 * Judge0 no hace echo del stdin — esto lo reconstruye visualmente.
 */
function interleaveInputsWithOutput(output: string, inputs: string): string {
  if (!output || !inputs) return output || '';
  const inputValues = inputs.split(/,|\n/).map((v) => v.trim()).filter(Boolean);
  if (inputValues.length === 0) return output;
  let idx = 0;
  return output
    .split('\n')
    .map((line) => {
      if (/:\s*$/.test(line.trimEnd()) && idx < inputValues.length) {
        return line.trimEnd() + inputValues[idx++];
      }
      return line;
    })
    .join('\n');
}

/**
 * LCS order check — las líneas del docente deben aparecer EN ORDEN en el código.
 * Protege líneas duplicadas (ej: dos '}') y evita reordenamientos o eliminaciones.
 */
function isStructureIntact(currentCode: string, templateCode: string): boolean {
  if (!templateCode) return true;
  const required = templateCode
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^\/\/\s*(Tu\s+c[oó]digo|implementa|agrega|aqu[ií]|here|TODO|FIXME|\.\.\.|your\s+code)/i.test(l));
  if (required.length === 0) return true;
  const currentTrimmed = currentCode.split('\n').map((l) => l.trim());
  let idx = 0;
  for (const line of currentTrimmed) {
    if (idx < required.length && line === required[idx]) idx++;
  }
  return idx === required.length;
}

// ── Mensajes de caso ─────────────────────────────────────────────────────────

function getCaseMessage(caso: CasoPruebaResultado) {
  if (caso.statusDescription && /accepted/i.test(caso.statusDescription)) {
    return 'Ejecutado correctamente.';
  }
  if (caso.omitido) return 'La revisión se detuvo — un caso anterior no cumplió.';
  if (caso.paso) return 'La solución cumplió correctamente con este caso.';
  if (isCompilerError(caso.error)) return 'Error de compilación — revisa el diagnóstico.';
  if (caso.outputObtenido) return 'La salida obtenida no coincide con el resultado esperado.';
  return 'La solución no produjo el resultado esperado para este caso.';
}

function getCaseAccent(_index: number) {
  return {
    badge: 'border border-blue-200 bg-blue-100 text-blue-700',
    card: 'border-blue-200 bg-blue-50/35',
    dot: '#3B82F6'
  };
}

function formatJavaLikeCode(input: string) {
  const lines = input.split('\n');
  let indentLevel = 0;

  return lines
    .map((rawLine) => {
      const trimmed = rawLine.trim();
      if (!trimmed) return '';

      const leadingClosers = (trimmed.match(/^\}+/) || [''])[0].length;
      indentLevel = Math.max(0, indentLevel - leadingClosers);

      const formattedLine = `${'    '.repeat(indentLevel)}${trimmed}`;

      const openBraces = (trimmed.match(/\{/g) || []).length;
      const closeBraces = (trimmed.match(/\}/g) || []).length;
      indentLevel = Math.max(0, indentLevel + openBraces - closeBraces + leadingClosers);

      return formattedLine;
    })
    .join('\n');
}

function serializeConfigurablePayload(value: unknown) {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return String(value);
  }
}

function parseExerciseConfig(configuracion: Ejercicio['configuracion'] | string | undefined) {
  if (typeof configuracion === 'string') {
    try {
      return JSON.parse(configuracion);
    } catch {
      return {};
    }
  }
  return configuracion ?? {};
}

export function ProgrammingContentView({ content, onBack, embedded = false, configurableMode = false, configurableResponse, onConfigurableResponseChange, exerciseId, exerciseData = null, executePath, submitPath }: ProgrammingContentViewProps) {
  const subjectColor = '#4A90E2';
  const wrapperClassName = embedded ? 'w-full min-w-0 lg:h-full' : 'overflow-hidden rounded-[2rem] bg-[#F2F2F2]';
  const workspaceClassName = embedded
    ? 'grid grid-cols-1 gap-5 lg:h-full'
    : 'grid grid-cols-1 gap-5 p-4 lg:min-h-[calc(100vh-8.5rem)] lg:p-6';
  const cardClass = 'min-w-0 rounded-[1.6rem] border border-slate-200/85 bg-white p-5 shadow-[0_14px_32px_rgba(58,74,91,0.08)]';
  const sectionLabelClass = 'mb-1 inline-flex border-l-2 border-[#4A90E2] pl-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500';

  const guideItems = [
    'Firma inalterarable: la estructura base del ejercicio (clases y métodos definidos por el docente) no se puede borrar ni modificar. Solo tienes permiso para editar o eliminar el código que tú mismo hayas escrito dentro de esa estructura.',
    'Archivos permitidos: realiza modificaciones exclusivamente en los archivos indicados en el enunciado del ejercicio.',
    'ConsolaIO.java es el núcleo que gestiona la comunicación con el evaluador. Es de solo lectura — consúltala para entender el flujo de entrada/Salida del compilador.',
    'Salida del compilador: toda referencia a resultados de ejecución se muestra bajo esa etiqueta. Usa Ejecutar para validar tu lógica y Enviar para la evaluación final.',
    'Si el código falla, revisa el diagnóstico: [ESTADO] · [LÍNEA] · [ACCIÓN] — aplica la corrección indicada antes de volver a Ejecutar.'
  ];

  const [code, setCode] = useState(configurableMode ? '' : DEFAULT_TEMPLATE);
  const [ejercicio, setEjercicio] = useState<Ejercicio | null>(null);
  const [isLoadingExercise, setIsLoadingExercise] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [aprobado, setAprobado] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [syntaxValidationErrors, setSyntaxValidationErrors] = useState<string[]>([]);
  const [puntos, setPuntos] = useState<number | null>(null);
  const [casosPruebaResultados, setCasosPruebaResultados] = useState<CasoPruebaResultado[]>([]);
  const [resultMode, setResultMode] = useState<ResultMode>('idle');
  // MVC mode state
  const [isMvcMode, setIsMvcMode] = useState(false);
  const [mvcNombreModelo, setMvcNombreModelo] = useState('Modelo');
  const [mvcActiveTab, setMvcActiveTab] = useState<'main' | 'modelo' | 'consolaIO'>('main');
  const [mvcMainCode, setMvcMainCode] = useState('');
  const [mvcModeloCode, setMvcModeloCode] = useState('');
  const [mvcStdin, setMvcStdin] = useState('');
  const [mvcFreeOutput, setMvcFreeOutput] = useState<{ stdout: string; stderr: string } | null>(null);
  const configurableChangeRef = useRef(onConfigurableResponseChange);
  const lastEmittedResponseRef = useRef<string>('');
  const [isConfigurableReady, setIsConfigurableReady] = useState(!configurableMode);

  
  const configuredCases = Array.isArray(ejercicio?.configuracion?.casos_prueba)
    ? ejercicio.configuracion.casos_prueba
    : [];
  const normalizedFeedback = normalizeCompilerMessage(feedback, code);
  const hasSyntaxRestrictionErrors = syntaxValidationErrors.length > 0;
  const shouldHideGenericSyntaxFeedback =
    hasSyntaxRestrictionErrors
    && /no satisface las restricciones o la estructura requerida/i.test(feedback || '');
  const editorLines = code.split('\n');
  const visibleEditorLineCount = Math.max(EDITOR_BASE_VISIBLE_LINES, editorLines.length);
  // Offset dinámico: cuántas líneas hay ANTES del cuerpo de Main en el archivo MVC fusionado
  const mvcMainOffset = isMvcMode
    ? calcMvcMainOffset(CONSOLA_IO_SOURCE, mvcModeloCode, mvcMainCode)
    : COMPILER_WRAPPER_LINE_OFFSET;

  useEffect(() => {
    configurableChangeRef.current = onConfigurableResponseChange;
  }, [onConfigurableResponseChange]);

  const applyMvcStateFromExercise = (targetExercise: Ejercicio | null) => {
    const cfg = parseExerciseConfig(targetExercise?.configuracion);
    if (cfg.tipo === 'mvc') {
      const nombreModelo = cfg.nombreModelo || 'Modelo';
      const mainTemplate = cfg.templateMain && cfg.templateMain.trim()
        ? cfg.templateMain
        : `public class Main {\n\n    public static void main(String[] args) {\n        ConsolaIO consola = new ConsolaIO();\n        ${nombreModelo} modelo = new ${nombreModelo}(consola);\n        // Tu código aquí\n    }\n}`;
      const modeloTemplate = cfg.templateModelo && cfg.templateModelo.trim()
        ? cfg.templateModelo
        : `public class ${nombreModelo} {\n\n    private ConsolaIO consola;\n\n    public ${nombreModelo}(ConsolaIO consola) {\n        this.consola = consola;\n    }\n\n    // Implementa los métodos aquí\n}`;

      setIsMvcMode(true);
      setMvcNombreModelo(nombreModelo);
      setMvcMainCode(mainTemplate);
      setMvcModeloCode(modeloTemplate);
      setMvcActiveTab('main');
      return;
    }

    setIsMvcMode(false);
    setMvcNombreModelo('Modelo');
    setMvcMainCode('');
    setMvcModeloCode('');
    setMvcActiveTab('main');
  };

  useEffect(() => {
    lastEmittedResponseRef.current = serializeConfigurablePayload(configurableResponse);
  }, [configurableResponse]);

  useEffect(() => {
    if (exerciseData) {
      const template = getInitialTemplate(exerciseData);
      const embeddedCode = (configurableResponse?.codigo || '').toString();

      setEjercicio(exerciseData);
      setCode((currentCode) => {
        const nextCode = embeddedCode || template;
        return currentCode === nextCode ? currentCode : nextCode;
      });

      applyMvcStateFromExercise(exerciseData);

      setIsLoadingExercise(false);
      setIsConfigurableReady(true);
      return;
    }

    setIsConfigurableReady(!configurableMode);

    const cargarEjercicio = async () => {
      setIsLoadingExercise(true);
      try {
        const response = await fetch(
          exerciseId
            ? `${API_BASE_URL}/ejercicios/${exerciseId}`
            : `${API_BASE_URL}/ejercicios?contenido_id=${content.id}`
        );
        const data = await response.json();
        const ejercicioCargado = Array.isArray(data) ? data[0] : data;
        if (ejercicioCargado) {
          setEjercicio(ejercicioCargado);
          setCode(getInitialTemplate(ejercicioCargado));
          applyMvcStateFromExercise(ejercicioCargado);
        } else {
          setCode(DEFAULT_TEMPLATE);
          applyMvcStateFromExercise(null);
        }
      } catch (error) {
        console.error('Error al cargar ejercicio:', error);
      } finally {
        setIsLoadingExercise(false);
        setIsConfigurableReady(true);
      }
    };

    cargarEjercicio();
  }, [content.id, configurableMode, exerciseId, exerciseData?.id, exerciseData?.codigoEstructura, exerciseData?.configuracion?.metodo?.plantilla, configurableResponse?.codigo]);

  useEffect(() => {
    const nextCode = (configurableResponse?.codigo || '').toString();
    if (!configurableMode || !nextCode) return;
    setCode((currentCode) => currentCode === nextCode ? currentCode : nextCode);
  }, [configurableMode, configurableResponse?.codigo]);

  useEffect(() => {
    if (!configurableMode || !isConfigurableReady || !configurableChangeRef.current) return;
    const nextResponse = { codigo: code, respuesta: { texto: code }, lenguaje_id: 62 };
    const nextSerializedResponse = serializeConfigurablePayload(nextResponse);
    if (lastEmittedResponseRef.current === nextSerializedResponse) return;
    lastEmittedResponseRef.current = nextSerializedResponse;
    configurableChangeRef.current(nextResponse);
  }, [code, configurableMode, isConfigurableReady]);

  const clearResults = () => {
    setFeedback('');
    setSyntaxValidationErrors([]);
    setPuntos(null);
    setCasosPruebaResultados([]);
    setResultMode('idle');
    setAprobado(false);
  };

  const handleClear = () => {
    if (isMvcMode) {
      const cfg = ejercicio?.configuracion as any;
      if (mvcActiveTab === 'main') {
        setMvcMainCode(cfg?.templateMain || `public class Main {\n\n    public static void main(String[] args) {\n        ConsolaIO consola = new ConsolaIO();\n        ${mvcNombreModelo} modelo = new ${mvcNombreModelo}(consola);\n        // Tu código aquí\n    }\n}`);
      } else if (mvcActiveTab === 'modelo') {
        setMvcModeloCode(cfg?.templateModelo || `public class ${mvcNombreModelo} {\n\n    private ConsolaIO consola;\n\n    public ${mvcNombreModelo}(ConsolaIO consola) {\n        this.consola = consola;\n    }\n\n    // Implementa los métodos aquí\n}`);
      }
    } else {
      setCode(getInitialTemplate(ejercicio));
    }
    clearResults();
  };

  const handleFormatCode = () => {
    const cfg = ejercicio?.configuracion as any;
    if (cfg?.tipo === 'mvc') {
      if (mvcActiveTab === 'main') setMvcMainCode((prev) => formatJavaLikeCode(prev));
      else if (mvcActiveTab === 'modelo') setMvcModeloCode((prev) => formatJavaLikeCode(prev));
    } else {
      setCode((previousCode) => formatJavaLikeCode(previousCode));
    }
    toast.success('Codigo formateado', { description: 'Se aplico indentacion automatica en el editor.' });
  };

  const handleExecute = async () => {
    if (!ejercicio) {
      toast.error('Ejercicio no disponible', { description: 'No se ha cargado el ejercicio.' });
      return;
    }

    setIsRunning(true);
    setFeedback('');
    setSyntaxValidationErrors([]);
    setPuntos(null);
    setCasosPruebaResultados([]);
    setResultMode('execution');

    // ── Guarda de estructura ────────────────────────────────────────────────
    const rawCfgGuard = typeof ejercicio.configuracion === 'string'
      ? (() => { try { return JSON.parse(ejercicio.configuracion as any); } catch { return {}; } })()
      : (ejercicio.configuracion ?? {});

    if (isMvcMode || rawCfgGuard.tipo === 'mvc') {
      if (rawCfgGuard.templateMain && !isStructureIntact(mvcMainCode, rawCfgGuard.templateMain)) {
        toast.error('[ESTADO]: Estructura comprometida — Main.java', { description: '[ACCIÓN]: La firma del docente fue modificada. Usa "Restaurar plantilla".', duration: 6000 });
        setIsRunning(false); setResultMode('idle'); return;
      }
      if (rawCfgGuard.templateModelo && !isStructureIntact(mvcModeloCode, rawCfgGuard.templateModelo)) {
        toast.error(`[ESTADO]: Estructura comprometida — ${mvcNombreModelo}.java`, { description: '[ACCIÓN]: La firma del docente fue modificada. Usa "Restaurar plantilla".', duration: 6000 });
        setIsRunning(false); setResultMode('idle'); return;
      }
    } else {
      const tpl = getInitialTemplate(ejercicio);
      if (tpl && !isStructureIntact(code, tpl)) {
        toast.error('[ESTADO]: Estructura comprometida', { description: '[ACCIÓN]: La firma del docente fue modificada. Usa "Restaurar plantilla".', duration: 6000 });
        setIsRunning(false); setResultMode('idle'); return;
      }
    }
    // ───────────────────────────────────────────────────────────────────────

    const rawCfg = typeof ejercicio.configuracion === 'string'
      ? (() => { try { return JSON.parse(ejercicio.configuracion as any); } catch { return {}; } })()
      : (ejercicio.configuracion ?? {});
    const esMvc = isMvcMode || rawCfg.tipo === 'mvc';

    // MVC: merge los 3 archivos en el frontend y enviar como `codigo` normal
    const codigoAEnviar = esMvc
      ? mergeMvcFiles(mvcMainCode || rawCfg.templateMain || '', mvcModeloCode || rawCfg.templateModelo || '', CONSOLA_IO_SOURCE)
      : code;

    const mvcArchivosPayload = esMvc
      ? {
          archivos: {
            main: mvcMainCode || rawCfg.templateMain || '',
            modelo: mvcModeloCode || rawCfg.templateModelo || '',
            consolaIO: CONSOLA_IO_SOURCE,
          },
        }
      : {};
    const result = await executeExercise(ejercicio.id, codigoAEnviar, 62, executePath, { debug: true, ...mvcArchivosPayload });
    const data: any = result.data || {};
    const syntaxErrorsRun = Array.isArray(data?.erroresSintaxis) ? data.erroresSintaxis : [];
    setSyntaxValidationErrors(syntaxErrorsRun);
    if (data?.debug) {
      console.log('DEBUG ejecución compilador:', data.debug);
      toast.info('Debug: revisa la consola (Network → Response) para más detalles');
    }
    const casosList = Array.isArray(data?.casos) ? data.casos
      : Array.isArray(data?.casosPrueba) ? data.casosPrueba : [];

    // 200 = todos los casos pasaron | 400 con casos = algunos fallaron (ambos son resultados válidos)
    if (result.status === 200 || (result.status === 400 && casosList.length > 0)) {
      setCasosPruebaResultados(casosList);
      const resumen = data?.resumen || (result.status === 200 ? 'Todos los casos pasaron.' : 'Algunos casos no pasaron. Revisa tu código.');
      setFeedback(resumen);
      if (result.status === 200) {
        toast.success('Ejecución completada', { description: resumen });
      } else {
        toast.info('Ejecución completada', { description: resumen });
      }
      setIsRunning(false);
      return;
    }

    // Error técnico real (500, red error, etc.)
    const errMsg = data?.message || result.message || 'No fue posible ejecutar la solución.';
    setFeedback(errMsg);
    setCasosPruebaResultados(casosList);
    toast.error('Error al ejecutar', { description: errMsg });
    setIsRunning(false);
  };

  const handleSubmit = async () => {
    if (!ejercicio) {
      toast.error('Ejercicio no disponible', { description: 'No se ha cargado el ejercicio.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback('');
    setSyntaxValidationErrors([]);
    setPuntos(null);
    setCasosPruebaResultados([]);
    setResultMode('evaluation');

    // ── Guarda de estructura ────────────────────────────────────────────────
    const rawCfgGuardSubmit = typeof ejercicio.configuracion === 'string'
      ? (() => { try { return JSON.parse(ejercicio.configuracion as any); } catch { return {}; } })()
      : (ejercicio.configuracion ?? {});

    if (isMvcMode || rawCfgGuardSubmit.tipo === 'mvc') {
      if (rawCfgGuardSubmit.templateMain && !isStructureIntact(mvcMainCode, rawCfgGuardSubmit.templateMain)) {
        toast.error('[ESTADO]: Estructura comprometida — Main.java', { description: '[ACCIÓN]: La firma del docente fue modificada. Usa "Restaurar plantilla".', duration: 6000 });
        setIsSubmitting(false); setResultMode('idle'); return;
      }
      if (rawCfgGuardSubmit.templateModelo && !isStructureIntact(mvcModeloCode, rawCfgGuardSubmit.templateModelo)) {
        toast.error(`[ESTADO]: Estructura comprometida — ${mvcNombreModelo}.java`, { description: '[ACCIÓN]: La firma del docente fue modificada. Usa "Restaurar plantilla".', duration: 6000 });
        setIsSubmitting(false); setResultMode('idle'); return;
      }
    } else {
      const tplSubmit = getInitialTemplate(ejercicio);
      if (tplSubmit && !isStructureIntact(code, tplSubmit)) {
        toast.error('[ESTADO]: Estructura comprometida', { description: '[ACCIÓN]: La firma del docente fue modificada. Usa "Restaurar plantilla".', duration: 6000 });
        setIsSubmitting(false); setResultMode('idle'); return;
      }
    }
    // ───────────────────────────────────────────────────────────────────────

    const estudianteId = localStorage.getItem('estudianteId') || localStorage.getItem('userId');
    if (!estudianteId) {
      toast.error('Sesion invalida', { description: 'No se encontro el ID del estudiante. Inicia sesion.' });
      setIsSubmitting(false);
      return;
    }

    const rawCfgSubmit = typeof ejercicio.configuracion === 'string'
      ? (() => { try { return JSON.parse(ejercicio.configuracion as any); } catch { return {}; } })()
      : (ejercicio.configuracion ?? {});
    const esMvcSubmit = isMvcMode || rawCfgSubmit.tipo === 'mvc';

    // MVC: merge en frontend, enviar como texto normal
    const codigoSubmit = esMvcSubmit
      ? mergeMvcFiles(mvcMainCode || rawCfgSubmit.templateMain || '', mvcModeloCode || rawCfgSubmit.templateModelo || '', CONSOLA_IO_SOURCE)
      : code;

    const mvcSubmitExtra = esMvcSubmit
      ? {
          archivos: {
            main: mvcMainCode || rawCfgSubmit.templateMain || '',
            modelo: mvcModeloCode || rawCfgSubmit.templateModelo || '',
            consolaIO: CONSOLA_IO_SOURCE,
          },
        }
      : (executePath ? { codigo: code } : undefined);
    const result = await submitExercise(ejercicio.id, { texto: codigoSubmit }, estudianteId, submitPath, mvcSubmitExtra);
    const data: any = result.data || {};
    const syntaxErrorsSubmit = Array.isArray(data?.erroresSintaxis) ? data.erroresSintaxis : [];
    setSyntaxValidationErrors(syntaxErrorsSubmit);

    if (result.status === 429) {
      toast.warning('Evaluacion en curso', { description: result.message || 'Intenta nuevamente en unos segundos.' });
      setIsSubmitting(false);
      return;
    }

    if (result.status === 409) {
      setAprobado(true);
      setFeedback(data?.retroalimentacion || result.message || 'Ya tienes este ejercicio aprobado.');
      if (Array.isArray(data?.casosPrueba)) setCasosPruebaResultados(data.casosPrueba);
      toast.info('Ejercicio ya aprobado', { description: result.message || 'Ya tienes este ejercicio aprobado.' });
      setIsSubmitting(false);
      return;
    }

    // Soportar tanto casos (MVC) como casosPrueba (legacy)
    const casosSubmit = Array.isArray(data?.casos) ? data.casos : (Array.isArray(data?.casosPrueba) ? data.casosPrueba : []);
    if (casosSubmit.length > 0) setCasosPruebaResultados(casosSubmit);

    if (result.status === 400) {
      setFeedback(data?.retroalimentacion || data?.resumen || 'La solucion no supero la validacion.');
      if (typeof data?.puntosObtenidos === 'number') setPuntos(data.puntosObtenidos);
      setAprobado(false);
      toast.error(data?.resultado || 'No cumple', { description: data?.resumen || 'La solucion no supero la validacion.' });
      setIsSubmitting(false);
      return;
    }

    if (result.status === 200) {
      setAprobado(true);
      setFeedback(data?.retroalimentacion || data?.resumen || 'La solucion aprobo todos los casos.');
      if (typeof data?.puntosObtenidos === 'number') setPuntos(data.puntosObtenidos);
      toast.success(data?.resultado || 'Cumple', { description: data?.resumen || 'La solucion aprobo todos los casos.' });
      setIsSubmitting(false);
      return;
    }

    setFeedback(data?.message || result.message || 'No fue posible evaluar la solucion.');
    toast.error('Error tecnico', { description: data?.message || result.message || 'Error desconocido.' });
    setIsSubmitting(false);
  };

  return (
    <div className={wrapperClassName}>
      {!embedded && (
        <header className="border-b border-gray-200 bg-white shadow-sm">
          <div className="mx-auto max-w-full px-6 py-4 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white p-2.5 shadow-md">
                  <img src={logoImage} alt="EduPath" className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate font-bold text-[#3A4A5B]">Fundamentos de Programacion</h1>
                  <p className="truncate text-sm text-gray-500">{content.title}</p>
                </div>
              </div>
              <div className="rounded-lg px-4 py-2 font-mono text-sm shadow-sm" style={{ backgroundColor: `${subjectColor}15`, color: subjectColor }}>
                Java
              </div>
            </div>
          </div>
        </header>
      )}

      <div className={workspaceClassName}>
        {!embedded && (
          <button onClick={onBack} className="mb-1 flex items-center gap-2 text-gray-600 transition-colors hover:text-[#3A4A5B]">
            <ArrowLeft className="h-4 w-4" />
            <span>Volver</span>
          </button>
        )}

        <section className={`${cardClass} relative overflow-hidden`}>
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#4A90E2] via-[#5B9FED] to-[#7ED6A7]" />
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            <div className="min-w-0">
              <div className="mb-3 border-b border-slate-100 pb-3">
                <span className={sectionLabelClass}>Ejercicio</span>
                <h2 className="max-w-[32rem] text-[1.55rem] font-bold leading-tight text-[#3A4A5B]">{ejercicio?.actividad?.titulo || content.title}</h2>
              </div>
            </div>
            <div className="justify-self-start md:justify-self-end">
              <div className="inline-flex rounded-full px-4 py-2 text-sm font-semibold shadow-sm" style={{ background: 'linear-gradient(135deg, rgba(74,144,226,0.12) 0%, rgba(126,214,167,0.14) 100%)', color: subjectColor }}>
                {ejercicio?.puntos ? `${ejercicio.puntos} puntos` : 'Ejercicio de codigo'}
              </div>
            </div>
          </div>
          <p className="mt-4 border-t border-slate-100 pt-4 text-[14px] leading-6 text-gray-600">{ejercicio?.actividad?.descripcion || 'Sin descripcion disponible.'}</p>
        </section>

        <section className="grid grid-cols-1 gap-5">
          <div className={`${cardClass} relative flex min-w-0 flex-col overflow-hidden`}>
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#4A90E2]/25 via-transparent to-[#7ED6A7]/25" />
            <div className="mb-4 border-b border-slate-100 pb-3">
              <span className={sectionLabelClass}>Guía</span>
              <h3 className="text-[1.1rem] font-bold text-[#3A4A5B]">Instrucciones</h3>
            </div>
            <ul className="space-y-3 text-sm leading-7 text-gray-700">
              {guideItems.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#4A90E2]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className={`${cardClass} lg:max-h-[34vh] lg:overflow-y-auto`}>
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <span className={sectionLabelClass}>Validacion</span>
              <h3 className="text-lg font-bold text-[#3A4A5B]">Casos de prueba</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{configuredCases.length} casos</span>
          </div>

          {configuredCases.length === 0 ? (
            <p className="text-sm text-gray-500">No hay casos de prueba visibles para este ejercicio.</p>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {configuredCases.map((item, index) => (
                <div key={`${index}-${item.inputs || ''}`} className={`min-w-[300px] flex-1 rounded-[1.25rem] border p-4 ${getCaseAccent(index).card}`}>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className={`rounded-full px-3 py-1 text-xs font-semibold ${getCaseAccent(index).badge}`}>Caso {index + 1}</div>
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getCaseAccent(index).dot }} />
                  </div>
                  <div className="grid gap-3">
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Entrada</div>
                      <pre className="whitespace-pre-wrap break-words rounded-xl bg-white px-3 py-2 font-mono text-xs text-slate-700 ring-1 ring-slate-200">{normalizeCaseValue(item.inputs)}</pre>
                    </div>
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Salida esperada</div>
                      <pre className="whitespace-pre-wrap break-words rounded-xl bg-white px-3 py-2 font-mono text-xs text-slate-700 ring-1 ring-slate-200">{normalizeCaseValue(item.output)}</pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="w-full min-w-0 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_16px_36px_rgba(58,74,91,0.10)] lg:flex lg:min-h-0 lg:flex-col">
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-[linear-gradient(90deg,rgba(74,144,226,0.07)_0%,rgba(255,255,255,1)_42%,rgba(126,214,167,0.07)_100%)] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="rounded-2xl px-4 py-2 font-mono text-sm shadow-sm ring-1 ring-blue-100" style={{ background: 'linear-gradient(135deg, rgba(74,144,226,0.12) 0%, rgba(126,214,167,0.10) 100%)', color: subjectColor }}>
              Editor Java
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleClear}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
              >
                <Trash2 className="h-4 w-4" />
                Restaurar plantilla
              </button>
              <button
                onClick={handleFormatCode}
                disabled={isRunning || isSubmitting || isLoadingExercise}
                className="flex min-w-[150px] items-center justify-center gap-2 rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 px-5 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:from-violet-100 hover:to-fuchsia-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                Dar formato
              </button>
              <button
                onClick={handleExecute}
                disabled={isRunning || isSubmitting || isLoadingExercise}
                className="flex items-center gap-2 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 px-5 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:from-blue-100 hover:to-cyan-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRunning && <Loader2 className="h-4 w-4 animate-spin" />}
                {isRunning ? 'Ejecutando...' : 'Ejecutar'}
              </button>
              {configurableMode ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
                  La solución actual se evaluará con el botón principal del miniproyecto.
                </div>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || isRunning || aprobado || isLoadingExercise}
                  className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: isSubmitting || isRunning || aprobado || isLoadingExercise ? '#94a3b8' : 'linear-gradient(135deg, #4A90E2 0%, #5B9FED 55%, #7ED6A7 100%)' }}
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {aprobado ? 'Aprobado' : isSubmitting ? 'Enviando...' : 'Enviar'}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col lg:min-h-0 lg:flex-1">
            {isMvcMode ? (
              <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 320px)' }}>

                {/* ── Barra de pestañas MVC — mismo gradiente que el toolbar ── */}
                <div className="shrink-0 border-b border-slate-200 bg-[linear-gradient(90deg,rgba(74,144,226,0.06)_0%,rgba(255,255,255,1)_50%,rgba(126,214,167,0.06)_100%)] px-2">
                  <div className="flex items-end gap-1">
                    {(
                      [
                        { id: 'main' as const, label: 'Main.java', icon: null },
                        { id: 'modelo' as const, label: `${mvcNombreModelo}.java`, icon: null },
                        { id: 'consolaIO' as const, label: 'ConsolaIO.java', icon: <Lock className="h-3 w-3 text-amber-500" /> },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setMvcActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 rounded-t-xl px-4 py-2.5 text-xs font-mono font-semibold transition-all ${
                          mvcActiveTab === tab.id
                            ? 'border-b-2 bg-white text-[#3A4A5B] shadow-sm'
                            : 'text-slate-400 hover:bg-white/60 hover:text-slate-600'
                        }`}
                        style={mvcActiveTab === tab.id ? { borderBottomColor: '#4A90E2' } : {}}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    ))}
                    <div className="ml-auto self-center pr-2">
                      <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ background: 'rgba(74,144,226,0.10)', color: '#4A90E2' }}>
                        Java · MVC
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Área Monaco — altura fija en px para que Monaco pueda calcularla ── */}
                <div
                  style={{
                    backgroundImage: 'radial-gradient(circle at top left, rgba(74,144,226,0.18), transparent 28%), radial-gradient(circle at bottom right, rgba(126,214,167,0.12), transparent 24%), linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(15,23,42,1) 100%)'
                  }}
                >
                  {mvcActiveTab === 'main' && (
                    <JavaEditor
                      key={`main-${ejercicio?.id}`}
                      value={mvcMainCode}
                      readOnly={false}
                      onChange={(v) => setMvcMainCode(v)}
                      height={520}
                      protectedTemplate={(ejercicio?.configuracion as any)?.templateMain || undefined}
                    />
                  )}
                  {mvcActiveTab === 'modelo' && (
                    <JavaEditor
                      key={`modelo-${ejercicio?.id}`}
                      value={mvcModeloCode}
                      readOnly={false}
                      onChange={(v) => setMvcModeloCode(v)}
                      height={520}
                      protectedTemplate={(ejercicio?.configuracion as any)?.templateModelo || undefined}
                    />
                  )}
                  {mvcActiveTab === 'consolaIO' && (
                    <JavaEditor key="consolaIO" value={CONSOLA_IO_SOURCE} readOnly readOnlyLabel="ConsolaIO.java — solo lectura, clase de utilidad fija del sistema" height={520} />
                  )}
                </div>

                {/* ── Panel de resultados de casos de prueba (igual que ejercicios normales) ── */}
                <div className="shrink-0 border-t border-slate-200 bg-white p-5">
                  <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <span className={sectionLabelClass}>Resultado</span>
                      <h4 className="text-sm font-bold text-[#3A4A5B]">Casos de prueba</h4>
                    </div>
                    {puntos !== null && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Puntos: {puntos}</span>}
                  </div>
                  {(normalizedFeedback || feedback) && !shouldHideGenericSyntaxFeedback && (
                    isCompilerError(feedback)
                      ? <MvcDiagnosticBlock error={feedback} consolaIOCode={CONSOLA_IO_SOURCE} modeloCode={mvcModeloCode} mainCode={mvcMainCode} className="mb-4" />
                      : <div className={`mb-4 rounded-xl border px-4 py-3 text-sm leading-6 ${aprobado ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>{normalizedFeedback || feedback}</div>
                  )}
                  {!aprobado && syntaxValidationErrors.length > 0 && (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                      <div className="mb-1 font-semibold text-amber-800">Restricciones no cumplidas</div>
                      <div className="mb-2 text-amber-700">Ajusta tu solución para incluir estas estructuras obligatorias:</div>
                      <ul className="space-y-1 text-amber-900">
                        {syntaxValidationErrors.map((error, index) => (
                          <li key={`${error}-${index}`}>- {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {casosPruebaResultados.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                      Presiona <strong>Ejecutar</strong> para probar tu código contra los casos del docente, o <strong>Enviar</strong> para calificar.
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-3">
                      {casosPruebaResultados.map((caso) => {
                        const visual = getCaseVisualState(caso);
                        const Icon = visual.icon;
                        return (
                          <div key={caso.caseNum} className={`rounded-xl border p-4 ${visual.cardClass}`}>
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                                <Icon className={`h-4 w-4 ${visual.iconClass}`} />
                                Caso {caso.caseNum}
                              </div>
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${visual.badgeClass}`}>{visual.label}</span>
                            </div>
                            <p className={`text-sm leading-6 ${caso.paso ? 'text-emerald-700' : (caso.omitido ? 'text-amber-600' : 'text-rose-700')}`}>{getCaseMessage(caso)}</p>
                            {!caso.omitido && (caso.outputObtenido || (caso as any).stdout) && (
                              <TerminalOutput output={interleaveInputsWithOutput(
                                caso.outputObtenido || (caso as any).stdout || '',
                                configuredCases[caso.caseNum - 1]?.inputs || ''
                              )} />
                            )}
                            {!caso.omitido && isCompilerError(caso.error) && (
                              <MvcDiagnosticBlock error={caso.error!} consolaIOCode={CONSOLA_IO_SOURCE} modeloCode={mvcModeloCode} mainCode={mvcMainCode} className="mt-3" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="min-h-[920px] w-full overflow-auto bg-slate-950 p-6 lg:min-h-[78vh] lg:flex-1" style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(74,144,226,0.18), transparent 28%), radial-gradient(circle at bottom right, rgba(126,214,167,0.12), transparent 24%), linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(15,23,42,1) 100%)' }}>
                <div className="flex min-h-full w-full">
                  <div className="mr-5 shrink-0 border-r border-slate-700/90 pr-4 text-right font-mono text-sm text-slate-400 select-none">
                    {Array.from({ length: visibleEditorLineCount }, (_, index) => <div key={index}>{index + 1}</div>)}
                  </div>
                  <textarea
                    value={code}
                    onChange={(e) => {
                      const next = e.target.value;
                      const tpl = getInitialTemplate(ejercicio);
                      if (tpl && !isStructureIntact(next, tpl)) {
                        toast.error('[ESTADO]: Línea protegida', {
                          description: '[ACCIÓN]: Esta línea es parte de la estructura del docente y no puede eliminarse.',
                          duration: 2500,
                        });
                        return; // descarta el cambio
                      }
                      setCode(next);
                    }}
                    rows={EDITOR_BASE_VISIBLE_LINES}
                    className="min-h-full w-full flex-1 resize-none bg-transparent font-mono text-[15px] leading-7 text-white outline-none"
                    spellCheck={false}
                  />
                </div>
              </div>
            )}

            {!isMvcMode && (
              <div className="border-t border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-600">Resultado</h3>
                {puntos !== null && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Puntos: {puntos}</span>}
              </div>

              {(normalizedFeedback || feedback) && !shouldHideGenericSyntaxFeedback && (
                isCompilerError(feedback)
                  ? <DiagnosticBlock error={feedback} studentCode={code} offset={COMPILER_WRAPPER_LINE_OFFSET} className="mb-4" />
                  : <div className={`mb-4 rounded-xl border px-4 py-3 text-sm leading-6 ${aprobado ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>{normalizedFeedback || feedback}</div>
              )}
              {!aprobado && syntaxValidationErrors.length > 0 && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                  <div className="mb-1 font-semibold text-amber-800">Restricciones no cumplidas</div>
                  <div className="mb-2 text-amber-700">Ajusta tu solución para incluir estas estructuras obligatorias:</div>
                  <ul className="space-y-1 text-amber-900">
                    {syntaxValidationErrors.map((error, index) => (
                      <li key={`${error}-${index}`}>- {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {isLoadingExercise ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">Cargando ejercicio...</div>
              ) : casosPruebaResultados.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  {resultMode === 'execution' ? 'La ejecución mostrará la salida por caso.' : 'El envío mostrará el estado de cada caso.'}
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {casosPruebaResultados.map((caso) => {
                    const visual = getCaseVisualState(caso);
                    const Icon = visual.icon;
                    return (
                      <div key={caso.caseNum} className={`rounded-xl border p-4 ${visual.cardClass}`}>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                            <Icon className={`h-4 w-4 ${visual.iconClass}`} />
                            Caso {caso.caseNum}
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${visual.badgeClass}`}>{visual.label}</span>
                        </div>
                        <p className={`text-sm leading-6 ${caso.paso ? 'text-emerald-700' : (caso.omitido ? 'text-amber-600' : 'text-rose-700')}`}>{getCaseMessage(caso)}</p>
                        {!caso.omitido && (caso.outputObtenido || (caso as any).stdout) && (
                          <TerminalOutput output={interleaveInputsWithOutput(
                            caso.outputObtenido || (caso as any).stdout || '',
                            configuredCases[caso.caseNum - 1]?.inputs || ''
                          )} />
                        )}
                        {!caso.omitido && isCompilerError(caso.error) && (
                          <DiagnosticBlock error={caso.error!} studentCode={code} offset={COMPILER_WRAPPER_LINE_OFFSET} className="mt-3" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
