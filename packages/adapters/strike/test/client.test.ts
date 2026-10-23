import { describe, expect, it, vi } from "vitest";
import { MarketUnavailableError, StrikeClient } from "../src/index";

const NOW = 1792639283048;

const markets = {
  "ETH-USD": {
    symbol: "ETH-USD",
    default_leverage: 10,
    margin_tiers: [
      {
        max_notional: "50000",
        max_leverage: 5,
        maintenance_margin_rate: "0.005",
        maintenance_amount: "0",
      },
    ],
    order_min_notional: "10",
    order_tick_price: "0.01",
    order_market_step_size: "0.001",
    order_limit_step_size: "0.001",
  },
};

const mark = {
  e: "markPriceUpdate",
  E: NOW,
  s: "ETH-USD",
  p: "2436.00477530",
  i: "2436.75133219",
  r: "-0.0000214899145103827",
  T: NOW + 3600_000,
};

const premium = {
  symbol: "ETH-USD",
  markPrice: "2435.85618086",
  indexPrice: "2436.60417874",
  fundingRate: "-0.0000214910846851993",
  nextFundingTime: NOW + 3600_000,
  time: NOW + 4000,
};

const depth = {
  lastUpdateId: 1,
  E: NOW,
  T: NOW,
  bids: [
    ["2434.6", "0.410"],
    ["2434.5", "1.232"],
  ],
  asks: [
    ["2434.7", "0.410"],
    ["2434.8", "1.232"],
  ],
};

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function client(overrides: { markets?: unknown } = {}) {
  const fetchFn = vi.fn(async (url: string | URL | Request) => {
    const u = String(url);
    if (u.includes("/v2/markets")) return jsonResponse(overrides.markets ?? markets);
    if (u.includes("/v2/markPrice")) return jsonResponse(mark);
    if (u.includes("/v2/premiumIndex")) return jsonResponse(premium);
    if (u.includes("/v2/depth")) return jsonResponse(depth);
    if (u.includes("/v2/time")) return jsonResponse({ serverTime: NOW });
    return jsonResponse({});
  });
  return new StrikeClient({ fetchFn: fetchFn as unknown as typeof fetch });
}

describe("StrikeClient market snapshot", () => {
  it("merges market config, prices, funding and depth", async () => {
    const snapshot = await client().getMarketSnapshot("ETH-USD", { now: NOW });

    expect(snapshot.markPrice).toBe("2436.00477530");
    expect(snapshot.fundingRate).toBe("-0.0000214910846851993");
    expect(snapshot.maxLeverage).toBe("5");
    expect(snapshot.maintenanceMarginRate).toBe("0.005");
    expect(snapshot.minNotional).toBe("10");
    expect(snapshot.bids[0]).toEqual({ price: "2434.6", quantity: "0.410" });
    expect(snapshot.dataStatus).toBe("fresh");
  });

  it("marks data stale beyond the max age", async () => {
    const snapshot = await client().getMarketSnapshot("ETH-USD", {
      now: NOW + 120_000,
      maxDataAgeMs: 60_000,
    });

    expect(snapshot.dataStatus).toBe("stale");
  });

  it("throws for an unknown market", async () => {
    await expect(
      client({ markets: {} }).getMarketSnapshot("ETH-USD", { now: NOW })
    ).rejects.toBeInstanceOf(MarketUnavailableError);
  });
});
