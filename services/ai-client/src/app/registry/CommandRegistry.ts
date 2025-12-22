import { Capability } from '@app/types';

export type CommandDefinition = {
  capability: Capability;
  command: string;
  description?: string;
};

type CommandKey = `${Capability}.${string}`;

export class CommandRegistry {
  private readonly commands = new Map<CommandKey, CommandDefinition>();

  register(def: CommandDefinition): void {
    const key = this.keyOf(def.capability, def.command);
    if (this.commands.has(key)) {
      throw new Error(`Command already registered: ${key}`);
    }
    this.commands.set(key, def);
  }

  get(capability: Capability, command: string): CommandDefinition | undefined {
    return this.commands.get(this.keyOf(capability, command));
  }

  list(): CommandDefinition[] {
    return [...this.commands.values()];
  }

  private keyOf(cap: Capability, cmd: string): CommandKey {
    return `${cap}.${cmd}`;
  }
}
