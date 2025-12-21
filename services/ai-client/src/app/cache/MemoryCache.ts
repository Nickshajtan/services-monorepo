import { Cache } from '@app/cache/CacheInterface';

export class MemoryCache<T> implements Cache<T> {
  private map = new Map<string, T>();

  get(ns: string, key: string): T | undefined {
    return this.map.get(`${ns}:${key}`);
  }

  set(ns: string, key: string, value: T): void {
    this.map.set(`${ns}:${key}`, value);
  }
}
