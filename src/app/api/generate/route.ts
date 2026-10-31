import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, buildUserMessage } from "@/lib/generation/system-prompt";
import { pickSample } from "@/lib/generation/samples";
import type { GenerateEvent, GenerateRequest } from "@/lib/generation/types";

const MODEL = "claude-opus-5-5";
const MAX_PROMPT_CHARS = 4000;
const MAX_CODE_CHARS = 60000;

const encoder = new TextEncoder();
const line = (e: GenerateEvent) => encoder.encode(JSON.stringify(e) + "\n");

function hasCredentials() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

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

  const stream = hasCredentials()
    ? liveStream(prompt, category, previousCode, request.signal)
    : demoStream(prompt, category, request.signal);

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-GenUI-Mode": hasCredentials() ? "live" : "demo",
    },
  });
}

function liveStream(
  prompt: string,
  category: string,
  previousCode: string | undefined,
  signal: AbortSignal,
): ReadableStream<Uint8Array> {
  const client = new Anthropic();

  return new ReadableStream({
    async start(controller) {
      try {
        const stream = client.beta.messages.stream(
          {
            model: MODEL,
            max_tokens: 32000,
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            thinking: { type: "adaptive" },
            output_config: { effort: "medium" },
            system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
            messages: [
              { role: "user", content: buildUserMessage({ prompt, category, previousCode }) },
            ],
          },
          { signal },
        );

        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(line({ type: "delta", text: event.delta.text }));
          }
        }

        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(
            line({ type: "error", message: "That request couldn't be completed. Try rephrasing it." }),
          );
        } else if (final.stop_reason === "max_tokens") {
          controller.enqueue(
            line({ type: "error", message: "The component was too long and got cut off. Try a simpler request." }),
          );
        } else {
          controller.enqueue(line({ type: "done" }));
        }
      } catch (err) {
        if (!signal.aborted) controller.enqueue(line({ type: "error", message: describeError(err) }));
      } finally {
        controller.close();
      }
    },
  });
}

function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "The server's Anthropic API key is invalid.";
  if (err instanceof Anthropic.RateLimitError) return "We're getting a lot of requests — try again in a moment.";
  if (err instanceof Anthropic.APIConnectionError) return "Couldn't reach the model. Check your connection and retry.";
  if (err instanceof Anthropic.APIError) return `Generation failed (${err.status ?? "unknown"}).`;
  console.error(err);
  return "Something went wrong while generating.";
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
