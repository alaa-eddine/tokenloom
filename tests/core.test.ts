import { describe, it, expect } from "vitest";
import { TokenLoom, Event } from "../src/index";

describe("FluxLoom Core Functionality", () => {
  it("should create an instance with default options", () => {
    const parser = new TokenLoom();
    expect(parser).toBeInstanceOf(TokenLoom);
  });

  it("should handle simple text without tags or fences", () => {
    const parser = new TokenLoom();
    const events: Event[] = [];

    parser.use({
      name: "collector",
      onEvent(event) {
        events.push(event);
      },
    });

    parser.feed({ text: "Hello world" });
    parser.flush();

    const textEvents = events.filter((e) => e.type === "text");
    expect(textEvents.length).toBeGreaterThan(0);
    expect(textEvents.map((e) => e.text).join("")).toBe("Hello world");
  });

  it("should handle custom tags", () => {
    const parser = new TokenLoom({ tags: ["think"] });
    const events: Event[] = [];

    parser.use({
      name: "collector",
      onEvent(event) {
        events.push(event);
      },
    });

    parser.feed({ text: "<think>reasoning</think>" });
    parser.flush();

    const tagOpen = events.find((e) => e.type === "tag-open");
    const tagClose = events.find((e) => e.type === "tag-close");

    expect(tagOpen).toBeDefined();
    expect(tagOpen?.name).toBe("think");
    expect(tagClose).toBeDefined();
    expect(tagClose?.name).toBe("think");
  });

  it("should handle code fences", () => {
    const parser = new TokenLoom();
    const events: Event[] = [];

    parser.use({
      name: "collector",
      onEvent(event) {
        events.push(event);
      },
    });

    parser.feed({ text: '```javascript\nconsole.log("hello");\n```' });
    parser.flush();

    const fenceStart = events.find((e) => e.type === "code-fence-start");
    const fenceEnd = events.find((e) => e.type === "code-fence-end");
    const codeChunks = events.filter((e) => e.type === "code-fence-chunk");

    expect(fenceStart).toBeDefined();
    expect(fenceStart?.fence).toBe("```");
    expect(fenceStart?.lang).toBe("javascript");
    expect(fenceEnd).toBeDefined();
    expect(codeChunks.length).toBeGreaterThan(0);
  });

  it("should handle different emit units", () => {
    const testCases: Array<{
      unit: "token" | "word" | "grapheme";
      expectedMinEvents: number;
    }> = [
      { unit: "token", expectedMinEvents: 3 },
      //{ unit: "word", expectedMinEvents: 8 },
      //{ unit: "grapheme", expectedMinEvents: 15 },
    ];

    for (const testCase of testCases) {
      const parser = new TokenLoom({ emitUnit: testCase.unit });
      const events: Event[] = [];

      parser.use({
        name: "collector",
        onEvent(event) {
          events.push(event);
        },
      });

      parser.feed({ text: "Hello world test" });
      parser.flush();

      const textEvents = events.filter((e) => e.type === "text");
      expect(textEvents.length).toBeGreaterThanOrEqual(
        testCase.expectedMinEvents
      );
    }
  });

  it("should handle context tracking correctly", () => {
    const parser = new TokenLoom({ tags: ["outer"] });
    const events: Event[] = [];

    parser.use({
      name: "context-checker",
      onEvent(event) {
        events.push(event);
      },
    });

    parser.feed({ text: "before <outer>inside</outer> after" });
    parser.flush();

    // Find text events and check their context
    const textEvents = events.filter((e) => e.type === "text");
    const insideEvent = textEvents.find((e) => e.text === "inside");
    const beforeEvent = textEvents.find(
      (e) => e.text && e.text.includes("before")
    );
    const afterEvent = textEvents.find(
      (e) => e.text && e.text.includes("after")
    );

    expect(insideEvent?.in?.inTag?.name).toBe("outer");
    expect(beforeEvent?.in?.inTag).toBeUndefined();
    expect(afterEvent?.in?.inTag).toBeUndefined();
  });
});
