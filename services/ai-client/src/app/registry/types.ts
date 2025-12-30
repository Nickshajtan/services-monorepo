import { Capability, LlmPayload, ImagePayload } from '@app/types';

export type RegistrationDefenition = {
  key: string;
  title?: string;
  description?: string;
};

export type Command = string;
export type CommandDefinition = RegistrationDefenition & {
  capability: Capability;
  command: Command;
};
export type CommandName = `${string}${Capability}.${Command}`;

export type DomainDefinition = RegistrationDefenition & {
  tags?: string[];
};

export type AiProviderDefenition = RegistrationDefenition & {
  llm?: { run(input: LlmPayload): Promise<{ text: string; raw?: unknown }> };
  image?: { run(input: ImagePayload): Promise<{ base64: string; mimeType: string; raw?: unknown }> };
};
