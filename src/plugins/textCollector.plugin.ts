import type { Event, IPluginAPI } from "../types";
import { Plugin } from "./plugin.class";

export class TextCollectorPlugin extends Plugin {
  name = "text-collector";
  private buffer = "";

  getText(): string {
    return this.buffer;
  }

  postTransform(event: Event, _api: IPluginAPI): Event {
    if (event.type === "text" || event.type === "code-fence-chunk") {
      this.buffer += event.text;
    }
    return event; // Pass through unchanged
  }
}
