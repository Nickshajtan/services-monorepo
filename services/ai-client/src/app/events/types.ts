export type EventHandler<T> = (payload: T) => void | Promise<void>;
export type Middleware<T> = (context: T, next: (context: T) => Promise<T>) => Promise<T>;
export type Unsubscribe = () => void;
export const EmitMode = {
  Sequential: 'sequential',
  Parallel: 'parallel',
} as const;
export type EmitStrategy = {
  run<T>(handlers: Array<(p: T) => void | Promise<void>>, payload: T): Promise<void>;
};
export const EmitStrategies = {
  [EmitMode.Sequential]: {
    async run<T>(handlers: Array<(p: T) => void | Promise<void>>, payload: T): Promise<void> {
      for (const h of handlers) {
        await h(payload);
      }
    },
  },
  [EmitMode.Parallel]: {
    async run<T>(handlers: Array<(p: T) => void | Promise<void>>, payload: T): Promise<void> {
      await Promise.all(handlers.map(h => Promise.resolve(h(payload))));
    },
  },
} satisfies Record<(typeof EmitMode)[keyof typeof EmitMode], EmitStrategy>;
export type EmitMode = keyof typeof EmitStrategies;

export const META = Symbol('eventbus:meta');
export enum MetaTypes {
  On = 'on',
  Use = 'use',
}
export type MetaTypeValue = typeof MetaTypes[keyof typeof MetaTypes];
export type MetaCommon = {
  group?: string;
  priority?: number;
};
export type OnOptions = MetaCommon & {
  once?: boolean;
  debounceMs?: number;
};
export type OnMeta = {
  kind: MetaTypes.On;
  pattern: string;
  method: string | symbol;
  options?: OnOptions;
};
export type UseMeta = {
  kind: MetaTypes.Use;
  pattern: string;
  method: string | symbol;
  options?: MetaCommon;
};
export type Meta = Array<OnMeta | UseMeta>;
export type Disposable = { dispose(): void };
