import {
  computeExposure,
  previewHedge,
  type HedgeConstraints,
} from "@strikeel/core";
import { StrikeClient } from "@strikeel/strike-adapter";
import { discoverEvmWallet } from "@strikeel/evm-adapter";

async function main() {
  const address = (process.env.EVM_ADDRESS ??
    "0x1085C42a2698c4f89251b7c27dbd5cE95CAae38B") as `0x${string}`;

  const strike = new StrikeClient();
  const snapshot = await strike.getMarketSnapshot("ETH-USD", { maxDataAgeMs: 120_000 });

  const result = await discoverEvmWallet({
    address,
    prices: { "ethereum:ETH": snapshot.markPrice, "ethereum:USDC": "1" },
    tokenIds: ["1387878"],
  });

  const exposure = computeExposure({
    positions: result.positions,
    riskAssetIds: ["ethereum:ETH"],
    marketSymbols: ["ETH-USD"],
    observedAt: new Date().toISOString(),
  });

  const eth = exposure.components[0];
  const constraints: HedgeConstraints = {
    targetRatio: "0.8",
    maxNotionalUsd: "100000",
    maxLeverage: "3",
    maxMarginUtilizationPct: "50",
    maxSlippageBps: "50",
    minOrderNotionalUsd: snapshot.minNotional,
    feeRateBps: snapshot.takerFeeBps,
    fundingHorizonHours: "8",
    maxDataAgeMs: 120_000,
    maxResidualUnits: "1000",
  };

  const serverNow = await strike.getServerNow();
  const preview = eth
    ? previewHedge({
        exposure,
        market: snapshot,
        constraints,
        availableMarginUsd: "10000",
        now: serverNow,
      })
    : null;

  console.log(
    JSON.stringify(
      {
        address,
        block: result.blockNumber,
        warnings: result.warnings,
        positions: result.positions.map((p) => ({
          id: p.id,
          type: p.positionType,
          protocol: p.protocolId,
          valueUsd: p.estimatedValueUsd,
          assets: p.assets.map((a) => ({ symbol: a.asset.symbol, quantity: a.quantity })),
        })),
        exposure,
        market: {
          symbol: snapshot.symbol,
          markPrice: snapshot.markPrice,
          fundingRate: snapshot.fundingRate,
          depthBids: snapshot.bids.length,
          depthAsks: snapshot.asks.length,
          observedAt: snapshot.observedAt,
          dataStatus: snapshot.dataStatus,
        },
        preview,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
