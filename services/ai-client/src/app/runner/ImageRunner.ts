import { CapabilityRunner } from '@app/runner/CapabilityRunner';
import { AiProvider } from '@app/registry/ProviderRegistry';
import { Capabilities, PayloadFor } from '@app/types';

export class ImageRunner implements CapabilityRunner<typeof Capabilities.Image> {
  readonly capability = Capabilities.Image;

  supports(provider: AiProvider): boolean {
    return !!provider.image;
  }

  async run(provider: AiProvider, capability: typeof Capabilities.Image, payload: PayloadFor<typeof Capabilities.Image>) {
    if (!provider.image) {
      throw new Error(`Provider ${provider.name} does not support image`);
    }

    return provider.image.run({ ...payload, capability });
  }
}
