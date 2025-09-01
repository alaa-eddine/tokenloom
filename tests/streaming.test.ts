import { describe, expect, it } from "vitest";
import {
  Event,
  TokenLoom,
  LoggerPlugin,
  TextCollectorPlugin,
} from "../src/index";

// Utility: break a string into random chunks of 3–6 chars
function* randomChunks(str: string, seed: number = 42) {
  let i = 0;
  let rng = seed;

  // Simple LCG for reproducible randomness
  const nextRandom = () => {
    rng = (rng * 1664525 + 1013904223) % 0x100000000;
    return rng / 0x100000000;
  };

  while (i < str.length) {
    const size = 3 + Math.floor(nextRandom() * 4); // 3–6
    yield str.slice(i, i + size);
    i += size;
  }
}

describe("FluxLoom Streaming & Random Chunking", () => {
  const testInput = `
Here is some intro text.

<think>This is my hidden reasoning</think>

Now a code block:

\`\`\`javascript
console.log("Hello world");
function test() {
  return 42;
}
\`\`\`

<plan attr="value">
Step 1: Parse the input
Step 2: Process chunks
</plan>

And we are done.
`.trim();

  it("should handle the example input with random chunking", () => {
    const parser = new TokenLoom({
      emitUnit: "token",
      bufferLength: 64,
      tags: ["think", "plan"],
    });

    const events: Event[] = [];
    const logMessages: string[] = [];

    parser.use({
      name: "test-collector",
      onEvent(event) {
        events.push(event);
      },
    });

    const logger = new LoggerPlugin((msg) => logMessages.push(msg));
    parser.use(logger);

    // Feed the parser chunk by chunk
    for (const chunk of randomChunks(testInput, 123)) {
      parser.feed({ text: chunk });
    }

    parser.flush();

    // Verify we got all expected event types
    const eventTypes = new Set(events.map((e) => e.type));
    expect(eventTypes.has("text")).toBe(true);
    expect(eventTypes.has("tag-open")).toBe(true);
    expect(eventTypes.has("tag-close")).toBe(true);
    expect(eventTypes.has("code-fence-start")).toBe(true);
    expect(eventTypes.has("code-fence-chunk")).toBe(true);
    expect(eventTypes.has("code-fence-end")).toBe(true);
    expect(eventTypes.has("flush")).toBe(true);

    // Verify tag events
    const thinkOpen = events.find(
      (e) => e.type === "tag-open" && e.name === "think"
    );
    const thinkClose = events.find(
      (e) => e.type === "tag-close" && e.name === "think"
    );
    const planOpen = events.find(
      (e) => e.type === "tag-open" && e.name === "plan"
    );
    const planClose = events.find(
      (e) => e.type === "tag-close" && e.name === "plan"
    );

    expect(thinkOpen).toBeDefined();
    expect(thinkClose).toBeDefined();
    expect(planOpen).toBeDefined();
    expect(planClose).toBeDefined();

    // Verify code fence
    const codeStart = events.find((e) => e.type === "code-fence-start");
    const codeEnd = events.find((e) => e.type === "code-fence-end");

    expect(codeStart).toBeDefined();
    expect(codeStart?.lang).toBe("javascript");
    expect(codeEnd).toBeDefined();

    // Verify we have log messages
    expect(logMessages.length).toBeGreaterThan(0);
  });

  it("should preserve text content across random chunking", () => {
    const parser = new TokenLoom({ tags: ["think", "plan"] });
    const textCollector = new TextCollectorPlugin();

    parser.use(textCollector);

    for (const chunk of randomChunks(testInput, 456)) {
      parser.feed({ text: chunk });
    }

    parser.flush();

    const collectedText = textCollector.getText();

    // The collected text should contain all the content
    expect(collectedText).toContain("Here is some intro text");
    expect(collectedText).toContain("This is my hidden reasoning");
    expect(collectedText).toContain('console.log("Hello world")');
    expect(collectedText).toContain("And we are done");
  });

  it("should handle incomplete chunks at buffer boundary", () => {
    const parser = new TokenLoom({ tags: ["tag"] });
    const events: Event[] = [];

    parser.use({
      name: "collector",
      onEvent(event) {
        events.push(event);
      },
    });

    // Feed incomplete tag
    parser.feed({ text: "<ta" });
    parser.feed({ text: "g>content</tag>" });
    parser.flush();

    const tagOpen = events.find((e) => e.type === "tag-open");
    const tagClose = events.find((e) => e.type === "tag-close");

    expect(tagOpen).toBeDefined();
    expect(tagClose).toBeDefined();
  });

  it("should handle malformed tags gracefully", () => {
    const parser = new TokenLoom({ tags: ["test"] });
    const events: Event[] = [];

    parser.use({
      name: "collector",
      onEvent(event) {
        events.push(event);
      },
    });

    // Test unclosed tag
    parser.feed({ text: "<test>content without close" });
    parser.flush();

    // Should not crash and should emit text events
    const textEvents = events.filter((e) => e.type === "text");
    expect(textEvents.length).toBeGreaterThan(0);
  });

  it("should respect buffer length limits", () => {
    const parser = new TokenLoom({
      bufferLength: 10, // Very small buffer
      tags: ["test"],
    });
    const events: Event[] = [];

    parser.use({
      name: "collector",
      onEvent(event) {
        events.push(event);
      },
    });

    // Feed text that exceeds buffer length
    parser.feed({ text: "This is a very long text that exceeds the buffer" });
    parser.flush();

    // Should emit multiple text events due to buffer flushing
    const textEvents = events.filter((e) => e.type === "text");
    expect(textEvents.length).toBeGreaterThan(1);
  });

  it("should handle special buffer length limits for incomplete tags", () => {
    const parser = new TokenLoom({
      tags: ["test"],
      specBufferLength: 5, // Very small special buffer
    });
    const events: Event[] = [];

    parser.use({
      name: "collector",
      onEvent(event) {
        events.push(event);
      },
    });

    // Feed incomplete tag that exceeds special buffer length
    parser.feed({ text: "<test-very-long-tag-name" });
    parser.flush();

    // Should emit as text since it exceeds special buffer length
    const textEvents = events.filter((e) => e.type === "text");
    expect(textEvents.length).toBeGreaterThan(0);
    expect(
      textEvents.some((e) => e.text.includes("<test-very-long-tag-name"))
    ).toBe(true);
  });
});
