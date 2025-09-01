import type { Context, Event, FenceMarker, ParserOptions } from "../types";

export type Mode = "text" | "in-tag" | "in-fence";

export interface InternalState {
  context: Context;
  mode: Mode;
  buffer: string;
  textHold: string;
  currentTag?: { name: string; attrs: Record<string, string> } | null;
  currentFence?: { fence: FenceMarker; lang?: string; fenceLen: number } | null;
  segHold: string;
  fenceHold: string;
}

export type Opts = Required<
  Pick<
    ParserOptions,
    | "bufferLength"
    | "emitUnit"
    | "tags"
    | "specBufferLength"
    | "specMinParseLength"
  >
>;
