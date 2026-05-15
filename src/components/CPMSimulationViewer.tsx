/**
 * CPMSimulationViewer — Motor dinámico de Ruta Crítica
 * Acepta cualquier tabla de actividades y genera la simulación paso a paso.
 */
import { useState, useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ─── Public types ─────────────────────────────────────────────────────────────
export interface CPMActivity {
  id: string;           // "A", "B", "C"...
  duration: number;     // días
  predecessors: string[]; // ["A","B"] o []
}

interface Props {
  activities: CPMActivity[];
  title?: string;
  hideHeader?: boolean; // oculta el header azul cuando está embebido en un preview
}

// ─── Internal types ───────────────────────────────────────────────────────────
interface NodeData extends CPMActivity {
  x: number; y: number;
  ES: number; EF: number; LS: number; LF: number;
  float: number; isCritical: boolean;
}
interface Step {
  phase: 1|2|3|4;
  visibleIds: string[];
  visibleEdges: string[];
  highlightedEdges: string[];
  criticalEdges: string[];
  revealed: Record<string, { ES?:number; EF?:number; LS?:number; LF?:number; float?:number; isCritical?:boolean }>;
  formula: { id:string; text:string } | null;
  activeId: string | null;
  message: string;
  msgType: 'default'|'success'|'highlight'|'backward'|'critical';
}

// ─── CPM Algorithm ────────────────────────────────────────────────────────────
function computeCPM(acts: CPMActivity[]) {
  // Add virtual start/end
  const all: CPMActivity[] = [
    { id:'__start', duration:0, predecessors:[] },
    ...acts,
    { id:'__end',   duration:0, predecessors:[] },
  ];
  // Connect roots to __start, sinks to __end
  const ids = acts.map(a=>a.id);
  const referenced = new Set(acts.flatMap(a=>a.predecessors));
  all.forEach(a=>{
    if(a.id==='__start') return;
    if(a.id==='__end') { a.predecessors=[]; return; }
    if(a.predecessors.length===0) a.predecessors=['__start'];
  });
  const sinks = acts.filter(a=>!ids.some(id=>acts.find(b=>b.id===id)?.predecessors.includes(a.id)));
  all.find(a=>a.id==='__end')!.predecessors = sinks.map(s=>s.id);

  // Topo sort (Kahn)
  const inDeg: Record<string,number> = {};
  const succs: Record<string,string[]> = {};
  all.forEach(a=>{ inDeg[a.id]=0; succs[a.id]=[]; });
  all.forEach(a=>a.predecessors.forEach(p=>{ if(succs[p]) succs[p].push(a.id); inDeg[a.id]++; }));
  const queue = all.filter(a=>inDeg[a.id]===0).map(a=>a.id);
  const order: string[] = [];
  while(queue.length){ const n=queue.shift()!; order.push(n); succs[n].forEach(s=>{ if(--inDeg[s]===0) queue.push(s); }); }

  // Forward pass
  const ES: Record<string,number>={}, EF: Record<string,number>={};
  order.forEach(id=>{
    const a=all.find(x=>x.id===id)!;
    ES[id]= a.predecessors.length ? Math.max(...a.predecessors.map(p=>EF[p]??0)) : 0;
    EF[id]= ES[id]+a.duration;
  });

  // Backward pass
  const LS: Record<string,number>={}, LF: Record<string,number>={};
  const endT=EF['__end'];
  [...order].reverse().forEach(id=>{
    const kids=succs[id];
    LF[id]= kids.length ? Math.min(...kids.map(k=>LS[k]??endT)) : endT;
    LS[id]= LF[id]-all.find(x=>x.id===id)!.duration;
  });

  // Floats & critical
  const result: Record<string,{ES:number;EF:number;LS:number;LF:number;float:number;isCritical:boolean}> = {};
  all.forEach(a=>{
    const f=LS[a.id]-ES[a.id];
    result[a.id]={ ES:ES[a.id],EF:EF[a.id],LS:LS[a.id],LF:LF[a.id],float:f,isCritical:f===0 };
  });
  return { result, order: order.filter(id=>id!=='__start'&&id!=='__end'), succs, endTime:endT };
}

// ─── Layout: assign (x,y) per node — dimensiones dinámicas ──────────────────
const NODE_W=90, NODE_H=70;
const H_GAP=140; // separación horizontal entre capas
const V_GAP=100; // separación vertical entre nodos de la misma capa
const MARGIN=70;  // margen en los 4 bordes

function assignPositions(acts: CPMActivity[], cpm: ReturnType<typeof computeCPM>) {
  const allActs = [
    {id:'__start',duration:0,predecessors:[]},
    ...acts,
    {id:'__end',duration:0,predecessors: cpm.order.filter(id=>cpm.succs[id]?.includes('__end')) }
  ];

  // Calcular layer (profundidad) de cada nodo
  const layer: Record<string,number>={};
  layer['__start']=0;
  allActs.forEach(a=>{
    const l = a.predecessors.length ? Math.max(...a.predecessors.map(p=>(layer[p]??0)+1)) : 0;
    layer[a.id]=l;
  });
  const endPreds = allActs.find(a=>a.id==='__end')?.predecessors||[];
  layer['__end']= endPreds.length ? Math.max(...endPreds.map(p=>layer[p]??0))+1 : 1;

  // Agrupar por capa
  const inLayer: Record<number,string[]>={};
  allActs.forEach(a=>{ const l=layer[a.id]??0; inLayer[l]=inLayer[l]||[]; inLayer[l].push(a.id); });

  const maxLayer=Math.max(...Object.keys(inLayer).map(Number));
  const maxPerLayer=Math.max(...Object.values(inLayer).map(ids=>ids.length));

  // Dimensiones del canvas escaladas al contenido
  const canvasW = MARGIN*2 + NODE_W + maxLayer * H_GAP;
  const canvasH = MARGIN*2 + Math.max(maxPerLayer * V_GAP, NODE_H + 60);

  const positions: Record<string,{x:number;y:number}> = {};
  Object.entries(inLayer).forEach(([lStr,ids])=>{
    const l=Number(lStr);
    const x = MARGIN + NODE_W/2 + l * H_GAP;
    const totalH = (ids.length-1)*V_GAP;
    const startY = canvasH/2 - totalH/2;
    ids.forEach((id,i)=>{
      positions[id]={ x, y: startY + i*V_GAP };
    });
  });
  return { positions, canvasW: Math.max(canvasW, 800), canvasH: Math.max(canvasH, 360) };
}

// ─── Arrow helper ─────────────────────────────────────────────────────────────
function arrowPts(fx:number,fy:number,tx:number,ty:number){
  const hw=47,hh=37;
  const dx=tx-fx,dy=ty-fy;
  const ax=Math.abs(dx),ay=Math.abs(dy);
  if(ax<1&&ay<1) return {sx:fx,sy:fy,ex:tx,ey:ty};
  const tR=ax>0?hw/ax:1e9, tC=ay>0?hh/ay:1e9, t=Math.min(tR,tC);
  return {sx:fx+dx*t,sy:fy+dy*t,ex:tx-dx*t,ey:ty-dy*t};
}

// ─── Step generator ───────────────────────────────────────────────────────────
function buildSteps(acts: CPMActivity[], cpm: ReturnType<typeof computeCPM>): Step[] {
  const { result, succs } = cpm;
  const allActIds = acts.map(a=>a.id);
  const allNodeIds = ['__start',...allActIds,'__end'];

  // Helper: edge key (from__to without virtual)
  const ek=(f:string,t:string)=>`${f}→${t}`; // separador → evita conflicto con prefijo __ de __start/__end
  // All real edges — misma lógica que el useMemo del viewer (nodos sin pred → desde __start)
  const allEdges: string[] = [];
  allNodeIds.forEach(id=>{
    if(id==='__start') return;
    let preds: string[];
    if(id==='__end') preds=allNodeIds.filter(n=>succs[n]?.includes('__end'));
    else {
      const actPreds=(acts.find(x=>x.id===id)?.predecessors||[]).filter(p=>allActIds.includes(p));
      preds = actPreds.length ? actPreds : ['__start'];
    }
    preds.forEach(p=>allEdges.push(ek(p,id)));
  });

  const getEdgesForNode=(id:string)=>{
    if(id==='__start') return [];
    if(id==='__end') return allNodeIds.filter(n=>succs[n]?.includes('__end')).map(p=>ek(p,id));
    const actPreds=(acts.find(x=>x.id===id)?.predecessors||[]).filter(p=>allActIds.includes(p));
    // nodo sin predecesores reales → viene de __start
    const realPreds = actPreds.length ? actPreds : ['__start'];
    return realPreds.map(p=>ek(p,id));
  };

  const steps: Step[] = [];
  const cur = {
    visibleIds: [] as string[],
    visibleEdges: [] as string[],
    revealed: {} as Step['revealed'],
  };

  const push=(phase:Step['phase'],add:{visN?:string[];visE?:string[];hE?:string[];cE?:string[];rev?:Step['revealed'];fo?:Step['formula'];act?:string;msg:string;mt:Step['msgType']})=>{
    if(add.visN) cur.visibleIds=[...cur.visibleIds,...add.visN];
    if(add.visE) cur.visibleEdges=[...cur.visibleEdges,...add.visE];
    if(add.rev) cur.revealed={...cur.revealed,...add.rev};
    steps.push({
      phase,
      visibleIds:[...cur.visibleIds],
      visibleEdges:[...cur.visibleEdges],
      highlightedEdges:add.hE||[],
      criticalEdges:add.cE||[],
      revealed:{...cur.revealed},
      formula:add.fo||null,
      activeId:add.act||null,
      message:add.msg,
      msgType:add.mt,
    });
  };

  // 0: intro
  push(1,{msg:`**Simulación del Método de la Ruta Crítica — PMBOK**\n\nEsta herramienta te guía por los 4 pasos del CPM:\n- **Fase 1** → Construir la red de precedencias\n- **Fase 2** → Pase hacia adelante (ES y EF)\n- **Fase 3** → Pase hacia atrás (LF y LS)\n- **Fase 4** → Holguras y Ruta Crítica\n\nObserva la tabla de actividades a la izquierda. Presiona **Siguiente** para comenzar.`,mt:'default'});

  // Phase 1: build network
  push(1,{visN:['__start'],msg:`**Nodo de Inicio** — Duración: 0 días\n\nEn el PMBOK, el diagrama de red siempre empieza con un nodo ficticio de inicio.\n- No representa trabajo real\n- Conecta a todas las actividades sin predecesoras\n- Es el punto de referencia para calcular los tiempos tempranos`,mt:'default'});

  // Group by layer for nicer messages
  const layerOf: Record<string,number>={};
  const computeLayers=()=>{
    layerOf['__start']=0;
    allActIds.forEach(id=>{
      const preds=acts.find(a=>a.id===id)?.predecessors||[];
      layerOf[id]= preds.length? Math.max(...preds.map(p=>layerOf[p]??0))+1 : 1;
    });
    layerOf['__end']= Math.max(...allActIds.map(id=>layerOf[id]??0))+1;
  };
  computeLayers();

  const byLayer: Record<number,string[]>={};
  allNodeIds.forEach(id=>{ const l=layerOf[id]??0; byLayer[l]=byLayer[l]||[]; byLayer[l].push(id); });
  const maxLayer=Math.max(...Object.keys(byLayer).map(Number));

  for(let l=1;l<maxLayer;l++){
    const ids=byLayer[l]||[];
    ids.forEach(id=>{
      const a=acts.find(x=>x.id===id);
      if(!a) return;
      const edges=getEdgesForNode(id);
      const predStr=a.predecessors.length? a.predecessors.join(' y '): 'Inicio (sin precedentes)';
      const noPred = a.predecessors.length===0;
      const multiPred = a.predecessors.length>1;
      const msg = noPred
        ? `**Actividad ${id}** — Duración: ${a.duration} días\n\n- **Predecesora:** ninguna (actividad independiente)\n- Puede iniciar desde el comienzo del proyecto\n- Se conecta directamente al nodo Inicio`
        : multiPred
          ? `**Actividad ${id}** — Duración: ${a.duration} días\n\n- **Predecesoras:** ${predStr}\n- Relación de dependencia: **Fin-a-Inicio (FS)**\n- **Regla PMBOK:** debe esperar a que TODAS las predecesoras terminen\n- Este punto de convergencia será clave en el cálculo`
          : `**Actividad ${id}** — Duración: ${a.duration} días\n\n- **Predecesora:** ${predStr}\n- Relación: **Fin-a-Inicio (FS)**\n- Solo puede iniciar cuando ${predStr} haya finalizado`;
      push(1,{visN:[id],visE:edges,hE:multiPred?edges:[],act:id,msg,
        mt:multiPred?'highlight':'default'});
    });
  }
  // __end
  {
    const edges=getEdgesForNode('__end');
    const endPreds=allActIds.filter(id=>succs[id]?.includes('__end'));
    push(1,{visN:['__end'],visE:edges,act:'__end',
      msg:`**Red de precedencias completa**\n\n- Actividades finales (sin sucesoras): **${endPreds.join(', ')}**\n- El nodo **Fin** es ficticio (duración = 0), marca el cierre del proyecto\n\nLa red está lista. Presiona **Siguiente** para iniciar el **Pase Hacia Adelante**.`,mt:'success'});
  }

  // Phase 2: forward pass announcement
  push(2,{msg:`**FASE 2 — PASE HACIA ADELANTE** *(Early Times)*\n\nCalculamos los tiempos más tempranos en que cada actividad puede ocurrir:\n\n| Valor | Nombre PMBOK | Fórmula |\n|---|---|---|\n| **ES** | Early Start (Inicio Temprano) | máx(EF predecesoras) |\n| **EF** | Early Finish (Fin Temprano) | ES + Duración |\n\nAvanzamos de **izquierda a derecha** en la red.`,mt:'highlight'});

  // __start
  push(2,{rev:{'__start':{ES:0,EF:0}},fo:{id:'__start',text:'0 + 0 = 0'},act:'__start',
    msg:`**Nodo Inicio**\n\n- **ES = 0** → el proyecto empieza en el día 0\n- **EF = ES + 0 = 0** → no consume tiempo\n- Este valor (0) se "hereda" hacia todas las actividades sin predecesoras`,mt:'default'});

  // Each node in topo order
  const topoActIds=cpm.order.filter(id=>id!=='__start'&&id!=='__end');
  topoActIds.forEach(id=>{
    const a=acts.find(x=>x.id===id)!;
    const r=result[id];
    const preds=a.predecessors.length?a.predecessors:['__start'];
    if(preds.length>1){
      const vals=preds.map(p=>({ p, ef:result[p]?.EF??0 }));
      const maxP=vals.reduce((m,v)=>v.ef>m.ef?v:m);
      push(2,{hE:preds.map(p=>ek(p,id)),act:id,
        msg:`**Convergencia en Actividad ${id}** *(múltiples predecesoras)*\n\nEntradas que llegan:\n${vals.map(v=>`- **${v.p}** termina en el día ${v.ef}`).join('\n')}\n\n**Regla PMBOK:** ES = máximo entre todos los EF de entrada\n→ **ES(${id}) = ${r.ES}** (viene de ${maxP.p})`,mt:'highlight'});
    }
    push(2,{rev:{[id]:{ES:r.ES,EF:r.EF}},fo:{id,text:`${r.ES} + ${a.duration} = ${r.EF}`},act:id,
      msg:`**Actividad ${id}** — Duración: ${a.duration} días\n\n- **ES** (Early Start) = ${r.ES}\n- **Fórmula:** EF = ES + Duración = ${r.ES} + ${a.duration} = **${r.EF}**\n- **EF** (Early Finish) = ${r.EF}`,mt:'default'});
  });
  // __end
  push(2,{rev:{'__end':{ES:result['__end'].ES,EF:result['__end'].EF}},fo:{id:'__end',text:`${result['__end'].ES} + 0 = ${result['__end'].EF}`},act:'__end',
    msg:`**Pase Hacia Adelante completado**\n\n- Duración mínima del proyecto: **${result['__end'].EF} días**\n- Este es el tiempo más corto posible (todos los recursos disponibles, sin retrasos)\n- En el PMBOK: se llama **"Duración del Proyecto"**\n\nPresiona **Siguiente** para el Pase Hacia Atrás.`,mt:'success'});

  // Phase 3: backward
  push(3,{msg:`**FASE 3 — PASE HACIA ATRÁS** *(Late Times)*\n\nCalculamos los tiempos más tardíos que una actividad puede tener sin retrasar el proyecto:\n\n| Valor | Nombre PMBOK | Fórmula |\n|---|---|---|\n| **LF** | Late Finish (Fin Tardío) | mín(LS de sucesoras) |\n| **LS** | Late Start (Inicio Tardío) | LF − Duración |\n\nAvanzamos de **derecha a izquierda** en la red.`,mt:'backward'});

  const backOrder=[...topoActIds].reverse();
  push(3,{rev:{'__end':{...cur.revealed['__end'],LS:result['__end'].LS,LF:result['__end'].LF}},
    fo:{id:'__end',text:`${result['__end'].LF} − 0 = ${result['__end'].LS}`},act:'__end',
    msg:`**Nodo Fin**\n\n- **LF = EF = ${result['__end'].LF}** → el proyecto no puede terminar más tarde que el día ${result['__end'].LF}\n- **LS = LF − 0 = ${result['__end'].LS}** → punto de inicio tardío\n- Este valor se "propaga" hacia atrás en la red`,mt:'backward'});

  backOrder.forEach(id=>{
    const a=acts.find(x=>x.id===id)!;
    const r=result[id];
    const kids=succs[id].filter(k=>k!=='__end'?true:true);
    if(kids.length>1){
      const vals=kids.map(k=>({k,ls:result[k]?.LS??0}));
      const minK=vals.reduce((m,v)=>v.ls<m.ls?v:m);
      push(3,{hE:kids.map(k=>ek(id,k)),act:id,
        msg:`**Divergencia en Actividad ${id}** *(múltiples sucesoras)*\n\nSucesoras con sus LS:\n${vals.map(v=>`- **${v.k}** puede iniciar a más tardar el día ${v.ls}`).join('\n')}\n\n**Regla PMBOK:** LF = mínimo entre todos los LS de salida\n→ **LF(${id}) = ${r.LF}** (lo exige ${minK.k})\n\n*Si usáramos un valor mayor, retrasaríamos a ${minK.k}.*`,mt:'highlight'});
    }
    push(3,{rev:{[id]:{...cur.revealed[id],LS:r.LS,LF:r.LF}},fo:{id,text:`${r.LF} − ${a.duration} = ${r.LS}`},act:id,
      msg:`**Actividad ${id}** — Duración: ${a.duration} días\n\n- **LF** (Late Finish) = ${r.LF}\n- **Fórmula:** LS = LF − Duración = ${r.LF} − ${a.duration} = **${r.LS}**\n- **LS** (Late Start) = ${r.LS}`,mt:'backward'});
  });
  push(3,{rev:{'__start':{...cur.revealed['__start'],LS:result['__start'].LS,LF:result['__start'].LF}},
    fo:{id:'__start',text:`${result['__start'].LF} − 0 = ${result['__start'].LS}`},act:'__start',
    msg:`**Pase Hacia Atrás completado**\n\nTodos los nodos tienen sus cuatro tiempos: ES, EF, LS y LF.\n\nPresiona **Siguiente** para calcular las **Holguras** y descubrir la **Ruta Crítica**.`,mt:'success'});

  // Phase 4: floats + critical
  const floatRev: Step['revealed']={};
  allNodeIds.forEach(id=>{ floatRev[id]={...result[id]}; });
  push(4,{rev:floatRev,
    msg:`**FASE 4 — HOLGURA TOTAL** *(Total Float)*\n\n**Fórmula PMBOK:** H = LS − ES = LF − EF\n\nResultados:\n${allActIds.map(id=>`- **${id}:** H = ${result[id].float} día(s)${result[id].float===0?' ← **CRÍTICA**':''}`).join('\n')}\n\n**H = 0** → la actividad NO tiene margen de retraso → es **crítica**.\nPresiona **Siguiente** para ver la Ruta Crítica resaltada.`,mt:'highlight'});

  const critEdges=allEdges.filter(e=>{
    const [f,t]=e.split('→');
    return result[f]?.isCritical&&result[t]?.isCritical;
  });
  const critPath=allNodeIds.filter(id=>result[id]?.isCritical&&id!=='__start'&&id!=='__end');
  const nonCrit=allActIds.filter(id=>!result[id]?.isCritical);
  push(4,{cE:critEdges,
    msg:`**Ruta Crítica Identificada**\n\n**Camino:** ${critPath.join(' → ')} — **${result['__end'].EF} días**\n\n${critPath.length>0?`Actividades críticas (H=0):\n${critPath.map(id=>`- **${id}** → cualquier retraso extiende el proyecto`).join('\n')}`:''}${nonCrit.length>0?`\n\nActividades con holgura (no críticas):\n${nonCrit.map(id=>`- **${id}** → holgura de ${result[id].float} día(s)`).join('\n')}`:''}`,mt:'critical'});

  return steps;
}

// ─── SVG Arrow ────────────────────────────────────────────────────────────────
function Arrow({ek,positions,highlighted,critical,visible}:{ek:string;positions:Record<string,{x:number;y:number}>;highlighted:boolean;critical:boolean;visible:boolean}){
  const [fi,ti]=ek.split('→');
  const f=positions[fi],t=positions[ti];
  if(!f||!t) return null;
  const {sx,sy,ex,ey}=arrowPts(f.x,f.y,t.x,t.y);
  const color=critical?'#ef4444':highlighted?'#f59e0b':'#1a56db';
  const sw=critical?3.5:highlighted?2.5:1.5;
  const mid=`mrk-${ek.replace(/[^a-zA-Z0-9]/g,'_')}`;
  return(
    <g style={{opacity:visible?1:0,transition:'opacity 0.45s ease'}}>
      <defs><marker id={mid} markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
        <polygon points="0 0,9 3.5,0 7" fill={color} style={{transition:'fill 0.4s'}}/>
      </marker></defs>
      <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={color} strokeWidth={sw}
        strokeDasharray={highlighted&&!critical?'6 3':'none'}
        markerEnd={`url(#${mid})`} style={{transition:'stroke 0.4s,stroke-width 0.4s'}}/>
    </g>
  );
}

// ─── SVG Node ─────────────────────────────────────────────────────────────────
function Node({id,label,dur,x,y,rev,isActive,phase}:{id:string;label:string;dur:number;x:number;y:number;rev:Step['revealed'][string];isActive:boolean;phase:number}){
  const w=90,h=70,x0=x-w/2,y0=y-h/2;
  const crit=rev?.isCritical;
  const stroke=crit?'#ef4444':isActive?'#f59e0b':'#1a56db';
  const fill=crit?'#fff1f2':isActive?'#fffbeb':'#ffffff';
  const sw=crit?2.5:isActive?2.2:1.5;
  const esColor=phase>=2?'#1a56db':'#cbd5e1';
  const lsColor=phase>=3?'#dc2626':'#cbd5e1';
  return(
    <g style={{opacity:1,filter:isActive?'drop-shadow(0 0 8px rgba(245,158,11,.55))':crit?'drop-shadow(0 0 8px rgba(239,68,68,.45))':'none',transition:'filter 0.3s'}}>
      <rect x={x0} y={y0} width={w} height={h} rx={6} fill={fill} stroke={stroke} strokeWidth={sw} style={{transition:'fill 0.35s,stroke 0.35s'}}/>
      <line x1={x0} y1={y} x2={x0+w} y2={y} stroke="#e2e8f0" strokeWidth={0.7}/>
      <line x1={x} y1={y0} x2={x} y2={y0+h} stroke="#e2e8f0" strokeWidth={0.7}/>
      <text x={x0+w/4} y={y-h/4+6} textAnchor="middle" fontSize={13} fontWeight="700" fill={esColor} style={{transition:'fill 0.35s'}}>{rev?.ES!=null?rev.ES:''}</text>
      <text x={x0+3*w/4} y={y-h/4+6} textAnchor="middle" fontSize={13} fontWeight="700" fill={esColor} style={{transition:'fill 0.35s'}}>{rev?.EF!=null?rev.EF:''}</text>
      <text x={x0+w/4} y={y+h/4+6} textAnchor="middle" fontSize={13} fontWeight="700" fill={lsColor} style={{transition:'fill 0.35s'}}>{rev?.LS!=null?rev.LS:''}</text>
      <text x={x0+3*w/4} y={y+h/4+6} textAnchor="middle" fontSize={13} fontWeight="700" fill={lsColor} style={{transition:'fill 0.35s'}}>{rev?.LF!=null?rev.LF:''}</text>
      {/* label */}
      <text x={x} y={y0+h+16} textAnchor="middle" fontSize={13} fontWeight="800" fill={crit?'#ef4444':'#1e293b'}>{label}</text>
      <text x={x} y={y0+h+28} textAnchor="middle" fontSize={10} fill="#94a3b8">d={dur}</text>
      {/* float badge */}
      {rev?.float!=null&&(
        <g><rect x={x-14} y={y0-22} width={28} height={16} rx={8} fill={crit?'#ef4444':'#e2e8f0'} style={{transition:'fill 0.4s'}}/><text x={x} y={y0-10} textAnchor="middle" fontSize={10} fontWeight="700" fill={crit?'#fff':'#64748b'}>H={rev.float}</text></g>
      )}
      {/* quad labels — más visibles */}
      <g fontSize={9} fontWeight="600" fill="#94a3b8">
        <text x={x0+4}    y={y0+11}>ES</text>
        <text x={x0+w-20} y={y0+11}>EF</text>
        <text x={x0+4}    y={y0+h-3}>LS</text>
        <text x={x0+w-20} y={y0+h-3}>LF</text>
      </g>
    </g>
  );
}

// ─── Message renderer ─────────────────────────────────────────────────────────
const MSG_BG:Record<string,string>={default:'#eff6ff',success:'#f0fdf4',highlight:'#fffbeb',backward:'#fdf4ff',critical:'#fff1f2'};
const MSG_BD:Record<string,string>={default:'#bfd3f5',success:'#bbf7d0',highlight:'#fde68a',backward:'#e9d5ff',critical:'#fecaca'};
const MSG_TX:Record<string,string>={default:'#1e3a5f',success:'#166534',highlight:'#92400e',backward:'#6b21a8',critical:'#991b1b'};

const markdownComponents: Partial<Components> = {
  table({ children }) {
    return (
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 12,
          margin: '10px 0',
          border: '1px solid rgba(15,23,42,0.12)',
        }}
      >
        {children}
      </table>
    );
  },
  th({ children }) {
    return (
      <th
        style={{
          textAlign: 'left',
          padding: '8px 10px',
          background: 'rgba(15,23,42,0.06)',
          borderBottom: '1px solid rgba(15,23,42,0.12)',
          fontWeight: 700,
        }}
      >
        {children}
      </th>
    );
  },
  td({ children }) {
    return (
      <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(15,23,42,0.08)', verticalAlign: 'top' }}>{children}</td>
    );
  },
};

// ─── Main viewer ─────────────────────────────────────────────────────────────
export function CPMSimulationViewer({ activities, title='Simulación Ruta Crítica', hideHeader }: Props) {
  const [step, setStep] = useState(0);

  const { cpm, positions, canvasW, canvasH, steps, allEdges, allNodeIds, nodeMap } = useMemo(()=>{
    const c = computeCPM(activities);
    const { positions: p, canvasW: cW, canvasH: cH } = assignPositions(activities, c);
    const st = buildSteps(activities, c);

    const allActIds = activities.map(a=>a.id);
    const nodeIds = ['__start',...allActIds,'__end'];
    const edges: string[] = [];
    nodeIds.forEach(id=>{
      let preds: string[];
      if(id==='__start') preds=[];
      else if(id==='__end') preds=allActIds.filter(n=>c.succs[n]?.includes('__end'));
      else {
        const actPreds=(activities.find(a=>a.id===id)?.predecessors||[]).filter(p=>allActIds.includes(p));
        // Si no tiene predecesores reales → conectar desde __start
        preds = actPreds.length ? actPreds : ['__start'];
      }
      preds.forEach(pred=>edges.push(`${pred}→${id}`));
    });

    const nm: Record<string,{id:string;label:string;dur:number}> = {
      __start:{id:'__start',label:'Inicio',dur:0},
      __end:{id:'__end',label:'Fin',dur:0},
    };
    activities.forEach(a=>{ nm[a.id]={id:a.id,label:a.id,dur:a.duration}; });

    return { cpm:c, positions:p, canvasW:cW, canvasH:cH, steps:st, allEdges:edges, allNodeIds:nodeIds, nodeMap:nm };
  }, [activities]);

  const cur = steps[step] || steps[0];
  const phaseLabels=['','🏗 Fase 1: Construcción','Fase 2: Hacia Adelante','Fase 3: Hacia Atrás','Fase 4: Ruta Crítica'];

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',fontFamily:"'Inter','Segoe UI',sans-serif",background:'#f8fafc',borderRadius:16,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.10)'}}>

      {/* Header — se oculta cuando está embebido en una vista previa */}
      {!hideHeader && (
        <div style={{background:'linear-gradient(135deg,#1a56db,#142d61)',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div>
            <p style={{color:'rgba(255,255,255,0.7)',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.1em',margin:0}}>Simulación Interactiva</p>
            <h2 style={{color:'#fff',fontSize:16,fontWeight:800,margin:0}}>{title}</h2>
          </div>
          <div style={{display:'flex',gap:8}}>
            <span style={{background:'rgba(255,255,255,0.18)',color:'#fff',padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:700}}>{phaseLabels[cur.phase]}</span>
            <span style={{background:'rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.8)',padding:'4px 10px',borderRadius:20,fontSize:11}}>{step+1}/{steps.length}</span>
          </div>
        </div>
      )}

      {/* Body: mantiene alto mínimo para el diagrama aunque el pie crezca con el texto */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 260 }}>

        {/* Table panel */}
        <div style={{width:210,background:'#fff',borderRight:'1px solid #e2e8f0',padding:'14px 12px',overflowY:'auto',flexShrink:0}}>
          <p style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>Actividades</p>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr style={{background:'#1a56db'}}>
                {(['Act','Pred','Dur'] as const).map(h=><th key={h} style={{padding:'6px 6px',color:'#fff',fontWeight:700,fontSize:11,textAlign:h==='Dur'?'center':'left'}}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {activities.map((a,i)=>{
                const rv=cur.revealed[a.id];
                const crit=rv?.isCritical;
                return(
                  <tr key={a.id} style={{background:crit?'#fff1f2':cur.activeId===a.id?'#fffbeb':i%2===0?'#f8fafc':'#fff',transition:'background 0.3s'}}>
                    <td style={{padding:'6px 6px',fontWeight:700,color:crit?'#ef4444':cur.activeId===a.id?'#d97706':'#1e293b'}}>{a.id}</td>
                    <td style={{padding:'6px 6px',color:'#64748b',fontSize:11}}>{a.predecessors.filter(p=>p!=='__start').join(', ')||'-'}</td>
                    <td style={{padding:'6px 6px',color:'#475569',textAlign:'center'}}>{a.duration}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {cur.phase>=4&&(
            <div style={{marginTop:14}}>
              <p style={{fontSize:10,fontWeight:700,color:'#64748b',textTransform:'uppercase',marginBottom:8}}>Holguras</p>
              {activities.map(a=>{
                const rv=cur.revealed[a.id];
                if(rv?.float==null) return null;
                return(
                  <div key={a.id} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:'1px solid #f1f5f9',fontSize:12}}>
                    <span style={{fontWeight:700,color:rv.isCritical?'#ef4444':'#1e293b'}}>{a.id}</span>
                    <span style={{fontWeight:600,color:rv.isCritical?'#ef4444':'#64748b'}}>H={rv.float}{rv.isCritical?' ⚠️':''}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SVG canvas */}
        <div style={{flex:1,overflow:'hidden',background:'#f1f5f9',position:'relative'}}>
          <svg viewBox={`0 0 ${canvasW} ${canvasH}`} style={{width:'100%',height:'100%'}} preserveAspectRatio="xMidYMid meet">
            <defs><pattern id="cpm-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0 L0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.5"/></pattern></defs>
            <rect width={canvasW} height={canvasH} fill="url(#cpm-grid)"/>

            {/* Edges */}
            {allEdges.map(e=>(
              <Arrow key={e} ek={e} positions={positions}
                visible={cur.visibleEdges.includes(e)}
                highlighted={cur.highlightedEdges.includes(e)}
                critical={cur.criticalEdges.includes(e)}/>
            ))}

            {/* Nodes */}
            {allNodeIds.map(id=>{
              if(!positions[id]) return null;
              const nm=nodeMap[id];
              return(
                <Node key={id} id={id} label={nm.label} dur={nm.dur}
                  x={positions[id].x} y={positions[id].y}
                  rev={cur.revealed[id]||{}}
                  isActive={cur.activeId===id}
                  phase={cur.phase}/>
              );
            })}

            {/* Floating formula */}
            {cur.formula&&positions[cur.formula.id]&&(()=>{
              const {x,y}=positions[cur.formula.id];
              const tw=cur.formula.text.length*8+16;
              return(
                <g key={step}>
                  <rect x={x+52} y={y-22} width={tw} height={24} rx={8} fill="#fbbf24" opacity={0.95}/>
                  <text x={x+60} y={y-6} fontSize={12} fontWeight="800" fill="#1e293b">{cur.formula.text}</text>
                </g>
              );
            })()}
          </svg>
        </div>
      </div>

      {/* Controles — altura según contenido del mensaje; sin scroll forzado en el recuadro */}
      <div style={{background:'#fff',borderTop:'1px solid #e2e8f0',padding:'12px 18px',flexShrink:0,display:'flex',flexDirection:'column',gap:10}}>
        <div style={{
          background:MSG_BG[cur.msgType],border:`1.5px solid ${MSG_BD[cur.msgType]}`,
          borderRadius:12,padding:'10px 14px',color:MSG_TX[cur.msgType],fontSize:13,
          lineHeight:1.5,transition:'background 0.3s,border-color 0.3s',
          maxWidth:'100%',
        }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{cur.message}</ReactMarkdown>
        </div>
        {/* Botones — debajo del mensaje cuando el texto es alto */}
        <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0,flexWrap:'wrap'}}>
          {/* Reiniciar */}
          <button onClick={()=>setStep(0)} title="Reiniciar simulación"
            style={{padding:'7px 12px',borderRadius:10,fontSize:12,fontWeight:600,cursor:'pointer',
              background:'#f1f5f9',color:'#64748b',border:'1.5px solid #e2e8f0',transition:'all 0.15s',whiteSpace:'nowrap'}}>
            ↺ Reiniciar
          </button>

          {/* Atrás */}
          <button onClick={()=>setStep(s=>Math.max(0,s-1))} disabled={step===0}
            style={{padding:'7px 16px',borderRadius:10,fontSize:13,fontWeight:700,cursor:step===0?'not-allowed':'pointer',
              background:step===0?'#f1f5f9':'#dbeafe',color:step===0?'#94a3b8':'#1a56db',
              border:`1.5px solid ${step===0?'#e2e8f0':'#bfd3f5'}`,transition:'all 0.15s',whiteSpace:'nowrap'}}>
            ← Atrás
          </button>

          {/* Barra de progreso */}
          <div style={{flex:1,minWidth:60,height:8,background:'#e2e8f0',borderRadius:999,overflow:'hidden'}}>
            <div style={{height:'100%',borderRadius:999,background:'linear-gradient(90deg,#1a56db,#3b82f6)',width:`${(step/(steps.length-1))*100}%`,transition:'width 0.3s'}}/>
          </div>

          {/* Siguiente */}
          <button onClick={()=>setStep(s=>Math.min(steps.length-1,s+1))} disabled={step===steps.length-1}
            style={{padding:'7px 16px',borderRadius:10,fontSize:13,fontWeight:700,cursor:step===steps.length-1?'not-allowed':'pointer',
              background:step===steps.length-1?'#f1f5f9':'linear-gradient(135deg,#1a56db,#142d61)',
              color:step===steps.length-1?'#94a3b8':'#fff',border:'none',whiteSpace:'nowrap',
              boxShadow:step===steps.length-1?'none':'0 2px 8px rgba(26,86,219,0.3)',transition:'all 0.15s'}}>
            Siguiente →
          </button>

          {/* Ir al final */}
          <button onClick={()=>setStep(steps.length-1)} title="Ver resultado final"
            style={{padding:'7px 12px',borderRadius:10,fontSize:12,fontWeight:600,cursor:'pointer',
              background:'#EFF6FF',color:'#1a56db',border:'1.5px solid #bfd3f5',transition:'all 0.15s',whiteSpace:'nowrap'}}>
            ⏭ Final
          </button>
        </div>
      </div>
    </div>
  );
}

