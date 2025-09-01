import { EventBus } from "./events";
import { StreamingParser } from "./parser/parser.class";
import type {
  Event,
  ParserOptions,
  IPlugin,
  IPluginAPI,
  SourceChunk,
} from "./types";

export class TokenLoom {
  private bus = new EventBus();
  private parser: StreamingParser;
  private eventQueue: Event[] = [];
  private waitingResolvers: Array<(v: IteratorResult<Event>) => void> = [];

  constructor(opts?: ParserOptions) {
    this.parser = new StreamingParser(opts);
  }

  use(plugin: IPlugin): this {
    this.bus.use(plugin);
    return this;
  }

  remove(plugin: IPlugin): this {
    this.bus.remove(plugin);
    return this;
  }

  private dispatch(events: Event[]): void {
    for (const e of events) {
      // keep bus context up to date
      this.bus.setContext(this.parser.getContext());
      this.bus.emit(e);
      this.enqueueEvent(e);
    }
  }

  private enqueueEvent(e: Event): void {
    if (this.waitingResolvers.length) {
      const resolve = this.waitingResolvers.shift()!;
      resolve({ value: e, done: false });
    } else {
      this.eventQueue.push(e);
    }
  }

  feed(chunk: SourceChunk): void {
    const events = this.parser.feedText(chunk.text);
    this.dispatch(events);
  }

  flush(): void {
    const events = this.parser.flush();
    this.dispatch(events);
  }

  dispose(): void {
    this.bus.dispose();
    // Clear any pending async iterators
    while (this.waitingResolvers.length) {
      const resolve = this.waitingResolvers.shift()!;
      resolve({ value: undefined as any, done: true });
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<Event> {
    return {
      next: async (): Promise<IteratorResult<Event>> => {
        if (this.eventQueue.length) {
          const e = this.eventQueue.shift()!;
          return { value: e, done: false };
        }
        return new Promise<IteratorResult<Event>>((resolve) => {
          this.waitingResolvers.push(resolve);
        });
      },
    };
  }
}

export type {
  Event,
  ParserOptions,
  IPlugin as Plugin,
  IPluginAPI as PluginAPI,
} from "./types";
