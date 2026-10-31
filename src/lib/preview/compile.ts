import { transform } from "sucrase";

export type CompileResult = { ok: true; js: string } | { ok: false; error: string };

/** TSX → browser-ready ES module. Bare imports are resolved by the preview's import map. */
export function compileComponent(source: string): CompileResult {
  try {
    const { code } = transform(source, {
      transforms: ["typescript", "jsx"],
      jsxRuntime: "automatic",
      production: true,
    });
    return { ok: true, js: code };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
