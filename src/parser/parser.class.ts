import { segment } from "../segment";
import type { Context, Event, ParserOptions } from "../types";
import { FenceHandler } from "./fence-handler";
import { TagHandler } from "./tag-handler";
import { TextHandler } from "./text-handler";
import type { InternalState, Opts } from "./types";
import { flushTextHold, serializeTag } from "./utils";

export class StreamingParser {
  private opts: Opts;
  private state: InternalState;
  private textHandler: TextHandler;
  private tagHandler: TagHandler;
  private fenceHandler: FenceHandler;

  constructor(opts?: ParserOptions) {
    this.opts = {
      emitUnit: opts?.emitUnit ?? "token",
      bufferLength: opts?.bufferLength ?? 64,
      tags: opts?.tags ?? [],
      specBufferLength: opts?.specBufferLength ?? opts?.bufferLength ?? 64,
      specMinParseLength: opts?.specMinParseLength ?? 10,
    };
    this.state = {
      context: {},
      mode: "text",
      buffer: "",
      textHold: "",
      segHold: "",
      fenceHold: "",
    };
    this.textHandler = new TextHandler(this.state, this.opts);
    this.tagHandler = new TagHandler(this.state, this.opts);
    this.fenceHandler = new FenceHandler(this.state, this.opts);
  }

  getContext(): Context {
    return { ...this.state.context };
  }

  feedText(input: string): Event[] {
    this.state.buffer += input;
    const events: Event[] = [];
    // process incrementally
    while (this.state.buffer.length > 0) {
      const beforeLen = this.state.buffer.length;
      switch (this.state.mode) {
        case "text":
          events.push(...this.textHandler.process());
          break;
        case "in-tag":
          events.push(...this.tagHandler.process());
          break;
        case "in-fence":
          events.push(...this.fenceHandler.process());
          break;
      }
      if (this.state.buffer.length === beforeLen) {
        // no progress; wait for more data
        break;
      }
      if (this.state.textHold.length >= this.opts.bufferLength) {
        events.push(...flushTextHold(this.state, this.opts));
      }
    }
    // If buffer is empty, emit accumulated text immediately (both in text and in-tag modes)
    // We avoid flushing here for fence mode because fence chunks are emitted separately
    if (this.state.buffer.length === 0 && this.state.textHold) {
      if (this.state.mode !== "in-fence") {
        events.push(...flushTextHold(this.state, this.opts));
      }
    }
    return events;
  }

  flush(): Event[] {
    const events: Event[] = [];

    // If there's anything left in the buffer, treat it as text
    if (this.state.buffer) {
      this.state.textHold += this.state.buffer;
      this.state.buffer = "";
    }

    if (this.state.mode === "in-tag") {
      // unterminated tag -> treat as text
      this.state.textHold += "<" + serializeTag(this.state.currentTag!);
      this.state.mode = "text";
      this.state.currentTag = null;
    }
    if (this.state.mode === "in-fence") {
      // keep emitting fence chunks and close fence
      if (this.state.textHold || this.state.fenceHold) {
        const toSegment = this.state.fenceHold + (this.state.textHold || "");
        this.state.fenceHold = "";
        for (const tok of segment(toSegment, this.opts.emitUnit)) {
          events.push({
            type: "code-fence-chunk",
            text: tok,
            in: this.state.context,
            context: {},
          });
        }
        this.state.textHold = "";
      }
      events.push({
        type: "code-fence-end",
        in: this.state.context,
        context: {},
      });
      {
        const { inCodeFence: _drop, ...rest } = this.state.context as Record<
          string,
          unknown
        >;
        this.state.context = rest as Context;
      }
      this.state.mode = "text";
      this.state.currentFence = null;
    }

    if (this.state.textHold) {
      events.push(...flushTextHold(this.state, this.opts));
    }

    events.push({ type: "flush", context: {} });
    this.state.buffer = "";
    return events;
  }
}
