import { describe, expect, it } from "vitest";
import { simulateExecution, transitionIntent, type ExecutionIntent } from "../src/execution";
import type { HedgePreview } from "../src/types";

const base: HedgePreview = {
  symbol: "ETH-USD",
  side: "SELL",
  targetRatio: "0.8",
  externalDeltaUnits: "10",
  existingHedgeDeltaUnits: "0",
  targetHedgeDeltaUnits: "-8",
  adjustmentUnits: "-8",
  notionalUsd: "16000",
  vwapPrice: "2000",
  markPrice: "2000",
  estimatedSlippageBps: "0",
  estimatedFeeUsd: "8",
  estimatedFundingUsd: "1",
  initialMarginUsd: "3200",
  maintenanceMarginUsd: "80",
  marginHeadroomUsd: "3120",
  marginUtilizationPct: "32",
  residualDeltaUnits: "2",
  residualDeltaUsd: "4000",
  leverage: "5",
  status: "proposed",
  reasons: ["TARGET_80PCT"],
  dataStatus: "fresh",
  observedAt: "2026-10-22T00:00:00.000Z",
};

describe("simulated execution state machine", () => {
  it("walks a proposed preview to FILLED with a simulated fill", () => {
    const result = simulateExecution({
      strategyId: "s1",
      intentId: "i1",
      idempotencyKey: "k1",
      symbol: "ETH-USD",
      preview: base,
      now: "2026-10-22T00:00:00.000Z",
    });

    expect(result.intent.state).toBe("FILLED");
    expect(result.fill?.simulated).toBe(true);
    expect(result.fill?.size).toBe("8");
    expect(result.audits.map((a) => a.state)).toContain("SUBMISSION_PENDING");
  });

  it("rejects a blocked preview without a fill", () => {
    const result = simulateExecution({
      strategyId: "s1",
      intentId: "i1",
      idempotencyKey: "k1",
      symbol: "ETH-USD",
      preview: { ...base, status: "blocked", reasons: ["INSUFFICIENT_DEPTH"] },
    });

    expect(result.intent.state).toBe("REJECTED");
    expect(result.fill).toBeUndefined();
    expect(result.intent.reasons).toContain("INSUFFICIENT_DEPTH");
  });

  it("is deterministic for identical inputs", () => {
    const a = simulateExecution({ strategyId: "s1", intentId: "i1", idempotencyKey: "k1", symbol: "ETH-USD", preview: base, now: "2026-10-22T00:00:00.000Z" });
    const b = simulateExecution({ strategyId: "s1", intentId: "i1", idempotencyKey: "k1", symbol: "ETH-USD", preview: base, now: "2026-10-22T00:00:00.000Z" });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("rejects invalid transitions", () => {
    const intent: ExecutionIntent = {
      id: "i1",
      strategyId: "s1",
      idempotencyKey: "k1",
      symbol: "ETH-USD",
      state: "INTENT_CREATED",
      requestedDeltaUnits: "-8",
      filledDeltaUnits: "0",
      reasons: [],
      createdAt: "2026-10-22T00:00:00.000Z",
      updatedAt: "2026-10-22T00:00:00.000Z",
    };
    expect(() => transitionIntent(intent, "FILLED")).toThrow("invalid transition");
  });

  it("supports timeout and partial outcomes", () => {
    const timeout = simulateExecution({
      strategyId: "s1",
      intentId: "i1",
      idempotencyKey: "k1",
      symbol: "ETH-USD",
      preview: base,
      outcome: "timeout",
      now: "2026-10-22T00:00:00.000Z",
    });
    expect(timeout.intent.state).toBe("UNKNOWN_REQUIRES_REVIEW");
    expect(timeout.fill).toBeUndefined();

    const partial = simulateExecution({
      strategyId: "s1",
      intentId: "i2",
      idempotencyKey: "k2",
      symbol: "ETH-USD",
      preview: base,
      outcome: "partial",
      fillRatio: "0.5",
      now: "2026-10-22T00:00:00.000Z",
    });
    expect(partial.intent.state).toBe("PARTIALLY_FILLED");
    expect(partial.fill?.size).toBe("4");
    expect(partial.fill?.feeUsd).toBe("4");
    expect(partial.intent.filledDeltaUnits).toBe("-4");
  });
});



