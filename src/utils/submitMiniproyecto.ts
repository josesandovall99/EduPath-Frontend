export interface SubmitMiniproyectoResult<T = any> {
  status: number;
  data: T | null;
  message?: string;
}

/**
 * POST a programming miniproyecto submission to the backend.
 * Endpoint: POST /miniproyectos/:id/enviar
 * Body: { estudiante_id, codigo, lenguaje_id }
 */
export async function submitMiniproyecto(
  miniproyectoId: string | number,
  payload: { codigo: string; lenguaje_id: number },
  estudianteId?: string | number
): Promise<SubmitMiniproyectoResult> {
  try {
    const body = {
      estudiante_id: estudianteId,
      codigo: payload.codigo,
      lenguaje_id: payload.lenguaje_id
    };

    const res = await fetch(`http://localhost:4000/miniproyectos/${miniproyectoId}/enviar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      // Non-JSON or empty body
    }

    return { status: res.status, data, message: data && (data.message || data.error) };
  } catch (error: any) {
    return { status: 0, data: null, message: error?.message || 'Network error' };
  }
}
