import {
  EventHandler,
  Middleware,
  OnOptions,
  MetaTypes,
  OnMeta,
  UseMeta,
  Meta,
  META,
  MetaCommon,
} from '@app/events/types';

export interface EventBusInterface<E extends Record<string, any>> {
  on<K extends keyof E>(event: K, handler: EventHandler<E[K]>): () => void;
  emit<K extends keyof E>(event: K, payload: E[K]): Promise<void>;

  use<K extends keyof E>(event: K, mw: Middleware<E[K]>): () => void;
  run<K extends keyof E>(event: K, initial: E[K]): Promise<E[K]>;
}

export function createEventDecorators<E extends Record<string, any>>() {
  type EventKey = Extract<keyof E, string>;
  const pushMeta = (target: any, entry: OnMeta | UseMeta): void => {
    const list: Meta = (target.constructor[META] ??= []);
    list.push(entry);
  }

  const upsertMethodOptions = (target: any, method: string | symbol, patch: MetaCommon): void => {
    const list: Meta = (target.constructor[META] ??= []);

    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i];
      if (m.method !== method) {
        continue;
      }

      const cur = (m.options ??= {});
      Object.assign(cur, patch);
      return;
    }

    throw new Error(`@Group/@Priority must be placed above @On/@Use on method "${String(method)}"`);
  }

  function OnEvent<K extends EventKey>(pattern: K, options?: OnOptions): MethodDecorator {
    return (target, propertyKey, descriptor?: PropertyDescriptor) => {
      if (!descriptor) {
        throw new Error(`@OnEvent can be used only on methods. "${String(propertyKey)}" is not a method.`);
      }

      pushMeta(target, { kind: MetaTypes.On, pattern, method: propertyKey, options });
    };
  }

  function OnEventOnce<K extends EventKey>(pattern: K): MethodDecorator {
    return OnEvent(pattern, { once: true });
  }

  function OnEventDebounce<K extends EventKey>(pattern: K, debounceMs: number): MethodDecorator {
    return OnEvent(pattern, { debounceMs });
  }

  function UseEventMW<K extends EventKey>(pattern: K): MethodDecorator {
    return (target, propertyKey, descriptor?: PropertyDescriptor) => {
      if (!descriptor) {
        throw new Error(`@UseEventMW can be used only on methods. "${String(propertyKey)}" is not a method.`);
      }

      pushMeta(target, { kind: MetaTypes.Use, pattern, method: propertyKey });
    };
  }

  function UseMWPriority(value: number): MethodDecorator {
    return (target, propertyKey, descriptor?: PropertyDescriptor) => {
      if (!descriptor) {
        throw new Error(`@UseMWPriority can be used only on methods. "${String(propertyKey)}" is not a method.`);
      }

      upsertMethodOptions(target, propertyKey, { priority: value });
    };
  }

  function UseMWGroup(name: string): MethodDecorator {
    return (target, propertyKey, descriptor?: PropertyDescriptor) => {
      if (!descriptor) {
        throw new Error(`@UseMWGroup can be used only on methods. "${String(propertyKey)}" is not a method.`);
      }

      upsertMethodOptions(target, propertyKey, { group: name });
    };
  }

  return { OnEvent, OnEventOnce, OnEventDebounce, UseEventMW, UseMWPriority, UseMWGroup } as const;
}
