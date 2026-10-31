/** Pulls the component source out of a (possibly still streaming) reply. */
export function extractCode(raw: string): { code: string; complete: boolean } {
  const open = raw.match(/```(?:tsx|jsx|ts|js|typescript|javascript)?\s*\n/);
  if (!open || open.index === undefined) return { code: "", complete: false };
  const start = open.index + open[0].length;
  const end = raw.indexOf("```", start);
  if (end === -1) return { code: raw.slice(start), complete: false };
  return { code: raw.slice(start, end).trimEnd() + "\n", complete: true };
}

export function extractName(code: string): string {
  return code.match(/\/\/\s*@name\s+(.+)/)?.[1]?.trim() || "Untitled component";
}
