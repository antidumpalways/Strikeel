import { afterEach, describe, expect, it } from "vitest";
import { isLocalHost, isLocalRequest } from "../lib/http";
import { takeRateLimit } from "../lib/rate-limit";

afterEach(() => {
  process.env.STRIKEEL_LOCAL_ONLY = "true";
});

describe("loopback guard", () => {
  it("accepts local hosts and rejects public hosts", () => {
    expect(isLocalHost("localhost:3000")).toBe(true);
    expect(isLocalHost("127.0.0.1:3000")).toBe(true);
    expect(isLocalHost("[::1]:3000")).toBe(true);
    expect(isLocalHost("::ffff:127.0.0.1")).toBe(true);
    expect(isLocalHost("10.0.0.1:3000")).toBe(false);
    expect(isLocalHost("example.com")).toBe(false);
  });

  it("blocks non-local requests by default and allows opt-out", () => {
    expect(isLocalRequest(new Request("http://example.com/api/activity"))).toBe(false);
    expect(isLocalRequest(new Request("http://127.0.0.1:3000/api/activity"))).toBe(true);
    process.env.STRIKEEL_LOCAL_ONLY = "false";
    expect(isLocalRequest(new Request("http://example.com/api/activity"))).toBe(true);
  });
});

describe("in-process rate limit", () => {
  it("allows up to the limit then rejects", () => {
    const key = `test-${Date.now()}`;
    expect(takeRateLimit(key, 2, 60_000).allowed).toBe(true);
    expect(takeRateLimit(key, 2, 60_000).allowed).toBe(true);
    expect(takeRateLimit(key, 2, 60_000).allowed).toBe(false);
  });
});
