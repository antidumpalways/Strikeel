import { Decimal, dec, sum, toDecimalString, type NormalizedPosition } from "@strikeel/core";

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

export interface DiscoverSolanaOptions {
  address: string;
  prices: Record<string, string>;
  rpcUrl?: string;
}

export interface DiscoverSolanaResult {
  positions: NormalizedPosition[];
  warnings: string[];
  slot?: number;
}

interface RpcResponse<T> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: { code: number; message: string };
}

async function rpc<T>(url: string, method: string, params: unknown[]): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Solana RPC HTTP ${response.status}`);
  const data = (await response.json()) as RpcResponse<T>;
  if (data.error) throw new Error(`Solana RPC: ${data.error.message}`);
  return data.result as T;
}

export function buildSolanaSpot(input: {
  address: string;
  lamports: bigint;
  usdcUnits: bigint;
  prices: Record<string, string>;
  observedAt?: string;
  slot?: number;
}): NormalizedPosition {
  const solPrice = input.prices["solana:SOL"];
  if (!solPrice) throw new Error("missing solana:SOL price");
  const sol = dec(input.lamports.toString()).div(new Decimal(10).pow(9));
  const usdc = dec(input.usdcUnits.toString()).div(new Decimal(10).pow(6));

  const assets = [
    {
      asset: {
        assetId: "solana:SOL",
        chain: "solana" as const,
        symbol: "SOL",
        decimals: 9,
      },
      quantity: toDecimalString(sol),
      priceUsd: solPrice,
      valueUsd: toDecimalString(sol.mul(solPrice)),
    },
    {
      asset: {
        assetId: "solana:USDC",
        chain: "solana" as const,
        symbol: "USDC",
        decimals: 6,
        contractAddress: USDC_MINT,
      },
      quantity: toDecimalString(usdc),
      priceUsd: "1",
      valueUsd: toDecimalString(usdc),
    },
  ];

  return {
    id: `wallet:${input.address}`,
    chain: "solana",
    protocolId: "wallet",
    positionType: "spot",
    externalPositionId: input.address,
    assets,
    liabilities: [],
    estimatedValueUsd: toDecimalString(sum(assets.map((asset) => asset.valueUsd))),
    observedAt: input.observedAt ?? new Date().toISOString(),
    blockReference: input.slot?.toString(),
    dataStatus: "fresh",
    sourceReference: `solana:${input.address}`,
    adapterVersion: "0.1.0",
  };
}

export async function discoverSolanaWallet(
  options: DiscoverSolanaOptions
): Promise<DiscoverSolanaResult> {
  const rpcUrl = options.rpcUrl ?? process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
  const warnings: string[] = [];

  const [balance, slot] = await Promise.all([
    rpc<{ value: number }>(rpcUrl, "getBalance", [options.address]),
    rpc<number>(rpcUrl, "getSlot", []).catch(() => undefined),
  ]);

  let usdcUnits = 0n;
  try {
    const accounts = await rpc<{
      value: Array<{
        account: {
          data: {
            parsed?: { info?: { tokenAmount?: { amount?: string } } };
          };
        };
      }>;
    }>(rpcUrl, "getTokenAccountsByOwner", [
      options.address,
      { mint: USDC_MINT },
      { encoding: "jsonParsed" },
    ]);

    for (const item of accounts.value) {
      const amount = item.account.data.parsed?.info?.tokenAmount?.amount;
      if (amount) usdcUnits += BigInt(amount);
    }
  } catch (error) {
    warnings.push(`SPL token scan failed: ${(error as Error).message}`);
  }

  const position = buildSolanaSpot({
    address: options.address,
    lamports: BigInt(balance.value),
    usdcUnits,
    prices: options.prices,
    slot,
  });

  return { positions: [position], warnings, slot };
}

export { TOKEN_PROGRAM, USDC_MINT };

