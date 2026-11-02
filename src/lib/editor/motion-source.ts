import type * as B from "@babel/types";
import { applySplices, find, parseSource, type Splice } from "./jsx-source";

// Reading and writing an element's Motion props (initial, animate, whileHover, …,
// transition) in the component source, so animations are edited like any other design property.

/** A JS literal as it appears in the source. Anything else (tokens, variables, calls) is kept as `{ $expr }`. */
export type MotionLiteral = number | string | boolean | MotionLiteral[] | MotionObject | MotionExpr;
export type MotionObject = { [key: string]: MotionLiteral };
export type MotionExpr = { $expr: string };

export const MOTION_STATES = [
  { prop: "initial", label: "From", hint: "Where the entrance starts" },
  { prop: "animate", label: "To", hint: "Where the entrance ends" },
  { prop: "whileHover", label: "Hover", hint: "While the pointer is over it" },
  { prop: "whileTap", label: "Press", hint: "While it is pressed" },
  { prop: "whileInView", label: "In view", hint: "When it scrolls into view" },
] as const;

export type MotionStateProp = (typeof MOTION_STATES)[number]["prop"];
export type MotionProp = MotionStateProp | "transition";

export type MotionInfo = {
  /** Already a motion.* element. */
  isMotion: boolean;
  /** A plain DOM element that can be turned into a motion element. */
  canAnimate: boolean;
  /** Each prop the element sets: an object literal, or another value (a variant name, a variable…). */
  props: Partial<Record<MotionProp, MotionObject | MotionExpr | boolean | string>>;
};

export const isExpr = (v: unknown): v is MotionExpr =>
  typeof v === "object" && v !== null && !Array.isArray(v) && "$expr" in v;

export const isObject = (v: unknown): v is MotionObject =>
  typeof v === "object" && v !== null && !Array.isArray(v) && !("$expr" in v);

function keyName(p: B.ObjectProperty): string | null {
  if (p.computed) return null;
  if (p.key.type === "Identifier") return p.key.name;
  if (p.key.type === "StringLiteral") return p.key.value;
  return p.key.type === "NumericLiteral" ? String(p.key.value) : null;
}

function toLiteral(node: B.Node, code: string): MotionLiteral {
  const expr = { $expr: code.slice(node.start!, node.end!) };
  switch (node.type) {
    case "NumericLiteral":
    case "StringLiteral":
    case "BooleanLiteral":
      return node.value;
    case "UnaryExpression":
      return node.operator === "-" && node.argument.type === "NumericLiteral" ? -node.argument.value : expr;
    case "TemplateLiteral":
      return node.expressions.length ? expr : node.quasis.map((q) => q.value.cooked ?? "").join("");
    case "Identifier":
      return node.name === "Infinity" ? Infinity : expr;
    case "ArrayExpression":
      return node.elements.every((e) => e && e.type !== "SpreadElement")
        ? node.elements.map((e) => toLiteral(e as B.Node, code))
        : expr;
    case "ObjectExpression": {
      const out: MotionObject = {};
      for (const p of node.properties) {
        const k = p.type === "ObjectProperty" ? keyName(p) : null;
        if (p.type !== "ObjectProperty" || k === null) return expr;
        out[k] = toLiteral(p.value, code);
      }
      return out;
    }
    default:
      return expr;
  }
}

const IDENT = /^[A-Za-z_$][\w$]*$/;

/** Literal → source text, on one line. */
export function toSource(v: MotionLiteral): string {
  if (typeof v === "number") return v === Infinity ? "Infinity" : String(Math.round(v * 1000) / 1000);
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return `[${v.map(toSource).join(", ")}]`;
  if (isExpr(v)) return v.$expr;
  const entries = Object.entries(v).map(([k, x]) => `${IDENT.test(k) ? k : JSON.stringify(k)}: ${toSource(x)}`);
  return entries.length ? `{ ${entries.join(", ")} }` : "{}";
}

function attribute(el: B.JSXElement, name: string): B.JSXAttribute | undefined {
  return el.openingElement.attributes.find(
    (a): a is B.JSXAttribute => a.type === "JSXAttribute" && a.name.type === "JSXIdentifier" && a.name.name === name,
  );
}

function motionName(el: B.JSXElement): boolean {
  const n = el.openingElement.name;
  return n.type === "JSXMemberExpression" && n.object.type === "JSXIdentifier" && /^(motion|m)$/.test(n.object.name);
}

export function motionInfo(code: string, gid: number): MotionInfo | null {
  const found = find(code, gid);
  if (!found) return null;
  const el = found.node;
  const isMotion = motionName(el);
  const name = el.openingElement.name;
  const props: MotionInfo["props"] = {};
  for (const prop of [...MOTION_STATES.map((s) => s.prop), "transition"] as MotionProp[]) {
    const attr = attribute(el, prop);
    if (!attr) continue;
    if (!attr.value) props[prop] = true;
    else if (attr.value.type === "StringLiteral") props[prop] = attr.value.value;
    else if (attr.value.type === "JSXExpressionContainer" && attr.value.expression.type !== "JSXEmptyExpression") {
      const v = toLiteral(attr.value.expression, code);
      props[prop] = isObject(v) || isExpr(v) || typeof v === "boolean" || typeof v === "string" ? v : { $expr: toSource(v) };
    }
  }
  return {
    isMotion,
    canAnimate: !isMotion && name.type === "JSXIdentifier" && /^[a-z]/.test(name.name),
    props,
  };
}

/** Sets (or, with null, removes) one Motion prop on a motion element. */
export function setMotionProp(code: string, gid: number, prop: MotionProp, value: MotionLiteral | null): string | null {
  const found = find(code, gid);
  if (!found || !motionName(found.node)) return null;
  const el = found.node;
  const attr = attribute(el, prop);
  const empty = value === null || (isObject(value) && Object.keys(value).length === 0);
  const text = empty ? "" : `${prop}={${toSource(value)}}`;

  if (attr) {
    // Remove the attribute together with the whitespace before it.
    const start = empty ? code.slice(0, attr.start!).search(/\s*$/) : attr.start!;
    return applySplices(code, [[start, attr.end!, text]]);
  }
  if (empty) return code;
  const open = el.openingElement;
  const at = open.attributes.at(-1)?.end ?? open.typeArguments?.end ?? open.typeParameters?.end ?? open.name.end!;
  return applySplices(code, [[at, at, " " + text]]);
}

/** Turns a plain DOM element into its motion.* twin, importing `motion` if needed. */
export function makeMotion(code: string, gid: number): { code: string; gid: number } | null {
  const found = find(code, gid);
  const ast = parseSource(code);
  if (!found || !ast) return null;
  const el = found.node;
  const name = el.openingElement.name;
  if (name.type !== "JSXIdentifier" || !/^[a-z]/.test(name.name)) return null;

  // Use the module's existing `motion` binding if there is one.
  let local: string | null = null;
  let lastImportEnd = 0;
  for (const stmt of ast.program.body) {
    if (stmt.type !== "ImportDeclaration") continue;
    lastImportEnd = stmt.end!;
    if (stmt.source.value !== "motion/react" && stmt.source.value !== "framer-motion") continue;
    for (const s of stmt.specifiers) {
      if (s.type === "ImportSpecifier" && s.imported.type === "Identifier" && s.imported.name === "motion") local = s.local.name;
    }
  }

  const tag = `${local ?? "motion"}.${name.name}`;
  const splices: Splice[] = [[name.start!, name.end!, tag]];
  const closing = el.closingElement?.name;
  if (closing) splices.push([closing.start!, closing.end!, tag]);
  let shift = 0;
  if (!local) {
    const line = `import { motion } from "motion/react";`;
    const insert = lastImportEnd ? "\n" + line : line + "\n";
    splices.push([lastImportEnd, lastImportEnd, insert]);
    if (lastImportEnd <= el.start!) shift = insert.length;
  }
  return { code: applySplices(code, splices), gid: el.start! + shift };
}
