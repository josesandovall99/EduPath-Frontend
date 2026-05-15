export const PM_EXERCISE_FORM_TYPES = ['pm_mapa_poder', 'pm_edt'] as const;

export type PmExerciseFormType = (typeof PM_EXERCISE_FORM_TYPES)[number];

export const PM_EXERCISE_LABELS: Record<PmExerciseFormType, string> = {
  pm_mapa_poder: 'PM · Mapa de poder e interés',
  pm_edt: 'PM · Constructor EDT (WBS)',
};

export const PM_EXERCISE_DESCRIPTIONS: Partial<Record<PmExerciseFormType, string>> = {
  pm_mapa_poder: 'Arrastra interesados a la matriz poder/interés; el servidor valida el cuadrante.',
  pm_edt: 'Jerarquía de paquetes de trabajo alineada a la EDT del caso.',
};

/** Tipos `pm_*` antiguos en JSON persistido (ruta crítica, cotizador, EVM). */
const PM_LEGACY_FORM_PREFIX = 'pm_';

export function isPmExerciseFormType(value: string): value is PmExerciseFormType {
  return (PM_EXERCISE_FORM_TYPES as readonly string[]).includes(value);
}

export function varianteFromPmExerciseFormType(tipo: string): string | null {
  if (!isPmExerciseFormType(tipo)) return null;
  return tipo.slice(3);
}

export function pmExerciseFormTypeFromVariante(variante: string): PmExerciseFormType {
  if (variante === 'edt') return 'pm_edt';
  return 'pm_mapa_poder';
}

/** Rotula filas de tabla cuando el API devuelve Simulación GP. */
export function labelForStoredExerciseTipo(
  tipo: string,
  configuracion?: { variante?: string } | null
): string {
  if (tipo === 'Simulación GP' && configuracion?.variante) {
    const k = pmExerciseFormTypeFromVariante(String(configuracion.variante));
    return PM_EXERCISE_LABELS[k];
  }
  if (isPmExerciseFormType(tipo)) return PM_EXERCISE_LABELS[tipo];
  if (tipo.startsWith(PM_LEGACY_FORM_PREFIX)) return PM_EXERCISE_LABELS.pm_mapa_poder;
  return tipo;
}

/** Persistencia hacia API / JSON de miniproyecto: pm_* → Simulación GP + variante. */
export function persistEmbeddedExerciseForApi<T extends { tipo_ejercicio: string; configuracion?: any }>(exercise: T): T {
  if (!isPmExerciseFormType(exercise.tipo_ejercicio)) return exercise;
  const variante = varianteFromPmExerciseFormType(exercise.tipo_ejercicio)!;
  return {
    ...exercise,
    tipo_ejercicio: 'Simulación GP' as any,
    configuracion: {
      ...(exercise.configuracion || {}),
      tipo: 'simulacion-gp',
      variante,
    },
  };
}

export function persistConfigurableExercisesForApi<T extends { tipo_ejercicio: string; configuracion?: any }>(
  exercises: T[]
): T[] {
  return exercises.map(persistEmbeddedExerciseForApi);
}
