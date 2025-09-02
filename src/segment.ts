import type { EmitUnit } from "./types";

// Utilities for segmentation of text into tokens/words/graphemes.
// We favor Intl.Segmenter when available and fall back to simple heuristics.

type SegmenterKind = "word" | "grapheme";

function createIntlSegmenter(kind: SegmenterKind): Intl.Segmenter | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AnyIntl: any = Intl as any;
    if (AnyIntl && AnyIntl.Segmenter) {
      return new AnyIntl.Segmenter("en", { granularity: kind });
    }
  } catch {
    // ignore
  }
  return null;
}

function* iterateIntlSegments(
  seg: Intl.Segmenter,
  input: string
): Iterable<string> {
  const it = seg.segment(input)[Symbol.iterator]();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const n = it.next();
    if (n.done) break;
    const segItem = n.value as { segment: string };
    if (segItem.segment) yield segItem.segment;
  }
}

function* fallbackGraphemes(input: string): Iterable<string> {
  // Very naive fallback: splits by code point, which is not perfect for grapheme clusters
  // but prevents splitting surrogate pairs. For production, consider a grapheme library.
  for (const ch of Array.from(input)) {
    yield ch;
  }
}

function* fallbackWords(input: string): Iterable<string> {
  // Enhanced word splitter that treats comment operators as single units
  let i = 0;
  let buf = "";
  let lastIsWord = false as boolean | null;

  while (i < input.length) {
    const ch = input[i];
    const next = input[i + 1];

    // Special handling for comment operators
    if (ch === "/" && (next === "/" || next === "*")) {
      // Flush current buffer if any
      if (buf) {
        yield buf;
        buf = "";
        lastIsWord = null;
      }
      // Emit the comment operator as a single unit
      yield input.slice(i, i + 2);
      i += 2;
      continue;
    }

    // Handle closing comment */
    if (ch === "*" && next === "/") {
      // Flush current buffer if any
      if (buf) {
        yield buf;
        buf = "";
        lastIsWord = null;
      }
      // Emit the closing comment as a single unit
      yield input.slice(i, i + 2);
      i += 2;
      continue;
    }

    // Regular word/punctuation logic
    const isWord = /[\p{L}\p{N}_]/u.test(ch);
    if (lastIsWord === null) {
      buf = ch;
      lastIsWord = isWord;
    } else if (isWord === lastIsWord) {
      buf += ch;
    } else {
      if (buf) yield buf;
      buf = ch;
      lastIsWord = isWord;
    }
    i++;
  }
  if (buf) yield buf;
}

function* enhancedWordSegmentation(input: string): Iterable<string> {
  // Try to use Intl.Segmenter first, but post-process to merge comment operators
  const seg = createIntlSegmenter("word");
  if (seg) {
    const segments = Array.from(iterateIntlSegments(seg, input));
    let i = 0;
    while (i < segments.length) {
      const current = segments[i];
      const next = segments[i + 1];

      // Merge // and /* into single tokens
      if (current === "/" && (next === "/" || next === "*")) {
        yield current + next;
        i += 2;
        continue;
      }

      // Merge */ into single token
      if (current === "*" && next === "/") {
        yield current + next;
        i += 2;
        continue;
      }

      yield current;
      i++;
    }
  } else {
    // Fall back to our custom implementation
    yield* fallbackWords(input);
  }
}

export function* segment(input: string, unit: EmitUnit): Iterable<string> {
  if (unit === "token") {
    // Split by runs of whitespace vs non-whitespace, preserving separators
    let buf = "";
    let lastIsSpace: boolean | null = null;
    for (const ch of Array.from(input)) {
      const isSpace = /\s/u.test(ch);
      if (lastIsSpace === null) {
        buf = ch;
        lastIsSpace = isSpace;
        continue;
      }
      if (isSpace === lastIsSpace) {
        buf += ch;
      } else {
        if (buf) yield buf;
        buf = ch;
        lastIsSpace = isSpace;
      }
    }
    if (buf) yield buf;
    return;
  }
  if (unit === "grapheme") {
    const seg = createIntlSegmenter("grapheme");
    if (seg) {
      yield* iterateIntlSegments(seg, input);
    } else {
      yield* fallbackGraphemes(input);
    }
    return;
  }
  // word - use custom segmentation that handles comment operators
  yield* enhancedWordSegmentation(input);
}
