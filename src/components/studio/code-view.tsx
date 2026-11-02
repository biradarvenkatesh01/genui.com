"use client";

import { useMemo } from "react";

const KEYWORDS = new Set(
  "import export default from const let var function return if else for while of in new typeof as type interface extends async await true false null undefined".split(
    " ",
  ),
);

const TOKEN_RE =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|(<\/?[A-Za-z][\w.]*|\/?>)|(\b[A-Za-z_$][\w$]*\b)/g;

function highlight(code: string) {
  const out: { text: string; cls?: string }[] = [];
  let last = 0;
  for (const m of code.matchAll(TOKEN_RE)) {
    if (m.index > last) out.push({ text: code.slice(last, m.index) });
    const [text, comment, str, num, tag, word] = m;
    let cls: string | undefined;
    if (comment) cls = "text-[var(--syn-comment)] italic";
    else if (str) cls = "text-[var(--syn-string)]";
    else if (num) cls = "text-[var(--syn-number)]";
    else if (tag) cls = "text-[var(--syn-tag)]";
    else if (word && KEYWORDS.has(word)) cls = "text-[var(--syn-keyword)]";
    else if (word && /^[A-Z]/.test(word)) cls = "text-[var(--syn-type)]";
    out.push({ text, cls });
    last = m.index + text.length;
  }
  if (last < code.length) out.push({ text: code.slice(last) });
  return out;
}

export function CodeView({ code }: { code: string }) {
  const parts = useMemo(() => highlight(code), [code]);
  const lines = code.split("\n").length;

  return (
    <div className="flex size-full overflow-auto font-mono text-[12.5px] leading-[1.7]">
      <div
        aria-hidden
        className="sticky left-0 shrink-0 select-none bg-bg-elevated/95 py-5 pr-4 pl-5 text-right text-fg-subtle/60"
      >
        {Array.from({ length: lines }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <pre className="min-w-0 flex-1 py-5 pr-6 text-fg/90">
        <code>
          {parts.map((p, i) =>
            p.cls ? (
              <span key={i} className={p.cls}>
                {p.text}
              </span>
            ) : (
              p.text
            ),
          )}
        </code>
      </pre>
    </div>
  );
}
