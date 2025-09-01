import type { IPluginAPI } from "../types";
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

  onEvent(e: any): void {
    this.emit("*", e);
    switch (e.type) {
      case "text":
        this.log(`[TEXT] "${e.text}" in=${JSON.stringify(e.in ?? {})}`);
        this.emit("text", e);
        break;
      case "tag-open":
        this.log(`[TAG OPEN] <${e.name}>`);
        this.emit("tag-open", e);
        break;
      case "tag-close":
        this.log(`[TAG CLOSE] </${e.name}>`);
        this.emit("tag-close", e);
        break;
      case "code-fence-start":
        this.log(`[CODE START] ${e.fence} lang=${e.lang ?? ""}`.trim());
        this.emit("code-fence-start", e);
        break;
      case "code-fence-chunk":
        this.log(`[CODE] ${e.text}`);
        this.emit("code-fence-chunk", e);
        break;
      case "code-fence-end":
        this.log(`[CODE END]`);
        this.emit("code-fence-end", e);
        break;
      case "flush":
        this.log(`[FLUSH]`);
        this.emit("flush", e);
        break;
      case "error":
        this.log(`[ERROR] ${e.reason}`);
        this.emit("error", e);
        break;
    }
  }
}
