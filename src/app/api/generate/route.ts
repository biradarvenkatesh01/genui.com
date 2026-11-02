import { buildUserMessage } from "@/lib/generation/system-prompt";
import { describeError, pickProvider, type Outcome } from "@/lib/generation/providers";
import { pickSample } from "@/lib/generation/samples";
import type { GenerateEvent, GenerateRequest, SelectedElement } from "@/lib/generation/types";

const MAX_PROMPT_CHARS = 4000;
const MAX_CODE_CHARS = 60000;
const MAX_SNIPPET_CHARS = 2000;

const encoder = new TextEncoder();
const line = (e: GenerateEvent) => encoder.encode(JSON.stringify(e) + "\n");

const OUTCOME_ERRORS: Partial<Record<Outcome, string>> = {
  blocked: "That request couldn't be completed. Try rephrasing it.",
  truncated: "The component was too long and got cut off. Try a simpler request.",
};

export async function POST(request: Request) {
  let body: GenerateRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = String(body.prompt ?? "").trim().slice(0, MAX_PROMPT_CHARS);
  const category = String(body.category ?? "auto");
  const previousCode = body.previousCode?.slice(0, MAX_CODE_CHARS);
  if (!prompt) return Response.json({ error: "Prompt is required" }, { status: 400 });

  // Context only matters for refinements; keep it small, the model's token budget is tight.
  const context = previousCode
    ? {
        history: strings(body.history, 6, 300),
        manualEdits: strings(body.manualEdits, 20, 200),
        selection: selection(body.selection),
      }
    : {};

  const provider = pickProvider();
  const stream = provider
    ? liveStream(provider(buildUserMessage({ prompt, category, previousCode, ...context }), request.signal), request.signal)
    : demoStream(prompt, category, request.signal);

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-GenUI-Mode": provider ? "live" : "demo",
    },
  });
}

/** The last `max` non-empty strings of an untrusted array, each capped at `chars`. */
function strings(value: unknown, max: number, chars: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim() !== "")
    .slice(-max)
    .map((v) => v.trim().slice(0, chars));
}

function selection(value: unknown): SelectedElement | undefined {
  if (!value || typeof value !== "object") return undefined;
  const { tag, line, snippet } = value as Record<string, unknown>;
  if (typeof tag !== "string" || typeof snippet !== "string" || !snippet.trim()) return undefined;
  return { tag: tag.slice(0, 60), line: Number(line) || 0, snippet: snippet.slice(0, MAX_SNIPPET_CHARS) };
}

function liveStream(run: AsyncGenerator<string, Outcome>, signal: AbortSignal): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      try {
        let step = await run.next();
        while (!step.done) {
          controller.enqueue(line({ type: "delta", text: step.value }));
          step = await run.next();
        }
        const message = OUTCOME_ERRORS[step.value];
        controller.enqueue(line(message ? { type: "error", message } : { type: "done" }));
      } catch (err) {
        if (!signal.aborted) controller.enqueue(line({ type: "error", message: describeError(err) }));
      } finally {
        controller.close();
      }
    },
  });
}

// Streams a bundled component in small chunks so the full UI flow works
// without an API key.
function demoStream(prompt: string, category: string, signal: AbortSignal): ReadableStream<Uint8Array> {
  const code = "```tsx\n" + pickSample(category, prompt) + "```";
  return new ReadableStream({
    async start(controller) {
      for (let i = 0; i < code.length && !signal.aborted; i += 48) {
        controller.enqueue(line({ type: "delta", text: code.slice(i, i + 48) }));
        await new Promise((r) => setTimeout(r, 12));
      }
      controller.enqueue(line({ type: "done", demo: true }));
      controller.close();
    },
  });
}
