import { CapabilityRunner } from '@app/runner/CapabilityRunner';
import { Capabilities, PayloadFor } from '@app/types';
import { AiProvider } from '@app/registry/ProviderRegistry';

export class LlmRunner implements CapabilityRunner<typeof Capabilities.LLM> {
  readonly capability = Capabilities.LLM;

  supports(provider: AiProvider): boolean {
    return !!provider.llm;
  }

  async run(provider: AiProvider, capability: typeof Capabilities.LLM, payload: PayloadFor<typeof Capabilities.LLM>) {
    if (!provider.llm) {
      throw new Error(`Provider ${provider.name} does not support llm`);
    }

    return provider.llm.run({ ...payload, capability });
  }
}
