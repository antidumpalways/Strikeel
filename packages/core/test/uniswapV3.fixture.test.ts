import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { computeV3Position, dec } from "../src/index";

const fixture = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), "tests", "fixtures", "uniswap-v3-1387878.json"),
    "utf8"
  )
) as {
  tokenId: string;
  token0: { address: string; symbol: string; decimals: number };
  token1: { address: string; symbol: string; decimals: number };
  tickLower: number;
  tickUpper: number;
  liquidity: string;
  sqrtPriceX96: string;
  tick: number;
  expected: { amount0: string; amount1: string };
};

function relativeError(actual: string, expected: string): number {
  return dec(actual).minus(expected).abs().div(expected).toNumber();
}

describe("Uniswap V3 recorded-block fixture", () => {
  it("matches SDK-computed amounts within 1e-6 relative tolerance", () => {
    const math = computeV3Position({
      token0: {
        assetId: "ethereum:USDC",
        chain: "ethereum",
        symbol: fixture.token0.symbol,
        decimals: fixture.token0.decimals,
        contractAddress: fixture.token0.address,
      },
      token1: {
        assetId: "ethereum:ETH",
        chain: "ethereum",
        symbol: fixture.token1.symbol,
        decimals: fixture.token1.decimals,
        contractAddress: fixture.token1.address,
      },
      liquidity: fixture.liquidity,
      tickLower: fixture.tickLower,
      tickUpper: fixture.tickUpper,
      sqrtPriceX96: fixture.sqrtPriceX96,
      tick: fixture.tick,
      volatileAssetId: "ethereum:ETH",
    });

    expect(math.inRange).toBe(true);
    expect(relativeError(math.amount0.toString(), fixture.expected.amount0)).toBeLessThan(1e-6);
    expect(relativeError(math.amount1.toString(), fixture.expected.amount1)).toBeLessThan(1e-6);
  });
});
