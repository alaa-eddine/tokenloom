import type { Event, FenceMarker } from "../types";
import { BaseHandler } from "./base-handler";
import { findNextSpecialIndex, flushTextHold, parseAttrs } from "./utils";

export class TextHandler extends BaseHandler {
  process(): Event[] {
    const events: Event[] = [];
    // If buffer is very small, only defer when a special starts at the current head
    if (this.state.buffer.length < this.opts.specMinParseLength) {
      const smallBuf = this.state.buffer;
      const idxSmall = findNextSpecialIndex(smallBuf);
      if (idxSmall === 0) {
        // Special potentially starts here; wait for more data
        return events;
      }
      if (idxSmall === -1) {
        // No specials at all -> treat as plain text immediately
        this.state.textHold += smallBuf;
        this.state.buffer = "";
        return events;
      }
      // There is plain text before a potential special. Emit the plain part now and keep the special head.
      if (idxSmall > 0) {
        this.state.textHold += smallBuf.slice(0, idxSmall);
        this.state.buffer = smallBuf.slice(idxSmall);
        return events;
      }
    }
    // Look for earliest of: custom tag open, custom tag close, code fence open, code fence close not applicable here
    const idx = findNextSpecialIndex(this.state.buffer);
    if (idx === -1) {
      // nothing special; accumulate all
      this.state.textHold += this.state.buffer;
      this.state.buffer = "";
      return events;
    }
    // move plain text before special into hold
    if (idx > 0) {
      this.state.textHold += this.state.buffer.slice(0, idx);
      this.state.buffer = this.state.buffer.slice(idx);
    }
    // check what special is at start of buffer
    const special = this.state.buffer;
    // tag open like <name ...>
    const openMatch = special.match(/^<([a-zA-Z][a-zA-Z0-9_-]*)([^>]*)>/);
    const closeMatch = special.match(/^<\/(\w+)[^>]*>/);

    if (openMatch) {
      const tag = openMatch[1];
      if (this.opts.tags.includes(tag)) {
        const maybeAttrs = openMatch[2] ?? "";
        const endIdx = openMatch[0].length;
        if (special.length < endIdx) return events; // wait
        // Emit any held text before opening tag
        events.push(...flushTextHold(this.state, this.opts));
        const attrs = parseAttrs(maybeAttrs);
        this.state.currentTag = { name: tag, attrs };
        this.state.context = {
          ...this.state.context,
          inTag: { name: tag, attrs },
        };
        events.push({
          type: "tag-open",
          name: tag,
          attrs,
          in: this.state.context,
          context: {},
        });
        this.state.buffer = special.slice(endIdx);
        this.state.mode = "in-tag";
        return events;
      }
      // not a custom tag -> treat as text
    }
    if (closeMatch) {
      // close tag encountered in text mode without open; treat as text unless it matches currentTag (no nesting supported)
      // fall-through to treat as text
    }
    // Handle fenced code block at start of line: tolerate progressive arrival of backticks/tilde
    if (special[0] === "`" || special[0] === "~") {
      const fenceChar = special[0];
      // count run length
      let runLen = 1;
      while (runLen < special.length && special[runLen] === fenceChar) runLen++;
      if (runLen < 3) {
        // Potential fence but not enough yet.
        // If buffer ends with the run (no non-fence char yet), wait for more input.
        // Otherwise, treat as plain text (not a fence line).
        if (runLen === special.length) {
          // If we've waited too long without seeing completion, downgrade to text
          if (special.length >= this.opts.specBufferLength) {
            this.state.textHold += special;
            this.state.buffer = "";
            return events;
          }
          return events; // wait for more data to decide
        }
        // Not a valid fence (only 1-2), emit those characters and continue
        this.state.textHold += special.slice(0, runLen);
        this.state.buffer = special.slice(runLen);
        return events;
      }
      // We have >=3 fence chars. Ensure we have the whole opening line to capture info string
      const eolIdx = special.indexOf("\n");
      if (eolIdx === -1) {
        // Wait, but if the line grows too long without newline, downgrade to text
        if (special.length >= this.opts.specBufferLength) {
          this.state.textHold += special;
          this.state.buffer = "";
          return events;
        }
        return events; // wait for end of line
      }
      const fence: FenceMarker = fenceChar === "`" ? "```" : "~~~";
      const infoRaw = special.slice(runLen, eolIdx).trim();
      const lang = infoRaw || undefined;
      // Emit held text before fence start
      events.push(...flushTextHold(this.state, this.opts));
      this.state.currentFence = { fence, lang, fenceLen: runLen };
      this.state.context = {
        ...this.state.context,
        inCodeFence: { fence, lang },
      };
      events.push({
        type: "code-fence-start",
        fence,
        lang,
        in: this.state.context,
        context: {},
      });
      // consume the whole opening fence line including newline
      this.state.buffer = special.slice(eolIdx + 1);
      this.state.mode = "in-fence";
      return events;
    }
    // Otherwise, not a recognized special start; consume one char to progress and treat as text
    if (special[0] === "<") {
      // If we have just "<" or looks like start of a tag but incomplete, wait for more data
      if (special.length === 1) {
        if (special.length >= this.opts.specBufferLength) {
          this.state.textHold += special;
          this.state.buffer = "";
          return events;
        }
        return events;
      }
      const looksLikeTagStart = /^<([a-zA-Z]|\/)\w*/.test(special);
      const hasGt = special.includes(">");
      if (looksLikeTagStart && !hasGt) {
        // wait for more input to decide; if too long, downgrade to text
        if (special.length >= this.opts.specBufferLength) {
          this.state.textHold += special;
          this.state.buffer = "";
          return events;
        }
        return events;
      }
    }
    this.state.textHold += special[0];
    this.state.buffer = special.slice(1);
    return events;
  }
}
