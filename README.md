# TokenLoom - The ultimate token streams parser

<h1 align="center">
<br/>
<img width="400" src="https://raw.githubusercontent.com/alaa-eddine/tokenloom/main/media/logo.png" alt="TokenLoom" />
<br/>
</h1>

TokenLoom is a TypeScript library for progressively parsing streamed text (LLM/SSE-like) into structured events. It detects:

- Custom tags like `<think>...</think>` (non-nested in v1)
- Fenced code blocks (``` or ~~~), including language info strings
- Plain text emitted as tokens/words/graphemes

![Demo](https://raw.githubusercontent.com/alaa-eddine/tokenloom/main/media/demo.gif)

## Why TokenLoom?

**The Problem:** When working with streaming text from LLMs, SSE endpoints, or real-time data sources, you often need to parse structured content that arrives in arbitrary chunks. Traditional parsers fail because they expect complete, well-formed input. You might receive fragments like:

- `"<thi"` + `"nk>reasoning</think>"` (tag split across chunks)
- ` "```java" ` + ` "script\nconsole.log('hello');\n```" ` (code fence fragmented)
- Incomplete sequences that need buffering without blocking the stream

**Existing Solutions Fall Short:**

- **DOM parsers** require complete markup and fail on fragments
- **Markdown parsers** expect full documents and don't handle streaming
- **Regex-based approaches** struggle with boundary conditions and backtracking
- **Custom state machines** are complex to implement correctly for edge cases

**TokenLoom's Solution:**

- **Stream-native design** that handles arbitrary chunk boundaries gracefully
- **Progressive emission** - start processing immediately, don't wait for completion
- **Intelligent buffering** with configurable limits to prevent memory issues
- **Robust boundary detection** that works even when tags/fences split mid-sequence
- **Plugin architecture** for flexible post-processing and output formatting

Perfect for AI applications, real-time chat systems, streaming markdown processors, and any scenario where structured text arrives incrementally.

**Design intent:**

- Tolerate arbitrary chunk fragmentation (e.g., `<thi` + `nk>` or ````+`javascript\n`)
- Emit start → progressive chunks → end; do not stall waiting for closers
- Bound buffers with a high-water mark; flush when needed

### Key features

- **Streaming-safe detection** of custom tags and code fences
- **Incremental emission**: does not block waiting for closers; emits start, progressive chunks, then end
- **Configurable segmentation**: token, word, or grapheme units
- **Plugin system**: pluggable post-processing via simple event hooks
- **Backpressure-friendly**: exposes high-water marks and flushing

### Status

- v1 supports custom tags and fenced code blocks; Markdown headings and nested structures are intentionally out-of-scope for now.

## Installation

```bash
npm install tokenloom
```

For development:

```bash
npm ci
npm run build
```

**Requirements:** Node 18+

## Quick start

```ts
import { TokenLoom } from "tokenloom";

const parser = new TokenLoom({
  tags: ["think"], // tags to recognize
  emitUnit: "word", // emit words instead of tokens
});

// Listen to events directly
parser.on("text", (event) => process.stdout.write(event.text));
parser.on("tag-open", (event) => console.log(`\n[${event.name}]`));

const input = `Hello <think>reasoning</think> world!`;

// Simulate streaming chunks
for (const chunk of ["Hello <thi", "nk>reason", "ing</think> world!"]) {
  parser.feed({ text: chunk });
}
parser.flush();
```

See `examples/` directory for advanced usage including syntax highlighting, async processing, and custom plugins.

## API overview

### Construction

```ts
new TokenLoom(opts?: ParserOptions)
```

```ts
type EmitUnit = "token" | "word" | "grapheme";

interface ParserOptions {
  emitUnit?: EmitUnit; // default "token"
  bufferLength?: number; // maximum buffered characters before attempting flush (default 2048)
  tags?: string[]; // tags to recognize e.g., ["think", "plan"]
  /**
   * Maximum number of characters to wait (from the start of a special sequence)
   * for it to complete (e.g., '>' for a tag open or a newline after a fence
   * opener). If exceeded, the partial special is treated as plain text and
   * emitted. Defaults to bufferLength when not provided.
   */
  specBufferLength?: number;
  /**
   * Minimum buffered characters to accumulate before attempting to parse a
   * special sequence (tags or fences). This helps avoid boundary issues when
   * very small chunks arrive (e.g., 1–3 chars). Defaults to 10.
   */
  specMinParseLength?: number;
  /**
   * Whether to suppress plugin error logging to console. Defaults to false.
   * Useful for testing or when you want to handle plugin errors silently.
   */
  suppressPluginErrors?: boolean;
}
```

### Core methods

- `use(plugin: IPlugin): this` – registers a plugin
- `remove(plugin: IPlugin): this` – removes a plugin
- `feed(chunk: SourceChunk): void` – push-mode; feed streamed text
- `flush(): void` – force flush remaining buffered content and emit `flush`
- `dispose(): void` – cleanup resources and dispose all plugins
- `getSharedContext(): Record<string, any>` – access the shared context object used across events
- `[Symbol.asyncIterator](): AsyncIterator<Event>` – pull-mode consumption

### Event Emitter methods

TokenLoom extends Node.js EventEmitter, so you can listen to events directly:

- `on(event: string, listener: Function): this` – listen to specific event types or '\*' for all events
- `emit(event: string, ...args: any[]): boolean` – emit events (used internally)
- All other EventEmitter methods are available (once, off, removeAllListeners, etc.)

### Events

TokenLoom emits the following event types:

- **`text`** - Plain text content
- **`tag-open`** - Custom tag start (e.g., `<think>`)
- **`tag-close`** - Custom tag end (e.g., `</think>`)
- **`code-fence-start`** - Code block start (e.g., ` ```javascript`)
- **`code-fence-chunk`** - Code block content
- **`code-fence-end`** - Code block end
- **`flush`** - Parsing complete, buffers flushed

Each event includes:

- `context`: Shared object for plugin state coordination
- `metadata`: Optional plugin-attached data
- `in`: Current parsing context (inside tag/fence)

### Plugins

Plugins use a transformation pipeline with three optional stages:

- **`preTransform`** - Early processing, metadata injection
- **`transform`** - Main content transformation
- **`postTransform`** - Final processing, analytics

```ts
parser.use({
  name: "my-plugin",
  transform(event, api) {
    if (event.type === "text") {
      return { ...event, text: event.text.toUpperCase() };
    }
    return event;
  },
});
```

**Built-in plugins:**

- `LoggerPlugin()` - Console logging
- `TextCollectorPlugin()` - Text accumulation

See `examples/syntax-highlighting-demo.js` for advanced plugin usage.

## Usage patterns

### Streaming text processing

```ts
const parser = new TokenLoom({ tags: ["think"], emitUnit: "word" });

parser.on("text", (event) => process.stdout.write(event.text));
parser.on("tag-open", (event) => console.log(`[${event.name}]`));

// Simulate streaming chunks
for (const chunk of ["Hello <thi", "nk>thought</th", "ink> world"]) {
  parser.feed({ text: chunk });
}
parser.flush();
```

### AsyncIterator support

```ts
for await (const event of parser) {
  console.log(`${event.type}: ${event.text || event.name || ""}`);
  if (event.type === "flush") break;
}
```

## Examples

You can run the examples after building the project:

```bash
# Build first
npm run build

# Basic parsing with plugins and direct event listening
node examples/basic-parsing.js

# Streaming simulation with random chunking and event tracing
node examples/streaming-simulation.js

# Syntax highlighting demo with transformation pipeline
node examples/syntax-highlighting-demo.js

# Pipeline phases demonstration
node examples/pipeline-phases-demo.js

# Async processing demo
node examples/async-processing.js

# Custom plugin example
node examples/custom-plugin.js
```

## Development

### Scripts

```bash
npm ci                  # install
npm run build           # build with rollup
npm run dev             # watch build
npm test                # run tests (vitest)
npm run test:run        # run tests once
npm run test:coverage   # coverage report
```

## Architecture & Design

TokenLoom uses a **handler-based architecture** that switches between specialized parsers:

- **TextHandler** - Plain text and special sequence detection
- **TagHandler** - Custom tag content processing
- **FenceHandler** - Code fence content processing

### Key Features

- **Stream-safe**: Handles arbitrary chunk fragmentation (`<thi` + `nk>`)
- **Progressive**: Emits events immediately, doesn't wait for completion
- **Bounded buffers**: Configurable limits prevent memory issues
- **Enhanced segmentation**: Comment operators (`//`, `/*`, `*/`) as single units
- **No nesting**: Tags and fences are non-nested in v1

## Roadmap

- Optional nested tag/block support
- Markdown structures (headings, lists, etc.)
- More robust Unicode segmentation and locale controls
- Additional built-in plugins (terminal colorizer, markdown renderer)
- Performance optimizations for very large streams

## License

MIT
