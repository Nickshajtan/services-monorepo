import { AiOrchestrator } from '@app/AiOrchestrator';
import { RegistryFactory } from '@app/registry/RegistryFactory';
import { AiConfigLoader } from '@config/AiConfigLoader';
import { RouteResolver } from '@app/routes/RouteResolver';
import { BuiltApp } from '@app/modularity/types';
import { appConfig } from '@app/app';
import { AiModule, ModuleContext, ModuleTogglePolicy, ModuleResolutionPolicy } from '@app/modularity/contracts';
import { WildcardKeyResolver } from '@app/wildcards/WildcardKeyResolver';
import { MemoryCache } from '@app/cache/MemoryCache';

type BuilderState = { modules: boolean };
type NoModules = { modules: false };
type HasModules = { modules: true };
const AlwaysEnabledPolicy: ModuleTogglePolicy = {
  isEnabled: () => true,
};
const DefaultResolutionPolicy: ModuleResolutionPolicy = {
  onEmpty(): never {
    throw new Error('No modules enabled');
  },
};

export class AppBuilder<S extends BuilderState = NoModules> {
  private configPath = 'config/ai.config.json';
  private modulesByName = new Map<string, AiModule>();
  private togglePolicy: ModuleTogglePolicy = AlwaysEnabledPolicy;
  private resolutionPolicy: ModuleResolutionPolicy = DefaultResolutionPolicy;

  build(this: AppBuilder<HasModules>): BuiltApp {
    const config = new AiConfigLoader().load(this.configPath);
    const routes = new RouteResolver(
      config,
      new WildcardKeyResolver(new MemoryCache(), '.', 3)
    );
    const registries = (new RegistryFactory()).create();
    const { domains, commands, providers } = registries;
    const context = { config: config, bus: appConfig.bus } satisfies ModuleContext;
    const sortedModules = this.resolveModules( context );
    if ( sortedModules.length < 1 ) {
      this.resolutionPolicy.onEmpty();
    }

    for (const module of sortedModules) {
      module.registerDomains?.(domains, context);
      module.registerCommands?.(commands, context);
      module.registerProviders?.(providers, context);
      appConfig.decorators.register(module);
    }

    const orchestrator = new AiOrchestrator( routes, registries );

    return { orchestrator, registries };
  }

  withConfigPath(path: string): AppBuilder<S> {
    this.configPath = path;
    return this;
  }

  withTogglePolicy(policy: ModuleTogglePolicy): AppBuilder<S> {
    this.togglePolicy = policy;
    return this;
  }

  withResolutionPolicy(policy: ModuleResolutionPolicy): AppBuilder<S> {
    this.resolutionPolicy = policy;
    return this;
  }

  withModules(modules: AiModule[]): AppBuilder<HasModules> {
    for (const module of modules) {
      if (this.modulesByName.has(module.name)) {
        throw new Error(`Module already added: ${module.name}`);
      }

      this.modulesByName.set(module.name, module);
    }
    return this as unknown as AppBuilder<HasModules>;
  }

  protected resolveModules(context: ModuleContext): AiModule[] {
    const allModules = [...this.modulesByName.values()];
    const allByName = new Map(allModules.map(m => [m.name, m] as const));
    const enabledModules = allModules.filter(m => this.togglePolicy.isEnabled(m, context));
    const enabledNames = new Set(enabledModules.map(m => m.name));

    for (const m of enabledModules) {
      for (const dep of (m.dependsOn ?? [])) {
        if (!allByName.has(dep)) {
          this.throw(`Module "${m.name}" requires "${dep}", but it is not registered`);
        }
        if (!enabledNames.has(dep)) {
          this.throw(`Module "${m.name}" requires "${dep}", but it's disabled`);
        }
      }
    }

    return this.topoSortWithPriority(enabledModules);
  }

  protected topoSortWithPriority(mods: AiModule[]): AiModule[] {
    const byName = new Map(mods.map(m => [m.name, m] as const));
    const getPriority = (name: string) => byName.get(name)?.priority ?? 0;
    const sortNames = (names: string[]) =>
      [...names].sort((a, b) => (getPriority(b) - getPriority(a)) || a.localeCompare(b));
    const roots = [...mods]
      .sort((a, b) => ((b.priority ?? 0) - (a.priority ?? 0)) || a.name.localeCompare(b.name));
    const temp = new Set<string>();
    const perm = new Set<string>();
    const out: AiModule[] = [];
    const visit = (name: string) => {
      if (perm.has(name)) {
        return;
      }

      if (temp.has(name)) {
        this.throw(`Cycle detected at: ${name}`);
      }

      const m:AiModule | undefined = byName.get(name);
      if (!m) {
        this.throw( `Internal error: "${name}" not in enabled module graph` );
      }

      temp.add(name);
      for (const dep of sortNames(m.dependsOn ?? [])) {
        visit(dep);
      }

      temp.delete(name);
      perm.add(name);
      out.push(m);
    };

    for (const m of roots) {
      visit(m.name);
    }

    return out;
  }

  protected throw(message: string): never
  {
    throw new Error(message);
  }
}
