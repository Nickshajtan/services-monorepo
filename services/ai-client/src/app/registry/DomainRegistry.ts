export type DomainDefinition = {
  key: string;
  title?: string;
  description?: string;
  tags?: string[];
};

export class DomainRegistry {
  private readonly domains = new Map<string, DomainDefinition>();

  register(def: DomainDefinition): void {
    if (this.domains.has(def.key)) {
      throw new Error(`Domain already registered: ${def.key}`);
    }
    this.domains.set(def.key, def);
  }

  get(key: string): DomainDefinition | undefined {
    return this.domains.get(key);
  }

  list(): DomainDefinition[] {
    return [...this.domains.values()];
  }
}
