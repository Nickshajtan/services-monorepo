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
  ensureMethod: (d?: PropertyDescriptor, n?: string | symbol) => void;
};
