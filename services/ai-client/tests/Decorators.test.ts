import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FakeBus } from '@tests/mocks/FakeEventBus';
import { Decorators } from '@app/events/Decorators';
import { createEventDecorators } from '@app/events/contracts';

type Events = {
  'a.b.c': { n: number };
  'a.b.*': { n: number };
  'user.created': { id: string };
  'user.deleted': { id: string };
  'http.request': { url: string };
};

describe('Decorators + createEventDecorators', () => {
  let bus: FakeBus<Events>;
  const { OnEvent, UseMWGroup, UseMWPriority, UseEventMW, OnEventOnce } = createEventDecorators<Events>();

  beforeEach(() => {
    vi.useRealTimers();
    bus = new FakeBus<Events>();
  });

  it('register returns null if instance has no metadata', () => {
    class Plain {}
    const inst = new Plain();
    const result = Decorators.register(bus, inst);
    expect(result).toBeNull();
    expect(bus.onCalls.length).toBe(0);
    expect(bus.useCalls.length).toBe(0);
  });

  it('throws if decorated "method" is not a function', () => {
    class Bad {
      @OnEvent('user.created')
      onCreated(_p: any) {}
    }

    const inst: any = new Bad();
    inst.onCreated = 123;
    expect(() => Decorators.register(bus, inst)).toThrow(/is not a method/);
  });

  it('calls hook.onSubscribe with group/priority', () => {
    const hook = { onSubscribe: vi.fn() };

    class Sub {
      @OnEvent('user.created')
      onCreated(_p: Events['user.created']) {}

      @UseMWGroup('auth')
      @UseMWPriority(100)
      @UseEventMW('http.request')
      mw(_ctx: any, next: any) { return next(_ctx); }
    }

    const inst = new Sub();
    Decorators.register(bus, inst, hook);

    expect(hook.onSubscribe).toHaveBeenCalled();
    const calls = hook.onSubscribe.mock.calls.map((c) => c[0]);
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'on', pattern: 'user.created', method: 'onCreated' }),
        expect.objectContaining({ kind: 'use', pattern: 'http.request', method: 'mw', group: 'auth', priority: 100 }),
      ])
    );

  });

  it('register subscribes handlers and middlewares using bus.on/bus.use', () => {
    class Sub {
      @OnEvent('user.created')
      onCreated(_p: Events['user.created']) {}

      @UseEventMW('http.request')
      mw(_ctx: any, next: any) { return next(_ctx); }
    }

    const inst = new Sub();
    Decorators.register(bus, inst);

    expect(bus.onCalls.map((c) => c.pattern)).toEqual(['user.created']);
    expect(bus.useCalls.map((c) => c.pattern)).toEqual(['http.request']);
  });

  it('priority-per-event: orders subscriptions within same (kind|pattern) by priority desc, stable by appearance', () => {
    class Sub {
      @UseMWPriority(0)
      @UseEventMW('http.request')
      mw0(_ctx: any, next: any) { return next(_ctx); }

      @UseMWPriority(10)
      @UseEventMW('http.request')
      mw10(_ctx: any, next: any) { return next(_ctx); }

      @UseMWPriority(10)
      @UseEventMW('http.request')
      mw10b(_ctx: any, next: any) { return next(_ctx); }

      @UseMWPriority(999)
      @UseEventMW('user.created')
      mwOther(_ctx: any, next: any) { return next(_ctx); }
    }

    const inst = new Sub();
    Decorators.register(bus, inst);
    const methods = bus.useCalls.map((c) => c.pattern);
    expect(methods).toEqual(['http.request', 'http.request', 'http.request', 'user.created']);

    const hook = { onSubscribe: vi.fn() };
    const bus2 = new FakeBus<Events>();
    Decorators.register(bus2, inst, hook);

    const httpReq = hook.onSubscribe.mock.calls.map(c => c[0]).filter(x => x.kind === 'use' && x.pattern === 'http.request');
    expect(httpReq.map(x => x.method)).toEqual(['mw10', 'mw10b', 'mw0']);
  });

  it('@Once: handler is subscribed and invoked only once even if event fires twice', async () => {
    class Sub {
      calls = 0;

      @OnEventOnce('user.deleted')
      async onDeleted(_p: Events['user.deleted']) {
        this.calls++;
      }
    }

    const inst = new Sub();
    Decorators.register(bus, inst);

    await bus.trigger('user.deleted', { id: '1' });
    await bus.trigger('user.deleted', { id: '2' });

    expect(inst.calls).toBe(1);
  });

  it('@Debounce: handler fires once with last payload after debounce window', async () => {
    vi.useFakeTimers();

    const bus = new FakeBus<Events>();
    const { OnEventDebounce } = createEventDecorators<Events>();

    class Sub {
      calls: any[] = [];

      @OnEventDebounce('http.request', 200)
      onReq(p: Events['http.request']) {
        this.calls.push(p.url);
      }
    }

    const inst = new Sub();
    Decorators.register(bus, inst);

    await bus.trigger('http.request', { url: '1' });
    await bus.trigger('http.request', { url: '2' });
    await bus.trigger('http.request', { url: '3' });

    expect(inst.calls).toEqual([]);
    await vi.advanceTimersByTimeAsync(199);
    expect(inst.calls).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(inst.calls).toEqual(['3']);

    vi.useRealTimers();
  });

  it('dispose unsubscribes all registered subscriptions', async () => {
    class Sub {
      calls = 0;

      @OnEvent('user.created')
      async onCreated(_p: Events['user.created']) {
        this.calls++;
      }
    }

    const inst = new Sub();
    const disp = Decorators.register(bus, inst);
    expect(disp).not.toBeNull();

    await bus.trigger('user.created', { id: '1' });
    expect(inst.calls).toBe(1);

    disp!.dispose();

    await bus.trigger('user.created', { id: '2' });
    expect(inst.calls).toBe(1);
  });

  it('Group/Priority must be placed above On/Use (decorator order enforced)', () => {
    expect(() => {
      class Sub {
        @UseEventMW('http.request')
        @UseMWGroup('auth')
        mw(_ctx: any, next: any) { return next(_ctx); }
      }
      return Sub;
    }).toThrow(/must be placed above/i);
  });
});
