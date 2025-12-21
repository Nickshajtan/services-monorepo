import { Cache } from './CacheInterface.js';

export class MemoryCache implements Cache {
  private map = new Map<string, unknown>();

  get<V>(ns: string, key: string): V | undefined {
    return this.map.get(`${ns}:${key}`) as V | undefined;
  }

  set<V>(ns: string, key: string, value: V): void {
    this.map.set(`${ns}:${key}`, value);
  }
}
