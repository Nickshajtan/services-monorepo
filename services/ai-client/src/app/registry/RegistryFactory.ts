import { DomainRegistry } from "@app/registry/DomainRegistry";
import { CommandRegistry } from "@app/registry/CommandRegistry";
import { ProviderRegistry } from "@app/registry/ProviderRegistry";

export class RegistryFactory {
  create() {
    return {
      domains: new DomainRegistry(),
      commands: new CommandRegistry(),
      providers: new ProviderRegistry(),
    } as const;
  }
}
