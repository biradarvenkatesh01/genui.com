import { transform } from "sucrase";
import { instrument } from "@/lib/editor/jsx-source";

export type CompileResult = { ok: true; js: string } | { ok: false; error: string };

/**
 * TSX → browser-ready ES module. Bare imports are resolved by the preview's import map.
 * Editable elements get a data-gid attribute so canvas clicks map back to the source.
 */
export function compileComponent(source: string): CompileResult {
  try {
    const { code } = transform(instrument(source), {
      transforms: ["typescript", "jsx"],
      jsxRuntime: "automatic",
      production: true,
    });
    return { ok: true, js: code };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
