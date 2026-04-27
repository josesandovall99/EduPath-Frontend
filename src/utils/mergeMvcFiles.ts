/**
 * Versión TypeScript de mergeMvcFiles (espejo del backend).
 * Fusiona los 3 archivos MVC en un único .java para Judge0.
 * Solo Main mantiene `public`; ConsolaIO y Modelo se vuelven package-private.
 */
function extractImportsAndBody(code: string): { imports: string[]; body: string } {
  const lines = (code || '').split('\n');
  const imports: string[] = [];
  const body: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (/^package\s/.test(t) || /^import\s/.test(t)) imports.push(t);
    else body.push(line);
  }
  return { imports, body: body.join('\n') };
}

function removePublicFromClassDecl(code: string): string {
  return code.replace(/^(\s*)public\s+(class|interface|enum)\s+/gm, '$1$2 ');
}

export function mergeMvcFiles(mainCode: string, modeloCode: string, consolaIOCode: string): string {
  const main = extractImportsAndBody(mainCode || '');
  const modelo = extractImportsAndBody(removePublicFromClassDecl(modeloCode || ''));
  const consolaIO = extractImportsAndBody(removePublicFromClassDecl(consolaIOCode || ''));

  const seen = new Set<string>();
  const allImports: string[] = [];
  for (const imp of [...consolaIO.imports, ...modelo.imports, ...main.imports]) {
    if (imp && !seen.has(imp)) { seen.add(imp); allImports.push(imp); }
  }

  return [
    allImports.join('\n'),
    consolaIO.body.trim(),
    modelo.body.trim(),
    main.body.trim(),
  ].filter(Boolean).join('\n\n');
}
