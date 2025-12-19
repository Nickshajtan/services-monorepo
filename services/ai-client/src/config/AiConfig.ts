export type ProviderName = string;

export type AiDefaults = {
  provider: ProviderName;
  model: string;
  temperature?: number;
};

export type ProviderConfig = {
  apiKeyEnv: string;
  baseUrl?: string | null;
  timeoutMs?: number;
};

export type DomainTaskConfig = {
  provider?: ProviderName;
  model?: string;
  temperature?: number;
  instructions?: string;
};

export type DomainTemplateConfig = {
  provider?: ProviderName;
  instructions?: string;
  prompt: string;
};

export type DomainImageConfig = {
  provider?: ProviderName;
  model?: string;
  size?: "1024x1024" | "1024x1536" | "1536x1024";
  background?: "transparent" | "opaque";
  outputFormat?: "png" | "webp" | "jpeg";
};

export type DomainConfig = {
  tasks?: Record<string, DomainTaskConfig>;
  templates?: Record<string, DomainTemplateConfig>;
  image?: DomainImageConfig;
};

export type AiConfig = {
  defaults: AiDefaults;
  providers: Record<ProviderName, ProviderConfig>;
  domains: Record<string, DomainConfig>;
};
