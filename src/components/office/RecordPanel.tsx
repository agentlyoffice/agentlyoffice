"use client";

import { useMemo, useState } from "react";
import { useAgency } from "@/components/office/AgencyProvider";
import { useWalletModal } from "@/components/wallet/WalletButton";
import { useWallet } from "@/components/wallet/WalletProvider";
import { CHAIN, explorerTx, shortAddress } from "@/config/brand";
import { CONTRACTS, GAS, ledgerLive } from "@/config/contracts";
import { bundle } from "@/lib/agency/tasks";
import type { Task } from "@/lib/agency/types";
import { explain, waitForReceipt } from "@/lib/client";
import { estimateRecord, findRecord, practiceMessage, recordCalldata } from "@/lib/ledger";

export function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Task file + fingerprints of a completed task, and the approval record (chain, or practice before deployment). */
export function RecordPanel({ task }: { task: Task }) {
  const { setRecord } = useAgency();
  const { address, onRobinhoodChain, sendTransaction, signMessage, switchNetwork } = useWallet();
  const { open } = useWalletModal();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const b = useMemo(() => bundle(task), [task]);
  const live = ledgerLive();
  const slug = task.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "task";

  async function record() {
    if (!address) return open();
    setBusy(true);
    setMsg("");
    try {
      if (live) {
        if (!onRobinhoodChain) {
          await switchNetwork();
          setBusy(false);
          return;
        }
        const data = recordCalldata(b.taskHash, b.resultHash, b.steps);
        const gas = await estimateRecord(address, data);
        setMsg(`Confirm in your wallet (about ${gas.toLocaleString("en-US")} gas).`);
        const hash = await sendTransaction({ to: CONTRACTS.ledger, data });
        setMsg("Sent. Waiting for the block…");
        const r = await waitForReceipt(hash);
        if (!r.ok) throw new Error("The transaction reverted.");
        const id = await findRecord(address, b.taskHash, b.resultHash);
        setRecord(task.id, { mode: "chain", id, tx: hash, approver: address, block: r.blockNumber });
        setMsg("");
      } else {
        const signature = await signMessage(practiceMessage(task.title, b.taskHash, b.resultHash, b.steps));
        setRecord(task.id, { mode: "practice", signature, approver: address, at: Date.now() });
      }
    } catch (e) {
      setMsg(explain(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="desk-sec" data-testid="record-panel">
      <h3>Task file and ledger</h3>
      <dl className="hashes">
        <div>
          <dt>Task hash</dt>
          <dd className="mono" data-testid="task-hash">
            {b.taskHash}
          </dd>
        </div>
        <div>
          <dt>Result hash</dt>
          <dd className="mono" data-testid="result-hash">
            {b.resultHash}
          </dd>
        </div>
        <div>
          <dt>Agent steps</dt>
          <dd>{b.steps}</dd>
        </div>
      </dl>
      <div className="row-btns">
        <button type="button" className="btn sm btn-cream" onClick={() => downloadJson(`agenly-${slug}.json`, b)} data-testid="download-bundle">
          Download task file
        </button>
        {task.record ? null : (
          <button type="button" className="btn sm btn-orange" disabled={busy} onClick={record} data-testid="record-approval">
            {!address ? "Connect to record" : live ? (onRobinhoodChain ? (busy ? "Recording…" : "Record approval on chain") : `Switch to ${CHAIN.name}`) : busy ? "Signing…" : "Sign a practice approval"}
          </button>
        )}
      </div>
      {task.record?.mode === "chain" ? (
        <p className="ok" data-testid="record-done">
          Recorded as #{task.record.id} by {shortAddress(task.record.approver)} at block {task.record.block.toLocaleString("en-US")} ·{" "}
          <a className="link" href={explorerTx(task.record.tx)} target="_blank" rel="noreferrer">
            transaction
          </a>
        </p>
      ) : task.record?.mode === "practice" ? (
        <p className="hint" data-testid="record-done">
          Practice approval signed by {shortAddress(task.record.approver)} and kept in this browser. Nothing was sent to the chain: the ledger contract is not deployed yet.
        </p>
      ) : (
        <p className="hint">
          {live
            ? `Recording writes both hashes and your address to AgenlyTaskLedger (about ${GAS.recordFirst.toLocaleString("en-US")} gas). The texts never leave this browser.`
            : "The ledger contract is not deployed yet, so recording is a practice signature kept in this browser (no transaction, no gas)."}
        </p>
      )}
      {msg ? (
        <p className="err" role="status">
          {msg}
        </p>
      ) : null}
    </section>
  );
}
