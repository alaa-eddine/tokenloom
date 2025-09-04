export type SourceChunk = { text: string };

export namespace EmitUnit {
  export const Token = "token" as const;
  export const Word = "word" as const;
  export const Grapheme = "grapheme" as const;
  export const Char = "grapheme" as const; // Alias for Grapheme
}

export type EmitUnit =
  | typeof EmitUnit.Token
  | typeof EmitUnit.Word
  | typeof EmitUnit.Grapheme;

export type FenceMarker = "```" | "~~~";

export type Event =
  | {
      type: "text";
      text: string;
      in?: Context;
      context: Record<string, any>;
      metadata?: Record<string, any>;
    }
  | {
      type: "tag-open";
      name: string;
      attrs: Record<string, string>;
      in?: Context;
      context: Record<string, any>;
      metadata?: Record<string, any>;
    }
  | {
      type: "tag-close";
      name: string;
      in?: Context;
      context: Record<string, any>;
      metadata?: Record<string, any>;
    }
  | {
      type: "code-fence-start";
      fence: FenceMarker;
      lang?: string;
      in?: Context;
      context: Record<string, any>;
      metadata?: Record<string, any>;
    }
  | {
      type: "code-fence-chunk";
      text: string;
      in?: Context;
      context: Record<string, any>;
      metadata?: Record<string, any>;
    }
  | {
      type: "code-fence-end";
      in?: Context;
      context: Record<string, any>;
      metadata?: Record<string, any>;
    }
  | {
      type: "flush";
      context: Record<string, any>;
      metadata?: Record<string, any>;
    }
  | {
      type: "end";
      context: Record<string, any>;
      metadata?: Record<string, any>;
    }
  | {
      type: "error";
      reason: string;
      recoverable: boolean;
      context: Record<string, any>;
      metadata?: Record<string, any>;
    };

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
  /**
   * Whether to suppress plugin error logging to console. Defaults to false.
   * Useful for testing or when you want to handle plugin errors silently.
   */
  suppressPluginErrors?: boolean;
  /**
   * Output release delay in milliseconds. Controls the emission rate by adding
   * a delay between outputs when tokens are still available in the output buffer.
   * This helps make emission smoother and more controlled. Defaults to 0 (no delay).
   */
  emitDelay?: number;
}

export interface IPlugin {
  name: string;
  onInit?(api: IPluginAPI): void | Promise<void>;
  onDispose?(): void | Promise<void>;

  // Transformation pipeline methods
  preTransform?(event: Event, api: IPluginAPI): Event | Event[] | null;
  transform?(event: Event, api: IPluginAPI): Event | Event[] | null;
  postTransform?(event: Event, api: IPluginAPI): Event | Event[] | null;
}

export interface IPluginAPI {
  pushOutput(s: string): void;
  state: Readonly<Context>;
}

// Backward-compat type aliases
export type Plugin = IPlugin;
export type PluginAPI = IPluginAPI;
