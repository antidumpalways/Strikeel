import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createStore } from "@strikeel/db";
import { EXECUTION_MODE, dec, toDecimalString } from "@strikeel/core";
import { clientKey, rejectNonLocal } from "../../../lib/http";
import { rateLimitResponse, takeRateLimit } from "../../../lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let store: ReturnType<typeof createStore> | undefined;
function getStore() {
  store ??= createStore();
  return store;
}

const numeric = z.string().regex(/^\d+(\.\d+)?$/).max(80);
const signed = z.string().regex(/^-?\d+(\.\d+)?$/).max(80);

const CreateSchema = z.object({
  symbol: z.string().regex(/^[A-Z0-9]+-USD$/, "invalid symbol").max(32),
  externalDeltaUnits: signed,
  targetRatio: z
    .string()
    .regex(/^\d+(\.\d+)?$/)
    .refine((value) => Number(value) >= 0 && Number(value) <= 1, "ratio must be 0..1"),
  availableMarginUsd: numeric,
  exposureObservedAt: z.string().datetime(),
  exposureDataQuality: z.enum(["fresh", "partial", "stale", "unsupported"]),
  maxNotionalUsd: numeric.default("100000"),
  maxLeverage: numeric.default("3"),
  maxMarginUtilizationPct: numeric.default("50"),
  maxSlippageBps: numeric.default("50"),
  expiresAt: z.string().datetime().optional(),
});

export async function GET(request: Request): Promise<Response> {
  const blocked = rejectNonLocal(request);
  if (blocked) return blocked;
  const strategies = getStore()
    .listStrategies()
    .map((bundle) => {
      const filled = getStore().sumFilledDelta(bundle.strategy.id);
      return {
        ...bundle,
        intents: getStore().listIntents(bundle.strategy.id),
        fills: getStore().listFills(bundle.strategy.id),
        filledDeltaUnits: filled,
        residualDeltaUnits: toDecimalString(
          dec(bundle.strategy.externalDeltaUnits).plus(filled)
        ),
      };
    });
  return Response.json({ strategies, executionMode: EXECUTION_MODE, schemaVersion: 1 });
}

export async function POST(request: Request): Promise<Response> {
  const blocked = rejectNonLocal(request);
  if (blocked) return blocked;
  const limit = takeRateLimit(`create:${clientKey(request)}`, 20, 60_000);
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  const body = await request.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid strategy", issues: parsed.error.issues }, { status: 400 });
  }
  const input = parsed.data;
  const now = new Date();
  const expiresAt = input.expiresAt ?? new Date(now.getTime() + 7 * 86_400_000).toISOString();
  if (Date.parse(expiresAt) - now.getTime() > 30 * 86_400_000) {
    return Response.json({ error: "mandate horizon must be <= 30 days" }, { status: 400 });
  }

  const strategy = {
    id: `strat_${randomUUID()}`,
    symbol: input.symbol,
    externalDeltaUnits: input.externalDeltaUnits,
    targetRatio: input.targetRatio,
    availableMarginUsd: input.availableMarginUsd,
    exposureObservedAt: input.exposureObservedAt,
    exposureDataQuality: input.exposureDataQuality,
    status: "draft" as const,
    createdAt: now.toISOString(),
    constraints: {
      targetRatio: input.targetRatio,
      maxNotionalUsd: input.maxNotionalUsd,
      maxLeverage: input.maxLeverage,
      maxMarginUtilizationPct: input.maxMarginUtilizationPct,
      maxSlippageBps: input.maxSlippageBps,
      minOrderNotionalUsd: "10",
      feeRateBps: process.env.STRIKEEL_TAKER_FEE_BPS ?? "5",
      fundingHorizonHours: "8",
      maxDataAgeMs: 120_000,
      maxPriceDivergenceBps: "50",
      maxResidualUnits: "1000000000",
    },
  };
  const mandate = {
    id: `mand_${randomUUID()}`,
    strategyId: strategy.id,
    active: false,
    expiresAt,
    createdAt: now.toISOString(),
  };

  return Response.json(
    { ...getStore().createStrategy(strategy, mandate), executionMode: EXECUTION_MODE, schemaVersion: 1 },
    { status: 201 }
  );
}






