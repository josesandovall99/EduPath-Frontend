import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type TipoPilar = 'PROGRAMACION' | 'ANALISIS' | 'ATC' | null;

interface AreaContextValue {
  asignaturaId: number | null;
  asignaturaName: string;
  tipoPilar: TipoPilar;
  /** Establece el área activa al entrar a una asignatura. */
  setArea: (id: number, name: string, pilar?: TipoPilar) => void;
  /** Limpia el área activa al salir al panel general. */
  clearArea: () => void;
}

const AreaContext = createContext<AreaContextValue | null>(null);

export function AreaProvider({ children }: { children: React.ReactNode }) {
  const [asignaturaId, setAsignaturaId] = useState<number | null>(null);
  const [asignaturaName, setAsignaturaName] = useState('');
  const [tipoPilar, setTipoPilar] = useState<TipoPilar>(null);

  const setArea = useCallback((id: number, name: string, pilar: TipoPilar = null) => {
    setAsignaturaId(id);
    setAsignaturaName(name);
    setTipoPilar(pilar);
  }, []);

  const clearArea = useCallback(() => {
    setAsignaturaId(null);
    setAsignaturaName('');
    setTipoPilar(null);
  }, []);

  const value = useMemo(
    () => ({ asignaturaId, asignaturaName, tipoPilar, setArea, clearArea }),
    [asignaturaId, asignaturaName, tipoPilar, setArea, clearArea],
  );

  return <AreaContext.Provider value={value}>{children}</AreaContext.Provider>;
}

/** Devuelve el contexto del área activa. Lanza si se usa fuera de AreaProvider. */
export function useArea(): AreaContextValue {
  const ctx = useContext(AreaContext);
  if (!ctx) throw new Error('useArea debe usarse dentro de <AreaProvider>');
  return ctx;
}
