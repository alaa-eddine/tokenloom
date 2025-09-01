import { describe, expect, it } from "vitest";
import { Event, TokenLoom, LoggerPlugin } from "../src/index";

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

describe("Example Usage Tests", () => {
  it("should work like the example in the requirements", () => {
    // Sample input (with a tag + a code fence + plain text)
    const input = `
  Here is some intro text.
  
  <think>This is my hidden reasoning</think>
  
  Now a code block:
  
  \`\`\`javascript
  console.log("Hello world");
  \`\`\`
  
  And we are done.
  `;

    // Create a parser instance with options
    const parser = new TokenLoom({
      emitUnit: "token",
      bufferLength: 64,
      tags: ["think"], // recognize <think>…</think>
    });

    const logMessages: string[] = [];
    const events: Event[] = [];

    // Add a simple plugin that logs events
    const logger = new LoggerPlugin((msg) => logMessages.push(msg));
    parser.use(logger);
    parser.use({
      name: "event-collector",
      onEvent: (e) => {
        events.push(e);
      },
    });

    // Feed the parser chunk by chunk
    for (const chunk of randomChunks(input)) {
      parser.feed({ text: chunk });
    }

    // Flush any remaining buffered text
    parser.flush();

    // Verify we got the expected log messages
    expect(logMessages.length).toBeGreaterThan(0);

    // Check for specific expected patterns
    const hasTagOpen = events.some(
      (e) => e.type === "tag-open" && e.name === "think"
    );
    const hasTagClose = events.some(
      (e) => e.type === "tag-close" && e.name === "think"
    );
    const hasCodeStart = events.some(
      (e) => e.type === "code-fence-start" && e.lang === "javascript"
    );
    const hasCodeEnd = events.some((e) => e.type === "code-fence-end");
    const hasFlush = events.some((e) => e.type === "flush");

    expect(hasTagOpen).toBe(true);
    expect(hasTagClose).toBe(true);
    expect(hasCodeStart).toBe(true);
    expect(hasCodeEnd).toBe(true);
    expect(hasFlush).toBe(true);
  });

  it("should handle complex nested content", () => {
    const complexInput = `
Start of document.

<think>
Let me think about this problem step by step.
First, I need to understand the requirements.
</think>

\`\`\`python
def solve_problem():
    # This is outside the think tag
    return "solution"
\`\`\`

The final answer is ready.
`;

    const parser = new TokenLoom({
      emitUnit: "token",
      tags: ["think"],
    });

    const events: Event[] = [];
    parser.use({
      name: "collector",
      onEvent: (e) => events.push(e),
    });

    // Feed in chunks
    for (const chunk of randomChunks(complexInput, 789)) {
      parser.feed({ text: chunk });
    }
    parser.flush();

    // Verify structure
    const thinkOpen = events.find(
      (e) => e.type === "tag-open" && e.name === "think"
    );
    const thinkClose = events.find(
      (e) => e.type === "tag-close" && e.name === "think"
    );
    const codeStart = events.find((e) => e.type === "code-fence-start");
    const codeEnd = events.find((e) => e.type === "code-fence-end");

    expect(thinkOpen).toBeDefined();
    expect(thinkClose).toBeDefined();
    expect(codeStart).toBeDefined();
    expect(codeStart?.lang).toBe("python");
    expect(codeEnd).toBeDefined();

    // Verify text inside think tag has proper context
    const textInThink = events.filter(
      (e) => e.type === "text" && e.in?.inTag?.name === "think"
    );
    expect(textInThink.length).toBeGreaterThan(0);

    // Verify code outside think tag has no tag context
    const codeChunks = events.filter((e) => e.type === "code-fence-chunk");
    expect(codeChunks.length).toBeGreaterThan(0);
    expect(codeChunks[0].in?.inTag).toBeUndefined();
  });

  it("should handle edge cases from real-world usage", () => {
    const edgeCaseInput = `
Text before.
<tag1>Content 1</tag1><tag2>Content 2</tag2>
\`\`\`
No language specified
\`\`\`
<unclosed>This tag never closes
Final text.
`;

    const parser = new TokenLoom({
      tags: ["tag1", "tag2", "unclosed"],
    });

    const events: Event[] = [];
    parser.use({
      name: "collector",
      onEvent: (e) => events.push(e),
    });

    for (const chunk of randomChunks(edgeCaseInput, 999)) {
      parser.feed({ text: chunk });
    }
    parser.flush();

    // Should handle adjacent tags
    const tag1Open = events.find(
      (e) => e.type === "tag-open" && e.name === "tag1"
    );
    const tag1Close = events.find(
      (e) => e.type === "tag-close" && e.name === "tag1"
    );
    const tag2Open = events.find(
      (e) => e.type === "tag-open" && e.name === "tag2"
    );
    const tag2Close = events.find(
      (e) => e.type === "tag-close" && e.name === "tag2"
    );

    expect(tag1Open).toBeDefined();
    expect(tag1Close).toBeDefined();
    expect(tag2Open).toBeDefined();
    expect(tag2Close).toBeDefined();

    // Should handle code fence without language
    const codeStart = events.find((e) => e.type === "code-fence-start");
    expect(codeStart).toBeDefined();
    expect(codeStart?.lang).toBe(undefined);

    // Should handle unclosed tag gracefully
    const unclosedOpen = events.find(
      (e) => e.type === "tag-open" && e.name === "unclosed"
    );
    expect(unclosedOpen).toBeDefined();
  });
});
