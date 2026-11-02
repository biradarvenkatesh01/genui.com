import { buildUserMessage } from "@/lib/generation/system-prompt";
import { describeError, pickProvider, type Outcome } from "@/lib/generation/providers";
import { demoReply } from "@/lib/generation/samples";
import type { CanvasContext, ConversationTurn, GenerateEvent, GenerateRequest, SelectedElement } from "@/lib/generation/types";

const MAX_PROMPT_CHARS = 4000;
const MAX_CODE_CHARS = 60000;
const MAX_SNIPPET_CHARS = 2000;
// The free-tier token budget is tight: keep the conversation short, the current code complete.
const MAX_TURNS = 10;
const MAX_TURN_CHARS = 600;

const encoder = new TextEncoder();
const line = (e: GenerateEvent) => encoder.encode(JSON.stringify(e) + "\n");

const OUTCOME_ERRORS: Partial<Record<Outcome, string>> = {
  blocked: "That request couldn't be completed. Try rephrasing it.",
  truncated: "The reply was too long and got cut off. Try a simpler request.",
};

export async function POST(request: Request) {
  let body: GenerateRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = String(body.prompt ?? "").trim().slice(0, MAX_PROMPT_CHARS);
  if (!prompt) return Response.json({ error: "Prompt is required" }, { status: 400 });
  const category = String(body.category ?? "auto");
  const theme = body.theme === "light" ? "light" : "dark";
  const canvas = canvasContext(body.canvas);

  const turns: ConversationTurn[] = [
    ...conversation(body.conversation),
    { role: "user", text: buildUserMessage({ prompt, category, theme, canvas }) },
  ];

  const provider = pickProvider();
  const stream = provider ? liveStream(provider(turns, request.signal), request.signal) : demoStream(category, prompt, theme, Boolean(canvas), request.signal);

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-GenUI-Mode": provider ? "live" : "demo",
    },
  });
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** The last turns of an untrusted conversation, each capped. */
function conversation(value: unknown): ConversationTurn[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((t): ConversationTurn[] => {
      if (!t || typeof t !== "object") return [];
      const { role, text } = t as Record<string, unknown>;
      const clean = str(text, MAX_TURN_CHARS);
      return (role === "user" || role === "assistant") && clean ? [{ role, text: clean }] : [];
    })
    .slice(-MAX_TURNS);
}

function strings(value: unknown, max: number, chars: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => str(v, chars))
    .filter(Boolean)
    .slice(-max);
}

function selection(value: unknown): SelectedElement | undefined {
  if (!value || typeof value !== "object") return undefined;
  const { tag, line, snippet, path } = value as Record<string, unknown>;
  if (typeof tag !== "string" || typeof snippet !== "string" || !snippet.trim()) return undefined;
  return {
    tag: tag.slice(0, 60),
    line: Number(line) || 0,
    snippet: snippet.slice(0, MAX_SNIPPET_CHARS),
    path: strings(path, 12, 40),
  };
}

function canvasContext(value: unknown): CanvasContext | undefined {
  if (!value || typeof value !== "object") return undefined;
  const v = value as Record<string, unknown>;
  const code = typeof v.code === "string" ? v.code.slice(0, MAX_CODE_CHARS) : "";
  if (!code.trim()) return undefined;
  return {
    code,
    name: str(v.name, 80) || "Untitled component",
    version: str(v.version, 40) || "latest version",
    manualEdits: strings(v.manualEdits, 20, 200),
    selection: selection(v.selection),
  };
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

// Streams a bundled reply in small chunks so the full UI flow works without an API key.
function demoStream(category: string, prompt: string, theme: "light" | "dark", refining: boolean, signal: AbortSignal): ReadableStream<Uint8Array> {
  const text = demoReply(category, prompt, theme, refining);
  return new ReadableStream({
    async start(controller) {
      for (let i = 0; i < text.length && !signal.aborted; i += 48) {
        controller.enqueue(line({ type: "delta", text: text.slice(i, i + 48) }));
        await new Promise((r) => setTimeout(r, 12));
      }
      controller.enqueue(line({ type: "done", demo: true }));
      controller.close();
    },
  });
}
