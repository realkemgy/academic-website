// @ts-check
/**
 * Best-effort, in-memory sliding-window rate limiter.
 *
 * Serverless instances are short-lived and not shared, so this only limits
 * bursts that reach the same warm instance. It is one layer among several
 * (honeypot, timing check, optional Turnstile). For a hard limit use the
 * host's edge rate limiting (see docs/CONTACT-FORM.md).
 */
export class MemoryRateLimiter {
  /**
   * @param {{ limit?: number, windowMs?: number, now?: () => number }} [opts]
   */
  constructor({ limit = 5, windowMs = 10 * 60 * 1000, now = Date.now } = {}) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
    /** @type {Map<string, number[]>} */
    this.hits = new Map();
  }

  /**
   * Record a hit. Returns true when the request is allowed.
   * @param {string} key
   */
  hit(key) {
    const t = this.now();
    const recent = (this.hits.get(key) ?? []).filter((x) => t - x < this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(t);
    this.hits.set(key, recent);
    if (this.hits.size > 5000) this.prune(t);
    return true;
  }

  /** @param {number} t */
  prune(t) {
    for (const [k, v] of this.hits) if (!v.some((x) => t - x < this.windowMs)) this.hits.delete(k);
  }
}
