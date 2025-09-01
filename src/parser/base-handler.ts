import type { Event } from "../types";
import type { InternalState, Opts } from "./types";

export abstract class BaseHandler {
  protected state: InternalState;
  protected opts: Opts;

  constructor(state: InternalState, opts: Opts) {
    this.state = state;
    this.opts = opts;
  }

  abstract process(): Event[];
}
