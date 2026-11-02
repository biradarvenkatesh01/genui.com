/** The element selected on the canvas when a message is sent. */
export type SelectedElement = {
  tag: string;
  line: number;
  snippet: string;
  /** Tags of the selected element's ancestors, outermost first, e.g. ["div", "ul", "li"]. */
  path?: string[];
};

/** One earlier turn of the conversation, as plain text (code is never resent here). */
export type ConversationTurn = { role: "user" | "assistant"; text: string };

/** The component currently on the canvas, exactly as the user sees it. */
export type CanvasContext = {
  /** Source with token tweaks and canvas edits applied. */
  code: string;
  name: string;
  /** e.g. "v2 of 3" — the user may be viewing an earlier version. */
  version: string;
  /** Edits the user made by hand on the canvas since this version was generated. */
  manualEdits?: string[];
  /** The element the message is aimed at. */
  selection?: SelectedElement;
};

export type GenerateRequest = {
  prompt: string;
  category?: string;
  /** The preview canvas background the component is designed for. */
  theme?: "light" | "dark";
  /** Earlier turns, oldest first. */
  conversation?: ConversationTurn[];
  /** Absent when nothing is on the canvas yet. */
  canvas?: CanvasContext;
};

export type GenerateEvent =
  | { type: "delta"; text: string }
  | { type: "done"; demo?: boolean }
  | { type: "error"; message: string };
