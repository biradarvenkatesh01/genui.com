/** The element selected on the canvas when a refinement is sent. */
export type SelectedElement = { tag: string; line: number; snippet: string };

export type GenerateRequest = {
  prompt: string;
  category?: string;
  /** Current component source, for refinements. */
  previousCode?: string;
  /** Earlier prompts that led to the current version, oldest first. */
  history?: string[];
  /** Edits the user made by hand on the canvas since the last generation. */
  manualEdits?: string[];
  /** The element the change request is aimed at. */
  selection?: SelectedElement;
};

export type GenerateEvent =
  | { type: "delta"; text: string }
  | { type: "done"; demo?: boolean }
  | { type: "error"; message: string };
