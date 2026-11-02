# GenUI — Product Roadmap

> Describe a component — by typing or speaking — and get production-ready React +
> Tailwind + Motion code, live-previewed and tweakable without touching code.

## The problem

Finding the right UI component means hopping between shadcn, Vengeance UI,
Aceternity, Dribbble, and a dozen other libraries, then adapting what you find
to your project. GenUI collapses that into one loop: **describe → preview →
tweak → copy**.

## Architecture at a glance

```
┌──────────────┐  prompt + category   ┌───────────────────┐
│  Studio UI   │ ───────────────────▶ │ /api/generate     │──▶ Groq / Gemini (streaming)
│  (Next.js)   │ ◀─── streamed code ─ │ (Route Handler)   │
└──────┬───────┘                      └───────────────────┘
       │ compile (sucrase, in browser)
       ▼
┌──────────────────────────────┐   postMessage: tokens, errors
│ Sandboxed <iframe> preview   │ ◀────────────────────────────▶ Tweak panel
│ React 19 · Tailwind 4 ·      │
│ Motion · lucide-react        │
└──────────────────────────────┘
```

**The component contract** (what every generated component looks like) is the
key design decision. Each component exports a `tokens` object (colors, radius,
motion timings) and the default export accepts `tokens` as a prop. This lets
the Tweak panel change colors and motion *instantly* — no regeneration, no AI
cost — and the exported code is rewritten with the user's final values.

## Phases

### Phase 1 — Core generation loop ✅ (this PR)
- [x] Next.js 16 app, dark Apple-inspired design system
- [x] Landing page: hero, live prompt box, category strip, feature section
- [x] Studio: prompt composer, category picker, voice input (Web Speech API)
- [x] Streaming generation via Groq or Gemini (`/api/generate`)
- [x] Follow-up refinements ("make it pink", "add a hover tilt")
- [x] Sandboxed live preview with desktop/tablet/mobile + light/dark canvas
- [x] Code view with copy & download
- [x] Tweak panel v1: colors, radius, motion timing via design tokens
- [x] Demo mode — works without an API key using bundled samples

### Phase 2 — Visual editor ("Figma-style")
- Click any element in the preview to select it (outline + breadcrumb)
- Inspector for the selected element: spacing, typography, color, radius, shadow
- Motion editor: easing curve editor, spring presets, timeline scrubber, replay
- Undo/redo history, version list per component
- Variants: generate 3 alternatives side-by-side, pick one

### Phase 3 — Accounts & library
- Auth (email + GitHub/Google), Postgres (Neon/Supabase) + Drizzle
- Save components to a personal library, collections, tags
- Shareable public links + embeddable previews
- Export targets: React/TSX, Next.js, plain HTML, Vue (stretch), copy as `npx` command
- Project "design system" presets (brand colors/fonts applied to every generation)

### Phase 4 — Monetization & launch
- Stripe subscriptions: Free (N generations/day), Pro, Team
- Usage metering, rate limiting (Upstash), abuse protection
- Model tiering per plan, prompt caching, cost dashboards
- SEO landing pages, public gallery of community components, changelog

### Phase 5 — Ecosystem
- VS Code / Cursor extension, CLI (`npx genui add <id>`)
- Figma import/export, screenshot-to-component
- Team workspaces, comments, shared libraries

## Running locally

```bash
npm install
cp .env.example .env.local   # add GROQ_API_KEY or GEMINI_API_KEY (optional — demo mode without it)
npm run dev
```
