/**
 * CPMSimulationCreator — Editor de tabla CPM para la profesora
 * Diseño idéntico a la tabla de referencia: Actividad | Predecesores inmediatos | Tiempo (días)
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Trash2, Eye, Save, ChevronDown } from 'lucide-react';
import { CPMSimulationViewer, CPMActivity } from './CPMSimulationViewer';

interface Props {
  initialActivities?: CPMActivity[];
  onSave?: (activities: CPMActivity[]) => void;
  onChange?: (activities: CPMActivity[]) => void; // se dispara en cada cambio
  onCancel?: () => void;
  hideActions?: boolean; // oculta botones cuando está embebido en un form externo
}

const DEFAULT_ROWS: CPMActivity[] = [
  { id:'A', duration:3,  predecessors:[] },
  { id:'B', duration:4,  predecessors:['A'] },
  { id:'C', duration:6,  predecessors:['A'] },
  { id:'D', duration:6,  predecessors:['B'] },
  { id:'E', duration:4,  predecessors:['B'] },
  { id:'F', duration:4,  predecessors:['C'] },
  { id:'G', duration:6,  predecessors:['D'] },
  { id:'H', duration:8,  predecessors:['E','F'] },
];

function validate(acts: CPMActivity[]): string[] {
  const errors: string[] = [];
  const ids = acts.map(a=>a.id.trim()).filter(Boolean);
  if(new Set(ids).size < ids.length) errors.push('Hay IDs duplicados.');
  acts.forEach(a=>{
    if(!a.id.trim()) errors.push('Hay actividades sin nombre.');
    if(a.duration<1) errors.push(`La duración de "${a.id}" debe ser ≥ 1.`);
    a.predecessors.forEach(p=>{
      if(!ids.includes(p)) errors.push(`"${a.id}" referencia al predecesor "${p}" que no existe.`);
    });
    if(a.predecessors.includes(a.id)) errors.push(`"${a.id}" no puede ser predecesora de sí misma.`);
  });
  return [...new Set(errors)];
}

// ─── Predecessor checklist dropdown ──────────────────────────────────────────
function PredecessorCell({ rowId, predecessors, allIds, onChange }: {
  rowId: string;
  predecessors: string[];
  allIds: string[];
  onChange: (preds: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const available = allIds.filter(id => id !== rowId);
  const display = predecessors.length === 0 ? '-' : predecessors.join(', ');

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUp(spaceBelow < 240); // abre arriba si hay menos de 240px abajo
    }
    setOpen(o => !o);
  };

  const toggle = (id: string) => {
    onChange(predecessors.includes(id)
      ? predecessors.filter(p => p !== id)
      : [...predecessors, id]);
  };

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', background: '#fff', border: '1.5px solid #bfd3f5',
          borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600,
          color: predecessors.length === 0 ? '#94a3b8' : '#1e293b',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = '#1a56db')}
        onBlur={e => (e.currentTarget.style.borderColor = '#bfd3f5')}
      >
        <span>{display}</span>
        <ChevronDown style={{ width: 14, height: 14, color: '#64748b', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          ...(openUp
            ? { bottom: 'calc(100% + 4px)', top: 'auto' }
            : { top: 'calc(100% + 4px)', bottom: 'auto' }),
          left: 0, zIndex: 9999,
          background: '#fff', border: '1.5px solid #bfd3f5', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(26,86,219,0.15)', padding: '6px',
          minWidth: 160, maxHeight: 220, overflowY: 'auto',
        }}>
          {available.length === 0 ? (
            <p style={{ fontSize: 12, color: '#94a3b8', padding: '8px 10px', fontStyle: 'italic' }}>
              No hay otras actividades
            </p>
          ) : (
            <>
              <button type="button"
                onClick={() => onChange([])}
                style={{ width: '100%', padding: '6px 10px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6 }}>
                Ninguno (—)
              </button>
              <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }} />
              {available.map(id => (
                <label key={id}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'pointer', borderRadius: 6, background: predecessors.includes(id) ? '#EFF6FF' : 'transparent' }}>
                  <input
                    type="checkbox"
                    checked={predecessors.includes(id)}
                    onChange={() => toggle(id)}
                    style={{ accentColor: '#1a56db', width: 14, height: 14, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 700, color: predecessors.includes(id) ? '#1a56db' : '#1e293b' }}>{id}</span>
                </label>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function CPMSimulationCreator({ initialActivities = DEFAULT_ROWS, onSave, onChange, onCancel, hideActions }: Props) {
  const [rows, setRows] = useState<CPMActivity[]>(
    initialActivities.map(a => ({ ...a, predecessors: [...a.predecessors] }))
  );
  const [preview, setPreview] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const ids = rows.map(r => r.id.trim()).filter(Boolean);

  // Auto-notificar cambios al padre (para auto-guardado en form externo)
  useEffect(() => {
    const clean = rows.filter(r => r.id.trim());
    onChange?.(clean);
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateId = (i: number, val: string) => {
    const newId = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    const oldId = rows[i].id;
    // Update predecessors references in other rows
    setRows(prev => prev.map((r, idx) =>
      idx === i
        ? { ...r, id: newId }
        : { ...r, predecessors: r.predecessors.map(p => p === oldId ? newId : p) }
    ));
    setErrors([]);
  };

  const updateDuration = (i: number, val: number) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, duration: Math.max(1, val) } : r));
    setErrors([]);
  };

  const updatePreds = (i: number, preds: string[]) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, predecessors: preds } : r));
    setErrors([]);
  };

  const addRow = () => {
    const usedIds = new Set(rows.map(r => r.id));
    let next = '';
    for (let c = 65; c <= 90; c++) {
      if (!usedIds.has(String.fromCharCode(c))) { next = String.fromCharCode(c); break; }
    }
    setRows(prev => [...prev, { id: next || `X${prev.length}`, duration: 1, predecessors: [] }]);
  };

  const removeRow = (i: number) => {
    const removedId = rows[i].id;
    setRows(prev => prev.filter((_, idx) => idx !== i)
      .map(r => ({ ...r, predecessors: r.predecessors.filter(p => p !== removedId) })));
  };

  const handlePreview = () => {
    const clean = rows.filter(r => r.id.trim());
    const errs = validate(clean);
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);
    setPreview(true);
  };

  const handleSave = () => {
    const clean = rows.filter(r => r.id.trim());
    const errs = validate(clean);
    if (errs.length) { setErrors(errs); return; }
    onSave?.(clean);
  };

  if (preview) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>
        <div style={{ background: '#1a56db', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>👁 Vista previa — Simulación generada</span>
          <button onClick={() => setPreview(false)}
            style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            ← Editar tabla
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <CPMSimulationViewer activities={rows.filter(r => r.id.trim())} hideHeader />
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',sans-serif", background: '#f0f5ff', padding: '20px 24px' }}>

      {/* Errors */}
      {errors.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
          {errors.map((e, i) => <p key={i} style={{ color: '#dc2626', fontSize: 12, margin: '2px 0' }}>⚠ {e}</p>)}
        </div>
      )}

      {/* Tabla — idéntica al diseño de referencia */}
      <div style={{ borderRadius: 12, overflow: 'visible', boxShadow: '0 2px 12px rgba(26,86,219,0.10)', marginBottom: 16 }}>

        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 44px', background: '#1a56db' }}>
          {['Actividad', 'Predecesores inmediatos', 'Tiempo (días)', ''].map(h => (
            <div key={h} style={{ padding: '12px 16px', color: '#fff', fontWeight: 700, fontSize: 13, textAlign: 'center' }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {rows.map((row, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 44px',
            background: i % 2 === 0 ? '#dce8f8' : '#eaf1fb',
            borderBottom: '1px solid rgba(26,86,219,0.08)',
            alignItems: 'center',
          }}>

            {/* Actividad */}
            <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'center' }}>
              <input
                value={row.id}
                onChange={e => updateId(i, e.target.value)}
                maxLength={3}
                placeholder="A"
                style={{
                  width: 56, padding: '8px 6px', border: '1.5px solid #bfd3f5', borderRadius: 8,
                  fontSize: 16, fontWeight: 800, color: '#1e293b', textAlign: 'center',
                  outline: 'none', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
                onFocus={e => (e.target.style.borderColor = '#1a56db')}
                onBlur={e => (e.target.style.borderColor = '#bfd3f5')}
              />
            </div>

            {/* Predecesores */}
            <div style={{ padding: '10px 16px' }}>
              <PredecessorCell
                rowId={row.id}
                predecessors={row.predecessors}
                allIds={ids}
                onChange={preds => updatePreds(i, preds)}
              />
            </div>

            {/* Tiempo */}
            <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'center' }}>
              <input
                type="number" min={1} max={999}
                value={row.duration}
                onChange={e => updateDuration(i, Number(e.target.value))}
                style={{
                  width: 72, padding: '8px 6px', border: '1.5px solid #bfd3f5', borderRadius: 8,
                  fontSize: 16, fontWeight: 700, color: '#1e293b', textAlign: 'center',
                  outline: 'none', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
                onFocus={e => (e.target.style.borderColor = '#1a56db')}
                onBlur={e => (e.target.style.borderColor = '#bfd3f5')}
              />
            </div>

            {/* Eliminar */}
            <div style={{ padding: '10px 8px', display: 'flex', justifyContent: 'center' }}>
              <button type="button" onClick={() => removeRow(i)} disabled={rows.length <= 1}
                style={{
                  width: 28, height: 28, borderRadius: 6, border: 'none', cursor: rows.length <= 1 ? 'not-allowed' : 'pointer',
                  background: rows.length <= 1 ? 'transparent' : '#fee2e2',
                  color: rows.length <= 1 ? '#cbd5e1' : '#dc2626',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                <Trash2 style={{ width: 13, height: 13 }} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Agregar fila */}
      <button type="button" onClick={addRow}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
          borderRadius: 10, border: '1.5px dashed #1a56db', background: 'rgba(26,86,219,0.06)',
          color: '#1a56db', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          width: '100%', justifyContent: 'center', marginBottom: 20,
        }}>
        <Plus style={{ width: 15, height: 15 }} /> Agregar actividad
      </button>

      {/* Vista previa compacta cuando está embebido */}
      {hideActions && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={handlePreview}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, border: '1.5px solid #1a56db', background: '#dbeafe', color: '#1a56db', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <Eye style={{ width: 13, height: 13 }} /> Vista previa de la simulación
          </button>
        </div>
      )}

      {/* Acciones completas — solo en modo standalone */}
      {!hideActions && (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          {onCancel && (
            <button type="button" onClick={onCancel}
              style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Cancelar
            </button>
          )}
          <button type="button" onClick={handlePreview}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, border: '1.5px solid #1a56db', background: '#dbeafe', color: '#1a56db', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Eye style={{ width: 15, height: 15 }} /> Vista previa
          </button>
          {onSave && (
            <button type="button" onClick={handleSave}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#1a56db,#142d61)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(26,86,219,0.3)' }}>
              <Save style={{ width: 15, height: 15 }} /> Guardar simulación
            </button>
          )}
        </div>
      )}
    </div>
  );
}
