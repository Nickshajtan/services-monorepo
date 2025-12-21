import type { AiConfigParsed, RouteEntry } from "./AiConfigSchema.js";

export type ResolvedRoute = RouteEntry & {
  key: string;
  provider: string;
  model: string;
  temperature?: number;
};

export class RouteResolver {
  constructor(private readonly cfg: AiConfigParsed) {}

  has(key: string): boolean {
    return Boolean(this.cfg.routes[key]);
  }

  /**
   * resolve exact route key: "devdocs.llm.query"
   */
  resolve(key: string): ResolvedRoute {
    const entry = this.cfg.routes[key];
    if (!entry) {
      throw new Error(`Route not found: ${key}`);
    }

    const provider = entry.provider ?? this.cfg.defaults.provider;
    const model = entry.model ?? this.cfg.defaults.model;

    return {
      key,
      ...entry,
      provider,
      model,
      temperature: entry.temperature ?? this.cfg.defaults.temperature
    };
  }

  /**
   * convenience helper:
   * build key from parts: domain="devdocs", cap="llm", cmd="query"
   */
  resolveParts(domain: string, capability: string, command: string): ResolvedRoute {
    return this.resolve(`${domain}.${capability}.${command}`);
  }
}
