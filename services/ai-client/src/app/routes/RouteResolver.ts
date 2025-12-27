import type { AiConfigParsed, RouteEntry } from "@config/AiConfigSchema";
import { MemoryCache } from '@app/cache/MemoryCache';
import { Cache } from '@app/cache/CacheInterface';
import { WildcardKeyResolver } from '@app/WildcardKeyResolver'
import { Capability, ResolvedRoute } from '@app/types';
import { isCapability } from '@app/helpers';

type ResolvedWildcards = {
  acc: RouteEntry;
  matchedKeys: string[];
};

const MAX_CONFIG_SEGMENTS = 3 as const;

export class RouteResolver {
  constructor(
    private readonly cfg: AiConfigParsed,
    private readonly wildcards: WildcardKeyResolver = new WildcardKeyResolver(
      new MemoryCache(),'.', MAX_CONFIG_SEGMENTS
    ),
    private readonly cache: Cache<ResolvedRoute | null> = new MemoryCache()
  ) {
    for (const k of Object.keys(this.cfg.routes)) {
      this.wildcards.validatePattern(k);
    }
  }

  matches(key: string): boolean {
    const parts = key.split(".");
    if (parts.length !== MAX_CONFIG_SEGMENTS) {
      return false;
    }

    const candidates = this.wildcards.getCandidateKeys(key);
    for (const k of candidates) {
      if (this.cfg.routes[k]) {
        return true;
      }
    }

    return false;
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
   * resolve the exact route key: "devdocs.llm.query"
   */
  protected tryResolve(key: string): ResolvedRoute | null {
    const NS = "RouteResolver:tryResolve";
    const cached = this.cache.get(NS, key);
    if (undefined !== cached) {
      return cached;
    }

    const parts = key.split('.');
    if (parts.length !== MAX_CONFIG_SEGMENTS) {
      throw new Error(`Invalid route key (expected ${MAX_CONFIG_SEGMENTS} parts): ${key}`);
    }

    const cap = parts[1];
    if (!isCapability(cap)) {
      throw new Error(`Unknown capability in route key: ${key}`);
    }

    const resolved = this.resolveWildcards(key);
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

  /**
   *  Wildcard rules:
   *   - exact: a.b.c
   *   - wildcard command: a.b.*
   *   - wildcard capability: a.*.*
   *   - wildcard domain: *.b.c
   *   - wildcard domain+command: *.b.*
   *   - global: *.*.*
   *
   */
  protected resolveWildcards(key: string): ResolvedWildcards | null {
    const candidates = this.wildcards.getCandidateKeys(key);

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

    if (matched.length === 0) {
      return null;
    }

    return {
      acc,
      matchedKeys: matched
    };
  }
}
