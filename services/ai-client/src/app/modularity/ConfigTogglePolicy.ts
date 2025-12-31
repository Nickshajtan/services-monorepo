import { AiModule, ModuleTogglePolicy } from '@app/modularity/contracts';
import { ModuleToggleConfig } from '@app/modularity/types';

export class ConfigTogglePolicy implements ModuleTogglePolicy {
  constructor(private cfg: ModuleToggleConfig) {}

  isEnabled(module: AiModule): boolean {
    const { enabled, disabled } = this.cfg;

    if (enabled?.length) {
      return enabled.includes(module.name);
    }

    if (disabled?.length) {
      return !disabled.includes(module.name);
    }

    return true; // default: everything enabled
  }
}
