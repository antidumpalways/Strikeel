import { createPublicClient, http, formatUnits, type Address } from "viem";
import { mainnet } from "viem/chains";
import type { AssetRef, NormalizedPosition } from "@strikeel/core";
import {
  UNISWAP_V3_FACTORY,
  UNISWAP_V3_NFT_MANAGER,
  USDC_ADDRESS,
  WETH_ADDRESS,
  erc20Abi,
  uniswapV3FactoryAbi,
  uniswapV3NftAbi,
  uniswapV3PoolAbi,
} from "./abis";
import { buildSpotPosition, mapV3Position } from "./position";

const ETH_ASSET: AssetRef = {
  assetId: "ethereum:ETH",
  chain: "ethereum",
  symbol: "ETH",
  decimals: 18,
  contractAddress: WETH_ADDRESS,
};

const USDC_ASSET: AssetRef = {
  assetId: "ethereum:USDC",
  chain: "ethereum",
  symbol: "USDC",
  decimals: 6,
  contractAddress: USDC_ADDRESS,
};

const KNOWN_ASSETS = new Map<string, AssetRef>([
  [WETH_ADDRESS.toLowerCase(), ETH_ASSET],
  [USDC_ADDRESS.toLowerCase(), USDC_ASSET],
]);

export interface DiscoverEvmOptions {
  address: Address;
  prices: Record<string, string>;
  rpcUrl?: string;
  maxPositions?: number;
  /** Scan only these Uniswap V3 token ids (useful when a wallet holds many positions). */
  tokenIds?: string[];
}

export interface DiscoverEvmResult {
  positions: NormalizedPosition[];
  warnings: string[];
  blockNumber: string;
}

async function resolveAsset(
  client: ReturnType<typeof createPublicClient>,
  address: Address
): Promise<AssetRef> {
  const known = KNOWN_ASSETS.get(address.toLowerCase());
  if (known) return known;

  const [decimals, symbol] = await Promise.all([
    client.readContract({ address, abi: erc20Abi, functionName: "decimals" }),
    client.readContract({ address, abi: erc20Abi, functionName: "symbol" }),
  ]);

  return {
    assetId: `ethereum:${address.toLowerCase()}`,
    chain: "ethereum",
    symbol,
    decimals: Number(decimals),
    contractAddress: address,
  };
}

export async function discoverEvmWallet(options: DiscoverEvmOptions): Promise<DiscoverEvmResult> {
  const rpcUrl = options.rpcUrl ?? process.env.EVM_RPC_URL ?? "https://ethereum-rpc.publicnode.com";
  const client = createPublicClient({ chain: mainnet, transport: http(rpcUrl, { timeout: 15_000 }) });
  const address = options.address;
  const warnings: string[] = [];
  const observedAt = new Date().toISOString();

  const blockNumber = await client.getBlockNumber();
  const blockReference = blockNumber.toString();

  const [ethWei, usdcUnits] = await Promise.all([
    client.getBalance({ address }),
    client
      .readContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      })
      .catch(() => {
        warnings.push("USDC balance read failed; treated as 0");
        return 0n;
      }),
  ]);

  const positions: NormalizedPosition[] = [
    buildSpotPosition({
      address,
      ethWei,
      usdcUnits,
      prices: options.prices,
      observedAt,
      blockReference,
    }),
  ];

  const MAX_TOKEN_IDS = 20;
  const tokenIds: bigint[] = [];
  if (options.tokenIds?.length) {
    if (options.tokenIds.length > MAX_TOKEN_IDS) {
      warnings.push(`tokenIds capped at ${MAX_TOKEN_IDS}`);
    }
    for (const id of options.tokenIds.slice(0, MAX_TOKEN_IDS)) tokenIds.push(BigInt(id));
  } else {
    let count = 0n;
    try {
      count = await client.readContract({
        address: UNISWAP_V3_NFT_MANAGER,
        abi: uniswapV3NftAbi,
        functionName: "balanceOf",
        args: [address],
      });
    } catch (error) {
      warnings.push(`Uniswap V3 position scan failed: ${(error as Error).message}`);
    }

    const max = options.maxPositions ?? 20;
    const limit = Number(count) > max ? max : Number(count);
    for (let i = 0; i < limit; i += 1) {
      tokenIds.push(
        await client.readContract({
          address: UNISWAP_V3_NFT_MANAGER,
          abi: uniswapV3NftAbi,
          functionName: "tokenOfOwnerByIndex",
          args: [address, BigInt(i)],
        })
      );
    }
  }

  for (const tokenId of tokenIds) {
    try {
      const owner = await client.readContract({
        address: UNISWAP_V3_NFT_MANAGER,
        abi: uniswapV3NftAbi,
        functionName: "ownerOf",
        args: [tokenId],
      });
      if (owner.toLowerCase() !== address.toLowerCase()) {
        warnings.push(`token ${tokenId} is not owned by ${address}; skipped`);
        continue;
      }

      const raw = await client.readContract({
        address: UNISWAP_V3_NFT_MANAGER,
        abi: uniswapV3NftAbi,
        functionName: "positions",
        args: [tokenId],
      });

      const [, , token0, token1, fee, tickLower, tickUpper, liquidity] = raw;
      if (liquidity === 0n) continue;

      const pool = await client.readContract({
        address: UNISWAP_V3_FACTORY,
        abi: uniswapV3FactoryAbi,
        functionName: "getPool",
        args: [token0, token1, fee],
      });
      if (pool === "0x0000000000000000000000000000000000000000") continue;

      const slot0 = await client.readContract({
        address: pool,
        abi: uniswapV3PoolAbi,
        functionName: "slot0",
      });

      const [asset0, asset1] = await Promise.all([resolveAsset(client, token0), resolveAsset(client, token1)]);
      if (!options.prices[asset0.assetId] && asset0.symbol !== "USDC" && asset0.symbol !== "USDT") {
        warnings.push(`missing price for ${asset0.assetId}; position ${tokenId} skipped`);
        continue;
      }
      if (!options.prices[asset1.assetId] && asset1.symbol !== "USDC" && asset1.symbol !== "USDT") {
        warnings.push(`missing price for ${asset1.assetId}; position ${tokenId} skipped`);
        continue;
      }

      positions.push(
        mapV3Position({
          raw: {
            tokenId: tokenId.toString(),
            token0,
            token1,
            fee: Number(fee),
            tickLower: Number(tickLower),
            tickUpper: Number(tickUpper),
            liquidity: liquidity.toString(),
          },
          pool: { sqrtPriceX96: slot0[0].toString(), tick: Number(slot0[1]) },
          token0: asset0,
          token1: asset1,
          prices: { ...options.prices, "ethereum:USDC": "1" },
          observedAt,
          blockReference,
        })
      );
    } catch (error) {
      warnings.push(`position ${tokenId} skipped: ${(error as Error).message}`);
    }
  }

  return { positions, warnings, blockNumber: blockNumber.toString() };
}

export function formatEth(wei: bigint): string {
  return formatUnits(wei, 18);
}

