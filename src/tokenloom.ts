import { EventEmitter } from "events";
import { EventBus } from "./events";
import { StreamingParser } from "./parser/parser.class";
import type {
  Event,
  ParserOptions,
  IPlugin,
  IPluginAPI,
  SourceChunk,
} from "./types";

export class TokenLoom extends EventEmitter {
  private bus: EventBus;
  private parser: StreamingParser;
  private eventQueue: Event[] = [];
  private waitingResolvers: Array<(v: IteratorResult<Event>) => void> = [];
  private sharedContext: Record<string, any> = {};
  private options: ParserOptions;

  // Delay mechanism state
  private delayQueue: Event[] = [];
  private isProcessingDelay: boolean = false;
  private flushPromises: Array<() => void> = [];

  constructor(opts?: ParserOptions) {
    super();
    this.options = opts ?? {};
    this.parser = new StreamingParser(opts);
    this.bus = new EventBus(opts);
  }

  use(plugin: IPlugin): this {
    this.bus.use(plugin);
    return this;
  }

  remove(plugin: IPlugin): this {
    this.bus.remove(plugin);
    return this;
  }

  getSharedContext(): Record<string, any> {
    return this.sharedContext;
  }

  private dispatch(events: Event[]): void {
    const emitDelay = this.options.emitDelay ?? 0;

    if (emitDelay <= 0) {
      // No delay, emit immediately
      this.dispatchEventsSync(events);
    } else {
      // Add events to delay queue and start processing if not already running
      this.delayQueue.push(...events);
      this.startDelayedProcessing(emitDelay);
    }
  }

  private dispatchEventsSync(events: Event[]): void {
    for (const e of events) {
      this.emitSingleEvent(e);
    }
  }

  private startDelayedProcessing(delay: number): void {
    if (this.isProcessingDelay) {
      // Already processing, events will be handled in sequence
      return;
    }

    this.isProcessingDelay = true;
    this.processNextDelayedEvent(delay);
  }

  private processNextDelayedEvent(delay: number): void {
    if (this.delayQueue.length === 0) {
      this.isProcessingDelay = false;
      // Check if we just finished a flush and need to emit end event
      this.checkForFlushCompletion();
      return;
    }

    const event = this.delayQueue.shift()!;
    this.emitSingleEvent(event);

    // Schedule next event if there are more
    if (this.delayQueue.length > 0) {
      setTimeout(() => this.processNextDelayedEvent(delay), delay);
    } else {
      this.isProcessingDelay = false;
      // Check if we just finished a flush and need to emit end event
      this.checkForFlushCompletion();
    }
  }

  private checkForFlushCompletion(): void {
    if (
      this.flushPromises.length > 0 &&
      this.delayQueue.length === 0 &&
      !this.isProcessingDelay
    ) {
      // Emit end event
      const endEvent = { type: "end" as const, context: this.sharedContext };
      this.emitSingleEvent(endEvent);

      // Resolve all pending flush promises
      while (this.flushPromises.length > 0) {
        const resolve = this.flushPromises.shift()!;
        resolve();
      }
    }
  }

  private emitSingleEvent(e: Event): void {
    // keep bus context up to date
    this.bus.setContext(this.parser.getContext());

    // Add shared context to the event (always defined)
    const eventWithContext = { ...e, context: this.sharedContext };

    // Transform the event through the plugin pipeline
    const transformedEvents = this.bus.transformEvent(eventWithContext);

    for (const transformedEvent of transformedEvents) {
      // Emit directly on the parser instance
      this.emit(transformedEvent.type, transformedEvent);
      this.emit("*", transformedEvent); // Emit on wildcard for catch-all listeners

      // Also enqueue for async iterator
      this.enqueueEvent(transformedEvent);
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

  flush(): Promise<void> {
    const events = this.parser.flush();
    this.dispatch(events);

    const emitDelay = this.options.emitDelay ?? 0;

    if (emitDelay <= 0) {
      // No delay, emit end event immediately and resolve
      const endEvent = { type: "end" as const, context: this.sharedContext };
      this.emitSingleEvent(endEvent);
      return Promise.resolve();
    } else {
      // Return promise that resolves when queue is emptied
      return new Promise<void>((resolve) => {
        this.flushPromises.push(resolve);
        // If queue is already empty, resolve immediately
        this.checkForFlushCompletion();
      });
    }
  }

  dispose(): void {
    this.bus.dispose();
    // Clear any pending async iterators
    while (this.waitingResolvers.length) {
      const resolve = this.waitingResolvers.shift()!;
      resolve({ value: undefined as any, done: true });
    }
    // Resolve any pending flush promises
    while (this.flushPromises.length) {
      const resolve = this.flushPromises.shift()!;
      resolve();
    }
    // Clear delay queue
    this.delayQueue = [];
    this.isProcessingDelay = false;
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
