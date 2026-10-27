import { encodeFunctionData, type Abi } from "viem";
import { CONTRACTS } from "@/config/contracts";
import { LEDGER_ABI } from "@/lib/abi";
import { read, readMany, rpcCall } from "@/lib/client";

/* Browser reads and the one write the site sends to AgentlyTaskLedger. */

export type LedgerEntry = { id: number; approver: string; steps: number; chainBlock: number; recordedAt: number; taskHash: string; resultHash: string };

const abi = LEDGER_ABI as Abi;

export const recordCalldata = (taskHash: `0x${string}`, resultHash: `0x${string}`, steps: number) =>
  encodeFunctionData({ abi: LEDGER_ABI, functionName: "record", args: [taskHash, resultHash, steps] });

/** Dry run of `record` from `from` (reverts surface here, before the wallet opens). */
export async function estimateRecord(from: string, data: string) {
  const gas = await rpcCall<string>("eth_estimateGas", [{ from, to: CONTRACTS.ledger, data }]);
  return Number(BigInt(gas));
}

type Raw = { approver: string; steps: number; chainBlock: bigint; recordedAt: bigint; taskHash: string; resultHash: string };
const toEntry = (id: number, r: Raw): LedgerEntry => ({ id, approver: r.approver, steps: Number(r.steps), chainBlock: Number(r.chainBlock), recordedAt: Number(r.recordedAt), taskHash: r.taskHash, resultHash: r.resultHash });

export async function recordCount(): Promise<number> {
  return Number(await read<bigint>({ to: CONTRACTS.ledger, abi, fn: "recordCount" }));
}

export async function entriesByIds(ids: number[]): Promise<LedgerEntry[]> {
  const raw = await readMany(ids.map((id) => ({ to: CONTRACTS.ledger, abi, fn: "entry", args: [BigInt(id)] })));
  return raw.flatMap((r, i) => (r ? [toEntry(ids[i], r as Raw)] : []));
}

/** Id of the record `approver` wrote for exactly this pair, or 0. */
export async function findRecord(approver: string, taskHash: string, resultHash: string): Promise<number> {
  return Number(await read<bigint>({ to: CONTRACTS.ledger, abi, fn: "find", args: [approver, taskHash, resultHash] }));
}

/** Newest records naming a task fingerprint (any approver). */
export async function recordsOfTask(taskHash: string, limit = 20): Promise<LedgerEntry[]> {
  const ids = (await read<readonly bigint[]>({ to: CONTRACTS.ledger, abi, fn: "idsByTask", args: [taskHash, 0n, BigInt(limit)] })).map(Number);
  return ids.length ? entriesByIds(ids) : [];
}

/** Newest records of one approver. */
export async function recordsOf(approver: string, limit = 20): Promise<LedgerEntry[]> {
  const ids = (await read<readonly bigint[]>({ to: CONTRACTS.ledger, abi, fn: "idsByApprover", args: [approver, 0n, BigInt(limit)] })).map(Number);
  return ids.length ? entriesByIds(ids) : [];
}

/** Newest records on the whole ledger. */
export async function latestRecords(limit = 10): Promise<{ total: number; entries: LedgerEntry[] }> {
  const total = await recordCount();
  const ids: number[] = [];
  for (let id = total; id > 0 && ids.length < limit; id--) ids.push(id);
  return { total, entries: ids.length ? await entriesByIds(ids) : [] };
}

/** Text a practice approval signs (no contract yet): both fingerprints and the step count, readable in the wallet. */
export function practiceMessage(title: string, taskHash: string, resultHash: string, steps: number) {
  return [`Agently practice approval (no transaction, nothing sent)`, `Task: ${title.slice(0, 80)}`, `Task hash: ${taskHash}`, `Result hash: ${resultHash}`, `Agent steps: ${steps}`].join("\n");
}
