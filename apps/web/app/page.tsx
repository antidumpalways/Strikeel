"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import HedgeStudio from "./hedge-studio";

interface Asset {
  asset: { symbol: string; assetId: string };
  quantity: string;
  valueUsd: string;
}

interface Position {
  id: string;
  chain: string;
  protocolId: string;
  positionType: string;
  estimatedValueUsd: string;
  dataStatus: string;
  observedAt: string;
  assets: Asset[];
}

interface ExposureComponent {
  symbol: string;
  deltaUnits: string;
  deltaUsd: string;
  hedgeMarketSymbol?: string;
  hedgeAvailability: string;
  dataQuality: string;
}

interface Preview {
  symbol: string;
  side: string;
  targetRatio: string;
  externalDeltaUnits: string;
  adjustmentUnits: string;
  notionalUsd: string;
  vwapPrice: string;
  estimatedSlippageBps: string;
  estimatedFeeUsd: string;
  estimatedFundingUsd: string;
  initialMarginUsd: string;
  residualDeltaUnits: string;
  residualDeltaUsd: string;
  status: string;
  reasons: string[];
  dataStatus: string;
  observedAt: string;
}

interface Market {
  symbol: string;
  markPrice: string;
  fundingRate: string;
  observedAt: string;
  dataStatus: string;
  bids: number;
  asks: number;
}

interface PreviewResponse {
  executionMode: string;
  ordersSubmitted: boolean;
  generatedAt: string;
  portfolioValueUsd: string;
  positions: Position[];
  exposure: { observedAt: string; components: ExposureComponent[] };
  previews: Preview[];
  markets: Market[];
  warnings: string[];
  disclaimer: string;
}

const DEFAULTS = {
  eth: "0x1085C42a2698c4f89251b7c27dbd5cE95CAae38B",
  ethTokenIds: "1387878",
  sol: "",
  ada: "",
};

function num(value: string, digits = 2): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  return parsed.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function short(value: string, head = 6, tail = 4): string {
  return value.length <= head + tail + 3 ? value : `${value.slice(0, head)}...${value.slice(-tail)}`;
}

export default function Home() {
  const [eth, setEth] = useState(DEFAULTS.eth);
  const [ethTokenIds, setEthTokenIds] = useState(DEFAULTS.ethTokenIds);
  const [sol, setSol] = useState(DEFAULTS.sol);
  const [ada, setAda] = useState(DEFAULTS.ada);
  const [margin, setMargin] = useState("10000");
  const [data, setData] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function analyze(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (eth.trim()) params.set("eth", eth.trim());
      if (ethTokenIds.trim()) params.set("ethTokenIds", ethTokenIds.trim());
      if (sol.trim()) params.set("sol", sol.trim());
      if (ada.trim()) params.set("ada", ada.trim());
      if (margin.trim()) params.set("margin", margin.trim());
      const response = await fetch(`/api/preview?${params.toString()}`);
      const body = (await response.json()) as PreviewResponse & { error?: string };
      if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
      setData(body);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <header className="hero">
        <div className="brand">
          <span className="mark">//</span>
          <span>STRIKEEL</span>
        </div>
        <p className="tagline">Many Chains. One Equilibrium.</p>
        <h1>Cross-chain exposure. Strike-powered hedge preview.</h1>
        <p className="lede">
          Add read-only addresses for Ethereum, Solana, and Cardano. STRIKEEL normalizes
          positions, computes net delta, and previews a hedge against live Strike order books.
        </p>
        <div className="badges">
          <span className="badge good">SIMULATE</span>
          <span className="badge">No orders submitted</span>
          <span className="badge">Mainnet read-only</span>
        </div>
        <p className="notice">Preview only - no order submitted</p>
      </header>

      <section className="panel">
        <form onSubmit={analyze} className="form">
          <label>
            <span>Ethereum address</span>
            <input
              value={eth}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEth(e.target.value)}
              placeholder="0x..."
              spellCheck={false}
            />
          </label>
          <label>
            <span>Uniswap V3 token IDs (optional)</span>
            <input
              value={ethTokenIds}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEthTokenIds(e.target.value)}
              placeholder="1387878"
              spellCheck={false}
            />
          </label>
          <label>
            <span>Solana address</span>
            <input
              value={sol}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSol(e.target.value)}
              placeholder="Phantom address"
              spellCheck={false}
            />
          </label>
          <label>
            <span>Cardano address</span>
            <input
              value={ada}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setAda(e.target.value)}
              placeholder="addr1..."
              spellCheck={false}
            />
          </label>
          <label>
            <span>Simulated margin (USD)</span>
            <input
              value={margin}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setMargin(e.target.value)}
              placeholder="10000"
              spellCheck={false}
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "Analyzing..." : "Analyze portfolio"}
          </button>
        </form>
        <p className="hint">
          Leave a chain blank to skip it. The demo ETH address includes a real Uniswap V3
          position; token IDs are required because the wallet holds many NFTs.
        </p>
      </section>

      {error && <section className="panel error">! {error}</section>}

      {data && (
        <>
          <section className="stats">
            <article className="stat">
              <span>Portfolio value</span>
              <strong>${num(data.portfolioValueUsd)}</strong>
            </article>
            {data.exposure.components.map((component) => (
              <article className="stat" key={component.symbol}>
                <span>Net {component.symbol} delta</span>
                <strong>
                  {num(component.deltaUnits, 6)} {component.symbol}
                </strong>
                <small>
                  ${num(component.deltaUsd)} / {component.hedgeAvailability}
                </small>
              </article>
            ))}
            {data.exposure.components.length === 0 && (
              <article className="stat">
                <span>Net exposure</span>
                <strong>No supported risk assets</strong>
              </article>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Positions</h2>
              <span className="muted">{data.positions.length} normalized positions</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Chain</th>
                    <th>Type</th>
                    <th>Assets</th>
                    <th className="right">Value</th>
                    <th>Observed</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {data.positions.map((position) => (
                    <tr key={position.id}>
                      <td className="mono">{short(position.id, 14, 6)}</td>
                      <td>{position.chain}</td>
                      <td>{position.positionType}</td>
                      <td>
                        {position.assets
                          .map((asset) => `${num(asset.quantity, 4)} ${asset.asset.symbol}`)
                          .join(" + ")}
                      </td>
                      <td className="right">${num(position.estimatedValueUsd)}</td>
                      <td>{new Date(position.observedAt).toLocaleString()}</td>
                      <td>
                        <span className={`pill ${position.dataStatus}`}>{position.dataStatus}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Hedge preview</h2>
              <span className="muted">Target 80% / 3x max / 50 bps slippage</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Market</th>
                    <th>Side</th>
                    <th className="right">Size</th>
                    <th className="right">Notional</th>
                    <th className="right">VWAP</th>
                    <th className="right">Slippage</th>
                    <th className="right">Initial margin</th>
                    <th className="right">Residual</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.previews.map((preview) => (
                    <tr key={preview.symbol}>
                      <td className="mono">{preview.symbol}</td>
                      <td>{preview.side}</td>
                      <td className="right">{num(preview.adjustmentUnits, 6)}</td>
                      <td className="right">${num(preview.notionalUsd)}</td>
                      <td className="right">{num(preview.vwapPrice)}</td>
                      <td className="right">{num(preview.estimatedSlippageBps)} bps</td>
                      <td className="right">${num(preview.initialMarginUsd)}</td>
                      <td className="right">
                        {num(preview.residualDeltaUnits, 6)}
                        <small> ${num(preview.residualDeltaUsd)}</small>
                      </td>
                      <td>
                        <span className={`pill ${preview.status}`}>{preview.status}</span>
                        {preview.status === "blocked" && <small className="muted"> not executable</small>}
                        <div className="reasons">{preview.reasons.join(" / ")}</div>
                      </td>
                    </tr>
                  ))}
                  {data.previews.length === 0 && (
                    <tr>
                      <td colSpan={9} className="muted">
                        No hedge preview available. Add a wallet and ensure the Strike market is fresh.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <HedgeStudio
            previews={data.previews}
            margin={margin}
            exposureObservedAt={data.exposure.observedAt}
            exposureDataQuality={data.exposure.components[0]?.dataQuality ?? "partial"}
          />

          <section className="panel">
            <div className="panel-head">
              <h2>Market data</h2>
              <span className="muted">Strike mainnet / read-only</span>
            </div>
            <div className="market-grid">
              {data.markets.map((market) => (
                <article className="market" key={market.symbol}>
                  <div className="market-top">
                    <strong>{market.symbol}</strong>
                    <span className={`pill ${market.dataStatus}`}>{market.dataStatus}</span>
                  </div>
                  <div className="market-price">${num(market.markPrice)}</div>
                  <div className="muted">
                    funding {num(market.fundingRate, 8)} / depth {market.bids}/{market.asks}
                  </div>
                  <div className="muted small">{new Date(market.observedAt).toLocaleString()}</div>
                </article>
              ))}
            </div>
          </section>

          {data.warnings.length > 0 && (
            <section className="panel warn">
              <h2>Warnings</h2>
              <ul>
                {data.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </section>
          )}

          <footer className="footer">
            <p>{data.disclaimer}</p>
            <p className="muted">
              Generated {new Date(data.generatedAt).toLocaleString()} / execution mode{" "}
              {data.executionMode} / orders submitted: {String(data.ordersSubmitted)}
            </p>
          </footer>
        </>
      )}
    </main>
  );
}



