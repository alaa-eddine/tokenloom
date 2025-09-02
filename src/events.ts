import type {
  Context,
  Event,
  IPlugin,
  IPluginAPI,
  ParserOptions,
} from "./types";

export class EventBus {
  private listeners: IPlugin[] = [];
  private outputBuffer: string[] = [];
  private context: Context = {};
  private drainResolvers: Array<() => void> = [];
  private suppressPluginErrors: boolean;

  constructor(options?: ParserOptions) {
    this.suppressPluginErrors = options?.suppressPluginErrors ?? false;
  }

  use(plugin: IPlugin): void {
    this.listeners.push(plugin);
    // Call optional init hook
    const api: IPluginAPI = {
      pushOutput: (s: string) => this.outputBuffer.push(s),
      state: this.getContext(),
    };
    try {
      const maybe = plugin.onInit?.(api) as unknown;
      if (maybe && typeof (maybe as Promise<void>).then === "function") {
        (maybe as Promise<void>).catch(() => {
          // ignore init errors to avoid breaking registration
        });
      }
    } catch {
      // ignore init errors
    }
  }

  remove(plugin: IPlugin): void {
    const idx = this.listeners.indexOf(plugin);
    if (idx !== -1) {
      const [p] = this.listeners.splice(idx, 1);
      try {
        const maybe = p.onDispose?.() as unknown;
        if (maybe && typeof (maybe as Promise<void>).then === "function") {
          (maybe as Promise<void>).catch(() => {
            // ignore dispose errors
          });
        }
      } catch {
        // ignore dispose errors
      }
    }
  }

  dispose(): void {
    for (const p of this.listeners.splice(0)) {
      try {
        const maybe = p.onDispose?.() as unknown;
        if (maybe && typeof (maybe as Promise<void>).then === "function") {
          (maybe as Promise<void>).catch(() => {
            // ignore dispose errors
          });
        }
      } catch {
        // ignore dispose errors
      }
    }
    this.outputBuffer = [];
    this.drainResolvers.length = 0;
  }

  setContext(next: Context): void {
    this.context = { ...next };
  }

  getContext(): Context {
    return { ...this.context };
  }

  emit(event: Event): void {
    // Transform the event through the plugin pipeline before emitting
    const transformedEvents = this.transformEvent(event);

    for (const transformedEvent of transformedEvents) {
      this.emitTransformedEvent(transformedEvent);
    }
  }

  transformEvent(event: Event): Event[] {
    const effectiveState: Context =
      "in" in event && (event as any).in
        ? ((event as any).in as Context)
        : this.getContext();
    const api: IPluginAPI = {
      pushOutput: (s: string) => {
        this.outputBuffer.push(s);
      },
      state: effectiveState,
    };

    let events: Event[] = [event];

    // Pre-transform phase
    for (const plugin of this.listeners) {
      if (!plugin.preTransform) continue;
      try {
        const newEvents: Event[] = [];
        for (const evt of events) {
          const result = plugin.preTransform(evt, api);
          if (result === null) {
            // Plugin filtered out this event
            continue;
          } else if (Array.isArray(result)) {
            newEvents.push(...result);
          } else {
            newEvents.push(result);
          }
        }
        events = newEvents;
      } catch (err) {
        // Handle transform errors gracefully
        if (!this.suppressPluginErrors) {
          console.warn(`Plugin ${plugin.name} preTransform error:`, err);
        }
      }
    }

    // Transform phase
    for (const plugin of this.listeners) {
      if (!plugin.transform) continue;
      try {
        const newEvents: Event[] = [];
        for (const evt of events) {
          const result = plugin.transform(evt, api);
          if (result === null) {
            // Plugin filtered out this event
            continue;
          } else if (Array.isArray(result)) {
            newEvents.push(...result);
          } else {
            newEvents.push(result);
          }
        }
        events = newEvents;
      } catch (err) {
        // Handle transform errors gracefully
        if (!this.suppressPluginErrors) {
          console.warn(`Plugin ${plugin.name} transform error:`, err);
        }
      }
    }

    // Post-transform phase
    for (const plugin of this.listeners) {
      if (!plugin.postTransform) continue;
      try {
        const newEvents: Event[] = [];
        for (const evt of events) {
          const result = plugin.postTransform(evt, api);
          if (result === null) {
            // Plugin filtered out this event
            continue;
          } else if (Array.isArray(result)) {
            newEvents.push(...result);
          } else {
            newEvents.push(result);
          }
        }
        events = newEvents;
      } catch (err) {
        // Handle transform errors gracefully
        if (!this.suppressPluginErrors) {
          console.warn(`Plugin ${plugin.name} postTransform error:`, err);
        }
      }
    }

    return events;
  }

  private emitTransformedEvent(event: Event): void {
    // This method is no longer needed since we emit directly from TokenLoom
    // But we keep it for the old emit() method compatibility

    // resolve any waiters after event dispatch, in case they depend on output
    if (this.drainResolvers.length && this.outputBuffer.length) {
      const rs = [...this.drainResolvers];
      this.drainResolvers.length = 0;
      for (const r of rs) r();
    }
  }

  takeOutput(): string[] {
    const out = this.outputBuffer;
    this.outputBuffer = [];
    return out;
  }

  waitForOutput(): Promise<void> {
    if (this.outputBuffer.length > 0) return Promise.resolve();
    return new Promise((resolve) => this.drainResolvers.push(resolve));
  }
}
