import { describe, it, expect } from "vitest";
import { TokenLoom, Event } from "../src/index";

// Helper function to collect events from parser
function collectEvents(parser: TokenLoom): Event[] {
  const events: Event[] = [];
  parser.on("*", (event) => {
    events.push(event);
  });
  return events;
}

describe("Shared Context Feature", () => {
  it("should include shared context in all events", () => {
    const parser = new TokenLoom({ suppressPluginErrors: true });
    const events = collectEvents(parser);

    parser.feed({ text: "Hello world" });
    parser.flush();

    // All events should have a context property
    for (const event of events) {
      expect(event.context).toBeDefined();
      expect(typeof event.context).toBe("object");
    }
  });

  it("should allow plugins to share data via context", () => {
    const parser = new TokenLoom({ suppressPluginErrors: true });
    const events = collectEvents(parser);

    // Plugin that adds data to context
    parser.use({
      name: "context-writer",
      preTransform(event, api) {
        if (!event.context.shared) {
          event.context.shared = { counter: 0 };
        }
        event.context.shared.counter++;
        return event;
      },
    });

    // Plugin that reads from context
    parser.use({
      name: "context-reader",
      transform(event, api) {
        if (event.context.shared) {
          return {
            ...event,
            metadata: {
              counterValue: event.context.shared.counter,
            },
          };
        }
        return event;
      },
    });

    parser.feed({ text: "test" });
    parser.flush();

    // Find text events and verify they have the shared counter
    const textEvents = events.filter((e) => e.type === "text");
    expect(textEvents.length).toBeGreaterThan(0);

    for (const textEvent of textEvents) {
      expect(textEvent.metadata?.counterValue).toBeGreaterThan(0);
    }
  });

  it("should maintain context state across multiple chunks", () => {
    const parser = new TokenLoom({ suppressPluginErrors: true });
    const events = collectEvents(parser);

    // Plugin that tracks state across chunks
    parser.use({
      name: "state-tracker",
      transform(event, api) {
        if (event.type === "text") {
          if (!event.context.wordCount) {
            event.context.wordCount = 0;
          }
          // Count words in this text chunk
          const words = event.text
            .trim()
            .split(/\s+/)
            .filter((w) => w.length > 0);
          event.context.wordCount += words.length;

          return {
            ...event,
            metadata: {
              totalWords: event.context.wordCount,
              wordsInChunk: words.length,
            },
          };
        }
        return event;
      },
    });

    // Feed multiple chunks
    parser.feed({ text: "Hello world" });
    parser.feed({ text: " this is" });
    parser.feed({ text: " a test" });
    parser.flush();

    const textEvents = events.filter((e) => e.type === "text");
    expect(textEvents.length).toBeGreaterThan(1);

    // Verify word count accumulates across chunks
    let maxWordCount = 0;
    for (const textEvent of textEvents) {
      if (textEvent.metadata?.totalWords) {
        maxWordCount = Math.max(maxWordCount, textEvent.metadata.totalWords);
      }
    }

    // Should have counted multiple words across all chunks
    expect(maxWordCount).toBeGreaterThan(1);
  });

  it("should allow plugins to maintain stateful syntax tracking", () => {
    const parser = new TokenLoom({
      suppressPluginErrors: true,
      tags: ["code"],
    });
    const events = collectEvents(parser);

    // Plugin that tracks bracket depth
    parser.use({
      name: "bracket-tracker",
      transform(event, api) {
        if (event.type === "text") {
          if (!event.context.bracketDepth) {
            event.context.bracketDepth = 0;
          }

          // Count brackets in this chunk
          for (const char of event.text) {
            if (char === "{" || char === "(" || char === "[") {
              event.context.bracketDepth++;
            } else if (char === "}" || char === ")" || char === "]") {
              event.context.bracketDepth = Math.max(
                0,
                event.context.bracketDepth - 1
              );
            }
          }

          return {
            ...event,
            metadata: {
              bracketDepth: event.context.bracketDepth,
            },
          };
        }
        return event;
      },
    });

    // Feed code with nested brackets
    parser.feed({ text: "function test() {" });
    parser.feed({ text: " if (true) {" });
    parser.feed({ text: " return [1, 2]; } }" });
    parser.flush();

    const textEvents = events.filter((e) => e.type === "text");

    // Should track bracket depth changes
    let foundNonZeroDepth = false;
    let foundZeroDepth = false;

    for (const textEvent of textEvents) {
      if (textEvent.metadata?.bracketDepth > 0) {
        foundNonZeroDepth = true;
      }
      if (textEvent.metadata?.bracketDepth === 0) {
        foundZeroDepth = true;
      }
    }

    expect(foundNonZeroDepth).toBe(true);
    expect(foundZeroDepth).toBe(true);
  });

  it("should provide access to shared context via getSharedContext", () => {
    const parser = new TokenLoom();

    const sharedContext = parser.getSharedContext();
    expect(sharedContext).toBeDefined();
    expect(typeof sharedContext).toBe("object");

    // Should be able to modify it
    sharedContext.testKey = "testValue";
    expect(parser.getSharedContext().testKey).toBe("testValue");
  });
});
