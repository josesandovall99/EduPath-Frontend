// Caché compartida para los resultados del endpoint /chatbots/resolve.
// Evita repetir la llamada cuando los paneles de chatbot se remontan dentro de la misma sesión.
// null en el mapa = chatbot no encontrado (404).

interface CachedChatbot {
  id: number;
  nombre: string;
  tipo: string;
  fallback?: boolean;
}

const cache = new Map<string, CachedChatbot | null>();

export function getChatbotResolveKey(tipo: string, asignaturaId?: number, miniproyectoId?: number): string {
  return `${tipo}:${asignaturaId ?? ''}:${miniproyectoId ?? ''}`;
}

export function getCachedChatbot(key: string): { found: boolean; value: CachedChatbot | null } {
  if (!cache.has(key)) return { found: false, value: null };
  return { found: true, value: cache.get(key) ?? null };
}

export function setCachedChatbot(key: string, value: CachedChatbot | null): void {
  cache.set(key, value);
}

/** Limpia la caché al hacer logout para que la próxima sesión resuelva de nuevo. */
export function clearChatbotResolveCache(): void {
  cache.clear();
}
