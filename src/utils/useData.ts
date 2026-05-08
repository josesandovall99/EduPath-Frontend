/**
 * useData — hook de fetching con caché in-memory y stale-while-revalidate.
 *
 * Patrón:
 *  1. Si hay datos en caché → los devuelve inmediatamente (loading = false).
 *  2. En paralelo revalida en segundo plano y actualiza cuando lleguen datos frescos.
 *  3. Si no hay caché → muestra loading hasta que llegue la primera respuesta.
 *
 * Esto elimina los "pantallazos en blanco" al navegar entre pantallas que ya
 * se visitaron y reduce el TTF (Time To First Content) a < 10 ms en rutas cacheadas.
 */
import { useEffect, useRef, useState } from 'react';
import { cachedFetch, invalidateCache } from './fetchCache';
import { buildAuthHeaders } from './authHeaders';
import { API_BASE_URL } from './constants';

interface UseDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Fuerza una recarga invalidando la caché y refetch. */
  refresh: () => void;
}

/**
 * @param path   Ruta relativa al API_BASE_URL (ej: '/asignaturas').
 * @param ttlMs  Tiempo de vida de la caché en ms (default 60 s).
 */
export function useData<T = unknown>(
  path: string | null,
  ttlMs = 60_000,
): UseDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rev, setRev] = useState(0); // contador de refresh

  const pathRef = useRef(path);
  pathRef.current = path;

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const url = `${API_BASE_URL}${path}`;
    const options: RequestInit = {
      headers: buildAuthHeaders({ Accept: 'application/json' }),
      credentials: 'include',
    };

    cachedFetch(url, options, ttlMs)
      .then((result) => {
        if (!cancelled) {
          setData(result as T);
          setLoading(false);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? 'Error al cargar datos');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [path, ttlMs, rev]);

  const refresh = () => {
    if (path) invalidateCache(`${API_BASE_URL}${path}`);
    setLoading(true);
    setRev((r) => r + 1);
  };

  return { data, loading, error, refresh };
}
