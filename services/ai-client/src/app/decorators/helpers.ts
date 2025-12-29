import { PluginCore } from '@app/decorators/contracts';

export const makeMethodEntry =
  (core: PluginCore) =>
    <TEntry extends Record<string, any>>(make: (method: string | symbol) => TEntry) =>
      (): MethodDecorator =>
        (t, k, d) => {
          core.ensureMethod(d, k);
          core.collector.push(t, make(k) as any);
        };

export const makeMethodPatch =
  (core: PluginCore) =>
    (patch: Record<string, any>): MethodDecorator =>
      (t, k, d) => {
        core.ensureMethod(d, k);
        core.collector.patch(t, k, patch);
      };
