import { describe, expect, it } from "vitest";
import {
  computeV3Position,
  tickToSqrtRatioX96,
  v3AmountsToPositionAssets,
  type AssetRef,
} from "../src/index";

const ETH: AssetRef = {
  assetId: "ethereum:ETH",
  chain: "ethereum",
  symbol: "ETH",
  decimals: 18,
};

const USDC: AssetRef = {
  assetId: "ethereum:USDC",
  chain: "ethereum",
  symbol: "USDC",
  decimals: 6,
};

function positionAt(tick: number, liquidity = "1000000000000000") {
  return {
    token0: ETH,
    token1: USDC,
    liquidity,
    tickLower: -201000,
    tickUpper: -199600,
    sqrtPriceX96: tickToSqrtRatioX96(tick).toString(),
    tick,
    volatileAssetId: ETH.assetId,
  };
}

describe("Uniswap V3 position math", () => {
  it("computes both token amounts in range and treats ETH balance as delta", () => {
    const math = computeV3Position(positionAt(-200310));

    expect(math.inRange).toBe(true);
    expect(math.amount0.gt(0)).toBe(true);
    expect(math.amount1.gt(0)).toBe(true);
    expect(math.volatileDelta.eq(math.amount0)).toBe(true);
    expect(math.gammaPerPrice.lt(0)).toBe(true);
  });

  it("returns all token0 below the range", () => {
    const math = computeV3Position(positionAt(-202000));

    expect(math.inRange).toBe(false);
    expect(math.amount0.gt(0)).toBe(true);
    expect(math.amount1.eq(0)).toBe(true);
    expect(math.volatileDelta.eq(math.amount0)).toBe(true);
  });

  it("returns all token1 above the range", () => {
    const math = computeV3Position(positionAt(-199000));

    expect(math.inRange).toBe(false);
    expect(math.amount0.eq(0)).toBe(true);
    expect(math.amount1.gt(0)).toBe(true);
    // Volatile asset is token0 (ETH), so above the range there is no ETH delta.
    expect(math.volatileDelta.eq(0)).toBe(true);
  });

  it("is in range exactly at the lower boundary", () => {
    const math = computeV3Position(positionAt(-201000));

    expect(math.inRange).toBe(true);
    expect(math.amount1.eq(0)).toBe(true);
  });

  it("converts amounts to USD using the volatile price and stablecoin $1", () => {
    const math = computeV3Position(positionAt(-200310));
    const assets = v3AmountsToPositionAssets({
      token0: ETH,
      token1: USDC,
      math,
      priceUsd: { "ethereum:ETH": "2000" },
    });

    expect(assets).toHaveLength(2);
    expect(Number(assets[0].valueUsd)).toBeGreaterThan(0);
    expect(assets[1].priceUsd).toBe("1");
    expect(Number(assets[0].valueUsd) + Number(assets[1].valueUsd)).toBeGreaterThan(0);
  });
});

