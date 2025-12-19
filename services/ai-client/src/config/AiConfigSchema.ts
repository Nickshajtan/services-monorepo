import { z } from "zod";

const ProviderConfigSchema = z.object({
  apiKeyEnv: z.string().min(1),
  baseUrl: z.string().url().nullable().optional(),
  timeoutMs: z.number().int().positive().optional()
});

const DomainTaskConfigSchema = z.object({
  provider: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().optional(),
  instructions: z.string().optional()
});

const DomainTemplateConfigSchema = z.object({
  provider: z.string().optional(),
  instructions: z.string().optional(),
  prompt: z.string().min(1)
});

const DomainImageConfigSchema = z.object({
  provider: z.string().optional(),
  model: z.string().optional(),
  size: z.enum(["1024x1024", "1024x1536", "1536x1024"]).optional(),
  background: z.enum(["transparent", "opaque"]).optional(),
  outputFormat: z.enum(["png", "webp", "jpeg"]).optional()
});

const DomainConfigSchema = z.object({
  tasks: z.record(DomainTaskConfigSchema).optional(),
  templates: z.record(DomainTemplateConfigSchema).optional(),
  image: DomainImageConfigSchema.optional()
});

export const AiConfigSchema = z.object({
  defaults: z.object({
    provider: z.string().min(1),
    model: z.string().min(1),
    temperature: z.number().optional()
  }),
  providers: z.record(ProviderConfigSchema),
  domains: z.record(DomainConfigSchema)
});

export type AiConfigParsed = z.infer<typeof AiConfigSchema>;
