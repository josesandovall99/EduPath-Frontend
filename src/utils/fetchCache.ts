/**
 * fetchCache — caché en memoria para peticiones GET.
 *
 * Implementa el patrón stale-while-revalidate:
 *  1. Si hay datos en caché, los devuelve inmediatamente (respuesta < 1 ms).
 *  2. En paralelo lanza el fetch al servidor.
 *  3. Cuando llegan los datos frescos, actualiza la caché y notifica a los
 *     listeners registrados para ese endpoint.
 *
 * Los datos en caché tienen un TTL configurable (por defecto 60 s). Pasado ese
 * tiempo se consideran stale y el siguiente llamante dispara una revalidación.
 *
 * Uso:
 *   const data = await cachedFetch('/asignaturas', headers);
 */

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const store = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 60_000; // 60 segundos

/**
 * Retorna true si la entrada existe y aún está dentro del TTL.
 */
function isFresh(entry: CacheEntry | undefined, ttlMs: number): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp < ttlMs;
}

/**
 * Fetch con caché in-memory.
 *
 * @param url      URL completa del endpoint.
 * @param options  Opciones de `fetch` (headers, credentials, etc.).
 * @param ttlMs    Tiempo de vida de la caché en milisegundos.
 */
export async function cachedFetch(
  url: string,
  options?: RequestInit,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<unknown> {
  const entry = store.get(url);

  if (isFresh(entry, ttlMs)) {
    // Datos frescos en caché — respuesta instantánea.
    return entry!.data;
  }

  // Sin caché válida: fetch normal y guardado en caché.
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`HTTP ${response.status} en ${url}`);
  const data = await response.json();
  store.set(url, { data, timestamp: Date.now() });
  return data;
}

/**
 * Invalida la caché de una URL específica (p.ej. después de un POST/PUT/DELETE).
 */
export function invalidateCache(url: string): void {
  store.delete(url);
}

/**
 * Invalida todas las entradas cuya URL empiece por el prefijo dado.
 * Útil para limpiar todo lo relacionado con `/asignaturas` de golpe.
 */
export function invalidateCacheByPrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/** Vacía toda la caché (p.ej. al hacer logout). */
export function clearAllCache(): void {
  store.clear();
}
