import * as joint from 'jointjs';

/** Misma convención de texto que `attrs.label.text` + umlValidator (nombre; + inicia métodos). */
export const UML_CLASS_CELL_TYPE = 'standard.UmlClass';

const SIDE_PAD = 10;
const PAD_TOP = 6;
/** Margen vertical simétrico dentro de cada franja entre líneas. */
const INSET_Y = 6;
const FONT_NAME = 14;
const FONT_BODY = 11;
/** Altura efectiva por línea (entre baselines típicos en SVG sans-serif). */
const NAME_LINE_H = FONT_NAME + 8;
const BODY_LINE_H = FONT_BODY + 6;
const MIN_W = 180;
const MAX_W = 420;
const BODY_STROKE = '#7ED6A7';

let UmlClassDefined: ReturnType<typeof joint.dia.Element.define> | null = null;

function maxLineLength(texts: string[]) {
  let m = 0;
  texts.forEach((t) =>
    String(t || '')
      .split('\n')
      .forEach((line) => {
        const len = line.length;
        if (len > m) m = len;
      })
  );
  return m || 12;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function countVisualLines(display: string) {
  const t = display.replace(/\r\n/g, '\n');
  return Math.max(1, t.split('\n').length);
}

export function parseUmlCanonicalText(full: string): {
  className: string;
  attrLines: string[];
  methodLines: string[];
} {
  const lines = String(full || '').replace(/\r\n/g, '\n').split('\n');
  const rawName = lines[0] ?? '';
  const className = rawName.trim() || 'NuevaClase';

  let methodStart = lines.findIndex((ln, i) => i > 0 && ln.trimStart().startsWith('+'));
  if (methodStart < 0) methodStart = lines.length;

  const attrSlice = lines.slice(1, methodStart);
  const methodSlice = lines.slice(methodStart);

  const attrLines = attrSlice.map((l) => l.trimEnd()).filter((l) => l.trim().length > 0);

  const methodLines = methodSlice.map((l) => l.trimEnd()).filter((l) => l.trim().length > 0);

  return { className, attrLines, methodLines };
}

export function buildCanonicalUmlText(parts: {
  className: string;
  attrLines: string[];
  methodLines: string[];
}): string {
  const out: string[] = [parts.className.trim() || 'NuevaClase'];
  parts.attrLines.forEach((l) => out.push(l));
  parts.methodLines.forEach((l) => out.push(l));
  return out.join('\n');
}

export function migrateDiagramCellsJson(diagramJson: Record<string, unknown> | undefined | null) {
  if (!diagramJson || !Array.isArray((diagramJson as { cells?: unknown }).cells)) {
    return diagramJson;
  }

  return {
    ...(diagramJson as Record<string, unknown>),
    cells: ((diagramJson as { cells: unknown[] }).cells as Record<string, unknown>[]).map((cell) => {
      if (cell?.type === 'standard.Rectangle') {
        return { ...cell, type: UML_CLASS_CELL_TYPE };
      }
      if (cell?.type === 'standard.Link' && cell.attrs && typeof cell.attrs === 'object') {
        const attrs = cell.attrs as Record<string, Record<string, unknown>>;
        const line = { ...(attrs.line || {}), connection: true, strokeLinejoin: 'round' };

        const wrapper = {
          connection: true,
          strokeWidth: 10,
          strokeLinejoin: 'round',
          stroke: 'transparent',
          ...(attrs.wrapper || {}),
        };

        wrapper.connection = true;

        return { ...cell, attrs: { ...attrs, line, wrapper } };
      }
      return cell;
    }),
  };
}

export function ensureUmlClassShapeRegistered(): void {
  if (UmlClassDefined) return;

  UmlClassDefined = joint.dia.Element.define(
    UML_CLASS_CELL_TYPE,
    {
      type: UML_CLASS_CELL_TYPE,
      size: { width: MIN_W, height: 100 },
      attrs: {
        body: {
          refWidth: '100%',
          refHeight: '100%',
          stroke: BODY_STROKE,
          strokeWidth: 2,
          fill: '#ffffff',
        },
        dividerTop: {
          stroke: '#3A4A5B',
          strokeWidth: 1,
          x1: 0,
          y1: 0,
          x2: MIN_W,
          y2: 0,
          pointerEvents: 'none',
        },
        dividerBottom: {
          stroke: '#3A4A5B',
          strokeWidth: 1,
          x1: 0,
          y1: 0,
          x2: MIN_W,
          y2: 0,
          pointerEvents: 'none',
        },
        sectionName: {
          text: 'NuevaClase',
          x: SIDE_PAD + (MIN_W - 2 * SIDE_PAD) / 2,
          y: 0,
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          fontSize: FONT_NAME,
          fontWeight: '600',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif',
          fill: '#3A4A5B',
          lineHeight: `${NAME_LINE_H}`,
          stroke: 'none',
        },
        sectionAttrs: {
          text: '',
          x: SIDE_PAD,
          y: 0,
          textAnchor: 'start',
          textVerticalAnchor: 'middle',
          fontSize: FONT_BODY,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif',
          fill: '#3A4A5B',
          lineHeight: `${BODY_LINE_H}px`,
          stroke: 'none',
        },
        sectionMethods: {
          text: '',
          x: SIDE_PAD,
          y: 0,
          textAnchor: 'start',
          textVerticalAnchor: 'middle',
          fontSize: FONT_BODY,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif',
          fill: '#3A4A5B',
          lineHeight: `${BODY_LINE_H}px`,
          stroke: 'none',
        },
        label: {
          text: '',
          fontSize: 1,
          fill: '#ffffff',
          stroke: '#ffffff',
          opacity: 0,
          visibility: 'hidden',
          pointerEvents: 'none',
          x: 0,
          y: -10000,
        },
      },
      markup: [
        { tagName: 'rect', selector: 'body' },
        { tagName: 'line', selector: 'dividerTop' },
        { tagName: 'line', selector: 'dividerBottom' },
        { tagName: 'text', selector: 'sectionName' },
        { tagName: 'text', selector: 'sectionAttrs' },
        { tagName: 'text', selector: 'sectionMethods' },
        { tagName: 'text', selector: 'label' },
      ],
    } as Record<string, unknown>
  );

  /** No usar `joint.shapes.standard.UmlClass = …`: el bundle de producción congela ese objeto (`Object.preventExtensions`). */
}

export function layoutUmlClassCell(element: joint.dia.Cell | null): void {
  ensureUmlClassShapeRegistered();

  if (!element || !(element instanceof joint.dia.Element)) return;

  if (element.get('type') !== UML_CLASS_CELL_TYPE) return;

  let canonical = String(element.attr('label/text') ?? '').trim();
  if (!canonical) canonical = 'NuevaClase\n- atributo: tipo\n+ metodo(): retorno';

  const { className, attrLines, methodLines } = parseUmlCanonicalText(canonical);
  canonical = buildCanonicalUmlText({ className, attrLines, methodLines });

  element.attr({ label: { text: canonical } });

  const attrsDisplay = attrLines.length ? attrLines.join('\n') : ' ';
  const methodsDisplay = methodLines.length ? methodLines.join('\n') : ' ';

  const wHint = clamp(
    Math.ceil(maxLineLength([className, attrsDisplay, methodsDisplay]) * 8.25 + SIDE_PAD * 2),
    MIN_W,
    MAX_W
  );

  const finalW = Math.max(wHint, element.size().width);

  const nameLc = Math.max(1, countVisualLines(className));
  const attrsLc = Math.max(1, countVisualLines(attrsDisplay));
  const methLc = Math.max(1, countVisualLines(methodsDisplay));

  const nameCellH = INSET_Y * 2 + nameLc * NAME_LINE_H;
  const attrsCellH = INSET_Y * 2 + attrsLc * BODY_LINE_H;
  const methCellH = INSET_Y * 2 + methLc * BODY_LINE_H;

  const dividerTopY = PAD_TOP + nameCellH;
  const dividerBottomY = dividerTopY + attrsCellH;

  /** Centro vertical dentro de cada franja (entre bordes, no atravesando texto). */
  const yNameMid = PAD_TOP + nameCellH / 2;
  const yAttrsMid = dividerTopY + attrsCellH / 2;
  const yMethMid = dividerBottomY + methCellH / 2;

  element.attr({
    sectionName: {
      text: className,
      x: finalW / 2,
      y: yNameMid,
      textAnchor: 'middle',
      textVerticalAnchor: 'middle',
    },
    dividerTop: { x1: 0, y1: dividerTopY, x2: finalW, y2: dividerTopY },
    sectionAttrs: {
      text: attrsDisplay,
      x: SIDE_PAD,
      y: yAttrsMid,
      textAnchor: 'start',
      textVerticalAnchor: 'middle',
    },
    dividerBottom: { x1: 0, y1: dividerBottomY, x2: finalW, y2: dividerBottomY },
    sectionMethods: {
      text: methodsDisplay,
      x: SIDE_PAD,
      y: yMethMid,
      textAnchor: 'start',
      textVerticalAnchor: 'middle',
    },
  });

  const totalH = dividerBottomY + methCellH + PAD_TOP / 2;
  element.resize(finalW, Math.max(totalH, nameCellH + attrsCellH + methCellH + PAD_TOP));
}

export function createUmlClassCell(): joint.dia.Element {
  ensureUmlClassShapeRegistered();

  const cell = new (UmlClassDefined as unknown as new () => joint.dia.Element)();

  cell.attr({
    body: { stroke: BODY_STROKE, strokeWidth: 2 },
    label: { text: 'NuevaClase\n- atributo: tipo\n+ metodo(): retorno' },
  });

  layoutUmlClassCell(cell);

  return cell;
}

export function layoutAllUmlCells(graph: joint.dia.Graph | null): void {
  if (!graph) return;
  graph.getElements().forEach((el) => layoutUmlClassCell(el));
}
