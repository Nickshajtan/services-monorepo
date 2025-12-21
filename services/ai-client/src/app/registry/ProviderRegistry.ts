export interface AiProvider {
  name: string;

  llm?: {
    run(input: {
      model: string;
      temperature?: number;
      instructions?: string;
      prompt?: string;
      payload: unknown;
      meta?: Record<string, unknown>;
    }): Promise<{ text: string; raw?: unknown }>;
  };

  image?: {
    run(input: {
      model: string;
      size?: string;
      background?: string;
      outputFormat?: string;
      payload: unknown;
      meta?: Record<string, unknown>;
    }): Promise<{ base64: string; mimeType: string; raw?: unknown }>;
  };
}

export class ProviderRegistry {
  private readonly providers = new Map<string, AiProvider>();

  register(p: AiProvider): void {
    if (this.providers.has(p.name)) {
      throw new Error(`Provider already registered: ${p.name}`);
    }
    this.providers.set(p.name, p);
  }

  get(name: string): AiProvider {
    const p = this.providers.get(name);
    if (!p) {
      throw new Error(`Provider not found: ${name}`);
    }
    return p;
  }

  list(): AiProvider[] {
    return [...this.providers.values()];
  }
}
