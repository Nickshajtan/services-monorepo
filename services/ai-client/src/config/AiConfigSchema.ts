import { z } from "zod";

const ProviderConfigSchema = z.object({
  apiKeyEnv: z.string().min(1),
  baseUrl: z.string().url().nullable().optional(),
  timeoutMs: z.number().int().positive().optional()
});

const LlmEntrySchema = z.object({
  provider: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().optional(),
  instructions: z.string().optional(),
  prompt: z.string().optional(),
  meta: z.record(z.unknown()).optional()
}).passthrough();

const ImageEntrySchema = z.object({
  provider: z.string().optional(),
  model: z.string().optional(),
  size: z.string().optional(),
  background: z.string().optional(),
  outputFormat: z.string().optional(),
  meta: z.record(z.unknown()).optional()
}).passthrough();

const DomainSchema = z.object({
  llm: z.record(LlmEntrySchema).optional(),
  image: z.record(ImageEntrySchema).optional()
});

export const AiConfigSchema = z.object({
  defaults: z.object({
    provider: z.string().min(1),
    model: z.string().min(1),
    temperature: z.number().optional()
  }),
  providers: z.record(ProviderConfigSchema),
  domains: z.record(DomainSchema)
});

export type AiConfigParsed = z.infer<typeof AiConfigSchema>;
