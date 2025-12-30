import { PluginCore } from '@app/decorators/contracts';

export const makeMethodEntry =
  (core: PluginCore) =>
    <TEntry extends Record<string, any>>(make: (method: string | symbol) => TEntry) =>
      (): MethodDecorator =>
        (target, propertyKey, descriptor) => {
          core.ensureMethod(descriptor, propertyKey);
          core.collector.push(target, make(propertyKey) as any);
        };

export const makeMethodPatch =
  (core: PluginCore) =>
    (patch: Record<string, any>): MethodDecorator =>
      (target, propertyKey, descriptor) => {
        core.ensureMethod(descriptor, propertyKey);
        core.collector.patch(target, propertyKey, patch);
      };
