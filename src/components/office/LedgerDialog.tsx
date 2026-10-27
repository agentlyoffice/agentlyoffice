"use client";

import { useEffect, useState } from "react";
import { useAgency } from "@/components/office/AgencyProvider";
import { Modal } from "@/components/office/Modal";
import { useWallet } from "@/components/wallet/WalletProvider";
import { CHAIN, explorerAddress, explorerBlock, shortAddress } from "@/config/brand";
import { CONTRACTS, CONTRACT_NAMES, ledgerLive } from "@/config/contracts";
import { bundle, checkBundle } from "@/lib/agency/tasks";
import { latestRecords, recordsOf, recordsOfTask, type LedgerEntry } from "@/lib/ledger";

type Verdict =
  | { ok: false; error: string }
  | { ok: true; title: string; taskHash: string; resultHash: string; claimsMatch: boolean; onChain: LedgerEntry[] | null; sameTask: number; local: boolean };

/** The ledger wall: check an exported task file against the chain, and browse records. */
export function LedgerDialog({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"verify" | "records">("verify");
  return (
    <Modal title="Ledger wall" wide onClose={onClose} testid="ledger-dialog" sub={`Approved tasks can be recorded in ${CONTRACT_NAMES.ledger} on ${CHAIN.name}: the task hash, the result hash, the step count and the approver's address. Texts never go on chain; anyone holding the task file can check it here.`}>
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "verify"} className={tab === "verify" ? "on" : ""} onClick={() => setTab("verify")}>
          Verify a task file
        </button>
        <button type="button" role="tab" aria-selected={tab === "records"} className={tab === "records" ? "on" : ""} onClick={() => setTab("records")} data-testid="ledger-records-tab">
          Records
        </button>
      </div>
      {tab === "verify" ? <Verify /> : <Records />}
    </Modal>
  );
}

function Verify() {
  const { tasks } = useAgency();
  const [text, setText] = useState("");
  const [v, setV] = useState<Verdict | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(raw: string) {
    setBusy(true);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      setV({ ok: false, error: "That is not valid JSON." });
      setBusy(false);
      return;
    }
    const c = checkBundle(parsed);
    if (!c.ok) {
      setV(c);
      setBusy(false);
      return;
    }
    const local = tasks.some((t) => t.record && t.status === "completed" && (() => { const b = bundle(t); return b.taskHash === c.taskHash && b.resultHash === c.resultHash; })());
    let onChain: LedgerEntry[] | null = null;
    let sameTask = 0;
    if (ledgerLive()) {
      try {
        const all = await recordsOfTask(c.taskHash, 50);
        sameTask = all.length;
        onChain = all.filter((e) => e.resultHash.toLowerCase() === c.resultHash.toLowerCase());
      } catch {
        onChain = null;
      }
    }
    setV({ ok: true, title: c.title, taskHash: c.taskHash, resultHash: c.resultHash, claimsMatch: c.claimsMatch, onChain, sameTask, local });
    setBusy(false);
  }

  return (
    <div className="stack">
      <label className="lbl" htmlFor="verify-file">
        Task file (agenly-….json)
      </label>
      <input
        id="verify-file"
        type="file"
        accept="application/json,.json"
        className="input"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (f.size > 200_000) return setV({ ok: false, error: "File too large for a task file." });
          const t = await f.text();
          setText(t);
          void run(t);
        }}
      />
      <textarea className="input mono" rows={5} placeholder="…or paste its JSON here" value={text} onChange={(e) => setText(e.target.value)} aria-label="Task file JSON" data-testid="verify-input" />
      <div className="row-btns">
        <button type="button" className="btn btn-orange" disabled={!text.trim() || busy} onClick={() => run(text)} data-testid="verify-run">
          {busy ? "Checking…" : "Recompute and check"}
        </button>
      </div>
      {v ? (
        v.ok ? (
          <div className="verdict" data-testid="verify-result">
            <p>
              <b>{v.title || "Task"}</b>
            </p>
            <dl className="hashes">
              <div>
                <dt>Task hash</dt>
                <dd className="mono">{v.taskHash}</dd>
              </div>
              <div>
                <dt>Result hash</dt>
                <dd className="mono">{v.resultHash}</dd>
              </div>
            </dl>
            <p className={v.claimsMatch ? "ok" : "bad"}>{v.claimsMatch ? "The file's own hashes match its contents." : "The hashes written in the file do not match its contents: the file was changed after export."}</p>
            {v.onChain === null ? (
              <p className="hint">{ledgerLive() ? "The chain could not be read right now." : "The ledger contract is not deployed yet, so there is nothing on chain to compare with."}{v.local ? " This browser holds a practice approval for exactly this file." : ""}</p>
            ) : v.onChain.length ? (
              <ul className="records" data-testid="verify-onchain">
                {v.onChain.map((e) => (
                  <li key={e.id} className="ok">
                    Record #{e.id}: approved by{" "}
                    <a className="link mono" href={explorerAddress(e.approver)} target="_blank" rel="noreferrer">
                      {shortAddress(e.approver)}
                    </a>{" "}
                    at block{" "}
                    <a className="link" href={explorerBlock(e.chainBlock)} target="_blank" rel="noreferrer">
                      {e.chainBlock.toLocaleString("en-US")}
                    </a>
                    , {e.steps} step(s), {new Date(e.recordedAt * 1000).toLocaleString()}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="bad" data-testid="verify-none">
                No record on chain has this task and result. {v.sameTask ? `${v.sameTask} record(s) name the same task with a different result.` : ""}
              </p>
            )}
          </div>
        ) : (
          <p className="bad" role="alert">
            {v.error}
          </p>
        )
      ) : null}
    </div>
  );
}

function Records() {
  const { address } = useWallet();
  const [state, setState] = useState<{ total: number; latest: LedgerEntry[]; mine: LedgerEntry[] } | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!ledgerLive()) return;
    let off = false;
    Promise.all([latestRecords(10), address ? recordsOf(address, 20) : Promise.resolve([])])
      .then(([l, m]) => !off && setState({ total: l.total, latest: l.entries, mine: m }))
      .catch(() => !off && setErr("The chain could not be read right now."));
    return () => {
      off = true;
    };
  }, [address]);
  if (!ledgerLive())
    return (
      <p className="hint" data-testid="ledger-not-deployed">
        {CONTRACT_NAMES.ledger} is not deployed yet. Until it is, approvals are practice signatures kept in each visitor&apos;s own browser, and this list stays empty.
      </p>
    );
  if (err) return <p className="bad">{err}</p>;
  if (!state) return <p className="hint">Reading {CHAIN.name}…</p>;
  const row = (e: LedgerEntry) => (
    <li key={e.id}>
      #{e.id} · {shortAddress(e.approver)} · block {e.chainBlock.toLocaleString("en-US")} · {e.steps} step(s) · <span className="mono">{e.taskHash.slice(0, 10)}…</span>
    </li>
  );
  return (
    <div className="stack" data-testid="ledger-records">
      <p>
        {state.total.toLocaleString("en-US")} record(s) in{" "}
        <a className="link" href={explorerAddress(CONTRACTS.ledger)} target="_blank" rel="noreferrer">
          {CONTRACT_NAMES.ledger}
        </a>
        .
      </p>
      {address ? (
        <>
          <h3 className="h4">Yours</h3>
          <ul className="records">{state.mine.length ? state.mine.map(row) : <li>None from this wallet yet.</li>}</ul>
        </>
      ) : null}
      <h3 className="h4">Newest</h3>
      <ul className="records">{state.latest.length ? state.latest.map(row) : <li>No records yet.</li>}</ul>
    </div>
  );
}
