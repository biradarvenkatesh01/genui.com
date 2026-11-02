import { ApiError, FinishReason, GoogleGenAI, ThinkingLevel } from "@google/genai";
import Groq from "groq-sdk";
import { SYSTEM_PROMPT } from "./system-prompt";
import type { ConversationTurn } from "./types";

const MAX_OUTPUT_TOKENS = 16000;
// Groq reserves max_completion_tokens against the per-minute token limit up front,
// so a large cap gets requests rejected on the free tier. Components fit well within this.
const GROQ_MAX_OUTPUT_TOKENS = 4500;

/** How a model run ended, once all of its text has been yielded. */
export type Outcome = "done" | "truncated" | "blocked";

/** Streams the reply text for a conversation (oldest turn first, ending with the user), then returns how it ended. */
type Provider = (turns: ConversationTurn[], signal: AbortSignal) => AsyncGenerator<string, Outcome>;

/** Models expect alternating turns that start with the user: drop leading replies, merge neighbours. */
export function normalizeTurns(turns: ConversationTurn[]): ConversationTurn[] {
  const out: ConversationTurn[] = [];
  for (const t of turns) {
    if (!out.length && t.role !== "user") continue;
    const last = out.at(-1);
    if (last && last.role === t.role) last.text += "\n\n" + t.text;
    else out.push({ ...t });
  }
  return out;
}

/** Groq is preferred when both keys are set: it starts streaming far sooner. */
export function pickProvider(): Provider | null {
  if (process.env.GROQ_API_KEY) return groq;
  if (process.env.GEMINI_API_KEY) return gemini;
  return null;
}

async function* groq(turns: ConversationTurn[], signal: AbortSignal): AsyncGenerator<string, Outcome> {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const stream = await client.chat.completions.create(
    {
      model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      max_completion_tokens: GROQ_MAX_OUTPUT_TOKENS,
      reasoning_effort: "medium",
      include_reasoning: false,
      stream: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...normalizeTurns(turns).map((t) => ({ role: t.role, content: t.text })),
      ],
    },
    { signal },
  );

  let finish: string | null = null;
  for await (const chunk of stream) {
    const choice = chunk.choices[0];
    if (choice?.delta.content) yield choice.delta.content;
    if (choice?.finish_reason) finish = choice.finish_reason;
  }
  return finish === "length" ? "truncated" : "done";
}

async function* gemini(turns: ConversationTurn[], signal: AbortSignal): AsyncGenerator<string, Outcome> {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const stream = await client.models.generateContentStream({
    model: process.env.GEMINI_MODEL || "gemini-flash-latest",
    contents: normalizeTurns(turns).map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.text }] })),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      abortSignal: signal,
    },
  });

  let finish: FinishReason | undefined;
  let blocked = false;
  for await (const chunk of stream) {
    if (chunk.promptFeedback?.blockReason) blocked = true;
    const candidate = chunk.candidates?.[0];
    if (candidate?.finishReason) finish = candidate.finishReason;
    for (const part of candidate?.content?.parts ?? []) {
      if (part.text && !part.thought) yield part.text;
    }
  }
  if (finish === FinishReason.MAX_TOKENS) return "truncated";
  if (blocked || (finish && finish !== FinishReason.STOP)) return "blocked";
  return "done";
}

export function describeError(err: unknown): string {
  if (err instanceof Groq.APIError || err instanceof ApiError) {
    const status = err.status;
    const badKey = status === 401 || status === 403 || (status === 400 && /api key/i.test(err.message));
    if (badKey) return "The server's API key is invalid.";
    if (status === 429) return "We're getting a lot of requests — try again in a moment.";
    if (status === undefined) return "Couldn't reach the model. Check your connection and retry.";
    return `Generation failed (${status}).`;
  }
  if (err instanceof TypeError) return "Couldn't reach the model. Check your connection and retry.";
  console.error(err);
  return "Something went wrong while generating.";
}
