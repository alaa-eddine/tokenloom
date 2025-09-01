import { segment } from "../segment";
import type { Event } from "../types";
import type { InternalState, Opts } from "./types";

export function flushTextHold(state: InternalState, opts: Opts): Event[] {
  if (!state.textHold && !state.segHold) return [];
  const events: Event[] = [];
  const toSegment = state.segHold + (state.textHold || "");
  state.segHold = "";
  pushSegmentedText(toSegment, false, events, state, opts);
  state.textHold = "";
  return events;
}

function isWordChar(ch: string): boolean {
  return /[\p{L}\p{N}_]/u.test(ch);
}

export function pushSegmentedText(
  toSegment: string,
  isFence: boolean,
  events: Event[],
  state: InternalState,
  opts: Opts
): void {
  const tokens = Array.from(segment(toSegment, opts.emitUnit));
  if (opts.emitUnit === "word" && tokens.length > 0) {
    const last = tokens[tokens.length - 1];
    const lastChar = last.slice(-1);
    if (last && lastChar && isWordChar(lastChar)) {
      tokens.pop();
      if (isFence) state.fenceHold += last;
      else state.segHold += last;
    } else {
      if (isFence) state.fenceHold = "";
      else state.segHold = "";
    }
  }
  for (const tok of tokens) {
    events.push({
      type: isFence ? "code-fence-chunk" : "text",
      text: tok,
      in: state.context,
    });
  }
}

export function findNextSpecialIndex(buffer: string): number {
  const s = buffer;
  let best = -1;
  const lt = s.indexOf("<");
  if (lt !== -1) best = best === -1 ? lt : Math.min(best, lt);
  const fenceIdx = indexOfFenceOpen(s);
  if (fenceIdx !== -1) best = best === -1 ? fenceIdx : Math.min(best, fenceIdx);
  return best;
}

export function indexOfFenceOpen(s: string): number {
  const re = /(^|\n)[ ]{0,3}([`~]{1,})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const backticks = m[2];
    const relative = m[0].indexOf(backticks);
    const startIdx = m.index + relative;
    return startIdx;
  }
  return -1;
}

export function indexOfFenceClose(s: string, delim: string): number {
  const re = new RegExp(
    `(^|\\n)[ ]{0,3}${escapeRegex(delim)}(?=\\s*(?:\\n|$))`
  );
  const m = s.match(re as RegExp);
  if (!m) return -1;
  const full = m[0];
  const pos = full.indexOf(delim);
  const idx = m.index! + pos;
  return idx;
}

export function parseAttrs(s: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /(\w+)=(["'])(.*?)\2/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    attrs[m[1]] = m[3];
  }
  return attrs;
}

export function serializeTag(t: {
  name: string;
  attrs: Record<string, string>;
}): string {
  const attrs = Object.entries(t.attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");
  return attrs ? `${t.name} ${attrs}>` : `${t.name}>`;
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
