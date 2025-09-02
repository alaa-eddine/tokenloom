import type { Event, IPlugin, IPluginAPI } from "../types";

export abstract class Plugin implements IPlugin {
  abstract name: string;
  onInit?(api: IPluginAPI): void | Promise<void>;
  onDispose?(): void | Promise<void>;

  // Transformation pipeline methods
  preTransform?(event: Event, api: IPluginAPI): Event | Event[] | null;
  transform?(event: Event, api: IPluginAPI): Event | Event[] | null;
  postTransform?(event: Event, api: IPluginAPI): Event | Event[] | null;
}
