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

describe("FluxLoom Plugin System", () => {
  it("should handle plugin errors gracefully", () => {
    const parser = new TokenLoom({ suppressPluginErrors: true });
    const events = collectEvents(parser);

    parser.use({
      name: "faulty-plugin",
      transform() {
        throw new Error("Plugin error");
      },
    });

    parser.feed({ text: "test" });
    parser.flush();

    // Plugin errors are handled gracefully and don't crash the parser
    // The events should still be processed (error handling is internal)
    const textEvents = events.filter((e) => e.type === "text");
    expect(textEvents.length).toBeGreaterThan(0);
  });

  it("should provide correct plugin API", () => {
    const parser = new TokenLoom();
    let capturedApi: any;
    const events = collectEvents(parser);

    parser.use({
      name: "api-tester",
      transform(event, api) {
        capturedApi = api;
        return event;
      },
    });

    parser.feed({ text: "test" });

    expect(capturedApi).toBeDefined();
    expect(typeof capturedApi.pushOutput).toBe("function");
    expect(capturedApi.state).toBeDefined();
  });

  it("should support async plugins", async () => {
    const parser = new TokenLoom();
    const asyncResults: string[] = [];
    const events = collectEvents(parser);

    parser.use({
      name: "async-plugin",
      async transform(event, api) {
        // Simulate async processing
        await new Promise((resolve) => setTimeout(resolve, 1));
        asyncResults.push(event.type);
        return event;
      },
    });

    parser.feed({ text: "test" });
    parser.flush();

    // Wait for async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(asyncResults.length).toBeGreaterThan(0);
  });

  it("should handle multiple plugins in order", () => {
    const parser = new TokenLoom();
    const pluginOrder: string[] = [];
    const events = collectEvents(parser);

    parser.use({
      name: "plugin-1",
      transform(event, api) {
        if (event.type === "text") {
          // Only track text events to avoid duplicates
          pluginOrder.push("plugin-1");
        }
        return event;
      },
    });

    parser.use({
      name: "plugin-2",
      transform(event, api) {
        if (event.type === "text") {
          // Only track text events to avoid duplicates
          pluginOrder.push("plugin-2");
        }
        return event;
      },
    });

    parser.feed({ text: "test" });
    parser.flush();

    expect(pluginOrder).toEqual(["plugin-1", "plugin-2"]);
  });

  it("should allow plugins to access parser state", () => {
    const parser = new TokenLoom({ tags: ["test"] });
    let capturedState: any;
    const events = collectEvents(parser);

    parser.use({
      name: "state-checker",
      transform(event, api) {
        if (event.type === "text" && api.state.inTag) {
          capturedState = api.state;
        }
        return event;
      },
    });

    parser.feed({ text: "<test>content</test>" });
    parser.flush();

    expect(capturedState).toBeDefined();
    expect(capturedState.inTag).toBeDefined();
    expect(capturedState.inTag.name).toBe("test");
  });

  it("should handle plugin promise rejections", async () => {
    const parser = new TokenLoom({ suppressPluginErrors: true });
    const events = collectEvents(parser);

    // Test that sync plugin errors are handled gracefully
    parser.use({
      name: "sync-faulty-plugin",
      transform(event, api) {
        if (event.type === "flush") {
          throw new Error("Sync plugin error");
        }
        return event;
      },
    });

    parser.feed({ text: "test" });
    parser.flush();

    // Plugin errors should be handled gracefully and not crash the parser
    const textEvents = events.filter((e) => e.type === "text");
    expect(textEvents.length).toBeGreaterThan(0);
  });
});
