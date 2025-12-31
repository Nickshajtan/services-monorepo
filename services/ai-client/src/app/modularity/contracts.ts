import { DomainRegistry } from '@app/registry/DomainRegistry';
import { CommandRegistry } from '@app/registry/CommandRegistry';
import { ProviderRegistry } from '@app/registry/ProviderRegistry';
import { Logger, Registries } from '@app/types';
import { BuiltApp } from '@app/modularity/types';
import { AiConfigParsed } from '@config/AiConfigSchema';
import { EventBusInterface } from '@app/events/contracts';

export interface AiModule {
  name: string;
  isEnabled?(ctx: ModuleContext): boolean;
  priority?: number;
  dependsOn?: string[];

  registerDomains?(registry: DomainRegistry, ctx: ModuleContext): void;
  registerCommands?(registry: CommandRegistry, ctx: ModuleContext): void;
  registerProviders?(registry: ProviderRegistry, ctx: ModuleContext): void;

  afterRegister?(registries: Registries, ctx: ModuleContext): void;
  beforeBuild?(ctx: ModuleContext): void;
  afterBuild?(app: BuiltApp, ctx: ModuleContext): void;
}

export interface ModuleContext {
  config: AiConfigParsed;
  bus: EventBusInterface<any>;
  logger?: Logger;
  env?: Record<string, string | undefined>;
}

export interface ModuleTogglePolicy {
  isEnabled(module: AiModule, ctx: ModuleContext): boolean;
}
