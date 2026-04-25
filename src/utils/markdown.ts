export function preprocessForMarkdown(text: string): string {
  if (!text || typeof text !== 'string') return '';
  let t = text.replace(/^\s*markdown\s*[-:\s]*/i, '').trim();
  t = t.replace(/```\s*markdown\s*/gi, '').replace(/```/g, '');
  t = t.replace(/\s+(?=\d+\.\s+)/g, '\n');
  return t;
}
