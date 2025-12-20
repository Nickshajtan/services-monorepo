import type { AiConfigParsed } from "./AiConfigSchema.js";

export type ResolvedLlmConfig = {
  provider: string;
  model: string;
  temperature?: number;
  instructions?: string;
  prompt?: string;
  meta?: Record<string, unknown>;
};

export type ResolvedImageConfig = {
  provider: string;
  model: string;
  size?: string;
  background?: string;
  outputFormat?: string;
  meta?: Record<string, unknown>;
};

export class PromptCatalog {
  constructor(private readonly config: AiConfigParsed) {}

  resolveLlm(domain: string, entry: string): ResolvedLlmConfig {
    const d = this.config.domains[domain];
    const e = d?.llm?.[entry];
    if (!e) {
      throw new Error(`LLM entry not found: ${domain}.${entry}`);
    }

    return {
      provider: e.provider ??this.config.defaults.provider,
      model: e.model ?? this.config.defaults.model,
      temperature: e.temperature ?? this.config.defaults.temperature,
      instructions: e.instructions,
      prompt: e.prompt,
      meta: e.meta
    };
  }

  resolveImage(domain: string, preset = "default"): ResolvedImageConfig {
    const d = this.config.domains[domain];
    const e = d?.image?.[preset];
    if (!e) throw new Error(`Image preset not found: ${domain}.${preset}`);

    return {
      provider: e.provider ?? this.config.defaults.provider,
      model: e.model ?? "gpt-image-1",
      size: e.size,
      background: e.background,
      outputFormat: e.outputFormat,
      meta: e.meta
    };
  }

  hasDomain(domain: string): boolean {
    return Boolean(this.config.domains[domain]);
  }
}
