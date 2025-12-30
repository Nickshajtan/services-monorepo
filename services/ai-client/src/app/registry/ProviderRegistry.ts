import { AiProviderDefenition } from '@app/registry/types';
import { AbstractRegistry } from '@app/registry/AbstractRegistry';

export class ProviderRegistry extends AbstractRegistry<AiProviderDefenition> {
  protected throwRegistrationError(def: AiProviderDefenition): void {
    this.throw(`Provider already registered: ${def.key}`);
  }

  get(key: string): AiProviderDefenition | undefined {
    if ( ! this.items.has(key) ) {
      this.throw('Provider not found');
    }

    return this.items.get(key);
  }
}
