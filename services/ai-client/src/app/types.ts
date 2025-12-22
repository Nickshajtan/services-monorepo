import type { RouteEntry } from '@config/AiConfigSchema';

export const Capabilities = {
  LLM: "llm",
  Image: "image",
} as const;
export type Capability = typeof Capabilities[keyof typeof Capabilities];
export type CapabilityRequestMap = {
  [Capabilities.LLM]: LlmPayload;
  [Capabilities.Image]: ImagePayload;
};

export type RouteDefaults = RouteEntry & {
  provider: string;
  model: string;
  temperature?: number;
};

export type ResolvedRoute <C extends Capability = Capability> = RouteDefaults & {
  key: string;
  matchedKeys: string[];
  capability: C;
};

export type RoutePayload = ResolvedRoute & {
  model: string;
  temperature?: number;
  meta?: Record<string, unknown>;
}

export type LlmPayload = RoutePayload & {
  prompt: string;
  instructions?: string;
  meta?: Record<string, unknown>;
};

export type ImagePayload = RoutePayload & {
  size?: string;
  background?: string;
  outputFormat?: string;
};

export type PayloadFor<C extends Capability> = CapabilityRequestMap[C];
