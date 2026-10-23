import { describe, expect, it } from "vitest";
import { computeExposure, type NormalizedPosition } from "../src/index";

const ETH = {
  assetId: "ethereum:ETH",
  chain: "ethereum" as const,
  symbol: "ETH",
  decimals: 18,
};

const USDC = {
  assetId: "ethereum:USDC",
  chain: "ethereum" as const,
  symbol: "USDC",
  decimals: 6,
};

function position(overrides: Partial<NormalizedPosition> = {}): NormalizedPosition {
  return {
    id: "pos-1",
    chain: "ethereum",
    protocolId: "uniswap-v3",
    positionType: "concentrated_lp",
    externalPositionId: "123",
    assets: [
      { asset: ETH, quantity: "6", priceUsd: "2000", valueUsd: "12000" },
      { asset: USDC, quantity: "12000", priceUsd: "1", valueUsd: "12000" },
    ],
    liabilities: [],
    estimatedValueUsd: "24000",
    observedAt: "2026-10-22T00:00:00.000Z",
    dataStatus: "fresh",
    sourceReference: "fixture",
    adapterVersion: "0.0.0",
    ...overrides,
  };
}

const spot: NormalizedPosition = position({
  id: "spot-1",
  positionType: "spot",
  externalPositionId: "wallet",
  assets: [
    { asset: ETH, quantity: "10", priceUsd: "2000", valueUsd: "20000" },
    { asset: USDC, quantity: "10000", priceUsd: "1", valueUsd: "10000" },
  ],
});

describe("exposure engine", () => {
  it("aggregates spot and LP ETH delta and ignores stablecoins", () => {
    const exposure = computeExposure({
      positions: [spot, position()],
      riskAssetIds: [ETH.assetId],
      marketSymbols: ["ETH-USD"],
    });

    const eth = exposure.components.find((c) => c.riskAssetId === ETH.assetId);
    expect(eth?.deltaUnits).toBe("16");
    expect(eth?.deltaUsd).toBe("32000");
    expect(eth?.hedgeAvailability).toBe("direct");
    expect(exposure.components).toHaveLength(1);
  });

  it("subtracts liabilities", () => {
    const exposure = computeExposure({
      positions: [
        position({
          liabilities: [{ asset: ETH, quantity: "2", priceUsd: "2000", valueUsd: "4000" }],
        }),
      ],
      riskAssetIds: [ETH.assetId],
      marketSymbols: ["ETH-USD"],
    });

    expect(exposure.components[0].deltaUnits).toBe("4");
  });

  it("excludes unsupported positions and marks partial positions unhedgeable", () => {
    const unsupported = position({ id: "unsupported", dataStatus: "unsupported" });
    const partial = position({
      id: "partial",
      dataStatus: "partial",
      assets: [{ asset: ETH, quantity: "1", priceUsd: "2000", valueUsd: "2000" }],
    });

    const exposure = computeExposure({
      positions: [unsupported, partial],
      riskAssetIds: [ETH.assetId],
      marketSymbols: ["ETH-USD"],
    });

    expect(exposure.components).toHaveLength(1);
    expect(exposure.components[0].deltaUnits).toBe("1");
    expect(exposure.components[0].hedgeAvailability).toBe("unavailable");
    expect(exposure.components[0].dataQuality).toBe("partial");
  });
});
