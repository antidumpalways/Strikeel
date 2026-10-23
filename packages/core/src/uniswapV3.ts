import { Decimal, dec, toDecimalString } from "./money";
import type { AssetRef } from "./types";

const Q96 = new Decimal(2).pow(96);
const TICK_BASE = new Decimal("1.0001");

export interface V3Amounts {
  amount0Raw: Decimal;
  amount1Raw: Decimal;
  amount0: Decimal;
  amount1: Decimal;
  inRange: boolean;
}

export interface V3PositionInput {
  token0: AssetRef;
  token1: AssetRef;
  liquidity: string;
  tickLower: number;
  tickUpper: number;
  sqrtPriceX96: string;
  tick: number;
  volatileAssetId: string;
}

export interface V3PositionMath extends V3Amounts {
  volatileAmount: Decimal;
  quoteAmount: Decimal;
  volatileDelta: Decimal;
  volatilePriceHuman: Decimal;
  gammaPerPrice: Decimal;
}

function tenPow(decimals: number): Decimal {
  return new Decimal(10).pow(decimals);
}

export function tickToSqrtRatioX96(tick: number): Decimal {
  return TICK_BASE.pow(tick).sqrt().mul(Q96);
}

export function tickToHumanPrice(
  tick: number,
  token0: AssetRef,
  token1: AssetRef,
  volatileAssetId: string
): Decimal {
  const raw = TICK_BASE.pow(tick);
  if (token0.assetId === volatileAssetId) {
    return raw.mul(tenPow(token0.decimals - token1.decimals));
  }
  if (token1.assetId === volatileAssetId) {
    return new Decimal(1).div(raw).mul(tenPow(token1.decimals - token0.decimals));
  }
  throw new Error(`volatile asset ${volatileAssetId} is not in the pool`);
}

export function amountsForLiquidity(
  input: Pick<V3PositionInput, "sqrtPriceX96" | "tickLower" | "tickUpper" | "liquidity" | "token0" | "token1">
): V3Amounts {
  const sqrtP = dec(input.sqrtPriceX96).div(Q96);
  const sqrtL = tickToSqrtRatioX96(input.tickLower).div(Q96);
  const sqrtU = tickToSqrtRatioX96(input.tickUpper).div(Q96);
  const L = dec(input.liquidity);

  // Snap values within a tiny relative epsilon to the boundary. This keeps a
  // position exactly at tickLower/tickUpper in range despite string rounding.
  const eps = new Decimal("1e-24");
  let p = sqrtP;
  if (p.minus(sqrtL).abs().lte(sqrtL.abs().mul(eps))) p = sqrtL;
  else if (p.minus(sqrtU).abs().lte(sqrtU.abs().mul(eps))) p = sqrtU;

  if (p.lt(sqrtL)) {
    return {
      amount0Raw: L.mul(sqrtU.minus(sqrtL)).div(sqrtU.mul(sqrtL)),
      amount1Raw: new Decimal(0),
      amount0: L.mul(sqrtU.minus(sqrtL)).div(sqrtU.mul(sqrtL)).div(tenPow(input.token0.decimals)),
      amount1: new Decimal(0),
      inRange: false,
    };
  }

  if (p.gt(sqrtU)) {
    return {
      amount0Raw: new Decimal(0),
      amount1Raw: L.mul(sqrtU.minus(sqrtL)),
      amount0: new Decimal(0),
      amount1: L.mul(sqrtU.minus(sqrtL)).div(tenPow(input.token1.decimals)),
      inRange: false,
    };
  }

  const amount0Raw = L.mul(sqrtU.minus(p)).div(p.mul(sqrtU));
  const amount1Raw = Decimal.max(L.mul(p.minus(sqrtL)), 0);
  return {
    amount0Raw,
    amount1Raw,
    amount0: amount0Raw.div(tenPow(input.token0.decimals)),
    amount1: amount1Raw.div(tenPow(input.token1.decimals)),
    inRange: true,
  };
}

export function computeV3Position(input: V3PositionInput): V3PositionMath {
  const amounts = amountsForLiquidity(input);

  let volatileAmount: Decimal;
  let quoteAmount: Decimal;
  if (input.token0.assetId === input.volatileAssetId) {
    volatileAmount = amounts.amount0;
    quoteAmount = amounts.amount1;
  } else if (input.token1.assetId === input.volatileAssetId) {
    volatileAmount = amounts.amount1;
    quoteAmount = amounts.amount0;
  } else {
    throw new Error(`volatile asset ${input.volatileAssetId} is not in the pool`);
  }

  const tick = input.tick;
  const priceAt = (t: number) => tickToHumanPrice(t, input.token0, input.token1, input.volatileAssetId);

  const deltaAt = (t: number) => {
    const shifted = amountsForLiquidity({
      ...input,
      sqrtPriceX96: tickToSqrtRatioX96(t).toString(),
    });
    return input.token0.assetId === input.volatileAssetId ? shifted.amount0 : shifted.amount1;
  };

  const priceMinus = priceAt(tick - 1);
  const pricePlus = priceAt(tick + 1);
  const gammaPerPrice = deltaAt(tick + 1)
    .minus(deltaAt(tick - 1))
    .div(pricePlus.minus(priceMinus));

  return {
    ...amounts,
    volatileAmount,
    quoteAmount,
    volatileDelta: volatileAmount,
    volatilePriceHuman: priceAt(tick),
    gammaPerPrice,
  };
}

export function v3AmountsToPositionAssets(input: {
  token0: AssetRef;
  token1: AssetRef;
  math: V3Amounts;
  priceUsd: Record<string, string>;
}): { asset: AssetRef; quantity: string; priceUsd: string; valueUsd: string }[] {
  const toAsset = (asset: AssetRef, quantity: Decimal) => {
    const price = input.priceUsd[asset.assetId] ?? (asset.symbol === "USDC" || asset.symbol === "USDT" ? "1" : undefined);
    if (price === undefined) {
      throw new Error(`missing USD price for ${asset.assetId}`);
    }
    return {
      asset,
      quantity: toDecimalString(quantity),
      priceUsd: price,
      valueUsd: toDecimalString(quantity.mul(price)),
    };
  };

  return [toAsset(input.token0, input.math.amount0), toAsset(input.token1, input.math.amount1)];
}

