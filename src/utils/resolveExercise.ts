export interface ResolveResult<T = any> {
  status: number;
  data: T | null;
  message?: string;
}

/**
 * POST to resolver endpoint: /ejercicios/:id/resolver
 * Validates only and returns result; does not persist.
 */
export async function resolveExercise(
  ejercicioId: string | number,
  body: any
): Promise<ResolveResult> {
  try {
    const res = await fetch(`https://edupath-backend-xch1.onrender.com/ejercicios/${ejercicioId}/resolver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    let data: any = null;
    try { data = await res.json(); } catch { /* empty */ }
    return { status: res.status, data, message: (data && (data.message || data.error)) };
  } catch (error: any) {
    return { status: 0, data: null, message: error?.message || 'Network error' };
  }
}
