export type ConfigurableExerciseType = 'Compilador' | 'Diagramas UML' | 'Preguntas' | 'Opción única' | 'Ordenar' | 'Relacionar';

export type MetodoDerivado = {
  nombre: string;
  retorno: string;
  parametros: Array<{ nombre: string; tipo: string }>;
};

export type CompilerCase = { inputs: string; output: string };

export interface EmbeddedQuestion {
  id: string;
  enunciado: string;
  tipo: 'opcion-multiple' | 'abierta';
  opciones?: string[];
  respuesta_correcta: string;
}

export interface EmbeddedExercise {
  id: string;
  titulo: string;
  descripcion: string;
  tipo_ejercicio: ConfigurableExerciseType;
  puntos: number;
  resultado_ejercicio?: string;
  codigoEstructura?: string | null;
  configuracion?: any;
}

export interface ConfigurableMiniproyectoPayload {
  tipo: 'configurable';
  modo?: 'ejercicios';
  exercises: EmbeddedExercise[];
  exerciseIds?: number[];
  chatbot?: {
    enabled: boolean;
    chatbotId: number | null;
  };
}

const JAVA_LANGUAGE_ID = 62;

export const emptyCompilerCase = (): CompilerCase => ({ inputs: '', output: '' });

export const createDefaultCompilerConfig = () => ({
  tipo: 'programacion',
  lenguajesPermitidos: [JAVA_LANGUAGE_ID],
  sintaxis: [],
  casos_prueba: [emptyCompilerCase(), emptyCompilerCase(), emptyCompilerCase()],
  metodo: null as MetodoDerivado | null,
});

export const createDefaultUmlConfig = () => ({
  opciones: {
    minClasses: 2,
    requireRelationships: false,
    requireMultiplicities: false,
  }
});

function createExerciseId() {
  return `embedded_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function parseMethodTemplate(template: string): MetodoDerivado | null {
  const match = template.match(/(?:public|private|protected)?\s*(?:static\s+)?([A-Za-z_][A-Za-z0-9_<>\[\],\s?]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*\{/);
  if (!match) return null;

  const parametros = match[3].trim()
    ? match[3].split(',').map((parametro) => parametro.trim()).filter(Boolean).map((parametro, index) => {
        const partes = parametro.split(/\s+/).filter(Boolean);
        if (partes.length < 2) {
          return { tipo: partes[0] || 'String', nombre: `arg${index}` };
        }
        const nombre = partes.pop() || `arg${index}`;
        return { tipo: partes.join(' '), nombre };
      })
    : [];

  return {
    retorno: match[1].trim(),
    nombre: match[2].trim(),
    parametros,
  };
}

export function formatJavaLikeTemplate(input: string) {
  const lines = input.split('\n');
  let indentLevel = 0;

  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';

      const leadingClosers = (trimmed.match(/^\}+/) || [''])[0].length;
      indentLevel = Math.max(0, indentLevel - leadingClosers);

      const formatted = `${'    '.repeat(indentLevel)}${trimmed}`;

      const openBraces = (trimmed.match(/\{/g) || []).length;
      const closeBraces = (trimmed.match(/\}/g) || []).length;
      indentLevel = Math.max(0, indentLevel + openBraces - closeBraces + leadingClosers);

      return formatted;
    })
    .join('\n');
}

export function createEmptyEmbeddedExercise(type: ConfigurableExerciseType = 'Opción única'): EmbeddedExercise {
  if (type === 'Compilador') {
    return {
      id: createExerciseId(),
      titulo: 'Ejercicio de compilador',
      descripcion: '',
      tipo_ejercicio: 'Compilador',
      puntos: 100,
      resultado_ejercicio: '',
      configuracion: {
        tipo: 'mvc',
        nombreModelo: 'Modelo',
        templateMain: '',
        templateModelo: '',
        esperado: '',
        lenguajesPermitidos: [62],
        sintaxis: [],
      },
    };
  }

  if (type === 'Diagramas UML') {
    return {
      id: createExerciseId(),
      titulo: 'Ejercicio UML',
      descripcion: '',
      tipo_ejercicio: 'Diagramas UML',
      puntos: 100,
      resultado_ejercicio: 'Diagrama UML evaluable',
      configuracion: createDefaultUmlConfig(),
    };
  }

  if (type === 'Ordenar') {
    return {
      id: createExerciseId(),
      titulo: 'Ejercicio de ordenar',
      descripcion: '',
      tipo_ejercicio: 'Ordenar',
      puntos: 100,
      resultado_ejercicio: 'Orden correcto',
      configuracion: {
        enunciado: '',
        items: ['Paso 1', 'Paso 2', 'Paso 3'],
      },
    };
  }

  if (type === 'Relacionar') {
    return {
      id: createExerciseId(),
      titulo: 'Ejercicio de relacionar',
      descripcion: '',
      tipo_ejercicio: 'Relacionar',
      puntos: 100,
      resultado_ejercicio: 'Relaciones correctas',
      configuracion: {
        enunciado: '',
        pares: [
          { concepto: 'Concepto 1', definicion: 'Definición 1' },
          { concepto: 'Concepto 2', definicion: 'Definición 2' },
        ],
      },
    };
  }

  if (type === 'Preguntas') {
    return {
      id: createExerciseId(),
      titulo: 'Cuestionario',
      descripcion: '',
      tipo_ejercicio: 'Preguntas',
      puntos: 100,
      resultado_ejercicio: 'Cuestionario estructurado',
      configuracion: {
        preguntas: [
          {
            id: 'pregunta_1',
            enunciado: '',
            tipo: 'opcion-multiple',
            opciones: ['Opción 1', 'Opción 2'],
            respuesta_correcta: 'Opción 1',
          },
        ],
      },
    };
  }

  return {
    id: createExerciseId(),
    titulo: 'Opción única',
    descripcion: '',
    tipo_ejercicio: 'Opción única',
    puntos: 100,
    resultado_ejercicio: 'Opción 1',
    configuracion: {
      enunciado: '',
      opciones: ['Opción 1', 'Opción 2', 'Opción 3', 'Opción 4'],
      respuestaCorrecta: 'Opción 1',
    },
  };
}

function normalizeEmbeddedExercise(rawExercise: any, index: number): EmbeddedExercise {
  const fallback = createEmptyEmbeddedExercise(
    ['Compilador', 'Diagramas UML', 'Preguntas', 'Opción única', 'Ordenar', 'Relacionar'].includes(rawExercise?.tipo_ejercicio)
      ? rawExercise.tipo_ejercicio
      : 'Opción única'
  );

  const mergedConfig = {
    ...fallback.configuracion,
    ...(rawExercise?.configuracion || {}),
  };

  const normalizedResult = rawExercise?.tipo_ejercicio === 'Opción única'
    ? (rawExercise?.resultado_ejercicio ?? mergedConfig.respuestaCorrecta ?? fallback.resultado_ejercicio)
    : (rawExercise?.resultado_ejercicio ?? fallback.resultado_ejercicio);

  return {
    ...fallback,
    ...rawExercise,
    id: typeof rawExercise?.id === 'string' && rawExercise.id.trim() ? rawExercise.id : fallback.id,
    titulo: typeof rawExercise?.titulo === 'string' && rawExercise.titulo.trim() ? rawExercise.titulo : `Ejercicio ${index + 1}`,
    descripcion: typeof rawExercise?.descripcion === 'string' ? rawExercise.descripcion : '',
    puntos: Number.isFinite(Number(rawExercise?.puntos)) ? Number(rawExercise.puntos) : fallback.puntos,
    configuracion: mergedConfig,
    codigoEstructura: rawExercise?.codigoEstructura ?? fallback.codigoEstructura,
    resultado_ejercicio: normalizedResult,
  };
}

export function parseConfigurableMiniproyecto(value: unknown): ConfigurableMiniproyectoPayload | null {
  if (!value) return null;

  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  if (String((parsed as { tipo?: string }).tipo || '').trim().toLowerCase() !== 'configurable') return null;

  const rawExercises = Array.isArray((parsed as { exercises?: unknown[] }).exercises)
    ? (parsed as { exercises: unknown[] }).exercises
    : [];

  const rawExerciseIds = Array.isArray((parsed as { exerciseIds?: unknown[] }).exerciseIds)
    ? (parsed as { exerciseIds: unknown[] }).exerciseIds
    : [];

  return {
    tipo: 'configurable',
    modo: 'ejercicios',
    exercises: rawExercises.map((exercise, index) => normalizeEmbeddedExercise(exercise, index)),
    exerciseIds: Array.from(new Set(rawExerciseIds.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0))),
    chatbot: {
      enabled: Boolean((parsed as { chatbot?: { enabled?: boolean } }).chatbot?.enabled),
      chatbotId: Number((parsed as { chatbot?: { chatbotId?: number | null } }).chatbot?.chatbotId) || null,
    },
  };
}