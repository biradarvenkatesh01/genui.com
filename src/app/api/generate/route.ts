import { ApiError, FinishReason, GoogleGenAI, ThinkingLevel } from "@google/genai";
import { SYSTEM_PROMPT, buildUserMessage } from "@/lib/generation/system-prompt";
import { pickSample } from "@/lib/generation/samples";
import type { GenerateEvent, GenerateRequest } from "@/lib/generation/types";

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const MAX_PROMPT_CHARS = 4000;
const MAX_CODE_CHARS = 60000;

const encoder = new TextEncoder();
const line = (e: GenerateEvent) => encoder.encode(JSON.stringify(e) + "\n");

function hasCredentials() {
  return Boolean(process.env.GEMINI_API_KEY);
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
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  return new ReadableStream({
    async start(controller) {
      try {
        const stream = await client.models.generateContentStream({
          model: MODEL,
          contents: buildUserMessage({ prompt, category, previousCode }),
          config: {
            systemInstruction: SYSTEM_PROMPT,
            maxOutputTokens: 32000,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            abortSignal: signal,
          },
        });

        let finishReason: FinishReason | undefined;
        let blocked = false;
        for await (const chunk of stream) {
          if (chunk.promptFeedback?.blockReason) blocked = true;
          const candidate = chunk.candidates?.[0];
          if (candidate?.finishReason) finishReason = candidate.finishReason;
          for (const part of candidate?.content?.parts ?? []) {
            if (part.text && !part.thought) controller.enqueue(line({ type: "delta", text: part.text }));
          }
        }

        if (blocked || (finishReason && finishReason !== FinishReason.STOP && finishReason !== FinishReason.MAX_TOKENS)) {
          controller.enqueue(
            line({ type: "error", message: "That request couldn't be completed. Try rephrasing it." }),
          );
        } else if (finishReason === FinishReason.MAX_TOKENS) {
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
  if (err instanceof ApiError) {
    const badKey = err.status === 401 || err.status === 403 || (err.status === 400 && /api key/i.test(err.message));
    if (badKey) return "The server's Gemini API key is invalid.";
    if (err.status === 429) return "We're getting a lot of requests — try again in a moment.";
    return `Generation failed (${err.status}).`;
  }
  if (err instanceof TypeError) return "Couldn't reach the model. Check your connection and retry.";
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
