# AGENTS.md

## Project overview

TokenLoom is a TypeScript library for progressively parsing streamed text (LLM/SSE-like) into structured events. It detects:

- Custom tags like `<think>...</think>` (non-nested in v1)
- Fenced code blocks (``` or ~~~), including language info strings
- Plain text emitted as tokens/words/graphemes

Design intent:

- Tolerate arbitrary chunk fragmentation (e.g., `<thi` + `nk>` or ````+`javascript\n`).
- Emit start → progressive chunks → end; do not stall waiting for closers.
- Bound buffers with a high-water mark; flush when needed.

Primary code:

- `src/parser/parser.class.ts` – main streaming parser (tags + fences)
- `src/parser/text-handler.ts` – text mode processing
- `src/parser/tag-handler.ts` – tag parsing logic
- `src/parser/fence-handler.ts` – code fence handling
- `src/segment.ts` – segmentation utilities (Intl.Segmenter fallback)
- `src/events.ts` – plugin/event bus
- `src/tokenloom.ts` – public API wrapper
- `src/plugins.ts` – plugin factory functions
- `src/plugins/` – built-in plugin classes (logger, text collector)
- `tests/*.test.ts` – comprehensive tests (incl. random chunking)
- `examples/*.js` – runnable examples

## Setup commands

- Install (Node 18+):
  - `npm ci`
- Build:
  - `npm run build`
- Watch build:
  - `npm run dev`
- Tests:
  - `npm test` (watch)
  - `npm run test:run` (single run)
  - `npm run test:coverage`
- Examples (after build):
  - `node examples/basic-parsing.js`
  - `node examples/streaming-simulation.js`
  - `node examples/async-processing.js`
  - `node examples/custom-plugin.js`

Note: Type-only warnings about `Intl.Segmenter` during rollup are expected; runtime fallbacks are implemented.

## Testing instructions

- Full suite:
  - `npm run test:run`
- Focus a single case (Vitest):
  - `npx vitest run -t "should handle the example input with random chunking"`
- Reproduce streaming behavior:
  - `node examples/streaming-simulation.js`

All tests must pass before merging.

## Code style & guidelines

- TypeScript strict mode; avoid `any`/unsafe casts.
- Descriptive names; functions = verbs; variables = nouns.
- Prefer guard clauses; keep nesting shallow.
- Match existing formatting; do not reformat unrelated code.
- Hot paths must avoid unbounded buffering and heavy regex backtracking.

## Architecture constraints (do not break)

- v1: No nested tags or blocks. Keep a single active tag/block only.
- Handler-based architecture: parser switches between TextHandler, TagHandler, and FenceHandler based on current mode.
- Fenced blocks:
  - Open: require a newline to capture the info string (language).
  - Support up to 3 leading spaces for open and close fences.
  - Handle fragmented runs (e.g., "```ja" + "vascript\n").
- Tags:
  - Treat a lone `<` at chunk end as incomplete; wait for more data.
  - Attributes: quoted values only (single or double quotes).
- Buffering:
  - Obey `bufferLength`; flush accumulated text when exceeded.
  - `specBufferLength`: max chars to wait for special sequence completion.
  - `specMinParseLength`: min chars before attempting special sequence parsing.
  - `flush()` must emit any remaining text/code chunks and then a `flush` event.
- Segmentation:
  - `emitUnit`: "token" | "word" | "grapheme"; do not split surrogate pairs; prefer `Intl.Segmenter` when available.

## Common tasks

- Parser behavior → `src/parser/`
  - Main parser: `src/parser/parser.class.ts` (StreamingParser)
  - Text processing: `src/parser/text-handler.ts` (TextHandler.process)
  - Tag parsing: `src/parser/tag-handler.ts` (TagHandler.process)
  - Fence handling: `src/parser/fence-handler.ts` (FenceHandler.process)
  - Utilities: `src/parser/utils.ts` (findNextSpecialIndex, parseAttrs, etc.)
  - Ensure `flush()` never drops tail text
- Plugin classes → `src/plugins/` (Plugin base class, LoggerPlugin, TextCollectorPlugin)
  - Plugin lifecycle: onInit, onEvent, onDispose
  - Plugin API: pushOutput, state (readonly context)
- Public API → `src/index.ts`, `src/tokenloom.ts`

After changes:

- `npm run test:run` → must be green
- `node examples/streaming-simulation.js` → sanity check output

## Pitfalls & fixes

- Incomplete tag starts: if buffer ends with `<`, wait; do not emit as text.
- Fragmented fences: do not emit `code-fence-start` until the newline is seen (to capture `lang`).
- Indented fences: allow up to 3 spaces both for opening and closing.
- Flush must close an open fence by emitting remaining `code-fence-chunk` (if any) then `code-fence-end` and `flush`.

## Security & performance

- Input is untrusted text; avoid regex with catastrophic backtracking.
- Minimize allocations in hot paths; prefer slicing and incremental appends.

## References

- Agent guidance format: https://agents.md/
