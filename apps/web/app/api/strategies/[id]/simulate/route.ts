import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createStore } from "@strikeel/db";
import { EXECUTION_MODE, previewHedge, simulateExecution } from "@strikeel/core";
import { StrikeClient } from "@strikeel/strike-adapter";
import { clientKey, rejectNonLocal } from "../../../../../lib/http";
import { rateLimitResponse, takeRateLimit } from "../../../../../lib/rate-limit";
import { withLock } from "../../../../../lib/lock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let store: ReturnType<typeof createStore> | undefined;
function getStore() {
  store ??= createStore();
  return store;
}

const BodySchema = z.object({ idempotencyKey: z.string().min(8).max(128) });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  const blocked = rejectNonLocal(request);
  if (blocked) return blocked;
  const { id } = await context.params;
  const limit = takeRateLimit(`simulate:${id}:${clientKey(request)}`);
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  const body = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid body" }, { status: 400 });

  return withLock(`strategy:${id}`, () => executeSimulation(id, parsed.data.idempotencyKey));
}

async function executeSimulation(id: string, idempotencyKey: string): Promise<Response> {
  const bundle = getStore().getStrategy(id);
  if (!bundle) return Response.json({ error: "strategy not found" }, { status: 404 });
  const existing = getStore().findIntent(id, idempotencyKey);
  if (existing) {
    getStore().saveAudit(id, existing.id, "execution.replayed", {
      idempotencyKey,
      state: existing.state,
      schemaVersion: 1,
    });
    return Response.json({
      execution: { intent: existing },
      preview: null,
      idempotent: true,
      simulated: true,
      executionMode: EXECUTION_MODE,
      schemaVersion: 1,
    });
  }

  if (!bundle.mandate.active) {
    getStore().saveAudit(id, null, "execution.blocked", {
      reason: "MANDATE_INACTIVE",
      schemaVersion: 1,
    });
    return Response.json(
      {
        error: "mandate is not active",
        reason: "MANDATE_INACTIVE",
        executionMode: EXECUTION_MODE,
        schemaVersion: 1,
      },
      { status: 400 }
    );
  }
  if (Date.parse(bundle.mandate.expiresAt) < Date.now()) {
    getStore().saveAudit(id, null, "execution.blocked", {
      reason: "MANDATE_EXPIRED",
      schemaVersion: 1,
    });
    return Response.json(
      {
        error: "mandate expired",
        reason: "MANDATE_EXPIRED",
        executionMode: EXECUTION_MODE,
        schemaVersion: 1,
      },
      { status: 400 }
    );
  }
  if (getStore().hasUnresolvedIntent(id)) {
    getStore().saveAudit(id, null, "execution.blocked", {
      reason: "UNRESOLVED_INTENT",
      schemaVersion: 1,
    });
    return Response.json(
      {
        error: "unresolved intent requires reconciliation",
        reason: "UNRESOLVED_INTENT",
        executionMode: EXECUTION_MODE,
        schemaVersion: 1,
      },
      { status: 409 }
    );
  }

  const strike = new StrikeClient();
  let snapshot;
  try {
    snapshot = await strike.getMarketSnapshot(bundle.strategy.symbol, { maxDataAgeMs: 120_000 });
  } catch (error) {
    getStore().saveAudit(id, null, "execution.market_unavailable", {
      reason: (error as Error).message.slice(0, 200),
      schemaVersion: 1,
    });
    return Response.json(
      {
        error: "market unavailable",
        reason: "MARKET_UNAVAILABLE",
        executionMode: EXECUTION_MODE,
        schemaVersion: 1,
      },
      { status: 503 }
    );
  }

  let serverNow: number;
  try {
    serverNow = await strike.getServerNow();
  } catch {
    getStore().saveAudit(id, null, "execution.market_unavailable", {
      reason: "CLOCK_UNSYNCED",
      schemaVersion: 1,
    });
    return Response.json(
      {
        error: "clock unavailable",
        reason: "CLOCK_UNSYNCED",
        executionMode: EXECUTION_MODE,
        schemaVersion: 1,
      },
      { status: 503 }
    );
  }
  const exposureObserved = Date.parse(bundle.strategy.exposureObservedAt);
  const positionStale =
    !Number.isFinite(exposureObserved) || Date.now() - exposureObserved > 120_000;
  const dataQuality = positionStale
    ? "stale"
    : (bundle.strategy.exposureDataQuality as "fresh" | "partial" | "stale" | "unsupported");

  const exposure = {
    observedAt: bundle.strategy.exposureObservedAt || new Date(serverNow).toISOString(),
    components: [
      {
        riskAssetId: bundle.strategy.symbol,
        symbol: bundle.strategy.symbol.split("-")[0],
        deltaUnits: bundle.strategy.externalDeltaUnits,
        deltaUsd: "0",
        notionalUsd: "0",
        hedgeMarketSymbol: bundle.strategy.symbol,
        hedgeAvailability: "direct" as const,
        dataQuality,
      },
    ],
  };

  const preview = previewHedge({
    exposure,
    market: snapshot,
    constraints: bundle.strategy.constraints,
    existingHedgeDeltaUnits: getStore().sumFilledDelta(id),
    availableMarginUsd: bundle.strategy.availableMarginUsd,
    now: serverNow,
  });

  const result = simulateExecution({
    strategyId: id,
    intentId: `int_${randomUUID()}`,
    idempotencyKey,
    symbol: bundle.strategy.symbol,
    preview,
    now: new Date().toISOString(),
    marketSource: snapshot.source,
    adapterVersion: "0.1.0",
  });

  try {
    getStore().saveExecution(id, result.intent, result.fill, result.audits);
  } catch (error) {
    const replay = getStore().findIntent(id, idempotencyKey);
    if (replay) {
      return Response.json({
        execution: { intent: replay },
        preview,
        idempotent: true,
        simulated: true,
        executionMode: EXECUTION_MODE,
        schemaVersion: 1,
      });
    }
    throw error;
  }

  return Response.json({
    preview,
    execution: result,
    simulated: true,
    executionMode: EXECUTION_MODE,
    schemaVersion: 1,
  });
}
