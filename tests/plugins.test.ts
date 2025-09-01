import { describe, it, expect } from "vitest";
import { TokenLoom, Event } from "../src/index";

describe("FluxLoom Plugin System", () => {
  it("should handle plugin errors gracefully", () => {
    const parser = new TokenLoom();
    const events: Event[] = [];

    parser.use({
      name: "faulty-plugin",
      onEvent() {
        throw new Error("Plugin error");
      },
    });

    parser.use({
      name: "collector",
      onEvent(event) {
        events.push(event);
      },
    });

    parser.feed({ text: "test" });
    parser.flush();

    const errorEvents = events.filter((e) => e.type === "error");
    expect(errorEvents.length).toBeGreaterThan(0);
    expect(errorEvents[0].reason).toContain("Plugin error");
  });

  it("should provide correct plugin API", () => {
    const parser = new TokenLoom();
    let capturedApi: any;

    parser.use({
      name: "api-tester",
      onEvent(event, api) {
        capturedApi = api;
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

    parser.use({
      name: "async-plugin",
      async onEvent(event) {
        if (event.type === "text") {
          await new Promise((resolve) => setTimeout(resolve, 1));
          asyncResults.push(event.text);
        }
      },
    });

    parser.feed({ text: "async test" });
    parser.flush();

    // Give async operations time to complete
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(asyncResults.length).toBeGreaterThan(0);
  });

  it("should handle multiple plugins in order", () => {
    const parser = new TokenLoom();
    const pluginOrder: string[] = [];

    parser.use({
      name: "plugin-1",
      onEvent(event) {
        if (event.type === "text") {
          pluginOrder.push("plugin-1");
        }
      },
    });

    parser.use({
      name: "plugin-2",
      onEvent(event) {
        if (event.type === "text") {
          pluginOrder.push("plugin-2");
        }
      },
    });

    parser.feed({ text: "test" });
    parser.flush();

    expect(pluginOrder).toEqual(["plugin-1", "plugin-2"]);
  });

  it("should allow plugins to access parser state", () => {
    const parser = new TokenLoom({ tags: ["test"] });
    let capturedState: any;

    parser.use({
      name: "state-checker",
      onEvent(event, api) {
        if (event.type === "text" && event.in?.inTag) {
          capturedState = api.state;
        }
      },
    });

    parser.feed({ text: "<test>content</test>" });
    parser.flush();

    expect(capturedState).toBeDefined();
    expect(capturedState.inTag).toBeDefined();
    expect(capturedState.inTag.name).toBe("test");
  });

  it("should handle plugin promise rejections", async () => {
    const parser = new TokenLoom();
    const events: Event[] = [];

    parser.use({
      name: "async-faulty-plugin",
      async onEvent() {
        throw new Error("Async plugin error");
      },
    });

    parser.use({
      name: "collector",
      onEvent(event) {
        events.push(event);
      },
    });

    parser.feed({ text: "test" });
    parser.flush();

    // Give async operations time to complete
    await new Promise((resolve) => setTimeout(resolve, 10));

    const errorEvents = events.filter((e) => e.type === "error");
    expect(errorEvents.length).toBeGreaterThan(0);
    expect(errorEvents[0].reason).toContain("Async plugin error");
  });
});
