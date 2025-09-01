export type SourceChunk = { text: string };

export type EmitUnit = "token" | "word" | "grapheme";

export type FenceMarker = "```" | "~~~";

export type Event =
  | { type: "text"; text: string; in?: Context }
  | {
      type: "tag-open";
      name: string;
      attrs: Record<string, string>;
      in?: Context;
    }
  | { type: "tag-close"; name: string; in?: Context }
  | {
      type: "code-fence-start";
      fence: FenceMarker;
      lang?: string;
      in?: Context;
    }
  | { type: "code-fence-chunk"; text: string; in?: Context }
  | { type: "code-fence-end"; in?: Context }
  | { type: "flush" }
  | { type: "error"; reason: string; recoverable: boolean };

export type Context = {
  inTag?: { name: string; attrs: Record<string, string> } | null;
  inCodeFence?: { fence: FenceMarker; lang?: string } | null;
};

export interface ParserOptions {
  emitUnit?: EmitUnit; // default "token"
  bufferLength?: number; // maximum buffered characters before attempting flush
  tags?: string[]; // tags to recognize e.g., ["think", "plan"]
  /**
   * Maximum number of characters to wait (from the start of a special sequence)
   * for it to complete (e.g., '>' for a tag open or a newline after a fence
   * opener). If exceeded, the partial special is treated as plain text and
   * emitted. Defaults to bufferLength when not provided.
   */
  specBufferLength?: number;
  /**
   * Minimum buffered characters to accumulate before attempting to parse a
   * special sequence (tags or fences). This helps avoid boundary issues when
   * very small chunks arrive (e.g., 1–3 chars). Defaults to 10.
   */
  specMinParseLength?: number;
}

export interface IPlugin {
  name: string;
  onInit?(api: IPluginAPI): void | Promise<void>;
  onEvent?(e: Event, api: IPluginAPI): void | Promise<void>;
  onDispose?(): void | Promise<void>;
}

export interface IPluginAPI {
  pushOutput(s: string): void;
  state: Readonly<Context>;
}

// Backward-compat type aliases
export type Plugin = IPlugin;
export type PluginAPI = IPluginAPI;
