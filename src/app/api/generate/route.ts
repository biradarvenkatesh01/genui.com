import { buildUserMessage } from "@/lib/generation/system-prompt";
import { describeError, pickProvider, type Outcome } from "@/lib/generation/providers";
import { pickSample } from "@/lib/generation/samples";
import type { GenerateEvent, GenerateRequest } from "@/lib/generation/types";

const MAX_PROMPT_CHARS = 4000;
const MAX_CODE_CHARS = 60000;

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

  const provider = pickProvider();
  const stream = provider
    ? liveStream(provider(buildUserMessage({ prompt, category, previousCode }), request.signal), request.signal)
    : demoStream(prompt, category, request.signal);

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-GenUI-Mode": provider ? "live" : "demo",
    },
  });
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
