import { describe, it, expect, beforeEach } from 'vitest';
import { WildcardKeyResolver } from '@app/wildcards/WildcardKeyResolver';
import type { Cache } from '@app/cache/CacheInterface';

class TestCache<T> implements Cache<T> {
  private store = new Map<string, T>();

  get(ns: string, key: string): T | undefined {
    return this.store.get(`${ns}::${key}`);
  }

  set(ns: string, key: string, value: T): void {
    this.store.set(`${ns}::${key}`, value);
  }
}

describe('WildcardKeyResolver', () => {
  let resolver: WildcardKeyResolver;

  beforeEach(() => {
    resolver = new WildcardKeyResolver( new TestCache<string[]>() as any, '.', 4 );
  });

  it('2 segments: returns candidates in precedence order', () => {
    expect(resolver.getCandidateKeys('a.b')).toEqual([ 'a.b', 'a.*', '*.b', '*.*' ]);
  });

  it('3 segments: returns candidates in precedence order', () => {
    expect(resolver.getCandidateKeys('a.b.c')).toEqual(
      ['a.b.c', 'a.b.*', 'a.*.*', '*.b.c', '*.b.*', '*.*.c', '*.*.*']
    );
  });

  it('4 segments: returns candidates in precedence order', () => {
    expect(resolver.getCandidateKeys('a.b.c.d')).toEqual(
      ['a.b.c.d', 'a.b.c.*', 'a.b.*.*', 'a.*.*.*', '*.b.c.d', '*.b.c.*', '*.b.*.*', '*.*.c.d', '*.*.c.*', '*.*.*.d', '*.*.*.*']
    );
  });

  it('deduplicates candidates while preserving order', () => {
    const response = resolver.getCandidateKeys('a.b.c.d');
    const set = new Set(response);
    expect(set.size).toBe(response.length);
  });

  it('handles empty or dot-only keys as ["*"]', () => {
    expect(resolver.getCandidateKeys('')).toEqual(['*']);
    expect(resolver.getCandidateKeys('.')).toEqual(['*']);
    expect(resolver.getCandidateKeys('..')).toEqual(['*']);
  });

  it('filters empty segments: "a..b" treated like "a.b"', () => {
    expect(resolver.getCandidateKeys('a..b')).toEqual(['a.b', 'a.*', '*.b', '*.*']);
  });

  it('throws when key exceeds maxSegments', () => {
    const resolver = new WildcardKeyResolver(new TestCache<string[]>() as any, '.', 3 );
    expect(() => resolver.getCandidateKeys('a.b.c.d')).toThrow(/max is 3/);
  });
});

describe('WildcardKeyResolver:validatePattern', () => {
  let resolver: WildcardKeyResolver;

  beforeEach(() => {
    resolver = new WildcardKeyResolver( new TestCache<string[]>() as any, '.', 4 );
  });

  it('accepts exact patterns', () => {
    expect(() => resolver.validatePattern('a.b.c')).not.toThrow();
  });

  it('accepts trailing wildcards (tail-only)', () => {
    expect(() => resolver.validatePattern('a.b.*')).not.toThrow();
    expect(() => resolver.validatePattern('a.*.*')).not.toThrow();
    expect(() => resolver.validatePattern('*.*.*')).not.toThrow();
  });

  it('accepts leading wildcards (prefix-only)', () => {
    expect(() => resolver.validatePattern('*.b.c')).not.toThrow();
    expect(() => resolver.validatePattern('*.b.*')).not.toThrow();
    expect(() => resolver.validatePattern('*.*.c')).not.toThrow();
  });

  it('rejects wildcard in the middle: "a.*.c"', () => {
    expect(() => resolver.validatePattern('a.*.c')).toThrow(/unsupported wildcard in the middle/);
  });

  it('throws when pattern exceeds maxSegments', () => {
    const resolver = new WildcardKeyResolver(new TestCache<string[]>() as any,'.', 2);
    expect(() => resolver.validatePattern('a.b.c')).toThrow(/max is 2/);
  });

  it('noop for empty/dot-only patterns', () => {
    expect(() => resolver.validatePattern('')).not.toThrow();
    expect(() => resolver.validatePattern('.')).not.toThrow();
  });
});

describe('WildcardKeyResolver:cache', () => {
  it('uses cache for repeated calls (same reference)', () => {
    const cache = new TestCache<string[]>();
    const resolver = new WildcardKeyResolver(cache as any, '.', 4);
    const a = resolver.getCandidateKeys('a.b.c');
    const b = resolver.getCandidateKeys('a.b.c');
    expect(b).toBe(a);
  });
});
