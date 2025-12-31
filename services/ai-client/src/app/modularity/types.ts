import { AiOrchestrator } from '@app/AiOrchestrator';
import { Registries } from '@app/types';

export type BuiltApp = {
  orchestrator: AiOrchestrator;
  registries: Registries;
}

export type ModuleToggleConfig = {
  enabled?: string[];   // whitelist
  disabled?: string[];  // blacklist
};
