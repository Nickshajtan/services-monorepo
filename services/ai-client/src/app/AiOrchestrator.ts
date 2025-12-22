import type { RouteResolver } from "@app/routes/RouteResolver";
import type { ProviderRegistry } from "@app/registry/ProviderRegistry";
import { Capabilities, Capability, PayloadFor } from '@app/types';
import { LlmRunner } from '@app/runner/LlmRunner';
import { ImageRunner } from '@app/runner/ImageRunner';
import { CapabilityRunner } from '@app/runner/CapabilityRunner';

const runnersByCapability: { [C in Capability]: CapabilityRunner<C> } = {
  [Capabilities.LLM]: new LlmRunner(),
  [Capabilities.Image]: new ImageRunner(),
};

export class AiOrchestrator {
  constructor(
    private readonly routes: RouteResolver,
    private readonly providers: ProviderRegistry
  ) {}

  async run<C extends Capability>(routeKey: `${string}.${C}.${string}`, payload: PayloadFor<C>) {
    const route = this.routes.resolve(routeKey);
    const provider = this.providers.get(route.provider);
    const runner = runnersByCapability[route.capability];
    if (!runner.supports(provider)) {
      throw new Error(`Provider ${provider.name} does not support ${route.capability}`);
    }

    return runner.run(provider, route.capability, payload);
  }
}
