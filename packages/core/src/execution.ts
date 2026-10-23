import { Decimal, dec, toDecimalString } from "./money";
import type { HedgeConstraints, HedgePreview } from "./types";

export const EXECUTION_MODE = "simulate" as const;
export type ExecutionMode = typeof EXECUTION_MODE;

export type ExecutionState =
  | "INTENT_CREATED"
  | "RISK_VALIDATED"
  | "USER_AUTHORIZED"
  | "ORDER_PREPARED"
  | "SUBMISSION_IN_PROGRESS"
  | "SUBMISSION_PENDING"
  | "ENGINE_RECONCILIATION"
  | "FILLED"
  | "PARTIALLY_FILLED"
  | "REJECTED"
  | "CANCELED"
  | "UNKNOWN_REQUIRES_REVIEW";

export type StrategyStatus = "draft" | "active" | "paused" | "revoked";

export interface ExecutionIntent {
  id: string;
  strategyId: string;
  idempotencyKey: string;
  symbol: string;
  state: ExecutionState;
  requestedDeltaUnits: string;
  filledDeltaUnits: string;
  reasons: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SimulatedFill {
  id: string;
  intentId: string;
  symbol: string;
  side: "SELL" | "BUY";
  size: string;
  price: string;
  notionalUsd: string;
  feeUsd: string;
  fundingUsd: string;
  marginUtilizationPct?: string;
  marketSource?: string;
  marketObservedAt?: string;
  adapterVersion?: string;
  schemaVersion: number;
  simulated: true;
  createdAt: string;
}

export interface ExecutionAudit {
  state: ExecutionState;
  at: string;
  reason?: string;
}

export interface SimulatedExecution {
  intent: ExecutionIntent;
  fill?: SimulatedFill;
  audits: ExecutionAudit[];
}

const TRANSITIONS: Record<ExecutionState, ExecutionState[]> = {
  INTENT_CREATED: ["RISK_VALIDATED", "REJECTED"],
  RISK_VALIDATED: ["USER_AUTHORIZED", "REJECTED"],
  USER_AUTHORIZED: ["ORDER_PREPARED", "REJECTED"],
  ORDER_PREPARED: ["SUBMISSION_IN_PROGRESS", "REJECTED"],
  SUBMISSION_IN_PROGRESS: ["SUBMISSION_PENDING", "UNKNOWN_REQUIRES_REVIEW"],
  SUBMISSION_PENDING: ["ENGINE_RECONCILIATION", "UNKNOWN_REQUIRES_REVIEW"],
  ENGINE_RECONCILIATION: [
    "FILLED",
    "PARTIALLY_FILLED",
    "REJECTED",
    "CANCELED",
    "UNKNOWN_REQUIRES_REVIEW",
  ],
  FILLED: [],
  PARTIALLY_FILLED: ["ENGINE_RECONCILIATION"],
  REJECTED: [],
  CANCELED: [],
  UNKNOWN_REQUIRES_REVIEW: ["ENGINE_RECONCILIATION"],
};

export function canTransition(from: ExecutionState, to: ExecutionState): boolean {
  return TRANSITIONS[from].includes(to);
}

export function transitionIntent(
  intent: ExecutionIntent,
  to: ExecutionState,
  now = new Date().toISOString(),
  reason?: string
): ExecutionIntent {
  if (!canTransition(intent.state, to)) {
    throw new Error(`invalid transition ${intent.state} -> ${to}`);
  }
  return {
    ...intent,
    state: to,
    updatedAt: now,
    reasons: reason ? [...intent.reasons, reason] : intent.reasons,
  };
}

export function simulateExecution(input: {
  strategyId: string;
  intentId: string;
  idempotencyKey: string;
  symbol: string;
  preview: HedgePreview;
  now?: string;
  outcome?: "filled" | "partial" | "timeout";
  fillRatio?: string;
  marketSource?: string;
  adapterVersion?: string;
}): SimulatedExecution {
  const now = input.now ?? new Date().toISOString();
  const audits: ExecutionAudit[] = [];
  let intent: ExecutionIntent = {
    id: input.intentId,
    strategyId: input.strategyId,
    idempotencyKey: input.idempotencyKey,
    symbol: input.symbol,
    state: "INTENT_CREATED",
    requestedDeltaUnits: input.preview.adjustmentUnits,
    filledDeltaUnits: "0",
    reasons: [],
    createdAt: now,
    updatedAt: now,
  };
  audits.push({ state: "INTENT_CREATED", at: now });

  if (input.preview.status === "blocked") {
    intent = transitionIntent(intent, "REJECTED", now, input.preview.reasons[0] ?? "BLOCKED");
    audits.push({ state: "REJECTED", at: now, reason: input.preview.reasons.join(",") });
    return { intent, audits };
  }

  if (input.preview.side === "NONE" || dec(input.preview.adjustmentUnits).eq(0)) {
    intent = transitionIntent(intent, "RISK_VALIDATED", now);
    audits.push({ state: "RISK_VALIDATED", at: now });
    intent = transitionIntent(intent, "REJECTED", now, "WITHIN_TOLERANCE");
    audits.push({ state: "REJECTED", at: now, reason: "WITHIN_TOLERANCE" });
    return { intent, audits };
  }

  const outcome = input.outcome ?? "filled";
  const path: ExecutionState[] =
    outcome === "timeout"
      ? [
          "RISK_VALIDATED",
          "USER_AUTHORIZED",
          "ORDER_PREPARED",
          "SUBMISSION_IN_PROGRESS",
          "SUBMISSION_PENDING",
          "UNKNOWN_REQUIRES_REVIEW",
        ]
      : [
          "RISK_VALIDATED",
          "USER_AUTHORIZED",
          "ORDER_PREPARED",
          "SUBMISSION_IN_PROGRESS",
          "SUBMISSION_PENDING",
          "ENGINE_RECONCILIATION",
          outcome === "partial" ? "PARTIALLY_FILLED" : "FILLED",
        ];

  for (const state of path) {
    intent = transitionIntent(intent, state, now);
    audits.push({ state, at: now });
  }

  if (outcome === "timeout") {
    intent = { ...intent, reasons: [...intent.reasons, "SIMULATED_TIMEOUT"] };
    return { intent, audits };
  }

  const ratio = outcome === "partial" ? dec(input.fillRatio ?? "0.5") : new Decimal(1);
  const signedAdjustment = dec(input.preview.adjustmentUnits);
  const size = signedAdjustment.abs().mul(ratio);
  const price = dec(input.preview.vwapPrice);
  const notional = size.mul(price);
  const fill: SimulatedFill = {
    id: `${input.intentId}:fill`,
    intentId: input.intentId,
    symbol: input.symbol,
    side: input.preview.side === "BUY" ? "BUY" : "SELL",
    size: toDecimalString(size),
    price: toDecimalString(price),
    notionalUsd: toDecimalString(notional),
    feeUsd: toDecimalString(dec(input.preview.estimatedFeeUsd).mul(ratio)),
    fundingUsd: toDecimalString(dec(input.preview.estimatedFundingUsd).mul(ratio)),
    marginUtilizationPct: input.preview.marginUtilizationPct ?? undefined,
    marketSource: input.marketSource,
    marketObservedAt: input.preview.observedAt,
    adapterVersion: input.adapterVersion,
    schemaVersion: 1,
    simulated: true,
    createdAt: now,
  };

  intent = {
    ...intent,
    filledDeltaUnits: toDecimalString(signedAdjustment.mul(ratio)),
    reasons:
      outcome === "partial"
        ? [...intent.reasons, "SIMULATED_PARTIAL_FILL"]
        : intent.reasons,
  };
  return { intent, fill, audits };
}
export interface StrategyRecord {
  id: string;
  symbol: string;
  externalDeltaUnits: string;
  targetRatio: string;
  constraints: HedgeConstraints;
  availableMarginUsd: string;
  exposureObservedAt: string;
  exposureDataQuality: string;
  status: StrategyStatus;
  createdAt: string;
}

export interface MandateRecord {
  id: string;
  strategyId: string;
  active: boolean;
  expiresAt: string;
  createdAt: string;
}

export interface StrategyBundle {
  strategy: StrategyRecord;
  mandate: MandateRecord;
}





