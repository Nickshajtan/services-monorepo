import { Meta, MetaEntry, META, Disposable } from "@app/decorators/types";
import { BindAdapter, Collector } from '@app/decorators/contracts';

const push = (target: any, entry: MetaEntry) => {
  const list: Meta = (target.constructor[META] ??= []);
  list.push(entry);
};

const read = (ctor: any) => ctor[META] as Meta | undefined;

const patch = (target: any, method: string | symbol, patch: Record<string, any>) => {
  const list: Meta = (target.constructor[META] ??= []);
  for (let i = list.length - 1; i >= 0; i--) {
    const m = list[i];
    if (m.method !== method) continue;
    const cur = (m.options ??= {});
    Object.assign(cur, patch);
    return;
  }
  throw new Error(`Option decorator must be placed above base decorator on "${String(method)}"`);
};

const createCollector = (): Collector => ({ push, patch, read });

const createBinder = ( adapters: BindAdapter[], opts?: {
  order?: (meta: Meta) => Meta;
  hook?: (info: MetaEntry) => void;
} ) => {
  const byChannel = new Map(adapters.map((adapter) => [adapter.channel, adapter]));
  return {
    register(instance: object): Disposable | null {
      const ctor: any = (instance as any).constructor;
      const meta: Meta | undefined = read(ctor);
      if (!meta?.length) {
        return null;
      }

      const ordered = opts?.order ? opts.order(meta) : meta;
      const disposables: Disposable[] = [];

      for (const entry of ordered) {
        opts?.hook?.(entry);

        const adapter = byChannel.get(entry.channel);
        if (!adapter) {
          throw new Error(`No adapter for channel "${entry.channel}"`);
        }
        const disposable = adapter.bind(entry, instance);
        if (disposable) {
          disposables.push(disposable);
        }
      }

      return { dispose: () => disposables.forEach(disposable => disposable.dispose()) };
    },
  };
}

export { createCollector, createBinder };
