import { parse } from "@babel/parser";
import type * as B from "@babel/types";

// Canvas edits are applied to the component source. Every editable JSX element is
// identified by its start offset in the source (its "gid"), which the preview
// receives as a data-gid attribute on the rendered DOM node.

export type StyleValue = { kind: "literal"; value: string | number } | { kind: "expr"; source: string };
export type StylePatch = Record<string, string | number | { expr: string } | null>;

export type ElementInfo = {
  tag: string;
  line: number;
  snippet: string;
  /** The element's one static text child, if it has exactly one. */
  text: string | null;
  /** Inline style entries; null when `style` is not an object literal. */
  style: Record<string, StyleValue> | null;
  canDelete: boolean;
  canDuplicate: boolean;
  canMove: { before: boolean; after: boolean };
  /** Identifier to reference tokens with at this element ("t" or the module-level "tokens"). */
  tokenVar: string;
};

type Found = { node: B.JSXElement; ancestors: B.Node[] };
type Splice = [start: number, end: number, text: string];

const SKIP = new Set(["loc", "start", "end", "extra", "range", "leadingComments", "trailingComments", "innerComments", "comments", "tokens"]);
const IDENT = /^[A-Za-z_$][\w$]*$/;

let cached: { code: string; ast: B.File | null } | null = null;

function parseSource(code: string): B.File | null {
  if (cached?.code !== code) {
    let ast: B.File | null = null;
    try {
      // The parser ships its own copy of @babel/types; the shapes are the same.
      ast = parse(code, { sourceType: "module", plugins: ["typescript", "jsx"] }) as unknown as B.File;
    } catch {
      // Unparseable source (mid-edit or broken output): nothing is editable.
    }
    cached = { code, ast };
  }
  return cached.ast;
}

function isNode(v: unknown): v is B.Node {
  return typeof v === "object" && v !== null && typeof (v as { type?: unknown }).type === "string";
}

function walk(node: B.Node, ancestors: B.Node[], visit: (n: B.Node, ancestors: B.Node[]) => boolean | void) {
  if (visit(node, ancestors) === false) return;
  const path = [...ancestors, node];
  for (const [key, value] of Object.entries(node)) {
    if (SKIP.has(key)) continue;
    if (Array.isArray(value)) value.forEach((child) => isNode(child) && walk(child, path, visit));
    else if (isNode(value)) walk(value, path, visit);
  }
}

function lucideImports(ast: B.File): Set<string> {
  const names = new Set<string>();
  for (const stmt of ast.program.body) {
    if (stmt.type !== "ImportDeclaration" || stmt.source.value !== "lucide-react") continue;
    for (const s of stmt.specifiers) names.add(s.local.name);
  }
  return names;
}

/** DOM elements, motion.* elements and lucide icons: the things that render a node we can select. */
function isEditable(el: B.JSXElement, icons: Set<string>): boolean {
  const name = el.openingElement.name;
  if (name.type === "JSXIdentifier") return /^[a-z]/.test(name.name) || icons.has(name.name);
  return name.type === "JSXMemberExpression" && name.object.type === "JSXIdentifier" && /^(motion|m)$/.test(name.object.name);
}

function applySplices(code: string, splices: Splice[]): string {
  return [...splices]
    .sort((a, b) => b[0] - a[0])
    .reduce((out, [start, end, text]) => out.slice(0, start) + text + out.slice(end), code);
}

/**
 * Where a source offset lands after an edit, found by diffing the two versions:
 * unchanged before the edit, shifted after it, null if it was inside the changed span.
 */
export function remapOffset(prev: string, next: string, offset: number): number | null {
  const max = Math.min(prev.length, next.length);
  let head = 0;
  while (head < max && prev[head] === next[head]) head++;
  let tail = 0;
  while (tail < max - head && prev[prev.length - 1 - tail] === next[next.length - 1 - tail]) tail++;
  if (offset < head) return offset;
  if (offset >= prev.length - tail) return offset + next.length - prev.length;
  return null;
}

/** Adds data-gid to every editable element. Run on a copy of the source right before compiling. */
export function instrument(code: string): string {
  const ast = parseSource(code);
  if (!ast) return code;
  const icons = lucideImports(ast);
  const splices: Splice[] = [];
  walk(ast, [], (n) => {
    if (n.type === "JSXElement" && isEditable(n, icons)) {
      splices.push([n.openingElement.name.end!, n.openingElement.name.end!, ` data-gid="${n.start}"`]);
    }
  });
  return applySplices(code, splices);
}

function find(code: string, gid: number): Found | null {
  const ast = parseSource(code);
  if (!ast) return null;
  let found: Found | null = null;
  walk(ast, [], (n, ancestors) => {
    if (found) return false;
    if (n.type === "JSXElement" && n.start === gid) found = { node: n, ancestors };
    // Only descend into nodes that contain the offset.
    return n.start! <= gid && gid < n.end!;
  });
  return found;
}

const isJsxParent = (n: B.Node | undefined): n is B.JSXElement | B.JSXFragment =>
  n?.type === "JSXElement" || n?.type === "JSXFragment";

const isFunction = (n: B.Node): n is B.Function =>
  n.type === "FunctionDeclaration" || n.type === "FunctionExpression" || n.type === "ArrowFunctionExpression";

/** The string literal a name is bound to: a prop default (`{ title = "Pro" }`) or a const, innermost scope first. */
function stringBinding(name: string, scopes: B.Node[]): B.StringLiteral | null {
  for (const scope of [...scopes].reverse()) {
    if (isFunction(scope)) {
      for (const param of scope.params) {
        const pattern = param.type === "AssignmentPattern" ? param.left : param;
        if (pattern.type !== "ObjectPattern") continue;
        for (const p of pattern.properties) {
          const v = p.type === "ObjectProperty" ? p.value : null;
          if (v?.type === "AssignmentPattern" && v.left.type === "Identifier" && v.left.name === name) {
            return v.right.type === "StringLiteral" ? v.right : null;
          }
        }
      }
    }
    const body = isFunction(scope) ? (scope.body.type === "BlockStatement" ? scope.body.body : []) : scope.type === "Program" ? scope.body : [];
    for (const stmt of body) {
      const decl = stmt.type === "ExportNamedDeclaration" ? stmt.declaration : stmt;
      if (decl?.type !== "VariableDeclaration") continue;
      for (const d of decl.declarations) {
        if (d.id.type === "Identifier" && d.id.name === name) return d.init?.type === "StringLiteral" ? d.init : null;
      }
    }
  }
  return null;
}

/** Where an element's text lives in the source: its one text child, a string literal, or the prop default it renders. */
function textTarget({ node, ancestors }: Found): B.JSXText | B.StringLiteral | null {
  const targets = node.children.flatMap((c): (B.JSXText | B.StringLiteral)[] => {
    if (c.type === "JSXText") return c.value.trim() ? [c] : [];
    if (c.type !== "JSXExpressionContainer") return [];
    if (c.expression.type === "StringLiteral") return [c.expression];
    const bound = c.expression.type === "Identifier" ? stringBinding(c.expression.name, ancestors) : null;
    return bound ? [bound] : [];
  });
  return targets.length === 1 ? targets[0] : null;
}

function styleAttr(el: B.JSXElement): B.JSXAttribute | undefined {
  return el.openingElement.attributes.find(
    (a): a is B.JSXAttribute => a.type === "JSXAttribute" && a.name.type === "JSXIdentifier" && a.name.name === "style",
  );
}

function styleObject(attr: B.JSXAttribute | undefined): B.ObjectExpression | null {
  if (attr?.value?.type !== "JSXExpressionContainer") return null;
  return attr.value.expression.type === "ObjectExpression" ? attr.value.expression : null;
}

function propKey(p: B.ObjectProperty): string | null {
  if (p.computed) return null;
  if (p.key.type === "Identifier") return p.key.name;
  return p.key.type === "StringLiteral" ? p.key.value : null;
}

function bindsName(fn: B.Function, name: string): boolean {
  let bound = false;
  const visitPattern = (n: B.Node) =>
    walk(n, [], (m) => {
      if (m.type === "Identifier" && m.name === name) bound = true;
      // Default values and computed keys are expressions, not bindings.
      if (m.type === "AssignmentPattern") {
        visitPattern(m.left);
        return false;
      }
      if (m.type === "ObjectProperty") {
        visitPattern(m.value);
        return false;
      }
    });
  fn.params.forEach(visitPattern);
  if (fn.body.type === "BlockStatement") {
    for (const stmt of fn.body.body) {
      if (stmt.type === "VariableDeclaration") stmt.declarations.forEach((d) => visitPattern(d.id));
    }
  }
  return bound;
}

/** Children that render something and can be reordered: elements, fragments and {expressions}. */
function siblings(found: Found): B.Node[] {
  const parent = found.ancestors.at(-1);
  if (!isJsxParent(parent)) return [];
  return parent.children.filter(
    (c) =>
      c.type === "JSXElement" ||
      c.type === "JSXFragment" ||
      (c.type === "JSXExpressionContainer" && c.expression.type !== "JSXEmptyExpression"),
  );
}

export function elementInfo(code: string, gid: number): ElementInfo | null {
  const found = find(code, gid);
  if (!found) return null;
  const { node, ancestors } = found;
  const target = textTarget(found);
  const text = !target ? null : target.type === "JSXText" ? target.value.replace(/\s+/g, " ").trim() : target.value;

  const attr = styleAttr(node);
  const obj = styleObject(attr);
  const style: Record<string, StyleValue> | null = attr && !obj ? null : {};
  for (const p of obj?.properties ?? []) {
    if (p.type !== "ObjectProperty" || !style) continue;
    const key = propKey(p);
    if (!key) continue;
    const v = p.value;
    style[key] =
      v.type === "StringLiteral" || v.type === "NumericLiteral"
        ? { kind: "literal", value: v.value }
        : { kind: "expr", source: code.slice(v.start!, v.end!) };
  }

  const sibs = siblings(found);
  const i = sibs.indexOf(node);
  const fns = ancestors.filter(isFunction);

  return {
    tag: code.slice(node.openingElement.name.start!, node.openingElement.name.end!).replace(/^(motion|m)\./, ""),
    line: node.loc!.start.line,
    snippet: code.slice(node.start!, node.end!),
    text,
    style,
    canDelete: ancestors.some(isJsxParent),
    canDuplicate: isJsxParent(ancestors.at(-1)),
    canMove: { before: i > 0, after: i >= 0 && i < sibs.length - 1 },
    tokenVar: fns.some((fn) => bindsName(fn, "t")) ? "t" : "tokens",
  };
}

function encodeText(text: string): string {
  const clean = text.replace(/\s*\n\s*/g, " ");
  return /[{}<>]|^\s|\s$|^$/.test(clean) ? `{${JSON.stringify(clean)}}` : clean;
}

export function setText(code: string, gid: number, text: string): string | null {
  const found = find(code, gid);
  const c = found ? textTarget(found) : null;
  if (!c) return null;
  if (c.type === "StringLiteral") return applySplices(code, [[c.start!, c.end!, JSON.stringify(text)]]);
  const raw = code.slice(c.start!, c.end!);
  const lead = raw.match(/^\s*/)![0];
  const trail = raw.match(/\s*$/)![0];
  return applySplices(code, [[c.start!, c.end!, lead + encodeText(text) + trail]]);
}

function serializeValue(v: string | number | { expr: string }): string {
  if (typeof v === "number") return String(Math.round(v * 100) / 100);
  return typeof v === "string" ? JSON.stringify(v) : v.expr;
}

const keySource = (k: string) => (IDENT.test(k) ? k : JSON.stringify(k));

/** Sets (or, with null, removes) inline style properties on an element. */
export function setStyle(code: string, gid: number, patch: StylePatch): string | null {
  const found = find(code, gid);
  if (!found) return null;
  const { node } = found;
  const attr = styleAttr(node);
  const obj = styleObject(attr);

  const entries: string[] = [];
  const pending = new Map(Object.entries(patch));
  if (obj) {
    for (const p of obj.properties) {
      const key = p.type === "ObjectProperty" ? propKey(p) : null;
      if (p.type !== "ObjectProperty" || key === null || !pending.has(key)) {
        entries.push(code.slice(p.start!, p.end!));
        continue;
      }
      const v = pending.get(key)!;
      pending.delete(key);
      if (v !== null) entries.push(`${code.slice(p.key.start!, p.key.end!)}: ${serializeValue(v)}`);
    }
  } else if (attr?.value?.type === "JSXExpressionContainer" && attr.value.expression.type !== "JSXEmptyExpression") {
    entries.push("..." + code.slice(attr.value.expression.start!, attr.value.expression.end!));
  }
  for (const [k, v] of pending) if (v !== null) entries.push(`${keySource(k)}: ${serializeValue(v)}`);

  let body: string;
  if (obj && code.slice(obj.start!, obj.end!).includes("\n") && entries.length) {
    const lineStart = code.lastIndexOf("\n", obj.properties[0]?.start ?? obj.start!) + 1;
    const indent = code.slice(lineStart).match(/^\s*/)![0];
    const closeIndent = indent.slice(0, Math.max(0, indent.length - 2));
    body = `{\n${entries.map((e) => indent + e).join(",\n")},\n${closeIndent}}`;
  } else {
    body = entries.length ? `{ ${entries.join(", ")} }` : "";
  }

  if (attr) {
    return applySplices(code, [[attr.start!, attr.end!, body ? `style={${body}}` : ""]]);
  }
  if (!body) return code;
  const open = node.openingElement;
  const at = open.attributes.at(-1)?.end ?? open.typeArguments?.end ?? open.typeParameters?.end ?? open.name.end!;
  return applySplices(code, [[at, at, ` style={${body}}`]]);
}

/** [start of line, end of line] when the range sits alone on its own line(s). */
function ownLine(code: string, start: number, end: number): [number, number] | null {
  const lineStart = code.lastIndexOf("\n", start - 1) + 1;
  const nl = code.indexOf("\n", end);
  const lineEnd = nl === -1 ? code.length : nl;
  if (code.slice(lineStart, start).trim() || code.slice(end, lineEnd).trim()) return null;
  return [lineStart, lineEnd];
}

export function deleteElement(code: string, gid: number): string | null {
  const found = find(code, gid);
  if (!found || !found.ancestors.some(isJsxParent)) return null;
  const { node, ancestors } = found;
  if (!isJsxParent(ancestors.at(-1))) return applySplices(code, [[node.start!, node.end!, "null"]]);
  const line = ownLine(code, node.start!, node.end!);
  return line
    ? applySplices(code, [[line[0], Math.min(line[1] + 1, code.length), ""]])
    : applySplices(code, [[node.start!, node.end!, ""]]);
}

export function duplicateElement(code: string, gid: number): { code: string; gid: number } | null {
  const found = find(code, gid);
  if (!found || !isJsxParent(found.ancestors.at(-1))) return null;
  const { node } = found;
  const src = code.slice(node.start!, node.end!);
  const line = ownLine(code, node.start!, node.end!);
  if (!line) return { code: applySplices(code, [[node.end!, node.end!, src]]), gid: node.end! };
  const indent = code.slice(line[0], node.start!);
  return { code: applySplices(code, [[line[1], line[1], "\n" + indent + src]]), gid: line[1] + 1 + indent.length };
}

/** Swaps an element with its previous or next element sibling. */
export function moveElement(code: string, gid: number, dir: "before" | "after"): { code: string; gid: number } | null {
  const found = find(code, gid);
  if (!found) return null;
  const sibs = siblings(found);
  const i = sibs.indexOf(found.node);
  const j = dir === "before" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= sibs.length) return null;
  const [a, b] = i < j ? [sibs[i], sibs[j]] : [sibs[j], sibs[i]];
  const aSrc = code.slice(a.start!, a.end!);
  const bSrc = code.slice(b.start!, b.end!);
  const next = applySplices(code, [
    [a.start!, a.end!, bSrc],
    [b.start!, b.end!, aSrc],
  ]);
  const newGid = dir === "before" ? a.start! : a.start! + bSrc.length + (b.start! - a.end!);
  return { code: next, gid: newGid };
}
