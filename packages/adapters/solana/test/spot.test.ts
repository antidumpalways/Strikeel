import { describe, expect, it } from "vitest";
import { buildSolanaSpot } from "../src/index";

describe("Solana spot position", () => {
  it("converts lamports and USDC units to a normalized position", () => {
    const p = buildSolanaSpot({
      address: "So11111111111111111111111111111111111111112",
      lamports: 2_000_000_000n,
      usdcUnits: 100_000_000n,
      prices: { "solana:SOL": "100" },
      observedAt: "2026-10-22T00:00:00.000Z",
      slot: 123,
    });

    expect(p.chain).toBe("solana");
    expect(p.assets[0].quantity).toBe("2");
    expect(p.assets[1].quantity).toBe("100");
    expect(p.estimatedValueUsd).toBe("300");
    expect(p.blockReference).toBe("123");
  });
});
