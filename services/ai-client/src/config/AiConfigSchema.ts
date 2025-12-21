import { z } from "zod";

const ProviderConfigSchema = z.object({
  apiKeyEnv: z.string().min(1),
  baseUrl: z.string().url().nullable().optional(),
  timeoutMs: z.number().int().positive().optional()
});

const RouteEntrySchema = z.object({
  // routing/policy
  provider: z.string().optional(),
  // llm-ish
  model: z.string().optional(),
  temperature: z.number().optional(),
  instructions: z.string().optional(),
  prompt: z.string().optional(),
  // image-ish (string, без enum)
  size: z.string().optional(),
  background: z.string().optional(),
  outputFormat: z.string().optional(),
  // additional data
  meta: z.record(z.unknown()).optional()
}).passthrough();

export const AiConfigSchema = z.object({
  defaults: z.object({
    provider: z.string().min(1),
    model: z.string().min(1),
    temperature: z.number().optional()
  }),
  providers: z.record(ProviderConfigSchema),
  routes: z.record(RouteEntrySchema)
});

export type AiConfigParsed = z.infer<typeof AiConfigSchema>;
export type RouteEntry = z.infer<typeof RouteEntrySchema>;
