import { API_BASE_URL } from './constants';

export interface MvcArchivos {
  main: string;
  modelo: string;
  consolaIO: string;
}

export interface MvcPayload {
  archivos: MvcArchivos;
  /** stdin separado por comas que se convierte a newlines en el backend */
  stdin_manual?: string;
  lenguaje_id: number;
}

export interface SubmitMiniproyectoResult<T = any> {
  status: number;
  data: T | null;
  message?: string;
}

/**
 * POST a programming miniproyecto submission to the backend.
 * Endpoint: POST /miniproyectos/:id/enviar
 * Supports both single-file (codigo) and multi-file MVC (archivos) modes.
 */
export async function submitMiniproyecto(
  miniproyectoId: string | number,
  payload: { codigo?: string; archivos?: MvcArchivos; stdin_manual?: string; lenguaje_id: number },
  estudianteId?: string | number
): Promise<SubmitMiniproyectoResult> {
  try {
    const body: Record<string, unknown> = {
      estudiante_id: estudianteId,
      lenguaje_id: payload.lenguaje_id
    };

    if (payload.archivos) {
      body.archivos = payload.archivos;
      if (payload.stdin_manual !== undefined) {
        body.stdin_manual = payload.stdin_manual;
      }
    } else {
      body.codigo = payload.codigo ?? '';
    }

    const res = await fetch(`${API_BASE_URL}/miniproyectos/${miniproyectoId}/enviar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include'
    });

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      // Cuerpo no-JSON o vacío
    }

    return { status: res.status, data, message: data && (data.message || data.error) };
  } catch (error: any) {
    return { status: 0, data: null, message: error?.message || 'Network error' };
  }
}
