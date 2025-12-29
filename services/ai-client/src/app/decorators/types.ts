export const META = Symbol('decorators:meta');
export type MetaEntry = | {
  kind: string;
  channel: string;
  pattern: string;
  method: string | symbol;
  options?: Record<string, any>;
};
export type Meta = MetaEntry[];
export type Disposable = { dispose(): void };
