import { describe, it, expect } from "vitest";
import { TokenLoom } from "../src/tokenloom";

describe("Transformation Pipeline", () => {
  it("should apply preTransform, transform, and postTransform in order", () => {
    const parser = new TokenLoom({
      emitUnit: "token",
      tags: [],
    });

    const transformOrder: string[] = [];
    const events: any[] = [];

    // Plugin that tracks transformation order
    parser.use({
      name: "transform-tracker",

      preTransform(event, api) {
        transformOrder.push(`pre:${event.type}`);
        return { ...event, preProcessed: true };
      },

      transform(event, api) {
        transformOrder.push(`transform:${event.type}`);
        return { ...event, transformed: true };
      },

      postTransform(event, api) {
        transformOrder.push(`post:${event.type}`);
        return { ...event, postProcessed: true };
      },
    });

    // Listen to events directly on the parser
    parser.on("*", (event) => {
      events.push(event);
    });

    parser.feed({ text: "hello" });
    parser.flush();

    // Verify transformation order
    expect(transformOrder).toContain("pre:text");
    expect(transformOrder).toContain("transform:text");
    expect(transformOrder).toContain("post:text");

    // Verify the order is correct (pre -> transform -> post)
    const preIndex = transformOrder.indexOf("pre:text");
    const transformIndex = transformOrder.indexOf("transform:text");
    const postIndex = transformOrder.indexOf("post:text");

    expect(preIndex).toBeLessThan(transformIndex);
    expect(transformIndex).toBeLessThan(postIndex);

    // Verify the event was transformed
    const textEvent = events.find((e) => e.type === "text");
    expect(textEvent).toBeDefined();
    expect(textEvent.preProcessed).toBe(true);
    expect(textEvent.transformed).toBe(true);
    expect(textEvent.postProcessed).toBe(true);
  });

  it("should allow plugins to filter events by returning null", () => {
    const parser = new TokenLoom({
      emitUnit: "token",
      tags: [],
    });

    const events: any[] = [];

    // Plugin that filters out events containing "filter"
    parser.use({
      name: "event-filter",

      transform(event, api) {
        if (event.type === "text" && event.text === "filter") {
          return null; // Filter out this event
        }
        return event;
      },
    });

    // Listen to events directly on the parser
    parser.on("*", (event) => {
      events.push(event);
    });

    parser.feed({ text: "keep filter out" });
    parser.flush();

    // Should have events but not the "filter" token
    const textEvents = events.filter((e) => e.type === "text");
    expect(textEvents.length).toBeGreaterThan(0);
    // No events with text "filter" should exist
    expect(textEvents.some((e) => e.text === "filter")).toBe(false);
    // But should have other tokens
    expect(textEvents.some((e) => e.text === "keep")).toBe(true);
  });

  it("should allow plugins to split events by returning arrays", () => {
    const parser = new TokenLoom({
      emitUnit: "token",
      tags: [],
    });

    const events: any[] = [];

    // Plugin that splits specific tokens
    parser.use({
      name: "text-splitter",

      transform(event, api) {
        if (event.type === "text" && event.text === "hello-world") {
          // Split the hyphenated token into multiple events
          return [
            { ...event, text: "hello", split: true },
            { ...event, text: "world", split: true },
          ];
        }
        return event;
      },
    });

    // Listen to events directly on the parser
    parser.on("*", (event) => {
      events.push(event);
    });

    parser.feed({ text: "hello-world" });
    parser.flush();

    // Should have split the token into separate events
    const splitEvents = events.filter((e) => e.type === "text" && e.split);
    expect(splitEvents.length).toBe(2);
    expect(splitEvents.some((e) => e.text === "hello")).toBe(true);
    expect(splitEvents.some((e) => e.text === "world")).toBe(true);
  });

  it("should handle syntax highlighting for code blocks", () => {
    const parser = new TokenLoom({
      emitUnit: "token",
      tags: [],
    });

    const events: any[] = [];

    // Simple syntax highlighter
    parser.use({
      name: "syntax-highlighter",

      transform(event, api) {
        if (
          event.type === "code-fence-chunk" &&
          api.state.inCodeFence?.lang === "javascript"
        ) {
          // Simple keyword highlighting
          let highlighted = event.text;
          const keywords = ["function", "const", "let", "var", "return"];

          for (const keyword of keywords) {
            if (highlighted === keyword) {
              highlighted = `[KEYWORD]${highlighted}[/KEYWORD]`;
              break;
            }
          }

          return {
            ...event,
            text: highlighted,
            highlighted: true,
          };
        }
        return event;
      },
    });

    // Listen to events directly on the parser
    parser.on("*", (event) => {
      events.push(event);
    });

    // Feed JavaScript code
    parser.feed({
      text: "```javascript\nfunction test() {\n  return 42;\n}\n```",
    });
    parser.flush();

    // Find highlighted events
    const codeEvents = events.filter(
      (e) => e.type === "code-fence-chunk" && e.highlighted
    );
    expect(codeEvents.length).toBeGreaterThan(0);

    // Check if keywords were highlighted
    const functionEvent = codeEvents.find((e) =>
      e.text.includes("[KEYWORD]function[/KEYWORD]")
    );
    const returnEvent = codeEvents.find((e) =>
      e.text.includes("[KEYWORD]return[/KEYWORD]")
    );

    expect(functionEvent || returnEvent).toBeDefined();
  });

  it("should work with direct event listeners", () => {
    const parser = new TokenLoom({
      emitUnit: "token",
      tags: [],
    });

    const events: any[] = [];

    // Listen to events directly on the parser (new style)
    parser.on("*", (event) => {
      events.push({ ...event, legacy: true });
    });

    parser.feed({ text: "test" });
    parser.flush();

    // Should work with direct event listeners
    const textEvent = events.find((e) => e.type === "text");
    expect(textEvent).toBeDefined();
    expect(textEvent.legacy).toBe(true);
    expect(textEvent.text).toBe("test");
  });
});
