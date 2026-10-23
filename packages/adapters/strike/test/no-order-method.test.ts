import { describe, expect, it } from "vitest";
import { StrikeClient } from "../src/index";

describe("StrikeClient read-only surface", () => {
  it("exposes no order, cancel, submit, or withdraw methods", () => {
    const methods = Object.getOwnPropertyNames(StrikeClient.prototype);
    expect(methods.some((method) => /order|submit|cancel|trade|withdraw/i.test(method))).toBe(false);
  });
});
