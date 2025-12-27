import { MemoryCache } from '@app/cache/MemoryCache';
import { Cache } from '@app/cache/CacheInterface';

export class WildcardKeyResolver {
  constructor(
    private readonly cache: Cache<string[]> = new MemoryCache(),
    private readonly separator = '.',
    private readonly maxSegments = 4,
  ) {}

  /**
   * Returns keys in order of precedence:
   * exact -> partial wildcard -> all-wildcards
   *
   * For 3 segments:
   * a.b.c, a.b.*, a.*.*, *.b.c, *.b.*, *.*.*
   *
   * For 2 segments:
   * a.b, a.*, *.b, *.*
   *
   * For 4 segments (generalization):
   * a.b.c.d,
   * a.b.c.*,
   * a.b.*.*,
   * a.b.*.*,
   * a.*.*.*,
   * *.b.c.d,
   * *.b.c.*,
   * *.b.*.*,
   * *.*.*.*
   */
  getCandidateKeys(key: string): string[]
  {
    const NS = "WildcardKeyResolver:getCandidateKeys";
    const cached = this.cache.get(NS, key);
    if (cached) {
      return cached;
    }

    const segments = key.split(this.separator).filter(Boolean);
    if (0 === segments.length) {
      const res = ['*'];
      this.cache.set(NS, key, res);
      return res;
    }

    this.assertWithinMax(key, segments.length);
    const res = this.buildCandidates(segments);
    this.cache.set(NS, key, res);

    return res;
  }

  validatePattern(pattern: string): void {
    const segments = this.splitSegments(pattern);
    if (0 === segments.length) {
      return;
    }

    this.assertWithinMax(pattern, segments.length);
    const firstNonStar = segments.findIndex(s => s !== '*');
    const lastNonStar = segments.length - 1 - [...segments].reverse().findIndex(s => s !== '*');

    if (firstNonStar === -1) {
      return;
    }

    for (let i = firstNonStar; i <= lastNonStar; i++) {
      if (segments[i] === '*') {
        this.throw(`WildcardKeyResolver: unsupported wildcard in the middle: "${pattern}"`);
      }
    }
  }

  private splitSegments = (value: string): string[] => value.split(this.separator).filter(Boolean);

  private buildCandidates(segments: string[]): string[]
  {
    const out: string[] = [];
    const join = (arr: string[]) => arr.join('.');

    // 1) exact
    out.push(join(segments));
    // 2) "prefix wildcards": replace the tail with *
    // a.b.c -> a.b.*, a.*.*
    for (let tail = 1; tail < segments.length; tail++) {
      out.push(join([
        ...segments.slice(0, segments.length - tail),
        ...new Array(tail).fill('*')
      ]));
    }

    // 3) "leading wildcards": *.b.c
    // For n=3: *.b.c, *.b.*, *.*.*
    // For n=4: *.b.c.d, *.b.c.*, *.b.*.*, *.*.*.*
    for (let lead = 1; lead < segments.length; lead++) {
      const prefix = new Array(lead).fill('*');
      const rest = segments.slice(lead);
      // exact for rest:
      out.push(join([...prefix, ...rest]));

      // + tail *
      for (let tail = 1; tail < rest.length; tail++) {
        out.push(join([
          ...prefix,
          ...rest.slice(0, rest.length - tail),
          ...new Array(tail).fill('*')
        ]));
      }
    }

    // 4) all wildcards
    const all = join(new Array(segments.length).fill('*'));
    if (out[out.length - 1] !== all) {
      out.push(all);
    }

    return this.uniqStable(out);
  }

  private uniqStable = (arr: string[]): string[] => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const x of arr) {
      if (seen.has(x)) {
        continue;
      }
      seen.add(x);
      out.push(x);
    }

    return out;
  }

  private assertWithinMax(value: string, len: number): void {
    if (len > this.maxSegments) {
      this.throw(`WildcardKeyResolver: key "${value}" has ${len} segments, max is ${this.maxSegments}`);
    }
  }

  private throw = (message: string): void => {
    throw new Error(message);
  }
}
