import {
  computeV3Position,
  dec,
  sum,
  toDecimalString,
  v3AmountsToPositionAssets,
  type AssetRef,
  type NormalizedPosition,
} from "@strikeel/core";
import { formatUnits } from "viem";

export interface RawV3Position {
  tokenId: string;
  token0: string;
  token1: string;
  fee: number;
  tickLower: number;
  tickUpper: number;
  liquidity: string;
}

export interface RawPoolState {
  sqrtPriceX96: string;
  tick: number;
}

export interface MapV3Args {
  raw: RawV3Position;
  pool: RawPoolState;
  token0: AssetRef;
  token1: AssetRef;
  prices: Record<string, string>;
  observedAt?: string;
  blockReference?: string;
}

export function mapV3Position(args: MapV3Args): NormalizedPosition {
  const volatile = [args.token0, args.token1].find((token) => token.symbol === "ETH");
  if (!volatile) {
    throw new Error("only ETH-paired Uniswap V3 positions are supported in slice 001");
  }

  const math = computeV3Position({
    token0: args.token0,
    token1: args.token1,
    liquidity: args.raw.liquidity,
    tickLower: args.raw.tickLower,
    tickUpper: args.raw.tickUpper,
    sqrtPriceX96: args.pool.sqrtPriceX96,
    tick: args.pool.tick,
    volatileAssetId: volatile.assetId,
  });

  const assets = v3AmountsToPositionAssets({
    token0: args.token0,
    token1: args.token1,
    math,
    priceUsd: args.prices,
  });
  const value = sum(assets.map((asset) => asset.valueUsd));

  return {
    id: `uniswap-v3:${args.raw.tokenId}`,
    chain: "ethereum",
    protocolId: "uniswap-v3",
    positionType: "concentrated_lp",
    externalPositionId: args.raw.tokenId,
    assets,
    liabilities: [],
    estimatedValueUsd: toDecimalString(value),
    observedAt: args.observedAt ?? new Date().toISOString(),
    blockReference: args.blockReference,
    dataStatus: "fresh",
    sourceReference: `uniswap-v3:${args.raw.tokenId}`,
    adapterVersion: "0.1.0",
  };
}

export interface SpotArgs {
  address: string;
  ethWei: bigint;
  usdcUnits: bigint;
  prices: Record<string, string>;
  observedAt?: string;
  blockReference?: string;
}

export function buildSpotPosition(args: SpotArgs): NormalizedPosition {
  const eth = formatUnits(args.ethWei, 18);
  const usdc = formatUnits(args.usdcUnits, 6);
  const ethPrice = args.prices["ethereum:ETH"];
  if (!ethPrice) throw new Error("missing ethereum:ETH price");

  const assets = [
    {
      asset: {
        assetId: "ethereum:ETH",
        chain: "ethereum" as const,
        symbol: "ETH",
        decimals: 18,
      },
      quantity: eth,
      priceUsd: ethPrice,
      valueUsd: toDecimalString(dec(eth).mul(ethPrice)),
    },
    {
      asset: {
        assetId: "ethereum:USDC",
        chain: "ethereum" as const,
        symbol: "USDC",
        decimals: 6,
      },
      quantity: usdc,
      priceUsd: "1",
      valueUsd: usdc,
    },
  ];

  return {
    id: `wallet:${args.address}`,
    chain: "ethereum",
    protocolId: "wallet",
    positionType: "spot",
    externalPositionId: args.address,
    assets,
    liabilities: [],
    estimatedValueUsd: toDecimalString(sum(assets.map((asset) => asset.valueUsd))),
    observedAt: args.observedAt ?? new Date().toISOString(),
    blockReference: args.blockReference,
    dataStatus: "fresh",
    sourceReference: `wallet:${args.address}`,
    adapterVersion: "0.1.0",
  };
}





