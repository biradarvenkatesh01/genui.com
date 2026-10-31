# GenUI

Describe a UI component — by typing or speaking — and get production-ready
**React + Tailwind CSS + Motion** code, rendered live, tweakable without code,
and ready to copy.

## Getting started

```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY, or leave empty for demo mode
npm run dev
```

Open http://localhost:3000 for the landing page and http://localhost:3000/studio for the Studio.

Without an API key the app runs in **demo mode**: the full flow works, but
generations return bundled sample components.

## How it works

| Piece | Where |
| --- | --- |
| Generation endpoint (streams NDJSON from Gemini) | `src/app/api/generate/route.ts` |
| Component contract / system prompt | `src/lib/generation/system-prompt.ts` |
| Client generation state, versions, refinements | `src/lib/generation/use-generation.ts` |
| In-browser TSX compile (sucrase) | `src/lib/preview/compile.ts` |
| Sandboxed preview runtime (iframe, import map) | `src/lib/preview/runtime.ts` |
| Token editing + write-back to source | `src/lib/preview/tokens.ts`, `src/components/studio/tweak-panel.tsx` |
| Studio UI | `src/components/studio/` |
| Landing page | `src/components/marketing/` |

Every generated component exports a `tokens` object (colors, radius, motion)
and accepts `tokens` as a prop. The Tweak panel edits those tokens live inside
the preview, and the copied code has the new values written back in.

Generated code runs in an `<iframe sandbox="allow-scripts">` with an opaque
origin, so it can't access the app's cookies, storage or DOM.

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the phased plan.
