import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createStore } from "../src/index";
import type { ExecutionIntent, HedgePreview, MandateRecord, NormalizedPosition, SimulatedFill, StrategyRecord } from "@strikeel/core";

const position: NormalizedPosition = {
  id: "pos-1",
  chain: "ethereum",
  protocolId: "wallet",
  positionType: "spot",
  externalPositionId: "0xabc",
  assets: [],
  liabilities: [],
  estimatedValueUsd: "1",
  observedAt: "2026-10-22T00:00:00.000Z",
  blockReference: "123",
  dataStatus: "fresh",
  sourceReference: "test",
  adapterVersion: "0.1.0",
};

const preview: HedgePreview = {
  symbol: "ETH-USD",
  side: "SELL",
  targetRatio: "0.8",
  externalDeltaUnits: "1",
  existingHedgeDeltaUnits: "0",
  targetHedgeDeltaUnits: "-0.8",
  adjustmentUnits: "-0.8",
  notionalUsd: "2000",
  vwapPrice: "2000",
  markPrice: "2000",
  estimatedSlippageBps: "0",
  estimatedFeeUsd: "0",
  estimatedFundingUsd: "0",
  initialMarginUsd: "400",
  maintenanceMarginUsd: "10",
  marginHeadroomUsd: "390",
  marginUtilizationPct: "10",
  residualDeltaUnits: "0.2",
  residualDeltaUsd: "400",
  leverage: "5",
  status: "proposed",
  reasons: ["TARGET_80PCT"],
  dataStatus: "fresh",
  observedAt: "2026-10-22T00:00:00.000Z",
};

describe("SQLite store", () => {
  it("persists position snapshots and risk decisions", () => {
    const file = path.join(os.tmpdir(), `strikeel-${randomUUID()}.sqlite`);
    const store = createStore(file);
    const saved = store.saveRun([position], [preview]);
    const counts = store.counts();
    store.close();

    expect(saved).toEqual({ positions: 1, decisions: 1 });
    expect(counts).toEqual({ positions: 1, decisions: 1, strategies: 0, intents: 0 });
    fs.rmSync(file, { force: true });
  });
  it("persists strategies, mandates, intents, fills and activity", () => {
    const file = path.join(os.tmpdir(), `strikeel-strategy-${randomUUID()}.sqlite`);
    const store = createStore(file);
    const now = "2026-10-22T00:00:00.000Z";
    const strategy: StrategyRecord = {
      id: "strat_1",
      symbol: "ETH-USD",
      externalDeltaUnits: "10",
      targetRatio: "0.8",
      availableMarginUsd: "10000",
      exposureObservedAt: now,
      exposureDataQuality: "fresh",
      status: "draft",
      createdAt: now,
      constraints: {
        targetRatio: "0.8",
        maxNotionalUsd: "100000",
        maxLeverage: "3",
        maxMarginUtilizationPct: "50",
        maxSlippageBps: "50",
        minOrderNotionalUsd: "10",
        feeRateBps: "5",
        fundingHorizonHours: "8",
        maxDataAgeMs: 120000,
        maxPriceDivergenceBps: "50",
        maxResidualUnits: "1000000000",
      },
    };
    const mandate: MandateRecord = {
      id: "mand_1",
      strategyId: strategy.id,
      active: false,
      expiresAt: "2026-10-29T00:00:00.000Z",
      createdAt: now,
    };
    store.createStrategy(strategy, mandate);
    store.setMandateActive(strategy.id, true);

    const intent: ExecutionIntent = {
      id: "int_1",
      strategyId: strategy.id,
      idempotencyKey: "key-1",
      symbol: "ETH-USD",
      state: "FILLED",
      requestedDeltaUnits: "-8",
      filledDeltaUnits: "-8",
      reasons: [],
      createdAt: now,
      updatedAt: now,
    };
    const fill: SimulatedFill = {
      id: "fill_1",
      intentId: intent.id,
      symbol: "ETH-USD",
      side: "SELL",
      size: "8",
      price: "2000",
      notionalUsd: "16000",
      feeUsd: "8",
      fundingUsd: "1",
      simulated: true,
      createdAt: now,
    };
    store.saveExecution(strategy.id, intent, fill, [
      { state: "INTENT_CREATED", at: now },
      { state: "FILLED", at: now },
    ]);

    expect(store.getStrategy(strategy.id)?.mandate.active).toBe(true);
    expect(store.listStrategies()).toHaveLength(1);
    expect(store.findIntent(strategy.id, "key-1")?.state).toBe("FILLED");
    expect(store.sumFilledDelta(strategy.id)).toBe("-8");
    expect(store.listFills(strategy.id)).toHaveLength(1);
    expect(store.listActivity(strategy.id).length).toBeGreaterThan(1);
    expect(store.counts().strategies).toBe(1);
    expect(store.counts().intents).toBe(1);
    store.close();
    fs.rmSync(file, { force: true });
  });
});


