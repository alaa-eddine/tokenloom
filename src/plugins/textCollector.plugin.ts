import type { IPluginAPI } from "../types";
import { Plugin } from "./plugin.class";

export class TextCollectorPlugin extends Plugin {
  name = "text-collector";
  private buffer = "";

  getText(): string {
    return this.buffer;
  }

  onEvent(e: any, _api: IPluginAPI): void {
    if (e.type === "text" || e.type === "code-fence-chunk") {
      this.buffer += e.text;
    }
  }
}
