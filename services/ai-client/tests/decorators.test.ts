import { describe, it, expect, vi } from 'vitest';
import { createCollector, createBinder } from '@app/decorators/decorators';
import { META, MetaEntry, Meta } from '@app/decorators/types';
import { BindAdapter } from '@app/decorators/contracts';

describe('decorators:createCollector()', () => {
  const collector = createCollector();

  it('push(): creates ctor[META] array and appends entries', () => {
    class A {}
    const a = new A();
    const e1: MetaEntry = { kind: 'on', channel: 'events', pattern: 'x', method: 'm1' };
    const e2: MetaEntry = { kind: 'use', channel: 'events', pattern: 'y', method: 'm2' };

    collector.push(A.prototype, e1);
    collector.push(A.prototype, e2);
    const meta = (A as any)[META] as Meta;

    expect(Array.isArray(meta)).toBe(true);
    expect(meta).toHaveLength(2);
    expect(meta[0]).toBe(e1);
    expect(meta[1]).toBe(e2);
    expect((a as any)[META]).toBeUndefined();
  });

  it('read(): returns ctor[META] or undefined', () => {
    class A {}
    class B {}

    expect(collector.read(A)).toBeUndefined();

    const e: MetaEntry = { kind: 'on', channel: 'events', pattern: 'x', method: 'm' };
    collector.push(A.prototype, e);

    expect(collector.read(A)).toBe((A as any)[META]);
    expect(collector.read(B)).toBeUndefined();
  });

  it('patch(): patches last matching entry for the method (from the end)', () => {
    class A {}

    const e1: MetaEntry = { kind: 'on', channel: 'events', pattern: 'x', method: 'm', options: { priority: 1 } };
    const e2: MetaEntry = { kind: 'on', channel: 'events', pattern: 'y', method: 'm', options: { priority: 2 } };

    collector.push(A.prototype, e1);
    collector.push(A.prototype, e2);
    collector.patch(A.prototype, 'm', { group: 'G', priority: 99 });

    expect(e1.options).toEqual({ priority: 1 });
    expect(e2.options).toEqual({ priority: 99, group: 'G' });
  });

  it('patch(): throws if no base decorator entry exists for that method', () => {
    class A {}

    expect(() => collector.patch(A.prototype, 'missing', { priority: 1 }))
      .toThrow(/Option decorator must be placed above base decorator/);
  });
});

describe('decorators:createBinder()', () => {
  const entry = (over: Partial<MetaEntry> = {}): MetaEntry => ({
    kind: 'on',
    channel: 'events',
    pattern: 'user.created',
    method: 'onCreated',
    options: {},
    ...over,
  });

  it('register(): returns null if meta is missing or empty', () => {
    const binder = createBinder([]);

    class A {}
    const a = new A();

    expect(binder.register(a)).toBeNull();
    (A as any)[META] = [];
    expect(binder.register(a)).toBeNull();
  });

  it('register(): applies opts.order(meta) when provided', () => {
    const bindCalls: MetaEntry[] = [];
    const adapter: BindAdapter = {
      channel: 'events',
      bind: (e) => {
        bindCalls.push(e);
        return null;
      },
    };
    const e1 = entry({ pattern: 'a', method: 'm1' });
    const e2 = entry({ pattern: 'b', method: 'm2' });
    class A {}
    (A as any)[META] = [e1, e2];

    const order = vi.fn((m: Meta) => [...m].reverse());
    const binder = createBinder([adapter], { order });
    binder.register(new A());

    expect(order).toHaveBeenCalledOnce();
    expect(bindCalls).toEqual([e2, e1]);
  });

  it('register(): calls hook for each entry in the processed order', () => {
    const hook = vi.fn();
    const adapter: BindAdapter = {
      channel: 'events',
      bind: () => null,
    };
    const e1 = entry({ pattern: 'a', method: 'm1' });
    const e2 = entry({ pattern: 'b', method: 'm2' });

    class A {}
    (A as any)[META] = [e1, e2];

    const binder = createBinder([adapter], {
      order: (m) => [m[1], m[0]],
      hook,
    });
    binder.register(new A());

    expect(hook).toHaveBeenCalledTimes(2);
    expect(hook.mock.calls[0][0]).toBe(e2);
    expect(hook.mock.calls[1][0]).toBe(e1);
  });

  it('register(): throws if adapter for entry.channel is missing', () => {
    const binder = createBinder([]);

    class A {}
    (A as any)[META] = [entry({ channel: 'unknown' })];

    expect(() => binder.register(new A()))
      .toThrow(/No adapter for channel "unknown"/);
  });

  it('register(): collects disposables and dispose() calls all of them', () => {
    const d1 = { dispose: vi.fn() };
    const d2 = { dispose: vi.fn() };
    const adapter: BindAdapter = {
      channel: 'events',
      bind: (e) => {
        if (String(e.method) === 'm1') return d1;
        return d2;
      },
    };

    class A {}
    (A as any)[META] = [
      entry({ method: 'm1' }),
      entry({ method: 'm2' }),
    ];

    const binder = createBinder([adapter]);
    const disp = binder.register(new A());

    expect(disp).not.toBeNull();
    disp!.dispose();

    expect(d1.dispose).toHaveBeenCalledOnce();
    expect(d2.dispose).toHaveBeenCalledOnce();
  });

  it('register(): ignores null disposables returned by adapter.bind()', () => {
    const d1 = { dispose: vi.fn() };
    const adapter: BindAdapter = {
      channel: 'events',
      bind: (e) => {
        if (String(e.method) === 'm1') return null;
        return d1;
      },
    };

    class A {}
    (A as any)[META] = [
      entry({ method: 'm1' }),
      entry({ method: 'm2' }),
    ];

    const binder = createBinder([adapter]);
    const disp = binder.register(new A())!;
    disp.dispose();

    expect(d1.dispose).toHaveBeenCalledOnce();
  });

  it('register(): passes instance into adapter.bind(entry, instance)', () => {
    const adapter: BindAdapter = {
      channel: 'events',
      bind: vi.fn(() => null),
    };

    class A {}
    (A as any)[META] = [entry()];

    const inst = new A();
    const binder = createBinder([adapter]);

    binder.register(inst);

    expect(adapter.bind).toHaveBeenCalledOnce();
    expect((adapter.bind as any).mock.calls[0][0]).toEqual((A as any)[META][0]);
    expect((adapter.bind as any).mock.calls[0][1]).toBe(inst);
  });
});
