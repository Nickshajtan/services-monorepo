import { createCollector, createBinder } from '@app/decorators/decorators';
import { AppDecorators, BindAdapter, DecoratorPlugin, PluginCore } from '@app/decorators/contracts';
import { Meta, MetaEntry } from '@app/decorators/types';

export function createAppDecorators(params: {
  plugins: readonly DecoratorPlugin<object>[];
  adapters: BindAdapter[];
  order?: (meta: Meta) => Meta;
  hook?: (info: MetaEntry) => void;
  ensureMethod?: PluginCore['ensureMethod'];
}): AppDecorators<Record<string, any>> {
  const collector = createCollector();
  const decoratorsPluginCore: PluginCore = {
    collector,
    ensureMethod(descriptor, key) {
      if (!descriptor || 'function' !== typeof descriptor.value) {
        throw new Error(`@decorator can be applied only to methods (${String(key)})`);
      }
    },
  };

  const decorators: Record<string, any> = {};
  for (const p of params.plugins) {
    decorators[p.name] = p.build(decoratorsPluginCore);
  }

  const binder = createBinder(params.adapters, {
    order: params.order,
    hook: params.hook,
  });

  return {
    collector,
    decorators,
    register: (instance: object) => binder.register(instance)
  } as any;
}
