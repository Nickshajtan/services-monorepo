import { describe, beforeEach, it, expect, vi } from 'vitest';
import { EventBus } from '@app/events/EventBus';
import { EmitMode } from '@app/events/types';
import { MemoryCache } from '@app/cache/MemoryCache';
import { WildcardKeyResolver } from '@app/WildcardKeyResolver';

type Events = {
  'a.b.c': { n: number };
  'user.created': { id: string };
  'http.request': { headers: Record<string, string>; traceId?: string };
};

const makeBus = (validatePatterns = true) => {
  const resolver = new WildcardKeyResolver(new MemoryCache(), '.', 4);
  return new EventBus<Events>(resolver, { validatePatterns });
}

describe('EventBus', () => {
  let bus: EventBus<Events>;

  beforeEach(() => {
    bus = makeBus();
  });

  it('calls exact handler on emit', async () => {
    const spy = vi.fn();
    bus.on('user.created', spy);
    await bus.emit('user.created', { id: '1' });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ id: '1' });
  });

  it('calls wildcard handler on emit (trailing wildcard)', async () => {
    const spy = vi.fn();
    bus.on('user.*', spy);
    await bus.emit('user.created', { id: '1' });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('respects sequential emit order', async () => {
    const order: string[] = [];
    bus.on('a.b.c', async () => { order.push('1'); });
    bus.on('a.b.c', async () => { order.push('2'); });
    await bus.emit('a.b.c', { n: 1 }, { mode: EmitMode.Sequential });
    expect(order).toEqual(['1', '2']);
  });

  it('parallel mode runs handlers concurrently', async () => {
    let started = 0;
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    bus.on('a.b.c', async () => { started++; await gate; });
    bus.on('a.b.c', async () => { started++; await gate; });
    const promise = bus.emit('a.b.c', { n: 1 }, { mode: EmitMode.Parallel });
    await Promise.resolve();
    expect(started).toBe(2);
    release();
    await promise;
  });

  it('unsubscribe stops handler from being called', async () => {
    const spy = vi.fn();
    const off = bus.on('user.created', spy);
    off();
    await bus.emit('user.created', { id: '1' });
    expect(spy).toHaveBeenCalledTimes(0);
  });

  it('run() executes middleware pipeline and returns final context', async () => {
    bus.use('http.request', async (ctx, next) => next({ ...ctx, traceId: 't1' }));
    bus.use('http.request', async (ctx, next) => next({ ...ctx, headers: { ...ctx.headers, x: '1' } }));
    const res = await bus.run('http.request', { headers: {} });
    expect(res.traceId).toBe('t1');
    expect(res.headers.x).toBe('1');
  });

  it('middleware-stop: chain stops when middleware does not call next', async () => {
    bus.use('http.request', async (ctx) => ({ ...ctx, traceId: 'STOP' })); // no next
    bus.use('http.request', async (ctx, next) => next({ ...ctx, traceId: 'SHOULD_NOT' }));
    const res = await bus.run('http.request', { headers: {} });
    expect(res.traceId).toBe('STOP');
  });

  it('wildcard middleware matches and is applied', async () => {
    bus.use('http.*', async (ctx, next) => next({ ...ctx, traceId: 'wild' }));
    const res = await bus.run('http.request', { headers: {} });
    expect(res.traceId).toBe('wild');
  });

  it('validatePatterns=true rejects wildcard in the middle', () => {
    expect(() => bus.on('a.*.c', () => {})).toThrow();
    expect(() => bus.use('a.*.c', async (c, n) => n(c))).toThrow();
  });

  it('validatePatterns=false allows wildcard in the middle (but resolver may not match it)', async () => {
    const bus = makeBus(false);
    const spy = vi.fn();
    bus.on('a.*.c', spy);
    await bus.emit('a.b.c', { n: 1 });
    expect(spy).toHaveBeenCalledTimes(0);
  });
});
