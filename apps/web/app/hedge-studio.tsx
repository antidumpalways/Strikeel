"use client";

import { useEffect, useState } from "react";

function fmt(value: string, digits = 6): string {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: 0 })
    : value;
}

function payloadText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  return Object.entries(payload as Record<string, unknown>)
    .filter(([key]) => key !== "schemaVersion")
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" / ");
}

interface PreviewLike {
  symbol: string;
  side: string;
  externalDeltaUnits: string;
  status: string;
}

interface Intent {
  id: string;
  state: string;
  requestedDeltaUnits: string;
  filledDeltaUnits: string;
  reasons: string[];
  createdAt: string;
}

interface Fill {
  id: string;
  side: string;
  size: string;
  price: string;
  notionalUsd: string;
  feeUsd: string;
  marginUtilizationPct?: string;
  marketSource?: string;
  marketObservedAt?: string;
  adapterVersion?: string;
  schemaVersion?: number;
  simulated: boolean;
  createdAt: string;
}

interface Strategy {
  strategy: {
    id: string;
    symbol: string;
    targetRatio: string;
    externalDeltaUnits: string;
    availableMarginUsd: string;
    status: string;
    createdAt: string;
  };
  mandate: { active: boolean; expiresAt: string };
  intents: Intent[];
  fills: Fill[];
  filledDeltaUnits: string;
  residualDeltaUnits: string;
}

interface Activity {
  type: string;
  at: string;
  payload: unknown;
}

interface ExecutionResult {
  simulated: boolean;
  execution: {
    intent: Intent;
    fill?: {
      size: string;
      price: string;
      notionalUsd: string;
      feeUsd: string;
      simulated: true;
    };
  };
}

export default function HedgeStudio({
  previews,
  margin,
  exposureObservedAt,
  exposureDataQuality,
}: {
  previews: PreviewLike[];
  margin: string;
  exposureObservedAt: string;
  exposureDataQuality: string;
}) {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [targetRatio, setTargetRatio] = useState("0.8");

  const preview = previews.find((item) => item.symbol === "ETH-USD") ?? previews[0];

  async function load() {
    const response = await fetch("/api/strategies");
    const body = await response.json();
    const list: Strategy[] = body.strategies ?? [];
    setStrategies(list);
    const id = selected ?? list[0]?.strategy.id ?? null;
    if (id) {
      setSelected(id);
      await loadActivity(id);
    }
  }

  async function loadActivity(strategyId: string) {
    const response = await fetch(`/api/activity?strategyId=${encodeURIComponent(strategyId)}`);
    const body = await response.json();
    setActivity(body.events ?? []);
  }

  useEffect(() => {
    load().catch((error) => setMessage((error as Error).message));
  }, []);

  async function createStrategy() {
    if (!preview) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/strategies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          symbol: preview.symbol,
          externalDeltaUnits: preview.externalDeltaUnits,
          targetRatio,
          availableMarginUsd: margin || "10000",
          exposureObservedAt,
          exposureDataQuality,
          maxNotionalUsd: "100000",
          maxLeverage: "3",
          maxMarginUtilizationPct: "50",
          maxSlippageBps: "50",
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "create failed");
      setMessage(`Strategy ${body.strategy.id} created - activate the mandate to simulate.`);
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(strategyId: string, active: boolean) {
    setBusy(true);
    try {
      const response = await fetch(`/api/strategies/${strategyId}/activate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "activation failed");
      setMessage(active ? "Mandate activated." : "Mandate paused.");
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function simulate(strategyId: string) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/strategies/${strategyId}/simulate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "simulation failed");
      setResult(body);
      setSelected(strategyId);
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h2>Hedge Studio</h2>
          <span className="muted">SIMULATED execution only</span>
        </div>
        <div className="studio-grid">
          <div>
            <span className="label">Risk source</span>
            <strong>{preview ? `${preview.symbol} / ${preview.side}` : "No preview"}</strong>
          </div>
          <div>
            <span className="label">External delta</span>
            <strong>{preview ? fmt(preview.externalDeltaUnits) : "-"}</strong>
          </div>
          <div>
            <span className="label">Target protection</span>
            <input value={targetRatio} onChange={(e) => setTargetRatio(e.target.value)} aria-label="Target hedge ratio" />
          </div>
          <div>
            <span className="label">Simulated margin</span>
            <strong>${margin || "10000"}</strong>
          </div>
        </div>
        <div className="actions">
          <button type="button" onClick={createStrategy} disabled={busy || !preview}>
            Create hedge strategy
          </button>
          <span className="muted small">
            Creates a draft strategy + inactive mandate. No order is sent.
          </span>
        </div>
        {message && <p className="studio-message">{message}</p>}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Live Strategies</h2>
          <span className="muted">SIMULATED lifecycle</span>
        </div>
        {strategies.length === 0 && (
          <p className="muted">No strategies yet. Create one from the Hedge Studio above.</p>
        )}
        <div className="strategy-list">
          {strategies.map((item) => {
            const latest = item.intents[0];
            return (
              <article className="strategy" key={item.strategy.id}>
                <div className="strategy-head">
                  <div>
                    <strong>{item.strategy.symbol}</strong>
                    <span className={`pill ${item.mandate.active ? "fresh" : "blocked"}`}>
                      {item.mandate.active ? "mandate active" : "mandate inactive"}
                    </span>
                  </div>
                  <span className="mono small">{item.strategy.id.slice(0, 18)}...</span>
                </div>
                <div className="strategy-meta">
                  <span>target {fmt(String(Number(item.strategy.targetRatio) * 100), 2)}%</span>
                  <span>delta {fmt(item.strategy.externalDeltaUnits)}</span>
                  <span>status {item.strategy.status}</span>
                  <span>expires {new Date(item.mandate.expiresAt).toLocaleDateString()}</span>
                  <span>filled {fmt(item.filledDeltaUnits)}</span>
                  <span>margin ${fmt(item.strategy.availableMarginUsd, 2)}</span>
                  <span>residual {fmt(item.residualDeltaUnits)}</span>
                </div>
                {latest && (
                  <div className="strategy-state">
                    <span className={`pill ${latest.state === "FILLED" ? "fresh" : "blocked"}`}>
                      {latest.state}
                    </span>
                    <span className="muted small">
                      filled {fmt(latest.filledDeltaUnits)} / requested {fmt(latest.requestedDeltaUnits)}
                    </span>
                    {latest.reasons.length > 0 && (
                      <span className="muted small">{latest.reasons.join(" / ")}</span>
                    )}
                  </div>
                )}
                {item.fills?.[0] && (
                  <div className="execution">
                    <strong>SIMULATED FILL</strong>
                    <span className="muted small">
                      fill {fmt(item.fills[0].size)} @ ${fmt(item.fills[0].price)} / notional $
                      {fmt(item.fills[0].notionalUsd)} / fee ${fmt(item.fills[0].feeUsd)} / SIMULATED
                    </span>
                    {(item.fills[0].marginUtilizationPct || item.fills[0].marketSource) && (
                      <span className="muted small">
                        {item.fills[0].marginUtilizationPct &&
                          `margin used ${fmt(item.fills[0].marginUtilizationPct, 2)}% / `}
                        {item.fills[0].marketSource &&
                          `source ${item.fills[0].marketSource}${
                            item.fills[0].marketObservedAt
                              ? ` @ ${new Date(item.fills[0].marketObservedAt).toLocaleString()}`
                              : ""
                          }`}
                      </span>
                    )}
                  </div>
                )}
                <div className="actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => toggle(item.strategy.id, !item.mandate.active)}
                    disabled={busy}
                  >
                    {item.mandate.active ? "Pause mandate" : "Activate mandate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => simulate(item.strategy.id)}
                    disabled={busy || !item.mandate.active || latest?.state === "FILLED" || latest?.state === "UNKNOWN_REQUIRES_REVIEW"}
                  >
                    Simulate hedge
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setSelected(item.strategy.id);
                      loadActivity(item.strategy.id).catch(() => undefined);
                    }}
                    disabled={busy}
                  >
                    Show activity
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        {result && (
          <div className="execution">
            <strong>SIMULATED {result.execution.intent.state}</strong>
            {result.execution.fill && (
              <span className="muted small">
                fill {result.execution.fill.size} @ ${result.execution.fill.price} / notional $
                {result.execution.fill.notionalUsd} / fee ${result.execution.fill.feeUsd} /{" "}
                SIMULATED
              </span>
            )}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Activity</h2>
          <span className="muted">{selected ? "selected strategy" : "all strategies"}</span>
        </div>
        {activity.length === 0 && <p className="muted">No audit events yet.</p>}
        <div className="timeline">
          {activity.map((event, index) => (
            <div className="event" key={`${event.type}-${index}`}>
              <span className="event-type">{event.type}</span>
              <span className="muted small">{new Date(event.at).toLocaleString()}</span>
              {payloadText(event.payload) && (
                <span className="muted small">{payloadText(event.payload)}</span>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}










