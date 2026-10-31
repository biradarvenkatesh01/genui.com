export type TokenValue = string | number | TokenObject;
export type TokenObject = { [key: string]: TokenValue };

/** Locates the `export const tokens = { ... }` literal: [start, end) of the object. */
function findTokensLiteral(code: string): [number, number] | null {
  const decl = code.match(/export\s+const\s+tokens\s*(?::[^=]+)?=\s*/);
  if (!decl || decl.index === undefined) return null;
  const start = decl.index + decl[0].length;
  if (code[start] !== "{") return null;

  let depth = 0;
  let quote: string | null = null;
  for (let i = start; i < code.length; i++) {
    const ch = code[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return [start, i + 1];
  }
  return null;
}

const IDENT = /^[A-Za-z_$][\w$]*$/;

function serialize(value: TokenValue, indent: string): string {
  if (typeof value === "number") return String(Math.round(value * 1000) / 1000);
  if (typeof value === "string") return JSON.stringify(value);
  const inner = indent + "  ";
  const entries = Object.entries(value).map(
    ([k, v]) => `${inner}${IDENT.test(k) ? k : JSON.stringify(k)}: ${serialize(v, inner)}`,
  );
  return `{\n${entries.join(",\n")},\n${indent}}`;
}

/** Writes edited token values back into the component source. */
export function applyTokensToSource(code: string, tokens: TokenObject): string {
  const range = findTokensLiteral(code);
  if (!range) return code;
  return code.slice(0, range[0]) + serialize(tokens, "") + code.slice(range[1]);
}

export function isHexColor(v: unknown): v is string {
  return typeof v === "string" && /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(v);
}
