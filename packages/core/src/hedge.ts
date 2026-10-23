import { Decimal, bps, dec, toDecimalString } from "./money";
import { findComponent } from "./exposure";
import type {
  DepthLevel,
  ExposureVector,
  HedgeConstraints,
  HedgePreview,
  StrikeMarketSnapshot,
} from "./types";

const BLOCKING = new Set([
  "MARKET_UNAVAILABLE",
  "MARKET_NOT_TRADING",
  "DATA_STALE",
  "DATA_NOT_FRESH",
  "INSUFFICIENT_DEPTH",
  "MAX_NOTIONAL",
  "MAX_SLIPPAGE",
  "MAX_MARGIN_UTILIZATION",
  "MAX_RESIDUAL",
  "BELOW_MIN_ORDER",
  "BELOW_MIN_SIZE",
  "ABOVE_MAX_SIZE",
  "MARGIN_UNKNOWN",
  "INSUFFICIENT_MARGIN",
  "PRICE_DIVERGENCE",
  "LEVERAGE_CAPPED",
  "POSITION_NOT_FRESH",
  "INVALID_TARGET",
]);

export interface HedgePreviewInput {
  exposure: ExposureVector;
  market: StrikeMarketSnapshot;
  constraints: HedgeConstraints;
  existingHedgeDeltaUnits?: string;
  availableMarginUsd?: string;
  now: number;
}

function depthForSide(market: StrikeMarketSnapshot, side: "SELL" | "BUY"): DepthLevel[] {
  const levels = side === "SELL" ? market.bids : market.asks;
  return [...levels].sort((a, b) =>
    side === "SELL" ? dec(b.price).cmp(a.price) : dec(a.price).cmp(b.price)
  );
}

function vwapForSize(
  levels: DepthLevel[],
  size: Decimal
): { vwap: Decimal; filled: Decimal; insufficient: boolean } {
  let remaining = size;
  let cost = new Decimal(0);
  let filled = new Decimal(0);

  for (const level of levels) {
    if (remaining.lte(0)) break;
    const price = dec(level.price);
    const available = dec(level.quantity);
    const take = Decimal.min(remaining, available);
    cost = cost.plus(take.mul(price));
    filled = filled.plus(take);
    remaining = remaining.minus(take);
  }

  return {
    vwap: filled.gt(0) ? cost.div(filled) : new Decimal(0),
    filled,
    insufficient: remaining.gt(0),
  };
}

function pickTier(market: StrikeMarketSnapshot, notional: Decimal) {
  if (market.marginTiers.length === 0) return undefined;
  return (
    market.marginTiers.find((tier) => notional.lte(dec(tier.maxNotional))) ??
    market.marginTiers[market.marginTiers.length - 1]
  );
}

export function previewHedge(input: HedgePreviewInput): HedgePreview {
  const { exposure, market, constraints } = input;
  const now = input.now;
  const reasons: string[] = [];
  const component = findComponent(exposure, market.symbol);
  const targetRatio = dec(constraints.targetRatio);

  if (targetRatio.lt(0) || targetRatio.gt(1)) reasons.push("INVALID_TARGET");
  if (!component) reasons.push("MARKET_UNAVAILABLE");
  if (component && component.dataQuality !== "fresh") reasons.push("POSITION_NOT_FRESH");
  else if (component && component.hedgeAvailability !== "direct") reasons.push("MARKET_UNAVAILABLE");
  if (market.status !== "trading") reasons.push("MARKET_NOT_TRADING");

  const observedAtMs = Date.parse(market.observedAt);
  if (!Number.isFinite(observedAtMs) || now - observedAtMs > constraints.maxDataAgeMs) {
    reasons.push("DATA_STALE");
  }
  if (market.dataStatus !== "fresh") reasons.push("DATA_NOT_FRESH");

  const mark = dec(market.markPrice);
  const index = dec(market.indexPrice);
  if (constraints.maxPriceDivergenceBps && mark.gt(0) && index.gt(0)) {
    const divergence = mark.minus(index).abs().div(index).mul(10000);
    if (divergence.gt(dec(constraints.maxPriceDivergenceBps))) {
      reasons.push("PRICE_DIVERGENCE");
    }
  }

  const externalDelta = dec(component?.deltaUnits ?? "0");
  const existingHedge = dec(input.existingHedgeDeltaUnits ?? "0");
  const targetHedge = targetRatio.mul(externalDelta).neg();
  const requestedAdjustment = targetHedge.minus(existingHedge);
  let size = requestedAdjustment.abs();
  let side: "SELL" | "BUY" | "NONE" =
    requestedAdjustment.lt(0) ? "SELL" : requestedAdjustment.gt(0) ? "BUY" : "NONE";

  if (size.gt(0)) {
    const step = dec(market.stepSize);
    if (step.gt(0)) {
      const floored = size.div(step).floor().mul(step);
      if (floored.lt(size)) {
        size = floored;
        reasons.push("SIZE_ROUNDED");
      }
    }
    if (size.lt(dec(market.minSize))) reasons.push("BELOW_MIN_SIZE");
    if (size.gt(dec(market.maxSize))) reasons.push("ABOVE_MAX_SIZE");
    if (size.lte(0)) side = "NONE";
  }

  const signedAdjustment =
    side === "SELL" ? size.neg() : side === "BUY" ? size : new Decimal(0);
  const notionalAtMark = size.mul(mark);
  const minNotional = dec(constraints.minOrderNotionalUsd);

  let vwap = mark;
  let insufficient = false;

  if (size.gt(0) && side !== "NONE") {
    const book = vwapForSize(depthForSide(market, side), size);
    vwap = book.vwap;
    insufficient = book.insufficient;
    if (insufficient) reasons.push("INSUFFICIENT_DEPTH");
    if (notionalAtMark.lt(minNotional)) reasons.push("BELOW_MIN_ORDER");
  }

  const notional = size.mul(vwap);
  const slippageBps = vwap.gt(0) ? vwap.minus(mark).abs().div(mark).mul(10000) : new Decimal(0);
  if (slippageBps.gt(dec(constraints.maxSlippageBps))) reasons.push("MAX_SLIPPAGE");
  if (notional.gt(dec(constraints.maxNotionalUsd))) reasons.push("MAX_NOTIONAL");

  const resultingSize = existingHedge.plus(signedAdjustment).abs();
  const marginNotional = resultingSize.mul(mark);
  const tier = pickTier(market, resultingSize.mul(mark));
  const marketMaxLeverage = tier ? dec(tier.maxLeverage) : dec(market.maxLeverage);
  const leverage = Decimal.min(dec(constraints.maxLeverage), marketMaxLeverage);
  if (dec(constraints.maxLeverage).gt(marketMaxLeverage)) reasons.push("LEVERAGE_CAPPED");
  if (leverage.lte(0)) reasons.push("INVALID_TARGET");

  const initialMargin = leverage.gt(0) ? marginNotional.div(leverage) : new Decimal(0);
  const maintenanceMargin = Decimal.max(
    marginNotional
      .mul(dec(tier?.maintenanceMarginRate ?? market.maintenanceMarginRate))
      .minus(dec(tier?.maintenanceAmount ?? market.maintenanceAmount)),
    0
  );
  const marginHeadroom = Decimal.max(initialMargin.minus(maintenanceMargin), 0);

  const availableMargin = input.availableMarginUsd
    ? dec(input.availableMarginUsd)
    : undefined;
  if (!availableMargin) reasons.push("MARGIN_UNKNOWN");
  if (availableMargin && availableMargin.lte(0)) reasons.push("INSUFFICIENT_MARGIN");
  const marginUtilization =
    availableMargin && availableMargin.gt(0) ? initialMargin.div(availableMargin).mul(100) : null;
  if (marginUtilization && marginUtilization.gt(dec(constraints.maxMarginUtilizationPct))) {
    reasons.push("MAX_MARGIN_UTILIZATION");
  }

  const resultingSigned = existingHedge.plus(signedAdjustment);
  const funding = resultingSigned
    .neg()
    .mul(mark)
    .mul(dec(market.fundingRate))
    .mul(dec(constraints.fundingHorizonHours));
  const fee = notional.mul(bps(constraints.feeRateBps));

  const residual = externalDelta.plus(existingHedge).plus(signedAdjustment);
  const residualUsd = residual.mul(mark);
  if (
    constraints.maxResidualUnits !== undefined &&
    residual.abs().gt(dec(constraints.maxResidualUnits))
  ) {
    reasons.push("MAX_RESIDUAL");
  }

  if (!reasons.some((reason) => BLOCKING.has(reason))) {
    reasons.push(
      side === "NONE" ? "WITHIN_TOLERANCE" : `TARGET_${toDecimalString(targetRatio.mul(100), 0)}PCT`,
      "DIRECT_HEDGE",
      "VWAP_FROM_DEPTH"
    );
  }

  return {
    symbol: market.symbol,
    side,
    targetRatio: toDecimalString(targetRatio),
    externalDeltaUnits: toDecimalString(externalDelta),
    existingHedgeDeltaUnits: toDecimalString(existingHedge),
    targetHedgeDeltaUnits: toDecimalString(targetHedge),
    adjustmentUnits: toDecimalString(signedAdjustment),
    notionalUsd: toDecimalString(notional),
    vwapPrice: toDecimalString(vwap),
    markPrice: toDecimalString(mark),
    estimatedSlippageBps: toDecimalString(slippageBps),
    estimatedFeeUsd: toDecimalString(fee),
    estimatedFundingUsd: toDecimalString(funding),
    initialMarginUsd: toDecimalString(initialMargin),
    maintenanceMarginUsd: toDecimalString(maintenanceMargin),
    marginHeadroomUsd: toDecimalString(marginHeadroom),
    marginUtilizationPct: marginUtilization ? toDecimalString(marginUtilization, 4) : null,
    residualDeltaUnits: toDecimalString(residual),
    residualDeltaUsd: toDecimalString(residualUsd),
    leverage: toDecimalString(leverage),
    status: reasons.some((reason) => BLOCKING.has(reason)) ? "blocked" : "proposed",
    reasons,
    dataStatus: market.dataStatus,
    observedAt: market.observedAt,
  };
}



