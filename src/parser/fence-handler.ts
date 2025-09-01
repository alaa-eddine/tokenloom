import type { Event, Context } from "../types";
import { BaseHandler } from "./base-handler";
import { escapeRegex, indexOfFenceClose, pushSegmentedText } from "./utils";

export class FenceHandler extends BaseHandler {
  process(): Event[] {
    const events: Event[] = [];
    if (!this.state.currentFence) {
      this.state.mode = "text";
      return events;
    }
    // If buffer is too small, wait to reduce boundary issues
    if (this.state.buffer.length < this.opts.specMinParseLength) {
      return events;
    }
    const fenceLen = this.state.currentFence.fenceLen;
    const delim =
      this.state.currentFence.fence === "```"
        ? "`".repeat(fenceLen)
        : "~".repeat(fenceLen);
    // Search for closing fence at start of a line or after newline
    const idx = indexOfFenceClose(this.state.buffer, delim);
    if (idx === -1) {
      // No close yet. Emit all but keep a small tail (up to specMinParseLength-1)
      const retain = Math.max(this.opts.specMinParseLength - 1, delim.length);
      if (this.state.buffer.length > retain) {
        const emitPart = this.state.buffer.slice(
          0,
          this.state.buffer.length - retain
        );
        if (emitPart) {
          const toSegment = this.state.fenceHold + emitPart;
          this.state.fenceHold = "";
          pushSegmentedText(toSegment, true, events, this.state, this.opts);
        }
        this.state.buffer = this.state.buffer.slice(
          this.state.buffer.length - retain
        );
      }
      return events;
    }
    // emit text up to idx as fence chunk
    if (idx > 0) {
      const chunk = this.state.buffer.slice(0, idx);
      if (chunk) {
        const toSegment = this.state.fenceHold + chunk;
        this.state.fenceHold = "";
        pushSegmentedText(toSegment, true, events, this.state, this.opts);
      }
    }
    // consume closing fence delimiter line
    const rest = this.state.buffer.slice(idx);
    const m = rest.match(new RegExp(`^${escapeRegex(delim)}\\s*(?:\\n|$)`));
    const consume = m ? m[0].length : delim.length;
    this.state.buffer = rest.slice(consume);
    if (this.state.fenceHold) {
      pushSegmentedText(
        this.state.fenceHold,
        true,
        events,
        this.state,
        this.opts
      );
      this.state.fenceHold = "";
    }
    // emit end
    events.push({ type: "code-fence-end", in: this.state.context });
    this.state.context = { ...this.state.context, inCodeFence: null };
    this.state.currentFence = null;
    this.state.mode = "text";
    return events;
  }
}
