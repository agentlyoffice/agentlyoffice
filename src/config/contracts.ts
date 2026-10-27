import { isAddress } from "@/config/brand";

/*
 * Agently contract address on Robinhood Chain.
 *   ledger  AgentlyTaskLedger, no constructor arguments, no owner, does not need the $AGENTLY token,
 *           so it can be deployed before the token launches (from /deploy on localhost).
 * Empty => "Record approval" at the review desk runs in practice mode (a wallet signature kept in this browser).
 * Filled => it sends a real transaction from the approver's wallet, and the verify panel reads the chain.
 * Check a deployment any time: `npm run verify-deployment -- --ledger <address> --ledger-tx <tx>`.
 */
const DEPLOYED = {
  ledger: "0xeb56aac239a137f1710da1a819997173a806f0cc",
  /** Block of the AgentlyTaskLedger deployment. */
  ledgerBlock: 99156851,
};

/**
 * Local fork tests only: NEXT_PUBLIC_AGENTLY_TEST_CONTRACTS='{"ledger":"0x…","ledgerBlock":1}' at build time
 * points a second build at a contract deployed on an anvil chain. Never set it on Vercel.
 */
function testOverride(): typeof DEPLOYED | null {
  const raw = process.env.NEXT_PUBLIC_AGENTLY_TEST_CONTRACTS;
  if (!raw) return null;
  try {
    const v = { ...DEPLOYED, ...(JSON.parse(raw) as Partial<typeof DEPLOYED>) };
    return isAddress(v.ledger) ? v : null;
  } catch {
    return null;
  }
}

export const CONTRACTS = testOverride() ?? DEPLOYED;

export const ledgerLive = () => isAddress(CONTRACTS.ledger);

export const CONTRACT_NAMES = { ledger: "AgentlyTaskLedger" } as const;

/** Gas measured on an anvil chain: deployment, a first record (cold slots), a later record. */
export const GAS = { deploy: 640_541, recordFirst: 218_000, recordNext: 200_000 } as const;
