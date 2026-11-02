export type ParsedReply = {
  /** The chat reply: text before the code block (and any stray text after it). */
  message: string;
  /** Component source so far. */
  code: string;
  /** A code block has started. */
  hasCode: boolean;
  /** The code block is closed. */
  complete: boolean;
};

/** Splits a (possibly still streaming) model reply into its chat message and its component code. */
export function parseReply(raw: string): ParsedReply {
  const fence = raw.indexOf("```");
  if (fence === -1) {
    // Hide a fence that is still arriving one backtick at a time.
    return { message: raw.replace(/`{1,2}$/, "").trim(), code: "", hasCode: false, complete: false };
  }
  const message = raw.slice(0, fence).trim();
  const newline = raw.indexOf("\n", fence);
  if (newline === -1) return { message, code: "", hasCode: true, complete: false };

  const start = newline + 1;
  const end = raw.indexOf("```", start);
  if (end === -1) return { message, code: raw.slice(start), hasCode: true, complete: false };
  const after = raw.slice(end + 3).trim();
  return {
    message: [message, after].filter(Boolean).join("\n\n"),
    code: raw.slice(start, end).trimEnd() + "\n",
    hasCode: true,
    complete: true,
  };
}

export function extractName(code: string): string {
  return code.match(/\/\/\s*@name\s+(.+)/)?.[1]?.trim() || "Untitled component";
}
