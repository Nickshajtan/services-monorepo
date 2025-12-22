import type { AiConfigParsed, RouteEntry } from "@config/AiConfigSchema";
import { MemoryCache } from '@app/cache/MemoryCache';
import { Cache } from '@app/cache/CacheInterface';
import { Capability, ResolvedRoute } from '@app/types';
import { isCapability } from '@app/helpers';

type ResolvedWildcards = {
  acc: RouteEntry;
  matchedKeys: string[];
};

export class RouteResolver {
  constructor(
    private readonly cfg: AiConfigParsed,
    private readonly cache: Cache<ResolvedRoute | null> = new MemoryCache()
  ) {}

  matches(key: string): boolean {
    const parts = key.split(".");
    if (parts.length !== 3) {
      return false;
    }

    const [domain, cap, cmd] = parts;
    const candidates = this.getCandidateKeys(domain, cap, cmd);

    for (const k of candidates) {
      if (this.cfg.routes[k]) {
        return true;
      }
    }

    return false;
  }


  /**
   * convenience helper:
   * build key from parts: domain="devdocs", cap="llm", cmd="query"
   */
  resolveParts(domain: string, capability: string, command: string): ResolvedRoute {
    return this.resolve(`${domain}.${capability}.${command}`);
  }

  resolve<C extends Capability>(routeKey: `${string}.${C}.${string}`): ResolvedRoute<C>;
  resolve(routeKey: string): ResolvedRoute;
  resolve(key: string): ResolvedRoute {
    const resolved = this.tryResolve(key);
    if (!resolved) {
      throw new Error(`Route not found: ${key}`);
    }

    return resolved;
  }

  /**
   * resolve exact route key: "devdocs.llm.query"
   */
  protected tryResolve(key: string): ResolvedRoute | null {
    const NS = "RouteResolver:tryResolve";
    const cached = this.cache.get(NS, key);
    if (undefined !== cached) {
      return cached;
    }

    const parts = key.split('.');
    if (parts.length !== 3) {
      throw new Error(`Invalid route key (expected 3 parts): ${key}`);
    }

    const [domain, cap, cmd] = parts;
    if (!isCapability(cap)) {
      throw new Error(`Unknown capability in route key: ${key}`);
    }

    const resolved = this.resolveWildcards(domain, cap, cmd);
    if (!resolved) {
      this.cache.set(NS, key, null);
      return null;
    }

    const { acc, matchedKeys } = resolved;
    const provider = acc.provider ?? this.cfg.defaults.provider;
    const model = acc.model ?? this.cfg.defaults.model;
    const result: ResolvedRoute = {
      key,
      ...acc,
      provider,
      model,
      temperature: acc.temperature ?? this.cfg.defaults.temperature,
      matchedKeys,
      capability: cap
    };

    this.cache.set(NS, key, result);
    return result;
  }

  protected resolveWildcards(domain: string, cap: string, cmd: string): ResolvedWildcards | null {
    const candidates = this.getCandidateKeys(domain, cap, cmd);

    let acc: RouteEntry = {};
    const matched: string[] = [];

    for (let i = candidates.length - 1; i >= 0; i--) {
      const k = candidates[i];
      const entry = this.cfg.routes[k];
      if (!entry) {
        continue;
      }
      acc = { ...acc, ...entry };
      matched.push(k);
    }
    matched.reverse();

    if (matched.length === 0) {
      return null;
    }

    return {
      acc,
      matchedKeys: matched.reverse()
    };
  }

  /**
   *  Wildcard rules:
   *   - exact: a.b.c
   *   - wildcard command: a.b.*
   *   - wildcard capability: a.*.*
   *   - wildcard domain: *.b.c
   *   - wildcard domain+command: *.b.*
   *   - global: *.*.*
   *
   * @param domain
   * @param cap
   * @param cmd
   * @private
   */
  private getCandidateKeys(domain: string, cap: string, cmd: string): string[] {
    return [
      `${domain}.${cap}.${cmd}`,
      `${domain}.${cap}.*`,
      `${domain}.*.*`,
      `*.${cap}.${cmd}`,
      `*.${cap}.*`,
      `*.*.*`,
    ];
  }
}
