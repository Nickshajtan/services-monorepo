import { LlmPayload, ImagePayload } from '@app/types';

export interface AiProvider {
  name: string;

  llm?: {
    run(input: LlmPayload): Promise<{ text: string; raw?: unknown }>;
  };

  image?: {
    run(input: ImagePayload): Promise<{ base64: string; mimeType: string; raw?: unknown }>;
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
