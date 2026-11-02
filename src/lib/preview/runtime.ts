// HTML document loaded into the sandboxed preview iframe. It receives compiled
// component modules over postMessage and renders them with React.

const VERSIONS = {
  react: "19.3.0",
  motion: "14.9.0",
  lucide: "1.66.0",
  tailwind: "4.3.3",
};

const importMap = {
  imports: {
    react: `https://esm.sh/react@${VERSIONS.react}`,
    "react/": `https://esm.sh/react@${VERSIONS.react}/`,
    "react-dom": `https://esm.sh/react-dom@${VERSIONS.react}?external=react`,
    "react-dom/client": `https://esm.sh/react-dom@${VERSIONS.react}/client?external=react`,
    "motion/react": `https://esm.sh/motion@${VERSIONS.motion}/react?external=react,react-dom`,
    "framer-motion": `https://esm.sh/framer-motion@${VERSIONS.motion}?external=react,react-dom`,
    "lucide-react": `https://esm.sh/lucide-react@${VERSIONS.lucide}?external=react`,
  },
};

const script = String.raw`
import React from "react";
import { createRoot } from "react-dom/client";

const root = createRoot(document.getElementById("root"));
let mod = null;
let overrides = null;
let currentUrl = null;
let replays = 0;

const post = (msg) => parent.postMessage({ source: "genui-preview", ...msg }, "*");

class Boundary extends React.Component {
  constructor(p) { super(p); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { post({ type: "error", message: String(error && error.message || error) }); }
  render() { return this.state.error ? null : this.props.children; }
}

function merge(base, extra) {
  if (!extra) return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const k in extra) {
    out[k] = extra[k] && typeof extra[k] === "object" && base && typeof base[k] === "object"
      ? merge(base[k], extra[k]) : extra[k];
  }
  return out;
}

function draw() {
  if (!mod || typeof mod.default !== "function") return;
  const Component = mod.default;
  const tokens = mod.tokens ? merge(mod.tokens, overrides) : undefined;
  root.render(React.createElement(Boundary, { key: currentUrl + ":" + replays },
    React.createElement(Component, tokens ? { tokens } : {})));
}

async function load(js) {
  const url = URL.createObjectURL(new Blob([js], { type: "text/javascript" }));
  try {
    const next = await import(url);
    if (typeof next.default !== "function") throw new Error("The component has no default export.");
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = url;
    mod = next;
    draw();
    needsReport = Boolean(selectedGid);
    post({ type: "rendered", tokens: next.tokens ?? null });
  } catch (err) {
    URL.revokeObjectURL(url);
    post({ type: "error", message: String(err && err.message || err) });
  }
}

addEventListener("message", (e) => {
  const msg = e.data;
  if (!msg || msg.source !== "genui-host") return;
  if (msg.type === "render") { overrides = msg.tokens ?? null; load(msg.js); }
  if (msg.type === "tokens") { overrides = msg.tokens; draw(); }
  if (msg.type === "replay") { replays++; draw(); }
  if (msg.type === "theme") document.documentElement.dataset.canvas = msg.canvas;
  if (msg.type === "mode") setEditing(msg.edit);
  if (msg.type === "select") {
    tagChip.textContent = msg.label || "";
    if (msg.gid !== selectedGid) {
      selectedGid = msg.gid;
      selectedIndex = 0;
      selectedEl = null;
    }
    needsReport = Boolean(msg.gid);
  }
  if (msg.type === "preview-style") instancesOf(msg.gid).forEach((el) => Object.assign(el.style, msg.style));
});

// ---- Canvas editing ----
// In edit mode the component is a design, not an app: pointer and key events are
// captured before React sees them, animations jump to their end state, and the
// user selects, drags, resizes and retypes elements. Every change is reported to
// the host, which writes it into the source and re-renders.

let editing = false;
let selectedGid = null;
let selectedIndex = 0;
let selectedEl = null;
let needsReport = false;
let hoverEl = null;
let gesture = null;
let textEdit = null;

const overlay = document.createElement("div");
overlay.id = "genui-overlay";
document.body.appendChild(overlay);
function box(cls) {
  const b = document.createElement("div");
  b.className = "gx-box " + cls;
  overlay.appendChild(b);
  return b;
}
const hoverBox = box("gx-hover");
const selectBox = box("gx-select");
const tagChip = document.createElement("span");
tagChip.className = "gx-chip";
selectBox.appendChild(tagChip);
for (const dir of ["e", "s", "se"]) {
  const h = document.createElement("div");
  h.className = "gx-handle gx-" + dir;
  h.dataset.handle = dir;
  selectBox.appendChild(h);
}
const instanceBoxes = [];

const gidOf = (el) => (el && el.closest ? el.closest("#root [data-gid]") : null);
const instancesOf = (gid) => (gid ? Array.from(document.querySelectorAll("#root [data-gid=\"" + gid + "\"]")) : []);
const tagOf = (el) => el.tagName.toLowerCase();

function parseTranslate(v) {
  const [x = "0", y = "0"] = !v || v === "none" ? [] : v.split(" ");
  return [parseFloat(x) || 0, parseFloat(y) || 0];
}

function place(b, el) {
  const r = el.getBoundingClientRect();
  b.style.display = "block";
  b.style.left = r.left + "px";
  b.style.top = r.top + "px";
  b.style.width = r.width + "px";
  b.style.height = r.height + "px";
}

function frame() {
  requestAnimationFrame(frame);
  if (!editing) return;
  // Re-renders replace the DOM; find the selected element again by its id.
  if (selectedGid && !(selectedEl && selectedEl.isConnected)) {
    const all = instancesOf(selectedGid);
    selectedEl = all[selectedIndex] || all[0] || null;
  }
  const others = selectedEl ? instancesOf(selectedGid).filter((el) => el !== selectedEl) : [];
  if (selectedEl) {
    place(selectBox, selectedEl);
    if (needsReport) {
      needsReport = false;
      report();
    }
  } else {
    selectBox.style.display = "none";
  }
  while (instanceBoxes.length < others.length) instanceBoxes.push(box("gx-instance"));
  instanceBoxes.forEach((b, i) => (others[i] ? place(b, others[i]) : (b.style.display = "none")));
  if (hoverEl && hoverEl.isConnected && hoverEl !== selectedEl && !gesture && !textEdit) place(hoverBox, hoverEl);
  else hoverBox.style.display = "none";
}
requestAnimationFrame(frame);

function report() {
  const el = selectedEl;
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const ancestors = [];
  for (let p = el.parentElement; p && p.id !== "root"; p = p.parentElement) {
    const gid = p.dataset && p.dataset.gid;
    if (gid && gid !== selectedGid && !ancestors.some((a) => a.gid === gid)) ancestors.unshift({ gid, tag: tagOf(p) });
  }
  post({
    type: "select",
    gid: selectedGid,
    ancestors,
    instances: instancesOf(selectedGid).length,
    computed: {
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      fontSize: parseFloat(cs.fontSize) || 0,
      fontWeight: Number(cs.fontWeight) || 400,
      textAlign: cs.textAlign,
      borderRadius: parseFloat(cs.borderTopLeftRadius) || 0,
      padding: parseFloat(cs.paddingTop) || 0,
      opacity: Number(cs.opacity),
      width: Math.round(r.width),
      height: Math.round(r.height),
      translate: parseTranslate(cs.translate),
    },
  });
}

function select(el) {
  if (!el) {
    if (selectedGid) post({ type: "select", gid: null });
    selectedGid = null;
    selectedEl = null;
    return;
  }
  selectedGid = el.dataset.gid;
  selectedIndex = Math.max(0, instancesOf(selectedGid).indexOf(el));
  selectedEl = el;
  needsReport = false;
  report();
}

function setEditing(on) {
  if (on === editing) return;
  editing = on;
  document.documentElement.classList.toggle("gx-editing", on);
  if (!on) {
    if (textEdit) finishText(true);
    gesture = null;
    hoverEl = null;
  }
  import("motion/react")
    .then((m) => {
      m.MotionGlobalConfig.skipAnimations = on;
      replays++;
      draw();
    })
    .catch(() => {});
}

function finishText(commit) {
  const { el, original } = textEdit;
  textEdit = null;
  const text = el.textContent;
  el.removeAttribute("contenteditable");
  getSelection().removeAllRanges();
  if (commit && text !== original) {
    post({ type: "edit", op: "text", gid: el.dataset.gid, text });
    return;
  }
  if (el.childNodes.length === 1 && el.firstChild.nodeType === 3) el.firstChild.data = original;
  else el.textContent = original;
}

function inText(e) {
  return textEdit && textEdit.el.contains(e.target);
}

const BLOCKED = ["click", "pointerover", "pointerout", "mouseover", "mouseout", "mousedown", "mouseup", "contextmenu", "submit", "focusin", "keyup", "keypress"];
for (const type of BLOCKED) {
  addEventListener(type, (e) => {
    if (!editing) return;
    e.stopPropagation();
    if (!inText(e) && e.cancelable) e.preventDefault();
  }, true);
}

addEventListener("pointerdown", (e) => {
  if (!editing) return;
  e.stopPropagation();
  if (inText(e)) return;
  e.preventDefault();
  if (textEdit) finishText(true);
  const handle = e.target.dataset && e.target.dataset.handle;
  if (handle && selectedEl) {
    const r = selectedEl.getBoundingClientRect();
    gesture = { kind: "resize", dir: handle, x: e.clientX, y: e.clientY, w: r.width, h: r.height, moved: false };
    return;
  }
  const el = gidOf(e.target);
  select(el);
  if (el) {
    const [tx, ty] = parseTranslate(getComputedStyle(el).translate);
    gesture = { kind: "move", x: e.clientX, y: e.clientY, tx, ty, moved: false };
  }
}, true);

addEventListener("pointermove", (e) => {
  if (!editing) return;
  e.stopPropagation();
  if (!gesture) {
    hoverEl = gidOf(e.target);
    return;
  }
  const dx = e.clientX - gesture.x;
  const dy = e.clientY - gesture.y;
  if (!gesture.moved && Math.hypot(dx, dy) < 3) return;
  gesture.moved = true;
  const els = instancesOf(selectedGid);
  if (gesture.kind === "move") {
    const v = Math.round(gesture.tx + dx) + "px " + Math.round(gesture.ty + dy) + "px";
    els.forEach((el) => (el.style.translate = v));
    gesture.style = { translate: v };
  } else {
    const style = {};
    if (gesture.dir !== "s") style.width = Math.max(4, Math.round(gesture.w + dx));
    if (gesture.dir !== "e") style.height = Math.max(4, Math.round(gesture.h + dy));
    els.forEach((el) => {
      for (const k in style) el.style[k] = style[k] + "px";
    });
    gesture.style = style;
  }
}, true);

addEventListener("pointerup", (e) => {
  if (!editing) return;
  e.stopPropagation();
  const g = gesture;
  gesture = null;
  if (g && g.moved) post({ type: "edit", op: "style", gid: selectedGid, style: g.style });
}, true);

addEventListener("dblclick", (e) => {
  if (!editing) return;
  e.stopPropagation();
  if (inText(e)) return;
  e.preventDefault();
  const el = gidOf(e.target);
  if (!el) return;
  const nodes = Array.from(el.childNodes);
  if (!nodes.length || !nodes.every((n) => n.nodeType === 3) || !el.textContent.trim()) {
    // Text mixed with icons or other elements: the host edits it in its panel.
    post({ type: "text-request", gid: el.dataset.gid });
    return;
  }
  textEdit = { el, original: el.textContent };
  el.contentEditable = "plaintext-only";
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  getSelection().removeAllRanges();
  getSelection().addRange(range);
}, true);

addEventListener("focusout", (e) => {
  if (textEdit && e.target === textEdit.el) finishText(true);
}, true);

addEventListener("keydown", (e) => {
  if (!editing) return;
  e.stopPropagation();
  if (textEdit) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      finishText(true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      finishText(false);
    }
    return;
  }
  const mod = e.metaKey || e.ctrlKey;
  if (e.key === "Escape") {
    select(null);
    return;
  }
  if (e.key.startsWith("Arrow") && selectedEl) {
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1;
    const [tx, ty] = parseTranslate(getComputedStyle(selectedEl).translate);
    const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
    const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
    const v = tx + dx + "px " + (ty + dy) + "px";
    instancesOf(selectedGid).forEach((el) => (el.style.translate = v));
    post({ type: "edit", op: "style", gid: selectedGid, style: { translate: v } });
    return;
  }
  if (e.key === "Delete" || e.key === "Backspace" || (mod && /^[zyd]$/i.test(e.key))) {
    e.preventDefault();
    post({ type: "key", key: e.key.toLowerCase(), mod, shift: e.shiftKey });
  }
}, true);

addEventListener("error", (e) => post({ type: "error", message: e.message }));
addEventListener("unhandledrejection", (e) => post({ type: "error", message: String(e.reason && e.reason.message || e.reason) }));

post({ type: "ready" });
`;

export const PREVIEW_HTML = `<!doctype html>
<html data-canvas="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<script type="importmap">${JSON.stringify(importMap)}</script>
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@${VERSIONS.tailwind}"></script>
<style>
  html, body { margin: 0; min-height: 100%; }
  body {
    min-height: 100vh; display: grid; place-items: center; padding: 32px; box-sizing: border-box;
    font-family: "Inter", ui-sans-serif, system-ui, -apple-system, "SF Pro Text", sans-serif;
    -webkit-font-smoothing: antialiased; transition: background .3s ease;
  }
  html[data-canvas="dark"] body { background: #050506; color: #f5f5f7; }
  html[data-canvas="light"] body { background: #f5f5f7; color: #1d1d1f; }
  #root { width: 100%; display: flex; justify-content: center; }
  #genui-overlay { position: fixed; inset: 0; pointer-events: none; z-index: 2147483647; display: none; }
  html.gx-editing #genui-overlay { display: block; }
  html.gx-editing #root, html.gx-editing #root * { cursor: default !important; user-select: none; }
  html.gx-editing #root [contenteditable] { cursor: text !important; user-select: text; outline: none; }
  .gx-box { position: absolute; display: none; box-sizing: border-box; }
  .gx-hover { border: 1px solid #8b7cff; }
  .gx-instance { border: 1px dashed rgba(139, 124, 255, 0.7); }
  .gx-select { border: 1.5px solid #8b7cff; box-shadow: 0 0 0 3px rgba(139, 124, 255, 0.18); }
  .gx-chip {
    position: absolute; left: -1.5px; bottom: 100%; margin-bottom: 4px; padding: 2px 6px; border-radius: 4px;
    background: #8b7cff; color: #fff; font: 500 10px/1.4 ui-sans-serif, system-ui, sans-serif; white-space: nowrap;
  }
  .gx-chip:empty { display: none; }
  .gx-handle {
    position: absolute; width: 9px; height: 9px; box-sizing: border-box; pointer-events: auto;
    background: #fff; border: 1.5px solid #8b7cff; border-radius: 2px;
  }
  .gx-e { right: -5px; top: 50%; margin-top: -4.5px; cursor: ew-resize; }
  .gx-s { bottom: -5px; left: 50%; margin-left: -4.5px; cursor: ns-resize; }
  .gx-se { right: -5px; bottom: -5px; cursor: nwse-resize; }
</style>
</head>
<body>
<div id="root"></div>
<script type="module">${script}</script>
</body>
</html>`;
