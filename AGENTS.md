# TokenLoom LLM Agents Instructions

## Project overview

TokenLoom is a TypeScript library for progressively parsing streamed text (LLM/SSE-like) into structured events. It detects:

- Custom tags like `<think>...</think>` (non-nested in v1)
- Fenced code blocks (``` or ~~~), including language info strings
- Plain text emitted as tokens/words/graphemes

**Key features:**

- Plugin transformation pipeline (`preTransform`, `transform`, `postTransform`) for event processing
- EventEmitter integration for direct event listening via `parser.on()`
- Shared context system for persistent state coordination across events
- Enhanced word segmentation treating comment operators (`//`, `/*`, `*/`) as single units
- Named `EmitUnit` constants (`Token`, `Word`, `Grapheme`, `Char`) for type-safe configuration
- Configurable emission delays (`emitDelay`) for smooth streaming output control
- Async `flush()` with Promise return and completion tracking via `end` event
- Buffer monitoring with `buffer-released` events
- Non-interfering information display via `once()` method

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
  - `node examples/syntax-highlighting-demo.js`
  - `node examples/pipeline-phases-demo.js`
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
  - `suppressPluginErrors`: optional boolean to suppress plugin error console output (useful for testing).
  - `emitDelay`: milliseconds to wait between emissions for smooth output control.
  - `flush()` must emit any remaining text/code chunks, then `flush` event, then `end` event.
- Segmentation:
  - `emitUnit`: Use `EmitUnit.Token`, `EmitUnit.Word`, `EmitUnit.Grapheme`, or `EmitUnit.Char` constants.
  - Do not split surrogate pairs; prefer `Intl.Segmenter` when available.
  - Enhanced word segmentation treats comment operators (`//`, `/*`, `*/`) as single units for better syntax highlighting support.
- Event system:
  - `buffer-released`: emitted when output buffer becomes completely empty.
  - `end`: emitted after `flush` when all processing (including delayed emissions) is complete.
  - `once(eventType, listener)`: adds one-time listeners that wait for buffer to be empty before executing.

## Common tasks

- Parser behavior → `src/parser/`
  - Main parser: `src/parser/parser.class.ts` (StreamingParser)
  - Text processing: `src/parser/text-handler.ts` (TextHandler.process)
  - Tag parsing: `src/parser/tag-handler.ts` (TagHandler.process)
  - Fence handling: `src/parser/fence-handler.ts` (FenceHandler.process)
  - Utilities: `src/parser/utils.ts` (findNextSpecialIndex, parseAttrs, etc.)
  - Ensure `flush()` never drops tail text
- Plugin classes → `src/plugins/` (Plugin base class, LoggerPlugin, TextCollectorPlugin)
  - Plugin lifecycle: onInit, preTransform/transform/postTransform, onDispose
  - Plugin API: pushOutput, state (readonly context)
  - Transformation pipeline: preTransform → transform → postTransform
- Public API → `src/index.ts`, `src/tokenloom.ts`
  - TokenLoom extends EventEmitter for direct event listening
  - `getSharedContext()` provides access to persistent event context
  - `flush()` returns Promise<void> that resolves when all output is released
  - `once(eventType, listener)` for non-interfering status display
  - Emits `buffer-released` and `end` events for advanced flow control

After changes:

- `npm run test:run` → must be green
- `node examples/streaming-simulation.js` → sanity check output
- `node examples/syntax-highlighting-demo.js` → verify transformation pipeline works

## Plugin system

**Plugin Architecture:**

- Uses transformation pipeline: `preTransform` → `transform` → `postTransform`
- Events include `context` (shared state) and `metadata` properties
- Direct event consumption via EventEmitter pattern: `parser.on(eventType, handler)`

**Transformation Pipeline:**

- `preTransform`: Early processing, metadata injection, event filtering
- `transform`: Main content transformation, syntax highlighting, text modification
- `postTransform`: Final processing, analytics, logging
- Each stage can return: event unchanged, modified event, array of events, or null (filter)

**Shared Context:**

- `event.context`: Persistent object shared across all events in a session
- Allows plugins to coordinate state (e.g., syntax highlighting tracking brackets/strings)
- Access via `parser.getSharedContext()` or `event.context` in transformations
- Always defined as empty object `{}` by default

## Pitfalls & fixes

- Incomplete tag starts: if buffer ends with `<`, wait; do not emit as text.
- Fragmented fences: do not emit `code-fence-start` until the newline is seen (to capture `lang`).
- Indented fences: allow up to 3 spaces both for opening and closing.
- Flush must close an open fence by emitting remaining `code-fence-chunk` (if any) then `code-fence-end`, `flush`, and `end`.
- **Plugin usage**: Use transformation methods (`preTransform`, `transform`, `postTransform`); use `parser.on()` for event consumption.
- **Context initialization**: Always check `if (!event.context.myPlugin)` before accessing plugin-specific context.
- **Event mutation**: Transformation pipeline modifies events in-place; be careful with shared references.
- **Comment segmentation**: Use `emitUnit: EmitUnit.Word` for syntax highlighting to get comment operators as single tokens.
- **Async flush**: Always `await parser.flush()` to ensure all delayed emissions complete.
- **Buffer events**: `buffer-released` fires after each batch; `end` fires after flush completion.
- **Once listeners**: Memory is automatically released after execution; use for non-interfering status display.

## Security & performance

- Input is untrusted text; avoid regex with catastrophic backtracking.
- Minimize allocations in hot paths; prefer slicing and incremental appends.

## References

- Agent guidance format: https://agents.md/
