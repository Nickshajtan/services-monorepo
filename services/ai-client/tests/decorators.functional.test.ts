import { describe, it, expect, vi } from 'vitest';
import { createCollector, createBinder } from '@app/decorators/decorators';
import { META, MetaEntry, Meta } from '@app/decorators/types';
import { BindAdapter } from '@app/decorators/contracts';

describe('decorator integration: decorator -> meta -> binder -> adapter', () => {
  it('registers a method decorator entry and binder calls adapter.bind()', () => {
    const collector = createCollector();
    const On = (pattern: string, channel = 'events'): MethodDecorator =>
      (target, propertyKey, descriptor?: PropertyDescriptor) => {
        if (!descriptor) {
          throw new Error('method only');
        }
        const entry: MetaEntry = {
          kind: 'on',
          channel,
          pattern,
          method: propertyKey,
          options: { once: true },
        };
        collector.push(target, entry);
      };

    const adapter: BindAdapter = {
      channel: 'events',
      bind: vi.fn(() => null),
    };
    const binder = createBinder([adapter]);

    class A {
      @On('user.created')
      onCreated(_p: any) {}
    }

    const inst = new A();
    binder.register(inst);
    expect((adapter.bind as any).mock.calls).toHaveLength(1);

    const [entryArg, instanceArg] = (adapter.bind as any).mock.calls[0];
    expect(instanceArg).toBe(inst);
    expect(entryArg.kind).toBe('on');
    expect(entryArg.channel).toBe('events');
    expect(entryArg.pattern).toBe('user.created');
    expect(String(entryArg.method)).toBe('onCreated');

    const meta = (A as any)[META];
    expect(meta?.length).toBe(1);
  });

  it('patch decorator updates base entry options (with TS decorator application order)', () => {
    const collector = createCollector();
    const Base = (pattern: string): MethodDecorator =>
      (target, propertyKey, descriptor?: PropertyDescriptor) => {
        if (!descriptor) {
          throw new Error('method only');
        }
        const entry: MetaEntry = { kind: 'on', channel: 'events', pattern, method: propertyKey };
        collector.push(target, entry);
      };
    const Priority = (value: number): MethodDecorator =>
      (target, propertyKey, descriptor?: PropertyDescriptor) => {
        if (!descriptor) {
          throw new Error('method only');
        }
        collector.patch(target, propertyKey, { priority: value });
      };

    class A {
      @Priority(10)
      @Base('user.created')
      onCreated(_p: any) {}
    }

    const meta = (A as any)[META] as MetaEntry[];
    expect(meta).toHaveLength(1);
    expect(meta[0].options?.priority).toBe(10);
  });

  it('patch decorator throws if base entry not applied before patch (wrong order)', () => {
    const collector = createCollector();
    const Base = (pattern: string): MethodDecorator =>
      (target, propertyKey, descriptor?: PropertyDescriptor) => {
        if (!descriptor) {
          throw new Error('method only');
        }
        collector.push(target, { kind: 'on', channel: 'events', pattern, method: propertyKey });
      };
    const Priority = (value: number): MethodDecorator =>
      (target, propertyKey, descriptor?: PropertyDescriptor) => {
        if (!descriptor) {
          throw new Error('method only');
        }
        collector.patch(target, propertyKey, { priority: value });
      };

    expect(() => {
      class A {
        @Base('user.created')
        @Priority(10)
        onCreated(_p: any) {}
      }

      return A;
    }).toThrow(/Option decorator must be placed above base decorator/);
  });
});
