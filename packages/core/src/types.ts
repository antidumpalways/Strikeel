export type Chain = "ethereum" | "solana" | "cardano";

export type PositionType =
  | "spot"
  | "amm_lp"
  | "concentrated_lp"
  | "lending_collateral"
  | "borrowed_liability"
  | "staked_asset"
  | "derivative"
  | "unknown";

export type DataStatus = "fresh" | "stale" | "partial" | "unsupported";

export type HedgeAvailability = "direct" | "proxy" | "unavailable";

export interface AssetRef {
  /** Stable internal id, e.g. `ethereum:ETH` or `cardano:<policyId>.<assetName>`. */
  assetId: string;
  chain: Chain;
  symbol: string;
  decimals: number;
  contractAddress?: string;
  policyId?: string;
  assetName?: string;
}

export interface PositionAsset {
  asset: AssetRef;
  quantity: string;
  priceUsd: string;
  valueUsd: string;
}

export interface NormalizedPosition {
  id: string;
  chain: Chain;
  protocolId: string;
  positionType: PositionType;
  externalPositionId: string;
  assets: PositionAsset[];
  liabilities: PositionAsset[];
  estimatedValueUsd: string;
  observedAt: string;
  blockReference?: string;
  dataStatus: DataStatus;
  sourceReference: string;
  adapterVersion: string;
}

export interface ExposureComponent {
  riskAssetId: string;
  symbol: string;
  deltaUnits: string;
  deltaUsd: string;
  notionalUsd: string;
  hedgeMarketSymbol?: string;
  hedgeAvailability: HedgeAvailability;
  dataQuality: DataStatus;
}

export interface ExposureVector {
  observedAt: string;
  components: ExposureComponent[];
}

export interface DepthLevel {
  price: string;
  quantity: string;
}

export interface MarginTier {
  maxNotional: string;
  maxLeverage: string;
  maintenanceMarginRate: string;
  maintenanceAmount: string;
}

export interface StrikeMarketSnapshot {
  status: string;
  marginTiers: MarginTier[];
  minSize: string;
  maxSize: string;
  symbol: string;
  markPrice: string;
  indexPrice: string;
  fundingRate: string;
  nextFundingTime: number;
  maxLeverage: string;
  maintenanceMarginRate: string;
  maintenanceAmount: string;
  minNotional: string;
  tickSize: string;
  stepSize: string;
  takerFeeBps: string;
  bids: DepthLevel[];
  asks: DepthLevel[];
  observedAt: string;
  dataStatus: DataStatus;
  source: string;
}

export interface HedgeConstraints {
  targetRatio: string;
  maxNotionalUsd: string;
  maxLeverage: string;
  maxMarginUtilizationPct: string;
  maxSlippageBps: string;
  minOrderNotionalUsd: string;
  feeRateBps: string;
  fundingHorizonHours: string;
  maxDataAgeMs: number;
  maxResidualUnits?: string;
  maxPriceDivergenceBps?: string;
}

export interface HedgePreview {
  symbol: string;
  side: "SELL" | "BUY" | "NONE";
  targetRatio: string;
  externalDeltaUnits: string;
  existingHedgeDeltaUnits: string;
  targetHedgeDeltaUnits: string;
  adjustmentUnits: string;
  notionalUsd: string;
  vwapPrice: string;
  markPrice: string;
  estimatedSlippageBps: string;
  estimatedFeeUsd: string;
  estimatedFundingUsd: string;
  initialMarginUsd: string;
  maintenanceMarginUsd: string;
  marginHeadroomUsd: string;
  marginUtilizationPct: string | null;
  residualDeltaUnits: string;
  residualDeltaUsd: string;
  leverage: string;
  status: "proposed" | "blocked";
  reasons: string[];
  dataStatus: DataStatus;
  observedAt: string;
}

export type HedgeProposal = HedgePreview;




