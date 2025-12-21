export interface Cache<T> {
  get(ns: string, key: string): T | undefined;
  set(ns: string, key: string, value: T): void;
}
