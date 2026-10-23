import { dec, sum, toDecimalString, type NormalizedPosition } from "@strikeel/core";

export interface KoiosAddressInfo {
  address: string;
  balance: string;
  asset_list?: Array<{ policy_id: string; asset_name: string; quantity: string }>;
  utxo_set?: Array<{ block_height?: number }>;
}

export interface DiscoverCardanoOptions {
  address: string;
  prices: Record<string, string>;
  koiosUrl?: string;
}

export interface DiscoverCardanoResult {
  positions: NormalizedPosition[];
  warnings: string[];
}

export function parseKoiosAddressInfo(
  data: KoiosAddressInfo[],
  prices: Record<string, string>,
  observedAt = new Date().toISOString()
): NormalizedPosition {
  const info = data[0];
  if (!info) throw new Error("address not found");
  const adaPrice = prices["cardano:ADA"];
  if (!adaPrice) throw new Error("missing cardano:ADA price");
  const ada = dec(info.balance).div(1_000_000);

  const assets = [
    {
      asset: {
        assetId: "cardano:ADA",
        chain: "cardano" as const,
        symbol: "ADA",
        decimals: 6,
      },
      quantity: toDecimalString(ada),
      priceUsd: adaPrice,
      valueUsd: toDecimalString(ada.mul(adaPrice)),
    },
  ];

  const heights = (info.utxo_set ?? [])
    .map((utxo) => utxo.block_height)
    .filter((height): height is number => typeof height === "number" && height > 0);
  const blockReference = heights.length > 0 ? String(Math.max(...heights)) : undefined;

  return {
    id: `wallet:${info.address}`,
    chain: "cardano",
    protocolId: "wallet",
    positionType: "spot",
    externalPositionId: info.address,
    assets,
    liabilities: [],
    estimatedValueUsd: toDecimalString(sum(assets.map((asset) => asset.valueUsd))),
    observedAt,
    blockReference,
    dataStatus: "fresh",
    sourceReference: `koios:${info.address}`,
    adapterVersion: "0.1.0",
  };
}

export async function discoverCardanoWallet(
  options: DiscoverCardanoOptions
): Promise<DiscoverCardanoResult> {
  const base = options.koiosUrl ?? process.env.KOIOS_URL ?? "https://api.koios.rest/api/v1";
  const response = await fetch(`${base}/address_info`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ _addresses: [options.address] }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Koios HTTP ${response.status}`);
  const data = (await response.json()) as KoiosAddressInfo[];
  return { positions: [parseKoiosAddressInfo(data, options.prices)], warnings: [] };
}
