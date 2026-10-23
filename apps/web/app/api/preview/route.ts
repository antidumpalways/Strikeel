import {
  computeExposure,
  EXECUTION_MODE,
  previewHedge,
  sum,
  toDecimalString,
  type HedgeConstraints,
  type NormalizedPosition,
  type StrikeMarketSnapshot,
} from "@strikeel/core";
import { z } from "zod";
import { createStore } from "@strikeel/db";
import { StrikeClient } from "@strikeel/strike-adapter";
import { discoverEvmWallet } from "@strikeel/evm-adapter";
import { discoverSolanaWallet } from "@strikeel/solana-adapter";
import { discoverCardanoWallet } from "@strikeel/cardano-adapter";
import { rejectNonLocal } from "../../../lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const strike = new StrikeClient();
const SYMBOLS = ["ETH-USD", "SOL-USD", "ADA-USD"] as const;
const RISK_ASSETS = ["ethereum:ETH", "solana:SOL", "cardano:ADA"];
const POSITION_TTL_MS = 300_000;
let store: ReturnType<typeof createStore> | undefined;
function getStore() {
  store ??= createStore();
  return store;
}

const QuerySchema = z.object({
  eth: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "invalid EVM address")
    .optional(),
  sol: z.string().min(32).max(64).optional(),
  ada: z.string().min(20).max(160).optional(),
  ethTokenIds: z
    .string()
    .regex(/^\d+(,\d+)*$/, "token ids must be comma-separated integers")
    .refine((value) => value.split(",").length <= 20, "at most 20 token ids")
    .optional(),
  margin: z
    .string()
    .regex(/^\d+(\.\d+)?$/, "margin must be a positive number")
    .optional(),
});

function constraintsFor(snapshot: StrikeMarketSnapshot): HedgeConstraints {
  return {
    targetRatio: "0.8",
    maxNotionalUsd: "100000",
    maxLeverage: "3",
    maxMarginUtilizationPct: "50",
    maxSlippageBps: "50",
    minOrderNotionalUsd: snapshot.minNotional,
    feeRateBps: snapshot.takerFeeBps,
    fundingHorizonHours: "8",
    maxDataAgeMs: 120_000,
    maxPriceDivergenceBps: "50",
    maxResidualUnits: "1000",
  };
}

export async function GET(request: Request): Promise<Response> {
  const blocked = rejectNonLocal(request);
  if (blocked) return blocked;
  const url = new URL(request.url);
  const parsedQuery = QuerySchema.safeParse({
    eth: url.searchParams.get("eth")?.trim() || undefined,
    sol: url.searchParams.get("sol")?.trim() || undefined,
    ada: url.searchParams.get("ada")?.trim() || undefined,
    ethTokenIds: url.searchParams.get("ethTokenIds")?.trim() || undefined,
    margin: url.searchParams.get("margin")?.trim() || undefined,
  });
  if (!parsedQuery.success) {
    return Response.json(
      { error: "invalid query parameters", issues: parsedQuery.error.issues },
      { status: 400 }
    );
  }
  const { eth, sol, ada } = parsedQuery.data;
  const margin = parsedQuery.data.margin;
  const tokenIds = (parsedQuery.data.ethTokenIds ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const warnings: string[] = [];
  const snapshots = new Map<string, StrikeMarketSnapshot>();

  const results = await Promise.allSettled(
    SYMBOLS.map((symbol) => strike.getMarketSnapshot(symbol, { maxDataAgeMs: 120_000 }))
  );
  results.forEach((result, index) => {
    if (result.status === "fulfilled") snapshots.set(SYMBOLS[index], result.value);
    else warnings.push(`${SYMBOLS[index]} unavailable: ${result.reason?.message ?? "error"}`);
  });

  const prices: Record<string, string> = {
    "ethereum:USDC": "1",
    "solana:USDC": "1",
    "ethereum:ETH": snapshots.get("ETH-USD")?.markPrice ?? "0",
    "solana:SOL": snapshots.get("SOL-USD")?.markPrice ?? "0",
    "cardano:ADA": snapshots.get("ADA-USD")?.markPrice ?? "0",
  };
  const ethSnap = snapshots.get("ETH-USD");
  const solSnap = snapshots.get("SOL-USD");
  const adaSnap = snapshots.get("ADA-USD");
  const unpricedChains = new Set<string>();
  if (!ethSnap) unpricedChains.add("ethereum");
  if (!solSnap) unpricedChains.add("solana");
  if (!adaSnap) unpricedChains.add("cardano");

  const positions: NormalizedPosition[] = [];

  const discoveries = await Promise.allSettled([
    eth
      ? discoverEvmWallet({
          address: eth as `0x${string}`,
          prices,
          tokenIds: tokenIds.length ? tokenIds : undefined,
          maxPositions: 20,
        })
      : Promise.resolve(undefined),
    sol ? discoverSolanaWallet({ address: sol, prices }) : Promise.resolve(undefined),
    ada ? discoverCardanoWallet({ address: ada, prices }) : Promise.resolve(undefined),
  ]);

  const labels = ["Ethereum", "Solana", "Cardano"];
  discoveries.forEach((result, index) => {
    if (result.status === "rejected") {
      warnings.push(`${labels[index]} discovery failed: ${result.reason?.message ?? "error"}`);
      return;
    }
    if (!result.value) return;
    positions.push(...result.value.positions);
    for (const warning of result.value.warnings ?? []) warnings.push(`${labels[index]}: ${warning}`);
  });

  let serverNow: number;
  try {
    serverNow = await strike.getServerNow();
  } catch {
    serverNow = Date.now();
    warnings.push("CLOCK_UNSYNCED: using local time because /v2/time failed");
  }
  const positionNow = Date.now();
  const freshPositions: NormalizedPosition[] = positions.map((position) => {
    const observed = Date.parse(position.observedAt);
    const stale = !Number.isFinite(observed) || positionNow - observed > POSITION_TTL_MS;
    const dataStatus = unpricedChains.has(position.chain)
      ? ("partial" as const)
      : stale
        ? ("stale" as const)
        : position.dataStatus;
    return dataStatus === position.dataStatus ? position : { ...position, dataStatus };
  });
  const portfolioValueUsd = toDecimalString(
    sum(freshPositions.map((position) => position.estimatedValueUsd))
  );

  const exposure = computeExposure({
    positions: freshPositions,
    riskAssetIds: RISK_ASSETS,
    marketSymbols: [...SYMBOLS],
    observedAt: new Date().toISOString(),
  });

  const previews = exposure.components.flatMap((component) => {
    const snapshot = component.hedgeMarketSymbol
      ? snapshots.get(component.hedgeMarketSymbol)
      : undefined;
    if (!snapshot) return [];
    return [previewHedge({ exposure, market: snapshot, constraints: constraintsFor(snapshot), availableMarginUsd: margin, now: serverNow })];
  });

  try {
    getStore().saveRun(freshPositions, previews);
  } catch (error) {
    warnings.push(`persistence failed: ${(error as Error).message}`);
  }

  const unhedgeable = exposure.components
    .filter((component) => component.hedgeAvailability !== "direct")
    .map((component) => ({
      riskAssetId: component.riskAssetId,
      symbol: component.symbol,
      deltaUnits: component.deltaUnits,
      reason: component.dataQuality !== "fresh" ? "POSITION_NOT_FRESH" : "MARKET_UNAVAILABLE",
    }));

  return Response.json({
    executionMode: EXECUTION_MODE,
    schemaVersion: 1,
    ordersSubmitted: false,
    generatedAt: new Date().toISOString(),
    addresses: { eth, sol, ada },
    tokenIds,
    portfolioValueUsd,
    positions: freshPositions,
    exposure,
    previews,
    unhedgeable,
    markets: [...snapshots.values()].map((snapshot) => ({
      symbol: snapshot.symbol,
      markPrice: snapshot.markPrice,
      fundingRate: snapshot.fundingRate,
      observedAt: snapshot.observedAt,
      dataStatus: snapshot.dataStatus,
      bids: snapshot.bids.length,
      asks: snapshot.asks.length,
    })),
    warnings,
    disclaimer:
      "Simulation only. No orders are sent to Strike. Indonesia is a restricted jurisdiction; live execution requires written authorization.",
  });
}



