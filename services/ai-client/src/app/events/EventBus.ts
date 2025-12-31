import { EventBusInterface } from '@app/events/contracts';
import { EventHandler, Middleware, Unsubscribe, EmitMode, EmitStrategies } from '@app/events/types';
import { WildcardInterface } from '@app/wildcards/contracts';
import { MemoryCache } from '@app/cache/MemoryCache';

export class EventBus<E extends Record<string, any>> implements EventBusInterface<E> {
  private handlers = new Map<string, Set<EventHandler<any>>>();
  private middlewares = new Map<string, Set<Middleware<any>>>();
  constructor(
    private readonly wildcards: WildcardInterface,
    private readonly opts: { validatePatterns?: boolean, mode?: EmitMode } = {
      validatePatterns: true, mode: EmitMode.Sequential
    }
  ) {}

  /**
   * Subscribe handler for an exact event key or wildcard pattern.
   * Returns an unsubscribe function.
   *
   * @example
   * bus.on('user.created', (p) => {...})
   * bus.on('user.*', (p) => {...})
   */
  on<K extends keyof E>(eventOrPattern: K | string, handler: EventHandler<E[K]>): Unsubscribe {
    return this.subscribe(this.handlers, String(eventOrPattern), handler as EventHandler<any>);
  }

  /**
   * Register middleware for an exact event key or wildcard pattern.
   * Middlewares are executed sequentially in `run()` and may stop the chain by NOT calling `next`.
   *
   * @example
   * bus.use('http.request', async (ctx, next) => next({ ...ctx, traceId: '...' }))
   */
  use<K extends keyof E>(eventOrPattern: K | string, mw: Middleware<E[K]>): Unsubscribe {
    return this.subscribe(this.middlewares, String(eventOrPattern), mw as Middleware<any>);
  }

  /**
   * Emit event to handlers.
   * By default, uses sequential mode; can be overridden per-call.
   *
   * @example
   * await bus.emit('user.created', payload)
   * await bus.emit('user.created', payload, { mode: EmitMode.Parallel })
   */
  async emit<K extends keyof E>( event: K, payload: E[K], opts: { mode?: EmitMode } = {}): Promise<void> {
    const mode: EmitMode = opts.mode ?? this.opts.mode ?? EmitMode.Sequential;
    const all = this.collect<EventHandler<any>>(String(event), this.handlers) as Array<EventHandler<E[K]>>;
    if (all.length === 0) {
      return;
    }

    await EmitStrategies[mode].run(all, payload);
  }

  /**
   * Run the middleware pipeline for the event and return the final context.
   * If no middleware matches, returns `initial` as-is.
   *
   * Middleware-stop: if middleware returns without calling next, the chain stops.
   */
  async run<K extends keyof E>(event: K, initial: E[K]): Promise<E[K]> {
    const mws = this.collect<Middleware<any>>(String(event), this.middlewares) as Array<Middleware<E[K]>>;
    if (mws.length === 0) {
      return initial;
    }

    const dispatch = async (i: number, ctx: E[K]): Promise<E[K]> => {
      const mw = mws[i];
      if (!mw) {
        return ctx;
      }

      return mw(ctx, (nextCtx: E[K]) => dispatch(i + 1, nextCtx));
    };

    return dispatch(0, initial);
  }

  /**
   * Internal helper for subscription. Validates wildcard patterns (optional),
   * stores fn in a Set, and returns Unsubscribe.
   */
  protected subscribe<T>(map: Map<string, Set<T>>, key: string, fn: T): Unsubscribe
  {
    if (this.opts.validatePatterns && key.includes('*')) {
      this.wildcards.validatePattern(key);
    }

    const set = map.get(key) ?? new Set<T>();
    set.add(fn);
    map.set(key, set);

    return () => {
      const set = map.get(key);
      if (!set) {
        return;
      }

      set.delete(fn);
      if (set.size === 0) {
        map.delete(key);
      }
    };
  }

  /**
   * Collect matching items from for an event key using candidate keys from resolver.
   * Order is determined by candidate keys order + Set insertion order.
   */
  protected collect<T>(event: string, map: Map<string, Set<T>>): T[] {
    const keys = this.wildcards.getCandidateKeys(event);
    const out: T[] = [];

    for (const k of keys) {
      const set = map.get(k);
      if (!set || set.size === 0) {
        continue;
      }
      out.push(...set);
    }

    return out;
  }
}
