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

Without `ANTHROPIC_API_KEY` the app runs in demo mode (`/api/generate` streams bundled
samples from `src/lib/generation/samples.ts`). That is enough to test the full UI flow.

## Architecture

- `src/app/api/generate/route.ts` — streams NDJSON events (`delta` / `done` / `error`) from Claude.
- `src/lib/generation/system-prompt.ts` — **the component contract**. Generated components
  export a `tokens` object (`colors` hex strings, `radius` px, `motion` numbers) and a default
  export taking `{ tokens }`. The preview runtime, Tweak panel and token write-back
  (`src/lib/preview/tokens.ts`) all depend on it — change them together.
- `src/lib/preview/` — sucrase compiles TSX in the browser; `runtime.ts` is the sandboxed
  iframe document (import map → esm.sh). Host ↔ iframe talk only via `postMessage`.
  Keep the iframe `sandbox="allow-scripts"` with no `allow-same-origin`.
- `src/components/studio/` — Studio UI. `src/components/marketing/` — landing page.

## Conventions

- Next.js 16 with Cache Components; read `node_modules/next/dist/docs/` before using
  unfamiliar Next APIs. Client pages using `useSearchParams` need a `<Suspense>` boundary.
- Design language: dark, Apple-like, restrained. Use the theme tokens in `src/app/globals.css`
  (`bg`, `bg-elevated`, `line`, `fg`, `fg-muted`, `fg-subtle`, `accent*`) and the `glass`,
  `text-gradient`, `text-aurora` utilities rather than ad-hoc colors.
- Animations use `motion/react`; prefer springs for interaction and `[0.22, 1, 0.36, 1]`-style
  eases for entrances. Respect `prefers-reduced-motion`.
- Claude API: model `claude-opus-5-5`, streaming, adaptive thinking. Don't swap models
  without asking.

## Working across local and cloud sessions

This repo is worked on from two places: Claude Code on the owner's laptop and Claude Code
on the web/phone (cloud). Git is the only thing they share.

- Start of a session: `git fetch origin && git status`, and pull/rebase the branch you're on.
- Work on a feature branch, never directly on `main`. `main` auto-deploys to production on Vercel;
  every other branch gets a Vercel preview URL.
- Commit and push before ending a session — cloud containers are discarded, so unpushed work is lost.
- Don't commit secrets. `.env.local`, `CLAUDE.local.md` and `.claude/settings.local.json` are gitignored
  for machine-specific setup.
