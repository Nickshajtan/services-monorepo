import { Meta, MetaEntry, Disposable } from "@app/decorators/types";

export type Collector = {
  push(target: any, entry: MetaEntry): void;
  patch(target: any, method: string | symbol, patch: Record<string, any>): void;
  read(ctor: any): Meta | undefined;
};
export type BindAdapter = {
  channel: string;
  bind(entry: MetaEntry, instance: any): Disposable | null;
};
export type PluginCore = {
  collector: Collector;
  ensureMethod: (descriptor?: PropertyDescriptor, key?: string | symbol) => void;
};
export type DecoratorPlugin<TApi extends Record<string, any>> = {
  name: string;
  build(core: PluginCore): TApi;
};
export type AppDecorators<TDecorators extends Record<string, any>> = {
  decorators: TDecorators;
  register(instance: object): Disposable | null;
};
