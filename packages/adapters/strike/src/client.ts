import type { DepthLevel, StrikeMarketSnapshot } from "@strikeel/core";

export interface StrikeMarketTier {
  max_notional: string;
  max_leverage: number;
  maintenance_margin_rate: string;
  maintenance_amount: string;
}

export interface StrikeMarketConfig {
  symbol: string;
  default_leverage?: number;
  margin_tiers?: StrikeMarketTier[];
  order_min_notional?: string;
  order_tick_price?: string;
  order_market_step_size?: string;
  order_limit_step_size?: string;
  order_market_min_size?: string;
  order_market_max_size?: string;
  order_limit_min_size?: string;
  order_limit_max_size?: string;
  status?: string;
}

type JsonObject = Record<string, unknown>;

export interface StrikeClientOptions {
  baseUrl?: string;
  priceUrl?: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

export class MarketUnavailableError extends Error {
  constructor(symbol: string) {
    super(`market unavailable: ${symbol}`);
    this.name = "MarketUnavailableError";
  }
}

function firstObject(value: unknown): JsonObject {
  if (Array.isArray(value)) {
    if (value.length === 0) return {};
    return value[0] as JsonObject;
  }
  return (value ?? {}) as JsonObject;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asDepth(value: unknown): DepthLevel[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((level): level is [string, string] => Array.isArray(level) && level.length >= 2)
    .map(([price, quantity]) => ({ price: String(price), quantity: String(quantity) }));
}

export class StrikeClient {
  private readonly baseUrl: string;
  private readonly priceUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;
  private clockOffsetMs = 0;
  private clockSyncedAt = 0;
  private marketsCache: { at: number; data: Record<string, StrikeMarketConfig> } | undefined;

  constructor(options: StrikeClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "https://api.strikefinance.org").replace(/\/$/, "");
    this.priceUrl = (options.priceUrl ?? `${this.baseUrl}/price`).replace(/\/$/, "");
    this.fetchFn = options.fetchFn ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  private async json(url: string): Promise<unknown> {
    const response = await this.fetchFn(url, { signal: AbortSignal.timeout(this.timeoutMs) });
    if (!response.ok) {
      throw new Error(`Strike request failed ${response.status}: ${url}`);
    }
    return response.json();
  }

  async getServerTime(): Promise<number> {
    const data = (await this.json(`${this.baseUrl}/v2/time`)) as { serverTime?: number };
    if (typeof data.serverTime !== "number") throw new Error("invalid /v2/time response");
    return data.serverTime;
  }

  async getServerNow(): Promise<number> {
    if (Date.now() - this.clockSyncedAt < 30_000) {
      return Date.now() + this.clockOffsetMs;
    }
    const serverTime = await this.getServerTime();
    this.clockOffsetMs = serverTime - Date.now();
    this.clockSyncedAt = Date.now();
    return serverTime;
  }

  async getMarkets(): Promise<Record<string, StrikeMarketConfig>> {
    const cacheMs = Number(process.env.STRIKEEL_MARKET_CACHE_MS ?? 10_000);
    if (
      this.marketsCache &&
      Number.isFinite(cacheMs) &&
      Date.now() - this.marketsCache.at < cacheMs
    ) {
      return this.marketsCache.data;
    }
    const data = (await this.json(`${this.baseUrl}/v2/markets`)) as
      | Record<string, StrikeMarketConfig>
      | { markets: Record<string, StrikeMarketConfig> };
    const nested = (data as { markets?: Record<string, StrikeMarketConfig> }).markets;
    const markets = nested ?? (data as Record<string, StrikeMarketConfig>);
    this.marketsCache = { at: Date.now(), data: markets };
    return markets;
  }

  async getMarketSnapshot(
    symbol: string,
    options: { now?: number; maxDataAgeMs?: number } = {}
  ): Promise<StrikeMarketSnapshot> {
    const [markets, markRaw, premiumRaw, depthRaw, serverNow] = await Promise.all([
      this.getMarkets(),
      this.json(`${this.priceUrl}/v2/markPrice?symbol=${encodeURIComponent(symbol)}`),
      this.json(`${this.priceUrl}/v2/premiumIndex?symbol=${encodeURIComponent(symbol)}`),
      this.json(`${this.priceUrl}/v2/depth?symbol=${encodeURIComponent(symbol)}&limit=100`),
      this.getServerNow(),
    ]);

    const market = markets[symbol];
    if (!market) throw new MarketUnavailableError(symbol);

    const mark = firstObject(markRaw);
    const premium = firstObject(premiumRaw);
    const depth = firstObject(depthRaw);
    const rawTimestamps = [Number(mark.E), Number(premium.time), Number(depth.E)];
    const hasAllTimestamps = rawTimestamps.every(
      (value) => Number.isFinite(value) && value > 0
    );
    const observedAtMs = hasAllTimestamps ? Math.min(...rawTimestamps) : 0;
    const now = options.now ?? serverNow;
    const maxDataAgeMs = options.maxDataAgeMs ?? 60_000;
    const tier = market.margin_tiers?.[0];

    return {
      symbol,
      status: market.status ?? "unknown",
      markPrice: asString(mark.p, asString(premium.markPrice, "0")),
      indexPrice: asString(mark.i, asString(premium.indexPrice, "0")),
      fundingRate: asString(premium.lastFundingRate, asString(premium.fundingRate, asString(mark.r, "0"))),
      nextFundingTime: Number(premium.nextFundingTime ?? mark.T ?? 0),
      maxLeverage: String(tier?.max_leverage ?? market.default_leverage ?? 10),
      maintenanceMarginRate: asString(tier?.maintenance_margin_rate, "0"),
      maintenanceAmount: asString(tier?.maintenance_amount, "0"),
      marginTiers: (market.margin_tiers ?? []).map((item) => ({
        maxNotional: String(item.max_notional),
        maxLeverage: String(item.max_leverage),
        maintenanceMarginRate: String(item.maintenance_margin_rate),
        maintenanceAmount: String(item.maintenance_amount),
      })),
      minNotional: asString(market.order_min_notional, "10"),
      tickSize: asString(market.order_tick_price, "0.01"),
      stepSize: asString(market.order_market_step_size, asString(market.order_limit_step_size, "0.001")),
      minSize: asString(market.order_market_min_size, asString(market.order_limit_min_size, "0")),
      maxSize: asString(market.order_market_max_size, asString(market.order_limit_max_size, "0")),
      takerFeeBps: process.env.STRIKEEL_TAKER_FEE_BPS ?? "5",
      bids: asDepth(depth.bids),
      asks: asDepth(depth.asks),
      observedAt: new Date(observedAtMs).toISOString(),
      dataStatus:
        !hasAllTimestamps || now - observedAtMs > maxDataAgeMs ? "stale" : "fresh",
      source: `${this.priceUrl}/v2/{markPrice,premiumIndex,depth}?symbol=${symbol}`,
    };
  }
}



