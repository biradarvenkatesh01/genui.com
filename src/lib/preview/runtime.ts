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
});

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
</style>
</head>
<body>
<div id="root"></div>
<script type="module">${script}</script>
</body>
</html>`;
