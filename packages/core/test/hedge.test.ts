import { describe, expect, it } from "vitest";
import {
  previewHedge,
  type ExposureVector,
  type HedgeConstraints,
  type StrikeMarketSnapshot,
} from "../src/index";

const NOW = Date.parse("2026-10-22T00:00:00.000Z");

const exposure: ExposureVector = {
  observedAt: new Date(NOW).toISOString(),
  components: [
    {
      riskAssetId: "ethereum:ETH",
      symbol: "ETH",
      deltaUnits: "10",
      deltaUsd: "20000",
      notionalUsd: "20000",
      hedgeMarketSymbol: "ETH-USD",
      hedgeAvailability: "direct",
      dataQuality: "fresh",
    },
  ],
};

function market(overrides: Partial<StrikeMarketSnapshot> = {}): StrikeMarketSnapshot {
  return {
    symbol: "ETH-USD",
    status: "trading",
    markPrice: "2000",
    indexPrice: "2000",
    fundingRate: "0.0001",
    nextFundingTime: NOW + 3600_000,
    maxLeverage: "5",
    maintenanceMarginRate: "0.005",
    maintenanceAmount: "0",
    marginTiers: [
      {
        maxNotional: "50000",
        maxLeverage: "5",
        maintenanceMarginRate: "0.005",
        maintenanceAmount: "0",
      },
    ],
    minNotional: "10",
    tickSize: "0.01",
    stepSize: "0.001",
    minSize: "0.001",
    maxSize: "1000",
    takerFeeBps: "5",
    bids: [
      { price: "1999", quantity: "5" },
      { price: "1998", quantity: "5" },
    ],
    asks: [
      { price: "2001", quantity: "5" },
      { price: "2002", quantity: "5" },
    ],
    observedAt: new Date(NOW).toISOString(),
    dataStatus: "fresh",
    source: "fixture",
    ...overrides,
  };
}

function constraints(overrides: Partial<HedgeConstraints> = {}): HedgeConstraints {
  return {
    targetRatio: "0.8",
    maxNotionalUsd: "100000",
    maxLeverage: "5",
    maxMarginUtilizationPct: "50",
    maxSlippageBps: "50",
    minOrderNotionalUsd: "10",
    feeRateBps: "5",
    fundingHorizonHours: "8",
    maxDataAgeMs: 60_000,
    maxPriceDivergenceBps: "50",
    ...overrides,
  };
}

function preview(overrides: {
  market?: StrikeMarketSnapshot;
  constraints?: HedgeConstraints;
  existingHedgeDeltaUnits?: string;
  availableMarginUsd?: string;
} = {}) {
  return previewHedge({
    exposure,
    market: overrides.market ?? market(),
    constraints: overrides.constraints ?? constraints(),
    existingHedgeDeltaUnits: overrides.existingHedgeDeltaUnits,
    availableMarginUsd: overrides.availableMarginUsd ?? "10000",
    now: NOW,
  });
}

describe("hedge preview", () => {
  it("computes an 80% short, residual, margin and costs", () => {
    const p = preview();

    expect(p.status).toBe("proposed");
    expect(p.side).toBe("SELL");
    expect(p.targetHedgeDeltaUnits).toBe("-8");
    expect(p.adjustmentUnits).toBe("-8");
    expect(Number(p.notionalUsd)).toBeCloseTo(15989, 0);
    expect(p.residualDeltaUnits).toBe("2");
    expect(p.residualDeltaUsd).toBe("4000");
    expect(Number(p.initialMarginUsd)).toBeCloseTo(3200, 1);
    expect(Number(p.estimatedFundingUsd)).toBeCloseTo(12.8, 6);
    expect(p.marginUtilizationPct).not.toBeNull();
    expect(p.reasons).toContain("TARGET_80PCT");
  });

  it("adjusts an existing short instead of opening a full hedge", () => {
    const p = preview({ existingHedgeDeltaUnits: "-5" });

    expect(p.adjustmentUnits).toBe("-3");
    expect(Number(p.notionalUsd)).toBeCloseTo(5997, 0);
    expect(p.residualDeltaUnits).toBe("2");
  });

  it("does not propose when the target is already met", () => {
    const p = preview({ constraints: constraints({ targetRatio: "0" }) });

    expect(p.side).toBe("NONE");
    expect(p.adjustmentUnits).toBe("0");
    expect(p.reasons).toContain("WITHIN_TOLERANCE");
  });

  it("blocks stale data", () => {
    const p = preview({
      market: market({
        observedAt: new Date(NOW - 120_000).toISOString(),
        dataStatus: "stale",
      }),
    });

    expect(p.status).toBe("blocked");
    expect(p.reasons).toContain("DATA_STALE");
    expect(p.reasons).toContain("DATA_NOT_FRESH");
  });

  it("blocks insufficient depth", () => {
    const p = preview({
      market: market({ bids: [{ price: "1999", quantity: "1" }] }),
    });

    expect(p.status).toBe("blocked");
    expect(p.reasons).toContain("INSUFFICIENT_DEPTH");
  });

  it("blocks unknown margin and max margin utilization", () => {
    const unknown = preview({ availableMarginUsd: "" });
    expect(unknown.status).toBe("blocked");
    expect(unknown.reasons).toContain("MARGIN_UNKNOWN");

    const margin = preview({ availableMarginUsd: "1000" });
    expect(margin.reasons).toContain("MAX_MARGIN_UTILIZATION");
  });

  it("blocks max notional, slippage, residual and price divergence", () => {
    const maxNotional = preview({ constraints: constraints({ maxNotionalUsd: "10000" }) });
    expect(maxNotional.reasons).toContain("MAX_NOTIONAL");

    const maxSlippage = preview({
      market: market({
        bids: [
          { price: "1900", quantity: "10" },
          { price: "1800", quantity: "10" },
        ],
      }),
    });
    expect(maxSlippage.reasons).toContain("MAX_SLIPPAGE");

    const residual = preview({ constraints: constraints({ maxResidualUnits: "1" }) });
    expect(residual.reasons).toContain("MAX_RESIDUAL");

    const divergence = preview({ market: market({ indexPrice: "1900" }) });
    expect(divergence.reasons).toContain("PRICE_DIVERGENCE");
  });

  it("floors size to the venue step and blocks market not trading", () => {
    const rounded = preview({
      market: market({ stepSize: "0.01" }),
      constraints: constraints({ targetRatio: "0.3333" }),
    });
    expect(rounded.adjustmentUnits).toBe("-3.33");
    expect(rounded.reasons).toContain("SIZE_ROUNDED");

    const notTrading = preview({ market: market({ status: "paused" }) });
    expect(notTrading.reasons).toContain("MARKET_NOT_TRADING");
  });

  it("blocks missing market and min/max size", () => {
    const missing = preview({ market: market({ symbol: "SOL-USD" }) });
    expect(missing.reasons).toContain("MARKET_UNAVAILABLE");

    const tooSmall = preview({
      market: market({ minSize: "5" }),
      constraints: constraints({ targetRatio: "0.1" }),
    });
    expect(tooSmall.reasons).toContain("BELOW_MIN_SIZE");

    const tooLarge = preview({ market: market({ maxSize: "0.5" }) });
    expect(tooLarge.reasons).toContain("ABOVE_MAX_SIZE");
  });

  it("picks the margin tier from the resulting position notional", () => {
    const p = preview({
      market: market({
        marginTiers: [
          {
            maxNotional: "10000",
            maxLeverage: "5",
            maintenanceMarginRate: "0.005",
            maintenanceAmount: "0",
          },
          {
            maxNotional: "50000",
            maxLeverage: "2",
            maintenanceMarginRate: "0.01",
            maintenanceAmount: "100",
          },
        ],
      }),
      constraints: constraints({ targetRatio: "1", maxLeverage: "5" }),
    });

    expect(p.leverage).toBe("2");
    expect(Number(p.maintenanceMarginUsd)).toBeCloseTo(100, 2);
  });

  it("blocks partial exposure with POSITION_NOT_FRESH and keeps residual", () => {
    const partial: ExposureVector = {
      ...exposure,
      components: [
        {
          ...exposure.components[0],
          dataQuality: "partial",
          hedgeAvailability: "unavailable",
        },
      ],
    };
    const p = previewHedge({
      exposure: partial,
      market: market(),
      constraints: constraints(),
      availableMarginUsd: "10000",
      now: NOW,
    });

    expect(p.status).toBe("blocked");
    expect(p.reasons).toContain("POSITION_NOT_FRESH");
    expect(p.residualDeltaUnits).toBe("2");
  });

  it("blocks an empty order book and zero margin", () => {
    const empty = preview({ market: market({ bids: [], asks: [] }) });
    expect(empty.status).toBe("blocked");
    expect(empty.reasons).toContain("INSUFFICIENT_DEPTH");

    const zero = preview({ availableMarginUsd: "0" });
    expect(zero.status).toBe("blocked");
    expect(zero.reasons).toContain("INSUFFICIENT_MARGIN");
  });

  it("is deterministic for identical inputs", () => {
    expect(JSON.stringify(preview())).toBe(JSON.stringify(preview()));
  });
});


