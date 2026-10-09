/**
 * Agent Registry — reads an agent's reputation from the Solana Agent Registry
 *
 * The Solana Agent Registry (https://solana.com/agent-registry) is the
 * ERC-8004 identity and feedback registry on Solana. Truva does not duplicate
 * it: the registry says who an agent is and what others reported about it,
 * and Truva uses that as one scoring signal.
 *
 * Read-only. Uses the `8004-solana` SDK, loaded lazily so the engine still
 * runs when the package is not installed.
 */

export interface RegistryReputation {
  /** The agent's registry asset (its ERC-8004 identity) */
  asset: string;
  /** Average feedback score, 0-100 */
  averageScore: number;
  totalFeedbacks: number;
  positiveCount: number;
  negativeCount: number;
}

const REGISTRY_CLUSTER = process.env.AGENT_REGISTRY_CLUSTER || "mainnet-beta";
const REGISTRY_RPC_URL = process.env.AGENT_REGISTRY_RPC_URL;
const REGISTRY_TIMEOUT_MS = Number(process.env.AGENT_REGISTRY_TIMEOUT_MS) || 8000;

let sdkPromise: Promise<any | null> | null = null;

/** `8004-solana` is ESM-only; a plain `import()` would be compiled to `require()`. */
const dynamicImport = new Function("specifier", "return import(specifier)") as (
  specifier: string
) => Promise<any>;

function getSdk(): Promise<any | null> {
  if (!sdkPromise) {
    sdkPromise = dynamicImport("8004-solana")
      .then(({ SolanaSDK }) =>
        new SolanaSDK({
          cluster: REGISTRY_CLUSTER,
          ...(REGISTRY_RPC_URL ? { rpcUrl: REGISTRY_RPC_URL } : {}),
        })
      )
      .catch((err) => {
        console.warn("Agent Registry SDK unavailable — registry signal disabled:", err.message);
        return null;
      });
  }
  return sdkPromise;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Agent Registry lookup timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * Look up the registry reputation of the agent operating `agentWallet`.
 * Returns null if the wallet has no registry identity or the lookup fails.
 */
export async function fetchRegistryReputation(
  agentWallet: string
): Promise<RegistryReputation | null> {
  const sdk = await getSdk();
  if (!sdk) return null;

  try {
    return await withTimeout(
      (async () => {
        const agent = await sdk.getAgentByWallet(agentWallet);
        if (!agent?.asset) return null;

        const { PublicKey } = await import("@solana/web3.js");
        const summary = await sdk.getSummary(new PublicKey(agent.asset));

        return {
          asset: String(agent.asset),
          averageScore: Number(summary.averageScore) || 0,
          totalFeedbacks: Number(summary.totalFeedbacks) || 0,
          positiveCount: Number(summary.positiveCount) || 0,
          negativeCount: Number(summary.negativeCount) || 0,
        };
      })(),
      REGISTRY_TIMEOUT_MS
    );
  } catch (err: any) {
    console.warn(`Agent Registry lookup failed for ${agentWallet}:`, err.message);
    return null;
  }
}
