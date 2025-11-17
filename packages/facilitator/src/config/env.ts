import { config } from "dotenv";
import type { Address, Hex } from "viem";
import path from "path";

// Load environment variables from root directory
config({ path: path.resolve(process.cwd(), ".env") });

/**
 * Environment configuration
 */
export interface EnvConfig {
  /**
   * Server host
   */
  host: string;

  /**
   * Server port
   */
  port: number;

  /**
   * Log level
   */
  logLevel: string;

  /**
   * Sponsor private key (for signing transactions)
   */
  sponsorPrivateKey: Hex;

  /**
   * BSC mainnet RPC URL
   */
  rpcUrlBscMainnet?: string;

  /**
   * BSC testnet RPC URL
   */
  rpcUrlBscTestnet?: string;

  /**
   * Implementation contract whitelist
   */
  implementationWhitelist: Address[];
}

/**
 * Load and validate environment configuration
 */
export function loadEnvConfig(): EnvConfig {
  const host = process.env.HOST || "0.0.0.0";
  const port = parseInt(process.env.PORT || "8080", 10);
  const logLevel = process.env.LOG_LEVEL || "info";

  const sponsorPrivateKey = process.env.SPONSOR_PRIVATE_KEY as Hex;
  if (!sponsorPrivateKey || !sponsorPrivateKey.startsWith("0x")) {
    throw new Error("SPONSOR_PRIVATE_KEY environment variable is required");
  }

  const rpcUrlBscMainnet = process.env.RPC_URL_BSC_MAINNET;
  const rpcUrlBscTestnet = process.env.RPC_URL_BSC_TESTNET;

  if (!rpcUrlBscMainnet && !rpcUrlBscTestnet) {
    throw new Error("At least one RPC URL must be configured");
  }

  // Parse whitelist
  const whitelistStr = process.env.IMPLEMENTATION_WHITELIST || "";
  const implementationWhitelist = whitelistStr
    .split(",")
    .map((addr) => addr.trim() as Address)
    .filter((addr) => addr && addr.startsWith("0x"));

  return {
    host,
    port,
    logLevel,
    sponsorPrivateKey,
    rpcUrlBscMainnet,
    rpcUrlBscTestnet,
    implementationWhitelist,
  };
}

