import type { EventBusInterface } from '@app/events/contracts';
import { Unsubscribe, Meta, META, MetaTypes, EventHandler, Middleware, Disposable, MetaTypeValue } from '@app/events/types';

function debounceHandler<T>(fn: (p: T) => any, ms: number): (p: T) => void {
  let t: any;
  let last: T | undefined;

  return (payload: T) => {
    last = payload;
    clearTimeout(t);
    t = setTimeout(() => fn(last as T), ms);
  };
}

export type DecoratorHook = {
  onSubscribe?: (info: {
    kind: MetaTypeValue;
    pattern: string;
    method: string;
    group?: string;
    priority?: number;
  }) => void;
};

export class Decorators {
  static register<E extends Record<string, any>>(
    bus: EventBusInterface<E>,
    instance: object,
    hook: DecoratorHook = {}
  ): Disposable | null {
    const ctor: any = (instance as any).constructor;
    const meta: Meta | undefined = ctor[META];

    if (!meta || meta.length === 0) {
      return null;
    }

    const unsubs: Unsubscribe[] = [];
    for (const module of this.orderPerEvent( meta ) ) {
      const fn = (instance as any)[module.method];
      if ( 'function' !== typeof fn) {
        throw new Error(`@${module.kind} handler "${String(module.method)}" is not a method`);
      }

      hook.onSubscribe?.({
        kind: module.kind,
        pattern: module.pattern,
        method: String(module.method),
        group: module.options?.group,
        priority: module.options?.priority,
      });

      if (MetaTypes.On === module.kind) {
        let handler: EventHandler<any> = (payload) => fn.call(instance, payload);

        // Debounce
        const debounceMs = module.options?.debounceMs;
        if ('number' === typeof debounceMs && debounceMs > 0) {
          const debounced = debounceHandler<any>((p) => fn.call(instance, p), debounceMs);
          handler = (payload) => debounced(payload);
        }

        // Once
        if (module.options?.once) {
          let off: Unsubscribe | null = null;
          const onceHandler: EventHandler<any> = async (payload) => {
            off?.();
            off = null;
            await handler(payload);
          };
          off = bus.on(module.pattern as any, onceHandler as any);
          unsubs.push(off);
          continue;
        }

        unsubs.push(bus.on(module.pattern as any, handler as any));
        continue;
      }

      const mw: Middleware<any> = (ctx, next) => fn.call(instance, ctx, next);
      unsubs.push(bus.use(module.pattern as any, mw as any))
    }

    return { dispose: () => unsubs.forEach((u) => u()) };
  }

  private static orderPerEvent(meta: Meta): Meta {
    const keysInOrder: string[] = [];
    const groups = new Map<string, Array<{ m: Meta[number]; i: number }>>();
    const groupKey = (m: Meta[number]) => `${m.kind}|${m.pattern}`;

    meta.forEach((m, i) => {
      const k = groupKey(m);
      if (!groups.has(k)) {
        groups.set(k, []);
        keysInOrder.push(k);
      }
      groups.get(k)!.push({ m, i });
    });

    const out: Meta = [];
    for (const k of keysInOrder) {
      const arr = groups.get(k)!;
      arr.sort((a, b) => {
        const pa = a.m.options?.priority ?? 0;
        const pb = b.m.options?.priority ?? 0;
        if (pa !== pb) { // higher priority -> earlier
          return pb - pa;
        }

        return a.i - b.i;
      });

      out.push(...arr.map(x => x.m));
    }

    return out;
  }
}
