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
  // Simple heuristic word splitter: sequences of letters/digits/underscore vs whitespace/punct
  let buf = "";
  let lastIsWord = false as boolean | null;
  for (const ch of Array.from(input)) {
    const isWord = /[\p{L}\p{N}_]/u.test(ch);
    if (lastIsWord === null) {
      buf = ch;
      lastIsWord = isWord;
      continue;
    }
    if (isWord === lastIsWord) {
      buf += ch;
    } else {
      if (buf) yield buf;
      buf = ch;
      lastIsWord = isWord;
    }
  }
  if (buf) yield buf;
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
  // word
  const seg = createIntlSegmenter("word");
  if (seg) {
    // Intl.Segmenter with word granularity returns words, spaces, punctuation. We emit all.
    yield* iterateIntlSegments(seg, input);
  } else {
    yield* fallbackWords(input);
  }
}
