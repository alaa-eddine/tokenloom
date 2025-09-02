import type { Event, IPluginAPI } from "../types";
import { Plugin } from "./plugin.class";

export class LoggerPlugin extends Plugin {
  name = "logger";
  private log: (msg: string) => void;

  constructor(log: (msg: string) => void = console.log) {
    super();
    this.log = log;
  }

  onInit(api: IPluginAPI): void {
    // no-op, but available for future
  }

  // LoggerPlugin now uses postTransform to log events as they pass through
  postTransform(event: Event, api: IPluginAPI): Event {
    switch (event.type) {
      case "text":
        this.log(`[TEXT] "${event.text}" in=${JSON.stringify(event.in ?? {})}`);
        break;
      case "tag-open":
        this.log(`[TAG OPEN] <${event.name}>`);
        break;
      case "tag-close":
        this.log(`[TAG CLOSE] </${event.name}>`);
        break;
      case "code-fence-start":
        this.log(`[CODE START] ${event.fence} lang=${event.lang ?? ""}`.trim());
        break;
      case "code-fence-chunk":
        this.log(`[CODE] ${event.text}`);
        break;
      case "code-fence-end":
        this.log(`[CODE END]`);
        break;
      case "flush":
        this.log(`[FLUSH]`);
        break;
      case "error":
        this.log(`[ERROR] ${event.reason}`);
        break;
    }
    return event; // Pass through unchanged
  }
}
