# GenUI

Prompt-to-UI-component platform: users describe (type or speak) a component and
get React + Tailwind v4 + Motion code, live-previewed and tweakable without code.
Roadmap and phases: `docs/ROADMAP.md`. Update its checkboxes when a phase item ships.

@AGENTS.md

## Commands

- `npm run dev` — dev server (http://localhost:3000, Studio at `/studio`)
- `npm run lint` — ESLint (includes React Compiler rules; must pass)
- `npm run build` — production build + typecheck; run before every push
- No test suite yet. Verify UI changes in a browser (Playwright is available in cloud sessions).

Without `GROQ_API_KEY` or `GEMINI_API_KEY` the app runs in demo mode (`/api/generate` streams bundled
samples from `src/lib/generation/samples.ts`). That is enough to test the full UI flow.

## Architecture

- `src/app/api/generate/route.ts` — streams NDJSON events (`delta` / `done` / `error`) from the model.
  Providers live in `src/lib/generation/providers.ts`: Groq if `GROQ_API_KEY` is set, else Gemini, else demo.
- `src/lib/generation/system-prompt.ts` — **the component contract**. Generated components
  export a `tokens` object (`colors` hex strings, `radius` px, `motion` numbers) and a default
  export taking `{ tokens }`. The preview runtime, Tweak panel and token write-back
  (`src/lib/preview/tokens.ts`) all depend on it — change them together.
- `src/lib/preview/` — sucrase compiles TSX in the browser; `runtime.ts` is the sandboxed
  iframe document (import map → esm.sh). Host ↔ iframe talk only via `postMessage`.
  Keep the iframe `sandbox="allow-scripts"` with no `allow-same-origin`.
- `src/lib/editor/` — canvas editing: `jsx-source.ts` maps canvas elements (`data-gid`) back to
  source and applies edits; `use-canvas-editor.ts` holds per-version undo history.
- `src/components/studio/` — Studio UI. `src/components/marketing/` — landing page.

## Conventions

- Next.js 16 with Cache Components; read `node_modules/next/dist/docs/` before using
  unfamiliar Next APIs. Client pages using `useSearchParams` need a `<Suspense>` boundary.
- Claude API / model choice: don't swap providers or models without asking.
- Animations use `motion/react`; prefer springs for interaction and `[0.22, 1, 0.36, 1]`-style
  eases for entrances. Respect `prefers-reduced-motion`.

## Design system — "Paper & Ink"

The app's own UI (not generated components) follows one system, defined in `src/app/globals.css`.
Avoid the generic AI-product look: no purple/blue/pink gradients, gradient text, glow blobs,
glassmorphism or sparkle icons.

- **Palette:** warm paper/ink neutrals plus one signal accent (vermilion `#E5501E` light /
  `#FF6A3D` dark). The accent marks only the primary action, selection and focus.
- **Tokens:** `bg`, `bg-elevated`, `bg-sunken`, `line`, `line-strong`, `fg`, `fg-muted`, `fg-subtle`,
  `hover`, `active`, `accent`, `accent-fg`, `accent-soft`, `danger`, `danger-soft`, `success`,
  shadows `shadow-sm|md|lg`. Never hard-code hex colors or `white/x` overlays in app UI — both
  themes must work.
- **Themes:** light default, dark via `data-theme="dark"` on `<html>`, set before paint by
  `THEME_SCRIPT` in `src/components/theme-toggle.tsx`. Use `useTheme()` to read it.
- **Type:** Geist for UI; `font-serif` (Instrument Serif) *italic* only for a headline's accent phrase;
  `eyebrow` (mono, uppercase, 11px) for section labels; tight negative tracking on big headlines.
- **Texture:** global film grain (`body::after`), `dot-grid` on canvases, `rule-ticks` hairline rulers.
- **Motion:** quiet and physical — springs for interaction, `ease-out-expo` entrances, no looping
  decoration except where it demonstrates the product.

## Working across local and cloud sessions

This repo is worked on from two places: Claude Code on the owner's laptop and Claude Code
on the web/phone (cloud). Git is the only thing they share.

- Start of a session: `git fetch origin && git status`, and pull/rebase the branch you're on.
- Work on a feature branch, never directly on `main`. `main` auto-deploys to production on Vercel;
  every other branch gets a Vercel preview URL.
- Commit and push before ending a session — cloud containers are discarded, so unpushed work is lost.
- Don't commit secrets. `.env.local`, `CLAUDE.local.md` and `.claude/settings.local.json` are gitignored
  for machine-specific setup.
