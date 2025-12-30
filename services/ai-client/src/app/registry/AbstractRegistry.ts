import {RegistrationDefenition} from '@app/registry/types';
import { appConfig } from '@app/app';

const { decorators: { Events } } = appConfig;

export abstract class AbstractRegistry<TDef extends RegistrationDefenition> {
  protected readonly items = new Map<string, TDef>();

  @Events.onEvent('registries.initialize')
  register(def: TDef): void {
    if ( this.has(def) ) {
      this.throwRegistrationError(def);
    }

    this.set(def);
  }

  static getName(): string {
    return 'test';
  }

  has(def: TDef): boolean {
    return this.items.has(this.makeKey(def));
  }

  set(def: TDef): void {
    this.items.set(this.makeKey(def), def);
  }

  get(key: string): TDef | undefined {
    return this.items.get(key);
  }

  list(): TDef[] {
    return [...this.items.values()];
  }

  protected makeKey(def: TDef): string {
    return def.key;
  }

  protected throw(message: string): void
  {
    throw new Error(message);
  }

  protected abstract throwRegistrationError(def: TDef): void;
}
