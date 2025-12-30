import { CommandDefinition, CommandName } from '@app/registry/types';
import { AbstractRegistry } from '@app/registry/AbstractRegistry';

export class CommandRegistry extends AbstractRegistry<CommandDefinition> {
  protected throwRegistrationError(def: CommandDefinition): void
  {
    this.throw(`Command already registered: ${this.makeKey(def)}`);
  }

  protected makeKey(def: CommandDefinition): CommandName {
    return `${def.key}.${def.capability}.${def.command}`;
  }
}
