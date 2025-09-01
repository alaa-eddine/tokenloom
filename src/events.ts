import type { Context, Event, IPlugin, IPluginAPI } from "./types";

export class EventBus {
  private listeners: IPlugin[] = [];
  private outputBuffer: string[] = [];
  private context: Context = {};
  private drainResolvers: Array<() => void> = [];

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
    for (const l of this.listeners) {
      if (!l.onEvent) continue;
      try {
        const maybePromise = l.onEvent(event, api) as unknown;
        if (
          maybePromise &&
          typeof (maybePromise as Promise<void>).then === "function"
        ) {
          (maybePromise as Promise<void>).catch((err) => {
            const reason = err instanceof Error ? err.message : String(err);
            const errorEvent: Event = {
              type: "error",
              reason,
              recoverable: true,
            };
            for (const l2 of this.listeners) {
              try {
                const mp = l2.onEvent?.(errorEvent, api) as unknown;
                if (mp && typeof (mp as Promise<void>).then === "function") {
                  (mp as Promise<void>).catch(() => {
                    // swallow nested plugin promise rejections
                  });
                }
              } catch {
                // ignore nested plugin errors
              }
            }
          });
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        const errorEvent: Event = { type: "error", reason, recoverable: true };
        // Fan out error to all listeners, but swallow any further errors
        for (const l2 of this.listeners) {
          try {
            const mp = l2.onEvent?.(errorEvent, api) as unknown;
            if (mp && typeof (mp as Promise<void>).then === "function") {
              (mp as Promise<void>).catch(() => {
                // swallow nested plugin promise rejections
              });
            }
          } catch {
            // ignore nested plugin errors
          }
        }
      }
    }
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
