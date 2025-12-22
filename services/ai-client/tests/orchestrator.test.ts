import { describe, it, expect, vi } from 'vitest';
import { AiOrchestrator } from '@app/AiOrchestrator';
import { Capabilities, Capability } from '@app/types';

describe('AiOrchestrator.run', () => {
  it('routes to provider runner and forwards payload with capability (happy path)', async () => {
    const routeKey = 'demo.llm.any' as const;
    const llmRunResult = { ok: true } as any;
    const llmRun = vi.fn().mockResolvedValue(llmRunResult);
    const route = {
      provider: 'mockProvider',
      capability: Capabilities.LLM as Capability,
    };
    const routes = {
      resolve: vi.fn().mockReturnValue(route),
    } as any;
    const payload = { prompt: 'hi' } as any;
    const provider = {
      name: 'MockProvider',
      llm: { run: llmRun },
      image: undefined,
    } as any;
    const providers = {
      get: vi.fn().mockReturnValue(provider),
    } as any;

    const orchestrator = new AiOrchestrator(routes, providers);
    const result = await orchestrator.run(routeKey, payload);

    expect(result).toEqual(llmRunResult);
    expect(routes.resolve).toHaveBeenCalledTimes(1);
    expect(routes.resolve).toHaveBeenCalledWith(routeKey);
    expect(providers.get).toHaveBeenCalledTimes(1);
    expect(providers.get).toHaveBeenCalledWith(route.provider);
    expect(llmRun).toHaveBeenCalledTimes(1);
    expect(llmRun).toHaveBeenCalledWith({ ...payload, capability: Capabilities.LLM });
  });
});
