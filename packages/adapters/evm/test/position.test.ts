import { describe, expect, it } from "vitest";
import { tickToSqrtRatioX96, type AssetRef } from "@strikeel/core";
import { buildSpotPosition, mapV3Position } from "../src/index";

const WETH: AssetRef = {
  assetId: "ethereum:ETH",
  chain: "ethereum",
  symbol: "ETH",
  decimals: 18,
  contractAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
};

const USDC: AssetRef = {
  assetId: "ethereum:USDC",
  chain: "ethereum",
  symbol: "USDC",
  decimals: 6,
  contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
};

describe("EVM position mapping", () => {
  it("maps a Uniswap V3 ETH/USDC position into normalized assets", () => {
    const position = mapV3Position({
      raw: {
        tokenId: "123",
        token0: WETH.contractAddress!,
        token1: USDC.contractAddress!,
        fee: 500,
        tickLower: -201000,
        tickUpper: -199600,
        liquidity: "1000000000000000",
      },
      pool: {
        sqrtPriceX96: tickToSqrtRatioX96(-200310).toString(),
        tick: -200310,
      },
      token0: WETH,
      token1: USDC,
      prices: { "ethereum:ETH": "2000", "ethereum:USDC": "1" },
      observedAt: "2026-10-22T00:00:00.000Z",
      blockReference: "12345678",
    });

    expect(position.positionType).toBe("concentrated_lp");
    expect(position.chain).toBe("ethereum");
    expect(position.assets).toHaveLength(2);
    expect(Number(position.assets[0].quantity)).toBeGreaterThan(0);
    expect(Number(position.estimatedValueUsd)).toBeGreaterThan(0);
    expect(position.blockReference).toBe("12345678");
  });

  it("builds a spot position with ETH and USDC", () => {
    const position = buildSpotPosition({
      address: "0x000000000000000000000000000000000000dEaD",
      ethWei: 10n * 10n ** 18n,
      usdcUnits: 20_000n * 10n ** 6n,
      prices: { "ethereum:ETH": "2000" },
      observedAt: "2026-10-22T00:00:00.000Z",
      blockReference: "12345678",
    });

    expect(position.positionType).toBe("spot");
    expect(position.assets[0].quantity).toBe("10");
    expect(position.estimatedValueUsd).toBe("40000");
  });
});
