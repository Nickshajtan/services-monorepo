import { DomainDefinition } from '@app/registry/types';
import { AbstractRegistry } from '@app/registry/AbstractRegistry';

export class DomainRegistry extends AbstractRegistry<DomainDefinition> {
  protected throwRegistrationError(def: DomainDefinition): void
  {
    this.throw(`Domain already registered: ${def.key}`);
  }
}
