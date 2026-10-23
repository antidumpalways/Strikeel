import { Decimal, dec, toDecimalString } from "./money";
import type {
  DataStatus,
  ExposureComponent,
  ExposureVector,
  HedgeAvailability,
  NormalizedPosition,
} from "./types";

const QUALITY_RANK: Record<DataStatus, number> = {
  fresh: 0,
  partial: 1,
  stale: 2,
  unsupported: 3,
};

function worst(a: DataStatus, b: DataStatus): DataStatus {
  return QUALITY_RANK[a] >= QUALITY_RANK[b] ? a : b;
}

export interface ExposureInput {
  positions: NormalizedPosition[];
  riskAssetIds: string[];
  marketSymbols?: string[];
  observedAt?: string;
}

export function computeExposure(input: ExposureInput): ExposureVector {
  const riskAssets = new Set(input.riskAssetIds);
  const markets = new Set(input.marketSymbols ?? []);
  const totals = new Map<
    string,
    { symbol: string; delta: Decimal; priceUsd: Decimal; quality: DataStatus }
  >();

  for (const position of input.positions) {
    if (position.dataStatus === "unsupported") continue;

    const add = (assetId: string, symbol: string, quantity: string, priceUsd: string, sign: 1 | -1) => {
      if (!riskAssets.has(assetId)) return;
      const key = assetId;
      const current = totals.get(key) ?? {
        symbol,
        delta: new Decimal(0),
        priceUsd: dec(priceUsd),
        quality: "fresh" as DataStatus,
      };
      current.delta = current.delta.plus(dec(quantity).mul(sign));
      current.priceUsd = dec(priceUsd);
      current.quality = worst(current.quality, position.dataStatus);
      totals.set(key, current);
    };

    for (const asset of position.assets) {
      add(asset.asset.assetId, asset.asset.symbol, asset.quantity, asset.priceUsd, 1);
    }
    for (const liability of position.liabilities) {
      add(liability.asset.assetId, liability.asset.symbol, liability.quantity, liability.priceUsd, -1);
    }
  }

  const components: ExposureComponent[] = [...totals.entries()].map(([riskAssetId, value]) => {
    const hedgeMarketSymbol = `${value.symbol}-USD`;
    const hedgeAvailability: HedgeAvailability =
      value.quality === "fresh" && markets.has(hedgeMarketSymbol) ? "direct" : "unavailable";
    const deltaUsd = value.delta.mul(value.priceUsd);
    return {
      riskAssetId,
      symbol: value.symbol,
      deltaUnits: toDecimalString(value.delta),
      deltaUsd: toDecimalString(deltaUsd),
      notionalUsd: toDecimalString(deltaUsd.abs()),
      hedgeMarketSymbol,
      hedgeAvailability,
      dataQuality: value.quality,
    };
  });

  return {
    observedAt: input.observedAt ?? new Date().toISOString(),
    components,
  };
}

export function findComponent(
  exposure: ExposureVector,
  symbol: string
): ExposureComponent | undefined {
  return exposure.components.find((component) => component.hedgeMarketSymbol === symbol);
}
