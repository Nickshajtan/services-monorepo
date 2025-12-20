import type { AiConfigParsed } from "./AiConfigSchema.js";

export type ResolvedTaskConfig = {
  provider: string;
  model: string;
  temperature?: number;
  instructions?: string;
};

export type ResolvedTemplateConfig = {
  provider: string;
  model: string;
  instructions?: string;
  prompt: string;
};

export type ResolvedImageConfig = {
  provider: string;
  model: string;
  size?: "1024x1024" | "1024x1536" | "1536x1024";
  background?: "transparent" | "opaque";
  outputFormat?: "png" | "webp" | "jpeg";
};

export class PromptCatalog {
  constructor(private readonly config: AiConfigParsed) {}

}
