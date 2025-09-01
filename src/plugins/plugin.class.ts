import type { Event, IPlugin, IPluginAPI } from "../types";
import { EventEmitter } from "events";

export abstract class Plugin extends EventEmitter implements IPlugin {
  abstract name: string;
  onInit?(api: IPluginAPI): void | Promise<void>;
  onEvent?(e: Event, api: IPluginAPI): void | Promise<void>;
  onDispose?(): void | Promise<void>;
}
