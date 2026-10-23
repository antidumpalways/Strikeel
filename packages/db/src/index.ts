import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { dec } from "@strikeel/core";
import type { DatabaseSync as DatabaseSyncClass } from "node:sqlite";
import type {
  ExecutionAudit,
  ExecutionIntent,
  HedgePreview,
  MandateRecord,
  NormalizedPosition,
  SimulatedFill,
  StrategyBundle,
  StrategyRecord,
} from "@strikeel/core";

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite") as {
  DatabaseSync: typeof DatabaseSyncClass;
};

export interface StoredFill {
  id: string;
  intentId: string;
  symbol: string;
  side: string;
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
  simulated: boolean;
  createdAt: string;
}

export interface Store {
  saveRun(
    positions: NormalizedPosition[],
    previews: HedgePreview[]
  ): { positions: number; decisions: number };
  createStrategy(strategy: StrategyRecord, mandate: MandateRecord): StrategyBundle;
  getStrategy(id: string): StrategyBundle | undefined;
  listStrategies(): StrategyBundle[];
  setMandateActive(strategyId: string, active: boolean): void;
  findIntent(strategyId: string, idempotencyKey: string): ExecutionIntent | undefined;
  saveExecution(
    strategyId: string,
    intent: ExecutionIntent,
    fill: SimulatedFill | undefined,
    audits: ExecutionAudit[]
  ): void;
  listIntents(strategyId: string): ExecutionIntent[];
  sumFilledDelta(strategyId: string): string;
  hasUnresolvedIntent(strategyId: string): boolean;
  listFills(strategyId: string): StoredFill[];
  saveAudit(strategyId: string, intentId: string | null, type: string, payload: unknown): void;
  listActivity(strategyId?: string): Array<{ type: string; at: string; payload: unknown }>;
  counts(): { positions: number; decisions: number; strategies: number; intents: number };
  close(): void;
}

export function createStore(dbPath?: string): Store {
  const file =
    dbPath ?? process.env.STRIKEEL_DB_PATH ?? path.join(process.cwd(), "data", "strikeel.sqlite");
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const db = new DatabaseSync(file);
  db.exec(`
    CREATE TABLE IF NOT EXISTS position_snapshots (
      id TEXT PRIMARY KEY, chain TEXT NOT NULL, protocol TEXT NOT NULL,
      external_id TEXT NOT NULL, observed_at TEXT NOT NULL, block_ref TEXT,
      data_status TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS risk_decisions (
      id TEXT PRIMARY KEY, symbol TEXT NOT NULL, status TEXT NOT NULL,
      target_ratio TEXT NOT NULL, reasons TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS hedge_strategies (
      id TEXT PRIMARY KEY, symbol TEXT NOT NULL, external_delta_units TEXT NOT NULL,
      target_ratio TEXT NOT NULL, constraints TEXT NOT NULL, available_margin_usd TEXT NOT NULL,
      exposure_observed_at TEXT, exposure_data_quality TEXT,
      status TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS hedge_mandates (
      id TEXT PRIMARY KEY, strategy_id TEXT NOT NULL, active INTEGER NOT NULL,
      expires_at TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS execution_intents (
      id TEXT PRIMARY KEY, strategy_id TEXT NOT NULL, idempotency_key TEXT NOT NULL,
      symbol TEXT NOT NULL, state TEXT NOT NULL, requested_delta_units TEXT NOT NULL,
      filled_delta_units TEXT NOT NULL, reasons TEXT NOT NULL, created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL, UNIQUE(strategy_id, idempotency_key)
    );
    CREATE TABLE IF NOT EXISTS simulated_orders (
      id TEXT PRIMARY KEY, intent_id TEXT NOT NULL, symbol TEXT NOT NULL, side TEXT NOT NULL,
      size TEXT NOT NULL, price TEXT NOT NULL, notional_usd TEXT NOT NULL,
      fee_usd TEXT NOT NULL, funding_usd TEXT NOT NULL, margin_utilization_pct TEXT,
      market_source TEXT, market_observed_at TEXT, adapter_version TEXT, schema_version INTEGER DEFAULT 1,
      simulated INTEGER NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS simulated_fills (
      id TEXT PRIMARY KEY, intent_id TEXT NOT NULL, size TEXT NOT NULL, price TEXT NOT NULL,
      notional_usd TEXT NOT NULL, simulated INTEGER NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY, strategy_id TEXT NOT NULL, intent_id TEXT, event_type TEXT NOT NULL,
      payload TEXT NOT NULL, created_at TEXT NOT NULL
    );
  `);

  // Lightweight migration for demo DBs created before scope 002.
  try {
    db.exec("ALTER TABLE hedge_strategies ADD COLUMN exposure_observed_at TEXT");
  } catch {
    // column already exists
  }
  try {
    db.exec("ALTER TABLE hedge_strategies ADD COLUMN exposure_data_quality TEXT");
  } catch {
    // column already exists
  }
  for (const sql of [
    "ALTER TABLE simulated_orders ADD COLUMN margin_utilization_pct TEXT",
    "ALTER TABLE simulated_orders ADD COLUMN market_source TEXT",
    "ALTER TABLE simulated_orders ADD COLUMN market_observed_at TEXT",
    "ALTER TABLE simulated_orders ADD COLUMN adapter_version TEXT",
    "ALTER TABLE simulated_orders ADD COLUMN schema_version INTEGER DEFAULT 1",
  ]) {
    try {
      db.exec(sql);
    } catch {
      // column already exists
    }
  }

  const insertPosition = db.prepare(`
    INSERT INTO position_snapshots
      (id, chain, protocol, external_id, observed_at, block_ref, data_status, payload, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertDecision = db.prepare(`
    INSERT INTO risk_decisions
      (id, symbol, status, target_ratio, reasons, payload, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertStrategy = db.prepare(`
    INSERT INTO hedge_strategies
      (id, symbol, external_delta_units, target_ratio, constraints, available_margin_usd,
       exposure_observed_at, exposure_data_quality, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMandate = db.prepare(`
    INSERT INTO hedge_mandates (id, strategy_id, active, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertIntent = db.prepare(`
    INSERT INTO execution_intents
      (id, strategy_id, idempotency_key, symbol, state, requested_delta_units, filled_delta_units, reasons, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertOrder = db.prepare(`
    INSERT INTO simulated_orders
      (id, intent_id, symbol, side, size, price, notional_usd, fee_usd, funding_usd,
       margin_utilization_pct, market_source, market_observed_at, adapter_version,
       schema_version, simulated, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertFill = db.prepare(`
    INSERT INTO simulated_fills
      (id, intent_id, size, price, notional_usd, simulated, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertAudit = db.prepare(`
    INSERT INTO audit_events (id, strategy_id, intent_id, event_type, payload, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const mapIntent = (row: Record<string, unknown>): ExecutionIntent => ({
    id: String(row.id),
    strategyId: String(row.strategy_id),
    idempotencyKey: String(row.idempotency_key),
    symbol: String(row.symbol),
    state: String(row.state) as ExecutionIntent["state"],
    requestedDeltaUnits: String(row.requested_delta_units),
    filledDeltaUnits: String(row.filled_delta_units),
    reasons: JSON.parse(String(row.reasons)) as string[],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  });

  const mapBundle = (row: Record<string, unknown>): StrategyBundle => ({
    strategy: {
      id: String(row.id),
      symbol: String(row.symbol),
      externalDeltaUnits: String(row.external_delta_units),
      targetRatio: String(row.target_ratio),
      constraints: JSON.parse(String(row.constraints)),
      availableMarginUsd: String(row.available_margin_usd),
      exposureObservedAt: String(row.exposure_observed_at ?? ""),
      exposureDataQuality: String(row.exposure_data_quality ?? "fresh"),
      status: String(row.status) as StrategyRecord["status"],
      createdAt: String(row.created_at),
    },
    mandate: {
      id: String(row.mandate_id),
      strategyId: String(row.id),
      active: Number(row.active) === 1,
      expiresAt: String(row.expires_at),
      createdAt: String(row.mandate_created_at),
    },
  });

  return {
    saveRun(positions, previews) {
      const createdAt = new Date().toISOString();
      db.exec("BEGIN");
      try {
        for (const position of positions) {
          insertPosition.run(
            randomUUID(), position.chain, position.protocolId, position.externalPositionId,
            position.observedAt, position.blockReference ?? null, position.dataStatus,
            JSON.stringify(position), createdAt
          );
        }
        for (const preview of previews) {
          insertDecision.run(
            randomUUID(), preview.symbol, preview.status, preview.targetRatio,
            JSON.stringify(preview.reasons), JSON.stringify(preview), createdAt
          );
        }
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      return { positions: positions.length, decisions: previews.length };
    },

    createStrategy(strategy, mandate) {
      db.exec("BEGIN");
      try {
        insertStrategy.run(
          strategy.id, strategy.symbol, strategy.externalDeltaUnits, strategy.targetRatio,
          JSON.stringify(strategy.constraints), strategy.availableMarginUsd,
          strategy.exposureObservedAt, strategy.exposureDataQuality, strategy.status,
          strategy.createdAt
        );
        insertMandate.run(
          mandate.id, strategy.id, mandate.active ? 1 : 0, mandate.expiresAt, mandate.createdAt
        );
        insertAudit.run(
          randomUUID(), strategy.id, null, "strategy.created",
          JSON.stringify({ symbol: strategy.symbol, targetRatio: strategy.targetRatio }),
          strategy.createdAt
        );
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      return { strategy, mandate };
    },

    getStrategy(id) {
      const row = db
        .prepare(
          `SELECT s.*, m.id AS mandate_id, m.active, m.expires_at, m.created_at AS mandate_created_at
           FROM hedge_strategies s JOIN hedge_mandates m ON m.strategy_id = s.id
           WHERE s.id = ?`
        )
        .get(id) as Record<string, unknown> | undefined;
      return row ? mapBundle(row) : undefined;
    },

    listStrategies() {
      const rows = db
        .prepare(
          `SELECT s.*, m.id AS mandate_id, m.active, m.expires_at, m.created_at AS mandate_created_at
           FROM hedge_strategies s JOIN hedge_mandates m ON m.strategy_id = s.id
           ORDER BY s.created_at DESC`
        )
        .all() as Record<string, unknown>[];
      return rows.map(mapBundle);
    },

    setMandateActive(strategyId, active) {
      const at = new Date().toISOString();
      db.exec("BEGIN");
      try {
        db.prepare("UPDATE hedge_mandates SET active = ? WHERE strategy_id = ?").run(active ? 1 : 0, strategyId);
        db.prepare("UPDATE hedge_strategies SET status = ? WHERE id = ?").run(active ? "active" : "paused", strategyId);
        insertAudit.run(
          randomUUID(), strategyId, null, active ? "mandate.activated" : "mandate.paused",
          JSON.stringify({ active }), at
        );
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },

    findIntent(strategyId, idempotencyKey) {
      const row = db
        .prepare("SELECT * FROM execution_intents WHERE strategy_id = ? AND idempotency_key = ?")
        .get(strategyId, idempotencyKey) as Record<string, unknown> | undefined;
      return row ? mapIntent(row) : undefined;
    },

    saveExecution(strategyId, intent, fill, audits) {
      const createdAt = new Date().toISOString();
      db.exec("BEGIN");
      try {
        insertIntent.run(
          intent.id, strategyId, intent.idempotencyKey, intent.symbol, intent.state,
          intent.requestedDeltaUnits, intent.filledDeltaUnits, JSON.stringify(intent.reasons),
          intent.createdAt, intent.updatedAt
        );
        if (fill) {
          insertOrder.run(
            `${fill.id}:order`, fill.intentId, fill.symbol, fill.side, fill.size, fill.price,
            fill.notionalUsd, fill.feeUsd, fill.fundingUsd,
            fill.marginUtilizationPct ?? null, fill.marketSource ?? null,
            fill.marketObservedAt ?? null, fill.adapterVersion ?? null,
            fill.schemaVersion ?? 1, 1, createdAt
          );
          insertFill.run(
            fill.id, fill.intentId, fill.size, fill.price, fill.notionalUsd, 1, createdAt
          );
        }
        for (const audit of audits) {
          insertAudit.run(
            randomUUID(), strategyId, intent.id, `execution.${audit.state.toLowerCase()}`,
            JSON.stringify(audit), audit.at
          );
        }
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },

    listIntents(strategyId) {
      const rows = db
        .prepare("SELECT * FROM execution_intents WHERE strategy_id = ? ORDER BY created_at DESC, rowid DESC")
        .all(strategyId) as Record<string, unknown>[];
      return rows.map(mapIntent);
    },

    sumFilledDelta(strategyId) {
      const rows = db
        .prepare(
          "SELECT filled_delta_units FROM execution_intents WHERE strategy_id = ? AND state IN ('FILLED','PARTIALLY_FILLED')"
        )
        .all(strategyId) as Array<{ filled_delta_units: string }>;
      return rows
        .reduce((acc, row) => acc.plus(dec(row.filled_delta_units)), dec("0"))
        .toString();
    },

    hasUnresolvedIntent(strategyId) {
      const row = db
        .prepare(
          `SELECT COUNT(*) AS n FROM execution_intents
           WHERE strategy_id = ? AND state IN
             ('SUBMISSION_IN_PROGRESS','SUBMISSION_PENDING','ENGINE_RECONCILIATION','UNKNOWN_REQUIRES_REVIEW')`
        )
        .get(strategyId) as { n: number };
      return row.n > 0;
    },

    listFills(strategyId) {
      const rows = db
        .prepare(
          `SELECT f.id, f.intent_id, i.symbol, o.side, f.size, f.price, f.notional_usd,
                  COALESCE(o.fee_usd,'0') AS fee_usd, COALESCE(o.funding_usd,'0') AS funding_usd,
                  o.margin_utilization_pct, o.market_source, o.market_observed_at,
                  o.adapter_version, COALESCE(o.schema_version,1) AS schema_version,
                  f.simulated, f.created_at
           FROM simulated_fills f
           JOIN execution_intents i ON i.id = f.intent_id
           LEFT JOIN simulated_orders o ON o.intent_id = f.intent_id
           WHERE i.strategy_id = ?
           ORDER BY f.created_at DESC, f.rowid DESC`
        )
        .all(strategyId) as Record<string, unknown>[];
      return rows.map((row) => ({
        id: String(row.id),
        intentId: String(row.intent_id),
        symbol: String(row.symbol),
        side: String(row.side),
        size: String(row.size),
        price: String(row.price),
        notionalUsd: String(row.notional_usd),
        feeUsd: String(row.fee_usd),
        fundingUsd: String(row.funding_usd),
        marginUtilizationPct:
          row.margin_utilization_pct === null ? undefined : String(row.margin_utilization_pct),
        marketSource: row.market_source === null ? undefined : String(row.market_source),
        marketObservedAt:
          row.market_observed_at === null ? undefined : String(row.market_observed_at),
        adapterVersion: row.adapter_version === null ? undefined : String(row.adapter_version),
        schemaVersion: Number(row.schema_version ?? 1),
        simulated: Number(row.simulated) === 1,
        createdAt: String(row.created_at),
      }));
    },

    saveAudit(strategyId, intentId, type, payload) {
      insertAudit.run(
        randomUUID(),
        strategyId,
        intentId,
        type,
        JSON.stringify(payload),
        new Date().toISOString()
      );
    },


    listActivity(strategyId) {
      const rows = strategyId
        ? (db
            .prepare("SELECT event_type, created_at, payload FROM audit_events WHERE strategy_id = ? ORDER BY created_at DESC, rowid DESC")
            .all(strategyId) as Record<string, unknown>[])
        : (db
            .prepare("SELECT event_type, created_at, payload FROM audit_events ORDER BY created_at DESC, rowid DESC LIMIT 100")
            .all() as Record<string, unknown>[]);
      return rows.map((row) => ({
        type: String(row.event_type),
        at: String(row.created_at),
        payload: JSON.parse(String(row.payload)),
      }));
    },

    counts() {
      const positions = db.prepare("SELECT COUNT(*) AS n FROM position_snapshots").get() as { n: number };
      const decisions = db.prepare("SELECT COUNT(*) AS n FROM risk_decisions").get() as { n: number };
      const strategies = db.prepare("SELECT COUNT(*) AS n FROM hedge_strategies").get() as { n: number };
      const intents = db.prepare("SELECT COUNT(*) AS n FROM execution_intents").get() as { n: number };
      return { positions: positions.n, decisions: decisions.n, strategies: strategies.n, intents: intents.n };
    },

    close() {
      db.close();
    },
  };
}






