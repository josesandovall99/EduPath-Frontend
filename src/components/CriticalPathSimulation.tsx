import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface NodeDef { id: string; label: string; duration: number; x: number; y: number; }
interface NodeValues { ES?: number|null; EF?: number|null; LS?: number|null; LF?: number|null; float?: number|null; isCritical?: boolean; }
interface Step {
  phase: 1|2|3|4;
  visibleNodes: string[];
  visibleEdges: string[];
  highlightedEdges: string[];
  criticalEdges: string[];
  nodeValues: Record<string, NodeValues>;
  formula: { nodeId: string; text: string } | null;
  activeNode: string | null;
  message: string;
  messageType: 'default'|'success'|'highlight'|'backward'|'critical';
}

// ─── Static Data ──────────────────────────────────────────────────────────────
const NODES: Record<string, NodeDef> = {
  i: { id:'i', label:'i', duration:0, x:80,  y:210 },
  A: { id:'A', label:'A', duration:3, x:250, y:120 },
  B: { id:'B', label:'B', duration:4, x:250, y:300 },
  C: { id:'C', label:'C', duration:2, x:440, y:70  },
  E: { id:'E', label:'E', duration:3, x:440, y:190 },
  D: { id:'D', label:'D', duration:5, x:440, y:320 },
  F: { id:'F', label:'F', duration:4, x:630, y:200 },
  G: { id:'G', label:'G', duration:2, x:800, y:200 },
  f: { id:'f', label:'f', duration:0, x:940, y:200 },
};

const TABLE_ROWS = [
  { id:'A', duration:3, pred:'i' },
  { id:'B', duration:4, pred:'i' },
  { id:'C', duration:2, pred:'A' },
  { id:'D', duration:5, pred:'B, C' },
  { id:'E', duration:3, pred:'A' },
  { id:'F', duration:4, pred:'D, E' },
  { id:'G', duration:2, pred:'F' },
];

// ─── Arrow helper ─────────────────────────────────────────────────────────────
function arrowPts(from: NodeDef, to: NodeDef) {
  const hw=46, hh=36;
  const dx=to.x-from.x, dy=to.y-from.y;
  const ax=Math.abs(dx), ay=Math.abs(dy);
  let sx,sy,ex,ey;
  if (ax===0 && ay===0) return {sx:from.x,sy:from.y,ex:to.x,ey:to.y};
  const txR=ax>0?hw/ax:Infinity, tyR=ay>0?hh/ay:Infinity;
  const tS=Math.min(txR,tyR);
  sx=from.x+dx*tS; sy=from.y+dy*tS;
  ex=to.x-dx*tS;   ey=to.y-dy*tS;
  return {sx,sy,ex,ey};
}

// ─── Steps data ───────────────────────────────────────────────────────────────
const ALL_EDGES=['i-A','i-B','A-C','A-E','B-D','C-D','D-F','E-F','F-G','G-f'];
const ALL_NODES=['i','A','B','C','E','D','F','G','f'];
const FULL_VALUES: Record<string,NodeValues> = {
  i:{ES:0,EF:0,LS:0,LF:0,float:0},  A:{ES:0,EF:3,LS:0,LF:3,float:0},
  B:{ES:0,EF:4,LS:1,LF:5,float:1},  C:{ES:3,EF:5,LS:3,LF:5,float:0},
  E:{ES:3,EF:6,LS:7,LF:10,float:4}, D:{ES:5,EF:10,LS:5,LF:10,float:0},
  F:{ES:10,EF:14,LS:10,LF:14,float:0}, G:{ES:14,EF:16,LS:14,LF:16,float:0},
  f:{ES:16,EF:16,LS:16,LF:16,float:0},
};
const CRIT_VALS = Object.fromEntries(
  Object.entries(FULL_VALUES).map(([k,v])=>[k,{...v,isCritical:[0,3,5].includes(v.float??99)}])
);

// shorthand
const s=(phase:1|2|3|4,vN:string[],vE:string[],hE:string[],cE:string[],nV:Record<string,NodeValues>,
  fo:{nodeId:string;text:string}|null,aN:string|null,msg:string,mt:'default'|'success'|'highlight'|'backward'|'critical'):Step=>
  ({phase,visibleNodes:vN,visibleEdges:vE,highlightedEdges:hE,criticalEdges:cE,nodeValues:nV,formula:fo,activeNode:aN,message:msg,messageType:mt});

const empty=(ids:string[])=>Object.fromEntries(ids.map(id=>[id,{}]));

const STEPS: Step[] = [
  // 0
  s(1,[],[],[],[],{},null,null,'👋 Bienvenido a la Simulación del Método de la Ruta Crítica (CPM). Estudia la tabla de actividades a la izquierda. Presiona "Siguiente" para empezar a construir la red paso a paso.','default'),
  // 1
  s(1,['i'],[],[],[],empty(['i']),null,'i','🟢 Aparece el nodo Inicio "i" con duración 0. Es el punto de partida del proyecto, no representa ninguna actividad real.','default'),
  // 2
  s(1,['i','A','B'],['i-A','i-B'],[],[],empty(['i','A','B']),null,null,'🔵 A (3d) y B (4d) no tienen predecesores en la tabla, así que parten directamente desde i. Se trazan las flechas i→A e i→B.','default'),
  // 3
  s(1,['i','A','B','C'],['i-A','i-B','A-C'],[],[],empty(['i','A','B','C']),null,'C','🔵 C (2d) depende de A. No puede comenzar hasta que A finalice. Se traza A→C.','default'),
  // 4
  s(1,['i','A','B','C','E'],['i-A','i-B','A-C','A-E'],[],[],empty(['i','A','B','C','E']),null,'E','🔵 E (3d) también depende de A. Al terminar A se pueden iniciar C y E en paralelo. Se traza A→E.','default'),
  // 5
  s(1,ALL_NODES.slice(0,7),['i-A','i-B','A-C','A-E','B-D','C-D'],['B-D','C-D'],[],empty(ALL_NODES.slice(0,7)),null,'D','⚠️ D (5d) tiene DOS predecesores: B y C. Solo puede iniciar cuando AMBAS hayan terminado. Las flechas B→D y C→D están resaltadas para enfatizarlo.','highlight'),
  // 6
  s(1,ALL_NODES.slice(0,8),['i-A','i-B','A-C','A-E','B-D','C-D','D-F','E-F'],['D-F','E-F'],[],empty(ALL_NODES.slice(0,8)),null,'F','⚠️ F (4d) también tiene dos predecesores: D y E. Ambas deben completarse antes que F inicie. Se trazan D→F y E→F.','highlight'),
  // 7
  s(1,ALL_NODES.slice(0,9),ALL_EDGES.slice(0,9),[],[],empty(ALL_NODES.slice(0,9)),null,'G','🔵 G (2d) depende únicamente de F. Se traza F→G.','default'),
  // 8
  s(1,ALL_NODES,ALL_EDGES,[],[],empty(ALL_NODES),null,'f','🎉 ¡Red completa! El nodo f (Fin) cierra el diagrama desde G. La estructura del proyecto está lista. Presiona "Siguiente" para el Cálculo Hacia Adelante.','success'),
  // 9 — Phase 2 announcement
  s(2,ALL_NODES,ALL_EDGES,[],[],empty(ALL_NODES),null,null,'➡️ FASE 2 — CÁLCULO HACIA ADELANTE. Recorremos de izquierda a derecha llenando ES y EF. Regla: ES = máx(EF predecesores) · EF = ES + Duración.','highlight'),
  // 10 i
  s(2,ALL_NODES,ALL_EDGES,[],[],{...empty(ALL_NODES),i:{ES:0,EF:0}},{nodeId:'i',text:'0 + 0 = 0'},'i','📍 i: El proyecto empieza en 0. ES=0, EF = 0+0 = 0.','default'),
  // 11 A
  s(2,ALL_NODES,ALL_EDGES,[],[],{...empty(ALL_NODES),i:{ES:0,EF:0},A:{ES:0,EF:3}},{nodeId:'A',text:'0 + 3 = 3'},'A','📍 A: Viene de i (EF=0). ES(A)=0. EF(A) = 0+3 = 3.','default'),
  // 12 B
  s(2,ALL_NODES,ALL_EDGES,[],[],{...empty(ALL_NODES),i:{ES:0,EF:0},A:{ES:0,EF:3},B:{ES:0,EF:4}},{nodeId:'B',text:'0 + 4 = 4'},'B','📍 B: Viene de i (EF=0). ES(B)=0. EF(B) = 0+4 = 4.','default'),
  // 13 C
  s(2,ALL_NODES,ALL_EDGES,[],[],{...empty(ALL_NODES),i:{ES:0,EF:0},A:{ES:0,EF:3},B:{ES:0,EF:4},C:{ES:3,EF:5}},{nodeId:'C',text:'3 + 2 = 5'},'C','📍 C: Viene de A (EF=3). ES(C)=3. EF(C) = 3+2 = 5.','default'),
  // 14 E
  s(2,ALL_NODES,ALL_EDGES,[],[],{...empty(ALL_NODES),i:{ES:0,EF:0},A:{ES:0,EF:3},B:{ES:0,EF:4},C:{ES:3,EF:5},E:{ES:3,EF:6}},{nodeId:'E',text:'3 + 3 = 6'},'E','📍 E: Viene de A (EF=3). ES(E)=3. EF(E) = 3+3 = 6.','default'),
  // 15 D decision
  s(2,ALL_NODES,ALL_EDGES,['B-D','C-D'],[],{...empty(ALL_NODES),i:{ES:0,EF:0},A:{ES:0,EF:3},B:{ES:0,EF:4},C:{ES:3,EF:5},E:{ES:3,EF:6}},null,'D','🚦 ¡Cruce en D! Llegan B (EF=4) y C (EF=5). Para que D empiece, AMBAS deben acabar. Usamos el MÁXIMO: MAX(4, 5) = 5 → ES(D) = 5.','highlight'),
  // 16 D fill
  s(2,ALL_NODES,ALL_EDGES,[],[],{...empty(ALL_NODES),i:{ES:0,EF:0},A:{ES:0,EF:3},B:{ES:0,EF:4},C:{ES:3,EF:5},E:{ES:3,EF:6},D:{ES:5,EF:10}},{nodeId:'D',text:'5 + 5 = 10'},'D','📍 D: ES=5 (el mayor). EF(D) = 5+5 = 10.','default'),
  // 17 F decision
  s(2,ALL_NODES,ALL_EDGES,['D-F','E-F'],[],{...empty(ALL_NODES),i:{ES:0,EF:0},A:{ES:0,EF:3},B:{ES:0,EF:4},C:{ES:3,EF:5},E:{ES:3,EF:6},D:{ES:5,EF:10}},null,'F','🚦 ¡Cruce en F! Llegan D (EF=10) y E (EF=6). Máximo: MAX(10,6) = 10 → ES(F) = 10.','highlight'),
  // 18 F fill
  s(2,ALL_NODES,ALL_EDGES,[],[],{...empty(ALL_NODES),i:{ES:0,EF:0},A:{ES:0,EF:3},B:{ES:0,EF:4},C:{ES:3,EF:5},E:{ES:3,EF:6},D:{ES:5,EF:10},F:{ES:10,EF:14}},{nodeId:'F',text:'10 + 4 = 14'},'F','📍 F: ES=10. EF(F) = 10+4 = 14.','default'),
  // 19 G
  s(2,ALL_NODES,ALL_EDGES,[],[],{...empty(ALL_NODES),i:{ES:0,EF:0},A:{ES:0,EF:3},B:{ES:0,EF:4},C:{ES:3,EF:5},E:{ES:3,EF:6},D:{ES:5,EF:10},F:{ES:10,EF:14},G:{ES:14,EF:16}},{nodeId:'G',text:'14 + 2 = 16'},'G','📍 G: ES(G)=EF(F)=14. EF(G) = 14+2 = 16.','default'),
  // 20 f
  s(2,ALL_NODES,ALL_EDGES,[],[],{...empty(ALL_NODES),i:{ES:0,EF:0},A:{ES:0,EF:3},B:{ES:0,EF:4},C:{ES:3,EF:5},E:{ES:3,EF:6},D:{ES:5,EF:10},F:{ES:10,EF:14},G:{ES:14,EF:16},f:{ES:16,EF:16}},{nodeId:'f',text:'16 + 0 = 16'},'f','✅ ¡Pase hacia adelante completo! La duración mínima del proyecto es 16 días. Presiona "Siguiente" para el Cálculo Hacia Atrás.','success'),
  // ── Phase 3 ──────────────────────────────────────────────────────────────────
  s(3,ALL_NODES,ALL_EDGES,[],[],{i:{ES:0,EF:0},A:{ES:0,EF:3},B:{ES:0,EF:4},C:{ES:3,EF:5},E:{ES:3,EF:6},D:{ES:5,EF:10},F:{ES:10,EF:14},G:{ES:14,EF:16},f:{ES:16,EF:16}},null,null,'⬅️ FASE 3 — CÁLCULO HACIA ATRÁS. Recorremos de derecha a izquierda calculando LF y LS. Regla: LF = mín(LS sucesores) · LS = LF − Duración.','backward'),
  // 22 f
  s(3,ALL_NODES,ALL_EDGES,[],[],{i:{ES:0,EF:0},A:{ES:0,EF:3},B:{ES:0,EF:4},C:{ES:3,EF:5},E:{ES:3,EF:6},D:{ES:5,EF:10},F:{ES:10,EF:14},G:{ES:14,EF:16},f:{ES:16,EF:16,LF:16,LS:16}},{nodeId:'f',text:'16 − 0 = 16'},'f','📍 f (Fin): LF = EF = 16. LS = 16−0 = 16.','backward'),
  // 23 G
  s(3,ALL_NODES,ALL_EDGES,[],[],{i:{ES:0,EF:0},A:{ES:0,EF:3},B:{ES:0,EF:4},C:{ES:3,EF:5},E:{ES:3,EF:6},D:{ES:5,EF:10},F:{ES:10,EF:14},G:{ES:14,EF:16,LF:16,LS:14},f:{ES:16,EF:16,LF:16,LS:16}},{nodeId:'G',text:'16 − 2 = 14'},'G','📍 G: LF=LS(f)=16. LS(G) = 16−2 = 14.','backward'),
  // 24 F
  s(3,ALL_NODES,ALL_EDGES,[],[],{i:{ES:0,EF:0},A:{ES:0,EF:3},B:{ES:0,EF:4},C:{ES:3,EF:5},E:{ES:3,EF:6},D:{ES:5,EF:10},F:{ES:10,EF:14,LF:14,LS:10},G:{ES:14,EF:16,LF:16,LS:14},f:{ES:16,EF:16,LF:16,LS:16}},{nodeId:'F',text:'14 − 4 = 10'},'F','📍 F: LF=LS(G)=14. LS(F) = 14−4 = 10.','backward'),
  // 25 D
  s(3,ALL_NODES,ALL_EDGES,[],[],{i:{ES:0,EF:0},A:{ES:0,EF:3},B:{ES:0,EF:4},C:{ES:3,EF:5},E:{ES:3,EF:6},D:{ES:5,EF:10,LF:10,LS:5},F:{ES:10,EF:14,LF:14,LS:10},G:{ES:14,EF:16,LF:16,LS:14},f:{ES:16,EF:16,LF:16,LS:16}},{nodeId:'D',text:'10 − 5 = 5'},'D','📍 D: LF=LS(F)=10. LS(D) = 10−5 = 5.','backward'),
  // 26 E
  s(3,ALL_NODES,ALL_EDGES,[],[],{i:{ES:0,EF:0},A:{ES:0,EF:3},B:{ES:0,EF:4},C:{ES:3,EF:5},E:{ES:3,EF:6,LF:10,LS:7},D:{ES:5,EF:10,LF:10,LS:5},F:{ES:10,EF:14,LF:14,LS:10},G:{ES:14,EF:16,LF:16,LS:14},f:{ES:16,EF:16,LF:16,LS:16}},{nodeId:'E',text:'10 − 3 = 7'},'E','📍 E: LF=LS(F)=10. LS(E) = 10−3 = 7.','backward'),
  // 27 C
  s(3,ALL_NODES,ALL_EDGES,[],[],{i:{ES:0,EF:0},A:{ES:0,EF:3},B:{ES:0,EF:4},C:{ES:3,EF:5,LF:5,LS:3},E:{ES:3,EF:6,LF:10,LS:7},D:{ES:5,EF:10,LF:10,LS:5},F:{ES:10,EF:14,LF:14,LS:10},G:{ES:14,EF:16,LF:16,LS:14},f:{ES:16,EF:16,LF:16,LS:16}},{nodeId:'C',text:'5 − 2 = 3'},'C','📍 C: LF=LS(D)=5. LS(C) = 5−2 = 3.','backward'),
  // 28 B
  s(3,ALL_NODES,ALL_EDGES,[],[],{i:{ES:0,EF:0},A:{ES:0,EF:3},B:{ES:0,EF:4,LF:5,LS:1},C:{ES:3,EF:5,LF:5,LS:3},E:{ES:3,EF:6,LF:10,LS:7},D:{ES:5,EF:10,LF:10,LS:5},F:{ES:10,EF:14,LF:14,LS:10},G:{ES:14,EF:16,LF:16,LS:14},f:{ES:16,EF:16,LF:16,LS:16}},{nodeId:'B',text:'5 − 4 = 1'},'B','📍 B: LF=LS(D)=5. LS(B) = 5−4 = 1.','backward'),
  // 29 A decision
  s(3,ALL_NODES,ALL_EDGES,['A-C','A-E'],[],{i:{ES:0,EF:0},A:{ES:0,EF:3},B:{ES:0,EF:4,LF:5,LS:1},C:{ES:3,EF:5,LF:5,LS:3},E:{ES:3,EF:6,LF:10,LS:7},D:{ES:5,EF:10,LF:10,LS:5},F:{ES:10,EF:14,LF:14,LS:10},G:{ES:14,EF:16,LF:16,LS:14},f:{ES:16,EF:16,LF:16,LS:16}},null,'A','🚦 A tiene dos sucesores: C (LS=3) y E (LS=7). LF(A) = el MÍNIMO: MIN(3,7) = 3. Así A no incumple ningún sucesor.','highlight'),
  // 30 A fill
  s(3,ALL_NODES,ALL_EDGES,[],[],{i:{ES:0,EF:0},A:{ES:0,EF:3,LF:3,LS:0},B:{ES:0,EF:4,LF:5,LS:1},C:{ES:3,EF:5,LF:5,LS:3},E:{ES:3,EF:6,LF:10,LS:7},D:{ES:5,EF:10,LF:10,LS:5},F:{ES:10,EF:14,LF:14,LS:10},G:{ES:14,EF:16,LF:16,LS:14},f:{ES:16,EF:16,LF:16,LS:16}},{nodeId:'A',text:'3 − 3 = 0'},'A','📍 A: LF=3. LS(A) = 3−3 = 0.','backward'),
  // 31 i decision
  s(3,ALL_NODES,ALL_EDGES,['i-A','i-B'],[],{i:{ES:0,EF:0},A:{ES:0,EF:3,LF:3,LS:0},B:{ES:0,EF:4,LF:5,LS:1},C:{ES:3,EF:5,LF:5,LS:3},E:{ES:3,EF:6,LF:10,LS:7},D:{ES:5,EF:10,LF:10,LS:5},F:{ES:10,EF:14,LF:14,LS:10},G:{ES:14,EF:16,LF:16,LS:14},f:{ES:16,EF:16,LF:16,LS:16}},null,'i','🚦 i tiene sucesores A (LS=0) y B (LS=1). LF(i) = MIN(0,1) = 0.','highlight'),
  // 32 i fill
  s(3,ALL_NODES,ALL_EDGES,[],[],Object.fromEntries(Object.entries(FULL_VALUES).map(([k,v])=>[k,{...v}])),{nodeId:'i',text:'0 − 0 = 0'},'i','✅ ¡Pase hacia atrás completo! i: LF=0, LS=0. Ya tenemos todos los tiempos. Presiona "Siguiente" para calcular holguras y revelar la Ruta Crítica.','success'),
  // 33 floats
  s(4,ALL_NODES,ALL_EDGES,[],[],Object.fromEntries(Object.entries(FULL_VALUES).map(([k,v])=>[k,{...v}])),null,null,'📊 HOLGURA H = LS − ES: i=0 | A=0 | B=1 | C=0 | D=0 | E=4 | F=0 | G=0 | f=0. Las actividades con H=0 forman la Ruta Crítica. ¡Presiona Siguiente para iluminarla!','highlight'),
  // 34 critical path reveal
  s(4,ALL_NODES,ALL_EDGES,[],['i-A','A-C','C-D','D-F','F-G','G-f'],
    Object.fromEntries(Object.entries(FULL_VALUES).map(([k,v])=>[k,{...v,isCritical:(v.float??1)===0}])),
    null,null,'🎯 ¡RUTA CRÍTICA: i → A → C → D → F → G → f — 16 días! Los nodos y flechas en rojo no tienen margen de retraso. B tiene holgura=1 y E holgura=4, por lo que NO son críticas. ¡Cualquier retraso en la ruta roja retrasa todo el proyecto!','critical'),
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function CpmNode({ node, values, isVisible, isActive, phase }: {
  node: NodeDef; values: NodeValues; isVisible: boolean; isActive: boolean; phase: number;
}) {
  const w=90, h=70, x0=node.x-w/2, y0=node.y-h/2;
  const crit = values.isCritical;
  const stroke = crit ? '#ef4444' : isActive ? '#f59e0b' : '#1a56db';
  const fill   = crit ? '#fff1f2' : isActive ? '#fffbeb' : '#fff';
  const sw     = crit ? 2.5 : isActive ? 2 : 1.5;

  return (
    <g style={{ opacity: isVisible?1:0, transition:'opacity 0.45s ease', filter: isActive?'drop-shadow(0 0 8px rgba(245,158,11,0.5))': crit?'drop-shadow(0 0 8px rgba(239,68,68,0.5))':'none' }}>
      <rect x={x0} y={y0} width={w} height={h} rx={6} fill={fill} stroke={stroke} strokeWidth={sw} />
      {/* dividers */}
      <line x1={x0} y1={node.y} x2={x0+w} y2={node.y} stroke="#e2e8f0" strokeWidth={0.7}/>
      <line x1={node.x} y1={y0} x2={node.x} y2={y0+h} stroke="#e2e8f0" strokeWidth={0.7}/>
      {/* ES top-left */}
      <text x={x0+w/4} y={node.y-h/4+6} textAnchor="middle" fontSize={13} fontWeight="700" fill={phase>=2?'#1a56db':'#cbd5e1'} style={{transition:'fill 0.3s'}}>
        {values.ES!=null?values.ES:''}
      </text>
      {/* EF top-right */}
      <text x={x0+3*w/4} y={node.y-h/4+6} textAnchor="middle" fontSize={13} fontWeight="700" fill={phase>=2?'#1a56db':'#cbd5e1'} style={{transition:'fill 0.3s'}}>
        {values.EF!=null?values.EF:''}
      </text>
      {/* LS bottom-left */}
      <text x={x0+w/4} y={node.y+h/4+6} textAnchor="middle" fontSize={13} fontWeight="700" fill={phase>=3?'#dc2626':'#cbd5e1'} style={{transition:'fill 0.3s'}}>
        {values.LS!=null?values.LS:''}
      </text>
      {/* LF bottom-right */}
      <text x={x0+3*w/4} y={node.y+h/4+6} textAnchor="middle" fontSize={13} fontWeight="700" fill={phase>=3?'#dc2626':'#cbd5e1'} style={{transition:'fill 0.3s'}}>
        {values.LF!=null?values.LF:''}
      </text>
      {/* label */}
      <text x={node.x} y={y0+h+16} textAnchor="middle" fontSize={13} fontWeight="800" fill={crit?'#ef4444':'#1e293b'}>
        {node.label==='i'?'Inicio':node.label==='f'?'Fin':node.label}
      </text>
      <text x={node.x} y={y0+h+28} textAnchor="middle" fontSize={10} fill="#94a3b8">d={node.duration}</text>
      {/* float badge phase 4 */}
      {values.float!=null && (
        <g>
          <rect x={node.x-14} y={y0-20} width={28} height={16} rx={8} fill={crit?'#ef4444':'#e2e8f0'} style={{transition:'fill 0.4s'}}/>
          <text x={node.x} y={y0-8} textAnchor="middle" fontSize={10} fontWeight="700" fill={crit?'#fff':'#64748b'}>H={values.float}</text>
        </g>
      )}
    </g>
  );
}

function CpmArrow({ fromId, toId, isVisible, isHighlighted, isCritical }: {
  fromId: string; toId: string; isVisible: boolean; isHighlighted: boolean; isCritical: boolean;
}) {
  const from=NODES[fromId], to=NODES[toId];
  const {sx,sy,ex,ey}=arrowPts(from,to);
  const id=`mrk-${fromId}-${toId}`;
  const color = isCritical?'#ef4444': isHighlighted?'#f59e0b':'#1a56db';
  const sw    = isCritical?3.5: isHighlighted?2.5:1.5;
  return (
    <g style={{opacity:isVisible?1:0,transition:'opacity 0.4s ease'}}>
      <defs>
        <marker id={id} markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
          <polygon points="0 0,9 3.5,0 7" fill={color} style={{transition:'fill 0.4s'}}/>
        </marker>
      </defs>
      <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={color} strokeWidth={sw}
        markerEnd={`url(#${id})`}
        strokeDasharray={isHighlighted&&!isCritical?'5 3':'none'}
        style={{transition:'stroke 0.4s,stroke-width 0.4s'}}/>
    </g>
  );
}

// ─── Labels for quadrants ─────────────────────────────────────────────────────
const QuadLabels = () => (
  <g opacity={0.35} fontSize={8} fill="#64748b" fontStyle="italic">
    {Object.values(NODES).map(n=>{
      const w=90,h=70,x0=n.x-w/2,y0=n.y-h/2;
      return (
        <g key={n.id}>
          <text x={x0+4}   y={y0+10}>ES</text>
          <text x={x0+w-16} y={y0+10}>EF</text>
          <text x={x0+4}   y={y0+h-4}>LS</text>
          <text x={x0+w-16} y={y0+h-4}>LF</text>
        </g>
      );
    })}
  </g>
);

// ─── Main component ───────────────────────────────────────────────────────────
export function CriticalPathSimulation() {
  const [step, setStep] = useState(0);
  const cur = STEPS[step];

  const msgBg: Record<string,string> = {
    default:'#eff6ff',
    success:'#f0fdf4',
    highlight:'#fffbeb',
    backward:'#fdf4ff',
    critical:'#fff1f2',
  };
  const msgBorder: Record<string,string> = {
    default:'#bfd3f5',
    success:'#bbf7d0',
    highlight:'#fde68a',
    backward:'#e9d5ff',
    critical:'#fecaca',
  };
  const msgColor: Record<string,string> = {
    default:'#1e3a5f',
    success:'#166534',
    highlight:'#92400e',
    backward:'#6b21a8',
    critical:'#991b1b',
  };
  const phaseLabel = ['','🏗 FASE 1: Construcción de Red','➡️ FASE 2: Cálculo Hacia Adelante','⬅️ FASE 3: Cálculo Hacia Atrás','🎯 FASE 4: Ruta Crítica'];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', fontFamily:"'Inter','Segoe UI',sans-serif", background:'#f8fafc', borderRadius:16, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.10)' }}>

      {/* ── Header ── */}
      <div style={{ background:'linear-gradient(135deg,#1a56db,#142d61)', padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <p style={{ color:'rgba(255,255,255,0.7)', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em' }}>Simulación Interactiva</p>
          <h2 style={{ color:'#fff', fontSize:17, fontWeight:800, margin:0 }}>Método de la Ruta Crítica (CPM)</h2>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ background:'rgba(255,255,255,0.15)', color:'#fff', padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:700 }}>
            {phaseLabel[cur.phase]}
          </span>
          <span style={{ background:'rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.8)', padding:'4px 12px', borderRadius:20, fontSize:11 }}>
            {step+1} / {STEPS.length}
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* Left: Table */}
        <div style={{ width:220, background:'#fff', borderRight:'1px solid #e2e8f0', padding:'16px 14px', overflowY:'auto', flexShrink:0 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Tabla de Actividades</p>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'#1a56db' }}>
                {['Act','Dur','Pred'].map(h=>(
                  <th key={h} style={{ padding:'6px 8px', color:'#fff', fontWeight:700, fontSize:11, textAlign:'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TABLE_ROWS.map((r,i)=>{
                const v = cur.nodeValues[r.id];
                const crit = v?.isCritical;
                return (
                  <tr key={r.id} style={{ background: crit?'#fff1f2': cur.activeNode===r.id?'#fffbeb': i%2===0?'#f8fafc':'#fff', transition:'background 0.3s' }}>
                    <td style={{ padding:'6px 8px', fontWeight:700, color: crit?'#ef4444': cur.activeNode===r.id?'#d97706':'#1e293b' }}>{r.id}</td>
                    <td style={{ padding:'6px 8px', color:'#475569' }}>{r.duration}</td>
                    <td style={{ padding:'6px 8px', color:'#64748b' }}>{r.pred}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Float summary in phase 4 */}
          {cur.phase>=4 && (
            <div style={{ marginTop:16 }}>
              <p style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', marginBottom:8 }}>Holguras</p>
              {ALL_NODES.map(id=>{
                const v = cur.nodeValues[id];
                if (v?.float==null) return null;
                return (
                  <div key={id} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid #f1f5f9', fontSize:12 }}>
                    <span style={{ fontWeight:700, color: v.isCritical?'#ef4444':'#1e293b' }}>{id}</span>
                    <span style={{ fontWeight:600, color: v.isCritical?'#ef4444':'#64748b' }}>H={v.float} {v.isCritical?'⚠️':''}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Canvas */}
        <div style={{ flex:1, position:'relative', overflow:'hidden', background:'#f1f5f9' }}>
          <svg viewBox="0 0 1010 420" style={{ width:'100%', height:'100%' }}>
            {/* background grid */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="1010" height="420" fill="url(#grid)"/>

            {/* Edges */}
            {ALL_EDGES.map(eid=>{
              const [f,t]=eid.split('-');
              return <CpmArrow key={eid} fromId={f} toId={t}
                isVisible={cur.visibleEdges.includes(eid)}
                isHighlighted={cur.highlightedEdges.includes(eid)}
                isCritical={cur.criticalEdges.includes(eid)}/>;
            })}

            {/* Quad labels */}
            <QuadLabels/>

            {/* Nodes */}
            {ALL_NODES.map(id=>(
              <CpmNode key={id} node={NODES[id]}
                values={cur.nodeValues[id]??{}}
                isVisible={cur.visibleNodes.includes(id)}
                isActive={cur.activeNode===id}
                phase={cur.phase}/>
            ))}

            {/* Floating formula */}
            {cur.formula && (() => {
              const n = NODES[cur.formula.nodeId];
              if (!n) return null;
              return (
                <g style={{animation:'fadeIn 0.3s ease'}}>
                  <rect x={n.x+52} y={n.y-22} width={cur.formula.text.length*8+16} height={24} rx={8} fill="#fbbf24" opacity={0.95}/>
                  <text x={n.x+60} y={n.y-6} fontSize={12} fontWeight="800" fill="#1e293b">{cur.formula.text}</text>
                </g>
              );
            })()}
          </svg>
        </div>
      </div>

      {/* ── Controls ── */}
      <div style={{ background:'#fff', borderTop:'1px solid #e2e8f0', padding:'14px 20px', display:'flex', flexDirection:'column', gap:12 }}>
        {/* Message */}
        <div style={{
          background: msgBg[cur.messageType],
          border: `1.5px solid ${msgBorder[cur.messageType]}`,
          borderRadius:12, padding:'12px 16px',
          color: msgColor[cur.messageType],
          fontSize:13, lineHeight:1.6, fontWeight:500,
          transition:'all 0.3s ease',
          minHeight:52,
        }}>
          <span style={{ fontWeight:700, marginRight:6, fontSize:14 }}>🤖 Asistente:</span>
          {cur.message}
        </div>

        {/* Buttons + progress */}
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button
            onClick={()=>setStep(s=>Math.max(0,s-1))}
            disabled={step===0}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 22px', borderRadius:10, fontSize:13, fontWeight:700,
              background: step===0?'#f1f5f9':'#dbeafe', color: step===0?'#94a3b8':'#1a56db',
              border:`1.5px solid ${step===0?'#e2e8f0':'#bfd3f5'}`, cursor:step===0?'not-allowed':'pointer', transition:'all 0.15s' }}>
            ← Atrás
          </button>

          {/* Progress bar */}
          <div style={{ flex:1, height:8, background:'#e2e8f0', borderRadius:999, overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:999, background:'linear-gradient(90deg,#1a56db,#3b82f6)', width:`${(step/(STEPS.length-1))*100}%`, transition:'width 0.3s ease' }}/>
          </div>

          <button
            onClick={()=>setStep(s=>Math.min(STEPS.length-1,s+1))}
            disabled={step===STEPS.length-1}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 22px', borderRadius:10, fontSize:13, fontWeight:700,
              background: step===STEPS.length-1?'#f1f5f9':'linear-gradient(135deg,#1a56db,#142d61)',
              color: step===STEPS.length-1?'#94a3b8':'#fff',
              border:'none', cursor:step===STEPS.length-1?'not-allowed':'pointer', transition:'all 0.15s',
              boxShadow: step===STEPS.length-1?'none':'0 2px 8px rgba(26,86,219,0.3)' }}>
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}
