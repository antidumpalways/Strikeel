import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
  transpilePackages: [
    "@strikeel/core",
    "@strikeel/strike-adapter",
    "@strikeel/evm-adapter",
    "@strikeel/solana-adapter",
    "@strikeel/cardano-adapter",
  ],
};

export default nextConfig;
