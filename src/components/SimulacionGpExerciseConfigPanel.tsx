import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  PM_VARIANTES,
  pmDefaultConfig,
  pmDefaultSpecForVariante,
  type PmSimVariante,
} from '../utils/pmSimulationSpecTemplates';

export function SimulacionGpExerciseConfigPanel({
  configuracion,
  onConfigChange,
}: {
  configuracion: any;
  onConfigChange: (next: { tipo: string; variante: string; spec: Record<string, unknown> }) => void;
}) {
  const variante = (configuracion?.variante || 'mapa_poder') as PmSimVariante;
  const [specText, setSpecText] = useState(() =>
    JSON.stringify(configuracion?.spec || pmDefaultSpecForVariante(variante), null, 2)
  );

  useEffect(() => {
    setSpecText(JSON.stringify(configuracion?.spec || pmDefaultSpecForVariante(variante), null, 2));
  }, [variante, JSON.stringify(configuracion?.spec ?? null)]);

  const applySpecText = () => {
    try {
      const spec = JSON.parse(specText) as Record<string, unknown>;
      if (!spec || typeof spec !== 'object') {
        toast.error('Spec inválido', { description: 'El JSON debe ser un objeto.' });
        return;
      }
      onConfigChange({
        tipo: 'simulacion-gp',
        variante,
        spec,
      });
      toast.success('Spec actualizado');
    } catch {
      toast.error('JSON inválido', { description: 'Revisa comillas y comas en el spec.' });
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <h3 className="font-semibold text-[#3A4A5B] text-sm">Simulación de gestión de proyectos</h3>
      <p className="text-xs text-slate-600">
        Variantes activas: <strong>mapa de poder</strong> y <strong>EDT/WBS</strong>. El servidor valida la respuesta del estudiante según
        el <code className="text-[11px]">spec</code>.
      </p>

      <div className="app-form-field">
        <label className="app-form-label">Variante</label>
        <select
          className="app-form-select"
          value={variante}
          onChange={(e) => {
            const v = e.target.value as PmSimVariante;
            onConfigChange(pmDefaultConfig(v) as { tipo: string; variante: string; spec: Record<string, unknown> });
          }}
        >
          {PM_VARIANTES.map((v) => (
            <option key={v} value={v}>
              {v.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="app-btn app-btn-secondary px-4 py-2 text-sm"
          onClick={() => {
            onConfigChange(
              pmDefaultConfig(variante) as { tipo: string; variante: string; spec: Record<string, unknown> }
            );
            toast.message('Plantilla base cargada', { description: variante });
          }}
        >
          Cargar plantilla base
        </button>
        <button
          type="button"
          className="app-btn app-btn-secondary px-4 py-2 text-sm"
          onClick={() => {
            const spec = pmDefaultSpecForVariante(variante);
            setSpecText(JSON.stringify(spec, null, 2));
            onConfigChange({ tipo: 'simulacion-gp', variante, spec });
          }}
        >
          Restablecer spec en editor
        </button>
      </div>

      <div className="app-form-field">
        <label className="app-form-label">Spec (JSON)</label>
        <textarea
          className="app-form-textarea font-mono text-xs min-h-[280px]"
          value={specText}
          spellCheck={false}
          onChange={(e) => setSpecText(e.target.value)}
          onBlur={applySpecText}
        />
        <p className="text-xs text-slate-500 mt-1">Al salir del campo se valida y guarda el JSON en el formulario.</p>
      </div>
    </div>
  );
}
