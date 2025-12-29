import { BindAdapter, PluginCore } from '@app/decorators/contracts';
import { makeMethodPatch } from '@app/decorators/helpers';
import { Disposable, MetaEntry } from '@app/decorators/types';
import { MetaTypeValue, MetaTypes } from '@app/events/types';
import { EventBusInterface } from '@app/events/contracts';

type EventEntryBase = MetaEntry & {
  kind: MetaTypeValue;
};

export function eventsPlugin<E extends Record<string, any>>(channel = 'events') {
  type EventKey = Extract<keyof E, string>;

  return (core: PluginCore) => {
    const patch = makeMethodPatch(core);

    const onEvent =
      <K extends EventKey>(pattern: K, options?: Record<string, any>): MethodDecorator =>
        (t, k, d) => {
          core.ensureMethod(d, k);
          core.collector.push(t, { kind: MetaTypes.On, channel, pattern, method: k, options } satisfies EventEntryBase);
        };

    const onEventOnce = <K extends EventKey>(pattern: K): MethodDecorator =>
      onEvent(pattern, { once: true });

    const onEventDebounce = <K extends EventKey>(pattern: K, debounceMs: number): MethodDecorator =>
      onEvent(pattern, { debounceMs });

    const useMiddleware =
      <K extends EventKey>(pattern: K, options?: Record<string, any>): MethodDecorator =>
        (t, k, d) => {
          core.ensureMethod(d, k);
          core.collector.push(t, { kind: MetaTypes.Use, channel, pattern, method: k, options } satisfies EventEntryBase);
        };

    const MiddlewarePriority = (value: number): MethodDecorator => patch({ priority: value });
    const MiddlewareGroup = (name: string): MethodDecorator => patch({ group: name })

    return {
      onEvent,
      onEventOnce,
      onEventDebounce,
      useMiddleware,
      MiddlewarePriority,
      MiddlewareGroup
    } as const;
  };
}

export function eventBusAdapter<E extends Record<string, any>>(
  bus: EventBusInterface<E>,
  channel = 'events'
): BindAdapter {
  return {
    channel,
    bind(entry, instance): Disposable | null {
      const fn = (instance as any)[entry.method];
      if ('function' !== typeof fn ) {
        throw new Error(`@${entry.kind} "${String(entry.method)}" is not a method`);
      }

      if (entry.kind === MetaTypes.On) {
        let handler: any = (payload: any) => fn.call(instance, payload);
        const debounceMs = entry.options?.debounceMs;

        // Debounce
        if (typeof debounceMs === 'number' && debounceMs > 0) {
          let t: any;
          let last: any;
          handler = (payload: any) => {
            last = payload;
            clearTimeout(t);
            t = setTimeout(() => fn.call(instance, last), debounceMs);
          };
        }

        // Once
        if (entry.options?.once) {
          let off: any = null;
          const onceHandler = async (payload: any) => {
            off?.(); off = null;
            await handler(payload);
          };
          off = bus.on(entry.pattern as any, onceHandler);
          return { dispose: () => off?.() };
        }

        const off = bus.on(entry.pattern as any, handler);
        return { dispose: () => off() };
      }

      if (entry.kind === MetaTypes.Use) {
        const mw: any = (ctx: any, next: any) => fn.call(instance, ctx, next);
        const off = bus.use(entry.pattern as any, mw);
        return { dispose: () => off() };
      }

      return null;
    }
  };
}
