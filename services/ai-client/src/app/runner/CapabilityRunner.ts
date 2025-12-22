import { Capability, PayloadFor } from '@app/types';
import { AiProvider } from '@app/registry/ProviderRegistry';

export interface CapabilityRunner<C extends Capability> {
  readonly capability: C;

  supports(provider: AiProvider): boolean;

  run(
    provider: AiProvider,
    capability: C,
    payload: PayloadFor<C>
  ): Promise<unknown>;
}
