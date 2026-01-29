export interface SubmitResult<T = any> {
  status: number;
  data: T | null;
  message?: string;
}

/**
 * POST an exercise submission to the backend using the new contract.
 * Endpoint: POST /ejercicios/:id/enviar
 * Body: { estudiante_id, respuesta }
 */
export async function submitExercise(
  ejercicioId: string | number,
  respuesta: any,
  estudianteId?: string | number
): Promise<SubmitResult> {
  try {
    const res = await fetch(`http://localhost:4000/ejercicios/${ejercicioId}/enviar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estudiante_id: estudianteId, respuesta })
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
