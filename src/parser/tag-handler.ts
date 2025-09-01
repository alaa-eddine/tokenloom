import type { Event, Context } from "../types";
import { segment } from "../segment";
import { BaseHandler } from "./base-handler";
import { pushSegmentedText } from "./utils";

export class TagHandler extends BaseHandler {
  process(): Event[] {
    const events: Event[] = [];
    // find closing tag </name>
    if (!this.state.currentTag) {
      // safety
      this.state.mode = "text";
      return events;
    }
    const name = this.state.currentTag.name;
    const marker = `</${name}`;
    const idx = this.state.buffer.indexOf(marker);
    if (idx === -1) {
      // no close marker yet: emit most of buffer but retain a small tail to catch boundary-spanning close
      const retain = Math.max(marker.length - 1, 1);
      if (this.state.buffer.length > retain) {
        const emitPart = this.state.buffer.slice(
          0,
          this.state.buffer.length - retain
        );
        if (emitPart) {
          const toSegment = this.state.segHold + emitPart;
          this.state.segHold = "";
          pushSegmentedText(toSegment, false, events, this.state, this.opts);
        }
        this.state.buffer = this.state.buffer.slice(
          this.state.buffer.length - retain
        );
      }
      return events;
    }
    // emit text up to close marker
    if (idx > 0) {
      this.state.textHold += this.state.buffer.slice(0, idx);
    }
    // check if full closing tag is present
    const rest = this.state.buffer.slice(idx);
    const m = rest.match(new RegExp(`^<\\/${name}\\s*>`));
    if (!m) {
      // partial close tag, wait for more input
      this.state.buffer = rest; // keep starting from partial close
      return events;
    }
    // we have a full close
    // flush text inside tag as segmented text (including any segHold)
    if (this.state.textHold || this.state.segHold) {
      const toSegment = this.state.segHold + (this.state.textHold || "");
      this.state.segHold = "";
      for (const tok of segment(toSegment, this.opts.emitUnit)) {
        events.push({ type: "text", text: tok, in: this.state.context });
      }
      this.state.textHold = "";
    }
    // consume close tag
    this.state.buffer = rest.slice(m[0].length);
    events.push({ type: "tag-close", name, in: this.state.context });
    {
      const { inTag: _drop, ...restCtx } = this.state.context as Record<
        string,
        unknown
      >;
      this.state.context = restCtx as Context;
    }
    this.state.currentTag = null;
    this.state.mode = "text";
    return events;
  }
}
