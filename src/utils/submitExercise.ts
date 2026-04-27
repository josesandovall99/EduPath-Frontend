import { API_BASE_URL } from './constants';

export interface SubmitResult<T = any> {
  status: number;
  data: T | null;
  message?: string;
}

/**
 * POST an exercise submission to the backend.
 * Endpoint: POST /ejercicios/:id/enviar
 * Body: { estudiante_id, respuesta }
 */
export async function submitExercise(
  ejercicioId: string | number,
  respuesta: any,
  estudianteId?: string | number,
  endpointPath?: string,
  extraBody?: Record<string, unknown>
): Promise<SubmitResult> {
  try {
    const resolvedEstudianteId =
      estudianteId ??
      localStorage.getItem('estudianteId') ??
      localStorage.getItem('userId');

    if (!resolvedEstudianteId) {
      return {
        status: 0,
        data: null,
        message: 'No se encontró estudiante_id en la sesión activa. Se requiere autenticación de estudiante.'
      };
    }

    const body = { estudiante_id: resolvedEstudianteId, respuesta, lenguaje_id: 62, ...(extraBody || {}) };
    const targetPath = endpointPath || `/ejercicios/${ejercicioId}/enviar`;
    const res = await fetch(`${API_BASE_URL}${targetPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include'
    });

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      // Non-JSON or empty body
    }

    return { status: res.status, data, message: (data && (data.message || data.error)) };
  } catch (error: any) {
    return { status: 0, data: null, message: error?.message || 'Network error' };
  }
}

export async function executeExercise(
  ejercicioId: string | number,
  respuesta: any,
  lenguajeId: number = 62,
  endpointPath?: string,
  extraBody?: Record<string, unknown>
): Promise<SubmitResult> {
  try {
    const targetPath = endpointPath || '/evaluaciones/compilador/ejecutar';
    const payload = endpointPath
      ? { lenguaje_id: lenguajeId, codigo: respuesta, ...(extraBody || {}) }
      : {
          ejercicio_id: ejercicioId,
          lenguaje_id: lenguajeId,
          respuesta,
          ...(extraBody || {}),
        };
    const res = await fetch(`${API_BASE_URL}${targetPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include'
    });

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      // Non-JSON or empty body
    }

    return { status: res.status, data, message: (data && (data.message || data.error)) };
  } catch (error: any) {
    return { status: 0, data: null, message: error?.message || 'Network error' };
  }
}
