"use client";

import { useMemo, useRef, useState } from "react";
import type { Version } from "@/lib/generation/use-generation";
import type { Selection } from "@/components/studio/preview-frame";
import {
  deleteElement,
  duplicateElement,
  elementInfo,
  moveElement,
  remapOffset,
  setStyle,
  setText,
  type StylePatch,
} from "./jsx-source";
import { makeMotion, motionInfo, setMotionProp, type MotionLiteral, type MotionProp } from "./motion-source";

/** A source before a canvas edit, and what the edit did (fed to the model as context). */
type Entry = { code: string; note: string };
type History = { past: Entry[]; future: Entry[] };

const EMPTY: History = { past: [], future: [] };
const MAX_HISTORY = 100;
const STYLE_COMMIT_DELAY = 250;
// Edits sharing a key within this window (one slider drag) are a single undo step.
const COALESCE_WINDOW = 1200;

function describeStyle(tag: string, patch: StylePatch): string {
  if ("translate" in patch) return patch.translate === null ? `Reset the position of <${tag}>` : `Moved <${tag}> to offset ${patch.translate}`;
  if ("width" in patch || "height" in patch) {
    const size = [patch.width ?? "auto", patch.height ?? "auto"].map((v) => (typeof v === "number" ? v + "px" : String(v)));
    return `Resized <${tag}> to ${size.join(" × ")}`;
  }
  return Object.entries(patch)
    .map(([k, v]) => (v === null ? `Removed ${k} from <${tag}>` : `Set ${k} of <${tag}> to ${typeof v === "object" ? v.expr : v}`))
    .join("; ");
}

/**
 * Direct-manipulation editing of the active version: every canvas change is a source
 * edit with an undo history, kept per version.
 */
export function useCanvasEditor(active: Version | null, updateCode: (code: string) => void) {
  const [historyById, setHistoryById] = useState<Record<string, History>>({});
  const [selected, setSelected] = useState<{ versionId: string; gid: number } | null>(null);
  const [report, setReport] = useState<Selection | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Edits can land faster than renders (key repeat, debounced commits): always build on the latest source.
  const latest = useRef({ id: "", code: "" });
  const pendingStyle = useRef<{ gid: number; patch: StylePatch; timer: ReturnType<typeof setTimeout> } | null>(null);

  const id = active?.id ?? "";
  const history = historyById[id] ?? EMPTY;

  const gid = selected && selected.versionId === id ? selected.gid : null;
  const info = useMemo(() => (active && gid !== null ? elementInfo(active.code, gid) : null), [active, gid]);
  const motion = useMemo(() => (active && gid !== null ? motionInfo(active.code, gid) : null), [active, gid]);
  const lastEdit = useRef<{ key: string; at: number; id: string } | null>(null);
  const selectedGid = info ? gid : null;

  function base(): string {
    if (latest.current.id !== id) latest.current = { id, code: active?.code ?? "" };
    return latest.current.code;
  }

  function flash(message: string) {
    clearTimeout(noticeTimer.current);
    setNotice(message);
    noticeTimer.current = setTimeout(() => setNotice(null), 3500);
  }

  function select(next: number | null) {
    flushStyle();
    setSelected(next === null ? null : { versionId: id, gid: next });
  }

  /** Swaps in new source, keeping the selection on the same element even if the edit shifted it. */
  function setCode(next: string) {
    const prev = base();
    latest.current = { id, code: next };
    setSelected((s) => {
      if (!s || s.versionId !== id) return s;
      const gid = remapOffset(prev, next, s.gid);
      return gid === null ? null : { versionId: id, gid };
    });
    updateCode(next);
  }

  function commit(next: string | null, note: string, key?: string): boolean {
    const prev = base();
    if (next === null || !id) return false;
    if (next === prev) return true;
    const now = Date.now();
    const last = lastEdit.current;
    lastEdit.current = key ? { key, at: now, id } : null;
    if (key && last && last.key === key && last.id === id && now - last.at < COALESCE_WINDOW) {
      // Same gesture: the undo entry from its first change already holds the code before it.
      setHistoryById((m) => {
        const h = m[id] ?? EMPTY;
        if (!h.past.length) return m;
        const past = [...h.past];
        past[past.length - 1] = { ...past[past.length - 1], note };
        return { ...m, [id]: { past, future: [] } };
      });
      setCode(next);
      return true;
    }
    setHistoryById((m) => {
      const h = m[id] ?? EMPTY;
      return { ...m, [id]: { past: [...h.past, { code: prev, note }].slice(-MAX_HISTORY), future: [] } };
    });
    setCode(next);
    return true;
  }

  function flushStyle() {
    const p = pendingStyle.current;
    if (!p) return;
    clearTimeout(p.timer);
    pendingStyle.current = null;
    const tag = elementInfo(base(), p.gid)?.tag ?? "element";
    commit(setStyle(base(), p.gid, p.patch), describeStyle(tag, p.patch));
  }

  /** Sets inline styles on an element. With `debounce`, rapid changes (sliders) collapse into one edit. */
  function applyStyle(target: number, patch: StylePatch, debounce = false) {
    if (!debounce) {
      flushStyle();
      const tag = elementInfo(base(), target)?.tag ?? "element";
      commit(setStyle(base(), target, patch), describeStyle(tag, patch));
      return;
    }
    const p = pendingStyle.current;
    if (p && p.gid !== target) flushStyle();
    const merged = { ...(pendingStyle.current?.patch ?? {}), ...patch };
    if (pendingStyle.current) clearTimeout(pendingStyle.current.timer);
    pendingStyle.current = { gid: target, patch: merged, timer: setTimeout(flushStyle, STYLE_COMMIT_DELAY) };
  }

  /** Returns false when the text can't be edited directly (it comes from data or code). */
  function applyText(target: number, text: string): boolean {
    flushStyle();
    const tag = elementInfo(base(), target)?.tag ?? "element";
    const ok = commit(setText(base(), target, text), `Changed the text of <${tag}> to "${text}"`);
    if (!ok) flash("That text comes from data in the code — ask the AI to change it.");
    return ok;
  }

  function remove() {
    if (selectedGid === null || !info) return;
    flushStyle();
    if (commit(deleteElement(base(), selectedGid), `Deleted <${info.tag}>`)) setSelected(null);
  }

  function duplicate() {
    if (selectedGid === null || !info) return;
    flushStyle();
    const result = duplicateElement(base(), selectedGid);
    if (result && commit(result.code, `Duplicated <${info.tag}>`)) select(result.gid);
  }

  function move(dir: "before" | "after") {
    if (selectedGid === null || !info) return;
    flushStyle();
    const result = moveElement(base(), selectedGid, dir);
    if (result && commit(result.code, `Moved <${info.tag}> ${dir === "before" ? "earlier" : "later"} among its siblings`)) {
      select(result.gid);
    }
  }

  /** Sets (or removes, with null) one Motion prop on the selected element. */
  function applyMotion(prop: MotionProp, value: MotionLiteral | null, note: string, key?: string) {
    if (selectedGid === null) return;
    flushStyle();
    commit(setMotionProp(base(), selectedGid, prop, value), note, key);
  }

  /** Turns the selected element into a motion element so it can be animated. */
  function makeAnimatable() {
    if (selectedGid === null || !info) return;
    flushStyle();
    const result = makeMotion(base(), selectedGid);
    if (result && commit(result.code, `Made <${info.tag}> animatable`)) select(result.gid);
  }

  function travel(dir: "undo" | "redo") {
    lastEdit.current = null;
    flushStyle();
    const h = historyById[id] ?? EMPTY;
    const from = dir === "undo" ? h.past : h.future;
    const entry = from.at(-1);
    if (!entry) return;
    const current = { code: base(), note: entry.note };
    const rest = from.slice(0, -1);
    setHistoryById((m) => ({
      ...m,
      [id]: dir === "undo" ? { past: rest, future: [...h.future, current] } : { past: [...h.past, current], future: rest },
    }));
    setCode(entry.code);
  }

  return {
    info,
    motion,
    selectedGid,
    computed: report && report.gid === selectedGid ? report : null,
    notice,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    /** Canvas edits since this version was generated, oldest first. */
    manualEdits: history.past.map((e) => e.note),
    select,
    onCanvasSelect: (s: Selection | null) => {
      setReport(s);
      if ((s?.gid ?? null) !== selectedGid) select(s?.gid ?? null);
    },
    applyStyle,
    applyText,
    remove,
    duplicate,
    move,
    applyMotion,
    makeAnimatable,
    undo: () => travel("undo"),
    redo: () => travel("redo"),
  };
}
