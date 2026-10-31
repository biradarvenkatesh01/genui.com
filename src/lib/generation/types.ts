export type GenerateRequest = {
  prompt: string;
  category?: string;
  /** Current component source, for refinements. */
  previousCode?: string;
};

export type GenerateEvent =
  | { type: "delta"; text: string }
  | { type: "done"; demo?: boolean }
  | { type: "error"; message: string };
